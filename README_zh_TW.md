# gstack

嗨，我是 [Garry Tan](https://x.com/garrytan)。我是 [Y Combinator](https://www.ycombinator.com/) 的總裁兼執行長。在 YC，我曾與數千家新創公司合作，包括 Coinbase、Instacart 和 Rippling，當時創辦人還只是在車庫裡的一兩個人——而這些公司現在價值數百億美元。在加入 YC 之前，我設計了 Palantir 的標誌，並且是那裡最早的工程經理/產品經理/設計師之一。我共同創立了 Posterous，一個我們後來賣給了 Twitter 的部落格平台。我在 2013 年建立了 YC 的內部社交網絡 Bookface。長期以來，我一直以設計師、產品經理和工程經理的身份在打造產品。

而現在，我正處於一個感覺像是全新時代的正中央。

在過去的 60 天裡，我寫了 **超過 60 萬行生產環境代碼** —— 其中 35% 是測試 —— 並且在我履行 YC 執行長職責的同時，我每天還能作為兼職工作完成 **10,000 到 20,000 行可用的代碼**。這不是筆誤。我最近一次針對 3 個專案的 `/retro`（過去 7 天的開發統計）：**新增了 140,751 行，362 次提交，淨 LOC 約 11.5 萬**。模型每週都在大幅進步。我們正處於某種真實事物的黎明——一個人就能以過去需要二十人團隊的規模進行交付。

**2026 年 — 已有 1,237 次貢獻且持續增加中：**

![GitHub 貢獻 2026 — 1,237 次貢獻，1-3 月大幅加速](docs/images/github-2026.png)

**2013 年 — 當我在 YC 建立 Bookface 時（772 次貢獻）：**

![GitHub 貢獻 2013 — 建立 YC Bookface 時的 772 次貢獻](docs/images/github-2013.png)

同樣的人。不同的時代。差別在於工具。

**gstack 就是我的秘訣。** 它是我的開源軟體工廠。它將 Claude Code 變成一支你實際管理的虛擬工程團隊——一位重新思考產品的執行長、一位鎖定架構的工程經理、一位捕捉 AI 粗糙之處的設計師、一位發現生產環境 Bug 的偏執審核員、一位開啟真實瀏覽器並點擊應用程式的 QA 負責人，以及一位交付 PR 的發布工程師。十五位專家和六個強大工具，全部作為斜線指令、全部使用 Markdown、**全部免費、MIT 授權，現在即可使用。**

我正在學習如何觸及 2026 年 3 月代理系統（agentic systems）所能達到的極限，這是我正在進行的實驗。我分享它，是因為我想讓全世界都與我一起踏上這段旅程。

Fork 它。改進它。讓它成為你的。不要嫉妒，要懂得欣賞（Don't player hate, appreciate）。

**這是為誰設計的：**
- **創辦人與執行長** — 特別是那些仍想親手開發的技術型創辦人。這就是你如何像二十人的團隊一樣進行開發。
- **初次使用 Claude Code 的用戶** — gstack 是最好的開始方式。結構化的角色，而不是空白的提示詞。
- **技術主管與資深工程師 (Staff Engineers)** — 為每個 PR 帶來嚴格的審查、QA 和自動化發布。

## 快速開始：你的前 10 分鐘

1. 安裝 gstack（30 秒 — 見下文）
2. 執行 `/office-hours` — 描述你正在構建的東西。它會在你在寫下一行代碼之前重新定義問題。
3. 對任何功能想法執行 `/plan-ceo-review`
4. 對任何有變動的分支執行 `/review`
5. 對你的預覽環境 (staging) URL 執行 `/qa`
6. 就到這裡。你會知道這是否適合你。

在任何已經設置好測試的倉庫中，預計 5 分鐘內就能完成第一次有用的運行。

**如果你只讀一個章節，請讀這一個。**

## 安裝 — 僅需 30 秒

**系統需求：** [Claude Code](https://docs.anthropic.com/en/docs/claude-code), [Git](https://git-scm.com/), [Bun](https://bun.sh/) v1.0+, [Node.js](https://nodejs.org/) (僅 Windows 需要)

### 步驟 1：安裝到你的機器上

開啟 Claude Code 並貼上這段文字。Claude 會處理剩下的部分。

> Install gstack: run **`git clone https://github.com/garrytan/gstack.git ~/.claude/skills/gstack && cd ~/.claude/skills/gstack && ./setup`** then add a "gstack" section to CLAUDE.md that says to use the /browse skill from gstack for all web browsing, never use mcp\_\_claude-in-chrome\_\_\* tools, and lists the available skills: /office-hours, /plan-ceo-review, /plan-eng-review, /plan-design-review, /design-consultation, /review, /ship, /browse, /qa, /qa-only, /design-review, /setup-browser-cookies, /retro, /investigate, /document-release, /codex, /careful, /freeze, /guard, /unfreeze, /gstack-upgrade. Then ask the user if they also want to add gstack to the current project so teammates get it.

### 步驟 2：添加到你的倉庫，讓隊友也能使用（選用）

> Add gstack to this project: run **`cp -Rf ~/.claude/skills/gstack .claude/skills/gstack && rm -rf .claude/skills/gstack/.git && cd .claude/skills/gstack && ./setup`** then add a "gstack" section to this project's CLAUDE.md that says to use the /browse skill from gstack for all web browsing, never use mcp\_\_claude-in-chrome\_\_\* tools, lists the available skills: /office-hours, /plan-ceo-review, /plan-eng-review, /plan-design-review, /design-consultation, /review, /ship, /browse, /qa, /qa-only, /design-review, /setup-browser-cookies, /retro, /investigate, /document-release, /codex, /careful, /freeze, /guard, /unfreeze, /gstack-upgrade, and tells Claude that if gstack skills aren't working, run `cd .claude/skills/gstack && ./setup` to build the binary and register skills.

實際檔案會提交到你的倉庫（不是 submodule），所以 `git clone` 即可直接運作。所有內容都存在於 `.claude/` 內部。不會觸動你的 PATH 或在背景運行。

### Codex, Gemini CLI, 或 Cursor

gstack 可以在任何支援 [SKILL.md 標準](https://github.com/anthropics/claude-code) 的代理上運作。技能位於 `.agents/skills/` 中並會被自動發現。

```bash
git clone https://github.com/garrytan/gstack.git ~/.codex/skills/gstack
cd ~/.codex/skills/gstack && ./setup --host codex
```

或者讓 setup 自動偵測你安裝了哪些代理：

```bash
git clone https://github.com/garrytan/gstack.git ~/gstack
cd ~/gstack && ./setup --host auto
```

這會根據可用的代理安裝到 `~/.claude/skills/gstack` 和/或 `~/.codex/skills/gstack`。所有 21 個技能都可以在所有支援的代理上運作。基於 Hook 的安全技能（careful, freeze, guard）在非 Claude 主機上會使用內嵌的安全建議文字。

## 查看運作情況

```
你：    我想為我的日曆建立一個每日簡報應用程式。
你：    /office-hours
Claude：[詢問痛點 — 具體例子，而非假設]

你：    多個 Google 日曆，活動資訊過時，地點錯誤。
        準備工作花費太長時間，且結果不夠好...

Claude：我要反對這個定義。你說的是「每日簡報
        應用程式」，但你實際描述的是一個個人
        幕僚長 (Chief of Staff) AI。
        [提取了 5 個你沒意識到自己正在描述的能力]
        [挑戰了 4 個前提 — 你同意、反對或調整]
        [生成了 3 種實作方案及工作量估算]
        建議：明天先交付最核心的小功能 (narrowest wedge)，從
        實際使用中學習。完整願景是一個為期 3 個月的專案 — 先從
        真正有用的每日簡報開始。
        [撰寫設計文件 → 自動餵入後續技能]

你：    /plan-ceo-review
        [讀取設計文件，挑戰範疇，執行 10 個章節的審查]

你：    /plan-eng-review
        [資料流、狀態機、錯誤路徑的 ASCII 圖表]
        [測試矩陣、失敗模式、安全性考量]

你：    批准計劃。退出計劃模式。
        [跨 11 個檔案撰寫 2,400 行代碼。約 8 分鐘。]

你：    /review
        [自動修復] 2 個問題。[詢問] 競態條件 → 你批准修復。

你：    /qa https://staging.myapp.com
        [開啟真實瀏覽器，點擊流程，發現並修復一個 Bug]

你：    /ship
        測試：42 → 51 (+9 個新測試)。PR: github.com/you/app/pull/42
```

你說的是「每日簡報應用程式」，代理卻說「你正在構建一個幕僚長 AI」——因為它傾聽的是你的痛點，而不是你的功能需求。接著它挑戰了你的前提，生成了三種方案，推薦了最核心的小功能，並撰寫了一份供所有後續技能使用的設計文件。八個指令。這不是一個副駕駛 (Copilot)。這是一支團隊。

## 衝刺 (The Sprint)

gstack 是一個流程，而不是工具的集合。技能的排序方式與衝刺運行的順序一致：

**思考 → 計劃 → 構建 → 審查 → 測試 → 交付 → 反思**

每個技能都為下一個技能提供養分。`/office-hours` 撰寫的設計文件由 `/plan-ceo-review` 讀取。`/plan-eng-review` 撰寫的測試計劃由 `/qa` 接手。`/review` 捕捉到的 Bug 由 `/ship` 驗證已修復。沒有任何細節會被遺漏，因為每一步都清楚前一步發生了什麼。

一次衝刺、一個人、一個功能 —— 使用 gstack 大約需要 30 分鐘。但這裡有一個改變一切的關鍵：你可以並行執行 10-15 個這樣的衝刺。不同的功能、不同的分支、不同的代理 —— 同時進行。這就是我如何在履行日常工作職責的同時，每天交付超過 10,000 行生產環境代碼的秘訣。

| 技能 | 你的專家 | 他們做什麼 |
|-------|----------------|--------------|
| `/office-hours` | **YC Office Hours** | 從這裡開始。六個強迫性問題，在寫代碼前重新定義產品。反對你的定義，挑戰前提，生成替代實作方案。設計文件會餵入所有後續技能。 |
| `/plan-ceo-review` | **CEO / 創辦人** | 重新思考問題。找出隱藏在需求中的十星級產品。四種模式：擴張、選擇性擴張、維持範疇、縮減。 |
| `/plan-eng-review` | **工程經理** | 鎖定架構、資料流、圖表、邊際情況和測試。強迫隱藏的假設浮出水面。 |
| `/plan-design-review` | **資深設計師** | 為每個設計維度評分 0-10，說明 10 分的樣子，然後編輯計劃以達成目標。檢測 AI 粗糙感 (Slop)。互動式 — 每個設計選擇都會詢問用戶。 |
| `/design-consultation` | **設計合夥人** | 從頭開始建立完整的設計系統。了解市場現況，提出創意冒險，生成真實的產品模型。設計是所有其他階段的核心。 |
| `/review` | **資深工程師** | 找出通過 CI 但在生產環境中爆炸的 Bug。自動修復明顯的問題。標記完整性缺失。 |
| `/investigate` | **除錯專家** | 系統化的根因分析除錯。鐵律：沒有調查就沒有修復。追蹤資料流、測試假設，在 3 次修復失敗後停止。 |
| `/design-review` | **會寫代碼的設計師** | 與 /plan-design-review 相同的審查，然後修復發現的問題。原子化提交，修復前後截圖。 |
| `/qa` | **QA 負責人** | 測試你的應用、尋找 Bug、透過原子化提交修復它們、重新驗證。為每次修復自動生成回歸測試。 |
| `/qa-only` | **QA 報告員** | 與 /qa 相同的方法論，但僅提供報告。當你想要純粹的 Bug 報告而不進行代碼更改時使用。 |
| `/ship` | **發布工程師** | 同步 main 分支、執行測試、審核覆蓋率、推送、開啟 PR。如果你還沒有測試框架，它會自動引導建立。一個指令完成。 |
| `/document-release` | **技術文件撰寫員** | 更新所有專案文件以匹配你剛交付的內容。自動捕捉過時的 README。 |
| `/retro` | **工程經理** | 具備團隊意識的每週回顧。個人細分報告、交付連勝紀錄、測試健康趨勢、成長機會。 |
| `/browse` | **QA 工程師** | 給予代理雙眼。真實的 Chromium 瀏覽器、真實的點擊、真實的截圖。每個指令約 100 毫秒。 |
| `/setup-browser-cookies` | **會話管理員** | 將你真實瀏覽器（Chrome, Arc, Brave, Edge）中的 Cookie 匯入無頭會話。測試需要身份驗證的頁面。 |

### 強大工具

| 技能 | 它的作用 |
|-------|-------------|
| `/codex` | **第二意見** — 來自 OpenAI Codex CLI 的獨立代碼審查。三種模式：審查（通過/失敗閘門）、對抗性挑戰、以及開放式諮詢。當 `/review` 和 `/codex` 都執行過後，會進行跨模型分析。 |
| `/careful` | **安全護欄** — 在執行破壞性指令（rm -rf, DROP TABLE, force-push）前發出警告。說「be careful」即可啟用。可覆蓋任何警告。 |
| `/freeze` | **編輯鎖定** — 限制檔案編輯僅限於一個目錄。防止在除錯時意外更改範圍外的代碼。 |
| `/guard` | **全面安全** — 一個指令同時啟用 `/careful` + `/freeze`。生產環境工作的最高安全性。 |
| `/unfreeze` | **解鎖** — 移除 `/freeze` 邊界。 |
| `/gstack-upgrade` | **自我更新器** — 將 gstack 升級到最新版本。檢測是全域還是本地安裝，同步兩者，顯示變更內容。 |

**[每個技能的深入探討、範例與理念 →](docs/skills_zh_TW.md)**

## 有什麼新功能，為什麼它很重要

**`/office-hours` 在你寫代碼前重新定義產品。** 你說「每日簡報應用程式」，它傾聽你的實際痛點，反對該定義，告訴你你真正構建的是個人幕僚長 AI，挑戰你的前提，並生成三種實作方案及工作量估算。它撰寫的設計文件直接餵入 `/plan-ceo-review` 和 `/plan-eng-review` —— 因此每個後續技能都始於真實的清晰度，而不是模糊的功能需求。

**設計是核心。** `/design-consultation` 不僅僅是選擇字體。它研究你領域中的現況，提出安全選擇以及創意冒險，為你的實際產品生成真實的模型，並撰寫 `DESIGN.md` —— 然後 `/design-review` 和 `/plan-eng-review` 會讀取你的選擇。設計決策貫穿整個系統。

**`/qa` 是一個巨大的突破。** 它讓我從 6 個並行工作者增加到 12 個。Claude Code 說 *「我看到問題了」*，然後實際修復它、生成回歸測試並驗證修復 —— 這改變了我的工作方式。代理現在有了雙眼。

**智慧審查路由。** 就像在一間運作良好的新創公司：執行長不需要查看基礎架構的 Bug 修復，後端變更不需要設計審查。gstack 追蹤已執行的審查，找出合適的審查，並做出明智的舉動。「審查準備就緒儀表板」(Review Readiness Dashboard) 在你交付前告訴你目前的進度。

**測試一切。** 如果你的專案沒有測試框架，`/ship` 會從頭開始引導建立。每次 `/ship` 執行都會產生覆蓋率審核。每次 `/qa` 的 Bug 修復都會生成回歸測試。100% 測試覆蓋率是目標 —— 測試讓「憑感覺編程」(vibe coding) 變得安全，而不是「放手一搏」(yolo coding)。

**`/document-release` 是你從未擁有過的工程師。** 它讀取專案中的每個文件檔案，交叉比對差異，並更新所有產生偏差的內容。README, ARCHITECTURE, CONTRIBUTING, CLAUDE.md, TODOS —— 全部自動保持最新狀態。現在 `/ship` 會自動調用它 —— 文件無需額外指令即可保持最新。

**當 AI 卡住時切換到瀏覽器。** 遇到 CAPTCHA、驗證牆或 MFA 提示？`$B handoff` 會在可見的 Chrome 中開啟完全相同的頁面，並保留所有 Cookie 和分頁。解決問題後告訴 Claude 你完成了，`$B resume` 就會從剛才中斷的地方繼續。在連續 3 次失敗後，代理甚至會自動建議這麼做。

**多 AI 第二意見。** `/codex` 從 OpenAI 的 Codex CLI 獲取獨立審查 —— 一個完全不同的 AI 查看相同的差異。三種模式：帶有通過/失敗閘門的代碼審查、主動嘗試破壞代碼的對抗性挑戰，以及具有會話連續性的開放式諮詢。當 `/review` (Claude) 和 `/codex` (OpenAI) 都審查了同一個分支時，你會得到一份跨模型分析，顯示哪些發現是重疊的，哪些是每個模型獨有的。

**隨需啟用的安全護欄。** 說「be careful」，`/careful` 就會在任何破壞性指令（rm -rf, DROP TABLE, force-push, git reset --hard）前發出警告。`/freeze` 在除錯時將編輯鎖定在一個目錄中，這樣 Claude 就不會意外地「修復」無關的代碼。`/guard` 同時啟用兩者。`/investigate` 會自動凍結到正在調查的模組。

**主動式技能建議。** gstack 會注意到你正處於哪個階段 —— 腦力激盪、審查、除錯、測試 —— 並建議正確的技能。不喜歡嗎？說「stop suggesting」，它就會跨會話記住。

## 10-15 個並行衝刺

gstack 在單次衝刺中非常強大。在十個衝刺同時運行時，它是變革性的。

[Conductor](https://conductor.build) 並行執行多個 Claude Code 會話 —— 每個會話都在其獨立的工作空間中。一個會話正在針對新想法執行 `/office-hours`，另一個正在對 PR 執行 `/review`，第三個正在實作功能，第四個正在預覽環境執行 `/qa`，還有六個在其他分支上執行。全部同時進行。我經常並行執行 10-15 個衝刺 —— 這是目前的實際上限。

衝刺結構是讓並行運作成功的關鍵。沒有流程，十個代理就是十個混亂的源頭。有了流程 —— 思考、計劃、構建、審查、測試、交付 —— 每個代理都清楚地知道該做什麼以及何時停止。你像執行長管理團隊一樣管理它們：在關鍵決策上介入，其餘的讓它們運行。

---

## 歡迎加入這股浪潮

這是 **免費、MIT 授權、開源、現在即可使用。** 沒有高級版。沒有候補名單。沒有任何限制。

我開源了我開發的方式，並且正在這裡積極升級我自己的軟體工廠。你可以 Fork 它並讓它成為你的。這就是重點。我希望每個人都加入這段旅程。

同樣的工具，不同的結果 —— 因為 gstack 給予你結構化的角色和審查閘門，而不是通用的代理混亂。這種治理是「快速交付」與「魯莽交付」之間的區別。

模型進步得很快。現在就弄清楚如何與它們協作的人 —— 真正地協作，而不僅僅是涉獵 —— 將擁有巨大的優勢。這就是那個機會之窗。我們走吧。

十五位專家和六個強大工具。全部斜線指令。全部 Markdown。全部免費。**[github.com/garrytan/gstack](https://github.com/garrytan/gstack)** — MIT 授權

> **我們正在招募。** 想要每天交付 10K+ 行代碼並協助強化 gstack 嗎？
> 歡迎來 YC 工作 — [ycombinator.com/software](https://ycombinator.com/software)
> 極具競爭力的薪資與股權。舊金山，Dogpatch 區。

## 文件

| 文件 | 涵蓋內容 |
|-----|---------------|
| [技能深入探討](docs/skills_zh_TW.md) | 每個技能的理念、範例與工作流程（包含 Greptile 整合） |
| [架構](ARCHITECTURE_zh_TW.md) | 設計決策與系統內部運作 |
| [瀏覽器參考](BROWSER_zh_TW.md) | `/browse` 的完整指令參考 |
| [貢獻指南](CONTRIBUTING_zh_TW.md) | 開發設置、測試、貢獻者模式與開發模式 |
| [更新日誌](CHANGELOG_zh_TW.md) | 每個版本的更新內容 |

## 隱私與遙測

gstack 包含 **自由選擇 (opt-in)** 的使用遙測，以協助改進專案。以下是具體運作方式：

- **預設為關閉。** 除非你明確表示同意，否則不會發送任何內容。
- **首次執行時，** gstack 會詢問你是否願意分享匿名使用數據。你可以拒絕。
- **發送內容（如果你同意）：** 技能名稱、持續時間、成功/失敗、gstack 版本、作業系統。僅此而已。
- **絕不發送內容：** 代碼、檔案路徑、倉庫名稱、分支名稱、提示詞或任何用戶生成的內容。
- **隨時更改：** `gstack-config set telemetry off` 立即停用所有遙測。

數據儲存在 [Supabase](https://supabase.com)（開源的 Firebase 替代方案）。結構位於 [`supabase/migrations/001_telemetry.sql`](supabase/migrations/001_telemetry.sql) —— 你可以驗證具體收集了什麼。倉庫中的 Supabase 可發布金鑰是公開金鑰（類似於 Firebase API 金鑰） —— 行級安全策略將其限制為僅限寫入存取。

**本地分析隨時可用。** 執行 `gstack-analytics` 從本地 JSONL 檔案查看你的個人使用儀表板 —— 無需遠端數據。

## 常見問題排除

**技能沒有出現？** `cd ~/.claude/skills/gstack && ./setup`

**`/browse` 失敗？** `cd ~/.claude/skills/gstack && bun install && bun run build`

**安裝過時？** 執行 `/gstack-upgrade` —— 或在 `~/.gstack/config.yaml` 中設置 `auto_upgrade: true`

**Windows 用戶：** gstack 透過 Git Bash 或 WSL 在 Windows 11 上運作。除 Bun 之外還需要 Node.js —— Bun 在 Windows 上與 Playwright 的管道傳輸存在已知 Bug ([bun#4253](https://github.com/oven-sh/bun/issues/4253))。瀏覽伺服器會自動退回到 Node.js。請確保 `bun` 和 `node` 都在你的 PATH 中。

**Claude 說它看不到技能？** 確保你專案的 `CLAUDE.md` 有 gstack 章節。添加這段文字：

```
## gstack
Use /browse from gstack for all web browsing. Never use mcp__claude-in-chrome__* tools.
Available skills: /office-hours, /plan-ceo-review, /plan-eng-review, /plan-design-review,
/design-consultation, /review, /ship, /browse, /qa, /qa-only, /design-review,
/setup-browser-cookies, /retro, /investigate, /document-release, /codex, /careful,
/freeze, /guard, /unfreeze, /gstack-upgrade.
```

## 授權

MIT。永遠免費。去構建一些東西吧。
