import {
  ExtensionContext, Uri, CompletionItem,
  RelativePattern, workspace, CompletionItemKind, MarkdownString
} from 'vscode'

export default class CompletionMapping {
  constructor (
    public context: ExtensionContext,
    svgsDir: string
  ) {
    this.preloadCompletions(svgsDir)
  }

  public mappings: Map<Uri, CompletionItem[] | 'loading'> = new Map()

  public preloadCompletions (svgsDir: string) {
    workspace.workspaceFolders?.forEach((folder) => {
      this.loadCompletionItems(folder.uri, svgsDir)
    })
  }

  public fetchSvgCompeletionItems (baseUri: Uri, svgsDir: string) {
    if (!this.mappings.has(baseUri)) {
      this.mappings.set(baseUri, 'loading')
      this.loadCompletionItems(baseUri, svgsDir)
      return 'loading'
    }
    if (this.mappings.get(baseUri) === 'loading') {
      return 'loading'
    }
    return this.mappings.get(baseUri) || []
  }

  public loadCompletionItems (baseUri: Uri, svgsDir: string) {
    const svgPattern = new RelativePattern(baseUri, `${svgsDir}/**/*.svg`)
    return workspace.findFiles(svgPattern, '**​/node_modules/**', 1000)
      .then((svgFiles) => {
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
        this.mappings.set(baseUri, completionItems)
        return completionItems
      })
  }

  public clearMappings () {
    this.mappings.clear()
    return this.mappings
  }

  public reloadCompletions (svgsDir: string) {
    this.clearMappings()
    this.preloadCompletions(svgsDir)
  }
}
