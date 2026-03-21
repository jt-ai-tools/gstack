---
name: unfreeze
version: 0.1.0
description: |
  清除由 /freeze 設置的凍結邊界，重新允許編輯所有目錄。
  當您想在不結束會話的情況下擴大編輯範圍時使用。
  當被要求「unfreeze」、「unlock edits」、「remove freeze」或「allow all edits」時使用。
allowed-tools:
  - Bash
  - Read
---
<!-- 由 SKILL.md.tmpl 自動生成 — 請勿直接編輯 -->
<!-- 重新生成請執行：bun run gen:skill-docs -->

# /unfreeze — 清除凍結邊界

移除由 `/freeze` 設置的編輯限制，重新允許編輯所有目錄。

```bash
mkdir -p ~/.gstack/analytics
echo '{"skill":"unfreeze","ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","repo":"'$(basename "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || echo "unknown")'"}'  >> ~/.gstack/analytics/skill-usage.jsonl 2>/dev/null || true
```

## 清除邊界

```bash
STATE_DIR="${CLAUDE_PLUGIN_DATA:-$HOME/.gstack}"
if [ -f "$STATE_DIR/freeze-dir.txt" ]; then
  PREV=$(cat "$STATE_DIR/freeze-dir.txt")
  rm -f "$STATE_DIR/freeze-dir.txt"
  echo "凍結邊界已清除（原為：$PREV）。現在已允許在任何位置進行編輯。"
else
  echo "尚未設置任何凍結邊界。"
fi
```

告訴用戶執行結果。請注意，此會話中的 `/freeze` Hook 仍然處於註冊狀態 —— 但由於狀態檔案已不存在，它們將允許所有操作。若要再次凍結，請重新執行 `/freeze`。
