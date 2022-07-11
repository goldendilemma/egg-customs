const fs = require('fs-extra')
const path = require('path')

async function start ([inputDir, newAnimationUrl]) {
  const files = fs.readdirSync(inputDir)
    .filter(filename => filename.slice(-4) === 'json')
    .map(filename => path.join(inputDir, filename))
  
  for (const file of files) {
    const content = fs.readJSONSync(file)
    const { 
      animation_url,
      ...filtered 
    } = content
    const newAnimation = upgradeUrl(animation_url, newAnimationUrl)
    const updated = {
      ...filtered,
      animation_url: newAnimation
    }
    fs.writeJSONSync(file, updated)
    console.log('updated', file)
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