const fsp = require('fs/promises')
const http = require('http')
const path = require('path')

const API_ROOT = process.argv[2] || 'http://localhost:7860'
const SAMPLERS_ENDPOINT = '/sdapi/v1/samplers'
const DATA_JSON_PATH = path.join(__dirname, '..', 'data', 'sd-samplers.json')

;(async () => {
  const r = await new Promise((resolve, reject) => {
    http.get(API_ROOT + SAMPLERS_ENDPOINT, res => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => resolve(JSON.parse(data)))
    }).on('error', reject)
  })

  const samplers = r.reduce((acc, sampler) => {
    const { name, aliases, options } = sampler
    acc[aliases[0]] = name
    return acc
  }, {})

  const json = JSON.stringify(samplers, null, 2)
  await fsp.writeFile(DATA_JSON_PATH, json)
})()
