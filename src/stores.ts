import {
  CompletionItem, CompletionItemKind, MarkdownString,
  RelativePattern, Uri, workspace, WorkspaceFolder
} from 'vscode'
import { config } from './config'

/**
 * 一个 workspace uri，对应一个自动补全元素数组
 */
export const mappings: Map<Uri, CompletionItem[] | 'loading'> = new Map()

export function fetchSvgCompeletionItems (baseUri: Uri) {
  if (!mappings.has(baseUri)) {
    mappings.set(baseUri, 'loading')
    loadCompletionItems(baseUri)
    return 'loading'
  }
  if (mappings.get(baseUri) === 'loading') {
    return 'loading'
  }
  return mappings.get(baseUri) || []
}

export async function loadCompletionItems (baseUri: Uri) {
  const svgPattern = new RelativePattern(baseUri, `${config.svgsDir}/**/*.svg`)
  const svgFiles = await workspace.findFiles(svgPattern, '**​/node_modules/**', 1000)
  const completionItems = svgFiles.map((file) => {
    const iconName = file.fsPath.replace(/.*\/(.*).svg/, '$1')
    const iconCompeletionItem = new CompletionItem(iconName)
    iconCompeletionItem.kind = CompletionItemKind.Value
    iconCompeletionItem.insertText = iconName
    iconCompeletionItem.documentation = new MarkdownString(`图标：<img src="${file}" alt="${iconName}" width="24px" height="24px" />`, true)
    // 存文件的 fs 路径
    iconCompeletionItem.detail = file.fsPath
    iconCompeletionItem.documentation.supportHtml = true
    return iconCompeletionItem
  })
  mappings.set(baseUri, completionItems)
  return completionItems
}

export function clearMappings () {
  mappings.clear()
  return mappings
}

export function reloadCompletions () {
  clearMappings()
  preloadCompletions(workspace.workspaceFolders)
}

export function preloadCompletions (folders?: readonly WorkspaceFolder[]) {
  folders?.forEach((folder) => {
    loadCompletionItems(folder.uri)
  })
}
