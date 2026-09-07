# opencode-go-quota

English | [中文](#中文)

OpenCode TUI plugin that manages multiple **OpenCode Go** plans from a dialog — per-plan remaining quota (5h / weekly / monthly, aligned single-line columns) and one-key switching.

```
→ [/quota]
Go 套餐剩余量 · 支持管理多个 opencode go 套餐 · 回车切换（重启后生效）
  501868024@qq.com             月 82% 周 78% 5h 40%
  penglingwei72@gmail.com     ⚠月  0% 周 80% 5h 51%
```

Run `/quota` in the OpenCode TUI. Select a plan and press Enter to switch — takes effect after restarting OpenCode; the active plan is marked ●.

## How it works

- Plans live in `~/.config/opencode/go-keys.json`:

  ```json
  {
    "active": 1,
    "plans": [
      { "name": "you@mail.com", "key": "sk-…" },
      { "name": "other@mail.com", "key": "sk-…" }
    ]
  }
  ```

- Selecting a plan rewrites the `opencode-go` key in `~/.local/share/opencode/auth.json` (previous key backed up to `auth.json.bak`) and updates `active`. Restart OpenCode for it to take effect.
- Usage comes from the official endpoint `GET https://opencode.ai/zen/go/v1/usage` via `curl` (falls back to `fetch`). Read-only, consumes no quota, no browser cookies.

Note: the API returns usage percentages per window (limits: 5h $12 / week $30 / month $60). Exact dollar amounts are visible in the [console](https://opencode.ai/auth).

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
  "plugin": ["/absolute/path/to/opencode-go-quota"]
}
```

## Troubleshooting

- **"未找到 go-keys.json" / empty panel** — create `~/.config/opencode/go-keys.json` with your plans (see the JSON above; each key is the Go API key from that account's console).
- **Error dialog on fetch** — check network access to `opencode.ai`; the plugin falls back from curl to `fetch` automatically.
- **Switch didn't take effect** — restart OpenCode; the provider key is cached per process.

## 中文

OpenCode TUI 插件：在弹窗里管理多个 **OpenCode Go** 套餐——每个套餐的单行剩余额度（5 小时 / 每周 / 每月，定宽对齐）与一键切换。

在 TUI 中运行 `/quota`，选中套餐回车即切换（重启 OpenCode 后生效，当前套餐有 ● 标记）。

**原理**

- 套餐存在 `~/.config/opencode/go-keys.json`（格式见上方英文版 JSON）。
- 切换 = 改写 `~/.local/share/opencode/auth.json` 的 `opencode-go` key（原 key 备份为 `auth.json.bak`）并更新 `active`，重启 OpenCode 生效。
- 用量来自官方接口 `GET https://opencode.ai/zen/go/v1/usage`（curl，缺省退回 fetch）。纯状态读取，**不消耗额度**，无需浏览器 cookie。

接口只返回各窗口使用百分比（限额：5 小时 $12 / 每周 $30 / 每月 $60）；精确美元金额需在[控制台](https://opencode.ai/auth)查看。

**安装**：在 `~/.config/opencode/tui.json` 中加入 `"plugin": ["opencode-go-quota"]`，重启 TUI 即可。

## License

MIT
