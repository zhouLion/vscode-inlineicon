import { log } from 'console'
import { ExtensionContext } from 'vscode'
import { registerAnnotations } from './annotations'
import { registerCommands } from './commands'
import { registerCompletion } from './compeletions'
import { listenConfiguration } from './config'

export function activate (context: ExtensionContext) {
  listenConfiguration(context)
  registerCommands(context)
  registerCompletion(context)
  registerAnnotations(context)
}

export function deactivate () {
  log('med-helper 退出')
}
