# opencode-go-quota

English | [中文](#中文)

OpenCode TUI plugin that shows your **OpenCode Go** subscription quota in a dialog — rolling (5h), weekly, and monthly usage with progress bars and reset countdowns.

```
→ [Quota]
Rolling (5h)  ████████░░░░░░░░░░░░░░░░  33% used · resets in 2h 14m
Weekly        ██████████████░░░░░░░░░░  58% used · resets in 3d 2h
Monthly       ████████████████████░░░░  82% used ⚠ · resets in 9d 4h

fetched 02:30 PM via curl · exact $ usage: opencode.ai/auth
```

Run `/quota` (alias `/gq`) in the OpenCode TUI.

## How it works

- Reads your OpenCode Go API key from `~/.local/share/opencode/auth.json` (created by `/connect`).
- Queries the official usage endpoint `GET https://opencode.ai/zen/go/v1/usage` via `curl` (falls back to `fetch` if curl is unavailable).
- The call is a read-only account status check — it does **not** consume quota and needs no browser cookies.

Note: the API returns percentage of usage per window (limits: 5h $12 / week $30 / month $60). Exact dollar amounts are only visible in the [console](https://opencode.ai/auth).

## Install

Add the plugin to your `tui.json` (global: `~/.config/opencode/tui.json`):

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["opencode-go-quota"]
}
```

OpenCode installs npm TUI plugins automatically on startup. Then run `/quota` inside the TUI.

Alternatively, register a local checkout by absolute path:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["/absolute/path/to/opencode-go-quota/dist/tui.js"]
}
```

## Troubleshooting

- **"No OpenCode Go key in auth.json"** — run `/connect` in the TUI and add OpenCode Go.
- **Error dialog on fetch** — check network access to `opencode.ai`; the plugin falls back from curl to `fetch` automatically.

## 中文

OpenCode TUI 插件：用弹窗展示 **OpenCode Go** 订阅余量——rolling（5 小时）/ weekly / monthly 三个窗口的用量进度条与重置倒计时。

在 TUI 中运行 `/quota`（别名 `/gq`）。

**原理**

- 从 `~/.local/share/opencode/auth.json` 读取 Go 的 API key（由 `/connect` 写入）。
- 通过 `curl` 调用官方接口 `GET https://opencode.ai/zen/go/v1/usage`（无 curl 时自动退回 `fetch`）。
- 纯账户状态读取，**不消耗额度**，无需浏览器 cookie。

接口只返回各窗口的使用百分比（限额：5 小时 $12 / 每周 $30 / 每月 $60）；精确美元金额需在[控制台](https://opencode.ai/auth)查看。

**安装**：在 `~/.config/opencode/tui.json` 中加入 `"plugin": ["opencode-go-quota"]`，重启 TUI 即可。

## License

MIT
