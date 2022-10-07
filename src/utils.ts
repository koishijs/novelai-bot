import axios from 'axios'
import sizeOf from 'image-size'
import { ISizeCalculationResult } from 'image-size/dist/types/interface'

const MAX_CONTENT_SIZE = 10485760
const ALLOW_MIMETYPE = ['jpeg', 'png']

async function readRemote(url: string, headers: {}): Promise<Buffer> {
    const head = await axios.head(url, { headers })
    
    if (parseInt(head.headers['content-length']) > MAX_CONTENT_SIZE) throw 'file too large'
    else if (
        ALLOW_MIMETYPE.every(t => { head.headers['content-type'].search(t) === -1 })
    ) throw 'unsupported file type'
    
    return axios.get(url, {
        responseType: 'arraybuffer',
        headers
    }).then(res => { return res.data })
}

function getImgSize(img: Buffer): ISizeCalculationResult {
    return sizeOf(img)
}

export { readRemote, getImgSize }
