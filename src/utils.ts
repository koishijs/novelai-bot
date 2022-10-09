import { Context } from 'koishi'

const MAX_CONTENT_SIZE = 10485760
const ALLOWED_TYPES = ['jpeg', 'png']

export async function download(ctx: Context, url: string, headers = {}): Promise<Buffer> {
  const head = await ctx.http.head(url, { headers })

  if (+head['content-length'] > MAX_CONTENT_SIZE) {
    throw new Error('file too large')
  }

  if (ALLOWED_TYPES.every(t => head['content-type'].includes(t))) {
    throw new Error('unsupported file type')
  }

  return ctx.http.get(url, { responseType: 'arraybuffer', headers })
}
