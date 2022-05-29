import {
  DecorationOptions, ExtensionContext, MarkdownString,
  TextEditor, DecorationRangeBehavior, Range, Uri, window, workspace, CompletionItem
} from 'vscode'
import { config, triggerConfigUpdate } from './config'
import { mappings } from './stores'
import { isTruthy, loadSvgInfo } from './utils'

export interface DecorationMatch extends DecorationOptions {
  key: string
}

type MyDecoration = [Range, string]

interface Callback {
  (
    value: MyDecoration,
    index: number,
    array: MyDecoration[]
  ): Promise<void>
}

export function registerAnnotations (ctx: ExtensionContext) {
  registerLocalIconAnnotation(ctx)
}

function registerLocalIconAnnotation (ctx: ExtensionContext) {
  const stores = {
    decorations: [] as DecorationMatch[],
    editor: undefined as TextEditor | undefined
  }

  const InlineIconDecoration = window.createTextEditorDecorationType({
    textDecoration: 'none; opacity: 0.6 !important;',
    rangeBehavior: DecorationRangeBehavior.ClosedClosed
  })
  // 把文本信息隐藏的修饰样式
  const HideTextDecoration = window.createTextEditorDecorationType({
    textDecoration: 'none; display: none;'
  })

  function prepareDecorations (
    completions: CompletionItem[]
  ): Callback {
    return async ([range, key]) => {
      // 找到图标对应的补全配置项
      const completion = completions.find(({ detail }) => detail?.endsWith(`/${key}.svg`))
      const uri = Uri.parse(completion?.detail || '')
      const hoverMessage = new MarkdownString(
        `## 图标
![](${completion?.detail})
- - -
[打开文件${key}](${completion?.detail})
`)
      hoverMessage.isTrusted = true
      hoverMessage.supportHtml = true
      const fileInfo = await loadSvgInfo(uri)
      console.log(fileInfo)
      const decorationItem = {
        range,
        hoverMessage,
        renderOptions: {
          before: {
            contentIconPath: Uri.parse(fileInfo?.dataUrl || ''),
            margin: `-${config.fontSize}px 2px; transform: translate(-2px, 3px);`,
            height: `${config.fontSize * 1.1}px`,
            width: `${config.fontSize * 1.1}px`
          }
        },
        key
      }
      stores.decorations.push(decorationItem)
    }
  }

  async function updateDecorations () {
    const { editor } = stores
    if (!editor) { return }

    // TODO: editor.document.languageId
    if (!config.annotations) {
      editor.setDecorations(InlineIconDecoration, [])
      editor.setDecorations(HideTextDecoration, [])
      return
    }

    const workspaceFolder = workspace.getWorkspaceFolder(editor.document.uri)
    if (!workspaceFolder?.uri) { return }

    const completions = mappings.get(workspaceFolder.uri)
    if (!completions || completions === 'loading') { return }

    const text = editor.document.getText()
    let match
    const fileFsPaths = completions
      .map((completion) => completion.detail?.replace(/.*\/(.*).svg/, '$1'))
      .filter(isTruthy)
    const regex = new RegExp(`(['"](${fileFsPaths.join('|')})['"])`, 'g')
    const keys: MyDecoration[] = []

    while ((match = regex.exec(text))) {
      const key = match[1].replace(/['"]/g, '')
      if (!key) { continue }
      const startPos = editor.document.positionAt(match.index + 1)
      const endPos = editor.document.positionAt(match.index + key.length + 1)
      keys.push([new Range(startPos, endPos), key])
    }

    stores.decorations = []
    await Promise.all(keys.map(prepareDecorations(completions)))

    refreshDecorations()
  }

  function refreshDecorations () {
    const { editor, decorations } = stores
    if (!editor) { return }
    if (!config.annotations) {
      editor.setDecorations(InlineIconDecoration, [])
      editor.setDecorations(HideTextDecoration, [])
      return
    }

    editor.setDecorations(InlineIconDecoration, decorations)

    if (config.onlyIcon) {
      editor.setDecorations(
        HideTextDecoration,
        decorations
          .map(({ range }) => range)
          .filter(i => i.start.line !== editor!.selection.start.line)
      )
    } else {
      editor.setDecorations(HideTextDecoration, [])
    }
  }

  function updateEditor (_editor?: TextEditor) {
    if (!_editor || stores.editor === _editor) { return }
    stores.editor = _editor
    stores.decorations = []
  }

  let timeout: NodeJS.Timer | undefined
  function triggerUpdateDecorations (_editor?: TextEditor) {
    updateEditor(_editor)

    if (timeout) {
      clearTimeout(timeout)
      timeout = undefined
    }
    timeout = setTimeout(() => {
      updateDecorations()
    }, 200)
  }

  window.onDidChangeActiveTextEditor((e) => {
    triggerUpdateDecorations(e)
  }, null, ctx.subscriptions)

  workspace.onDidChangeTextDocument((event) => {
    if (!window.activeTextEditor || event.document !== window.activeTextEditor.document) { return }
    triggerUpdateDecorations(window.activeTextEditor)
  }, null, ctx.subscriptions)

  workspace.onDidChangeConfiguration(() => {
    triggerConfigUpdate()
    triggerUpdateDecorations()
  }, null, ctx.subscriptions)

  window.onDidChangeVisibleTextEditors((editors) => {
    triggerUpdateDecorations(editors[0])
  }, null, ctx.subscriptions)

  window.onDidChangeTextEditorSelection((e) => {
    updateEditor(e.textEditor)
    refreshDecorations()
  })

  updateEditor(window.activeTextEditor)
  triggerUpdateDecorations()
}

/**
 * @param ctx
 */
// eslint-disable-next-line no-unused-vars
function registerElementUIAnnotation (ctx: ExtensionContext) {
  function parseIconCompletionItems (iconCssUri: Uri) {
    workspace.fs.readFile(iconCssUri).then((icon) => {
      const str = String.fromCharCode.apply(null, Array.from(icon))
      const regex = /(el-icon-[\w-]*?):/
      regex.lastIndex = 0
      let matched
      const iconsList: string[] = []
      while ((matched = regex.exec(str))) {
        if (!matched) { continue }
        const iconName = matched[1]
        if (iconsList.includes(iconName)) { continue }
        iconsList.push(iconName)
      }

      iconsList.join('|')
    })
  }

  workspace.findFiles('node_modules/element-ui/lib/theme-chalk/icon.css', null, 1).then(([file]) => {
    parseIconCompletionItems(file)
  })

  const watcher = workspace.createFileSystemWatcher('node_modules/element-ui/lib/theme-chalk/icon.css')
  watcher.onDidCreate((file) => {
    parseIconCompletionItems(file)
  }, null, ctx.subscriptions)
}
