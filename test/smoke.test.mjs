import test from "node:test"
import assert from "node:assert/strict"
import plugin, { countdown, bar, formatUsage } from "../dist/tui.js"

test("plugin shape", () => {
  assert.equal(plugin.id, "opencode-go-quota")
  assert.equal(typeof plugin.tui, "function")
})

test("bar renders proportional blocks", () => {
  assert.equal(bar(50, 10), "█████░░░░░")
  assert.equal(bar(0, 10), "░░░░░░░░░░")
  assert.equal(bar(100, 10), "██████████")
})

test("countdown formats remaining time", () => {
  assert.equal(countdown(new Date(Date.now() + 61 * 60000).toISOString()), "1h 1m")
  assert.equal(countdown(new Date(Date.now() + 25 * 60000).toISOString()), "25m")
  assert.equal(countdown(new Date(Date.now() - 60000).toISOString()), "now")
})

test("formatUsage renders windows", () => {
  const t = new Date(Date.now() + 60000).toISOString()
  const out = formatUsage({ rolling: { status: "ok", percent: 10, resetsAt: t } })
  assert.match(out, /Rolling/)
  assert.match(out, /10% used/)
})
