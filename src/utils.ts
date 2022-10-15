import { Context, Dict, Quester } from 'koishi'
import {
  crypto_generichash, crypto_pwhash,
  crypto_pwhash_ALG_ARGON2ID13, crypto_pwhash_SALTBYTES, ready,
} from 'libsodium-wrappers'
import { Subscription } from './types'

const MAX_OUTPUT_SIZE = 1048576
const MAX_CONTENT_SIZE = 10485760
const ALLOWED_TYPES = ['image/jpeg', 'image/png']

export async function download(ctx: Context, url: string, headers = {}): Promise<ArrayBuffer> {
  if (url.startsWith('data:')) {
    const [, type, base64] = url.match(/^data:(image\/\w+);base64,(.*)$/)
    if (!ALLOWED_TYPES.includes(type)) {
      throw new NetworkError('.unsupported-file-type')
    }
    const binary = atob(base64)
    const result = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      result[i] = binary.charCodeAt(i)
    }
    return result
  } else {
    const head = await ctx.http.head(url, { headers })
    if (+head['content-length'] > MAX_CONTENT_SIZE) {
      throw new NetworkError('.file-too-large')
    }
    if (!ALLOWED_TYPES.includes(head['content-type'])) {
      throw new NetworkError('.unsupported-file-type')
    }
    return ctx.http.get(url, { responseType: 'arraybuffer', headers })
  }
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

export class NetworkError extends Error {
  constructor(message: string, public params = {}) {
    super(message)
  }

  static catch = (mapping: Dict<string>) => (e: any) => {
    if (Quester.isAxiosError(e)) {
      const code = e.response?.status
      for (const key in mapping) {
        if (code === +key) {
          throw new NetworkError(mapping[key])
        }
      }
    }
    throw e
  }
}

export async function login(ctx: Context): Promise<string> {
  if (ctx.config.type === 'token') {
    await ctx.http.get<Subscription>(ctx.config.endpoint + '/user/subscription', {
      headers: { authorization: 'Bearer ' + ctx.config.token },
    }).catch(NetworkError.catch({ 401: '.invalid-token' }))
    return ctx.config.token
  } else if (ctx.config.type === 'login') {
    return ctx.http.post(ctx.config.endpoint + '/user/login', {
      key: await calcAccessKey(ctx.config.email, ctx.config.password),
    }).catch(NetworkError.catch({ 401: '.invalid-password' })).then(res => res.accessToken)
  }
}

export function closestMultiple(num: number, mult: number) {
  const numInt = num
  const floor = Math.floor(numInt / mult) * mult
  const ceil = Math.ceil(numInt / mult) * mult
  const closest = numInt - floor < ceil - numInt ? floor : ceil
  if (Number.isNaN(closest)) return 0
  return closest <= 0 ? mult : closest
}

export interface Size {
  width: number
  height: number
}

export function resizeInput(size: Size): Size {
  // if width and height produce a valid size, use it
  const { width, height } = size
  if (width % 64 === 0 && height % 64 === 0 && width * height <= MAX_OUTPUT_SIZE) {
    return { width, height }
  }

  // otherwise, set lower size as 512 and use aspect ratio to the other dimension
  const aspectRatio = width / height
  if (aspectRatio > 1) {
    const height = 512
    const width = closestMultiple(height * aspectRatio, 64)
    // check that image is not too large
    if (width * height <= MAX_OUTPUT_SIZE) {
      return { width, height }
    }
  } else {
    const width = 512
    const height = closestMultiple(width / aspectRatio, 64)
    // check that image is not too large
    if (width * height <= MAX_OUTPUT_SIZE) {
      return { width, height }
    }
  }

  // if that fails set the higher size as 1024 and use aspect ratio to the other dimension
  if (aspectRatio > 1) {
    const width = 1024
    const height = closestMultiple(width / aspectRatio, 64)
    return { width, height }
  } else {
    const height = 1024
    const width = closestMultiple(height * aspectRatio, 64)
    return { width, height }
  }
}
