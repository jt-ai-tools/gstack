# 更新日誌 (Changelog)

## [0.9.4.1] - 2026-03-20

### 變更

- **`/retro` 不再對 PR 大小碎碎念。** 回顧功能仍會將 PR 大小分布（小/中/大/超大）作為中性數據報告，但不再將超大 PR 標記為問題或建議拆分。AI 審核不會感到疲勞——工作的單位是「功能」，而不是「差異 (diff)」。

## [0.9.4.0] - 2026-03-20 — 預設開啟 Codex 審核

### 變更

- **Codex 代碼審核現在會在 `/ship` 和 `/review` 中自動執行。** 不再每次都詢問「是否需要第二意見？」——Codex 會預設審核你的代碼（帶有通過/失敗閘門）並執行對抗性挑戰。初次使用的用戶會收到一次性的加入提示；之後便是全自動執行。可透過 `gstack-config set codex_reviews enabled|disabled` 進行配置。
- **所有 Codex 操作均使用最大推理能力。** 審核、對抗與諮詢模式皆使用 `xhigh` 推理強度——當 AI 在審核你的代碼時，你會希望它盡可能地深思熟慮。
- **Codex 審核錯誤不會破壞儀表板。** 驗證失敗、逾時和空回應現在會在記錄結果前被偵測到，因此「審核準備就緒儀表板」絕不會顯示錯誤的「通過」記錄。對抗性模式的標準錯誤 (stderr) 會被單獨擷取。
- **Codex 審核日誌包含提交哈希 (Commit Hash)。** 過時偵測現在可以在 Codex 審核中正確運作，與工程/CEO/設計審核的提交追蹤行為保持一致。

### 修復

- **防止 Codex-for-Codex 遞迴。** 當 gstack 在 Codex CLI (`.agents/skills/`) 內部運行時，Codex 審核步驟會被完全移除——避免意外的無限循環。

## [0.9.3.0] - 2026-03-20 — Windows 支援

### 修復

- **gstack 現在可以在 Windows 11 上運作。** 設置程序在驗證 Playwright 時不再掛起，且瀏覽伺服器會自動退回到 Node.js，以避開 Bun 在 Windows 上的管道處理 Bug ([bun#4253](https://github.com/oven-sh/bun/issues/4253))。只需確保安裝了 Bun 的同時也安裝了 Node.js。macOS 和 Linux 完全不受影響。
- **Windows 路徑處理。** 所有寫死的 `/tmp` 路徑和 Unix 風格的路徑分隔符現在都透過新的 `platform.ts` 模組使用平台感知的等效路徑。路徑遍歷保護在 Windows 反斜槓分隔符下也能正確運作。

### 新增

- **適用於 Node.js 的 Bun API Polyfill。** 當瀏覽伺服器在 Windows 的 Node.js 下運行時，相容層會提供 `Bun.serve()`、`Bun.spawn()`、`Bun.spawnSync()` 和 `Bun.sleep()` 的等效功能。已通過完整測試。
- **Node 伺服器建置腳本。** `browse/scripts/build-node-server.sh` 會為 Node.js 轉譯伺服器、虛構 `bun:sqlite` 並注入 Polyfill —— 這些都在 `bun run build` 期間自動完成。

## [0.9.2.0] - 2026-03-20 — Gemini CLI E2E 測試

### 新增

- **Gemini CLI 現在已通過端到端測試。** 兩個 E2E 測試驗證了當由 Google 的 Gemini CLI (`gemini -p`) 調用時，gstack 技能可以正常運作。`gemini-discover-skill` 測試確認了從 `.agents/skills/` 發現技能的功能，而 `gemini-review-findings` 則透過 gstack-review 執行了完整的代碼審核。兩者都會解析 Gemini 的 stream-json NDJSON 輸出並追蹤 Token 使用量。
- **帶有 10 個單元測試的 Gemini JSONL 解析器。** `parseGeminiJSONL` 處理所有 Gemini 事件類型（init, message, tool_use, tool_result, result），並針對格式錯誤的輸入進行防禦性解析。解析器是一個純函式，可以獨立測試而無需啟動 CLI。
- **`bun run test:gemini`** 和 **`bun run test:gemini:all`** 腳本，用於獨立執行 Gemini E2E 測試。Gemini 測試也包含在 `test:evals` 和 `test:e2e` 匯總腳本中。

## [0.9.1.0] - 2026-03-20 — 對抗性規範審核 + 技能鏈結 (Skill Chaining)

### 新增

- **你的設計文件現在在展示給你之前會先經過壓力測試。** 當你執行 `/office-hours` 時，一個獨立的 AI 審核員會檢查你的設計文件的完整性、一致性、清晰度、範疇蔓延以及可行性 —— 最多執行 3 輪。你會得到一個品質評分 (1-10) 以及被捕捉並修復內容的摘要。你批准的文件已經通過了對抗性審核的考驗。
- **腦力激盪期間的視覺線框圖 (Wireframes)。** 對於 UI 想法，`/office-hours` 現在會使用你的專案設計系統（來自 DESIGN.md）生成一個粗略的 HTML 線框圖並進行截圖。在你還在思考時就能看到你正在設計的東西，而不是在寫完代碼之後。
- **技能現在會互相幫助。** `/plan-ceo-review` 和 `/plan-eng-review` 會偵測你是否能從先執行 `/office-hours` 中獲益並提供建議 —— 點擊一下即可切換，點擊一下即可拒絕。如果你在 CEO 審核期間顯得迷茫，它會溫柔地建議先進行腦力激盪。
- **規範審核指標。** 每次對抗性審核都會將疊代次數、發現/修復的問題以及品質評分記錄到 `~/.gstack/analytics/spec-review.jsonl`。隨著時間推移，你可以看到你的設計文件是否在進步。

## [0.9.0.1] - 2026-03-19

### 變更

- **遙測加入現在預設為「社群模式」。** 初次提示會詢問「幫助 gstack 變得更好！」（社群模式，帶有穩定的裝置 ID 以進行趨勢追蹤）。如果你拒絕，你會獲得第二次選擇「匿名模式」的機會（沒有唯一 ID，只有計數器）。無論哪種方式都尊重你的選擇。

### 修復

- **審核日誌與遙測現在在計劃模式下也能持久化。** 當你在計劃模式下執行 `/plan-ceo-review`、`/plan-eng-review` 或 `/plan-design-review` 時，審核結果並未儲存到磁碟 —— 因此儀表板會顯示過時或缺失的記錄，即使你剛完成審核。同樣的問題也影響了每個技能結束時的遙測記錄。現在兩者在計劃模式下都能可靠運作。

## [0.9.0] - 2026-03-19 — 支援 Codex, Gemini CLI 和 Cursor

**gstack 現在可以在任何支援開放 SKILL.md 標準的 AI 代理上運作。** 安裝一次，即可在 Claude Code、OpenAI Codex CLI、Google Gemini CLI 或 Cursor 中使用。所有 21 個技能都在 `.agents/skills/` 中可用 —— 只需執行 `./setup --host codex` 或 `./setup --host auto`，你的代理就會自動發現它們。

- **一次安裝，四個代理。** Claude Code 從 `.claude/skills/` 讀取，其餘所有代理從 `.agents/skills/` 讀取。相同的技能，相同的提示詞，適配每個主機。基於 Hook 的安全技能（careful, freeze, guard）在非 Claude 主機上會獲得內嵌的安全建議文字而非 Hook —— 它們在任何地方都能運作。
- **自動偵測。** `./setup --host auto` 會偵測你安裝了哪些代理並設置兩者。已經擁有 Claude Code 了？它仍會以完全相同的方式運作。
- **Codex 適配輸出。** Frontmatter 被簡化為僅有名稱 + 描述（Codex 不需要 allowed-tools 或 hooks）。路徑從 `~/.claude/` 重寫為 `~/.codex/`。`/codex` 技能本身被排除在 Codex 輸出之外 —— 它是 `codex exec` 的一個 Claude 封裝，會導致自引用。
- **CI 檢查兩個主機。** 新鮮度檢查現在會獨立驗證 Claude 和 Codex 的輸出。過時的 Codex 文件會像過時的 Claude 文件一樣導致建置失敗。

## [0.8.6] - 2026-03-19

### 新增

- **你現在可以看到你是如何使用 gstack 的。** 執行 `gstack-analytics` 查看個人使用儀表板 —— 你最常使用哪些技能、花費多少時間、你的成功率。所有數據都保留在你的機器本地。
- **選擇性加入的社群遙測。** 在首次執行時，gstack 會詢問你是否願意分享匿名使用數據（技能名稱、持續時間、崩潰資訊 —— 絕不包含代碼或檔案路徑）。選擇「是」，你就是社群脈動的一份子。隨時可透過 `gstack-config set telemetry off` 更改。
- **社群健康儀表板。** 執行 `gstack-community-dashboard` 查看 gstack 社群正在構建什麼 —— 最受歡迎的技能、崩潰叢集、版本分布。全部由 Supabase 提供支援。
- **透過更新檢查追蹤安裝量。** 當啟用遙測時，gstack 在更新檢查期間會向 Supabase 發送並行 Ping —— 讓我們在不增加任何延遲的情況下獲得安裝量統計。尊重你的遙測設置（預設為關閉）。GitHub 仍是主要版本來源。
- **崩潰叢集。** 錯誤在 Supabase 後端會自動按類型和版本進行分組，因此最具影響力的 Bug 會最先浮現。
- **升級漏斗追蹤。** 我們現在可以看到有多少人看到了升級提示與實際升級的對比 —— 這有助於我們發布更好的版本。
- **`/retro` 現在顯示你的 gstack 使用情況。** 每週回顧除了包含提交歷史外，還包含技能使用統計（你使用了哪些技能、頻率、成功率）。
- **會話特定的待處理標記。** 如果技能在執行中途崩潰，下一次調用會正確地僅完成該會話 —— 不再有並發 gstack 會話之間的競態條件。

## [0.8.5] - 2026-03-19

### 修復

- **`/retro` 現在計算完整的日曆日。** 在深夜執行回顧不再會默默錯過當天早些時候的提交。Git 將像 `--since="2026-03-11"` 這樣的日期視為「3 月 11 日晚上 11 點」（如果你在晚上 11 點執行） —— 現在我們傳遞 `--since="2026-03-11T00:00:00"`，所以它總是從午夜開始。對比模式的窗口也獲得了相同的修復。
- **審核日誌不再因包含 `/` 的分支名稱而中斷。** 像 `garrytan/design-system` 這樣的分支名稱會導致審核日誌寫入失敗，因為 Claude Code 將多行 bash 區塊作為單獨的 shell 調用運行，導致在指令之間丟失變數。新的 `gstack-review-log` 和 `gstack-review-read` 原子化助手將整個操作封裝在單個指令中。
- **所有技能模板現在都與平台無關。** 從 `/ship`, `/review`, `/plan-ceo-review` 和 `/plan-eng-review` 中移除了 Rails 特定的模式（`bin/test-lane`, `RAILS_ENV`, `.includes()`, `rescue StandardError` 等）。審核清單現在並排顯示 Rails, Node, Python 和 Django 的範例。
- **`/ship` 讀取 CLAUDE.md 以發現測試指令**，而不是硬編碼 `bin/test-lane` 和 `npm run test`。如果未找到測試指令，它會詢問用戶並將答案持久化到 CLAUDE.md。

### 新增

- 在 CLAUDE.md 中編寫了 **「平台無關設計原則」** —— 技能必須讀取專案配置，絕不硬編碼框架指令。
- 在 CLAUDE.md 中新增了 **`## Testing` 章節**，用於 `/ship` 的測試指令發現。

## [0.8.4] - 2026-03-19

### 新增

- **`/ship` 現在會自動同步你的文件。** 在建立 PR 後，`/ship` 會執行 `/document-release` 作為步驟 8.5 —— README, ARCHITECTURE, CONTRIBUTING 和 CLAUDE.md 無需額外指令即可保持最新。交付後不再有過時的文件。
- **文件中的六個新技能。** README, docs/skills_zh_TW.md 和 BROWSER_zh_TW.md 現在涵蓋了 `/codex`（多 AI 第二意見）、`/careful`（破壞性指令警告）、`/freeze`（目錄範圍編輯鎖定）、`/guard`（全面安全模式）、`/unfreeze` 和 `/gstack-upgrade`。衝刺技能表保留其 15 位專家；新的「強大工具」章節涵蓋了其餘部分。
- **所有地方都記錄了瀏覽器接手。** BROWSER_zh_TW.md 指令表、docs/skills_zh_TW.md 深入探討和 README 「有什麼新功能」都解釋了用於驗證碼/MFA/驗證牆的 `$B handoff` 和 `$B resume`。
- **主動式技能建議了解所有技能。** 根目錄的 SKILL.md.tmpl 現在會在適當的工作流程階段建議 `/codex`, `/careful`, `/freeze`, `/guard`, `/unfreeze` 和 `/gstack-upgrade`。

## [0.8.3] - 2026-03-19

### 新增

- **計劃審核現在會引導你進入下一步。** 在執行 `/plan-ceo-review`, `/plan-eng-review` 或 `/plan-design-review` 後，你會獲得下一步該執行什麼的建議 —— 工程審核總是作為必要的交付門檻被建議，當偵測到 UI 變更時建議設計審核，對於重大產品變更則會溫和地提到 CEO 審核。不再需要你自己記住工作流程。
- **審核知道它們何時過時。** 每次審核現在都會記錄執行時的提交。儀表板會將其與你當前的 HEAD 進行對比，並確切告訴你已經過去了多少次提交 —— 「工程審核可能已過時 — 自審核以來已有 13 次提交」，而不是靠猜測。
- **各處都尊重 `skip_eng_review`。** 如果你全局選擇關閉工程審核，鏈結建議就不會再對此碎念。
- **輕量級設計審核現在也會追蹤提交。** 在 `/review` 和 `/ship` 內部執行的輕量級設計檢查現在獲得了與完整審核相同的過時追蹤。

### 修復

- **瀏覽功能不再導航到危險的 URL。** `goto`, `diff` 和 `newtab` 現在會阻擋 `file://`, `javascript:`, `data:` 方案以及雲端元數據端點 (`169.254.169.254`, `metadata.google.internal`)。對於本地 QA 測試，仍允許使用 Localhost 和私有 IP。（關閉 #17）
- **設置腳本會告訴你缺失了什麼。** 在未安裝 `bun` 的情況下執行 `./setup` 現在會顯示帶有安裝說明的清晰錯誤，而不是晦澀的 「command not found」。（關閉 #147）
- **`/debug` 重命名為 `/investigate`。** Claude Code 有一個內建的 `/debug` 指令，它遮蔽了 gstack 技能。系統化的根因除錯工作流現在位於 `/investigate`。（關閉 #190）
- **移除了 Shell 注入面。** 所有技能模板現在都使用 `source <(gstack-slug)` 而不是 `eval $(gstack-slug)`。行為相同，但不使用 `eval`。（關閉 #133）
- **25 個新的安全性測試。** URL 驗證（16 個測試）和路徑遍歷驗證（14 個測試）現在擁有專用的單元測試套件，涵蓋方案阻擋、元數據 IP 阻擋、目錄逃逸和前綴碰撞邊際情況。

## [0.8.2] - 2026-03-19

### 新增

- **當無頭瀏覽器卡住時，移交給真實的 Chrome。** 遇到驗證碼、驗證牆或 MFA 提示？執行 `$B handoff "理由"`，一個可見的 Chrome 會在完全相同的頁面上開啟，並保留所有 Cookie 和分頁。解決問題後告訴 Claude 你完成了，`$B resume` 就會帶著新鮮的快照從剛才中斷的地方繼續。
- **連續 3 次失敗後自動提示接手。** 如果瀏覽工具連續失敗 3 次，它會建議使用 `handoff` —— 這樣你就不會浪費時間看著 AI 重試驗證碼。
- **為接手功能新增了 15 個測試。** 包含狀態儲存/恢復、失敗追蹤、邊際情況的單元測試，以及涵蓋從無頭到有頭完整流程（包含 Cookie 和分頁保留）的整合測試。

### 變更

- 重構了 `recreateContext()` 以使用共享的 `saveState()`/`restoreState()` 助手 —— 行為相同，代碼更少，為未來的狀態持久化功能做好準備。
- `browser.close()` 現在有 5 秒的逾時，以防止在 macOS 上關閉有頭瀏覽器時掛起。

## [0.8.1] - 2026-03-19

### 修復

- **對於僅限後端的變更，`/qa` 不再拒絕使用瀏覽器。** 以前，如果你的分支僅更改了提示模板、配置檔案或服務邏輯，`/qa` 會分析差異並得出「沒有 UI 可測試」的結論，進而建議執行評估。現在它總是會開啟瀏覽器 —— 當無法從差異中識別出特定頁面時，會退回到快速模式冒煙測試（首頁 + 前 5 個導航目標）。

## [0.8.0] - 2026-03-19 — 多 AI 第二意見

**`/codex` — 從完全不同的 AI 獲取獨立的第二意見。**

三種模式。`/codex review` 針對你的差異執行 OpenAI 的 Codex CLI 並給予通過/失敗閘門 —— 如果 Codex 發現關鍵問題 (`[P1]`)，它就會失敗。`/codex challenge` 進行對抗性挑戰：它會像攻擊者和混亂工程師一樣，嘗試尋找你的代碼在生產環境中可能失敗的方式。`/codex <任何內容>` 開啟一段關於你代碼庫的 Codex 對話，具備會話連續性，因此後續對話能記住背景。

當 `/review` (Claude) 和 `/codex review` (OpenAI) 都執行過後，你會得到一份跨模型分析，顯示哪些發現是重疊的，哪些是每個 AI 獨有的 —— 從而建立何時信任哪個系統的直覺。

**各處整合。** `/review` 結束後，它會提供 Codex 第二意見。在 `/ship` 期間，你可以將 Codex 審核作為推送前的選用閘門執行。在 `/plan-eng-review` 中，Codex 可以在工程審核開始前獨立評論你的計劃。所有 Codex 結果都會顯示在「審核準備就緒儀表板」中。

**此版本還包含：** 主動式技能建議 — gstack 現在會注意到你正處於開發的哪個階段並建議正確的技能。不喜歡嗎？說「stop suggesting」，它就會跨會話記住。

## [0.7.4] - 2026-03-18

### 變更

- **`/qa` 和 `/design-review` 現在會詢問如何處理未提交的變更**，而不是拒絕啟動。當你的工作樹不乾淨時，你會看到一個帶有三個選項的互動式提示：提交變更、暫存 (stash) 它們，或是放棄。不再有晦澀的「ERROR: Working tree is dirty」以及隨之而來的一大堆文字。

## [0.7.3] - 2026-03-18

### 新增

- **一個指令即可開啟安全護欄。** 說「be careful」或「safety mode」，`/careful` 就會在任何破壞性指令（`rm -rf`, `DROP TABLE`, force-push, `kubectl delete` 等）之前向你發出警告。你可以覆蓋每個警告。常見的建置產物清理（`rm -rf node_modules`, `dist`, `.next`）已被列入白名單。
- **使用 `/freeze` 將編輯鎖定到一個資料夾。** 正在除錯某個東西，不希望 Claude 「修復」無關的代碼？`/freeze` 會阻擋你所選目錄之外的所有檔案編輯。這是硬性阻擋，而不僅僅是警告。執行 `/unfreeze` 即可移除限制而無需結束會話。
- **`/guard` 同時啟用兩者。** 當接觸生產或直播系統時，一個指令即可獲得最高安全性 —— 破壞性指令警告加上目錄範圍的編輯限制。
- **`/debug` 現在會自動凍結對正在除錯模組的編輯。** 在形成根因假設後，`/debug` 會將編輯鎖定在受影響的最窄目錄中。除錯期間不再會有對無關代碼的意外「修復」。
- **你現在可以看到你使用了哪些技能以及頻率。** 每次技能調用都會本地記錄到 `~/.gstack/analytics/skill-usage.jsonl`。執行 `bun run analytics` 查看你的熱門技能、各倉庫細分，以及安全 Hook 實際捕捉到內容的頻率。數據保留在你的機器上。
- **每週回顧現在包含技能使用情況。** `/retro` 在你平常的提交分析和指標旁邊顯示你在回顧窗口內使用的技能。

## [0.7.2] - 2026-03-18

### 修復

- `/retro` 日期範圍現在對齊午夜而不是當前時間。在晚上 9 點執行 `/retro` 不再會默默丟掉開始日期當天的早上內容 —— 你會獲得完整的日曆日。
- `/retro` 時間戳現在使用你的本地時區，而不是硬編碼的太平洋時間。美國西岸以外的用戶在直方圖、會話偵測和連勝追蹤中能獲得正確的本地時間。

## [0.7.1] - 2026-03-19

### 新增

- **gstack 現在會在自然的時刻建議技能。** 你不需要記住斜線指令 —— 只要談論你在做什麼即可。正在腦力激盪一個想法？gstack 會建議 `/office-hours`。有東西壞了？它會建議 `/debug`。準備好交付了？它建議 `/ship`。每個工作流技能現在都有主動觸發器，會在合適的時刻觸發。
- **生命週期地圖。** gstack 的根技能描述現在包含一份開發者工作流指南，將 12 個階段（腦力激盪 → 計劃 → 審核 → 代碼 → 除錯 → 測試 → 交付 → 文件 → 回顧）映射到正確的技能。Claude 在每個會話中都能看到這一點。
- **使用自然語言選擇退出。** 如果主動建議感覺太激進，只要說「stop suggesting things」 —— gstack 就會跨會話記住。說「be proactive again」即可重新啟用。
- **11 個旅程階段 E2E 測試。** 每個測試都模擬開發者生命週期中的一個真實時刻，帶有真實的專案背景（plan.md, 錯誤日誌, git 歷史, 代碼），並驗證僅憑自然語言就能觸發正確的技能。11/11 通過。
- **觸發詞驗證。** 靜態測試驗證每個工作流技能都具備 「Use when」 和 「Proactively suggest」 短語 —— 免費捕捉回歸問題。

### 修復

- `/debug` 和 `/office-hours` 以前對自然語言完全不可見 —— 完全沒有觸發詞。現在兩者都有完整的反應式 + 主動式觸發器。

## [0.7.0] - 2026-03-18 — YC Office Hours

**`/office-hours` — 在你寫下一行代碼前，與 YC 合夥人坐下來談談。**

二進位模式。如果你正在構建一家新創公司，你會獲得從 YC 如何評估產品中提煉出的六個強迫性問題：需求現實、現狀、極具針對性的具體細節、最核心的小功能、觀察與驚喜，以及未來契合度。如果你正在開發側邊專案、學習代碼或參加黑客松，你會得到一位充滿熱情的腦力激盪夥伴，協助你找到想法的最酷版本。

兩種模式都會撰寫一份設計文件，直接餵入 `/plan-ceo-review` 和 `/plan-eng-review`。會話結束後，技能會反映它注意到的關於你思考方式的內容 —— 具體的觀察，而不是泛泛的表揚。

**`/debug` — 尋找根因，而非症狀。**

當有東西壞了而你不知道原因時，`/debug` 是你的系統化除錯器。它遵循鐵律：在修復之前必須先進行根因調查。追蹤資料流，匹配已知 Bug 模式（競態條件、nil 傳播、過時快取、配置偏差），並一次測試一個假設。如果 3 次修復都失敗，它會停止並質疑架構，而不是胡亂嘗試。

## [0.6.4.1] - 2026-03-18

### 新增

- **現在可以透過自然語言發現技能。** 所有 12 個之前缺少明確觸發短語的技能現在都有了 —— 說「deploy this」，Claude 就會找到 `/ship`；說「check my diff」，它就會找到 `/review`。遵循 Anthropic 的最佳實踐：「描述欄位不是摘要 —— 它是觸發時機。」

## [0.6.4.0] - 2026-03-17

### 新增

- **`/plan-design-review` 現在是互動式的 — 評分 0-10，修復計劃。** 代理現在不再產出帶有字母等級的報告，而是像 CEO 和工程審核一樣運作：為每個設計維度評分 0-10，解釋 10 分的樣子，然後編輯計劃以達成目標。每個設計選擇一個 AskUserQuestion。產出是一個更好的計劃，而不是一份關於計劃的文件。
- **CEO 審核現在會調用設計師。** 當 `/plan-ceo-review` 偵測到計劃中的 UI 範疇時，它會啟動「設計與 UX」章節（第 11 章），涵蓋資訊架構、互動狀態覆蓋、AI 粗糙風險以及響應式意圖。對於深度的設計工作，它建議 `/plan-design-review`。
- **15 個技能中有 14 個現在具備完整的測試覆蓋率 (E2E + LLM-judge + 驗證)。** 為之前缺少的 10 個技能新增了 LLM-judge 品質評估：ship, retro, qa-only, plan-ceo-review, plan-eng-review, plan-design-review, design-review, design-consultation, document-release, gstack-upgrade。為 gstack-upgrade 新增了真實的 E2E 測試（之前是 `.todo`）。將 design-consultation 新增至指令驗證。
- **Bisect 提交風格。** CLAUDE.md 現在要求每次提交都必須是一個單一的邏輯變更 —— 重命名與重寫分開，測試基礎架構與測試實作分開。

### 變更

- `/qa-design-review` 重命名為 `/design-review` —— 現在 `/plan-design-review` 是計劃模式，「qa-」前綴會引起混淆。已在所有 22 個檔案中更新。

## [0.6.3.0] - 2026-03-17

### 新增

- **涉及前端代碼的每個 PR 現在都會自動獲得設計審核。** `/review` 和 `/ship` 會針對變更的 CSS, HTML, JSX 和視圖檔案應用一份包含 20 個項目的設計清單。捕捉 AI 粗糙模式（紫色漸層、3 欄圖示網格、泛泛的英雄文案）、排版問題（正文 < 16px、黑名單字體）、無障礙缺口 (`outline: none`) 以及濫用 `!important`。機械式的 CSS 修復會自動套用；設計判斷則會先詢問你。
- **`gstack-diff-scope` 分類你分支中的變更。** 執行 `source <(gstack-diff-scope main)` 即可獲得 `SCOPE_FRONTEND=true/false`, `SCOPE_BACKEND`, `SCOPE_PROMPTS`, `SCOPE_TESTS`, `SCOPE_DOCS`, `SCOPE_CONFIG`。設計審核利用它在僅限後端的 PR 上靜默跳過。交付預檢利用它在接觸前端檔案時建議設計審核。
- **設計審核顯示在「審核準備就緒儀表板」中。** 儀表板現在區分「LITE」（代碼級別，在 /review 和 /ship 中自動執行）和 「FULL」（透過帶有瀏覽器二進位檔的 /plan-design-review 進行視覺審計）。兩者都顯示為「設計審核」記錄。
- **用於設計審核偵測的 E2E 評估。** 植入了帶有 7 個已知反模式（Papyrus 字體、14px 正文、`outline: none`, `!important`, 紫色漸層、泛泛英雄文案、3 欄功能網格）的 CSS/HTML 測試用例。評估驗證 `/review` 至少捕捉到 7 個中的 4 個。

## [0.6.2.0] - 2026-03-17

### 新增

- **計劃審核現在思考方式如同世界頂尖高手。** `/plan-ceo-review` 應用了來自 Bezos（單向門, Day 1 代理懷疑論）、Grove（偏執掃描）、Munger（反轉思考）、Horowitz（戰時意識）、Chesky/Graham（創辦人模式）以及 Altman（槓桿痴迷）的 14 種認知模式。`/plan-eng-review` 應用了來自 Larson（團隊狀態診斷）、McKinley（預設乏味）、Brooks（本質與偶然複雜性）、Beck（讓變更變得容易）、Majors（在生產環境中擁有你的代碼）以及 Google SRE（錯誤預算）的 15 種模式。`/plan-design-review` 應用了來自 Rams（預設減法）、Norman（時間視界設計）、Zhuo（有原則的品味）、Gebbia（為信任而設計, 故事板化旅程）以及 Ive（關懷是可見的）的 12 種模式。
- **潛在空間激活，而非清單。** 認知模式點名了框架與人物，使 LLM 能汲取關於他們實際思考方式的深層知識。指令是「內化這些，不要列舉它們」 —— 讓每次審核都成為真正的視角轉變，而不是一份更長的清單。

## [0.6.1.0] - 2026-03-17

### 新增

- **E2E 和 LLM-judge 測試現在僅執行你變更的部分。** 每個測試都聲明它依賴於哪些源檔案。當你執行 `bun run test:e2e` 時，它會檢查你的差異並跳過依賴項未被觸及的測試。僅更改 `/retro` 的分支現在執行 2 個測試而非 31 個。使用 `bun run test:e2e:all` 強制執行所有測試。
- **`bun run eval:select` 預覽將執行哪些測試。** 在花費 API 額度前，確切查看你的差異觸發了哪些測試。支援用於腳本編寫的 `--json` 以及用於覆蓋基準分支的 `--base <branch>`。
- **完整性護欄捕捉被遺忘的測試記錄。** 一個免費的單元測試驗證了 E2E 和 LLM-judge 測試檔案中的每個 `testName` 在 TOUCHFILES 映射中都有對應的記錄。沒有記錄的新測試會立即導致 `bun test` 失敗 —— 不再有默認始終執行導致的退化。

### 變更

- `test:evals` 和 `test:e2e` 現在根據差異自動選擇（之前是全有或全無）
- 新增了 `test:evals:all` 和 `test:e2e:all` 腳本，用於明確的全量執行

## 0.6.1 — 2026-03-17 — 沸騰湖水 (Boil the Lake)

現在每個 gstack 技能都遵循 **「完整性原則」 (Completeness Principle)**：當 AI 使邊際成本接近於零時，始終建議完整的實作。不再因為選項 B 是 90% 的價值而選擇它，而選項 A 只需要多寫 70 行代碼。

閱讀該理念：https://garryslist.org/posts/boil-the-ocean

- **完整性評分**：每個 AskUserQuestion 選項現在都顯示完整性評分 (1-10)，偏向於完整的解決方案
- **雙重時間估算**：工作量估算同時顯示「人類團隊」與 「CC+gstack」 的時間（例如，「人類：~2 週 / CC：~1 小時」），並附帶任務類型壓縮參考表
- **反模式範例**：導言中新增了具體的「不要這樣做」圖庫，使原則不再抽象
- **初次引導**：新用戶會看到一次性的介紹，連結到該文章，並提供在瀏覽器中開啟的選項
- **審核完整性缺口**：`/review` 現在會標記那些完整版本成本 < 30 分鐘 CC 時間的捷徑實作
- **湖水評分 (Lake Score)**：CEO 和工程審核完成摘要顯示有多少建議選擇了完整方案與捷徑的對比
- **CEO + 工程審核雙重時間**：時間性詢問、工作量估算以及驚喜機會均同時顯示人類與 CC 的時間尺度

## 0.6.0.1 — 2026-03-17

- **`/gstack-upgrade` 現在會自動捕捉過時的本地副本。** 如果你的全局 gstack 是最新的，但專案中的本地副本落後了，`/gstack-upgrade` 會偵測到不匹配並同步它。不再需要手動詢問「我們是否使用了本地副本？」 —— 它會直接告訴你並提供更新建議。
- **升級同步更加安全。** 如果在同步本地副本時 `./setup` 失敗，gstack 會從備份中恢復先前的版本，而不是留下一個損壞的安裝。

### 給貢獻者

- `gstack-upgrade/SKILL.md.tmpl` 中的獨立使用章節現在引用了步驟 2 和 4.5 (DRY)，而不是重複偵測/同步 bash 區塊。新增了一個新的版本對比 bash 區塊。
- 獨立模式下的更新檢查回退現在匹配導言模式（全局路徑 → 本地路徑 → `|| true`）。

## 0.6.0 — 2026-03-17

- **100% 測試覆蓋率是實現優秀 Vibe Coding 的關鍵。** 當你的專案沒有測試框架時，gstack 現在會從頭開始引導建立。偵測你的運行環境、研究最佳框架、請你選擇、安裝它、為你的實際代碼撰寫 3-5 個真實測試、設置 CI/CD (GitHub Actions)、建立 TESTING.md，並將測試文化指令新增至 CLAUDE.md。之後的每個 Claude Code 會話都會自然地撰寫測試。
- **每個 Bug 修復現在都會獲得一個回歸測試。** 當 `/qa` 修復一個 Bug 並進行驗證後，步驟 8e.5 會自動生成一個回歸測試，捕捉出錯的確切情境。測試包含追溯到 QA 報告的完整歸因。自動遞增的檔案名稱可防止跨會話的衝突。
- **充滿信心地交付 — 覆蓋率審核顯示哪些已測試，哪些未測試。** `/ship` 步驟 3.4 從你的差異中構建代碼路徑地圖、搜尋對應的測試，並產出帶有品質星級的 ASCII 覆蓋率圖表（★★★ = 邊際情況 + 錯誤, ★★ = 正常路徑, ★ = 冒煙測試）。缺口會自動生成測試。PR 主體顯示「測試：42 → 47 (+5 個新測試)」。
- **你的回顧會追蹤測試健康度。** `/retro` 現在顯示總測試檔案、此期間新增的測試、回歸測試提交以及趨勢變化。如果測試比例低於 20%，它會將其標記為成長領域。
- **設計審核也會生成回歸測試。** `/design-review` 步驟 8e.5 會跳過僅限 CSS 的修復（那些透過重新執行設計審計來捕捉），但會針對 JavaScript 行為變更（如損壞的下拉選單或動畫失敗）撰寫測試。

### 給貢獻者

- 在 `gen-skill-docs.ts` 中新增了 `generateTestBootstrap()` 解析器（約 155 行）。在 RESOLVERS 映射中註冊為 `{{TEST_BOOTSTRAP}}`。插入到 qa, ship (步驟 2.5) 和 design-review 模板中。
- 在 `qa/SKILL.md.tmpl` 中新增了步驟 8e.5 回歸測試生成（46 行），並在 `design-review/SKILL.md.tmpl` 中新增了 CSS 感知的變體（12 行）。修正了規則 13 以允許建立新的測試檔案。
- 在 `ship/SKILL.md.tmpl` 中新增了步驟 3.4 測試覆蓋率審核（88 行），包含品質評分標準和 ASCII 圖表格式。
- 在 `retro/SKILL.md.tmpl` 中新增了測試健康追蹤：3 個新的數據收集指令、指標列、敘述章節、JSON schema 欄位。
- 當偵測不到測試框架時，`qa-only/SKILL.md.tmpl` 會獲得建議筆記。
- `qa-report-template.md` 增加了帶有延遲測試規範的「回歸測試」章節。
- [ARCHITECTURE_zh_TW.md](ARCHITECTURE_zh_TW.md) 佔位符表已更新 `{{TEST_BOOTSTRAP}}` 和 `{{REVIEW_DASHBOARD}}`。
- 為 qa, ship, design-review 增加了 WebSearch 到允許工具中。
- 26 個新的驗證測試，2 個新的 E2E 評估（引導 + 覆蓋率審核）。
- 2 個新的 P3 TODO：適用於非 GitHub 供應商的 CI/CD、自動升級弱測試。

## 0.5.4 — 2026-03-17

- **工程審核現在始終是完整審核。** `/plan-eng-review` 不再要求你在「大變更」和「小變更」模式之間做出選擇。每個計劃都會獲得完整的互動式引導（架構、代碼品質、測試、效能）。僅當複雜性檢查實際觸發時才會建議縮減範疇 —— 而不是作為一個常設選單選項。
- **一旦你回答過，交付功能就不再詢問關於審核的問題。** 當 `/ship` 詢問缺失的審核而你選擇「無論如何都交付」或「不相關」時，該決定會為該分支儲存。下次針對預發布修復重新執行 `/ship` 時，不再會被重複詢問。

### 給貢獻者

- 從 `plan-eng-review/SKILL.md.tmpl` 中移除了 SMALL_CHANGE / BIG_CHANGE / SCOPE_REDUCTION 選項。範疇縮減現在是主動式的（由複雜性檢查觸發），而非選單項目。
- 為 `ship/SKILL.md.tmpl` 增加了審核門檻覆蓋持久化 —— 將 `ship-review-override` 記錄寫入 `$BRANCH-reviews.jsonl`，以便隨後的 `/ship` 執行跳過該門檻。
- 更新了 2 個 E2E 測試提示以匹配新流程。

## 0.5.3 — 2026-03-17

- **即使在大膽夢想時，你也能掌控全局。** `/plan-ceo-review` 現在將每個範疇擴張展示為你選擇加入的個人決策。EXPANSION 模式會熱情推薦，但你對每個想法說「是」或「否」。不再有「代理失控並新增了 5 個我沒要求的的功能」這種情況。
- **新模式：SELECTIVE EXPANSION。** 將當前範疇作為基準，但看看還有什麼可能。代理會逐一呈現擴張機會並給予中性建議 —— 你挑選值得做的那些。非常適合疊代現有功能，在這種情況下你既需要嚴謹，又希望受到鄰近改進的誘惑。
- **你的 CEO 審核願景會被儲存，而不會丟失。** 擴張想法、挑選決定以及 10 倍願景現在作為結構化的設計文件持久化到 `~/.gstack/projects/{repo}/ceo-plans/`。過時的計劃會自動封檔。如果一個願景非常出色，你可以將其提升到倉庫中的 `docs/designs/` 供團隊參閱。

- **更聰明的交付門檻。** 當 CEO 和設計審核不相關時，`/ship` 不再會對此碎念。工程審核是唯一的必要門檻（你甚至可以透過 `gstack-config set skip_eng_review true` 停用它）。對於重大產品變更建議進行 CEO 審核；對於 UI 工作建議進行設計審核。儀表板仍顯示所有三項 —— 它只是不會為了選用項目而阻擋你。

### 給貢獻者

- 為 `plan-ceo-review/SKILL.md.tmpl` 增加了 SELECTIVE EXPANSION 模式，包含挑選儀式、中性建議姿態以及 HOLD SCOPE 基準。
- 重寫了 EXPANSION 模式的步驟 0D 以包含選擇加入儀式 —— 將願景提煉為離散的提案，每個提案都以 AskUserQuestion 形式呈現。
- 增加了 CEO 計劃持久化 (0D-POST 步驟)：帶有 YAML frontmatter (`status: ACTIVE/ARCHIVED/PROMOTED`) 的結構化 markdown、範疇決策表、封檔流程。
- 在審核日誌後增加了 `docs/designs` 提升步驟。
- 模式快速參考表擴展至 4 欄。
- 審核準備就緒儀表板：工程審核為必填（可透過 `skip_eng_review` 配置覆蓋），CEO/設計審核為選填，由代理判斷。
- 新測試：CEO 審核模式驗證（4 種模式、持久化、提升）、SELECTIVE EXPANSION E2E 測試。

## 0.5.2 — 2026-03-17

- **你的設計顧問現在會採取創意冒險。** `/design-consultation` 不僅僅建議一個安全、協調的系統 —— 它明確地將其分解為「安全選擇」（類別基準）與「冒險」（你的產品突出的地方）。你挑選要打破哪些規則。每個冒險都附帶了為什麼它有效以及成本是多少的理由。
- **在選擇前先查看市場景觀。** 當你選擇加入研究時，代理會瀏覽你領域中的真實網站，並進行截圖和輔助功能樹分析 —— 而不僅僅是網頁搜尋結果。在做出設計決策前，你會看到目前市面上已有的產品。
- **看起來像你產品的預覽頁面。** 預覽頁面現在會渲染真實的產品模型 —— 帶有側邊導航和數據表的儀表板、帶有英雄章節的營銷頁面、帶有表單的設置頁面 —— 而不僅僅是字體樣板和調色盤。

## 0.5.1 — 2026-03-17
- **在交付前了解你的處境。** 每次 `/plan-ceo-review`, `/plan-eng-review` 和 `/plan-design-review` 現在都會將其結果記錄到一個審核追蹤器中。在每次審核結束時，你會看到一個 **「審核準備就緒儀表板」 (Review Readiness Dashboard)**，顯示哪些審核已完成、何時執行以及是否通過 —— 並給出明確的「准予交付」或「尚未就緒」裁決。
- **`/ship` 在建立 PR 前會檢查你的審核。** 預檢現在會讀取儀表板，並在缺少審核時詢問你是否要繼續。僅供參考 —— 它不會阻擋你，但你會知道你跳過了什麼。
- **少了一件需要複製貼上的事。** SLUG 計算（那個用於從 git remote 計算 `owner-repo` 的晦澀 sed 管道）現在是一個共享的 `bin/gstack-slug` 助手。模板中所有 14 個內聯副本都被替換為 `source <(gstack-slug)`。如果格式發生變化，只需修改一次。
- **QA 和瀏覽會話期間現在可以看到截圖。** 當 gstack 進行截圖時，它們現在會在你的輸出中顯示為可點擊的圖像元素 —— 不再是你看不見的隱形 `/tmp/browse-screenshot.png` 路徑。適用於 `/qa`, `/qa-only`, `/plan-design-review`, `/design-review`, `/browse` 和 `/gstack`。

### 給貢獻者

- 在 `gen-skill-docs.ts` 中新增了 `{{REVIEW_DASHBOARD}}` 解析器 —— 共享的儀表板讀取器被注入到 4 個模板中（3 個審核技能 + ship）。
- 新增了帶有單元測試的 `bin/gstack-slug` 助手（5 行 bash）。輸出 `SLUG=` 和 `BRANCH=` 行，將 `/` 消毒為 `-`。
- 新的 TODO：智慧審核相關性偵測 (P3)、用於審核門檻 PR 合併的 `/merge` 技能 (P2)。

## 0.5.0 — 2026-03-16

- **你的網站剛完成了一次設計審核。** `/plan-design-review` 開啟你的網站並像資深產品設計師一樣進行審核 —— 排版、間距、層級、顏色、響應式、互動以及 AI 粗糙感偵測。獲得每個類別的字母等級 (A-F)、雙重標題「設計評分」+「AI 粗糙評分」以及結構化且直言不諱的第一印象。
- **它也能修復所發現的問題。** `/design-review` 執行相同的設計師視角審核，然後透過原子化的 `style(design):` 提交以及修復前後截圖，疊代式地修復源代碼中的設計問題。預設為 CSS 安全，並帶有一個專門為樣式變更調整的更嚴格自我監管啟發式方法。
- **了解你實際的設計系統。** 這兩項技能都透過 JS 擷取你直播網站的字體、顏色、標題比例和間距模式 —— 然後提供將推論出的系統儲存為 `DESIGN.md` 基準的選項。終於知道你實際使用了多少種字體了。
- **AI 粗糙感偵測是一個標題指標。** 每份報告都以兩個分數開頭：設計評分和 AI 粗糙評分。AI 粗糙清單捕捉了 10 個最容易辨識的 AI 生成模式 —— 3 欄功能網格、紫色漸層、裝飾性泡泡、表情符號項目符號、泛泛的英雄文案。
- **設計回歸追蹤。** 報告會寫入一個 `design-baseline.json`。下次執行會自動對比：各類別等級變化、新發現、已解決發現。看著你的設計評分隨時間提升。
- **跨 10 個類別的 80 項設計審計清單**：視覺層級、排版、顏色/對比、間距/佈局、互動狀態、響應式、動態、內容/微文案、AI 粗糙感以及效能即設計。提煉自 Vercel 的 100 多條規則、Anthropic 的前端設計技能以及其他 6 個設計框架。

### 給貢獻者

- 在 `gen-skill-docs.ts` 中新增了 `{{DESIGN_METHODOLOGY}}` 解析器 —— 共享的設計審計方法論被注入到 `/plan-design-review` 和 `/design-review` 模板中，遵循 `{{QA_METHODOLOGY}}` 模式。
- 增加了 `~/.gstack-dev/plans/` 作為本地計劃目錄，用於存放長線願景文件（不提交）。更新了 CLAUDE.md 和 [TODOS_zh_TW.md](TODOS_zh_TW.md)。
- 在 [TODOS_zh_TW.md](TODOS_zh_TW.md) 中增加了 `/setup-design-md` (P2)，用於從頭開始互動式建立 DESIGN.md。

## 0.4.5 — 2026-03-16

- **審核發現現在會被實際修復，而不僅僅是列出。** `/review` 和 `/ship` 以前會列印資訊性的發現（死代碼、測試缺口、N+1 查詢）然後就不管了。現在每個發現都有對應的操作：明顯的機械式修復會自動執行，而真正模糊的問題會被批次處理成一個單獨的問題，而不是 8 個分開的提示。對於每個自動修復，你會看到 `[自動修復] 檔案:行 問題 → 執行了什麼`。
- **你控制「直接修復」與「先問我」之間的界線。** 死代碼、過時註釋、N+1 查詢會被自動修復。安全性問題、競態條件、設計決策則會浮現供你裁決。分類位於一個地方 ([review/checklist_zh_TW.md](review/checklist_zh_TW.md))，因此 `/review` 和 `/ship` 都能保持同步。

### 修復

- **`$B js "const x = await fetch(...); return x.status"` 現在可以運作了。** `js` 指令以前將所有內容都封裝為表達式 —— 因此 `const`、分號和多行代碼都會出錯。它現在偵測語句並使用區塊封裝，就像 `eval` 已經做的那樣。
- **點擊下拉選單選項不再永遠掛起。** 如果代理在快照中看到 `@e3 [選項] "管理員"` 並執行 `click @e3`，gstack 現在會自動選擇該選項，而不是掛起在一個不可能的 Playwright 點擊上。正確的事情就這樣發生了。
- **當點擊是錯誤的工具時，gstack 會告訴你。** 以前透過 CSS 選擇器點擊 `<option>` 會因為晦澀的 Playwright 錯誤而逾時。現在你會得到：`「對於下拉選單選項，請使用 'browse select' 而非 'click'。」`

### 給貢獻者

- Gate Classification → Severity Classification 重命名（嚴重程度決定呈現順序，而非你是否會看到提示）。
- 在 `review/checklist.md` 中增加了「優先修復啟發式」 (Fix-First Heuristic) 章節 —— 權威的「自動修復 vs 詢問」分類。
- 新的驗證測試：`優先修復啟發式存在於清單中，並被 review + ship 引用`。
- 在 `read-commands.ts` 中提取了 `needsBlockWrapper()` 和 `wrapForEvaluate()` 助手 —— 由 `js` 和 `eval` 指令共享 (DRY)。
- 在 `BrowserManager` 中增加了 `getRefRole()` —— 為引用選擇器公開 ARIA 角色，而不更改 `resolveRef` 回傳類型。
- 點擊處理程序透過父級 `<select>` 自動將 `[role=option]` 引用路由到 `selectOption()`，並帶有 DOM `tagName` 檢查以避免阻擋自定義 listbox 組件。
- 6 個新測試：多行 js、分號、語句關鍵字、簡單表達式、選項自動路由、CSS 選項錯誤指引。

## 0.4.4 — 2026-03-16

- **新版本偵測時間縮短至一小時內，而非半天。** 更新檢查快取之前設置為 12 小時，這意味著當新版本發布時，你可能會整天困在舊版本上。現在「你已是最新版本」的過期時間為 60 分鐘，因此你在一小時內就能看到升級。「有可用升級」仍會持續提醒 12 小時（這就是重點）。
- **`/gstack-upgrade` 總是執行真實檢查。** 直接執行 `/gstack-upgrade` 現在會繞過快取，對 GitHub 執行新鮮檢查。不再有明明有新版本卻顯示「你已是最新版本」的情況。

### 給貢獻者

- 拆分了 `last-update-check` 快取 TTL：`UP_TO_DATE` 為 60 分鐘，`UPGRADE_AVAILABLE` 為 720 分鐘。
- 為 `bin/gstack-update-check` 增加了 `--force` 標誌（在檢查前刪除快取檔案）。
- 3 個新測試：`--force` 破解 UP_TO_DATE 快取、`--force` 破解 UPGRADE_AVAILABLE 快取、帶有 `utimesSync` 的 60 分鐘 TTL 邊界測試。

## 0.4.3 — 2026-03-16

- **新的 `/document-release` 技能。** 在 `/ship` 之後但在合併之前執行它 —— 它會讀取專案中的每個文件檔案，交叉比對差異，並更新 README, ARCHITECTURE, CONTRIBUTING, CHANGELOG 和 [TODOS_zh_TW.md](TODOS_zh_TW.md) 以匹配你實際交付的內容。風險變更會作為問題浮現；其餘一切均為自動執行。
- **每次提問現在都清晰無比。** 以前你需要啟動 3 個以上的會話，gstack 才會給你完整的背景資訊和淺顯易懂的解釋。現在每個提問 —— 即使在單個會話中 —— 都會告訴你專案、分支以及正在發生的事情，解釋得簡單到足以在切換背景時理解。不再有「抱歉，請解釋得更簡單一點」。
- **分支名稱始終正確。** gstack 現在在執行時偵測你當前的分支，而不是依賴對話開始時的快照。中途切換分支？gstack 能跟上。

### 給貢獻者

- 將 ELI16 規則合併到基礎 AskUserQuestion 格式中 —— 一種格式而非兩種，沒有 `_SESSIONS >= 3` 條件。
- 在導言 bash 區塊中增加了 `_BRANCH` 偵測（帶有回退方案的 `git branch --show-current`）。
- 增加了針對分支偵測與簡化規則的回歸防護測試。

## 0.4.2 — 2026-03-16

- **`$B js "await fetch(...)"` 現在可以直接運作。** `$B js` 或 `$B eval` 中的任何 `await` 表達式都會自動封裝在非同步上下文中。不再有 `SyntaxError: await is only valid in async functions`。單行 eval 檔案直接回傳值；多行檔案使用明確的 `return`。
- **貢獻者模式現在是反映式，而不僅僅是反應式。** 貢獻者模式現在不只是在出錯時提交報告，還會提示定期反映：「給你的 gstack 體驗打 0-10 分。不是 10 分？想想為什麼。」捕捉被動偵測遺漏的品質生活問題與摩擦。報告現在包含 0-10 評分與「什麼能讓它達到 10 分」，以專注於可操作的改進。
- **技能現在尊重你的分支目標。** `/ship`, `/review`, `/qa` 和 `/plan-ceo-review` 偵測你的 PR 實際鎖定的分支，而非假設為 `main`。堆疊式分支 (Stacked branches)、鎖定功能分支的 Conductor 工作空間以及使用 `master` 的倉庫現在都能正常運作。
- **`/retro` 適用於任何預設分支。** 使用 `master`, `develop` 或其他預設分支名稱的倉庫會被自動偵測 —— 不再因為分支名稱錯誤而導致回顧空白。
- **給技能作者的新 `{{BASE_BRANCH_DETECT}}` 佔位符** —— 將其放入任何模板，即可免費獲得 3 步驟的分支偵測（PR 基準 → 倉庫預設 → 回退方案）。
- **3 個新的 E2E 冒煙測試** 驗證了跨 ship, review 和 retro 技能的基準分支偵測能端到端運作。

### 給貢獻者

- 增加了帶有註釋去除功能的 `hasAwait()` 助手，以避免在 eval 檔案中對 `// await` 的誤判。
- 智慧 eval 封裝：單行 → 表達式 `(...)`，多行 → 帶有明確 `return` 的區塊 `{...}`。
- 6 個新的非同步封裝單元測試，40 個新的貢獻者模式導言驗證測試。
- 校準範例被框架化為歷史性的（「曾經失敗」），以避免暗示修復後仍存在 Bug。
- 在 CLAUDE.md 中增加了「編寫 SKILL 模板」章節 —— 自然語言優於 bash 語法、動態分支偵測、自包含代碼區塊的規則。
- 硬編碼 main 的回歸測試會掃描所有 `.tmpl` 檔案，查找帶有硬編碼 `main` 的 git 指令。
- 清理了 QA 模板：移除了 `REPORT_DIR` shell 變數，將連接埠偵測簡化為文字描述。
- gstack-upgrade 模板：bash 區塊之間變數引用的明確跨步驟敘述。

## 0.4.1 — 2026-03-16

- **gstack 現在會注意到它何時搞砸了。** 開啟貢獻者模式 (`gstack-config set gstack_contributor true`)，gstack 會自動寫下出了什麼問題 —— 你在做什麼、什麼壞了、重現步驟。下次有什麼惹惱你時，Bug 報告已經寫好了。Fork gstack 並親自修復它。
- **同時處理多個會話？gstack 能跟上。** 當你開啟了 3 個以上的 gstack 窗口時，每個提問現在都會告訴你哪個專案、哪個分支以及你正在處理什麼。不再看著問題想「等等，這是哪個窗口？」。
- **每個提問現在都附帶建議。** gstack 不再是把選項丟給你讓你思考，而是告訴你它會選什麼以及為什麼。每項技能都採用相同的清晰格式。
- **`/review` 現在會捕捉被遺忘的列舉 (Enum) 處理程序。** 增加了一個新的狀態、層級或類型常量？/review 會追蹤它在代碼庫中的每個 switch 語句、允許列表和過濾器 —— 而不僅僅是你更改的檔案。在交付前捕捉「增加了值但忘記處理它」這類 Bug。

### 給貢獻者

- 在所有 11 個技能模板中將 `{{UPDATE_CHECK}}` 重命名為 `{{PREAMBLE}}` —— 一個啟動區塊現在處理更新檢查、會話追蹤、貢獻者模式和提問格式。
- 對 plan-ceo-review 和 plan-eng-review 的提問格式進行了 DRY 處理，以引用導言基準而非重複規則。
- 在 CLAUDE.md 中增加了更新日誌風格指南與本地副本符號連結意識文件。

## 0.4.0 — 2026-03-16

### 新增
- **QA-only 技能** (`/qa-only`) — 僅報告的 QA 模式，用於發現並記錄 Bug 而不進行修復。將乾淨的 Bug 報告交給你的團隊，代理不會碰你的代碼。
- **QA 修復循環** — `/qa` 現在執行「發現-修復-驗證」循環：發現 Bug、修復它們、提交、重新導航以確認修復生效。一個指令即可從損壞到交付。
- **從計劃到 QA 的產物流程** — `/plan-eng-review` 撰寫測試計劃產物，`/qa` 會自動接手。你的工程審核現在直接餵入 QA 測試，無需手動複製貼上。
- **`{{QA_METHODOLOGY}}` DRY 佔位符** — 共享的 QA 方法論區塊被注入到 `/qa` 和 `/qa-only` 模板中。當你更新測試標準時，能保持這兩項技能同步。
- **評估效率指標** — 在所有評估介面中顯示回合數、持續時間和成本，並附帶自然語言的 **「要點」 (Takeaway)** 評論。一眼看出你的提示詞更改是讓代理變快還是變慢了。
- **`generateCommentary()` 引擎** — 為你解讀對比差異：標記回歸、註明改進並產出整體的效率摘要。
- **評估清單欄位** — `bun run eval:list` 現在顯示每次執行的回合數和持續時間。立即發現昂貴或緩慢的執行。
- **評估摘要單項測試效率** — `bun run eval:summary` 顯示各次執行中每個測試的平均回合數/持續時間/成本。辨識出哪些測試隨著時間推移花費你最多。
- **`judgePassed()` 單元測試** — 提取並測試了通過/失敗判斷邏輯。
- **3 個新的 E2E 測試** — qa-only 無修復護欄、帶有提交驗證的 qa 修復循環、plan-eng-review 測試計劃產物。
- **瀏覽器引用過時偵測** — `resolveRef()` 現在檢查元素數量，以偵測頁面變動後的過時引用。SPA 導航不再導致對缺失元素的 30 秒逾時。
- 針對引用過時的 3 個新快照測試。

### 變更
- QA 技能提示重構為明確的雙循環工作流程（發現 → 修復 → 驗證）。
- `formatComparison()` 現在在成本旁邊顯示每個測試的回合數與持續時間差異。
- `printSummary()` 顯示回合數與持續時間欄位。
- `eval-store.test.ts` 修復了預先存在的 `_partial` 檔案斷言 Bug。

### 修復
- 瀏覽器引用過時 — 現在會偵測並重新收集頁面變動（如 SPA 導航）前收集的引用。消除了動態網站上一類不穩定的 QA 失敗。

## 0.3.9 — 2026-03-15

### 新增
- **`bin/gstack-config` CLI** — 適用於 `~/.gstack/config.yaml` 的簡單 get/set/list 介面。由更新檢查和升級技能用於持久設置（auto_upgrade, update_check）。
- **智慧更新檢查** — 12 小時快取 TTL（之前為 24 小時）、當用戶拒絕升級時的指數級推遲（24 小時 → 48 小時 → 1 週）、`update_check: false` 配置選項以完全停用檢查。當新版本發布時推遲會重置。
- **自動升級模式** — 在配置中設置 `auto_upgrade: true` 或設置 `GSTACK_AUTO_UPGRADE=1` 環境變數，即可跳過升級提示並自動更新。
- **4 選項升級提示** — 「是的，現在升級」、「始終保持最新」、「現在不要」（推遲）、「不再詢問」（停用）。
- **本地副本同步** — `/gstack-upgrade` 現在會在升級主安裝後偵測並更新當前專案中的本地副本。
- 25 個新測試：11 個針對 gstack-config CLI，14 個針對更新檢查中的推遲/配置路徑。

### 變更
- README 的升級/故障排除章節簡化為引用 `/gstack-upgrade`，而不是冗長的貼上指令。
- 升級技能模板提升至 v1.1.0，帶有用於配置編輯的 `Write` 工具權限。
- 所有 SKILL.md 導言都更新了新的升級流程說明。

## 0.3.8 — 2026-03-14

### 新增
- **將 [TODOS_zh_TW.md](TODOS_zh_TW.md) 作為單一事實來源** — 將 `TODO.md`（路線圖）和 `TODOS.md`（近期任務）合併為一個檔案，按技能/組件組織，具有 P0-P4 優先級排序以及「已完成」章節。
- **`/ship` 步驟 5.5：[TODOS_zh_TW.md](TODOS_zh_TW.md) 管理** — 從差異中自動偵測已完成項目，使用版本註釋將其標記為已完成，如果缺失或無結構則提供建立/重組 [TODOS_zh_TW.md](TODOS_zh_TW.md) 的功能。
- **跨技能 TODOS 意識** — `/plan-ceo-review`, `/plan-eng-review`, `/retro`, `/review` 和 `/qa` 現在讀取 [TODOS_zh_TW.md](TODOS_zh_TW.md) 以獲取專案背景。`/retro` 增加了「待辦清單健康度」指標（未完成計數, P0/P1 項目, 流動率）。
- **共享的 `review/TODOS-format.md`** — `/ship` 和 `/plan-ceo-review` 引用的規範 TODO 項目格式，以防止格式偏差 (DRY)。
- **Greptile 2 級回覆系統** — 第 1 級（友好，內聯差異 + 解釋）用於首次回應；當 Greptile 在先前已回覆後再次標記時，執行第 2 級（堅定，完整證據鏈 + 重新排序請求）。
- **Greptile 回覆模板** — `greptile-triage.md` 中針對修復（內聯差異）、已修復（執行了什麼）和誤判（證據 + 建議重新排序）的結構化模板。取代了模糊的一行回覆。
- **Greptile 升級偵測** — 明確的算法，用於偵測評論串中先前的 GStack 回覆並自動升級至第 2 級。
- **Greptile 嚴重程度重新排序** — 當 Greptile 錯誤歸類問題嚴重程度時，回覆中包含 `**建議重新排序：**`。
- 針對跨技能的 `TODOS-format.md` 引用進行了靜態驗證測試。

### 修復
- **默默吞掉 `.gitignore` 追加失敗** — 將 `ensureStateDir()` 裸 `catch {}` 替換為僅限 ENOENT 的靜默；非 ENOENT 錯誤（EACCES, ENOSPC）記錄到 `.gstack/browse-server.log`。

### 變更
- 刪除了 `TODO.md` —— 所有項目已合併至 [TODOS_zh_TW.md](TODOS_zh_TW.md)。
- `/ship` 步驟 3.75 和 `/review` 步驟 5 現在引用了來自 `greptile-triage.md` 的回覆模板與升級偵測。
- `/ship` 步驟 6 的提交順序在最後的提交中包含 [TODOS_zh_TW.md](TODOS_zh_TW.md) 以及 VERSION + CHANGELOG。
- `/ship` 步驟 8 的 PR 主體包含 TODOS 章節。

## 0.3.7 — 2026-03-14

### 新增
- **元素/區域裁剪截圖** — `screenshot` 指令現在支援透過 CSS 選擇器或 @ref 進行元素裁剪（`screenshot "#hero" out.png`, `screenshot @e3 out.png`）、區域裁剪（`screenshot --clip x,y,w,h out.png`）以及僅限視窗模式（`screenshot --viewport out.png`）。使用 Playwright 原生的 `locator.screenshot()` 和 `page.screenshot({ clip })`。全頁仍為預設設置。
- 涵蓋所有截圖模式（視窗、CSS, @ref, 裁剪）和錯誤路徑（未知旗標、互斥規則、無效座標、路徑驗證、不存在的選擇器）的 10 個新測試。

## 0.3.6 — 2026-03-14

### 新增
- **E2E 觀測能力** — 心跳檔案 (`~/.gstack-dev/e2e-live.json`)、每次執行的日誌目錄 (`~/.gstack-dev/e2e-runs/{runId}/`)、progress.log、每個測試的 NDJSON 轉錄、持久性失敗轉錄。所有 I/O 均為非致命。
- **`bun run eval:watch`** — 每 1 秒讀取心跳 + 局部評估檔案的實時終端儀表板。顯示已完成的測試、帶有回合/工具資訊的當前測試、逾時偵測 (>10 分鐘)、用於 progress.log 的 `--tail`。
- **增量評估儲存** — `savePartial()` 在每個測試完成後寫入 `_partial-e2e.json`。具備崩潰恢復能力：局部結果在執行被殺掉時仍能倖存。絕不清理。
- **機器可讀的診斷** — 評估 JSON 中的 `exit_reason`, `timeout_at_turn`, `last_tool_call` 欄位。支持用於自動修復循環的 `jq` 查詢。
- **API 連接預檢** — E2E 套件在燒掉測試預算前對 ConnectionRefused 立即拋出錯誤。
- **`is_error` 偵測** — `claude -p` 可能在 API 失敗時回傳 `subtype: "success"` 但 `is_error: true`。現在正確歸類為 `error_api`。
- **stream-json NDJSON 解析器** — 用於從 `claude -p --output-format stream-json --verbose` 獲取實時 E2E 進度的 `parseNDJSON()` 純函式。
- **評估持久化** — 結果儲存在 `~/.gstack-dev/evals/` 中，並與先前的執行自動對比。
- **評估 CLI 工具** — 用於檢查評估歷史的 `eval:list`, `eval:compare`, `eval:summary`。
- **所有 9 個技能已轉換為 `.tmpl` 模板** — plan-ceo-review, plan-eng-review, retro, review, ship 現在使用 `{{UPDATE_CHECK}}` 佔位符。更新檢查導言的單一事實來源。
- **3 層評估套件** — 第 1 層：靜態驗證（免費），第 2 層：透過 `claude -p` 進行 E2E（約 $3.85/次），第 3 層：LLM 作為裁判（約 $0.15/次）。受 `EVALS=1` 控制。
- **植入 Bug 的結果測試** — 帶有已知 Bug 的評估測試用例，由 LLM 裁判對偵測結果評分。
- 15 個觀測能力單元測試，涵蓋心跳 schema, progress.log 格式, NDJSON 命名, savePartial, finalize, 監看器渲染, 逾時偵測, 非致命 I/O。
- plan-ceo-review, plan-eng-review, retro 技能的 E2E 測試。
- 更新檢查退出碼的回歸測試。
- `test/helpers/skill-parser.ts` — 用於 git remote 偵測的 `getRemoteSlug()`。

### 修復
- **對於代理而言，瀏覽器二進位檔發現功能損壞** — 在 SKILL.md 設置區塊中，將 `find-browse` 間接尋址替換為明確的 `browse/dist/browse` 路徑。
- **更新檢查退出碼 1 誤導代理** — 增加了 `|| true` 以防止在沒有可用更新時產生非零退出。
- **browse/SKILL.md 缺失設置區塊** — 增加了 `{{BROWSE_SETUP}}` 佔位符。
- **plan-ceo-review 逾時** — 在測試目錄中初始化 git 倉庫，跳過代碼庫探索，將逾時提升至 420 秒。
- 植入 Bug 評估可靠性 —— 簡化了提示詞、降低了偵測基準、對 max_turns 波動具備韌性。

### 變更
- **擴展了模板系統** — `gen-skill-docs.ts` 中的 `{{UPDATE_CHECK}}` 和 `{{BROWSE_SETUP}}` 佔位符。所有使用瀏覽功能的技能均從單一事實來源生成。
- 強化了 14 個指令描述，包含特定的參數格式、有效值、錯誤行為和回傳類型。
- 設置區塊優先檢查工作空間本地路徑（用於開發），回退至全域安裝。
- LLM 評估裁判從 Haiku 升級為 Sonnet 4.6。
- `generateHelpText()` 從 COMMAND_DESCRIPTIONS 自動生成（取代手動維護的幫助文字）。

## 0.3.3 — 2026-03-13

### 新增
- **SKILL.md 模板系統** — 帶有 `{{COMMAND_REFERENCE}}` 和 `{{SNAPSHOT_FLAGS}}` 佔位符的 `.tmpl` 檔案，在建置時從源代碼自動生成。從結構上防止文件與代碼之間的指令偏差。
- **指令註冊表** (`browse/src/commands.ts`) — 所有瀏覽指令的單一事實來源，帶有分類和強化描述。零副作用，可安全地從建置腳本和測試中匯入。
- **快照旗標元數據** (`browse/src/snapshot.ts` 中的 `SNAPSHOT_FLAGS` 數組) —— 元數據驅動的解析器取代了手寫的 switch/case。在一處增加旗標即可更新解析器、文件和測試。
- **第 1 層靜態驗證** — 43 個測試：解析來自 SKILL.md 代碼區塊的 `$B` 指令，對照指令註冊表和快照旗標元數據進行驗證
- **第 2 層 E2E 測試** 透過 Agent SDK —— 啟動真實的 Claude 會話，執行技能，掃描瀏覽錯誤。受 `SKILL_E2E=1` 環境變數控制（約 $0.50/次）
- **第 3 層 LLM 作為裁判評估** — Haiku 針對生成的文件的清晰度/完整性/可操作性進行評分（閾值 ≥4/5），加上對照手動維護基準的衰退測試。受 `ANTHROPIC_API_KEY` 控制
- **`bun run skill:check`** — 顯示所有技能、指令計數、驗證狀態、模板新鮮度的健康儀表板
- **`bun run dev:skill`** — 監看模式，在每次模板或源檔案變更時重新生成並驗證 SKILL.md
- **CI 工作流** (`.github/workflows/skill-docs.yml`) —— 在推送/PR 時執行 `gen:skill-docs`，如果生成的輸出與提交的檔案不同則報錯
- 用於手動重新生成的 `bun run gen:skill-docs` 腳本
- 用於 LLM 作為裁判評估的 `bun run test:eval`
- `test/helpers/skill-parser.ts` — 從 Markdown 中擷取並驗證 `$B` 指令
- `test/helpers/session-runner.ts` — 帶有錯誤模式掃描和轉錄儲存功能的 Agent SDK 封裝
- **ARCHITECTURE_zh_TW.md** — 涵蓋守護進程模式、安全性、引用系統、日誌、崩潰恢復的設計決策文件
- **Conductor 整合** (`conductor.json`) — 工作空間設置/拆卸的生命週期 Hook
- **`.env` 傳播** — `bin/dev-setup` 自動將 `.env` 從主工作樹複製到 Conductor 工作空間中
- 用於 API 金鑰配置的 `.env.example` 模板

### 變更
- 建置現在於編譯二進位檔前執行 `gen:skill-docs`
- `parseSnapshotArgs` 是元數據驅動的（遍歷 `SNAPSHOT_FLAGS` 而非 switch/case）
- `server.ts` 從 `commands.ts` 匯入指令集而非內聯聲明
- SKILL.md 和 browse/SKILL.md 現在是生成檔案（請修改 `.tmpl` 替代）

## 0.3.2 — 2026-03-13

### 修復
- Cookie 匯入選擇器現在回傳 JSON 而非 HTML —— `jsonResponse()` 引用的 `url` 超出範圍，導致每次 API 調用崩潰
- `help` 指令路由正確（之前由於 META_COMMANDS 調度順序問題而無法觸及）
- 全域安裝的過時伺服器不再遮蔽本地變更 —— 從 `resolveServerScript()` 中移除了舊有的 `~/.claude/skills/gstack` 回退方案
- 崩潰日誌路徑引用從 `/tmp/` 更新至 `.gstack/`

### 新增
- **差異感知的 QA 模式** — 功能分支上的 `/qa` 會自動分析 `git diff`、識別受影響的頁面/路由、偵測 localhost 上運行的應用程式並僅測試變更的部分。無需 URL。
- **專案本地瀏覽狀態** — 狀態檔案、日誌和所有伺服器狀態現在都位於專案根目錄下的 `.gstack/`（透過 `git rev-parse --show-toplevel` 偵測）。不再有 `/tmp` 狀態檔案。
- **共享配置模組** (`browse/src/config.ts`) — 集中 CLI 和伺服器的路徑解析，消除了重複的連接埠/狀態邏輯
- **隨機連接埠選擇** — 伺服器選擇 10000-60000 之間的隨機連接埠，而非掃描 9400-9409。不再有 `CONDUCTOR_PORT` 魔法偏移量。不再有跨工作空間的連接埠衝突。
- **二進位檔版本追蹤** — 狀態檔案包含 `binaryVersion` SHA；CLI 在二進位檔重新建置時自動重啟伺服器
- **舊有 /tmp 清理** — CLI 掃描並移除舊的 `/tmp/browse-server*.json` 檔案，並在發送訊號前驗證 PID 所有權
- **Greptile 整合** — `/review` 和 `/ship` 獲取並分類 Greptile 機器人評論；`/retro` 追蹤各週的 Greptile 打擊率
- **本地開發模式** — `bin/dev-setup` 將倉庫中的技能符號連結以進行原位開發；`bin/dev-teardown` 恢復全域安裝
- `help` 指令 — 代理可以自我發現所有指令和快照旗標
- 帶有 META 訊號協定的版本感知 `find-browse` — 偵測過時的二進位檔並提示代理更新
- `browse/dist/find-browse` 編譯後的二進位檔，帶有與 origin/main 的 git SHA 對比（4 小時快取）
- 建置時寫入的 `.version` 檔案，用於二進位檔版本追蹤
- 針對 Cookie 選擇器（13 個測試）和 find-browse 版本檢查（10 個測試）的路由級測試
- 配置解析測試（14 個測試），涵蓋 git 根目錄偵測、BROWSE_STATE_FILE 覆蓋、ensureStateDir、readVersionHash、resolveServerScript 以及版本不匹配偵測
- CLAUDE.md 中的瀏覽器互動指引 —— 防止 Claude 使用 mcp\_\_claude-in-chrome\_\_\* 工具
- CONTRIBUTING_zh_TW.md，包含快速入門、開發模式說明以及在其他倉庫測試分支的指令

### 變更
- 狀態檔案位置：`.gstack/browse.json`（之前為 `/tmp/browse-server.json`）
- 日誌檔案位置：`.gstack/browse-{console,network,dialog}.log`（之前為 `/tmp/browse-*.log`）
- 原子化狀態檔案寫入：`.json.tmp` → 重命名（防止部分讀取）
- CLI 將 `BROWSE_STATE_FILE` 傳遞給啟動的伺服器（伺服器從中派生出所有路徑）
- SKILL.md 設置區塊檢查解析 META 訊號並處理 `META:UPDATE_AVAILABLE`
- `/qa` SKILL.md 現在描述了四種模式（差異感知、完整、快速、回歸），其中差異感知為功能分支上的預設模式
- `jsonResponse`/`errorResponse` 使用選項對象，以防止位置參數混淆
- 建置腳本編譯 `browse` 和 `find-browse` 二進位檔，清理 `.bun-build` 暫存檔案
- README 更新了 Greptile 設置說明、差異感知 QA 範例以及修訂後的演示轉錄

### 移除
- `CONDUCTOR_PORT` 魔法偏移量 (`browse_port = CONDUCTOR_PORT - 45600`)
- 連接埠掃描範圍 9400-9409
- 舊有的 `~/.claude/skills/gstack/browse/src/server.ts` 回退方案
- `DEVELOPING_GSTACK.md`（已更名為 [CONTRIBUTING_zh_TW.md](CONTRIBUTING_zh_TW.md)）

## 0.3.1 — 2026-03-12

### 第 3.5 階段：瀏覽器 Cookie 匯入

- `cookie-import-browser` 指令 — 從真實的 Chromium 瀏覽器（Comet, Chrome, Arc, Brave, Edge）解密並匯入 Cookie
- 瀏覽伺服器提供的互動式 Cookie 選擇器 Web UI（深色主題、雙面板佈局、域名搜尋、匯入/移除）
- 針對非互動式用途的帶有 `--domain` 旗標的直接 CLI 匯入
- 用於 Claude Code 整合的 `/setup-browser-cookies` 技能
- 帶有非同步 10 秒逾時的 macOS 金鑰圈存取（不阻塞事件循環）
- 各瀏覽器的 AES 金鑰快取（每個會話每個瀏覽器一次金鑰圈提示）
- DB 鎖定回退方案：將鎖定的 Cookie DB 複製到 /tmp 以進行安全讀取
- 18 個帶有加密 Cookie 測試用例的單元測試

## 0.3.0 — 2026-03-12

### 第 3 階段：/qa 技能 — 系統化 QA 測試

- 新的 `/qa` 技能，帶有 6 個階段的工作流程（初始化、驗證、引導、探索、記錄、總結）
- 三種模式：完整（系統化，5-10 個問題）、快速（30 秒冒煙測試）、回歸（對照基準對比）
- 問題分類法：7 個類別、4 個嚴重程度級別、每頁探索清單
- 結構化的報告模板，帶有健康評分（0-100，在 7 個類別中加權計算）
- 針對 Next.js, Rails, WordPress 和 SPA 的框架偵測指引
- `browse/bin/find-browse` — 使用 `git rev-parse --show-toplevel` 進行 DRY 二進位檔發現

### 第 2 階段：增強版瀏覽器

- 對話框處理：自動接受/駁回、對話框緩衝區、提示文字支援
- 檔案上傳：`upload <sel> <file1> [file2...]`
- 元素狀態檢查：`is visible|hidden|enabled|disabled|checked|editable|focused <sel>`
- 帶有引用標籤覆蓋的標註截圖 (`snapshot -a`)
- 對照前一次快照的快照差異對比 (`snapshot -D`)
- 針對非 ARIA 可點擊元素的游標互動式元素掃描 (`snapshot -C`)
- `wait --networkidle` / `--load` / `--domcontentloaded` 旗標
- `console --errors` 過濾器（僅限錯誤 + 警告）
- 帶有從頁面 URL 自動填入域名功能的 `cookie-import <json-file>`
- 用於控制台/網絡/對話框緩衝區的 CircularBuffer O(1) 環形緩衝區
- 使用 Bun.write() 進行非同步緩衝區排清
- 帶有 page.evaluate + 2 秒逾時的健康檢查
- Playwright 錯誤封裝 —— 為 AI 代理提供可操作的訊息
- 上下文重建保留 Cookie/存儲/URL (useragent 修復)
- SKILL.md 被重寫為帶有 10 個工作流程模式的 QA 導向手冊
- 166 個整合測試（之前為 ~63 個）

## 0.0.2 — 2026-03-12

- 修復專案本地 `/browse` 安裝 —— 編譯後的二進位檔現在從其自身目錄解析 `server.ts`，而非假設存在全域安裝
- `setup` 會重新建置過時的二進位檔（而不僅僅是缺失的二進位檔），並在建置失敗時以非零狀態退出
- 修復 `chain` 指令吞掉寫入指令真實錯誤的問題（例如導航逾時被報告為「未知元指令」）
- 修復 CLI 在伺服器針對相同指令重複崩潰時產生的無限制重啟循環
- 將控制台/網絡緩衝區限制在 50k 條記錄（環形緩衝區），而非無限制增長
- 修復緩衝區達到 50k 上限後磁碟排清默然停止的問題
- 在設置中使用 `ln -snf` 以避免在升級時建立巢狀符號連結
- 使用 `git fetch && git reset --hard` 而非 `git pull` 進行升級（處理強制推送）
- 簡化安裝：優先全域安裝，帶有選配的專案副本（取代子模組方法）
- 重構 README：英雄視覺、修復前後對比、演示轉錄、故障排除章節
- 六個技能（增加了 `/retro`）

## 0.0.1 — 2026-03-11

初始版本。

- 五個技能：`/plan-ceo-review`, `/plan-eng-review`, `/review`, `/ship`, `/browse`
- 帶有 40 多個指令、基於引用的互動、持久化 Chromium 守護進程的無頭瀏覽器 CLI
- 作為 Claude Code 技能的一鍵安裝（子模組或全域複製）
- 用於二進位檔編譯與技能符號連結的 `setup` 腳本
