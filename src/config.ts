import { Computed, Dict, Schema, Session, Time } from 'koishi'
import { Size } from './utils'

const options: Computed.Options = {
  userFields: ['authority'],
}

export const modelMap = {
  safe: 'safe-diffusion',
  nai: 'nai-diffusion',
  furry: 'nai-diffusion-furry',
  'nai-v3': 'nai-diffusion-3',
} as const

export const orientMap = {
  landscape: { height: 512, width: 768 },
  portrait: { height: 768, width: 512 },
  square: { height: 640, width: 640 },
} as const

export const hordeModels = require('../data/horde-models.json') as string[]

const ucPreset = [
  // Replace with the prompt words that come with novelai
  'nsfw, lowres, {bad}, error, fewer, extra, missing, worst quality',
  'jpeg artifacts, bad quality, watermark, unfinished, displeasing',
  'chromatic aberration, signature, extra digits, artistic error, username, scan, [abstract]',
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

  // samplers in stable-diffusion-webui
  // https://github.com/AUTOMATIC1111/stable-diffusion-webui/blob/master/modules/sd_samplers_compvis.py#L12
  // https://github.com/AUTOMATIC1111/stable-diffusion-webui/blob/master/modules/sd_samplers_kdiffusion.py#L12
  export const sd = {
    'k_euler_a': 'Euler a',
    'k_euler': 'Euler',
    'k_lms': 'LMS',
    'k_heun': 'Heun',
    'k_dpm_2': 'DPM2',
    'k_dpm_2_a': 'DPM2 a',
    'k_dpmpp_2s_a': 'DPM++ 2S a',
    'k_dpmpp_2m': 'DPM++ 2M',
    'k_dpmpp_sde': 'DPM++ SDE',
    'k_dpmpp_2m_sde': 'DPM++ 2M SDE',
    'k_dpm_fast': 'DPM fast',
    'k_dpm_ad': 'DPM adaptive',
    'k_lms_ka': 'LMS Karras',
    'k_dpm_2_ka': 'DPM2 Karras',
    'k_dpm_2_a_ka': 'DPM2 a Karras',
    'k_dpmpp_2s_a_ka': 'DPM++ 2S a Karras',
    'k_dpmpp_2m_ka': 'DPM++ 2M Karras',
    'k_dpmpp_sde_ka': 'DPM++ SDE Karras',
    'k_dpmpp_2m_sde_ka': 'DPM++ 2M SDE Karras',
    'ddim': 'DDIM',
    'plms': 'PLMS',
    'unipc': 'UniPC',
  }

  export const horde = {
    k_lms: 'LMS',
    k_heun: 'Heun',
    k_euler: 'Euler',
    k_euler_a: 'Euler a',
    k_dpm_2: 'DPM2',
    k_dpm_2_a: 'DPM2 a',
    k_dpm_fast: 'DPM fast',
    k_dpm_adaptive: 'DPM adaptive',
    k_dpmpp_2m: 'DPM++ 2M',
    k_dpmpp_2s_a: 'DPM++ 2S a',
    k_dpmpp_sde: 'DPM++ SDE',
    DDIM: 'DDIM',
    k_lms_ka: 'LMS Karras',
    k_heun_ka: 'Heun Karras',
    k_euler_ka: 'Euler Karras',
    k_euler_a_ka: 'Euler a Karras',
    k_dpm_2_ka: 'DPM2 Karras',
    k_dpm_2_a_ka: 'DPM2 a Karras',
    k_dpm_fast_ka: 'DPM fast Karras',
    k_dpm_adaptive_ka: 'DPM adaptive Karras',
    k_dpmpp_2m_ka: 'DPM++ 2M Karras',
    k_dpmpp_2s_a_ka: 'DPM++ 2S a Karras',
    k_dpmpp_sde_ka: 'DPM++ SDE Karras',
    DDIM_ka: 'DDIM Karras',
  }

  export function createSchema(map: Dict<string>) {
    return Schema.union(Object.entries(map).map(([key, value]) => {
      return Schema.const(key).description(value)
    })).loose().description('默认的采样器。').default('k_euler_a')
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
  basePrompt?: Computed<string>
  negativePrompt?: Computed<string>
  forbidden?: Computed<string>
  defaultPromptSw?: boolean
  defaultPrompt?: Computed<string>
  placement?: Computed<'before' | 'after'>
  latinOnly?: Computed<boolean>
  translator?: boolean
  lowerCase?: boolean
  maxWords?: Computed<number>
}

export const PromptConfig: Schema<PromptConfig> = Schema.object({
  basePrompt: Schema.computed(Schema.string().role('textarea'), options).description('默认附加的标签。').default('masterpiece, best quality'),
  negativePrompt: Schema.computed(Schema.string().role('textarea'), options).description('默认附加的反向标签。').default(ucPreset),
  forbidden: Schema.computed(Schema.string().role('textarea'), options).description('违禁词列表。请求中的违禁词将会被自动删除。').default(''),
  defaultPromptSw: Schema.boolean().description('是否启用默认标签。').default(false),
  defaultPrompt: Schema.string().role('textarea', options).description('默认标签，可以在用户无输入prompt时调用。可选在sd-webui中安装dynamic prompt插件，配合使用以达到随机标签效果。').default(''),
  placement: Schema.computed(Schema.union([
    Schema.const('before').description('置于最前'),
    Schema.const('after').description('置于最后'),
  ]), options).description('默认附加标签的位置。').default('after'),
  translator: Schema.boolean().description('是否启用自动翻译。').default(true),
  latinOnly: Schema.computed(Schema.boolean(), options).description('是否只接受英文输入。').default(false),
  lowerCase: Schema.boolean().description('是否将输入的标签转换为小写。').default(true),
  maxWords: Schema.computed(Schema.natural(), options).description('允许的最大单词数量。').default(0),
}).description('输入设置')

interface FeatureConfig {
  anlas?: Computed<boolean>
  text?: Computed<boolean>
  image?: Computed<boolean>
  upscale?: Computed<boolean>
}

const naiFeatures = Schema.object({
  anlas: Schema.computed(Schema.boolean(), options).default(true).description('是否允许使用点数。'),
})

const sdFeatures = Schema.object({
  upscale: Schema.computed(Schema.boolean(), options).default(true).description('是否启用图片放大。'),
})

const features = Schema.object({
  text: Schema.computed(Schema.boolean(), options).default(true).description('是否启用文本转图片。'),
  image: Schema.computed(Schema.boolean(), options).default(true).description('是否启用图片转图片。'),
})

interface ParamConfig {
  model?: Model
  sampler?: string
  upscaler?: string
  restoreFaces?: boolean
  hiresFix?: boolean
  scale?: Computed<number>
  textSteps?: Computed<number>
  imageSteps?: Computed<number>
  maxSteps?: Computed<number>
  strength?: Computed<number>
  resolution?: Computed<Orient | Size>
  maxResolution?: Computed<number>
}

export interface Config extends PromptConfig, ParamConfig {
  type: 'token' | 'login' | 'naifu' | 'sd-webui' | 'stable-horde'
  token?: string
  email?: string
  password?: string
  authLv?: Computed<number>
  authLvDefault?: Computed<number>
  output?: Computed<'minimal' | 'default' | 'verbose'>
  features?: FeatureConfig
  endpoint?: string
  headers?: Dict<string>
  nsfw?: Computed<'disallow' | 'censor' | 'allow'>
  maxIterations?: number
  maxRetryCount?: number
  requestTimeout?: number
  recallTimeout?: number
  maxConcurrency?: number
  pollInterval?: number
  trustedWorkers?: boolean
}

export const Config = Schema.intersect([
  Schema.object({
    type: Schema.union([
      Schema.const('token').description('授权令牌'),
      ...process.env.KOISHI_ENV === 'browser' ? [] : [Schema.const('login').description('账号密码')],
      Schema.const('naifu').description('naifu'),
      Schema.const('sd-webui').description('sd-webui'),
      Schema.const('stable-horde').description('Stable Horde'),
    ]).default('token').description('登录方式。'),
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
        headers: Schema.dict(String).role('table').description('要附加的额外请求头。').default({
          'referer': 'https://novelai.net/',
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
        }),
      }),
    ]),
    Schema.object({
      type: Schema.const('naifu'),
      token: Schema.string().description('授权令牌。').role('secret'),
      endpoint: Schema.string().description('API 服务器地址。').required(),
      headers: Schema.dict(String).role('table').description('要附加的额外请求头。'),
    }),
    Schema.object({
      type: Schema.const('sd-webui'),
      endpoint: Schema.string().description('API 服务器地址。').required(),
      headers: Schema.dict(String).role('table').description('要附加的额外请求头。'),
    }),
    Schema.object({
      type: Schema.const('stable-horde'),
      endpoint: Schema.string().description('API 服务器地址。').default('https://stablehorde.net/'),
      token: Schema.string().description('授权令牌 (API Key)。').role('secret').default('0000000000'),
      nsfw: Schema.union([
        Schema.const('disallow').description('禁止'),
        Schema.const('censor').description('屏蔽'),
        Schema.const('allow').description('允许'),
      ]).description('是否允许 NSFW 内容。').default('allow'),
      trustedWorkers: Schema.boolean().description('是否只请求可信任工作节点。').default(false),
      pollInterval: Schema.number().role('time').description('轮询进度间隔时长。').default(Time.second),
    }),
  ]),

  Schema.object({
    authLv: Schema.computed(Schema.natural(), options).description('使用画图全部功能所需要的权限等级。').default(0),
    authLvDefault: Schema.computed(Schema.natural(), options).description('使用默认参数生成所需要的权限等级。').default(0),
  }).description('权限设置'),

  Schema.object({
    features: Schema.object({}),
  }).description('功能设置'),

  Schema.union([
    Schema.object({
      type: Schema.union(['token', 'login']).hidden(),
      features: Schema.intersect([naiFeatures, features]),
    }),
    Schema.object({
      type: Schema.const('sd-webui'),
      features: Schema.intersect([features, sdFeatures]),
    }),
    Schema.object({
      features: Schema.intersect([features]),
    }),
  ]),

  Schema.object({}).description('参数设置'),

  Schema.union([
    Schema.object({
      type: Schema.const('sd-webui').required(),
      sampler: sampler.createSchema(sampler.sd),
      upscaler: Schema.union(upscalers).description('默认的放大算法。').default('Lanczos'),
      restoreFaces: Schema.boolean().description('是否启用人脸修复。').default(false),
      hiresFix: Schema.boolean().description('是否启用高分辨率修复。').default(false),
    }),
    Schema.object({
      type: Schema.const('stable-horde').required(),
      sampler: sampler.createSchema(sampler.horde),
      model: Schema.union(hordeModels).loose().description('默认的生成模型。'),
    }),
    Schema.object({
      type: Schema.const('naifu').required(),
      sampler: sampler.createSchema(sampler.nai),
    }),
    Schema.object({
      sampler: sampler.createSchema(sampler.nai),
      model: Schema.union(models).loose().description('默认的生成模型。').default('nai'),
    }),
  ] as const),

  Schema.object({
    scale: Schema.computed(Schema.number(), options).description('默认对输入的服从度。').default(11),
    textSteps: Schema.computed(Schema.natural(), options).description('文本生图时默认的迭代步数。').default(28),
    imageSteps: Schema.computed(Schema.natural(), options).description('以图生图时默认的迭代步数。').default(50),
    maxSteps: Schema.computed(Schema.natural(), options).description('允许的最大迭代步数。').default(64),
    strength: Schema.computed(Schema.number(), options).min(0).max(1).description('默认的重绘强度。').default(0.7),
    resolution: Schema.computed(Schema.union([
      Schema.const('portrait').description('肖像 (768x512)'),
      Schema.const('landscape').description('风景 (512x768)'),
      Schema.const('square').description('方形 (640x640)'),
      Schema.object({
        width: Schema.natural().description('图片宽度。').default(640),
        height: Schema.natural().description('图片高度。').default(640),
      }).description('自定义'),
    ]), options).description('默认生成的图片尺寸。').default('portrait'),
    maxResolution: Schema.computed(Schema.natural(), options).description('允许生成的宽高最大值。').default(1024),
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
    .replace(/！/g, '!')
    .split(/(?:,\s*|\s*\n\s*)/g)
    .filter(Boolean)
    .map<Forbidden>((pattern: string) => {
      const strict = pattern.endsWith('!')
      if (strict) pattern = pattern.slice(0, -1)
      pattern = pattern.replace(/[^a-z0-9\u00ff-\uffff]+/g, ' ').trim()
      return { pattern, strict }
    })
}

const backslash = /@@__BACKSLASH__@@/g

export function parseInput(session: Session, input: string, config: Config, override: boolean): string[] {
  if (!input) {
    return [
      null,
      [session.resolve(config.basePrompt), session.resolve(config.defaultPrompt)].join(','),
      session.resolve(config.negativePrompt)
    ]
  }

  input = input
    .replace(/\\\\/g, backslash.source)
    .replace(/，/g, ',')
    .replace(/（/g, '(')
    .replace(/）/g, ')')
    .replace(/《/g, '<')
    .replace(/》/g, '>')

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

  if (session.resolve(config.latinOnly) && /[^\s\w"'“”‘’.,:|\\()\[\]{}<>-]/.test(input)) {
    return ['.latin-only']
  }

  const negative = []
  const placement = session.resolve(config.placement)
  const appendToList = (words: string[], input = '') => {
    const tags = input.split(/,\s*/g)
    if (placement === 'before') tags.reverse()
    for (let tag of tags) {
      tag = tag.trim()
      if (config.lowerCase) tag = tag.toLowerCase()
      if (!tag || words.includes(tag)) continue
      if (placement === 'before') {
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
  const forbidden = parseForbidden(session.resolve(config.forbidden))
  const positive = input.split(/,\s*/g).filter((word) => {
    // eslint-disable-next-line no-control-regex
    word = word.toLowerCase().replace(/[\x00-\x7f]/g, s => s.replace(/[^0-9a-zA-Z]/, ' ')).replace(/\s+/, ' ').trim()
    if (!word) return false
    for (const { pattern, strict } of forbidden) {
      if (strict && word.split(/\W+/g).includes(pattern)) {
        return false
      } else if (!strict && word.includes(pattern)) {
        return false
      }
    }
    return true
  }).map((word) => {
    if (/^<.+>$/.test(word)) return word.replace(/ /g, '_')
    return word.toLowerCase()
  })

  if (Math.max(getWordCount(positive), getWordCount(negative)) > (session.resolve(config.maxWords) || Infinity)) {
    return ['.too-many-words']
  }

  if (!override) {
    appendToList(positive, session.resolve(config.basePrompt))
    appendToList(negative, session.resolve(config.negativePrompt))
    if (config.defaultPromptSw) appendToList(positive, session.resolve(config.defaultPrompt))
  }

  return [null, positive.join(', '), negative.join(', ')]
}

function getWordCount(words: string[]) {
  return words.join(' ').replace(/[^a-z0-9]+/g, ' ').trim().split(' ').length
}
