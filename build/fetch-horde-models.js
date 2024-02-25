const fsp = require('fs/promises')
const https = require('https')
const path = require('path')

const MODELS_URL = 'https://stablehorde.net/api/v2/status/models'
const DATA_JSON_PATH = path.join(__dirname, '..', 'data', 'horde-models.json')

;(async () => {
  const db = await new Promise((resolve, reject) => {
    https.get(MODELS_URL, res => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => resolve(JSON.parse(data)))
    }).on('error', reject)
  })

  const models = db.map((model) => model.name)

  const json = JSON.stringify(models, null, 2)
  await fsp.writeFile(DATA_JSON_PATH, json + '\n')
})()
