const fs = require('fs-extra')
const { JSDOM } = require('jsdom')
const path = require('path')

const filterFileByExt = (filterByExt) => 
  (file) => {
  const fileParts = file.split('.')
  const extension = fileParts[fileParts.length - 1]
    .toLowerCase()
  return extension === filterByExt
}

const getFilesFrom = (folder, ext) => {
  const fullPath = path.resolve(__dirname, folder)
  const files = fs.readdirSync(fullPath)
    .filter(filterFileByExt(ext))
    .map(filePath => path.join(fullPath, filePath))
  return files  
}

const getSVGFromFolder = (folderPath) => {
  const fullPath = path.resolve(__dirname, folderPath)
  const files = fs.readdirSync(fullPath)
    .filter(filterFileByExt('svg'))
    .map(filePath => path.join(fullPath, filePath))
  return files
}

const getContentFromFile = (filePath) => {
  return fs.readFileSync(filePath).toString()
}

const svgMarkupToDOM = (markup) => {
    const dom = new JSDOM(markup)
    const document = dom.window.document
    return document
}

const getSVG = (document) => {
  return document.querySelector('svg')
}

const parseGroupId = (groupId) => {
  const parts = groupId.split('-')
  const formatted = parts.map(part => part.replaceAll('_', '-'))
  return formatted
}

const setGroupAttrs = ($group, [className, id]) => {
  if (className) {
    $group.classList.add(className)
  }
  if (id) {
    $group.classList.add(id)
  }
  $group.removeAttribute('id')
}

const toEGGFormat = (document, type = 'egg') => {
  const $svg = getSVG(document)
  $svg.setAttribute('width', '100%')
  $svg.setAttribute('height', '100%')
  $svg.setAttribute('id', type)
  $svg.setAttribute('shape-rendering', 'crispEdges')
  if ($svg.children.length === 1) { // remove group wrapper
    const group = $svg.children[0]
    group.replaceWith(...group.children)
  }
  $decorations = $svg.querySelectorAll('[id^=decoration]')
  for (let $deco of $decorations) {
   $deco.remove() 
  }
  $svg.querySelector('rect[height="24"][width="24"]')?.remove()
  const $groups = [...$svg.children].filter((elem) => elem.tagName === 'g')
  for ($group of $groups) {
    const groupId = $group.getAttribute('id')
    const [className, id] = parseGroupId(groupId)
    setGroupAttrs($group, [className, id])
    
    const $subGroups = $group.querySelectorAll('*')
    for (let $subGroup of $subGroups) {
      $subGroup.removeAttribute('id')
    }
  }
  if ($svg.querySelector('style') == null) {
    const $style = document.createElement('style')
    $style.textContent = `<![CDATA[
      #${type}:active{transform:scaleX(-1);}
    ]]>`
    $svg.appendChild($style)
  }
  return document
}

const getFileNameFromPath = (filePath) => {
  const paths = filePath.split('/')
  return paths[paths.length - 1]
}

// returns list of svg markup
const cleanSVGs = (svgPath, opts = {}) => {
  const svgFiles = getSVGFromFolder(svgPath)
  const svgMarkups = svgFiles.map(getContentFromFile)
  const $documents = svgMarkups.map(svgMarkupToDOM)
  const $formatted = $documents.map(($doc) => toEGGFormat($doc, opts.type))
  const $svgs = $formatted.map(getSVG)
  
  const cleaned = $svgs.map(($svg, si) => {
    const markup = $svg.outerHTML
    const fileName = svgFiles[si]
    return {
      fileName: getFileNameFromPath(fileName),
      filePath: fileName,
      markup
    }
  })
  return cleaned
}

const cdata = (content) => `<![CDATA[${content}]]>`
const isNumericId = id => !isNaN(Number(id.slice(1)))

// version 2
async function upgradeSVGMarkup (markup, opts = {}) {
  const { 
    renames = {} 
  } = opts
  const $dom = new JSDOM(markup)
  const document = $dom.window.document

  const $svg = document.querySelector('body > svg')
  const _typeId = $svg.getAttribute('id')
  const typeId = renames[_typeId] != null
    ? renames[_typeId]
    : _typeId
  $svg.setAttribute('id', 'scene')
  $svg.setAttribute('shape-rendering', 'crispEdges')
  $svg.setAttribute('image-rendering', 'pixelated')

  // hair => hat
  document.querySelector('.hair')?.classList?.replace('hair', 'hat')

  const $entity = document.querySelector('.entity')
  const $attributes = document.querySelectorAll('svg > *:not(style)')
  if (!$entity) {
    const $group = document.createElement('g')
    $group.classList.add(typeId, 'entity')
    $group.append(...$attributes)
    $svg.prepend($group)
  }

  for (const $attribute of $attributes) {
    const id = $attribute.getAttribute('id')
    if (id && !isNumericId(id)) {
      $attribute.removeAttribute('id')
      $attribute.classList.add(id)
    }
    for (const className of $attribute.classList) {
      if (isNumericId(className)) {
        $attribute.classList.remove(className)
        $attribute.id = className
      }
    }
  }

  const $border = document.querySelector('.border')
  if ($border) {
    const $body = document.querySelector('.body')
    $body.prepend(...$border.childNodes)
    $border.remove()
  }

  const $style = document.querySelector('style')
  const updatedStyle = $style.textContent
    .replaceAll(`#${_typeId}`, '#scene')
    .trim()
  $style.textContent = cdata(updatedStyle)

  return document.body.innerHTML
    .replaceAll('\n', '')
    .replaceAll('  ', '')
}

module.exports = {
  cleanSVGs,
  getFilesFrom,
  upgradeSVGMarkup,
  getFileNameFromPath
}