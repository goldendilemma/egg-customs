const fs = require('fs-extra')
const path = require('path')

const { renames } = require('./constants/mappings.js')

const { 
  cleanSVGs, 
  upgradeSVGMarkup2, 
  getFileNameFromPath 
} = require('./libraries/svg')

const ANIMATION_BASE_URL = 'ar://H4MykzbQCgXNNj0GuGTfky0UXCu61bLLQ31bptpmpV0'

const tokenIdFromFilename = (filename) => {
  const parts = filename.split('.')
  return Number(parts[0])
}

async function start ([inputDir]) {

  console.log('==ENVIRONMENT==')
  console.log('ANIMATION_BASE_URL',ANIMATION_BASE_URL)

  const saveFiles = cleanSVGs(inputDir)

  console.log(`Generating ${saveFiles.length} tokens..`)
  
  const inputFiles = fs.readdirSync(inputDir)
    .filter(filename => filename.slice(-4) === 'json')
    .map(filename => path.join(inputDir, filename))
    .map(filepath => ({
      filename: getFileNameFromPath(filepath),
      filepath,
    }))
    .map(obj => ({
      ...obj,
      tokenId: tokenIdFromFilename(obj.filename),
      meta: fs.readJSONSync(obj.filepath)
    }))

  const outputDir = 'build'
  fs.ensureDirSync(outputDir)

  for (let fileObj of saveFiles) {
    const tokenId = tokenIdFromFilename(fileObj.fileName)
    const metaFile = inputFiles.find(file => file.tokenId === tokenId)
    const typeId = metaFile.meta.attributes.find(attr => attr.trait_type.toLowerCase() === 'type')?.value?.toLowerCase() || 'egg'
    const markup = await upgradeSVGMarkup2(fileObj.markup, { renames, typeId, tokenId })
    const destinationPath = path.join(outputDir, fileObj.fileName.replace('svg', 'json'))

    const image = 'data:image/svg+xml;base64,' + Buffer.from(markup).toString('base64')
    const tokenObj = {
      ...metaFile.meta,
      image,
      animation_url: `${ANIMATION_BASE_URL}?id=${metaFile.tokenId}`
    }
    fs.writeJSONSync(destinationPath, tokenObj)
  }

}

const [,,...args] = process.argv
start(args)