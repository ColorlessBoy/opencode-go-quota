import type { TuiPluginModule } from "@opencode-ai/plugin/tui"

declare const plugin: TuiPluginModule & {
  id: string
}

export { plugin as default }
