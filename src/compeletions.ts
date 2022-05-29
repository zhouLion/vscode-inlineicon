import { config } from './config'
import {
  CompletionItemProvider, ExtensionContext,
  languages, Position, TextDocument, workspace
} from 'vscode'
import { fetchSvgCompeletionItems } from './stores'

function registerProjectIconCompletionProvider (ctx: ExtensionContext) {
  const iconProvider: CompletionItemProvider = {
    provideCompletionItems (document: TextDocument, position: Position) {
      const linePrefix = document.lineAt(position).text.substring(0, position.character + 1)
      const prefix = /icon(-c|C)lass=['"].*['"]?/
      if (!linePrefix.match(prefix)) { return null }

      const workspaceFolder = workspace.getWorkspaceFolder(document.uri)
      if (!workspaceFolder) { return null }

      const compeletionsOrStatus = fetchSvgCompeletionItems(workspaceFolder.uri)
      if (compeletionsOrStatus === 'loading') { return null }

      return compeletionsOrStatus
    }
  }

  const compeletions = languages.registerCompletionItemProvider(
    config.languageIds,
    iconProvider
  )
  ctx.subscriptions.push(compeletions)
}

/**
 * 注册自动补全
 * @param ctx An extension context is a collection of utilities private to an extension.
 */
export function registerCompletion (ctx: ExtensionContext) {
  registerProjectIconCompletionProvider(ctx)
}
