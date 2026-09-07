import { execFile } from "node:child_process"
import { readFile } from "node:fs/promises"
import { homedir } from "node:os"
import { join } from "node:path"

const USAGE_URL = "https://opencode.ai/zen/go/v1/usage"
const BAR_WIDTH = 24
const WINDOWS = [
  ["rolling", "Rolling (5h)"],
  ["weekly", "Weekly"],
  ["monthly", "Monthly"],
]
const LOADING_FRAMES = ["⠋", "⠙", "⠸", "⠴", "⠦", "⠇", "⠏"]

async function apiKey() {
  const dataHome = process.env.XDG_DATA_HOME || join(homedir(), ".local", "share")
  const auth = JSON.parse(await readFile(join(dataHome, "opencode", "auth.json"), "utf8"))
  const key = auth?.["opencode-go"]?.key
  if (!key) throw new Error("No OpenCode Go key in auth.json. Run /connect and add OpenCode Go.")
  return key
}

function usageWithCurl(key) {
  return new Promise((resolve, reject) => {
    execFile(
      "curl",
      ["-sS", "--max-time", "15", "-H", `Authorization: Bearer ${key}`, USAGE_URL],
      { timeout: 20000 },
      (err, stdout) => (err ? reject(err) : resolve(String(stdout))),
    )
  })
}

export async function fetchUsage() {
  const key = await apiKey()
  let body
  try {
    body = await usageWithCurl(key)
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

export function formatUsage(usage) {
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
  const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  lines.push("", `fetched ${time} via curl · exact $ usage: opencode.ai/auth`)
  return lines.join("\n")
}

let activeRequestId = 0
let stopLoading = undefined

function showDialog(api, title, message) {
  api.ui.dialog.replace(() =>
    api.ui.DialogAlert({ title, message, onConfirm: () => api.ui.dialog.clear() }),
  )
}

async function showQuotaDialog(api) {
  stopLoading?.()
  const requestId = ++activeRequestId
  let frame = 0
  const timer = setInterval(() => {
    if (activeRequestId !== requestId) return
    api.ui.dialog.replace(() =>
      api.ui.DialogAlert({
        title: "Quota",
        message: `Fetching Go quota ${LOADING_FRAMES[frame++ % LOADING_FRAMES.length]}`,
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
    const usage = await fetchUsage()
    if (activeRequestId !== requestId) return
    clearInterval(timer)
    showDialog(api, "Quota", formatUsage(usage))
  } catch (error) {
    if (activeRequestId !== requestId) return
    clearInterval(timer)
    showDialog(api, "Quota Error", error instanceof Error ? error.message : "Failed to fetch quota.")
  }
}

const plugin = {
  id: "opencode-go-quota",
  tui: async (api) => {
    api.command.register(() => [
      {
        title: "Show Go quota",
        value: "goquota.show",
        description: "OpenCode Go rolling/weekly/monthly usage (via curl)",
        category: "Quota",
        suggested: true,
        slash: { name: "quota", aliases: ["gq"] },
        onSelect: () => showQuotaDialog(api),
      },
    ])
  },
}

export default plugin
