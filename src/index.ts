import { Context, Schema, Time } from 'koishi'

export const reactive = true
export const name = 'novelai'

export interface Config {
  token: string
  timeout?: number
}

export const Config: Schema<Config> = Schema.object({
  token: Schema.string().description('API token。').required(),
  timeout: Schema.number().role('time').description('默认的请求时间。').default(Time.minute * 0.5),
})

const UNDESIRED = 'nsfw, lowres, text, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry'

export const RESOLUTIONS = {
  '横': {height: 512, width: 768},
  '竖': {height: 768, width: 512},
  '方': {height: 640, width: 640}
}

function assembleMsgNode(user: {uin: string, name: string}, content: string | string[] | {}) {
  return {
    type: 'node',
    data: {
      uin: user.uin,
      name: user.name,
      content,
    }
  }
}

export function apply(ctx: Context, config: Config) {
  ctx.command('novelai <prompts:text>')
    .shortcut('画画', { fuzzy: true })
    .shortcut('约稿', { fuzzy: true })
    .usage('使用英文 tag，用逗号隔开，例如 Mr.Quin,dark sword,red eyes，查找tag使用Danbooru')
    .option('res', '-r <resolution:str>', {fallback: '竖'})
    .action(async ({session, options}, input) => {
      if (!input.trim()) return session.execute('help novelai')
      input = input.replace(/，/g, ',')
      if (/[^\s\w,\[\]\{\}]/.test(input)) return '只能用英文输入。'

      const seed = Math.round(new Date().getTime() / 1000)
      session.send('在画了在画了')

      try {
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
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36'
          },
          data: {
            model: 'nai-diffusion',
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
          }
        }).then(res => {
          return res.data.substr(27, res.data.length)
        })

        const infoNode = assembleMsgNode(
          {uin: session.bot.selfId, name: 'AI画师'},
          `seed = ${seed}\ntags = ${input}`
        )
        const artNode = assembleMsgNode(
          {uin: session.bot.selfId, name: 'AI画师'},
          {type: 'image', data: {file: 'base64://' + art}}
        )

        session.bot.internal.sendGroupForwardMsg(
          session.channelId, [infoNode, artNode]
        )
      } catch(err) {
        console.error(err)
        return '发生错误'
      }
    })
}
