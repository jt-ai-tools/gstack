---
name: careful
version: 0.1.0
description: |
  針對破壞性指令的安全護欄。在執行 rm -rf, DROP TABLE, force-push, git reset --hard,
  kubectl delete 以及類似的破壞性操作前發出警告。用戶可以覆蓋每個警告。當接觸生產環境、
  除錯直播系統或在共享環境中工作時使用。當被要求「be careful」、「safety mode」、
  「prod mode」或「careful mode」時使用。
allowed-tools:
  - Bash
  - Read
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "bash ${CLAUDE_SKILL_DIR}/bin/check-careful.sh"
          statusMessage: "正在檢查是否包含破壞性指令..."
---
<!-- 由 SKILL.md.tmpl 自動生成 — 請勿直接編輯 -->
<!-- 重新生成請執行：bun run gen:skill-docs -->

# /careful — 破壞性指令安全護欄

安全模式現已 **啟動**。每個 bash 指令在執行前都會檢查是否包含破壞性模式。若偵測到破壞性指令，系統會發出警告，你可以選擇繼續執行或取消。

```bash
mkdir -p ~/.gstack/analytics
echo '{"skill":"careful","ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","repo":"'$(basename "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || echo "unknown")'"}'  >> ~/.gstack/analytics/skill-usage.jsonl 2>/dev/null || true
```

## 受保護項目

| 模式 | 範例 | 風險 |
|---------|---------|------|
| `rm -rf` / `rm -r` / `rm --recursive` | `rm -rf /var/data` | 遞迴刪除 |
| `DROP TABLE` / `DROP DATABASE` | `DROP TABLE users;` | 數據遺失 |
| `TRUNCATE` | `TRUNCATE orders;` | 數據遺失 |
| `git push --force` / `-f` | `git push -f origin main` | 歷史紀錄重寫 |
| `git reset --hard` | `git reset --hard HEAD~3` | 未提交的工作遺失 |
| `git checkout .` / `git restore .` | `git checkout .` | 未提交的工作遺失 |
| `kubectl delete` | `kubectl delete pod` | 生產環境影響 |
| `docker rm -f` / `docker system prune` | `docker system prune -a` | 容器/映像遺失 |

## 安全例外情況

以下模式允許直接執行而無需警告：
- `rm -rf node_modules` / `.next` / `dist` / `__pycache__` / `.cache` / `build` / `.turbo` / `coverage`

## 運作方式

Hook 會從工具輸入的 JSON 中讀取指令，對照上述模式進行檢查，若發現匹配項，則會回傳 `permissionDecision: "ask"` 並附帶警告訊息。你隨時可以覆蓋警告並繼續執行。

若要停用，請結束當前對話或開啟新對話。Hook 的效力僅限於單次會話。
