import { Context, Dict, Logger, omit, Quester, segment, Session, trimSlash } from 'koishi'
import { Config, modelMap, models, orientMap, parseForbidden, parseInput, sampler, upscalers } from './config'
import { ImageData, StableDiffusionWebUI } from './types'
import { closestMultiple, download, forceDataPrefix, getImageSize, login, NetworkError, project, resizeInput, Size } from './utils'
import {} from '@koishijs/translator'
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
  ctx.i18n.define('zh', require('./locales/zh-CN'))
  ctx.i18n.define('zh-TW', require('./locales/zh-TW'))
  ctx.i18n.define('en', require('./locales/en-US'))
  ctx.i18n.define('fr', require('./locales/fr-FR'))
  ctx.i18n.define('ja', require('./locales/ja-JP'))

  let forbidden: Forbidden[]
  const tasks: Dict<Set<string>> = Object.create(null)
  const globalTasks = new Set<string>()

  ctx.accept(['forbidden'], (config) => {
    forbidden = parseForbidden(config.forbidden)
  }, { immediate: true })

  let tokenTask: Promise<string> = null
  const getToken = () => tokenTask ||= login(ctx)
  ctx.accept(['token', 'type', 'email', 'password'], () => tokenTask = null)

  type HiddenCallback = (session: Session<'authority'>) => boolean

  const thirdParty = () => !['login', 'token'].includes(config.type)

  const restricted: HiddenCallback = (session) => {
    if (typeof config.allowAnlas === 'boolean') {
      return !config.allowAnlas
    } else {
      return session.user.authority < config.allowAnlas
    }
  }

  const some = (...args: HiddenCallback[]): HiddenCallback => (session) => {
    return args.some(callback => callback(session))
  }

  const step = (source: string) => {
    const value = +source
    if (value * 0 === 0 && Math.floor(value) === value && value > 0 && value <= (config.maxSteps || Infinity)) return value
    throw new Error()
  }

  const resolution = (source: string, session: Session<'authority'>): Size => {
    if (source in orientMap) return orientMap[source]
    if (restricted(session)) throw new Error()
    const cap = source.match(/^(\d+)[x×](\d+)$/)
    if (!cap) throw new Error()
    const width = closestMultiple(+cap[1])
    const height = closestMultiple(+cap[2])
    if (Math.max(width, height) > (config.maxResolution || Infinity)) {
      throw new Error()
    }
    return { width, height }
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
    .option('resolution', '-r <resolution>', { type: resolution })
    .option('output', '-o', { type: ['minimal', 'default', 'verbose'] })
    .option('override', '-O', { hidden: restricted })
    .option('sampler', '-s <sampler>')
    .option('seed', '-x <seed:number>')
    .option('steps', '-t <step>', { type: step, hidden: restricted })
    .option('scale', '-c <scale:number>')
    .option('noise', '-n <noise:number>', { hidden: some(restricted, thirdParty) })
    .option('strength', '-N <strength:number>', { hidden: restricted })
    .option('hiresFix', '-H', { hidden: () => config.type !== 'sd-webui' })
    .option('undesired', '-u <undesired>')
    .option('noTranslator', '-T', { hidden: () => !ctx.translator || !config.translator })
    .option('iterations', '-i <iterations:posint>', { fallback: 1, hidden: () => config.maxIterations <= 1 })
    .action(async ({ session, options }, input) => {
      if (!input?.trim()) return session.execute('help novelai')

      if (options.iterations && options.iterations > config.maxIterations) {
        return session.text('.exceed-max-iteration', [config.maxIterations])
      }

      let imgUrl: string, image: ImageData
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
        delete options.noise
        delete options.strength
        delete options.override
      }

      if (config.translator && ctx.translator && !options.noTranslator) {
        try {
          input = await ctx.translator.translate({ input, target: 'en' })
        } catch (err) {
          logger.warn(err)
        }
      }

      const [errPath, prompt, uc] = parseInput(input, config, forbidden, options.override)
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
        // 0: low quality + bad anatomy
        // 1: low quality
        // 2: none
        ucPreset: 2,
        qualityToggle: false,
        scale: options.scale ?? 11,
        steps: options.steps ?? (imgUrl ? config.imageSteps : config.textSteps),
      }

      if (imgUrl) {
        try {
          image = await download(ctx, imgUrl)
        } catch (err) {
          if (err instanceof NetworkError) {
            return session.text(err.message, err.params)
          }
          logger.error(err)
          return session.text('.download-error')
        }

        if (options.enhance) {
          const size = getImageSize(image.buffer)
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
          options.resolution ||= resizeInput(getImageSize(image.buffer))
          Object.assign(parameters, {
            height: options.resolution.height,
            width: options.resolution.width,
            noise: options.noise ?? 0.2,
            strength: options.strength ?? 0.7,
          })
        }
      } else {
        options.resolution ||= typeof config.resolution === 'string'
          ? orientMap[config.resolution]
          : config.resolution
        Object.assign(parameters, {
          height: options.resolution.height,
          width: options.resolution.width,
        })
      }

      const getRandomId = () => Math.random().toString(36).slice(2)
      const iterations = Array(options.iterations).fill(0).map(getRandomId)
      if (config.maxConcurrency) {
        const store = tasks[session.cid] ||= new Set()
        if (store.size >= config.maxConcurrency) {
          return session.text('.concurrent-jobs')
        } else {
          iterations.forEach((id) => store.add(id))
        }
      }

      session.send(globalTasks.size
        ? session.text('.pending', [globalTasks.size])
        : session.text('.waiting'))

      iterations.forEach((id) => globalTasks.add(id))
      const cleanUp = (id: string) => {
        tasks[session.cid]?.delete(id)
        globalTasks.delete(id)
      }

      const path = (() => {
        switch (config.type) {
          case 'sd-webui':
            return image ? '/sdapi/v1/img2img' : '/sdapi/v1/txt2img'
          case 'stable-horde':
            return '/api/v2/generate/async'
          case 'naifu':
            return '/generate-stream'
          default:
            return '/ai/generate-image'
        }
      })()

      const getPayload = () => {
        switch (config.type) {
          case 'login':
          case 'token':
          case 'naifu': {
            parameters.sampler = sampler.sd2nai(options.sampler)
            parameters.image = image?.base64 // NovelAI / NAIFU accepts bare base64 encoded image
            if (config.type === 'naifu') return parameters
            return { model, input: prompt, parameters: omit(parameters, ['prompt']) }
          }
          case 'sd-webui': {
            return {
              sampler_index: sampler.sd[options.sampler],
              init_images: image && [image.dataUrl], // sd-webui accepts data URLs with base64 encoded image
              restore_faces: config.restoreFaces ?? false,
              enable_hr: options.hiresFix ?? config.hiresFix ?? false,
              ...project(parameters, {
                prompt: 'prompt',
                batch_size: 'n_samples',
                seed: 'seed',
                negative_prompt: 'uc',
                cfg_scale: 'scale',
                steps: 'steps',
                width: 'width',
                height: 'height',
                denoising_strength: 'strength',
              }),
            }
          }
          case 'stable-horde': {
            return {
              prompt: parameters.prompt,
              params: {
                sampler_name: options.sampler.replace('_ka', ''),
                cfg_scale: parameters.scale,
                denoising_strength: parameters.strength,
                seed: parameters.seed.toString(),
                height: parameters.height,
                width: parameters.width,
                post_processing: [],
                karras: options.sampler.includes('_ka'),
                steps: parameters.steps,
                n: 1,
              },
              nsfw: config.nsfw !== 'disallow',
              trusted_workers: config.trustedWorkerOnly,
              censor_nsfw: config.nsfw === 'censor',
              models: [options.model],
              source_image: image?.base64,
              source_processing: image ? 'img2img' : undefined,
            }
          }
        }
      }

      const getHeaders = () => {
        switch (config.type) {
          case 'login':
          case 'token':
          case 'naifu':
            return { Authorization: `Bearer ${token}` }
          case 'stable-horde':
            return { apikey: token }
        }
      }

      const iterate = async () => {
        const request = async () => {
          const res = await ctx.http.axios(trimSlash(config.endpoint) + path, {
            method: 'POST',
            timeout: config.requestTimeout,
            headers: {
              ...config.headers,
              ...getHeaders(),
            },
            data: getPayload(),
          })

          if (config.type === 'sd-webui') {
            return forceDataPrefix((res.data as StableDiffusionWebUI.Response).images[0])
          }
          if (config.type === 'stable-horde') {
            const uuid = res.data.id

            const check = () => ctx.http.get(trimSlash(config.endpoint) + '/api/v2/generate/check/' + uuid).then((res) => res.done)
            const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
            while (await check() === false) {
              await sleep(config.pollInterval)
            }
            const result = await ctx.http.get(trimSlash(config.endpoint) + '/api/v2/generate/status/' + uuid)
            return forceDataPrefix(result.generations[0].img, 'image/webp')
          }
          // event: newImage
          // id: 1
          // data:
          return forceDataPrefix(res.data?.slice(27))
        }

        let dataUrl: string, count = 0
        while (true) {
          try {
            dataUrl = await request()
            break
          } catch (err) {
            if (Quester.isAxiosError(err)) {
              if (err.code && err.code !== 'ETIMEDOUT' && ++count < config.maxRetryCount) {
                continue
              }
            }

            return await session.send(handleError(session, err))
          }
        }

        if (!dataUrl.trim()) return await session.send(session.text('.empty-response'))

        function getContent() {
          if (options.output === 'minimal') return segment.image(dataUrl)
          const attrs = {
            userId: session.userId,
            nickname: session.author?.nickname || session.username,
          }
          const result = segment('figure')
          const lines = [`seed = ${parameters.seed}`]
          if (options.output === 'verbose') {
            if (!thirdParty()) {
              lines.push(`model = ${model}`)
            }
            lines.push(
              `sampler = ${options.sampler}`,
              `steps = ${parameters.steps}`,
              `scale = ${parameters.scale}`,
            )
            if (parameters.image) {
              lines.push(
                `strength = ${parameters.strength}`,
                `noise = ${parameters.noise}`,
              )
            }
          }
          result.children.push(segment('message', attrs, lines.join('\n')))
          result.children.push(segment('message', attrs, `prompt = ${prompt}`))
          if (options.output === 'verbose') {
            result.children.push(segment('message', attrs, `undesired = ${uc}`))
          }
          result.children.push(segment('message', attrs, segment.image(dataUrl)))
          return result
        }

        const messageIds = await session.send(getContent())
        if (messageIds.length && config.recallTimeout) {
          ctx.setTimeout(() => {
            for (const id of messageIds) {
              session.bot.deleteMessage(session.channelId, id)
            }
          }, config.recallTimeout)
        }
      }

      while (iterations.length) {
        try {
          await iterate()
          cleanUp(iterations.pop())
          parameters.seed++
        } catch (err) {
          iterations.forEach(cleanUp)
          throw err
        }
      }
    })

  ctx.accept(['scale', 'model', 'sampler', 'output'], (config) => {
    const getSamplers = () => {
      switch (config.type) {
        case 'sd-webui':
          return sampler.sd
        case 'stable-horde':
          return sampler.horde
        default:
          return sampler.nai
      }
    }

    cmd._options.output.fallback = config.output
    cmd._options.scale.fallback = config.scale
    cmd._options.model.fallback = config.model
    cmd._options.sampler.fallback = config.sampler
    cmd._options.sampler.type = Object.keys(getSamplers())
  }, { immediate: true })

  const subcmd = ctx.intersect(() => config.type === 'sd-webui')
    .command('novelai.upscale')
    .shortcut('放大', { fuzzy: true })
    .option('scale', '-s <scale:number>', { fallback: 2 })
    .option('resolution', '-r <resolution>', { type: resolution })
    .option('crop', '-C, --no-crop', { value: false, fallback: true })
    .option('upscaler', '-1 <upscaler>', { type: upscalers })
    .option('upscaler2', '-2 <upscaler2>', { type: upscalers })
    .option('visibility', '-v <visibility:number>')
    .option('upscaleFirst', '-f', { fallback: false })
    .action(async ({ session, options }, input) => {
      let imgUrl: string
      segment.transform(input, {
        image(attrs) {
          imgUrl = attrs.url
          return ''
        },
      })

      if (!imgUrl) return session.text('.expect-image')
      let image: ImageData
      try {
        image = await download(ctx, imgUrl)
      } catch (err) {
        if (err instanceof NetworkError) {
          return session.text(err.message, err.params)
        }
        logger.error(err)
        return session.text('.download-error')
      }

      const payload: StableDiffusionWebUI.ExtraSingleImageRequest = {
        image: image.dataUrl,
        resize_mode: options.resolution ? 1 : 0,
        show_extras_results: true,
        upscaling_resize: options.scale,
        upscaling_resize_h: options.resolution?.height,
        upscaling_resize_w: options.resolution?.width,
        upscaling_crop: options.crop,
        upscaler_1: options.upscaler,
        upscaler_2: options.upscaler2 ?? 'None',
        extras_upscaler_2_visibility: options.visibility ?? 1,
        upscale_first: options.upscaleFirst,
      }

      try {
        const { data } = await ctx.http.axios<StableDiffusionWebUI.ExtraSingleImageResponse>(trimSlash(config.endpoint) + '/sdapi/v1/extra-single-image', {
          method: 'POST',
          timeout: config.requestTimeout,
          headers: {
            ...config.headers,
          },
          data: payload,
        })
        return segment.image(forceDataPrefix(data.image))
      } catch (e) {
        logger.warn(e)
        return session.text('.unknown-error')
      }
    })

  ctx.accept(['upscaler'], (config) => {
    subcmd._options.upscaler.fallback = config.upscaler
  }, { immediate: true })
}
