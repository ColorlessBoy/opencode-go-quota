---
name: go-key
description: 管理 OpenCode Go 套餐的 API Key（查看、添加、删除、切换、排错）。当用户要求增删改 Go 套餐/key、查看或切换套餐、或套餐报错时使用。
---

# go-key：管理 Go 套餐

数据文件：`~/.config/opencode/go-keys.json`（权限 600，格式 `{"active":1, "plans":[{"name":"邮箱","key":"sk-…"}]}`）。
日常查看/切换由 `/quota` 弹窗承担；这里只负责**增删改**，用 jq 直接操作，不要手改。

## 查看

`cat ~/.config/opencode/go-keys.json`，key 掩码展示（前6后4）。

## 添加

1. 先校验 key（返回含 `"usage"` 才有效）：
   `curl -s -m 15 https://opencode.ai/zen/go/v1/usage -H "Authorization: Bearer <KEY>"`
2. 备份后写入（必须用 --arg，禁止字符串拼接进 jq 程序）：
   `cp ~/.config/opencode/go-keys.json ~/.config/opencode/go-keys.json.bak`
   `jq --arg n "<名称>" --arg k "<KEY>" '.plans += [{name:$n, key:$k}]' go-keys.json > tmp && mv tmp go-keys.json`
3. 重复 key 拒绝；名称建议用邮箱前缀。

## 删除

`jq --arg n "<名称>" '(.plans |= map(select(.name != $n))) | .active = (if .active > (.plans|length) then 1 else .active end)' go-keys.json > tmp && mv tmp go-keys.json`
（同名多个时先列出让用户确认）

## 切换（用户明确要求时）

1. `cp ~/.local/share/opencode/auth.json ~/.local/share/opencode/auth.json.bak`
2. `jq --arg k "<新KEY>" '.["opencode-go"].key = $k' auth.json > tmp && mv tmp auth.json`
3. 更新 go-keys.json 的 `.active` 为目标套餐下标+1
4. 提醒：重启 opencode 生效

## 规矩

- 写操作先备份；key 一律掩码输出，不完整打印、不写入日志
- 校验失败先确认 key 与网络，不要盲目写入
- 改完提醒：`/quota` 弹窗实时生效；涉及切换要重启 opencode
