# 架構 (Architecture)

這份文件說明了 **為什麼** gstack 會以這種方式構建。關於設置與指令，請參閱 [CLAUDE_zh_TW.md](CLAUDE_zh_TW.md)；關於貢獻指南，請參閱 [CONTRIBUTING_zh_TW.md](CONTRIBUTING_zh_TW.md)。

## 核心理念

gstack 賦予了 Claude Code 一個持久化的瀏覽器以及一套具備特定流程觀點的工作流技能。瀏覽器是技術上的難點——其餘部分皆由 Markdown 組成。

關鍵洞察：一個與瀏覽器互動的 AI 代理需要 **亞秒級（sub-second）的延遲** 與 **持久化的狀態**。如果每個指令都要冷啟動瀏覽器，你每個工具調用都要等待 3-5 秒。如果瀏覽器在指令之間關閉，你就會失去 Cookie、分頁和登入會話。因此，gstack 運行了一個長駐的 Chromium 守護行程（daemon），CLI 透過本地 localhost HTTP 與其溝通。

```
Claude Code                     gstack
─────────                      ──────
                               ┌──────────────────────┐
  工具調用：$B snapshot -i       │  CLI (編譯後的二進位檔)  │
  ─────────────────────────→   │  • 讀取狀態檔案        │
                               │  • POST /command      │
                               │    至 localhost:PORT  │
                               └──────────┬───────────┘
                                          │ HTTP
                               ┌──────────▼───────────┐
                               │  伺服器 (Bun.serve)   │
                               │  • 調度指令           │
                               │  • 與 Chromium 溝通   │
                               │  • 回傳純文字         │
                               └──────────┬───────────┘
                                          │ CDP
                               ┌──────────▼───────────┐
                               │  Chromium (無頭模式)  │
                               │  • 持久化分頁         │
                               │  • Cookie 延續使用    │
                               │  • 30 分鐘閒置逾時     │
                               └───────────────────────┘
```

第一次調用會啟動所有組件（約 3 秒）。之後的每次調用：約 100-200 毫秒。

## 為什麼選擇 Bun

Node.js 也可以運作，但在這裡 Bun 更好，原因有三：

1. **編譯後的二進位檔。** `bun build --compile` 會產生一個約 58MB 的單一執行檔。運行時無需 `node_modules`，無需 `npx`，無需配置 PATH。二進位檔可以直接執行。這很重要，因為 gstack 安裝在 `~/.claude/skills/`，用戶不希望在那裡管理 Node.js 專案。

2. **原生 SQLite。** Cookie 解密直接讀取 Chromium 的 SQLite Cookie 資料庫。Bun 內建了 `new Database()` —— 無需 `better-sqlite3`，無需編譯原生插件，無需 gyp。這減少了一個在不同機器上可能出錯的环节。

3. **原生 TypeScript。** 開發期間，伺服器以 `bun run server.ts` 運行。無需編譯步驟，無需 `ts-node`，無需偵錯 Source Maps。編譯後的二進位檔用於部署；原始檔案用於開發。

4. **內建 HTTP 伺服器。** `Bun.serve()` 快速、簡單，且不需要 Express 或 Fastify。伺服器總共處理約 10 個路由，框架反而是負擔。

瓶頸總是在 Chromium，而不是 CLI 或伺服器。Bun 的啟動速度（編譯後的二進位檔約 1 毫秒，Node 約 100 毫秒）雖然很好，但不是我們選擇它的主要原因。編譯後的二進位檔和原生 SQLite 才是關鍵。

## 守護行程模式 (The Daemon Model)

### 為什麼不為每個指令啟動一個瀏覽器？

Playwright 可以在約 2-3 秒內啟動 Chromium。對於單次截圖，這沒問題。但對於一個包含 20 多個指令的 QA 會話，這意味著 40 多秒的瀏覽器啟動開銷。更糟的是：你會在指令之間失去所有狀態。Cookie、localStorage、登入會話、開啟的分頁——全部消失。

守護行程模式意味著：

- **持久化狀態。** 登入一次，保持登入。開啟一個分頁，它保持開啟。localStorage 在指令之間持久存在。
- **亞秒級指令。** 第一次調用後，每個指令都只是一個 HTTP POST。包含 Chromium 的運作在內，往返約 100-200 毫秒。
- **自動生命週期。** 伺服器在首次使用時自動啟動，在閒置 30 分鐘後自動關閉。無需進行進程管理。

### 狀態檔案

伺服器寫入 `.gstack/browse.json`（透過 tmp + rename 進行原子寫入，權限 0o600）：

```json
{ "pid": 12345, "port": 34567, "token": "uuid-v4", "startedAt": "...", "binaryVersion": "abc123" }
```

CLI 讀取此檔案以尋找伺服器。如果檔案缺失、過時或 PID 已不存在，CLI 會啟動一個新的伺服器。

### 埠號 (Port) 選擇

在 10000-60000 之間隨機選擇埠號（碰撞時重試最多 5 次）。這意味著 10 個 Conductor 工作空間可以各自運行自己的瀏覽守護行程，零配置且零埠號衝突。舊的方法（掃描 9400-9409）在多工作空間設置中經常出錯。

### 版本自動重啟

建置過程會將 `git rev-parse HEAD` 寫入 `browse/dist/.version`。在每次 CLI 調用時，如果二進位檔的版本與正在運行的伺服器的 `binaryVersion` 不符，CLI 會殺掉舊伺服器並啟動一個新的。這完全防止了「過時二進位檔」類型的 Bug —— 只要重新建置二進位檔，下一個指令就會自動採用。

## 安全模型

### 僅限 localhost

HTTP 伺服器綁定到 `localhost`，而不是 `0.0.0.0`。它無法從網絡訪問。

### Bearer Token 驗證

每個伺服器會話都會生成一個隨機的 UUID 令牌，並以權限 0o600（僅限所有者讀取）寫入狀態檔案。每個 HTTP 請求必須包含 `Authorization: Bearer <token>`。如果令牌不符，伺服器回傳 401。

這防止了同一台機器上的其他進程與你的瀏覽伺服器通訊。Cookie 選擇器 UI (`/cookie-picker`) 和健康檢查 (`/health`) 是例外的 —— 它們僅限 localhost 且不執行指令。

### Cookie 安全性

Cookie 是 gstack 處理的最敏感數據。設計如下：

1. **存取金鑰鏈 (Keychain) 需要用戶批准。** 每個瀏覽器第一次匯入 Cookie 時都會觸發 macOS 金鑰鏈對話框。用戶必須點擊「允許」或「始終允許」。gstack 絕不會靜默存取憑據。

2. **解密在進程內進行。** Cookie 值在記憶體中解密（PBKDF2 + AES-128-CBC），載入到 Playwright 上下文中，絕不以純文字形式寫入磁碟。Cookie 選擇器 UI 絕不顯示 Cookie 值 —— 僅顯示域名和數量。

3. **資料庫為唯讀。** gstack 將 Chromium 的 Cookie 資料庫複製到暫存檔案（以避免與正在運行的瀏覽器產生 SQLite 鎖定衝突），並以唯讀方式開啟。它絕不會修改你真實瀏覽器的 Cookie 資料庫。

4. **金鑰快取基於會話。** 金鑰鏈密碼 + 派生的 AES 金鑰在伺服器生命週期內快取在記憶體中。當伺服器關閉（閒置逾時或明確停止）時，快取即消失。

5. **日誌中不包含 Cookie 值。** 控制台、網絡和對話框日誌絕不包含 Cookie 值。`cookies` 指令輸出 Cookie 元數據（域名、名稱、過期時間），但值會被截斷。

### 防止 Shell 注入

瀏覽器註冊表（Comet, Chrome, Arc, Brave, Edge）是寫死的。資料庫路徑是從已知常量構建的，絕不來自用戶輸入。金鑰鏈存取使用 `Bun.spawn()` 並帶有明確的參數數組，而不是 shell 字串插值。

## 引用系統 (Ref System)

引用（Refs，例如 `@e1`, `@e2`, `@c1`）是代理在不撰寫 CSS 選擇器或 XPath 的情況下，定址頁面元素的方式。

### 運作方式

```
1. 代理執行：$B snapshot -i
2. 伺服器調用 Playwright 的 page.accessibility.snapshot()
3. 解析器遍歷 ARIA 樹，分配連續的引用：@e1, @e2, @e3...
4. 針對每個引用，構建一個 Playwright 定位器 (Locator)：getByRole(role, { name }).nth(index)
5. 在 BrowserManager 實例上儲存 Map<string, RefEntry> (角色 + 名稱 + 定位器)
6. 回傳帶有標註的樹狀結構純文字
7. 稍後代理執行：$B click @e3
8. 伺服器解析 @e3 → 定位器 → locator.click()
```

### 為什麼使用定位器而非 DOM 變更

最直觀的方法是在 DOM 中注入 `data-ref="@e1"` 屬性。但這會在以下情況失效：

- **CSP (內容安全策略)。** 許多生產環境網站會阻止腳本修改 DOM。
- **React/Vue/Svelte 水合作用 (Hydration)。** 框架的調和 (Reconciliation) 可能會移除注入的屬性。
- **Shadow DOM。** 無法從外部觸及 Shadow Root 內部。

Playwright 定位器位於 DOM 外部。它們使用無障礙樹（Chromium 內部維護）和 `getByRole()` 查詢。無需 DOM 變更，無 CSP 問題，無框架衝突。

### 引用生命週期

引用在導航（主框架上的 `framenavigated` 事件）時會被清除。這是正確的 —— 導航後，所有定位器都已失效。代理必須再次執行 `snapshot` 以獲取新的引用。這是刻意設計的：過時的引用應該大聲報錯，而不是點擊錯誤的元素。

### 引用過時檢測

SPA 可能在不觸發 `framenavigated` 的情況下變更 DOM（例如 React router 切換、分頁切換、開啟彈窗）。這會使引用即使在頁面 URL 未變更的情況下也失效。為了捕捉這種情況，`resolveRef()` 在使用任何引用之前會執行非同步的 `count()` 檢查：

```
resolveRef(@e3) → entry = refMap.get("e3")
                → count = await entry.locator.count()
                → 如果 count === 0：拋出「引用 @e3 已過時 — 元素不再存在。請執行 'snapshot' 獲取新的引用。」
                → 如果 count > 0：回傳 { locator }
```

這樣可以快速失敗（約 5 毫秒開銷），而不是讓 Playwright 的 30 秒動作逾時浪費在一個缺失的元素上。`RefEntry` 在儲存定位器時也儲存了 `role` 和 `name` 元數據，因此錯誤訊息可以告訴代理該元素是什麼。

### 游標交互式引用 (@c)

`-C` 標誌會尋找可點擊但不在 ARIA 樹中的元素 —— 例如樣式設置為 `cursor: pointer` 的內容、帶有 `onclick` 屬性的元素或自定義的 `tabindex`。這些在單獨的命名空間中獲得 `@c1`, `@c2` 引用。這捕捉到了框架渲染為 `<div>` 但實際是按鈕的自定義組件。

## 日誌架構

三個環形緩衝區 (Ring Buffers)（每個 50,000 條記錄，O(1) 寫入）：

```
瀏覽器事件 → 環形緩衝區 (記憶體內) → 非同步排清至 .gstack/*.log
```

控制台訊息、網絡請求和對話框事件各有自己的緩衝區。排清每 1 秒發生一次 —— 伺服器僅追加自上次排清以來的新記錄。這意味著：

- HTTP 請求處理絕不會被磁碟 I/O 阻塞
- 日誌在伺服器崩潰中倖存（最多失去 1 秒的數據）
- 記憶體使用是有界的（50K 記錄 × 3 個緩衝區）
- 磁碟檔案僅限追加，可由外部工具讀取

`console`, `network` 和 `dialog` 指令從記憶體緩衝區讀取，而不是磁碟。磁碟檔案用於事後分析。

## SKILL.md 模板系統

### 問題所在

SKILL.md 檔案告訴 Claude 如何使用瀏覽指令。如果文件中列出了不存在的標誌，或漏掉了新增的指令，代理就會出錯。手動維護的文件總是與代碼脫節。

### 解決方案

```
SKILL.md.tmpl          (人工編寫的文字 + 佔位符)
       ↓
gen-skill-docs.ts      (讀取源代碼元數據)
       ↓
SKILL.md               (提交的、自動生成的章節)
```

模板包含需要人工判斷的工作流程、提示和範例。佔位符在建置時從源代碼填入：

| 佔位符 | 來源 | 生成內容 |
|-------------|--------|-------------------|
| `{{COMMAND_REFERENCE}}` | `commands.ts` | 分類指令參考表 |
| `{{SNAPSHOT_FLAGS}}` | `snapshot.ts` | 帶有範例的標誌參考 |
| `{{PREAMBLE}}` | `gen-skill-docs.ts` | 啟動區塊：更新檢查、會話追蹤、貢獻者模式、AskUserQuestion 格式 |
| `{{BROWSE_SETUP}}` | `gen-skill-docs.ts` | 二進位檔發現 + 設置說明 |
| `{{BASE_BRANCH_DETECT}}` | `gen-skill-docs.ts` | 針對 PR 技能（ship, review, qa, plan-ceo-review）的動態基準分支檢測 |
| `{{QA_METHODOLOGY}}` | `gen-skill-docs.ts` | /qa 和 /qa-only 共享的 QA 方法論區塊 |
| `{{DESIGN_METHODOLOGY}}` | `gen-skill-docs.ts` | /plan-design-review 和 /design-review 共享的設計審核方法論 |
| `{{REVIEW_DASHBOARD}}` | `gen-skill-docs.ts` | /ship 交付前的審核準備就緒儀表板 |
| `{{TEST_BOOTSTRAP}}` | `gen-skill-docs.ts` | 為 /qa, /ship, /design-review 進行測試框架檢測、引導、CI/CD 設置 |

這在結構上是可靠的 —— 如果代碼中存在指令，它就會出現在文件中；反之則不會。

### 導言 (The Preamble)

每個技能都以一個 `{{PREAMBLE}}` 區塊開始，在技能本身的邏輯之前執行。它透過單一的 bash 指令處理四件事：

1. **更新檢查** — 調用 `gstack-update-check`，報告是否有可用的升級。
2. **會話追蹤** — 觸碰 `~/.gstack/sessions/$PPID` 並計算活動會話（過去 2 小時內修改過的檔案）。當有 3 個以上會話運行時，所有技能進入「ELI16 模式」—— 每個問題都會重新鞏固用戶的背景資訊，因為他們正在切換多個視窗。
3. **貢獻者模式** — 從配置中讀取 `gstack_contributor`。若為 true，當 gstack 本身表現異常時，代理會向 `~/.gstack/contributor-logs/` 提交休閒的實地報告。
4. **AskUserQuestion 格式** — 通用格式：背景、問題、`建議：選擇 X 因為 ___`、選項字母。在所有技能中保持一致。

### 為什麼選擇提交檔案，而不是在運行時生成？

原因有三：

1. **Claude 在載入技能時讀取 SKILL.md。** 當用戶調用 `/browse` 時沒有建置步驟。檔案必須已經存在且正確。
2. **CI 可以驗證新鮮度。** `gen:skill-docs --dry-run` + `git diff --exit-code` 可以在合併前捕捉過時的文件。
3. **Git blame 可以運作。** 你可以看到某個指令是在何時、哪個提交中新增的。

### 模板測試層級

| 層級 | 內容 | 成本 | 速度 |
|------|------|------|-------|
| 1 — 靜態驗證 | 解析 SKILL.md 中的每個 `$B` 指令，與註冊表比對 | 免費 | <2秒 |
| 2 — 透過 `claude -p` 進行 E2E | 啟動真實的 Claude 會話，執行每個技能，檢查錯誤 | 約 $3.85 | 約 20 分鐘 |
| 3 — LLM 作為裁判 | Sonnet 針對清晰度/完整性/可操作性對文件評分 | 約 $0.15 | 約 30 秒 |

第 1 層在每次 `bun test` 時運行。第 2 和第 3 層受 `EVALS=1` 控制。理念是：免費捕捉 95% 的問題，僅對需要判斷的部分使用 LLM。

## 指令調度 (Command Dispatch)

指令根據副作用進行分類：

- **READ** (text, html, links, console, cookies, ...): 無變更。可安全重試。回傳頁面狀態。
- **WRITE** (goto, click, fill, press, ...): 變更頁面狀態。非冪等（Not idempotent）。
- **META** (snapshot, screenshot, tabs, chain, ...): 伺服器級別的操作，無法簡單歸類為讀或寫。

這不僅僅是為了組織，伺服器調度也會用到它：

```typescript
如果 (READ_COMMANDS.has(cmd))  → handleReadCommand(cmd, args, bm)
如果 (WRITE_COMMANDS.has(cmd)) → handleWriteCommand(cmd, args, bm)
如果 (META_COMMANDS.has(cmd))  → handleMetaCommand(cmd, args, bm, shutdown)
```

`help` 指令回傳這三組內容，以便代理自我發現可用指令。

## 錯誤哲學

錯誤是給 AI 代理看的，不是給人看的。每個錯誤訊息都必須是可操作的：

- 「Element not found」→ 「找不到元素或無法互動。請執行 `snapshot -i` 查看可用元素。」
- 「Selector matched multiple elements」→ 「選擇器匹配了多個元素。請改用來自 `snapshot` 的 @refs。」
- 逾時 → 「導航在 30 秒後逾時。頁面可能很慢或 URL 可能錯誤。」

Playwright 原生錯誤透過 `wrapError()` 被重寫，以移除內部堆疊追蹤並增加指引。代理應能讀取錯誤並知道下一步該怎麼做，無需人工干預。

### 崩潰恢復

伺服器不嘗試自我修復。如果 Chromium 崩潰 (`browser.on('disconnected')`)，伺服器立即退出。CLI 在下一個指令時偵測到伺服器已死，並自動重啟。這比嘗試重新連接到半死的瀏覽器進程更簡單且更可靠。

## E2E 測試基礎架構

### 會話運行器 (`test/helpers/session-runner.ts`)

E2E 測試啟動 `claude -p` 作為一個完全獨立的子進程 —— 而非透過 Agent SDK，因為它無法嵌套在 Claude Code 會話中。運行器執行以下操作：

1. 將提示詞寫入暫存檔案（避免 shell 轉義問題）
2. 啟動 `sh -c 'cat prompt | claude -p --output-format stream-json --verbose'`
3. 從 stdout 串流傳輸 NDJSON 以進行即時進度監控
4. 針對可配置的逾時進行競爭
5. 將完整的 NDJSON 轉錄解析為結構化結果

`parseNDJSON()` 函式是純粹的 —— 無 I/O，無副作用 —— 使其可以獨立測試。

### 觀測數據流

```
  skill-e2e.test.ts
        │
        │ 生成 runId，將 testName + runId 傳遞給每次調用
        │
  ┌─────┼──────────────────────────────┐
  │     │                              │
  │  runSkillTest()              evalCollector
  │  (session-runner.ts)         (eval-store.ts)
  │     │                              │
  │  每次工具調用：               每次 addTest()：
  │  ┌──┼──────────┐              savePartial()
  │  │  │          │                   │
  │  ▼  ▼          ▼                   ▼
  │ [HB] [PL]    [NJ]          _partial-e2e.json
  │  │    │        │             (原子覆蓋)
  │  │    │        │
  │  ▼    ▼        ▼
  │ e2e-  prog-  {name}
  │ live  ress   .ndjson
  │ .json .log
  │
  │  失敗時：
  │  {name}-failure.json
  │
  │  所有檔案位於 ~/.gstack-dev/
  │  執行目錄：e2e-runs/{runId}/
  │
  │         eval-watch.ts
  │              │
  │        ┌─────┴─────┐
  │     讀取 HB     讀取 partial
  │        └─────┬─────┘
  │              ▼
  │        渲染儀表板
  │        (過時 >10 分鐘？發出警告)
```

**分拆所有權：** session-runner 擁有心跳 (heartbeat)（當前測試狀態），eval-store 擁有局部結果 (partial results)（已完成的測試狀態）。觀察者讀取兩者。這兩個組件互不相識 —— 它們僅透過檔案系統共享數據。

**非致命原則：** 所有觀測數據 I/O 都封裝在 try/catch 中。寫入失敗絕不導致測試失敗。測試本身是事實來源；觀測數據是盡力而為。

**機器可讀的診斷：** 每個測試結果包含 `exit_reason` (success, timeout, error_max_turns, error_api, exit_code_N)、`timeout_at_turn` 和 `last_tool_call`。這使得 `jq` 查詢成為可能：
```bash
jq '.tests[] | select(.exit_reason == "timeout") | .last_tool_call' ~/.gstack-dev/evals/_partial-e2e.json
```

### 評估持久化 (`test/helpers/eval-store.ts`)

`EvalCollector` 累積測試結果並以兩種方式寫入：

1. **增量：** `savePartial()` 在每次測試後寫入 `_partial-e2e.json`（原子操作：先寫 `.tmp`，再執行 `fs.renameSync`）。在進程被殺掉時仍能倖存。
2. **最終：** `finalize()` 寫入一個帶有時間戳的評估檔案（例如 `e2e-20260314-143022.json`）。局部檔案絕不被清理 —— 它與最終檔案並存以供觀測。

`eval:compare` 對比兩次評估運行。`eval:summary` 匯總 `~/.gstack-dev/evals/` 中所有運行的統計數據。

### 測試層級

| 層級 | 內容 | 成本 | 速度 |
|------|------|------|-------|
| 1 — 靜態驗證 | 解析 `$B` 指令，與註冊表比對，觀測單元測試 | 免費 | <5秒 |
| 2 — 透過 `claude -p` 進行 E2E | 啟動真實的 Claude 會話，執行每個技能，掃描錯誤 | 約 $3.85 | 約 20 分鐘 |
| 3 — LLM 作為裁判 | Sonnet 針對清晰度/完整性/可操作性對文件評分 | 約 $0.15 | 約 30 秒 |

第 1 層在每次 `bun test` 時運行。第 2 和第 3 層受 `EVALS=1` 控制。理念是：免費捕捉 95% 的問題，僅對需要判斷的部分使用 LLM 並進行集成測試。

## 刻意不包含的部分

- **無 WebSocket 串流。** HTTP 請求/響應更簡單，可用 curl 偵錯，且速度夠快。串流會增加複雜度，但收益有限。
- **無 MCP 協定。** MCP 為每個請求增加了 JSON schema 開銷，且需要持久連接。純 HTTP + 純文字輸出對 Token 負擔更小，且更容易偵錯。
- **無多用戶支援。** 每個工作空間一個伺服器，一個用戶。令牌驗證是深度防禦，而非多租戶設計。
- **無 Windows/Linux Cookie 解密。** macOS Keychain 是唯一支援的憑據存儲。Linux (GNOME Keyring/kwallet) 和 Windows (DPAPI) 在架構上是可能的，但尚未實作。
- **無 iframe 支援。** Playwright 可以處理 iframe，但引用系統尚未跨越框架邊界。這是最受期待但尚未實現的功能。
