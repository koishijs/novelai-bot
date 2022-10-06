import { Context, Dict, Logger, Schema, Time } from 'koishi'

export const reactive = true
export const name = 'novelai'

const logger = new Logger('novelai')

export interface Config {
  token: string
  timeout?: number
  recallTimeout?: number
  maxConcurrency?: number
}

export const Config: Schema<Config> = Schema.object({
  token: Schema.string().description('API token。').required(),
  timeout: Schema.number().role('time').description('默认的请求时间。').default(Time.minute * 0.5),
  recallTimeout: Schema.number().role('time').description('发送后自动撤回的时间 (设置为 0 禁用此功能)。').default(0),
  maxConcurrency: Schema.number().description('单个频道下的最大并发数量 (设置为 0 禁用此功能)。').default(0),
})

const UNDESIRED = 'nsfw, lowres, text, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry'

export const RESOLUTIONS = {
  '横': { height: 512, width: 768 },
  '竖': { height: 768, width: 512 },
  '方': { height: 640, width: 640 },
}

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

const models = {
  safe: 'safe-diffusion',
  nai: 'nai-diffusion',
  furry: 'nai-diffusion-furry',
}

export function apply(ctx: Context, config: Config) {
  const states: Dict<Set<string>> = Object.create(null)

  ctx.guild().command('novelai <prompts:text>')
    .shortcut('画画', { fuzzy: true })
    .shortcut('约稿', { fuzzy: true })
    .usage('使用英文 tag，用逗号隔开，例如 Mr.Quin,dark sword,red eyes，查找tag使用Danbooru')
    .option('res', '-r <resolution:str>', { fallback: '竖' })
    .option('model', '-m <model>', { fallback: 'nai' })
    .action(async ({ session, options }, input) => {
      if (!input.trim()) return session.execute('help novelai')
      input = input.replace(/[,，]/g, ', ').replace(/\s+/g, ' ')
      if (/[^\s\w,:|\[\]\{\}-]/.test(input)) return '只接受英文输入。'

      const model = models[options.model]
      if (!model) {
        return '-m, --model 参数错误，可选值：safe, nai, furry。'
      }

      const id = Math.random().toString(36).slice(2)
      if (config.maxConcurrency) {
        states[session.cid] ||= new Set()
        if (states[session.cid].size >= config.maxConcurrency) {
          return '请稍后再试。'
        } else {
          states[session.cid].add(id)
        }
      }

      try {
        const seed = Math.round(new Date().getTime() / 1000)
        session.send('在画了在画了')
        const resolution = RESOLUTIONS[options.res] || RESOLUTIONS['横']
        const art = await ctx.http.axios('https://api.novelai.net/ai/generate-image', {
          method: 'POST',
          timeout: config.timeout,
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
              height: resolution.height,
              width: resolution.width,
              seed,
              n_samples: 1,
              noise: 0.2,
              sampler: 'k_euler_ancestral',
              scale: 12,
              steps: 28,
              strength: 0.7,
              uc: UNDESIRED,
              ucPreset: 1,
            },
          },
        }).then(res => {
          return res.data.substr(27, res.data.length)
        })

        const infoNode = assembleMsgNode(
          { uin: session.bot.selfId, name: 'AI画师' },
          `seed = ${seed}\ntags = ${input}`,
        )
        const artNode = assembleMsgNode(
          { uin: session.bot.selfId, name: 'AI画师' },
          { type: 'image', data: { file: 'base64://' + art } },
        )

        const msgId = session.bot.internal.sendGroupForwardMsg(session.channelId, [infoNode, artNode])
        if (config.recallTimeout) {
          ctx.setTimeout(() => {
            session.bot.deleteMessage(session.channelId, msgId)
          }, config.recallTimeout)
        }
      } catch (err) {
        logger.error(err)
        return '发生错误。'
      } finally {
        states[session.cid]?.delete(id)
      }
    })
}
