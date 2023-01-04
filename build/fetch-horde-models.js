const fsp = require('fs/promises')
const https = require('https')
const path = require('path')

const MODELS_URL = 'https://stablehorde.net/api/v2/status/models'
const SRC_CONFIG_PATH = path.join(__dirname, '..', 'src', 'config.ts')

;(async () => {
  const db = await new Promise((resolve, reject) => {
    https.get(MODELS_URL, res => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => resolve(JSON.parse(data)))
    }).on('error', reject)
  })

  const models = db.map((model) => model.name)

  // replace auto-generated models
  const config = await fsp.readFile(SRC_CONFIG_PATH, 'utf-8')
  const newConfig = config.replace(
    /\/\* AUTO-GENERATED STABLE HORDE MODELS \*\/\s*.*\s*\/\* END OF AUTO-GENERATED STABLE HORDE MODELS \*\//is,
    `/* AUTO-GENERATED STABLE HORDE MODELS */\nexport const hordeModels = ${JSON.stringify(models, null, 2).replaceAll('"', '\'')} as const\n/* END OF AUTO-GENERATED STABLE HORDE MODELS */`
  )
  await fsp.writeFile(SRC_CONFIG_PATH, newConfig)
})()
