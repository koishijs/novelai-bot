import { Context, Dict, Quester } from 'koishi'
import {
  crypto_generichash, crypto_pwhash,
  crypto_pwhash_ALG_ARGON2ID13, crypto_pwhash_SALTBYTES, ready,
} from 'libsodium-wrappers'

const MAX_CONTENT_SIZE = 10485760
const ALLOWED_TYPES = ['jpeg', 'png']

export async function download(ctx: Context, url: string, headers = {}): Promise<ArrayBuffer> {
  const head = await ctx.http.head(url, { headers })

  if (+head['content-length'] > MAX_CONTENT_SIZE) {
    throw new Error('file too large')
  }

  if (ALLOWED_TYPES.every(t => head['content-type'].includes(t))) {
    throw new Error('unsupported file type')
  }

  return ctx.http.get(url, { responseType: 'arraybuffer', headers })
}

export async function calcAccessKey(email: string, password: string) {
  await ready
  return crypto_pwhash(
    64,
    new Uint8Array(Buffer.from(password)),
    crypto_generichash(
      crypto_pwhash_SALTBYTES,
      password.slice(0, 6) + email + 'novelai_data_access_key',
    ),
    2,
    2e6,
    crypto_pwhash_ALG_ARGON2ID13,
    'base64').slice(0, 64)
}

export async function calcEncryptionKey(email: string, password: string) {
  await ready
  return crypto_pwhash(
    128,
    new Uint8Array(Buffer.from(password)),
    crypto_generichash(
      crypto_pwhash_SALTBYTES,
      password.slice(0, 6) + email + 'novelai_data_encryption_key'),
    2,
    2e6,
    crypto_pwhash_ALG_ARGON2ID13,
    'base64')
}

export const headers = {
  authority: 'api.novelai.net',
  path: '/ai/generate-image',
  'content-type': 'application/json',
  referer: 'https://novelai.net/',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
}

export class LoginError extends Error {
  constructor(message: string, public code: number) {
    super(message)
  }

  static catch = (mapping: Dict<string>) => (e: any) => {
    if (Quester.isAxiosError(e)) {
      const code = e.response?.status
      for (const key in mapping) {
        if (code === +key) {
          throw new LoginError(mapping[key], code)
        }
      }
    }
    throw e
  }
}

export interface Perks {
  maxPriorityActions: number
  startPriority: number
  contextTokens: number
  moduleTrainingSteps: number
  unlimitedMaxPriority: boolean
  voiceGeneration: boolean
  imageGeneration: boolean
  unlimitedImageGeneration: boolean
  unlimitedImageGenerationLimits: {
    resolution: number
    maxPrompts: number
  }[]
}

export interface PaymentProcessorData {
  c: string
  n: number
  o: string
  p: number
  r: string
  s: string
  t: number
  u: string
}

export interface TrainingStepsLeft {
  fixedTrainingStepsLeft: number
  purchasedTrainingSteps: number
}

export interface Subscription {
  tier: number
  active: boolean
  expiresAt: number
  perks: Perks
  paymentProcessorData: PaymentProcessorData
  trainingStepsLeft: TrainingStepsLeft
}

export async function login(ctx: Context) {
  if (ctx.config.type !== 'login') {
    await ctx.http.get<Subscription>(ctx.config.endpoint + '/user/subscription', {
      headers: { authorization: 'Bearer ' + ctx.config.token },
    }).catch(LoginError.catch({ 401: '.invalid-token' }))
    return ctx.config.token
  } else {
    return ctx.http.post(ctx.config.endpoint + '/user/login', {
      key: await calcAccessKey(ctx.config.email, ctx.config.password),
    }).catch(LoginError.catch({ 401: '.invalid-password' })).then(res => res.accessToken)
  }
}
