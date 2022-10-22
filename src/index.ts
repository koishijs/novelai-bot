import { Context, Dict, Logger, omit, Quester, segment, Session, trimSlash } from 'koishi'
import { Config, modelMap, models, orientMap, parseForbidden, parseInput, sampler } from './config'
import { StableDiffusionWebUI } from './types'
import { download, getImageSize, login, NetworkError, project, resizeInput, Size } from './utils'
import {} from '@koishijs/plugin-help'

export * from './config'

export const reactive = true
export const name = 'novelai'

const logger = new Logger('novelai')

function handleError(session: Session, err: Error) {
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
  const tasks: Dict<Set<string>> = Object.create(null)
  const globalTasks = new Set<string>()

  ctx.accept(['forbidden'], (config) => {
    forbidden = parseForbidden(config.forbidden)
  }, { immediate: true })

  let tokenTask: Promise<string> = null
  const getToken = () => tokenTask ||= login(ctx)
  ctx.accept(['token', 'type', 'email', 'password'], () => tokenTask = null)

  const thirdParty = () => !['login', 'token'].includes(config.type)

  const restricted = (session: Session<'authority'>) => {
    if (thirdParty()) return false
    if (typeof config.allowAnlas === 'boolean') {
      return !config.allowAnlas
    } else {
      return session.user.authority < config.allowAnlas
    }
  }

  const viewport = (source: string, session: Session<'authority'>): Size => {
    if (source in orientMap) return orientMap[source]
    if (restricted(session)) throw new Error()
    const cap = source.match(/^(\d+)[x×](\d+)$/)
    if (!cap) throw new Error()
    return { width: +cap[1], height: +cap[2] }
  }

  const cmd = ctx.command('novelai <prompts:text>')
    .alias('nai')
    .userFields(['authority'])
    .shortcut('画画', { fuzzy: true })
    .shortcut('畫畫', { fuzzy: true })
    .shortcut('约稿', { fuzzy: true })
    .shortcut('約稿', { fuzzy: true })
    .shortcut('增强', { fuzzy: true, options: { enhance: true } })
    .shortcut('增強', { fuzzy: true, options: { enhance: true } })
    .option('enhance', '-e', { hidden: restricted })
    .option('model', '-m <model>', { type: models, hidden: thirdParty })
    .option('viewport', '-o, -v <viewport>', { type: viewport })
    .option('sampler', '-s <sampler>')
    .option('seed', '-x <seed:number>')
    .option('steps', '-t <step:number>', { hidden: restricted })
    .option('scale', '-c <scale:number>')
    .option('noise', '-n <noise:number>', { hidden: restricted })
    .option('strength', '-N <strength:number>', { hidden: restricted })
    .option('undesired', '-u <undesired>')
    .action(async ({ session, options }, input) => {
      if (!input?.trim()) return session.execute('help novelai')

      let imgUrl: string
      if (!restricted(session)) {
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

      const [errPath, prompt, uc] = parseInput(input, config, forbidden)
      if (errPath) return session.text(errPath)

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

      const model = modelMap[options.model]
      const seed = options.seed || Math.floor(Math.random() * Math.pow(2, 32))

      const parameters: Dict = {
        seed,
        prompt,
        n_samples: 1,
        uc,
        ucPreset: 0,
      }

      if (imgUrl) {
        let image: [ArrayBuffer, string]
        try {
          image = await download(ctx, imgUrl)
        } catch (err) {
          if (err instanceof NetworkError) {
            return session.text(err.message, err.params)
          }
          logger.error(err)
          return session.text('.download-error')
        }

        const size = getImageSize(image[0])
        Object.assign(parameters, {
          image: image[1],
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
          height: options.viewport.height,
          width: options.viewport.width,
          scale: options.scale ?? 12,
          steps: options.steps ?? 28,
          noise: options.noise ?? 0.2,
          strength: options.strength ?? 0.7,
        })
      }

      const id = Math.random().toString(36).slice(2)
      if (config.maxConcurrency) {
        const store = tasks[session.cid] ||= new Set()
        if (store.size >= config.maxConcurrency) {
          return session.text('.concurrent-jobs')
        } else {
          store.add(id)
        }
      }

      session.send(globalTasks.size > 1
        ? session.text('.pending', [globalTasks.size - 1])
        : session.text('.waiting'))

      globalTasks.add(id)
      const cleanUp = () => {
        tasks[session.cid]?.delete(id)
        globalTasks.delete(id)
      }

      function getPostData() {
        if (config.type !== 'sd-webui') {
          parameters.sampler = sampler.sd2nai(options.sampler)
          return config.type === 'naifu'
            ? parameters
            : { model, input, parameters: omit(parameters, ['prompt']) }
        }

        return {
          sampler_index: sampler.sd[options.sampler],
          ...project(parameters, {
            prompt: 'prompt',
            n_samples: 'n_samples',
            seed: 'seed',
            negative_prompt: 'uc',
            cfg_scale: 'scale',
            steps: 'steps',
            width: 'width',
            height: 'height',
          }),
        }
      }

      const path = config.type === 'sd-webui' ? '/sdapi/v1/txt2img' : config.type === 'naifu' ? '/generate-stream' : '/ai/generate-image'
      const request = () => ctx.http.axios(trimSlash(config.endpoint) + path, {
        method: 'POST',
        timeout: config.requestTimeout,
        headers: {
          ...config.headers,
          authorization: 'Bearer ' + token,
        },
        data: getPostData(),
      }).then((res) => {
        if (config.type === 'sd-webui') {
          return (res.data as StableDiffusionWebUI.Response).images[0]
        }
        // event: newImage
        // id: 1
        // data:
        return res.data.slice(27)
      })

      let base64: string, count = 0
      while (true) {
        try {
          base64 = await request()
          cleanUp()
          break
        } catch (err) {
          if (Quester.isAxiosError(err)) {
            if (err.code && err.code !== 'ETIMEDOUT' && ++count < config.maxRetryCount) {
              continue
            }
          }
          cleanUp()
          return handleError(session, err)
        }
      }

      if (!base64.trim()) return session.text('.empty-response')

      function getContent() {
        if (config.output === 'minimal') return segment.image('base64://' + base64)
        const attrs = {
          userId: session.userId,
          nickname: session.author?.nickname || session.username,
        }
        const result = segment('figure')
        const params = [`seed = ${seed}`]
        if (config.output === 'verbose') {
          params.push(
            `model = ${options.model}`,
            `sampler = ${options.sampler}`,
            `steps = ${options.steps}`,
            `scale = ${options.scale}`,
          )
        }
        result.children.push(segment('message', attrs, params.join('\n')))
        result.children.push(segment('message', attrs, `prompt = ${input}`))
        if (config.output === 'verbose') {
          result.children.push(segment('message', attrs, `undesired = ${uc}`))
        }
        result.children.push(segment('message', attrs, segment.image('base64://' + base64)))
        return result
      }

      const ids = await session.send(getContent())

      if (config.recallTimeout) {
        ctx.setTimeout(() => {
          for (const id of ids) {
            session.bot.deleteMessage(session.channelId, id)
          }
        }, config.recallTimeout)
      }
    })

  ctx.accept(['model', 'orient', 'sampler'], (config) => {
    cmd._options.model.fallback = config.model
    cmd._options.viewport.fallback = config.orient
    cmd._options.sampler.fallback = config.sampler
    cmd._options.sampler.type = Object.keys(config.type === 'sd-webui' ? sampler.sd : sampler.nai)
  }, { immediate: true })
}
