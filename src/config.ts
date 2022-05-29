import { ColorThemeKind, ExtensionContext, window, workspace } from 'vscode'
import { computed, reactive, ref } from '@vue/reactivity'
import { preloadCompletions, reloadCompletions } from './stores'

const EXT_NAMESPACE = 'med-helper'

const _configState = ref(0)

export const config = reactive({
  svgsDir: createConfigRef(`${EXT_NAMESPACE}.svgsDir`, 'src/assets/icons'),
  /** onlyIcon */
  onlyIcon: createConfigRef(`${EXT_NAMESPACE}.onlyIcon`, true),
  annotations: createConfigRef(`${EXT_NAMESPACE}.annotations`, true),
  color: createConfigRef(`${EXT_NAMESPACE}.color`, 'auto'),
  fontSize: createConfigRef('editor.fontSize', 12),
  languageIds: createConfigRef<string[]>(`${EXT_NAMESPACE}.languageIds`, ['vue'])
})

function getConfig<T = any> (key: string): T | undefined {
  return workspace
    .getConfiguration()
    .get<T>(key)
}

async function setConfig (key: string, value: any, isGlobal = true) {
  return await workspace
    .getConfiguration()
    .update(key, value, isGlobal)
}

function createConfigRef<T> (key: string, defaultValue: T, isGlobal = true) {
  return computed({
    get: () => {
      // HACK： 刷新 _configState 的值，可以强制更新
      // eslint-disable-next-line no-unused-expressions
      _configState.value
      return getConfig<T>(key) ?? defaultValue
    },
    set: (v) => {
      setConfig(key, v, isGlobal)
    }
  })
}

export const color = computed(() => {
  return config.color === 'auto'
    ? isDarkTheme()
      ? '#eee'
      : '#222'
    : config.color
})

export function escapeRegExp (text: string) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')
}

export function triggerConfigUpdate () {
  _configState.value = +new Date()
}

function isDarkTheme () {
  const themeKind = window?.activeColorTheme?.kind
  if (themeKind && themeKind === ColorThemeKind?.Dark) { return true }
  const theme = createConfigRef('workbench.colorTheme', '', true)
  if (theme.value.match(/dark|black/i) != null) { return true }
  if (theme.value.match(/light/i) != null) { return false }
  return true
}

export function listenConfiguration (context: ExtensionContext) {
  preloadCompletions(workspace.workspaceFolders)
  workspace.onDidChangeConfiguration((e) => {
    if (!e.affectsConfiguration('med-helper.svgsDir')) { return }
    triggerConfigUpdate()
    reloadCompletions()
  }, null, context.subscriptions)
}
