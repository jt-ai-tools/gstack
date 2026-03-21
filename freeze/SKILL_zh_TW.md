---
name: freeze
version: 0.1.0
description: |
  在當前會話中將檔案編輯限制在特定目錄。阻擋許可路徑以外的 Edit 與 Write 操作。
  用於除錯時防止意外「修復」無關代碼，或當您想將更改範圍縮小到單一模組時。
  當被要求「freeze」、「restrict edits」、「only edit this folder」或「lock down edits」時使用。
allowed-tools:
  - Bash
  - Read
  - AskUserQuestion
hooks:
  PreToolUse:
    - matcher: "Edit"
      hooks:
        - type: command
          command: "bash ${CLAUDE_SKILL_DIR}/bin/check-freeze.sh"
          statusMessage: "正在檢查凍結邊界..."
    - matcher: "Write"
      hooks:
        - type: command
          command: "bash ${CLAUDE_SKILL_DIR}/bin/check-freeze.sh"
          statusMessage: "正在檢查凍結邊界..."
---
<!-- 由 SKILL.md.tmpl 自動生成 — 請勿直接編輯 -->
<!-- 重新生成請執行：bun run gen:skill-docs -->

# /freeze — 將編輯限制在目錄中

將檔案編輯鎖定在特定目錄。任何針對許可路徑以外檔案的 Edit 或 Write 操作都將被 **阻擋**（而不僅僅是警告）。

```bash
mkdir -p ~/.gstack/analytics
echo '{"skill":"freeze","ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","repo":"'$(basename "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || echo "unknown")'"}'  >> ~/.gstack/analytics/skill-usage.jsonl 2>/dev/null || true
```

## 設置

詢問用戶要將編輯限制在哪个目錄。使用 AskUserQuestion：

- 問題：「我應該將編輯限制在哪个目錄？此路徑以外的檔案將被禁止編輯。」
- 文字輸入（非多選） — 用戶輸入路徑。

一旦用戶提供了目錄路徑：

1. 解析為絕對路徑：
```bash
FREEZE_DIR=$(cd "<用戶提供的路徑>" 2>/dev/null && pwd)
echo "$FREEZE_DIR"
```

2. 確保結尾有斜槓並儲存至凍結狀態檔案：
```bash
FREEZE_DIR="${FREEZE_DIR%/}/"
STATE_DIR="${CLAUDE_PLUGIN_DATA:-$HOME/.gstack}"
mkdir -p "$STATE_DIR"
echo "$FREEZE_DIR" > "$STATE_DIR/freeze-dir.txt"
echo "已設置凍結邊界：$FREEZE_DIR"
```

告訴用戶：「編輯現已限制在 `<路徑>/`。任何在此目錄以外的 Edit 或 Write 操作都將被阻擋。若要變更邊界，請再次執行 `/freeze`。若要移除限制，請執行 `/unfreeze` 或結束會話。」

## 運作方式

Hook 會從 Edit/Write 工具輸入的 JSON 中讀取 `file_path`，然後檢查該路徑是否以凍結目錄開頭。若否，則回傳 `permissionDecision: "deny"` 以阻擋該操作。

凍結邊界會透過狀態檔案在當前會話中持續生效。Hook 腳本在每次調用 Edit/Write 時都會讀取該檔案。

## 注意事項

- 凍結目錄結尾的 `/` 可防止 `/src` 匹配到 `/src-old`
- 凍結僅適用於 Edit 與 Write 工具 — Read, Bash, Glob, Grep 不受影響
- 這是為了防止意外編輯，而非安全邊界 — 像 `sed` 這樣的 Bash 指令仍可修改邊界外的檔案
- 若要停用，請執行 `/unfreeze` 或結束對話
