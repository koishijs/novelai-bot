import { Context } from 'koishi'
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

export async function login(ctx: Context) {
  if (ctx.config.type !== 'login') return ctx.config.token
  return ctx.http.post(ctx.config.endpoint + '/user/login', {
    key: await calcAccessKey(ctx.config.email, ctx.config.password),
  }).then(res => res.accessToken)
}
