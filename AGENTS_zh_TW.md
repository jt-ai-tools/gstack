# gstack — AI 工程工作流

gstack 是 SKILL.md 檔案的集合，賦予 AI 代理（agents）在軟體開發中結構化的角色。每個技能都是一位專家：CEO 審核員、工程經理、設計師、QA 負責人、發布工程師、除錯專家等等。

## 可用技能

技能位於 `.agents/skills/` 中。透過名稱調用它們（例如 `/office-hours`）。

| 技能 | 它的作用 |
|-------|-------------|
| `/office-hours` | 從這裡開始。在寫代碼前重新定義你的產品想法。 |
| `/plan-ceo-review` | CEO 級別審核：從需求中找出十星級產品。 |
| `/plan-eng-review` | 鎖定架構、資料流、邊際情況以及測試。 |
| `/plan-design-review` | 為每個設計維度評分 0-10，說明 10 分的樣子。 |
| `/design-consultation` | 從頭開始構建完整的設計系統。 |
| `/review` | 交付 PR 前的審核。找出通過 CI 但在生產環境中崩潰的 Bug。 |
| `/debug` | 系統化的根因除錯。沒有調查就沒有修復。 |
| `/design-review` | 設計審計 + 帶有原子化提交的修復循環。 |
| `/qa` | 開啟真實瀏覽器、尋找 Bug、修復它們、重新驗證。 |
| `/qa-only` | 與 /qa 相同，但僅提供報告 —— 不更改代碼。 |
| `/ship` | 執行測試、審核、推送、開啟 PR。一個指令完成。 |
| `/document-release` | 更新所有文件以匹配你剛交付的內容。 |
| `/retro` | 帶有個人細分報告和交付連勝紀錄的每週回顧。 |
| `/browse` | 無頭瀏覽器 —— 真實 Chromium、真實點擊，每個指令約 100 毫秒。 |
| `/setup-browser-cookies` | 從你真實瀏覽器匯入 Cookie，進行需要身份驗證的測試。 |
| `/careful` | 在執行破壞性指令（rm -rf, DROP TABLE, force-push）前發出警告。 |
| `/freeze` | 將編輯鎖定在一個目錄中。硬性阻擋，而不僅僅是警告。 |
| `/guard` | 同時啟動 careful + freeze。 |
| `/unfreeze` | 移除目錄編輯限制。 |
| `/gstack-upgrade` | 將 gstack 更新至最新版本。 |

## 建置指令

```bash
bun install              # 安裝依賴項
bun test                 # 執行測試 (免費，<5 秒)
bun run build            # 生成文件 + 編譯二進位檔
bun run gen:skill-docs   # 從模板重新生成 SKILL.md 檔案
bun run skill:check      # 所有技能的健康度儀表板
```

## 關鍵規範

- SKILL.md 檔案是從 `.tmpl` 模板 **生成** 的。請編輯模板，而非輸出結果。
- 執行 `bun run gen:skill-docs --host codex` 以重新生成 Codex 特定的輸出。
- 瀏覽器二進位檔提供無頭瀏覽器存取。在技能中使用 `$B <command>`。
- 安全技能（careful, freeze, guard）使用內嵌建議文字 —— 在執行破壞性操作前始終要求確認。
