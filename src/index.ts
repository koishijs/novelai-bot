import { Computed, Context, Dict, h, Logger, omit, Quester, Session, SessionError, sleep, trimSlash } from 'koishi'
import { Config, modelMap, models, orientMap, parseInput, sampler, upscalers, scheduler } from './config'
import { ImageData, StableDiffusionWebUI } from './types'
import { closestMultiple, download, forceDataPrefix, getImageSize, login, NetworkError, project, resizeInput, Size } from './utils'
import { } from '@koishijs/translator'
import { } from '@koishijs/plugin-help'
import AdmZip from 'adm-zip'
import { resolve } from 'path'
import { readFile } from 'fs/promises'

export * from './config'

declare module 'koishi' {
  interface Events {
    'novelai/finish'(id: string): void
  }
}

export const reactive = true
export const name = 'novelai'

const logger = new Logger('novelai')

function handleError(session: Session, err: Error) {
  if (Quester.Error.is(err)) {
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

export const inject = {
  required: ['http'],
  optional: ['translator'],
}

export function apply(ctx: Context, config: Config) {
  ctx.i18n.define('zh-CN', require('./locales/zh-CN'))
  ctx.i18n.define('zh-TW', require('./locales/zh-TW'))
  ctx.i18n.define('en-US', require('./locales/en-US'))
  ctx.i18n.define('fr-FR', require('./locales/fr-FR'))
  ctx.i18n.define('ja-JP', require('./locales/ja-JP'))

  const tasks: Dict<Set<string>> = Object.create(null)
  const globalTasks = new Set<string>()
  const globalPending = new Set<string>()

  let tokenTask: Promise<string> = null
  const getToken = () => tokenTask ||= login(ctx)
  ctx.accept(['token', 'type', 'email', 'password'], () => tokenTask = null)

  type HiddenCallback = (session: Session<'authority'>) => boolean

  const useFilter = (filter: Computed<boolean>): HiddenCallback => (session) => {
    return session.resolve(filter) ?? true
  }

  const useBackend = (...types: Config['type'][]): HiddenCallback => () => {
    return types.includes(config.type)
  }

  const thirdParty = () => !['login', 'token'].includes(config.type)

  const restricted: HiddenCallback = (session) => {
    return !thirdParty() && useFilter(config.features.anlas)(session)
  }

  const noImage: HiddenCallback = (session) => {
    return !useFilter(config.features.image)(session)
  }

  const some = (...args: HiddenCallback[]): HiddenCallback => (session) => {
    return args.some(callback => callback(session))
  }

  const step = (source: string, session: Session) => {
    const value = +source
    if (value * 0 === 0 && Math.floor(value) === value && value > 0 && value <= session.resolve(config.maxSteps || Infinity)) return value
    throw new Error()
  }

  const resolution = (source: string, session: Session<'authority'>): Size => {
    if (source in orientMap) return orientMap[source]
    const cap = source.match(/^(\d+)[x×](\d+)$/)
    if (!cap) throw new Error()
    const width = closestMultiple(+cap[1])
    const height = closestMultiple(+cap[2])
    if (Math.max(width, height) > session.resolve(config.maxResolution || Infinity)) {
      throw new SessionError('commands.novelai.messages.invalid-resolution')
    }
    return { width, height, custom: true }
  }

  const cmd = ctx.command('novelai <prompts:text>')
    .alias('nai')
    .alias('imagine')
    .userFields(['authority'])
    .shortcut('imagine', { i18n: true, fuzzy: true })
    .shortcut('enhance', { i18n: true, fuzzy: true, options: { enhance: true } })
    .option('enhance', '-e', { hidden: some(restricted, thirdParty, noImage) })
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
    .option('smea', '-S', { hidden: () => config.model !== 'nai-v3' })
    .option('smeaDyn', '-d', { hidden: () => config.model !== 'nai-v3' })
    .option('scheduler', '-C <scheduler:string>', {
      hidden: () => config.type === 'naifu',
      type: ['token', 'login'].includes(config.type)
        ? scheduler.nai
        : config.type === 'sd-webui'
        ? scheduler.sd
        : config.type === 'stable-horde'
        ? scheduler.horde
        : [],
    })
    .option('decrisper', '-D', { hidden: thirdParty })
    .option('undesired', '-u <undesired>')
    .option('noTranslator', '-T', { hidden: () => !ctx.translator || !config.translator })
    .option('iterations', '-i <iterations:posint>', { fallback: 1, hidden: () => config.maxIterations <= 1 })
    .option('batch', '-b <batch:option>', { fallback: 1, hidden: () => config.maxIterations <= 1 })
    .action(async ({ session, options }, input) => {
      if (config.defaultPromptSw) {
        if (session.user.authority < session.resolve(config.authLvDefault)) {
          return session.text('internal.low-authority')
        }
        if (session.user.authority < session.resolve(config.authLv)) {
          input = ''
          options = options.resolution ? { resolution: options.resolution } : {}
        }
      } else if (
        !config.defaultPromptSw
        && session.user.authority < session.resolve(config.authLv)
      ) return session.text('internal.low-auth')

      const haveInput = !!input?.trim()
      if (!haveInput && !config.defaultPromptSw) return session.execute('help novelai')

      // Check if the user is allowed to use this command.
      // This code is originally written in the `resolution` function,
      // but currently `session.user` is not available in the type infering process.
      // See: https://github.com/koishijs/novelai-bot/issues/159
      if (options.resolution?.custom && restricted(session)) {
        return session.text('.custom-resolution-unsupported')
      }

      const { batch = 1, iterations = 1 } = options
      const total = batch * iterations
      if (total > config.maxIterations) {
        return session.text('.exceed-max-iteration', [config.maxIterations])
      }

      const allowText = useFilter(config.features.text)(session)
      const allowImage = useFilter(config.features.image)(session)

      let imgUrl: string, image: ImageData
      if (!restricted(session) && haveInput) {
        input = h('', h.transform(h.parse(input), {
          img(attrs) {
            if (!allowImage) throw new SessionError('commands.novelai.messages.invalid-content')
            if (imgUrl) throw new SessionError('commands.novelai.messages.too-many-images')
            imgUrl = attrs.src
            return ''
          },
        })).toString(true)

        if (options.enhance && !imgUrl) {
          return session.text('.expect-image')
        }

        if (!input.trim() && !config.basePrompt) {
          return session.text('.expect-prompt')
        }
      } else {
        input = haveInput ? h('', h.transform(h.parse(input), {
          image(attrs) {
            throw new SessionError('commands.novelai.messages.invalid-content')
          },
        })).toString(true) : input
        delete options.enhance
        delete options.steps
        delete options.noise
        delete options.strength
        delete options.override
      }

      if (!allowText && !imgUrl) {
        return session.text('.expect-image')
      }

      if (haveInput && config.translator && ctx.translator && !options.noTranslator) {
        try {
          input = await ctx.translator.translate({ input, target: 'en' })
        } catch (err) {
          logger.warn(err)
        }
      }

      const [errPath, prompt, uc] = parseInput(session, input, config, options.override)
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
        n_samples: options.batch,
        uc,
        // 0: low quality + bad anatomy
        // 1: low quality
        // 2: none
        ucPreset: 2,
        qualityToggle: false,
        scale: options.scale ?? session.resolve(config.scale),
        steps: options.steps ?? session.resolve(imgUrl ? config.imageSteps : config.textSteps),
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
            strength: options.strength ?? session.resolve(config.strength),
          })
        }
      } else {
        if (!options.resolution) {
          const resolution = session.resolve(config.resolution)
          options.resolution = typeof resolution === 'string' ? orientMap[resolution] : resolution
        }
        Object.assign(parameters, {
          height: options.resolution.height,
          width: options.resolution.width,
        })
      }

      if (options.hiresFix || config.hiresFix) {
        // set default denoising strength to `0.75` for `hires fix` feature
        // https://github.com/koishijs/novelai-bot/issues/158
        parameters.strength ??= session.resolve(config.strength)
      }

      const getRandomId = () => Math.random().toString(36).slice(2)
      const container = Array(iterations).fill(0).map(getRandomId)
      if (config.maxConcurrency) {
        const store = tasks[session.cid] ||= new Set()
        if (store.size >= config.maxConcurrency) {
          return session.text('.concurrent-jobs')
        } else {
          container.forEach((id) => store.add(id))
        }
      }

      session.send(globalTasks.size
        ? session.text('.pending', [globalTasks.size])
        : session.text('.waiting'))

      if (config.globalConcurrency) {
        if (globalTasks.size >= config.globalConcurrency) {
          const pendingId = container.pop()
          globalPending.add(pendingId)
          await new Promise<void>((resolve) => {
            const dispose = ctx.on('novelai/finish', (id) => {
              if (id !== pendingId) return
              resolve()
              dispose()
            }
          }))
        }
      }

      container.forEach((id) => globalTasks.add(id))
      const cleanUp = (id: string) => {
        tasks[session.cid]?.delete(id)
        globalTasks.delete(id)
        if (globalPending.size) {
          const id = globalPending.values().next().value
          globalPending.delete(id)
          ctx.parallel('novelai/finish', id)
        }
      }

      const path = (() => {
        switch (config.type) {
          case 'sd-webui':
            return image ? '/sdapi/v1/img2img' : '/sdapi/v1/txt2img'
          case 'stable-horde':
            return '/api/v2/generate/async'
          case 'naifu':
            return '/generate-stream'
          case 'comfyui':
            return '/prompt'
          default:
            return '/ai/generate-image'
        }
      })()

      const getPayload = async () => {
        switch (config.type) {
          case 'login':
          case 'token':
          case 'naifu': {
            parameters.params_version = 1
            parameters.sampler = sampler.sd2nai(options.sampler, model)
            parameters.image = image?.base64 // NovelAI / NAIFU accepts bare base64 encoded image
            if (config.type === 'naifu') return parameters
            // The latest interface changes uc to negative_prompt, so that needs to be changed here as well
            if (parameters.uc) {
              parameters.negative_prompt = parameters.uc
              delete parameters.uc
            }
            parameters.dynamic_thresholding = options.decrisper ?? config.decrisper
            if (model === 'nai-diffusion-3') {
              parameters.legacy = false
              parameters.legacy_v3_extend = false
              parameters.sm_dyn = options.smeaDyn ?? config.smeaDyn
              parameters.sm = (options.smea ?? config.smea) || parameters.sm_dyn
              parameters.noise_schedule = options.scheduler ?? config.scheduler
              if (['k_euler_ancestral', 'k_dpmpp_2s_ancestral'].includes(parameters.sampler)
                && parameters.noise_schedule === 'karras') {
                parameters.noise_schedule = 'native'
              }
              if (parameters.sampler === 'ddim_v3') {
                parameters.sm = false
                parameters.sm_dyn = false
                delete parameters.noise_schedule
              }
              // Max scale for nai-v3 is 10, but not 20.
              // If the given value is greater than 10,
              // we can assume it is configured with an older version (max 20)
              if (parameters.scale > 10) {
                parameters.scale = parameters.scale / 2
              }
            }
            return { model, input: prompt, parameters: omit(parameters, ['prompt']) }
          }
          case 'sd-webui': {
            return {
              sampler_index: sampler.sd[options.sampler],
              scheduler: options.scheduler,
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
            const nsfw = session.resolve(config.nsfw)
            return {
              prompt: parameters.prompt,
              params: {
                sampler_name: options.sampler,
                cfg_scale: parameters.scale,
                denoising_strength: parameters.strength,
                seed: parameters.seed.toString(),
                height: parameters.height,
                width: parameters.width,
                post_processing: [],
                karras: options.scheduler?.toLowerCase() === 'karras',
                hires_fix: options.hiresFix ?? config.hiresFix ?? false,
                steps: parameters.steps,
                n: parameters.n_samples,
              },
              nsfw: nsfw !== 'disallow',
              trusted_workers: config.trustedWorkers,
              censor_nsfw: nsfw === 'censor',
              models: [options.model],
              source_image: image?.base64,
              source_processing: image ? 'img2img' : undefined,
              // support r2 upload
              // https://github.com/koishijs/novelai-bot/issues/163
              r2: true,
            }
          }
          case 'comfyui': {
            const workflowText2Image = config.workflowText2Image ? resolve(ctx.baseDir, config.workflowText2Image) : resolve(__dirname,'../data/default-comfyui-t2i-wf.json')
            const workflowImage2Image = config.workflowImage2Image ? resolve(ctx.baseDir, config.workflowImage2Image) : resolve(__dirname,'../data/default-comfyui-i2i-wf.json')
            const workflow = image ? workflowImage2Image : workflowText2Image
            logger.debug('workflow:', workflow)
            const prompt = JSON.parse(await readFile(workflow, 'utf8'))

            // have to upload image to the comfyui server first
            if (image) {
              const body = new FormData()
              const capture = /^data:([\w/.+-]+);base64,(.*)$/.exec(image.dataUrl)
              const [, mime,] = capture

              let name = Date.now().toString()
              const ext = mime === 'image/jpeg' ? 'jpg' : mime === 'image/png' ? 'png' : ''
              if (ext) name += `.${ext}`
              const imageFile = new Blob([image.buffer], {type:mime})
              body.append("image", imageFile, name)
              const res = await ctx.http(trimSlash(config.endpoint) + '/upload/image', {
                method: 'POST',
                headers: {
                  ...config.headers,
                },
                data: body,
              })
              if (res.status === 200) {
                const data = res.data
                let imagePath = data.name
                if (data.subfolder) imagePath = data.subfolder + '/' + imagePath

                for (const nodeId in prompt) {
                  if (prompt[nodeId].class_type === 'LoadImage') {
                    prompt[nodeId].inputs.image = imagePath
                    break
                  }
                }
              } else {
                throw new SessionError('commands.novelai.messages.unknown-error')
              }
            }

            // only change the first node in the workflow
            for (const nodeId in prompt) {
              if (prompt[nodeId].class_type === 'KSampler') {
                prompt[nodeId].inputs.seed = parameters.seed
                prompt[nodeId].inputs.steps = parameters.steps
                prompt[nodeId].inputs.cfg = parameters.scale
                prompt[nodeId].inputs.sampler_name = options.sampler
                prompt[nodeId].inputs.denoise = options.strength ?? config.strength
                prompt[nodeId].inputs.scheduler = options.scheduler ?? config.scheduler
                const positiveNodeId = prompt[nodeId].inputs.positive[0]
                const negativeeNodeId = prompt[nodeId].inputs.negative[0]
                const latentImageNodeId = prompt[nodeId].inputs.latent_image[0]
                prompt[positiveNodeId].inputs.text = parameters.prompt
                prompt[negativeeNodeId].inputs.text = parameters.uc
                prompt[latentImageNodeId].inputs.width = parameters.width
                prompt[latentImageNodeId].inputs.height = parameters.height
                prompt[latentImageNodeId].inputs.batch_size = parameters.n_samples
                break
              }
            }
            for (const nodeId in prompt) {
              if (prompt[nodeId].class_type === 'CheckpointLoaderSimple') {
                prompt[nodeId].inputs.ckpt_name = options.model ?? config.model
                break
              }
            }
            logger.debug('prompt:', prompt)
            return  { prompt }
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

      let finalPrompt = prompt
      const iterate = async () => {
        const request = async () => {
          const res = await ctx.http(trimSlash(config.endpoint) + path, {
            method: 'POST',
            timeout: config.requestTimeout,
            // Since novelai's latest interface returns an application/x-zip-compressed, a responseType must be passed in
            responseType: config.type === 'naifu' ? 'text' : ['login', 'token'].includes(config.type) ? 'arraybuffer' : 'json',
            headers: {
              ...config.headers,
              ...getHeaders(),
            },
            data: await getPayload(),
          })

          if (config.type === 'sd-webui') {
            const data = res.data as StableDiffusionWebUI.Response
            if (data?.info?.prompt) {
              finalPrompt = data.info.prompt
            } else {
              try {
                finalPrompt = (JSON.parse(data.info)).prompt
              } catch (err) {
                logger.warn(err)
              }
            }
            return forceDataPrefix(data.images[0])
          }
          if (config.type === 'stable-horde') {
            const uuid = res.data.id

            const check = () => ctx.http.get(trimSlash(config.endpoint) + '/api/v2/generate/check/' + uuid).then((res) => res.done)
            while (await check() === false) {
              await sleep(config.pollInterval)
            }
            const result = await ctx.http.get(trimSlash(config.endpoint) + '/api/v2/generate/status/' + uuid)
            const imgUrl = result.generations[0].img
            if (!imgUrl.startsWith('http')) {
              // r2 upload
              // in case some client doesn't support r2 upload and follow the ye olde way.
              return forceDataPrefix(result.generations[0].img, 'image/webp')
            }
            const imgRes = await ctx.http(imgUrl, { responseType: 'arraybuffer' })
            const b64 = Buffer.from(imgRes.data).toString('base64')
            return forceDataPrefix(b64, imgRes.headers.get('content-type'))
          }
          if (config.type === 'comfyui') {
            // get filenames from history
            const promptId = res.data.prompt_id
            const check = () => ctx.http.get(trimSlash(config.endpoint) + '/history/' + promptId)
              .then((res) => res[promptId] && res[promptId].outputs)
            const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
            let outputs
            while (!(outputs = await check())) {
              await sleep(config.pollInterval)
            }
            // get images by filename
            const imagesOutput: { data: ArrayBuffer, mime: string }[] = [];
            for (const nodeId in outputs) {
              const nodeOutput = outputs[nodeId]
              if ('images' in nodeOutput) {
                for (const image of nodeOutput['images']) {
                  const urlValues = new URLSearchParams({ filename: image['filename'], subfolder: image['subfolder'], type: image['type'] }).toString()
                  const imgRes = await ctx.http(trimSlash(config.endpoint) + '/view?' + urlValues)
                  imagesOutput.push({ data: imgRes.data, mime: imgRes.headers.get('content-type') })
                  break
                }
              }
            }
            // return first image
            return forceDataPrefix(Buffer.from(imagesOutput[0].data).toString('base64'), imagesOutput[0].mime)
          }
          // event: newImage
          // id: 1
          // data:
          //                                                                        ↓ nai-v3
          if (res.headers.get('content-type') === 'application/x-zip-compressed' || res.headers.get('content-disposition')?.includes('.zip')) {
            const buffer = Buffer.from(res.data, 'binary')  // Ensure 'binary' encoding
            const zip = new AdmZip(buffer)

            // Gets all files in the ZIP file
            const zipEntries = zip.getEntries()
            const firstImageBuffer = zip.readFile(zipEntries[0])
            const b64 = Buffer.from(firstImageBuffer).toString('base64')
            return forceDataPrefix(b64, 'image/png')
          }
          return forceDataPrefix(res.data?.trimEnd().slice(27))
        }

        let dataUrl: string, count = 0
        while (true) {
          try {
            dataUrl = await request()
            break
          } catch (err) {
            if (Quester.Error.is(err)) {
              if (err.code && err.code !== 'ETIMEDOUT' && ++count < config.maxRetryCount) {
                continue
              }
            }

            return await session.send(handleError(session, err))
          }
        }

        if (!dataUrl.trim()) return await session.send(session.text('.empty-response'))

        function getContent() {
          const output = session.resolve(options.output ?? config.output)
          if (output === 'minimal') return h.image(dataUrl)
          const attrs = {
            userId: session.userId,
            nickname: session.author?.nickname || session.username,
          }
          const result = h('figure')
          const lines = [`seed = ${parameters.seed}`]
          if (output === 'verbose') {
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
          result.children.push(h('message', attrs, lines.join('\n')))
          result.children.push(h('message', attrs, `prompt = ${h.escape(finalPrompt)}`))
          if (output === 'verbose') {
            result.children.push(h('message', attrs, `undesired = ${h.escape(uc)}`))
          }
          result.children.push(h('message', attrs, h.image(dataUrl)))
          return result
        }

        logger.debug(`${session.uid}: ${finalPrompt}`)
        const messageIds = await session.send(getContent())
        if (messageIds.length && config.recallTimeout) {
          ctx.setTimeout(() => {
            for (const id of messageIds) {
              session.bot.deleteMessage(session.channelId, id)
            }
          }, config.recallTimeout)
        }
      }

      while (container.length) {
        try {
          await iterate()
          cleanUp(container.pop())
          parameters.seed++
        } catch (err) {
          container.forEach(cleanUp)
          throw err
        }
      }
    })

  ctx.accept(['model', 'sampler'], (config) => {
    const getSamplers = () => {
      switch (config.type) {
        case 'sd-webui':
          return sampler.sd
        case 'stable-horde':
          return sampler.horde
        default:
          return { ...sampler.nai, ...sampler.nai3 }
      }
    }

    cmd._options.model.fallback = config.model
    cmd._options.sampler.fallback = config.sampler
    cmd._options.sampler.type = Object.keys(getSamplers())
  }, { immediate: true })

  const subcmd = ctx
    .intersect(useBackend('sd-webui'))
    .intersect(useFilter(config.features.upscale))
    .command('novelai.upscale')
    .shortcut('upscale', { i18n: true, fuzzy: true })
    .option('scale', '-s <scale:number>', { fallback: 2 })
    .option('resolution', '-r <resolution>', { type: resolution })
    .option('crop', '-C, --no-crop', { value: false, fallback: true })
    .option('upscaler', '-1 <upscaler>', { type: upscalers })
    .option('upscaler2', '-2 <upscaler2>', { type: upscalers })
    .option('visibility', '-v <visibility:number>')
    .option('upscaleFirst', '-f', { fallback: false })
    .action(async ({ session, options }, input) => {
      let imgUrl: string
      h.transform(input, {
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
        const { data } = await ctx.http<StableDiffusionWebUI.ExtraSingleImageResponse>(trimSlash(config.endpoint) + '/sdapi/v1/extra-single-image', {
          method: 'POST',
          timeout: config.requestTimeout,
          headers: {
            ...config.headers,
          },
          data: payload,
        })
        return h.image(forceDataPrefix(data.image))
      } catch (e) {
        logger.warn(e)
        return session.text('.unknown-error')
      }
    })

  ctx.accept(['upscaler'], (config) => {
    subcmd._options.upscaler.fallback = config.upscaler
  }, { immediate: true })
}
