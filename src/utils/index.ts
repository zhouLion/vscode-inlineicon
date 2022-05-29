import { Uri, workspace } from 'vscode'
import { config } from '../config'

export interface IconInfo {
  id: string
  width: number
  height: number
  key: string
  ratio: number
  body: string
  svg?: string
  dataUrl?: string
}

export const btoa = (str: string) => Buffer.from(str, 'binary').toString('base64')

export const atob = (str: string) => Buffer.from(str, 'base64').toString('binary')

export const isTruthy = <T>(a: T | undefined): a is T => Boolean(a)

export function toDataUrl (svg: string) {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}

export function pathToSvg (info: IconInfo, fontSize: number = config.fontSize) {
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${fontSize * info.ratio}px" height="${fontSize}px" preserveAspectRatio="xMidYMid meet" viewBox="0 0 ${info.width} ${info.height}">${info.body}</svg>`
}

function execFn (str: string, regex: RegExp) {
  const matched = regex.exec(str)
  if (!matched) return null
  const result = matched[1]
  return result
}

function extractBody (svgXml: string) {
  const regex = /<svg[\s\w\d]*.+?>(.+)<\/svg>/
  return execFn(svgXml, regex)
}

function extractWidth (svgXml: string) {
  const widthRegex = /<svg\n*\s*.*width="(\d*)px".+?>/
  return execFn(svgXml, widthRegex)
}

function extractHeight (svgXml: string) {
  const heightRegex = /<svg\n*\s*.*height="(\d*)px".+?>/
  return execFn(svgXml, heightRegex)
}

const cache: Map<Uri, IconInfo> = new Map()

// TODO: 解析 svg
/**
 * 解析 svg
 * @param uri
 */
export async function loadSvgInfo (uri?: Uri): Promise<IconInfo | null> {
  if (!uri) { return null }
  if (cache.has(uri)) {
    return cache.get(uri) ?? null
  }
  try {
    const file = await workspace.fs.readFile(uri)
    const svgXML = String.fromCharCode.apply(null, Array.from(file)).replace(/\n/g, '')
    const [width, height] = [
      Number(extractWidth(svgXML)),
      Number(extractHeight(svgXML))
    ]
    const ratio = Math.max(width, 1) / Math.max(height, 1)
    const body = extractBody(svgXML) || ''
    const result: IconInfo = {
      id: uri.toString(),
      key: uri.toString(),
      body,
      width,
      height,
      ratio
    }

    result.svg = pathToSvg(result)
    result.dataUrl = toDataUrl(result.svg)

    cache.set(uri, result)
    return result
  } catch (error) {
    console.log(error)
    return null
  }
}
