import { Context, Dict, Logger, Quester, Schema, segment, Session, Time } from 'koishi'
import { download, headers, login, NetworkError, resizeInput } from './utils'
import {} from '@koishijs/plugin-help'
import getImageSize from 'image-size'

export const reactive = true
export const name = 'novelai'

const logger = new Logger('novelai')

const modelMap = {
  safe: 'safe-diffusion',
  nai: 'nai-diffusion',
  furry: 'nai-diffusion-furry',
} as const

const orientMap = {
  landscape: { height: 512, width: 768 },
  portrait: { height: 768, width: 512 },
  square: { height: 640, width: 640 },
} as const

const lowQuality = 'nsfw, lowres, text, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry'
const badAnatomy = 'bad anatomy, bad hands, error, missing fingers, extra digit, fewer digits'

type Model = keyof typeof modelMap
type Orient = keyof typeof orientMap
type Sampler = typeof samplers[number]

const models = Object.keys(modelMap) as Model[]
const orients = Object.keys(orientMap) as Orient[]
const samplers = ['k_euler_ancestral', 'k_euler', 'k_lms', 'plms', 'ddim'] as const

export interface Config {
  type: 'token' | 'login' | 'naifu'
  token: string
  email: string
  password: string
  model?: Model
  orient?: Orient
  sampler?: Sampler
  anatomy?: boolean
  allowAnlas?: boolean
  basePrompt?: string
  forbidden?: string
  endpoint?: string
  requestTimeout?: number
  recallTimeout?: number
  maxConcurrency?: number
}

export const Config = Schema.intersect([
  Schema.object({
    type: Schema.union([
      Schema.const('token' as const).description('授权令牌'),
      Schema.const('login' as const).description('账号密码'),
      Schema.const('naifu' as const).description('NAIFU'),
    ] as const).description('登录方式'),
  }).description('登录设置'),
  Schema.union([
    Schema.object({
      type: Schema.const('token' as const),
      token: Schema.string().description('授权令牌。').role('secret').required(),
      endpoint: Schema.string().description('API 服务器地址。').default('https://api.novelai.net'),
    }),
    Schema.object({
      type: Schema.const('login' as const),
      email: Schema.string().description('用户名。').required(),
      password: Schema.string().description('密码。').role('secret').required(),
      endpoint: Schema.string().description('API 服务器地址。').default('https://api.novelai.net'),
    }),
    Schema.object({
      type: Schema.const('naifu' as const),
      token: Schema.string().description('授权令牌。').role('secret'),
      endpoint: Schema.string().description('API 服务器地址。').required(),
    }),
  ] as const),
  Schema.object({
    model: Schema.union(models).description('默认的生成模型。').default('nai'),
    orient: Schema.union(orients).description('默认的图片方向。').default('portrait'),
    sampler: Schema.union(samplers).description('默认的采样器。').default('k_euler_ancestral'),
    anatomy: Schema.boolean().default(true).description('是否过滤不合理构图。'),
    allowAnlas: Schema.boolean().default(true).description('是否允许使用点数。禁用后部分功能 (图片增强和手动设置某些参数) 将无法使用。'),
    basePrompt: Schema.string().description('默认的附加标签。').default('masterpiece, best quality'),
    forbidden: Schema.string().role('textarea').description('违禁词列表。含有违禁词的请求将被拒绝。').default(''),
    requestTimeout: Schema.number().role('time').description('当请求超过这个时间时会中止并提示超时。').default(Time.minute * 0.5),
    recallTimeout: Schema.number().role('time').description('图片发送后自动撤回的时间 (设置为 0 以禁用此功能)。').default(0),
    maxConcurrency: Schema.number().description('单个频道下的最大并发数量 (设置为 0 以禁用此功能)。').default(0),
  }).description('功能设置'),
] as const) as Schema<Config>

function errorHandler(session: Session, err: Error) {
  if (Quester.isAxiosError(err)) {
    if (err.response?.status === 402) {
      return session.text('.unauthorized')
    } else if (err.response?.status) {
      return session.text('.response-error', [err.response.status])
    } else if (err.code === 'ETIMEDOUT') {
      return session.text('.request-timeout')
    } else if (err.code) {
      return session.text('.request-failed', [err.code])
    }
  }
  logger.error(err)
  return session.text('.unknown-error')
}

interface Forbidden {
  pattern: string
  strict: boolean
}

export function apply(ctx: Context, config: Config) {
  ctx.i18n.define('zh', require('./locales/zh'))
  ctx.i18n.define('zh-tw', require('./locales/zh-tw'))
  ctx.i18n.define('en', require('./locales/en'))
  ctx.i18n.define('fr', require('./locales/fr'))

  let forbidden: Forbidden[]
  const states: Dict<Set<string>> = Object.create(null)

  ctx.accept(['forbidden'], (config) => {
    forbidden = config.forbidden.trim()
      .toLowerCase()
      .replace(/，/g, ',')
      .split(/(?:,\s*|\s*\n\s*)/g)
      .filter(Boolean)
      .map((pattern: string) => {
        const strict = pattern.endsWith('!')
        if (strict) pattern = pattern.slice(0, -1)
        pattern = pattern.replace(/[^a-z0-9]+/g, ' ').trim()
        return { pattern, strict }
      })
  }, { immediate: true })

  let tokenTask: Promise<string> = null
  const getToken = () => tokenTask ||= login(ctx)
  ctx.accept(['token', 'type', 'email', 'password'], () => tokenTask = null)

  const hidden = () => !config.allowAnlas

  const cmd = ctx.command('novelai <prompts:text>')
    .shortcut('画画', { fuzzy: true })
    .shortcut('畫畫', { fuzzy: true })
    .shortcut('约稿', { fuzzy: true })
    .shortcut('約稿', { fuzzy: true })
    .shortcut('增强', { fuzzy: true, options: { enhance: true } })
    .shortcut('增強', { fuzzy: true, options: { enhance: true } })
    .option('enhance', '-e', { hidden })
    .option('model', '-m <model>', { type: models })
    .option('orient', '-o <orient>', { type: orients })
    .option('sampler', '-s <sampler>', { type: samplers })
    .option('seed', '-x <seed:number>')
    .option('steps', '-t <step:number>', { hidden })
    .option('scale', '-c <scale:number>')
    .option('noise', '-n <noise:number>', { hidden })
    .option('strength', '-N <strength:number>', { hidden })
    .option('anatomy', '-a, --strict-anatomy', { value: true, hidden: () => ctx.config.anatomy })
    .option('anatomy', '-A, --loose-anatomy', { value: false, hidden: () => !ctx.config.anatomy })
    .action(async ({ session, options }, input) => {
      if (!input?.trim()) return session.execute('help novelai')

      let imgUrl: string
      if (config.allowAnlas) {
        input = segment.transform(input, {
          image(attrs) {
            imgUrl = attrs.url
            return ''
          },
        })

        if (options.enhance && !imgUrl) {
          return session.text('.expect-image')
        }

        if (!input.trim() && !config.basePrompt) {
          return session.text('.expect-prompt')
        }
      } else {
        delete options.enhance
        delete options.steps
      }

      input = input.toLowerCase().replace(/[,，]/g, ', ').replace(/\s+/g, ' ')
      if (/[^\s\w"'“”‘’.,:|()\[\]{}-]/.test(input)) {
        return session.text('.invalid-input')
      }

      // extract negative prompts
      const undesired = [lowQuality]
      if (options.anatomy ?? config.anatomy) undesired.push(badAnatomy)
      const capture = input.match(/(?:^|,\s*)negative prompts?:([\s\S]+)/m)
      if (capture) {
        input = input.slice(0, capture.index).trim()
        undesired.push(capture[1])
      }

      // remove forbidden words
      input = input.split(/, /g).filter((word) => {
        word = word.replace(/[^a-z0-9]+/g, ' ').trim()
        for (const { pattern, strict } of forbidden) {
          if (strict && word.split(/\W+/g).includes(pattern)) {
            return false
          } else if (!strict && word.includes(pattern)) {
            return false
          }
        }
        return true
      }).join(', ')

      let token: string
      try {
        token = await getToken()
      } catch (err) {
        if (err instanceof NetworkError) {
          return session.text(err.message, err.params)
        }
        logger.error(err)
        return session.text('.unknown-error')
      }

      const id = Math.random().toString(36).slice(2)
      if (config.maxConcurrency) {
        states[session.cid] ||= new Set()
        if (states[session.cid].size >= config.maxConcurrency) {
          return session.text('.concurrent-jobs')
        } else {
          states[session.cid].add(id)
        }
      }

      const model = modelMap[options.model]
      const orient = orientMap[options.orient]
      const seed = options.seed || Math.round(new Date().getTime() / 1000)
      session.send(session.text('.waiting'))

      const prompts = []
      if (input) prompts.push(input)

      // Only append base prompt when `input` did not include it.
      if (config.basePrompt && !config.basePrompt.split(/[,\s]+/).every((word) => input.includes(word))) {
        prompts.push(config.basePrompt)
      }
      input = prompts.join(', ')

      const parameters: Dict = {
        seed,
        n_samples: 1,
        sampler: options.sampler,
        uc: undesired.join(', '),
        ucPreset: 0,
      }

      if (imgUrl) {
        let image: Buffer
        try {
          image = Buffer.from(await download(ctx, imgUrl))
        } catch (err) {
          if (err instanceof NetworkError) {
            return session.text(err.message, err.params)
          }
          logger.error(err)
          return session.text('.download-error')
        }

        const size = getImageSize(image)
        Object.assign(parameters, {
          image: image.toString('base64'),
          scale: options.scale ?? 11,
          steps: options.steps ?? 50,
        })
        if (options.enhance) {
          if (size.width + size.height !== 1280) {
            return session.text('.invalid-size')
          }
          Object.assign(parameters, {
            height: size.height * 1.5,
            width: size.width * 1.5,
            noise: options.noise ?? 0,
            strength: options.strength ?? 0.2,
          })
        } else {
          const orient = resizeInput(size)
          Object.assign(parameters, {
            height: orient.height,
            width: orient.width,
            noise: options.noise ?? 0.2,
            strength: options.strength ?? 0.7,
          })
        }
      } else {
        Object.assign(parameters, {
          height: orient.height,
          width: orient.width,
          scale: options.scale ?? 12,
          steps: options.steps ?? 28,
          noise: options.noise ?? 0.2,
          strength: options.strength ?? 0.7,
        })
      }

      try {
        const path = config.type === 'naifu' ? '/generate-stream' : '/ai/generate-image'
        const art = await ctx.http.axios(config.endpoint + path, {
          method: 'POST',
          timeout: config.requestTimeout,
          headers: {
            ...headers,
            authorization: 'Bearer ' + token,
          },
          data: config.type === 'naifu'
            ? { ...parameters, prompt: input }
            : { model, input, parameters },
        }).then(res => {
          return res.data.substr(27, res.data.length)
        })

        const attrs = {
          userId: session.selfId,
          nickname: session.text('.nickname'),
        }
        const ids = await session.send(segment('message', { forward: true }, [
          segment('message', attrs, `seed = ${seed}`),
          segment('message', attrs, `prompt = ${input}`),
          segment('message', attrs, segment.image('base64://' + art)),
        ]))
        if (config.recallTimeout) {
          ctx.setTimeout(() => {
            for (const id of ids) {
              session.bot.deleteMessage(session.channelId, id)
            }
          }, config.recallTimeout)
        }
      } catch (err) {
        return errorHandler(session, err)
      } finally {
        states[session.cid]?.delete(id)
      }
    })

  ctx.accept(['model', 'orient', 'sampler'], (config) => {
    cmd._options.model.fallback = config.model
    cmd._options.orient.fallback = config.orient
    cmd._options.sampler.fallback = config.sampler
  }, { immediate: true })
}
