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

export async function calcAccessKey(username: string, password: string): Promise<string> {
  await ready
  return crypto_pwhash(
    64,
    new Uint8Array(Buffer.from(password)),
    crypto_generichash(
      crypto_pwhash_SALTBYTES,
      password.slice(0, 6) + username + 'novelai_data_access_key',
    ),
    2,
    2e6,
    crypto_pwhash_ALG_ARGON2ID13,
    'base64').slice(0, 64)
}

export async function calcEncryptionKey(username: string, password: string): Promise<string> {
  await ready
  return crypto_pwhash(
    128,
    new Uint8Array(Buffer.from(password)),
    crypto_generichash(
      crypto_pwhash_SALTBYTES,
      password.slice(0, 6) + username + 'novelai_data_encryption_key'),
    2,
    2e6,
    crypto_pwhash_ALG_ARGON2ID13,
    'base64')
}

export async function login(ctx: Context): Promise<string> {
  const { config } = ctx
  return ctx.http.post(ctx.config.endpoint + '/user/login', {
    key: await calcAccessKey(config.username, config.password),
  }).then(res => { return res.accessToken })
}
