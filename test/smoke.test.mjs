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

test("first run seeds go-keys.json from auth.json", async () => {
  const { mkdtempSync, mkdirSync, writeFileSync, readFileSync } = await import("node:fs")
  const { tmpdir } = await import("node:os")
  const { join } = await import("node:path")
  const { pathToFileURL } = await import("node:url")
  const { execFile: exec } = await import("node:child_process")
  const { promisify } = await import("node:util")
  const run = promisify(exec)
  const home = mkdtempSync(join(tmpdir(), "goquota-"))
  const authDir = join(home, ".local", "share", "opencode")
  mkdirSync(authDir, { recursive: true })
  writeFileSync(join(authDir, "auth.json"), JSON.stringify({ "opencode-go": { type: "api", key: "sk-seed" } }))
  const script = `import(process.argv[1]).then(async (m) => { await m.ensureKeysFile(); const s = JSON.parse(await (await import("node:fs/promises")).readFile(process.env.HOME + "/.config/opencode/go-keys.json", "utf8")); if (s.plans[0].key !== "sk-seed") throw new Error("bad seed"); const r = await m.switchPlan(s.plans[0].name); if (r.code !== 0) throw new Error("switch failed: " + r.output) })`
  await run(process.execPath, ["-e", script, pathToFileURL("dist/tui.js").href], {
    env: { ...process.env, HOME: home },
    cwd: process.cwd(),
  })
  const auth = JSON.parse(readFileSync(join(authDir, "auth.json"), "utf8"))
  assert.equal(auth["opencode-go"].key, "sk-seed")
  assert.ok(join(home, ".local", "share", "opencode", "auth.json.bak"))
})
