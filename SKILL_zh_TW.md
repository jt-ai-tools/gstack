---
name: gstack
version: 1.1.0
description: |
  用於 QA 測試與產品體驗 (Dogfooding) 的快速無頭瀏覽器。可導航至任何 URL、與元素互動、驗證頁面狀態、
  比對操作前後的差異、擷取帶有標註的截圖、檢查響應式佈局、測試表單與檔案上傳、處理對話框，以及斷言元素狀態。
  每個指令約 100 毫秒。當你需要測試功能、驗證部署、體驗用戶流程或提交帶有證據的 Bug 時使用。

  gstack 還包含開發工作流技能。當你注意到用戶處於以下階段時，請建議適當的技能：
  - 腦力激盪新想法 → 建議 /office-hours
  - 審核計劃（策略層面） → 建議 /plan-ceo-review
  - 審核計劃（架構層面） → 建議 /plan-eng-review
  - 審核計劃（設計層面） → 建議 /plan-design-review
  - 建立設計系統 → 建議 /design-consultation
  - 除錯錯誤 → 建議 /investigate
  - 測試應用程式 → 建議 /qa
  - 合併前的代碼審核 → 建議 /review
  - 視覺設計審計 → 建議 /design-review
  - 準備部署 / 建立 PR → 建議 /ship
  - 交付後的文件更新 → 建議 /document-release
  - 每週回顧 → 建議 /retro
  - 需要第二意見或對抗性代碼審核 → 建議 /codex
  - 處理生產或直播系統 → 建議 /careful
  - 想要將編輯範圍縮小到單一模組/目錄 → 建議 /freeze
  - 全面安全模式（破壞性警告 + 編輯限制） → 建議 /guard
  - 移除編輯限制 → 建議 /unfreeze
  - 將 gstack 升級到最新版本 → 建議 /gstack-upgrade

  如果用戶反對技能建議（例如「停止建議」、「我不需要建議」、「太激進了」）：
  1. 在本會話的剩餘時間內停止建議
  2. 執行：gstack-config set proactive false
  3. 說：「收到了 — 我會停止主動建議技能。如果你改變主意，隨時告訴我恢復主動模式。」

  如果用戶說「恢復主動模式」或「開啟建議」：
  1. 執行：gstack-config set proactive true
  2. 說：「主動建議功能已重新開啟。」
allowed-tools:
  - Bash
  - Read
  - AskUserQuestion

---
<!-- 由 SKILL.md.tmpl 自動生成 — 請勿直接編輯 -->
<!-- 重新生成請執行：bun run gen:skill-docs -->

## 導言 (請先執行)

```bash
_UPD=$(~/.claude/skills/gstack/bin/gstack-update-check 2>/dev/null || .claude/skills/gstack/bin/gstack-update-check 2>/dev/null || true)
[ -n "$_UPD" ] && echo "$_UPD" || true
mkdir -p ~/.gstack/sessions
touch ~/.gstack/sessions/"$PPID"
_SESSIONS=$(find ~/.gstack/sessions -mmin -120 -type f 2>/dev/null | wc -l | tr -d ' ')
find ~/.gstack/sessions -mmin +120 -type f -delete 2>/dev/null || true
_CONTRIB=$(~/.claude/skills/gstack/bin/gstack-config get gstack_contributor 2>/dev/null || true)
_PROACTIVE=$(~/.claude/skills/gstack/bin/gstack-config get proactive 2>/dev/null || echo "true")
_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
echo "BRANCH: $_BRANCH"
echo "PROACTIVE: $_PROACTIVE"
_LAKE_SEEN=$([ -f ~/.gstack/.completeness-intro-seen ] && echo "yes" || echo "no")
echo "LAKE_INTRO: $_LAKE_SEEN"
_TEL=$(~/.claude/skills/gstack/bin/gstack-config get telemetry 2>/dev/null || true)
_TEL_PROMPTED=$([ -f ~/.gstack/.telemetry-prompted ] && echo "yes" || echo "no")
_TEL_START=$(date +%s)
_SESSION_ID="$$-$(date +%s)"
echo "TELEMETRY: ${_TEL:-off}"
echo "TEL_PROMPTED: $_TEL_PROMPTED"
mkdir -p ~/.gstack/analytics
echo '{"skill":"gstack","ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","repo":"'$(basename "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || echo "unknown")'"}'  >> ~/.gstack/analytics/skill-usage.jsonl 2>/dev/null || true
for _PF in ~/.gstack/analytics/.pending-*; do [ -f "$_PF" ] && ~/.claude/skills/gstack/bin/gstack-telemetry-log --event-type skill_run --skill _pending_finalize --outcome unknown --session-id "$_SESSION_ID" 2>/dev/null || true; break; done
```

如果 `PROACTIVE` 為 `"false"`，請勿主動建議 gstack 技能 — 僅在用戶明確要求時才調用它們。用戶已選擇退出主動建議。

如果輸出顯示 `UPGRADE_AVAILABLE <old> <new>`：請閱讀 `~/.claude/skills/gstack/gstack-upgrade/SKILL_zh_TW.md` 並遵循「內聯升級流程」（若已配置則自動升級，否則使用 AskUserQuestion 提供 4 個選項，若拒絕則寫入推遲狀態）。如果顯示 `JUST_UPGRADED <from> <to>`：告訴用戶「正在運行 gstack v{to}（剛剛已更新！）」並繼續。

如果 `LAKE_INTRO` 為 `no`：在繼續之前，介紹完整性原則 (Completeness Principle)。
告訴用戶：「gstack 遵循 **『沸騰湖水』 (Boil the Lake)** 原則 — 當 AI 讓邊際成本接近於零時，始終選擇完成最完整的實作。閱讀更多：https://garryslist.org/posts/boil-the-ocean」
然後提議在他們的預設瀏覽器中開啟該文章：

```bash
open https://garryslist.org/posts/boil-the-ocean
touch ~/.gstack/.completeness-intro-seen
```

僅在用戶同意時執行 `open`。始終執行 `touch` 將其標記為已看過。這只會發生一次。

如果 `TEL_PROMPTED` 為 `no` 且 `LAKE_INTRO` 為 `yes`：在處理完湖水介紹後，詢問用戶關於遙測的問題。使用 AskUserQuestion：

> 幫助 gstack 變得更好！社群模式會分享使用數據（你使用了哪些技能、花費多少時間、崩潰資訊），並帶有穩定的裝置 ID，以便我們追蹤趨勢並更快修復 Bug。
> 絕不會發送代碼、檔案路徑或倉庫名稱。
> 隨時可透過 `gstack-config set telemetry off` 進行更改。

選項：
- A) 幫助 gstack 變得更好！（推薦）
- B) 不用了，謝謝

若選擇 A：執行 `~/.claude/skills/gstack/bin/gstack-config set telemetry community`

若選擇 B：詢問後續的 AskUserQuestion：

> 那麼匿名模式呢？我們僅會得知「有人」使用了 gstack — 沒有唯一 ID，無法關聯會話。僅作為一個計數器，幫助我們了解是否有人在使用。

選項：
- A) 沒問題，匿名模式可以
- B) 不用了，謝謝，完全關閉

若選擇 B→A：執行 `~/.claude/skills/gstack/bin/gstack-config set telemetry anonymous`
若選擇 B→B：執行 `~/.claude/skills/gstack/bin/gstack-config set telemetry off`

始終執行：
```bash
touch ~/.gstack/.telemetry-prompted
```

這只會發生一次。如果 `TEL_PROMPTED` 為 `yes`，請完全跳過此步驟。

## AskUserQuestion 格式

**每次調用 AskUserQuestion 時，請務必遵循此結構：**
1. **重新定位 (Re-ground)：** 說明專案名稱、當前分支（使用導言中列印的 `_BRANCH` 值 — **不要** 使用對話歷史或 gitStatus 中的任何分支名稱）以及當前的計劃/任務。（1-2 句話）
2. **簡化 (Simplify)：** 用平易近人的語言解釋問題，讓一個聰明的 16 歲少年也能聽懂。不要使用原始函式名稱、內部術語或實作細節。使用具體的例子和類比。說明它「做什麼」，而不是它「叫什麼」。
3. **建議 (Recommend)：** `建議：選擇 [X]，因為 [一行理由]` — 始終優先選擇完整方案而非捷徑（參見完整性原則）。為每個選項包含 `完整度: X/10`。校準基準：10 = 完整實作（所有邊際情況、完整覆蓋）、7 = 涵蓋正常路徑但跳過部分邊際情況、3 = 會延後大量工作的捷徑。如果兩個選項都在 8 分以上，選擇較高的那個；如果其中一個 ≤ 5 分，請對其標記。
4. **選項 (Options)：** 字母編號選項：`A) ... B) ... C) ...` — 當選項涉及工作量時，同時顯示兩種尺度：`(人類: ~X / CC: ~Y)`

假設用戶已經 20 分鐘沒看這個視窗了，且沒有開啟代碼。如果你需要閱讀源碼才能理解自己的解釋，那它就太複雜了。

各項技能的說明可能會在此基準之上增加額外的格式化規則。

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

- 此原則適用於測試覆蓋率、錯誤處理、文件撰寫、邊際情況以及功能完整性。不要為了「節省時間」而跳過最後 10% —— 有了 AI，那 10% 僅需幾秒鐘。

**反模式 — 不要這樣做：**
- 錯誤做法：「選擇 B — 它以較少的代碼涵蓋了 90% 的價值。」（如果 A 只多出 70 行代碼，請選擇 A。）
- 錯誤做法：「為了節省時間，我們可以跳過邊際情況處理。」（使用 CC 處理邊際情況僅需幾分鐘。）
- 錯誤做法：「讓我們把測試覆蓋率延後到後續的 PR。」（測試是最容易煮沸的湖泊。）
- 錯誤做法：僅引用人類團隊的工作量：「這需要 2 週時間。」（應說：「人類需 2 週 / CC 約 1 小時。」）

## 貢獻者模式

如果 `_CONTRIB` 為 `true`：你正處於 **貢獻者模式**。你既是 gstack 用戶，也在協助它變得更好。

**在每個主要工作流步驟結束時**（而非每個指令後），反映你使用的 gstack 工具。給你的體驗打 0 到 10 分。如果不是 10 分，思考原因。如果存在明顯、可操作的 Bug，或是對於 gstack 代碼或技能 Markdown 可以做得更好的深刻見解 —— 提交一份實地報告。也許我們的貢獻者能協助我們進步！

**校準基準 — 這是門檻：** 例如，`$B js "await fetch(...)"` 曾因 gstack 未將表達式封裝在非同步上下文中而導致 `SyntaxError: await is only valid in async functions` 失敗。雖然很小，但輸入是合理的且 gstack 應該要能處理 —— 這就是值得提交的內容。比這更微不足道的事情，請忽略。

**不值得提交的內容：** 用戶應用程式的 Bug、用戶 URL 的網路錯誤、用戶網站的驗證失敗、用戶自身的 JS 邏輯錯誤。

**如何提交：** 撰寫 `~/.gstack/contributor-logs/{slug}.md`，包含 **以下所有章節**（不要截斷 — 包含直到日期/版本頁尾的所有內容）：

```
# {標題}

嘿 gstack 團隊 — 在使用 /{技能名稱} 時遇到了這個問題：

**我當時嘗試做什麼：** {用戶/代理嘗試進行的操作}
**結果發生了什麼：** {實際發生的情況}
**我的評分：** {0-10} — {為什麼不是 10 分的一句話理由}

## 重現步驟
1. {步驟}

## 原始輸出
```
{在此處貼上實際的錯誤或意外輸出}
```

## 什麼能讓它達到 10 分
{一句話：gstack 應該如何做出不同的處理}

**日期：** {YYYY-MM-DD} | **版本：** {gstack 版本} | **技能：** /{技能}
```

Slug：小寫、連字號、最多 60 個字元（例如 `browse-js-no-await`）。如果檔案已存在則跳過。每個會話最多 3 份報告。內聯提交並繼續 — 不要停止工作流。告訴用戶：「已提交 gstack 實地報告：{標題}」

## 完成狀態協議 (Completion Status Protocol)

在完成一項技能工作流時，請使用以下狀態之一進行報告：
- **DONE** — 所有步驟成功完成。為每項主張提供證據。
- **DONE_WITH_CONCERNS** — 已完成，但存在用戶應知曉的問題。列出每項疑慮。
- **BLOCKED** — 無法繼續。說明阻礙原因以及嘗試過的做法。
- **NEEDS_CONTEXT** — 缺失繼續進行所需的資訊。確切說明你需要什麼。

### 呈報 (Escalation)

隨時可以停下來並說「這對我來說太難了」或「我對這個結果沒有信心」。

糟糕的工作比不工作更糟。你不會因為呈報而受到懲罰。
- 如果你嘗試一項任務 3 次仍未成功，請停止並呈報。
- 如果你對涉及安全敏感的變更有疑慮，請停止並呈報。
- 如果工作範疇超出了你所能驗證的範圍，請停止並呈報。

呈報格式：
```
狀態：BLOCKED | NEEDS_CONTEXT
原因：[1-2 句話]
嘗試過：[你嘗試過的做法]
建議：[用戶下一步該做什麼]
```

## 遙測 (最後執行)

在技能工作流完成後（成功、錯誤或中止），記錄遙測事件。
從此檔案 YAML frontmatter 的 `name:` 欄位確定技能名稱。
根據工作流結果確定結果（正常完成為 success，失敗為 error，用戶中斷為 abort）。

**計劃模式例外 — 務必執行：** 此指令將遙測寫入 `~/.gstack/analytics/`（用戶配置目錄，而非專案檔案）。技能導言已經寫入同一個目錄 — 這是相同的模式。跳過此指令會失去會話持續時間與結果數據。

執行此 bash：

```bash
_TEL_END=$(date +%s)
_TEL_DUR=$(( _TEL_END - _TEL_START ))
rm -f ~/.gstack/analytics/.pending-"$_SESSION_ID" 2>/dev/null || true
~/.claude/skills/gstack/bin/gstack-telemetry-log \
  --skill "SKILL_NAME" --duration "$_TEL_DUR" --outcome "OUTCOME" \
  --used-browse "USED_BROWSE" --session-id "$_SESSION_ID" 2>/dev/null &
```

將 `SKILL_NAME` 替換為 frontmatter 中的實際技能名稱，`OUTCOME` 替換為 success/error/abort，並根據是否使用了 `$B` 將 `USED_BROWSE` 替換為 true/false。如果你無法確定結果，請使用 "unknown"。這在背景運行，絕不會阻礙用戶。

如果 `PROACTIVE` 為 `false`：請勿在本會話期間主動建議其他 gstack 技能。僅執行用戶明確調用的技能。此偏好會透過 `gstack-config` 跨會話持久存在。

# gstack browse: QA 測試與產品體驗

持久化的無頭 Chromium。第一次調用自動啟動（約 3 秒），之後每個指令約 100-200 毫秒。
閒置 30 分鐘後自動關閉。狀態在調用之間持久存在（Cookie、分頁、會話）。

## 設置 (在執行任何瀏覽指令前，請先執行此檢查)

```bash
_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
B=""
[ -n "$_ROOT" ] && [ -x "$_ROOT/.claude/skills/gstack/browse/dist/browse" ] && B="$_ROOT/.claude/skills/gstack/browse/dist/browse"
[ -z "$B" ] && B=~/.claude/skills/gstack/browse/dist/browse
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

## 重要事項

- 透過 Bash 使用編譯後的二進位檔：`$B <指令>`
- **絕不** 使用 `mcp__claude-in-chrome__*` 工具。它們緩慢且不可靠。
- 瀏覽器在調用之間保持持久 — Cookie、登入會話與分頁會延續使用。
- 對話框 (alert/confirm/prompt) 預設會自動接受 — 不會鎖死瀏覽器。
- **顯示截圖：** 在 `$B screenshot`、`$B snapshot -a -o` 或 `$B responsive` 之後，務必對輸出的 PNG 檔案使用 Read 工具，以便用戶查看。否則，截圖將不可見。

## QA 工作流

### 測試用戶流程（登入、註冊、結帳等）

```bash
# 1. 前往頁面
$B goto https://app.example.com/login

# 2. 查看哪些內容可互動
$B snapshot -i

# 3. 使用引用填寫表單
$B fill @e3 "test@example.com"
$B fill @e4 "password123"
$B click @e5

# 4. 驗證是否成功
$B snapshot -D              # diff 顯示點擊後的變更
$B is visible ".dashboard"  # 斷言儀表板已出現
$B screenshot /tmp/after-login.png
```

### 驗證部署 / 檢查生產環境

```bash
$B goto https://yourapp.com
$B text                          # 讀取頁面 — 是否已載入？
$B console                       # 有任何 JS 錯誤嗎？
$B network                       # 有任何失敗的請求嗎？
$B js "document.title"           # 標題正確嗎？
$B is visible ".hero-section"    # 關鍵元素是否存在？
$B screenshot /tmp/prod-check.png
```

### 端到端體驗一項功能 (Dogfooding)

```bash
# 導航至該功能
$B goto https://app.example.com/new-feature

# 擷取帶標註的截圖 — 顯示所有帶有標籤的互動元素
$B snapshot -i -a -o /tmp/feature-annotated.png

# 尋找所有可點擊的東西（包含 cursor:pointer 的 div）
$B snapshot -C

# 走一遍流程
$B snapshot -i          # 基準線
$B click @e3            # 互動
$B snapshot -D          # 什麼變了？（統一差異比對）

# 檢查元素狀態
$B is visible ".success-toast"
$B is enabled "#next-step-btn"
$B is checked "#agree-checkbox"

# 互動後檢查控制台是否有錯誤
$B console
```

### 測試響應式佈局

```bash
# 快速測試：手機/平板/電腦 3 種截圖
$B goto https://yourapp.com
$B responsive /tmp/layout

# 手動測試：特定視窗大小
$B viewport 375x812     # iPhone
$B screenshot /tmp/mobile.png
$B viewport 1440x900    # 電腦
$B screenshot /tmp/desktop.png

# 元素截圖（裁剪至特定元素）
$B screenshot "#hero-banner" /tmp/hero.png
$B snapshot -i
$B screenshot @e3 /tmp/button.png

# 區域裁剪
$B screenshot --clip 0,0,800,600 /tmp/above-fold.png

# 僅限當前視窗（不捲動）
$B screenshot --viewport /tmp/viewport.png
```

### 測試檔案上傳

```bash
$B goto https://app.example.com/upload
$B snapshot -i
$B upload @e3 /path/to/test-file.pdf
$B is visible ".upload-success"
$B screenshot /tmp/upload-result.png
```

### 測試帶有驗證的表單

```bash
$B goto https://app.example.com/form
$B snapshot -i

# 空白提交 — 檢查驗證錯誤是否出現
$B click @e10                        # 提交按鈕
$B snapshot -D                       # diff 顯示錯誤訊息已出現
$B is visible ".error-message"

# 填寫並重新提交
$B fill @e3 "valid input"
$B click @e10
$B snapshot -D                       # diff 顯示錯誤消失，進入成功狀態
```

### 測試對話框（刪除確認、提示框）

```bash
# 在觸發前設置對話框處理
$B dialog-accept              # 將自動接受下一個 alert/confirm
$B click "#delete-button"     # 觸發確認對話框
$B dialog                     # 查看出現了什麼對話框
$B snapshot -D                # 驗證項目已被刪除

# 對於需要輸入的提示框 (prompts)
$B dialog-accept "我的答案"    # 帶文字接受
$B click "#rename-button"     # 觸發提示框
```

### 測試需要身份驗證的頁面（匯入真實瀏覽器的 Cookie）

```bash
# 從你的真實瀏覽器匯入 Cookie（開啟互動式選擇器）
$B cookie-import-browser

# 或直接匯入特定域名
$B cookie-import-browser comet --domain .github.com

# 現在測試需要身份驗證的頁面
$B goto https://github.com/settings/profile
$B snapshot -i
$B screenshot /tmp/github-profile.png
```

### 比較兩個頁面 / 環境

```bash
$B diff https://staging.app.com https://prod.app.com
```

### 多步驟鏈結 (長流程更有效率)

```bash
echo '[
  ["goto","https://app.example.com"],
  ["snapshot","-i"],
  ["fill","@e3","test@test.com"],
  ["fill","@e4","password"],
  ["click","@e5"],
  ["snapshot","-D"],
  ["screenshot","/tmp/result.png"]
]' | $B chain
```

## 快速斷言模式 (Assertion Patterns)

```bash
# 元素存在且可見
$B is visible ".modal"

# 按鈕已啟用/停用
$B is enabled "#submit-btn"
$B is disabled "#submit-btn"

# 核取框狀態
$B is checked "#agree"

# 輸入框可編輯
$B is editable "#name-field"

# 元素擁有焦點
$B is focused "#search-input"

# 頁面包含特定文字
$B js "document.body.textContent.includes('Success')"

# 元素數量
$B js "document.querySelectorAll('.list-item').length"

# 特定屬性值
$B attrs "#logo"    # 以 JSON 回傳所有屬性

# CSS 屬性
$B css ".button" "background-color"
```

## 快照系統 (Snapshot System)

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

## 指令參考

### 導航 (Navigation)
| 指令 | 說明 |
|---------|-------------|
| `back` | 回到上一頁 |
| `forward` | 前進下一頁 |
| `goto <url>` | 導航至 URL |
| `reload` | 重新整理頁面 |
| `url` | 列印當前 URL |

### 讀取 (Reading)
| 指令 | 說明 |
|---------|-------------|
| `accessibility` | 完整的 ARIA 樹 |
| `forms` | 表單欄位（以 JSON 回傳） |
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
| `attrs <sel|@ref>` | 元素屬性（以 JSON 回傳） |
| `console [--clear|--errors]` | 控制台訊息（--errors 僅過濾錯誤/警告） |
| `cookies` | 所有 Cookie（以 JSON 回傳） |
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

## 提示

1. **一次導航，多次查詢。** `goto` 載入頁面後，`text`、`js`、`screenshot` 都能立即存取已載入的頁面。
2. **優先使用 `snapshot -i`。** 查看所有互動元素，然後透過引用進行點擊/填寫。無需猜測 CSS 選擇器。
3. **使用 `snapshot -D` 進行驗證。** 基準線 → 動作 → 比對。精確查看發生了什麼變化。
4. **使用 `is` 進行斷言。** `is visible .modal` 比解析頁面文字更快且更可靠。
5. **使用 `snapshot -a` 提供證據。** 帶標註的截圖非常適合用於 Bug 報告。
6. **針對複雜 UI 使用 `snapshot -C`。** 尋找無障礙樹遺漏但可點擊的 div。
7. **動作後檢查 `console`。** 捕捉那些視覺上無法察覺的 JS 錯誤。
8. **針對長流程使用 `chain`。** 單一指令完成，消除每一步的 CLI 開銷。
