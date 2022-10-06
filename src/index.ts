import { Context, Dict, Logger, Quester, Schema, Time, Session } from 'koishi'

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

const undesiredMap = {
  lowQuality_badAnatomy: 'nsfw, lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry',
  lowQuality: 'nsfw, lowres, text, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry',
  none: 'lowres'
} as const

type Model = keyof typeof modelMap
type Orient = keyof typeof orientMap
type Undesired = keyof typeof undesiredMap
type Sampler = typeof samplers[number]

const models = Object.keys(modelMap) as Model[]
const orients = Object.keys(orientMap) as Orient[]
const undesiredContents = Object.keys(undesiredMap) as Undesired[]
const samplers = ['k_euler_ancestral', 'k_euler', 'k_lms', 'plms', 'ddim'] as const

export interface Config {
  token: string
  model?: Model
  orient?: Orient
  undesiredMap?: Undesired
  sampler?: Sampler
  forbidden?: string[]
  requestTimeout?: number
  recallTimeout?: number
  maxConcurrency?: number
}

export const Config: Schema<Config> = Schema.object({
  token: Schema.string().description('授权令牌。').required(),
  model: Schema.union(models).description('默认的生成模型。').default('nai'),
  orient: Schema.union(orients).description('默认的图片方向。').default('portrait'),
  undesiredContents: Schema.union(undesiredContents).description('排除的内容, 默认为lowQuality_badAnatomy。').default('lowQuality_badAnatomy'),
  sampler: Schema.union(samplers).description('默认的采样器。').default('k_euler_ancestral'),
  forbidden: Schema.array(String).description('全局违禁词列表。'),
  requestTimeout: Schema.number().role('time').description('当请求超过这个时间时会中止并提示超时。').default(Time.minute * 0.5),
  recallTimeout: Schema.number().role('time').description('图片发送后自动撤回的时间 (设置为 0 以禁用此功能)。').default(0),
  maxConcurrency: Schema.number().description('单个频道下的最大并发数量 (设置为 0 以禁用此功能)。').default(0),
})

function assembleMsgNode(user: {uin: string; name: string}, content: string | string[] | {}) {
  return {
    type: 'node',
    data: {
      uin: user.uin,
      name: user.name,
      content,
    },
  }
}

function errorHandler(session: Session, err: Error) {
  if (Quester.isAxiosError(err)) {
    if (err.response?.status === 429) {
      return session.text('.rate-limited')
    } else if (err.response?.status === 401) {
      return session.text('.invalid-token')
    }
  }
  logger.error(err)
}

export function apply(ctx: Context, config: Config) {
  ctx.i18n.define('zh', require('./locales/zh'))

  const states: Dict<Set<string>> = Object.create(null)

  const cmd = ctx.guild().command('novelai <prompts:text>')
    .shortcut('画画', { fuzzy: true })
    .shortcut('约稿', { fuzzy: true })
    .option('model', '-m <model>', { type: models })
    .option('orient', '-o <orient>', { type: orients })
    .option('sampler', '-s <sampler>', { type: samplers })
    .option('seed', '-x <seed:number>')
    .option('undesired', '-u <undesired>', { type: undesiredContents})
    .action(async ({ session, options }, input) => {
      if (!input?.trim()) return session.execute('help novelai')
      input = input.toLowerCase().replace(/[,，]/g, ', ').replace(/\s+/g, ' ')
      if (/[^\s\w"'“”‘’.,:|\[\]\{\}-]/.test(input)) {
        return session.text('.invalid-input')
      }

      const words = input.split(/\W+/g)
      const forbidden = config.forbidden.filter(word => words.includes(word))
      if (forbidden.length) {
        return session.text('.forbidden-word', [forbidden.join(', ')])
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
      const undesired = undesiredMap[options.undesired]
      const seed = options.seed || Math.round(new Date().getTime() / 1000)
      session.send(session.text('.waiting'))

      try {
        const art = await ctx.http.axios('https://api.novelai.net/ai/generate-image', {
          method: 'POST',
          timeout: config.requestTimeout,
          headers: {
            authorization: 'Bearer ' + config.token,
            authority: 'api.novelai.net',
            path: '/ai/generate-image',
            'content-type': 'application/json',
            referer: 'https://novelai.net/',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
          },
          data: {
            model,
            input,
            parameters: {
              height: orient.height,
              width: orient.width,
              seed,
              n_samples: 1,
              noise: 0.2,
              sampler: options.sampler,
              scale: 12,
              steps: 28,
              strength: 0.7,
              uc: undesired,
              ucPreset: 1,
            },
          },
        }).then(res => {
          return res.data.substr(27, res.data.length)
        })

        const infoNode = assembleMsgNode(
          { uin: session.bot.selfId, name: session.text('.nickname') },
          `seed = ${seed}\ntags = ${input}`,
        )
        const artNode = assembleMsgNode(
          { uin: session.bot.selfId, name: session.text('.nickname') },
          { type: 'image', data: { file: 'base64://' + art } },
        )

        const msgId = session.bot.internal.sendGroupForwardMsg(session.channelId, [infoNode, artNode])
        if (config.recallTimeout) {
          ctx.setTimeout(() => {
            session.bot.deleteMessage(session.channelId, msgId)
          }, config.recallTimeout)
        }
      } catch (err) {
        errorHandler(session, err)
        return session.text('.unknown-error')
      } finally {
        states[session.cid]?.delete(id)
      }
    }
  )

  ctx.accept(['model', 'orient', 'sampler'], (config) => {
    cmd._options.model.fallback = config.model
    cmd._options.orient.fallback = config.orient
    cmd._options.sampler.fallback = config.sampler
  }, { immediate: true })
}
