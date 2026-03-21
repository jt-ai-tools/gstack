# 瀏覽器 —— 技術細節

本文件涵蓋了 gstack 無頭瀏覽器（headless browser）的命令參考與內部實作。

## 命令參考

| 類別 | 命令 | 用途 |
|----------|----------|----------|
| 導航 | `goto`, `back`, `forward`, `reload`, `url` | 前往頁面 |
| 讀取 | `text`, `html`, `links`, `forms`, `accessibility` | 擷取內容 |
| 快照 (Snapshot) | `snapshot [-i] [-c] [-d N] [-s sel] [-D] [-a] [-o] [-C]` | 獲取引用、比對差異、標註 |
| 互動 | `click`, `fill`, `select`, `hover`, `type`, `press`, `scroll`, `wait`, `viewport`, `upload` | 使用頁面 |
| 檢查 | `js`, `eval`, `css`, `attrs`, `is`, `console`, `network`, `dialog`, `cookies`, `storage`, `perf` | 除錯與驗證 |
| 視覺 | `screenshot [--viewport] [--clip x,y,w,h] [sel\|@ref] [path]`, `pdf`, `responsive` | 查看 Claude 看到的內容 |
| 比對 | `diff <url1> <url2>` | 找出不同環境間的差異 |
| 對話框 | `dialog-accept [text]`, `dialog-dismiss` | 控制 alert/confirm/prompt 處理 |
| 分頁 | `tabs`, `tab`, `newtab`, `closetab` | 多頁面工作流 |
| Cookie | `cookie-import`, `cookie-import-browser` | 從檔案或真實瀏覽器匯入 Cookie |
| 多步驟 | `chain` (從 stdin 讀取 JSON) | 在單次調用中批量執行命令 |
| 接手 (Handoff) | `handoff [reason]`, `resume` | 切換到可視的 Chrome 供使用者接手 |

所有選擇器參數皆接受 CSS 選擇器、`snapshot` 之後的 `@e` 引用，或是 `snapshot -C` 之後的 `@c` 引用。總共包含 50 多個命令以及 Cookie 匯入功能。

## 運作原理

gstack 的瀏覽器是一個已編譯的 CLI 二進位檔，它透過 HTTP 與一個持久化的在地 Chromium 守護進程（daemon）進行通訊。CLI 是一個薄客戶端（thin client）——它讀取狀態檔案、發送命令，並將回應列印到標準輸出（stdout）。伺服器則透過 [Playwright](https://playwright.dev/) 完成實際工作。

```
┌─────────────────────────────────────────────────────────────────┐
│  Claude Code                                                    │
│                                                                 │
│  "browse goto https://staging.myapp.com"                        │
│       │                                                         │
│       ▼                                                         │
│  ┌──────────┐    HTTP POST     ┌──────────────┐                 │
│  │ browse   │ ──────────────── │ Bun HTTP     │                 │
│  │ CLI      │  localhost:rand  │ 伺服器       │                 │
│  │          │  Bearer token    │              │                 │
│  │ 已編譯的 │ ◄──────────────  │  Playwright  │──── Chromium    │
│  │ 二進位檔 │  純文字內容      │  API 調用    │    (無頭模式)   │
│  └──────────┘                  └──────────────┘                 │
│   ~1ms 啟動速度                 持久化守護進程                    │
│                                 第一次調用時自動啟動              │
│                                 閒置 30 分鐘後自動停止            │
└─────────────────────────────────────────────────────────────────┘
```

### 生命週期

1. **第一次調用**：CLI 檢查專案根目錄下的 `.gstack/browse.json` 以確認是否有運作中的伺服器。若未發現，它會在背景啟動 `bun run browse/src/server.ts`。伺服器透過 Playwright 啟動無頭 Chromium、選擇一個隨機連接埠（10000-60000）、產生一個 Bearer 令牌、寫入狀態檔案，並開始接收 HTTP 請求。這大約需要 3 秒。

2. **後續調用**：CLI 讀取狀態檔案、發送帶有 Bearer 令牌的 HTTP POST 請求，並列印回應。來回通訊約需 100-200 毫秒。

3. **閒置關閉**：在 30 分鐘內沒有收到命令後，伺服器將關閉並清除狀態檔案。下一次調用會自動重新啟動它。

4. **崩潰恢復**：如果 Chromium 崩潰，伺服器會立即退出（不進行自我修復——不要隱藏失敗）。CLI 在下一次調用時會檢測到伺服器已終止，並啟動一個全新的伺服器。

### 關鍵組件

```
browse/
├── src/
│   ├── cli.ts              # 薄客戶端 —— 讀取狀態檔案、發送 HTTP、列印回應
│   ├── server.ts           # Bun.serve HTTP 伺服器 —— 將命令路由到 Playwright
│   ├── browser-manager.ts  # Chromium 生命週期 —— 啟動、分頁、引用映射、崩潰處理
│   ├── snapshot.ts         # 輔助功能樹 → @ref 分配 → 定位器映射 + 差異/標註/-C
│   ├── read-commands.ts    # 非變動性命令 (text, html, links, js, css, is, dialog 等)
│   ├── write-commands.ts   # 變動性命令 (click, fill, select, upload, dialog-accept 等)
│   ├── meta-commands.ts    # 伺服器管理、鏈結、差異、快照路由
│   ├── cookie-import-browser.ts  # 從真實 Chromium 瀏覽器解密並匯入 Cookie
│   ├── cookie-picker-routes.ts   # 互動式 Cookie 選擇器 UI 的 HTTP 路由
│   ├── cookie-picker-ui.ts       # 用於 Cookie 選擇器的自包含 HTML/CSS/JS
│   └── buffers.ts          # CircularBuffer<T> + 控制台/網路/對話框擷取
├── test/                   # 整合測試 + HTML 測試用例 (fixtures)
└── dist/
    └── browse              # 已編譯的二進位檔 (約 58MB，使用 Bun --compile)
```

### 快照系統 (Snapshot System)

瀏覽器的關鍵創新是基於引用的元素選擇，建構在 Playwright 的輔助功能樹（accessibility tree）API 之上：

1. `page.locator(scope).ariaSnapshot()` 回傳一個類似 YAML 的輔助功能樹。
2. 快照解析器為每個元素分配引用（`@e1`, `@e2`, ...）。
3. 為每個引用建構一個 Playwright `Locator`（使用 `getByRole` + nth-child）。
4. 引用到定位器的映射儲存在 `BrowserManager` 上。
5. 隨後的命令如 `click @e3` 會查找定位器並調用 `locator.click()`。

無需 DOM 修改。無需注入腳本。僅使用 Playwright 原生的輔助功能 API。

**引用過時檢測：** 單頁應用程式 (SPA) 可以在不導航的情況下修改 DOM（例如 React router、分頁切換、彈窗）。發生這種情況時，從先前的 `snapshot` 收集的引用可能會指向不再存在的元素。為了處理這種情況，`resolveRef()` 在使用任何引用之前會執行非同步的 `count()` 檢查——如果元素數量為 0，它會立即拋出錯誤，提示代理重新執行 `snapshot`。這可以快速失敗（約 5 毫秒），而不是等待 Playwright 30 秒的動作逾時。

**擴展快照功能：**
- `--diff` (`-D`)：將每個快照儲存為基準。在下一次調用 `-D` 時，回傳顯示變更內容的統一差異（unified diff）。使用此功能來驗證動作（點擊、填寫等）是否確實生效。
- `--annotate` (`-a`)：在每個引用的邊界框處注入臨時的覆蓋層 div，擷取帶有可見引用標籤的螢幕截圖，然後移除覆蓋層。使用 `-o <path>` 來控制輸出路徑。
- `--cursor-interactive` (`-C`)：使用 `page.evaluate` 掃描非 ARIA 互動元素（樣式為 `cursor:pointer`、`onclick`、`tabindex>=0` 的 div）。分配帶有確定性 `nth-child` CSS 選擇器的 `@c1`, `@c2`... 引用。這些是 ARIA 樹遺漏但使用者仍可點擊的元素。

### 螢幕截圖模式

`screenshot` 命令支援四種模式：

| 模式 | 語法 | Playwright API |
|------|--------|----------------|
| 全頁 (預設) | `screenshot [path]` | `page.screenshot({ fullPage: true })` |
| 僅限視窗 (Viewport) | `screenshot --viewport [path]` | `page.screenshot({ fullPage: false })` |
| 元素裁剪 | `screenshot "#sel" [path]` 或 `screenshot @e3 [path]` | `locator.screenshot()` |
| 區域剪裁 | `screenshot --clip x,y,w,h [path]` | `page.screenshot({ clip })` |

元素裁剪接受 CSS 選擇器 (`.class`, `#id`, `[attr]`) 或是來自 `snapshot` 的 `@e`/`@c` 引用。自動檢測機制：`@e`/`@c` 前綴 = 引用，`.`/`#`/`[` 前綴 = CSS 選擇器，`--` 前綴 = 旗標，其餘皆視為輸出路徑。

互斥規則：`--clip` + 選擇器 以及 `--viewport` + `--clip` 都會報錯。未知的旗標（例如 `--bogus`）也會報錯。

### 驗證機制

每個伺服器工作階段都會產生一個隨機 UUID 作為 Bearer 令牌。該令牌以 chmod 600 權限寫入狀態檔案（`.gstack/browse.json`）。每個 HTTP 請求都必須包含 `Authorization: Bearer <token>`。這可以防止機器上的其他程序控制該瀏覽器。

### 控制台、網路和對話框擷取

伺服器掛載到 Playwright 的 `page.on('console')`、`page.on('response')` 和 `page.on('dialog')` 事件。所有項目都保存在 O(1) 的環形緩衝區（每個容量 50,000）中，並透過 `Bun.write()` 非同步排入磁碟：

- 控制台：`.gstack/browse-console.log`
- 網路：`.gstack/browse-network.log`
- 對話框：`.gstack/browse-dialog.log`

`console`、`network` 和 `dialog` 命令從記憶體緩衝區讀取，而非磁碟。

### 使用者接手 (User Handoff)

當無頭瀏覽器無法繼續執行（例如驗證碼 CAPTCHA、多因素驗證 MFA、複雜驗證）時，`handoff` 會在完全相同的頁面上開啟一個可見的 Chrome 視窗，並保留所有 Cookie、localStorage 和分頁。使用者手動解決問題後，執行 `resume` 即可將控制權交還給代理，並獲得新的快照。

```bash
$B handoff "在登入頁面卡在驗證碼"   # 開啟可見的 Chrome
# 使用者解決驗證碼問題...
$B resume                         # 返回無頭模式並獲取新的快照
```

瀏覽器在連續 3 次失敗後會自動建議執行 `handoff`。切換過程中狀態會完全保留——無需重新登入。

### 對話框處理

對話框（alert, confirm, prompt）預設會自動接受，以防止瀏覽器卡死。`dialog-accept` 和 `dialog-dismiss` 命令可用於控制此行為。對於 prompt，`dialog-accept <text>` 可提供回應文字。所有對話框都會記錄到對話框緩衝區，包含類型、訊息和採取的動作。

### JavaScript 執行 (`js` 與 `eval`)

`js` 執行單個表達式，`eval` 執行一個 JS 檔案。兩者都支援 `await`——包含 `await` 的表達式會自動包裝在非同步上下文中：

```bash
$B js "await fetch('/api/data').then(r => r.json())"  # 可行
$B js "document.title"                                # 同樣可行 (無需包裝)
$B eval my-script.js                                  # 包含 await 的檔案同樣可行
```

對於 `eval` 檔案，單行檔案會直接回傳表達式的值。多行檔案在使用 `await` 時需要明確寫出 `return`。包含 "await" 的註釋不會觸發包裝機制。

### 多工作區支援

每個工作區都有其獨立的瀏覽器實例，擁有自己的 Chromium 程序、分頁、Cookie 和日誌。狀態儲存在專案根目錄下的 `.gstack/`（透過 `git rev-parse --show-toplevel` 偵測）。

| 工作區 | 狀態檔案 | 連接埠 |
|-----------|------------|------|
| `/code/project-a` | `/code/project-a/.gstack/browse.json` | 隨機 (10000-60000) |
| `/code/project-b` | `/code/project-b/.gstack/browse.json` | 隨機 (10000-60000) |

無連接埠衝突。無共享狀態。每個專案都是完全隔離的。

### 環境變數

| 變數 | 預設值 | 說明 |
|----------|---------|-------------|
| `BROWSE_PORT` | 0 (隨機 10000-60000) | HTTP 伺服器的固定連接埠 (除錯覆蓋) |
| `BROWSE_IDLE_TIMEOUT` | 1800000 (30 分鐘) | 閒置關閉逾時 (毫秒) |
| `BROWSE_STATE_FILE` | `.gstack/browse.json` | 狀態檔案路徑 (由 CLI 傳遞給伺服器) |
| `BROWSE_SERVER_SCRIPT` | 自動偵測 | server.ts 的路徑 |

### 效能表現

| 工具 | 第一次調用 | 後續調用 | 每次調用的上下文開銷 |
|------|-----------|-----------------|--------------------------|
| Chrome MCP | ~5 秒 | ~2-5 秒 | ~2000 tokens (schema + 協定) |
| Playwright MCP | ~3 秒 | ~1-3 秒 | ~1500 tokens (schema + 協定) |
| **gstack browse** | **~3 秒** | **~100-200 毫秒** | **0 tokens** (純文字 stdout) |

上下文開銷的差異會快速累積。在一個包含 20 個命令的瀏覽器工作階段中，MCP 工具僅在協定框架上就會消耗 30,000-40,000 個 Token。gstack 則是零消耗。

### 為什麼選擇 CLI 而非 MCP？

MCP (Model Context Protocol) 對於遠端服務效果很好，但對於本地瀏覽器自動化來說，它增加了純粹的開銷：

- **上下文膨脹**：每個 MCP 調用都包含完整的 JSON schema 和協定框架。一個簡單的「獲取頁面文字」消耗的上下文 Token 比實際需要的多出 10 倍。
- **連線脆弱性**：持久化的 WebSocket/stdio 連線容易中斷且難以重新連線。
- **不必要的抽象**：Claude Code 已經擁有 Bash 工具。一個將結果列印到標準輸出的 CLI 是最簡單的介面。

gstack 跳過了這一切。已編譯的二進位檔。純文字輸入，純文字輸出。無協定。無 Schema。無連線管理。

## 致謝

瀏覽器自動化層是基於微軟的 [Playwright](https://playwright.dev/) 建構的。Playwright 的輔助功能樹 API、定位器系統和無頭 Chromium 管理是實現基於引用的互動的基礎。快照系統——將 `@ref` 標籤分配給輔助功能樹節點並將其映射回 Playwright 定位器——完全建構在 Playwright 的基礎原語之上。感謝 Playwright 團隊打造了如此堅實的基礎。

## 開發

### 先決條件

- [Bun](https://bun.sh/) v1.0+
- Playwright 的 Chromium (透過 `bun install` 自動安裝)

### 快速開始

```bash
bun install              # 安裝依賴項 + Playwright Chromium
bun test                 # 執行整合測試 (~3 秒)
bun run dev <cmd>        # 從原始碼執行 CLI (無需編譯)
bun run build            # 編譯至 browse/dist/browse
```

### 開發模式與已編譯二進位檔

在開發期間，請使用 `bun run dev` 而非已編譯的二進位檔。它會直接使用 Bun 執行 `browse/src/cli.ts`，因此您可以立即獲得回饋而無需編譯步驟：

```bash
bun run dev goto https://example.com
bun run dev text
bun run dev snapshot -i
bun run dev click @e3
```

已編譯的二進位檔 (`bun run build`) 僅用於發布。它使用 Bun 的 `--compile` 旗標在 `browse/dist/browse` 產生一個約 58MB 的單一執行檔。

### 執行測試

```bash
bun test                         # 執行所有測試
bun test browse/test/commands              # 僅執行命令整合測試
bun test browse/test/snapshot              # 僅執行快照測試
bun test browse/test/cookie-import-browser # 僅執行 Cookie 匯入單元測試
```

測試會啟動一個在地的 HTTP 伺服器 (`browse/test/test-server.ts`)，提供來自 `browse/test/fixtures/` 的 HTML 測試用例，然後針對這些頁面測試 CLI 命令。3 個檔案中共包含 203 個測試，總計約 15 秒。

### 原始碼導覽

| 檔案 | 角色 |
|------|------|
| `browse/src/cli.ts` | 入口點。讀取 `.gstack/browse.json`，發送 HTTP 到伺服器，列印回應。 |
| `browse/src/server.ts` | Bun HTTP 伺服器。將命令路由到正確的處理程序。管理閒置逾時。 |
| `browse/src/browser-manager.ts` | Chromium 生命週期 —— 啟動、分頁管理、引用映射、崩潰檢測。 |
| `browse/src/snapshot.ts` | 解析輔助功能樹，分配 `@e`/`@c` 引用，建構定位器映射。處理 `--diff`, `--annotate`, `-C`。 |
| `browse/src/read-commands.ts` | 非變動性命令：`text`, `html`, `links`, `js`, `css`, `is`, `dialog`, `forms` 等。導出 `getCleanText()`。 |
| `browse/src/write-commands.ts` | 變動性命令：`goto`, `click`, `fill`, `upload`, `dialog-accept`, `useragent` (包含上下文重建) 等。 |
| `browse/src/meta-commands.ts` | 伺服器管理、鏈結路由、差異 (透過 `getCleanText` 實現 DRY)、快照委派。 |
| `browse/src/cookie-import-browser.ts` | 透過 macOS 金鑰圈 + PBKDF2/AES-128-CBC 解密 Chromium Cookie。自動偵測已安裝的瀏覽器。 |
| `browse/src/cookie-picker-routes.ts` | `/cookie-picker/*` 的 HTTP 路由 —— 瀏覽器列表、域名搜尋、匯入、移除。 |
| `browse/src/cookie-picker-ui.ts` | 用於互動式 Cookie 選擇器的自包含 HTML 產生器 (深色主題，不使用框架)。 |
| `browse/src/buffers.ts` | `CircularBuffer<T>` (O(1) 環形緩衝區) + 控制台/網路/對話框擷取，支援非同步磁碟排入。 |

### 部署到活躍技能

活躍技能位於 `~/.claude/skills/gstack/`。修改後：

1. 推送您的分支
2. 在技能目錄中拉取：`cd ~/.claude/skills/gstack && git pull`
3. 重新編譯：`cd ~/.claude/skills/gstack && bun run build`

或直接複製二進位檔：`cp browse/dist/browse ~/.claude/skills/gstack/browse/dist/browse`

### 新增命令

1. 在 `read-commands.ts` (非變動性) 或 `write-commands.ts` (變動性) 中新增處理程序。
2. 在 `server.ts` 中註冊路由。
3. 如果需要，在 `browse/test/commands.test.ts` 中新增帶有 HTML 測試用例的測試案例。
4. 執行 `bun test` 進行驗證。
5. 執行 `bun run build` 進行編譯。
