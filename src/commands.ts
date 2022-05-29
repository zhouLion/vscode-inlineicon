import { ExtensionContext, commands, window } from 'vscode'
import { config } from './config'

/**
 * 注册指令集
 * @param context
 */
export function registerCommands (context: ExtensionContext) {
  context.subscriptions.push(
    commands.registerCommand('med-helper.hello', () => {
      window.showInformationMessage('Hello World!')
    }),

    commands.registerCommand('med-helper.toggleAnnotations', () => {
      config.annotations = !config.annotations
    }),

    commands.registerCommand('med-helper.toggleOnlyIcon', () => {
      config.onlyIcon = !config.onlyIcon
    })
  )
}
