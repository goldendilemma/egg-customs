const fs = require('fs-extra')
const path = require('path')

async function start ([inputDir, newAnimationUrl, newCustomizerUrl]) {
  const files = fs.readdirSync(inputDir)
    .filter(filename => filename.slice(-4) === 'json')
    .map(filename => path.join(inputDir, filename))
  
  for (const file of files) {
    const content = fs.readJSONSync(file)
    const { 
      animation_url, 
      customizerUri,
      ...filtered 
    } = content
    if (!customizerUri) continue
    const newAnimation = upgradeUrl(animation_url, newAnimationUrl)
    const newCustomizer = upgradeUrl(customizerUri, newCustomizerUrl) + '?' + getQuery(animation_url).replace(/famId=\d+&/, '')
    const updated = {
      ...filtered,
      animation_url: newAnimation,
      customizerUrl: newCustomizer
    }
    fs.writeJSONSync(file, updated)
    console.log('updated', file)
  }
}

const getQuery = (url) => {
  const parts = url.split('?')
  if (parts.length > 1) {
    const query = parts[parts.length - 1]
    return query
  } else {
    return null
  }
}

const upgradeUrl = (fullUrl, newUrl) => {
  const parts = fullUrl.split('?')
  if (parts.length > 1) {
    const query = parts[parts.length - 1]
    return `${newUrl}?${query}`
  } else {
    return newUrl
  }
}

const [,,...args] = process.argv
start(args)