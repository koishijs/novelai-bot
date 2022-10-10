import { Context } from 'koishi'
import { argon2id, blake2b } from 'hash-wasm'

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

export async function calcHash(username: string, password: string): Promise<string> {
  const salt = await blake2b(
    password.substring(0, 6) + username + 'novelai_data_access_key',
    16 * 8,
    null,
  )

  /* TODO: 这地方结果是错的需要改 */
  return argon2id({
    hashLength: 64,
    password,
    salt,
    iterations: 1,
    parallelism: 1,
    memorySize: 2000000,
    outputType: 'hex',
  }).then(res => { return Buffer.from(res, 'hex').toString('base64url') })
}

export async function login(ctx: Context): Promise<string> {
  const { config } = ctx
  return ctx.http.post(ctx.config.endpoint + '/user/login', {
    key: await calcHash(config.username, config.password),
  }).then(res => { return res.accessToken })
}
