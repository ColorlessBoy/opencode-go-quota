import { execFile } from "node:child_process"
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises"
import { homedir } from "node:os"
import { dirname, join } from "node:path"

const USAGE_URL = "https://opencode.ai/zen/go/v1/usage"
const KEYS_FILE = join(homedir(), ".config", "opencode", "go-keys.json")
const AUTH_FILE = join(process.env.XDG_DATA_HOME || join(homedir(), ".local", "share"), "opencode", "auth.json")
const BAR_WIDTH = 24
const WINDOWS = [
  ["rolling", "Rolling (5h)"],
  ["weekly", "Weekly"],
  ["monthly", "Monthly"],
]
const LOADING_FRAMES = ["⠋", "⠙", "⠸", "⠴", "⠦", "⠇", "⠏"]
const TITLE = "Go 套餐剩余量 · 支持管理多个 opencode go 套餐 · 回车切换（重启后生效）"

export async function fetchUsage(key) {
  let body
  try {
    body = await new Promise((resolve, reject) => {
      execFile(
        "curl",
        ["-sS", "--max-time", "15", "-H", `Authorization: Bearer ${key}`, USAGE_URL],
        { timeout: 20000 },
        (err, stdout) => (err ? reject(err) : resolve(String(stdout))),
      )
    })
  } catch {
    const res = await fetch(USAGE_URL, { headers: { Authorization: `Bearer ${key}` } })
    body = await res.text()
  }
  let data
  try {
    data = JSON.parse(body)
  } catch {
    throw new Error(`Unexpected response: ${body.slice(0, 120)}`)
  }
  if (!data?.usage) throw new Error("No usage data in response.")
  return data.usage
}

export function countdown(iso) {
  const ms = new Date(iso).getTime() - Date.now()
  if (!Number.isFinite(ms) || ms <= 0) return "now"
  const min = Math.ceil(ms / 60000)
  const d = Math.floor(min / 1440)
  const h = Math.floor((min % 1440) / 60)
  const m = min % 60
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export function bar(usedPercent, width = BAR_WIDTH) {
  const used = Math.max(0, Math.min(100, Math.round(usedPercent)))
  const filled = Math.round((used / 100) * width)
  return "█".repeat(filled) + "░".repeat(width - filled)
}

export function formatWindows(usage) {
  const lines = []
  for (const [key, label] of WINDOWS) {
    const w = usage[key]
    if (!w) continue
    const warn = w.percent >= 80 ? " ⚠" : ""
    lines.push(
      `${label.padEnd(12)} ${bar(w.percent)} ${String(w.percent).padStart(3)}% used${warn} · resets in ${countdown(w.resetsAt)}`,
    )
  }
  if (!lines.length) throw new Error("No usage windows returned.")
  return lines
}

export function formatUsage(usage) {
  const lines = formatWindows(usage)
  const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  lines.push("", `fetched ${time} via curl · exact $ usage: opencode.ai/auth`)
  return lines.join("\n")
}

async function loadState() {
  const raw = JSON.parse(await readFile(KEYS_FILE, "utf8"))
  const plans = Array.isArray(raw.plans) ? raw.plans.filter((p) => p && typeof p.key === "string") : []
  const active = Number(raw.active) || 1
  return { raw, active, plans }
}

export async function ensureKeysFile() {
  try {
    await readFile(KEYS_FILE)
    return
  } catch {}
  let key
  try {
    const auth = JSON.parse(await readFile(AUTH_FILE, "utf8"))
    key = auth?.["opencode-go"]?.key
  } catch {}
  const seed = { active: 1, plans: key ? [{ name: "套餐A", key }] : [] }
  await mkdir(dirname(KEYS_FILE), { recursive: true })
  await writeFile(KEYS_FILE, `${JSON.stringify(seed, null, 2)}\n`, { mode: 0o600 })
}

export async function switchPlan(name) {
  const { raw, active, plans } = await loadState()
  const index = plans.findIndex((p) => p.name.toLowerCase() === String(name).toLowerCase())
  if (index === -1) return { code: 1, output: `没有匹配 "${name}" 的套餐` }
  if (index === active - 1) return { code: 0, output: `已在用 ${name}` }
  const prev = JSON.parse(await readFile(AUTH_FILE, "utf8"))
  await copyFile(AUTH_FILE, `${AUTH_FILE}.bak`)
  prev["opencode-go"] = { ...(prev["opencode-go"] || { type: "api" }), key: plans[index].key }
  await writeFile(AUTH_FILE, `${JSON.stringify(prev, null, 2)}\n`)
  await writeFile(KEYS_FILE, `${JSON.stringify({ ...raw, active: index + 1 }, null, 2)}\n`)
  return { code: 0, output: `已切换到 ${plans[index].name}` }
}

let activeRequestId = 0
let stopLoading = undefined

function showDialog(api, title, message) {
  api.ui.dialog.replace(() =>
    api.ui.DialogAlert({ title, message, onConfirm: () => api.ui.dialog.clear() }),
  )
}

async function showQuotaPanel(api) {
  let state
  try {
    await ensureKeysFile()
    state = await loadState()
  } catch {
    showDialog(api, "Go 套餐", "go-keys.json 读取失败。编辑 ~/.config/opencode/go-keys.json 添加套餐：\n\n{\"active\":1, \"plans\":[{\"name\":\"邮箱\", \"key\":\"sk-…\"}]}")
    return
  }
  if (!state.plans.length) {
    showDialog(api, "Go 套餐", "还没有套餐。编辑 ~/.config/opencode/go-keys.json 添加：\n\n{\"active\":1, \"plans\":[{\"name\":\"邮箱\", \"key\":\"sk-…\"}]}\n\n（若 /connect 里还没有 Go key，先运行 /connect）")
    return
  }

  stopLoading?.()
  const requestId = ++activeRequestId
  let frame = 0
  const timer = setInterval(() => {
    if (activeRequestId !== requestId) return
    api.ui.dialog.replace(() =>
      api.ui.DialogAlert({
        title: "Go 套餐剩余量",
        message: `正在查询各套餐用量 ${LOADING_FRAMES[frame++ % LOADING_FRAMES.length]}`,
        onConfirm: () => {
          activeRequestId++
          clearInterval(timer)
          api.ui.dialog.clear()
        },
      }),
    )
  }, 120)
  stopLoading = () => clearInterval(timer)

  try {
    const rows = await Promise.all(
      state.plans.map(async (plan, index) => ({
        plan,
        current: index === state.active - 1,
        usage: await fetchUsage(plan.key).catch(() => undefined),
      })),
    )
    if (activeRequestId !== requestId) return
    clearInterval(timer)

    const options = rows.map((row) => {
      const u = row.usage
      const pad = (n) => String(n).padStart(3)
      const footer = u
        ? `${u.monthly.percent >= 100 ? "⚠" : " "}月${pad(100 - u.monthly.percent)}% 周${pad(100 - u.weekly.percent)}% 5h${pad(100 - u.rolling.percent)}%`
        : "查询失败"
      return {
        title: row.plan.name,
        footer,
        truncateTitle: "left",
        titleWidth: 26,
        value: row.plan.name,
        onSelect: async () => {
          if (row.current) {
            api.ui.toast({ variant: "info", message: `已在用 ${row.plan.name}` })
            return
          }
          const result = await switchPlan(row.plan.name)
          api.ui.dialog.clear()
          if (result.code === 0) {
            api.ui.toast({ variant: "success", message: `${result.output} · 重启 opencode 后生效` })
          } else {
            api.ui.toast({ variant: "error", message: result.output })
          }
        },
      }
    })

    api.ui.dialog.setSize(rows.length > 2 ? "large" : "medium")
    api.ui.dialog.replace(() =>
      api.ui.DialogSelect({
        title: TITLE,
        options,
        current: rows.find((row) => row.current)?.plan.name,
      }),
    )
  } catch (error) {
    if (activeRequestId !== requestId) return
    clearInterval(timer)
    showDialog(api, "Go 套餐错误", error instanceof Error ? error.message : "查询套餐用量失败。")
  }
}

const plugin = {
  id: "opencode-go-quota",
  tui: async (api) => {
    api.command.register(() => [
      {
        title: "Go 套餐剩余量",
        value: "goquota.show",
        description: "查看各套餐剩余量并切换（支持多套餐）",
        category: "Go",
        suggested: true,
        slash: { name: "quota" },
        onSelect: () => showQuotaPanel(api),
      },
    ])
  },
}

export default plugin
