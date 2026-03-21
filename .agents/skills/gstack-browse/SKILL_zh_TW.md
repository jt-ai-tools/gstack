---
name: browse
version: 1.1.0
description: |
  用於 QA 測試與產品體驗 (Dogfooding) 的快速無頭瀏覽器。可導航至任何 URL、與元素互動、
  驗證頁面狀態、比對操作前後的差異、擷取帶有標註的截圖、檢查響應式佈局、測試表單與檔案上傳、
  處理對話框，以及斷言元素狀態。每個指令約 100 毫秒。當你需要測試功能、驗證部署、
  體驗用戶流程或提交帶有證據的 Bug 時使用。當被要求「open in browser」、「test the site」、
  「take a screenshot」或「dogfood this」時使用。
allowed-tools:
  - Bash
  - Read
  - AskUserQuestion

---
<!-- 由 SKILL.md.tmpl 自動生成 — 請勿直接編輯 -->
<!-- 重新生成請執行：bun run gen:skill-docs -->

## 導言 (請先執行)

```bash
_UPD=$(~/.codex/skills/gstack/bin/gstack-update-check 2>/dev/null || .agents/skills/gstack/bin/gstack-update-check 2>/dev/null || true)
[ -n "$_UPD" ] && echo "$_UPD" || true
mkdir -p ~/.gstack/sessions
touch ~/.gstack/sessions/"$PPID"
_SESSIONS=$(find ~/.gstack/sessions -mmin -120 -type f 2>/dev/null | wc -l | tr -d ' ')
find ~/.gstack/sessions -mmin +120 -type f -delete 2>/dev/null || true
_CONTRIB=$(~/.codex/skills/gstack/bin/gstack-config get gstack_contributor 2>/dev/null || true)
_PROACTIVE=$(~/.codex/skills/gstack/bin/gstack-config get proactive 2>/dev/null || echo "true")
_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
echo "BRANCH: $_BRANCH"
echo "PROACTIVE: $_PROACTIVE"
_LAKE_SEEN=$([ -f ~/.gstack/.completeness-intro-seen ] && echo "yes" || echo "no")
echo "LAKE_INTRO: $_LAKE_SEEN"
_TEL=$(~/.codex/skills/gstack/bin/gstack-config get telemetry 2>/dev/null || true)
_TEL_PROMPTED=$([ -f ~/.gstack/.telemetry-prompted ] && echo "yes" || echo "no")
_TEL_START=$(date +%s)
_SESSION_ID="$$-$(date +%s)"
echo "TELEMETRY: ${_TEL:-off}"
echo "TEL_PROMPTED: $_TEL_PROMPTED"
mkdir -p ~/.gstack/analytics
echo '{"skill":"browse","ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","repo":"'$(basename "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || echo "unknown")'"}'  >> ~/.gstack/analytics/skill-usage.jsonl 2>/dev/null || true
for _PF in ~/.gstack/analytics/.pending-*; do [ -f "$_PF" ] && ~/.codex/skills/gstack/bin/gstack-telemetry-log --event-type skill_run --skill _pending_finalize --outcome unknown --session-id "$_SESSION_ID" 2>/dev/null || true; break; done
```

如果 `PROACTIVE` 為 `"false"`，請勿主動建議 gstack 技能 — 僅在用戶明確要求時才調用它們。用戶已選擇退出主動建議。

如果輸出顯示 `UPGRADE_AVAILABLE <old> <new>`：請閱讀 `~/.codex/skills/gstack/gstack-upgrade/SKILL_zh_TW.md` 並遵循「內聯升級流程」（若已配置則自動升級，否則使用 AskUserQuestion 提供 4 個選項，若拒絕則寫入推遲狀態）。如果顯示 `JUST_UPGRADED <from> <to>`：告訴用戶「正在運行 gstack v{to}（剛剛已更新！）」並繼續。

如果 `LAKE_INTRO` 為 `no`：在繼續之前，介紹完整性原則 (Completeness Principle)。
告訴用戶：「gstack 遵循 **『沸騰湖水』 (Boil the Lake)** 原則 — 當 AI 讓邊際成本接近於零時，始終選擇完成最完整的實作。閱讀更多：https://garryslist.org/posts/boil-the-ocean」
然後提議在他們的預設瀏覽器中開啟該文章：

```bash
open https://garryslist.org/posts/boil-the-ocean
touch ~/.gstack/.completeness-intro-seen
```

僅在用戶同意時執行 `open`。始終執行 `touch` 將其標記為已看過。這只會發生一次。

## AskUserQuestion 格式

**每次調用 AskUserQuestion 時，請務必遵循此結構：**
1. **重新定位 (Re-ground)：** 說明專案名稱、當前分支（使用導言中列印的 `_BRANCH` 值 — **不要** 使用對話歷史或 gitStatus 中的任何分支名稱）以及當前的計劃/任務。（1-2 句話）
2. **簡化 (Simplify)：** 用平易近人的語言解釋問題，讓一個聰明的 16 歲少年也能聽懂。不要使用原始函式名稱、內部術語或實作細節。使用具體的例子和類比。說明它「做什麼」，區域它「叫什麼」。
3. **建議 (Recommend)：** `建議：選擇 [X]，因為 [一行理由]` — 始終優先選擇完整方案而非捷徑（參見完整性原則）。為每個選項包含 `完整度: X/10`。校準基準：10 = 完整實作（所有邊際情況、完整覆蓋）、7 = 涵蓋正常路徑但跳過部分邊際情況、3 = 會延後大量工作的捷徑。如果兩個選項都在 8 分以上，選擇較高的那個；如果其中一個 ≤ 5 分，請對其標記。
4. **選項 (Options)：** 字母編號選項：`A) ... B) ... C) ...` — 當選項涉及工作量時，同時顯示兩種尺度：`(人類: ~X / CC: ~Y)`

假設用戶已經 20 分鐘沒看這個視窗了，且沒有開啟代碼。如果你需要閱讀源碼才能理解自己的解釋，那它就太複雜了。

## 完整性原則 — 沸騰湖水 (Boil the Lake)

AI 輔助編程使完整性的邊際成本接近於零。當你提供選項時：

- 如果選項 A 是完整實作（完全對等、所有邊際情況、100% 覆蓋率），而選項 B 是節省少量工作量的捷徑 —— **始終建議 A**。在使用 CC+gstack 的情況下，80 行與 150 行之間的差異是微不足道的。當「完整」僅需多花幾分鐘時，「夠好就好」是錯誤的直覺。
- **湖泊 vs. 海洋：** 「湖泊」是可以煮沸的 —— 例如模組的 100% 測試覆蓋率、完整的功能實作、處理所有邊際情況、完整的錯誤路徑。「海洋」則不然 —— 例如從頭重寫整個系統、在你不受控的依賴項中新增功能、跨越多個季度的平台遷移。建議煮沸湖泊。將海洋標記為超出範疇。
- **估算工作量時**，始終顯示兩種尺度：人類團隊時間與 CC+gstack 時間。壓縮率隨任務類型而異 —— 請參考此對照表：

| 任務類型 | 人類團隊 | CC+gstack | 壓縮率 |
|-----------|-----------|-----------|-------------|
| 樣板代碼 / 腳手架 | 2 天 | 15 分鐘 | ~100x |
| 撰寫測試 | 1 天 | 15 分鐘 | ~50x |
| 功能實作 | 1 週 | 30 分鐘 | ~30x |
| Bug 修復 + 回歸測試 | 4 小時 | 15 分鐘 | ~20x |
| 架構 / 設計 | 2 天 | 4 小時 | ~5x |
| 研究 / 探索 | 1 天 | 3 小時 | ~3x |

## 貢獻者模式

如果 `_CONTRIB` 為 `true`：你正處於 **貢獻者模式**。你既是 gstack 用戶，也在協助它變得更好。

**在每個主要工作流步驟結束時**（而非每個指令後），反映你使用的 gstack 工具。給你的體驗打 0 到 10 分。如果不是 10 分，思考原因。如果存在明顯、可操作的 Bug，或是對於 gstack 代碼或技能 Markdown 可以做得更好的深刻見解 —— 提交一份實地報告。

Slug：小寫、連字號、最多 60 個字元（例如 `browse-js-no-await`）。如果檔案已存在則跳過。每個會話最多 3 份報告。內聯提交並繼續 — 不要停止工作流。告訴用戶：「已提交 gstack 實地報告：{標題}」

## 遙測 (最後執行)

在技能工作流完成後（成功、錯誤或中止），記錄遙測事件。
從此檔案 YAML frontmatter 的 `name:` 欄位確定技能名稱。
根據工作流結果確定結果（正常完成為 success，失敗為 error，用戶中斷為 abort）。

執行此 bash：

```bash
_TEL_END=$(date +%s)
_TEL_DUR=$(( _TEL_END - _TEL_START ))
rm -f ~/.gstack/analytics/.pending-"$_SESSION_ID" 2>/dev/null || true
~/.codex/skills/gstack/bin/gstack-telemetry-log \
  --skill "SKILL_NAME" --duration "$_TEL_DUR" --outcome "OUTCOME" \
  --used-browse "USED_BROWSE" --session-id "$_SESSION_ID" 2>/dev/null &
```

將 `SKILL_NAME` 替換為 frontmatter 中的實際技能名稱，`OUTCOME` 替換為 success/error/abort，並根據是否使用了 `$B` 將 `USED_BROWSE` 替換為 true/false。

# browse: QA 測試與產品體驗

持久化的無頭 Chromium。第一次調用自動啟動（約 3 秒），之後每個指令約 100 毫秒。
狀態在調用之間持久存在（Cookie、分頁、登入會話）。

## 設置 (在執行任何瀏覽指令前，請先執行此檢查)

```bash
_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
B=""
[ -n "$_ROOT" ] && [ -x "$_ROOT/.agents/skills/gstack/browse/dist/browse" ] && B="$_ROOT/.agents/skills/gstack/browse/dist/browse"
[ -z "$B" ] && B=~/.codex/skills/gstack/browse/dist/browse
if [ -x "$B" ]; then
  echo "READY: $B"
else
  echo "NEEDS_SETUP"
fi
```

如果顯示 `NEEDS_SETUP`：
1. 告訴用戶：「gstack browse 需要一次性建置（約 10 秒）。是否繼續？」然後停止並等待。
2. 執行：`cd <SKILL_DIR> && ./setup`
3. 如果未安裝 `bun`：`curl -fsSL https://bun.sh/install | bash`

## 核心 QA 模式

### 1. 驗證頁面是否正常載入
```bash
$B goto https://yourapp.com
$B text                          # 內容已載入？
$B console                       # 有 JS 錯誤嗎？
$B network                       # 有失敗的請求嗎？
$B is visible ".main-content"    # 關鍵元素是否存在？
```

### 2. 測試用戶流程
```bash
$B goto https://app.com/login
$B snapshot -i                   # 查看所有互動元素
$B fill @e3 "user@test.com"
$B fill @e4 "password"
$B click @e5                     # 提交
$B snapshot -D                   # 差異比對：提交後發生了什麼變化？
$B is visible ".dashboard"       # 成功狀態是否存在？
```

### 3. 驗證操作是否生效
```bash
$B snapshot                      # 基準線
$B click @e3                     # 執行動作
$B snapshot -D                   # 統一差異顯示精確的變動
```

### 4. 為 Bug 報告提供視覺證據
```bash
$B snapshot -i -a -o /tmp/annotated.png   # 帶標籤的截圖
$B screenshot /tmp/bug.png                # 普通截圖
$B console                                # 錯誤日誌
```

### 5. 尋找所有可點擊元素（包含非 ARIA 元素）
```bash
$B snapshot -C                   # 尋找帶有 cursor:pointer, onclick, tabindex 的 div
$B click @c1                     # 與之互動
```

### 6. 斷言元素狀態
```bash
$B is visible ".modal"
$B is enabled "#submit-btn"
$B is disabled "#submit-btn"
$B is checked "#agree-checkbox"
$B is editable "#name-field"
$B is focused "#search-input"
$B js "document.body.textContent.includes('Success')"
```

### 7. 測試響應式佈局
```bash
$B responsive /tmp/layout        # 手機 + 平板 + 電腦截圖
$B viewport 375x812              # 或設置特定視窗大小
$B screenshot /tmp/mobile.png
```

### 8. 測試檔案上傳
```bash
$B upload "#file-input" /path/to/file.pdf
$B is visible ".upload-success"
```

### 9. 測試對話框
```bash
$B dialog-accept "yes"           # 設置處理程序
$B click "#delete-button"        # 觸發對話框
$B dialog                        # 查看出現了什麼
$B snapshot -D                   # 驗證刪除是否成功
```

### 10. 比較環境
```bash
$B diff https://staging.app.com https://prod.app.com
```

### 11. 向用戶展示截圖
在執行 `$B screenshot`、`$B snapshot -a -o` 或 `$B responsive` 之後，務必對輸出的 PNG 檔案使用 Read 工具，以便用戶查看。否則，截圖將不可見。

## 用戶接手 (User Handoff)

當你在無頭模式下遇到無法處理的情況（驗證碼、複雜身份驗證、多重驗證登入）時，請移交給用戶：

```bash
# 1. 在當前頁面開啟一個可見的 Chrome
$B handoff "在登入頁面卡在驗證碼上"

# 2. 告訴用戶發生了什麼（透過 AskUserQuestion）
#    「我已在登入頁面開啟 Chrome。請協助解決驗證碼問題，
#     完成後請告訴我。」

# 3. 當用戶說「完成」時，重新擷取快照並繼續
$B resume
```

**何時使用接手：**
- 驗證碼 (CAPTCHA) 或機器人偵測
- 多重驗證 (SMS、驗證器應用程式)
- 需要用戶互動的 OAuth 流程
- 嘗試 3 次後仍無法處理的複雜互動

瀏覽器在接手過程中保留所有狀態（Cookie、localStorage、分頁）。
在 `resume` 後，你會從用戶中斷的地方獲得一個新鮮的快照。

## 快照旗標 (Snapshot Flags)

快照是你理解頁面並與之互動的主要工具。

```
-i        --interactive           僅限互動元素（按鈕、連結、輸入框），帶有 @e 引用
-c        --compact               精簡模式（無空白結構節點）
-d <N>    --depth                 限制樹深度（0 = 僅根節點，預設：無限制）
-s <sel>  --selector              限定於特定的 CSS 選擇器範圍
-D        --diff                  與前一次快照的統一差異比對（第一次調用存儲基準）
-a        --annotate              帶有紅色覆蓋框與引用標籤的標註截圖
-o <path> --output                標註截圖的輸出路徑（預設：<temp>/browse-annotated.png）
-C        --cursor-interactive    游標互動元素（@c 引用 — 帶有 pointer, onclick 的 div）
```

所有旗標均可自由組合。`-o` 僅在同時使用 `-a` 時生效。
範例：`$B snapshot -i -a -C -o /tmp/annotated.png`

**引用編號：** @e 引用按樹狀順序依序分配（@e1, @e2, ...）。來自 `-C` 的 @c 引用則單獨編號（@c1, @c2, ...）。

快照後，在任何指令中使用 @引用 作為選擇器：
```bash
$B click @e3       $B fill @e4 "value"     $B hover @e1
$B html @e2        $B css @e5 "color"      $B attrs @e6
$B click @c1       # 游標互動引用 (來自 -C)
```

**輸出格式：** 帶縮排的無障礙樹，包含 @引用 ID，每行一個元素。
```
  @e1 [heading] "Welcome" [level=1]
  @e2 [textbox] "Email"
  @e3 [button] "Submit"
```

引用在頁面導航後會失效 — 在執行 `goto` 後請重新執行 `snapshot`。

## 完整指令清單

### 導航 (Navigation)
| 指令 | 說明 |
|---------|-------------|
| `back` | 歷史紀錄回退 |
| `forward` | 歷史紀錄前進 |
| `goto <url>` | 導航至 URL |
| `reload` | 重新整理頁面 |
| `url` | 列印當前 URL |

### 讀取 (Reading)
| 指令 | 說明 |
|---------|-------------|
| `accessibility` | 完整的 ARIA 樹 |
| `forms` | 以 JSON 回傳表單欄位 |
| `html [selector]` | 選擇器的 innerHTML（找不到則報錯），若未提供選擇器則回傳全頁 HTML |
| `links` | 所有連結，格式為「文字 → href」 |
| `text` | 清理後的頁面文字 |

### 互動 (Interaction)
| 指令 | 說明 |
|---------|-------------|
| `click <sel>` | 點擊元素 |
| `cookie <name>=<value>` | 在當前頁面域名設置 Cookie |
| `cookie-import <json>` | 從 JSON 檔案匯入 Cookie |
| `cookie-import-browser [browser] [--domain d]` | 從 Comet, Chrome, Arc, Brave 或 Edge 匯入 Cookie（開啟選擇器，或使用 --domain 直接匯入） |
| `dialog-accept [text]` | 自動接受下一個 alert/confirm/prompt。選填文字將作為提示框的回應發送 |
| `dialog-dismiss` | 自動取消下一個對話框 |
| `fill <sel> <val>` | 填寫輸入框 |
| `header <name>:<value>` | 設置自定義請求標頭（冒號分隔，敏感值會自動遮蔽） |
| `hover <sel>` | 懸停於元素 |
| `press <key>` | 按下按鍵 — Enter, Tab, Escape, ArrowUp/Down/Left/Right, Backspace, Delete, Home, End, PageUp, PageDown，或 Shift+Enter 等修飾鍵 |
| `scroll [sel]` | 捲動元素至可見範圍，若無選擇器則捲動至頁面底部 |
| `select <sel> <val>` | 透過值、標籤或可見文字選擇下拉選單選項 |
| `type <text>` | 輸入文字至當前焦點元素 |
| `upload <sel> <file> [file2...]` | 上傳檔案 |
| `useragent <string>` | 設置 User Agent |
| `viewport <WxH>` | 設置視窗大小 |
| `wait <sel|--networkidle|--load>` | 等待元素、網路閒置或頁面載入（逾時：15 秒） |

### 檢查 (Inspection)
| 指令 | 說明 |
|---------|-------------|
| `attrs <sel|@ref>` | 以 JSON 回傳元素屬性 |
| `console [--clear|--errors]` | 控制台訊息（--errors 僅過濾錯誤/警告） |
| `cookies` | 以 JSON 回傳所有 Cookie |
| `css <sel> <prop>` | 計算後的 CSS 屬性值 |
| `dialog [--clear]` | 對話框訊息 |
| `eval <file>` | 從檔案執行 JavaScript 並以字串回傳結果（路徑必須在 /tmp 或當前目錄下） |
| `is <prop> <sel>` | 狀態檢查 (visible/hidden/enabled/disabled/checked/editable/focused) |
| `js <expr>` | 執行 JavaScript 表達式並以字串回傳結果 |
| `network [--clear]` | 網路請求 |
| `perf` | 頁面載入耗時統計 |
| `storage [set k v]` | 以 JSON 讀取所有 localStorage + sessionStorage，或設置鍵值寫入 localStorage |

### 視覺 (Visual)
| 指令 | 說明 |
|---------|-------------|
| `diff <url1> <url2>` | 頁面間的文字差異比對 |
| `pdf [path]` | 儲存為 PDF |
| `responsive [prefix]` | 在手機 (375x812)、平板 (768x1024)、電腦 (1280x720) 下截圖。儲存為 {prefix}-mobile.png 等 |
| `screenshot [--viewport] [--clip x,y,w,h] [selector|@ref] [path]` | 儲存截圖（支援 CSS/@ref 元素裁剪、--clip 區域裁剪、--viewport 視窗裁剪） |

### 快照 (Snapshot)
| 指令 | 說明 |
|---------|-------------|
| `snapshot [flags]` | 帶有 @e 引用的無障礙樹，用於元素選擇。旗標：-i 僅互動, -c 精簡, -d N 深度限制, -s sel 範圍, -D 比對前次, -a 標註截圖, -o 路徑輸出, -C 游標互動 @c 引用 |

### 元操作 (Meta)
| 指令 | 說明 |
|---------|-------------|
| `chain` | 從 JSON 標準輸入執行多個指令。格式：[["cmd","arg1",...],...] |

### 分頁 (Tabs)
| 指令 | 說明 |
|---------|-------------|
| `closetab [id]` | 關閉分頁 |
| `newtab [url]` | 開啟新分頁 |
| `tab <id>` | 切換分頁 |
| `tabs` | 列出開啟的分頁 |

### 伺服器 (Server)
| 指令 | 說明 |
|---------|-------------|
| `handoff [message]` | 在當前頁面開啟可見的 Chrome 供用戶接手操作 |
| `restart` | 重啟伺服器 |
| `resume` | 用戶接手後重新執行快照，並將控制權交還給 AI |
| `status` | 健康檢查 |
| `stop` | 關閉伺服器 |
