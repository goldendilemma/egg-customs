const fs = require('fs-extra')
const path = require('path')

const { 
  cleanSVGs, 
  upgradeSVGMarkup, 
  getFileNameFromPath 
} = require('./libraries/svg')

const renames = {
  hair: 'hat',
  chik: 'chikin'
}

const tokenIdFromFilename = (filename) => {
  const parts = filename.split('.')
  return Number(parts[0])
}

async function start ([inputDir, inputImageDir]) {

  const saveFiles = cleanSVGs(inputImageDir)
  
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
    const markup = await upgradeSVGMarkup(fileObj.markup, { renames })
    const destinationPath = path.join(outputDir, fileObj.fileName.replace('svg', 'json'))
    const tokenId = tokenIdFromFilename(fileObj.fileName)
    const metaFile = inputFiles.find(file => file.tokenId === tokenId)

    const image = 'data:image/svg+xml;base64,' + Buffer.from(markup).toString('base64')
    const tokenObj = {
      ...metaFile.meta,
      image
    }
    fs.writeJSONSync(destinationPath, tokenObj)
  }

}

const [,,...args] = process.argv
start(args)