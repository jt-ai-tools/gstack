---
name: guard
version: 0.1.0
description: |
  全方位安全模式：破壞性指令警告 + 目錄範圍編輯限制。結合了 /careful（在 rm -rf, DROP TABLE, 
  force-push 等指令前發出警告）與 /freeze（阻擋特定目錄以外的編輯）。
  當接觸生產環境或除錯直播系統時，用於最大化安全性。
  當被要求「guard mode」、「full safety」、「lock it down」或「maximum safety」時使用。
allowed-tools:
  - Bash
  - Read
  - AskUserQuestion
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "bash ${CLAUDE_SKILL_DIR}/../careful/bin/check-careful.sh"
          statusMessage: "正在檢查是否包含破壞性指令..."
    - matcher: "Edit"
      hooks:
        - type: command
          command: "bash ${CLAUDE_SKILL_DIR}/../freeze/bin/check-freeze.sh"
          statusMessage: "正在檢查凍結邊界..."
    - matcher: "Write"
      hooks:
        - type: command
          command: "bash ${CLAUDE_SKILL_DIR}/../freeze/bin/check-freeze.sh"
          statusMessage: "正在檢查凍結邊界..."
---
<!-- 由 SKILL.md.tmpl 自動生成 — 請勿直接編輯 -->
<!-- 重新生成請執行：bun run gen:skill-docs -->

# /guard — 全方位安全模式

同時啟動破壞性指令警告與目錄範圍的編輯限制。這是將 `/careful` 與 `/freeze` 結合在單一指令中的功能。

**依賴項說明**：此技能引用了相鄰目錄 `/careful` 與 `/freeze` 下的 Hook 腳本。這兩者必須都已安裝（gstack 的設置腳本會一併安裝它們）。

```bash
mkdir -p ~/.gstack/analytics
echo '{"skill":"guard","ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","repo":"'$(basename "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || echo "unknown")'"}'  >> ~/.gstack/analytics/skill-usage.jsonl 2>/dev/null || true
```

## 設置

詢問用戶要將編輯限制在哪个目錄。使用 AskUserQuestion：

- 問題：「安全模式：編輯應限制在哪个目錄？破壞性指令警告將始終開啟。所選路徑以外的檔案將被禁止編輯。」
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

告訴用戶：
- 「**全方位安全模式已啟動。** 目前有兩項保護機制正在運行：」
- 「1. **破壞性指令警告** — rm -rf, DROP TABLE, force-push 等指令在執行前會發出警告（您可以選擇覆蓋）」
- 「2. **編輯邊界** — 檔案編輯已限制在 `<路徑>/`。此目錄以外的編輯將被阻擋。」
- 「若要移除編輯邊界，請執行 `/unfreeze`。若要停用所有機制，請結束會話。」

## 受保護項目

關於破壞性指令模式的完整清單與安全例外，請參閱 `/careful_zh_TW.md`。
關於編輯邊界強制的運作方式，請參閱 `/freeze_zh_TW.md`。
