import { Dict, Schema, Time } from 'koishi'
import { Size } from './utils'

export const modelMap = {
  safe: 'safe-diffusion',
  nai: 'nai-diffusion',
  furry: 'nai-diffusion-furry',
} as const

export const orientMap = {
  landscape: { height: 512, width: 768 },
  portrait: { height: 768, width: 512 },
  square: { height: 640, width: 640 },
} as const

const ucPreset = [
  'nsfw, lowres, bad anatomy, bad hands, text, error, missing fingers',
  'extra digit, fewer digits, cropped, worst quality, low quality',
  'normal quality, jpeg artifacts, signature, watermark, username, blurry',
].join(', ')

type Model = keyof typeof modelMap
type Orient = keyof typeof orientMap

export const models = Object.keys(modelMap) as Model[]
export const orients = Object.keys(orientMap) as Orient[]

export namespace sampler {
  export const nai = {
    'k_euler_a': 'Euler ancestral',
    'k_euler': 'Euler',
    'k_lms': 'LMS',
    'ddim': 'DDIM',
    'plms': 'PLMS',
  }

  export const sd = {
    'k_euler_a': 'Euler a',
    'k_euler': 'Euler',
    'k_lms': 'LMS',
    'k_heun': 'Heun',
    'k_dpm_2': 'DPM2',
    'k_dpm_2_a': 'DPM2 a',
    'k_dpmpp_2s_a': 'DPM++ 2S a',
    'k_dpmpp_2m': 'DPM++ 2M',
    'k_dpm_fast': 'DPM fast',
    'k_dpm_ad': 'DPM adaptive',
    'k_lms_ka': 'LMS Karras',
    'k_dpm_2_ka': 'DPM2 Karras',
    'k_dpm_2_a_ka': 'DPM2 a Karras',
    'k_dpmpp_2s_a_ka': 'DPM++ 2S a Karras',
    'k_dpmpp_2m_ka': 'DPM++ 2M Karras',
    'ddim': 'DDIM',
    'plms': 'PLMS',
  }

  export function createSchema(map: Dict<string>) {
    return Schema.union(Object.entries(map).map(([key, value]) => {
      return Schema.const(key).description(value)
    })).description('默认的采样器。').default('k_euler_a')
  }

  export function sd2nai(sampler: string): string {
    if (sampler === 'k_euler_a') return 'k_euler_ancestral'
    if (sampler in nai) return sampler
    return 'k_euler_ancestral'
  }
}

export const upscalers = [
  // built-in upscalers
  'None',
  'Lanczos',
  'Nearest',
  // third-party upscalers (might not be available)
  'LDSR',
  'ESRGAN_4x',
  'R-ESRGAN General 4xV3',
  'R-ESRGAN General WDN 4xV3',
  'R-ESRGAN AnimeVideo',
  'R-ESRGAN 4x+',
  'R-ESRGAN 4x+ Anime6B',
  'R-ESRGAN 2x+',
  'ScuNET GAN',
  'ScuNET PSNR',
  'SwinIR 4x',
] as const

export interface Options {
  enhance: boolean
  model: string
  resolution: Size
  sampler: string
  seed: string
  steps: number
  scale: number
  noise: number
  strength: number
}

export interface PromptConfig {
  basePrompt?: string
  negativePrompt?: string
  forbidden?: string
  placement?: 'before' | 'after'
  latinOnly?: boolean
  translator?: boolean
  maxWords?: number
}

export const PromptConfig: Schema<PromptConfig> = Schema.object({
  basePrompt: Schema.string().role('textarea').description('默认附加的标签。').default('masterpiece, best quality'),
  negativePrompt: Schema.string().role('textarea').description('默认附加的反向标签。').default(ucPreset),
  forbidden: Schema.string().role('textarea').description('违禁词列表。请求中的违禁词将会被自动删除。').default(''),
  placement: Schema.union([
    Schema.const('before' as const).description('置于最前'),
    Schema.const('after' as const).description('置于最后'),
  ]).description('默认附加标签的位置。').default('after'),
  translator: Schema.boolean().description('是否启用自动翻译。').default(true),
  latinOnly: Schema.boolean().description('是否只接受英文输入。').default(false),
  maxWords: Schema.natural().description('允许的最大单词数量。').default(0),
}).description('输入设置')

interface ParamConfig {
  model?: Model
  upscaler?: string
  resolution?: Orient | Size
  maxResolution?: number
  sampler?: string
  scale?: number
  textSteps?: number
  imageSteps?: number
  maxSteps?: number
}

export interface Config extends PromptConfig, ParamConfig {
  type: 'token' | 'login' | 'naifu' | 'sd-webui'
  token?: string
  email?: string
  password?: string
  output?: 'minimal' | 'default' | 'verbose'
  allowAnlas?: boolean | number
  endpoint?: string
  headers?: Dict<string>
  maxIterations?: number
  maxRetryCount?: number
  requestTimeout?: number
  recallTimeout?: number
  maxConcurrency?: number
}

export const Config = Schema.intersect([
  Schema.object({
    type: Schema.union([
      Schema.const('token' as const).description('授权令牌'),
      ...process.env.KOISHI_ENV === 'browser' ? [] : [Schema.const('login' as const).description('账号密码')],
      Schema.const('naifu' as const).description('naifu'),
      Schema.const('sd-webui' as const).description('sd-webui'),
    ] as const).description('登录方式'),
  }).description('登录设置'),

  Schema.union([
    Schema.intersect([
      Schema.union([
        Schema.object({
          type: Schema.const('token'),
          token: Schema.string().description('授权令牌。').role('secret').required(),
        }),
        Schema.object({
          type: Schema.const('login'),
          email: Schema.string().description('账号邮箱。').required(),
          password: Schema.string().description('账号密码。').role('secret').required(),
        }),
      ]),
      Schema.object({
        endpoint: Schema.string().description('API 服务器地址。').default('https://api.novelai.net'),
        headers: Schema.dict(String).description('要附加的额外请求头。').default({
          'referer': 'https://novelai.net/',
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
        }),
        allowAnlas: Schema.union([
          Schema.const(true).description('允许'),
          Schema.const(false).description('禁止'),
          Schema.natural().description('权限等级').default(1),
        ]).default(true).description('是否启用高级功能 (例如图片增强和手动设置某些参数)。'),
      }),
    ]),
    Schema.object({
      type: Schema.const('naifu'),
      token: Schema.string().description('授权令牌。').role('secret'),
      endpoint: Schema.string().description('API 服务器地址。').required(),
      headers: Schema.dict(String).description('要附加的额外请求头。'),
    }),
    Schema.object({
      type: Schema.const('sd-webui'),
      endpoint: Schema.string().description('API 服务器地址。').required(),
      headers: Schema.dict(String).description('要附加的额外请求头。'),
    }),
  ]),

  Schema.union([
    Schema.object({
      type: Schema.const('sd-webui'),
      sampler: sampler.createSchema(sampler.sd),
      upscaler: Schema.union(upscalers).description('默认的放大算法。').default('Lanczos'),
    }).description('参数设置'),
    Schema.object({
      type: Schema.const('naifu'),
      sampler: sampler.createSchema(sampler.nai),
    }).description('参数设置'),
    Schema.object({
      model: Schema.union(models).description('默认的生成模型。').default('nai'),
      sampler: sampler.createSchema(sampler.nai),
    }).description('参数设置'),
  ] as const),

  Schema.object({
    scale: Schema.natural().description('默认对输入的服从度。').default(11),
    textSteps: Schema.natural().description('文本生图时默认的迭代步数。').default(28),
    imageSteps: Schema.natural().description('以图生图时默认的迭代步数。').default(50),
    maxSteps: Schema.natural().description('允许的最大迭代步数。').default(0),
    resolution: Schema.union([
      Schema.const('portrait' as const).description('肖像 (768x512)'),
      Schema.const('landscape' as const).description('风景 (512x768)'),
      Schema.const('square' as const).description('方形 (640x640)'),
      Schema.object({
        width: Schema.natural().description('图片宽度。').default(640),
        height: Schema.natural().description('图片高度。').default(640),
      }).description('自定义'),
    ] as const).description('默认生成的图片尺寸。').default('portrait'),
    maxResolution: Schema.natural().description('允许生成的宽度和高度最大值。').default(0),
  }),

  PromptConfig,

  Schema.object({
    output: Schema.union([
      Schema.const('minimal').description('只发送图片'),
      Schema.const('default').description('发送图片和关键信息'),
      Schema.const('verbose').description('发送全部信息'),
    ]).description('输出方式。').default('default'),
    maxIterations: Schema.natural().description('允许的最大绘制次数。').default(1),
    maxRetryCount: Schema.natural().description('连接失败时最大的重试次数。').default(3),
    requestTimeout: Schema.number().role('time').description('当请求超过这个时间时会中止并提示超时。').default(Time.minute),
    recallTimeout: Schema.number().role('time').description('图片发送后自动撤回的时间 (设置为 0 以禁用此功能)。').default(0),
    maxConcurrency: Schema.number().description('单个频道下的最大并发数量 (设置为 0 以禁用此功能)。').default(0),
  }).description('高级设置'),
]) as Schema<Config>

interface Forbidden {
  pattern: string
  strict: boolean
}

export function parseForbidden(input: string) {
  return input.trim()
    .toLowerCase()
    .replace(/，/g, ',')
    .split(/(?:,\s*|\s*\n\s*)/g)
    .filter(Boolean)
    .map<Forbidden>((pattern: string) => {
      const strict = pattern.endsWith('!')
      if (strict) pattern = pattern.slice(0, -1)
      pattern = pattern.replace(/[^a-z0-9]+/g, ' ').trim()
      return { pattern, strict }
    })
}

const backslash = /@@__BACKSLASH__@@/g

export function parseInput(input: string, config: Config, forbidden: Forbidden[], override: boolean): string[] {
  input = input.toLowerCase()
    .replace(/\\\\/g, backslash.source)
    .replace(/，/g, ',')
    .replace(/（/g, '(')
    .replace(/）/g, ')')

  if (config.type === 'sd-webui') {
    input = input
      .split('\\{').map(s => s.replace(/\{/g, '(')).join('\\{')
      .split('\\}').map(s => s.replace(/\}/g, ')')).join('\\}')
  } else {
    input = input
      .split('\\(').map(s => s.replace(/\(/g, '{')).join('\\(')
      .split('\\)').map(s => s.replace(/\)/g, '}')).join('\\)')
  }

  input = input
    .replace(backslash, '\\')
    .replace(/_/g, ' ')

  if (config.latinOnly && /[^\s\w"'“”‘’.,:|\\()\[\]{}-]/.test(input)) {
    return ['.latin-only']
  }

  const negative = []
  const appendToList = (words: string[], input: string) => {
    const tags = input.split(/,\s*/g)
    if (config.placement === 'before') tags.reverse()
    for (let tag of tags) {
      tag = tag.trim().toLowerCase()
      if (!tag || words.includes(tag)) continue
      if (config.placement === 'before') {
        words.unshift(tag)
      } else {
        words.push(tag)
      }
    }
  }

  // extract negative prompts
  const capture = input.match(/(,\s*|\s+)(-u\s+|--undesired\s+|negative prompts?:\s*)([\s\S]+)/m)
  if (capture?.[3]) {
    input = input.slice(0, capture.index).trim()
    appendToList(negative, capture[3])
  }

  // remove forbidden words
  const positive = input.split(/,\s*/g).filter((word) => {
    // eslint-disable-next-line no-control-regex
    word = word.replace(/[\x00-\x7f]/g, s => s.replace(/[^0-9a-zA-Z]/, ' ')).replace(/\s+/, ' ').trim()
    if (!word) return false
    for (const { pattern, strict } of forbidden) {
      if (strict && word.split(/\W+/g).includes(pattern)) {
        return false
      } else if (!strict && word.includes(pattern)) {
        return false
      }
    }
    return true
  })

  if (Math.max(getWordCount(positive), getWordCount(negative)) > (config.maxWords || Infinity)) {
    return ['.too-many-words']
  }

  if (!override) {
    appendToList(positive, config.basePrompt)
    appendToList(negative, config.negativePrompt)
  }

  return [null, positive.join(', '), negative.join(', ')]
}

function getWordCount(words: string[]) {
  return words.join(' ').replace(/[^a-z0-9]+/g, ' ').trim().split(' ').length
}
