---
name: review
version: 1.0.0
description: |
  交付 PR 前的審核。針對與基準分支的差異進行分析，檢查 SQL 安全性、LLM 信任邊界違反、
  具備條件的副作用以及其他結構性問題。當被要求「review this PR」、「code review」、
  「pre-landing review」或「check my diff」時使用。當用戶即將合併或發布代碼變更時主動建議。
allowed-tools:
  - Bash
  - Read
  - Edit
  - Write
  - Grep
  - Glob
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
echo '{"skill":"review","ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","repo":"'$(basename "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || echo "unknown")'"}'  >> ~/.gstack/analytics/skill-usage.jsonl 2>/dev/null || true
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

糟糕的工作比不工作更糟。你不會因為呈報而受到罰款。
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

## 步驟 0：偵測基準分支

確定此 PR 的目標分支。在後續所有步驟中將結果作為「基準分支」。

1. 檢查此分支是否已存在 PR：
   `gh pr view --json baseRefName -q .baseRefName`
   若成功，使用印出的分支名稱作為基準分支。

2. 若不存在 PR（指令失敗），偵測倉庫的預設分支：
   `gh repo view --json defaultBranchRef -q .defaultBranchRef.name`

3. 若以上指令均失敗，則退回到 `main`。

印出偵測到的基準分支名稱。在後續所有的 `git diff`、`git log`、`git fetch`、`git merge` 和 `gh pr create` 指令中，將說明中的「基準分支」替換為偵測到的分支名稱。

---

# 交付 PR 前的審核 (Pre-Landing PR Review)

你正在執行 `/review` 工作流。針對當前分支相對於基準分支的差異進行分析，找出測試無法捕捉的結構性問題。

---

## 步驟 1：檢查分支

1. 執行 `git branch --show-current` 獲取當前分支。
2. 若在基準分支上，輸出：**「無可審核內容 — 你目前在基準分支上，或者相對於基準分支沒有任何變更。」** 並停止。
3. 執行 `git fetch origin <base> --quiet && git diff origin/<base> --stat` 檢查是否存在差異。若無差異，輸出相同訊息並停止。

---

## 步驟 1.5：範疇蔓延 (Scope Drift) 偵測

在審核代碼品質前，請檢查：**他們是否構建了所要求的內容 — 不多也不少？**

1. 讀取 `TODOS_zh_TW.md`（若存在）。讀取 PR 說明（`gh pr view --json body --jq .body 2>/dev/null || true`）。
   讀取提交訊息（`git log origin/<base>..HEAD --oneline`）。
   **若不存在 PR：** 依賴提交訊息和 `TODOS_zh_TW.md` 來判斷既定意圖 —— 這是常見情況，因為 `/review` 通常在 `/ship` 建立 PR 前執行。
2. 識別 **既定意圖** —— 此分支原本打算完成什麼？
3. 執行 `git diff origin/<base> --stat` 並將變更的檔案與既定意圖進行比對。
4. 以懷疑的態度進行評估：

   **範疇蔓延 (SCOPE CREEP) 偵測：**
   - 變更的檔案與既定意圖無關
   - 計劃中未提及的新功能或重構
   - 「順便改一下...」這類擴大影響範圍的變更

   **需求缺失 (MISSING REQUIREMENTS) 偵測：**
   - `TODOS_zh_TW.md`/PR 說明中的需求在差異中未被處理
   - 既定需求的測試覆蓋率缺口
   - 部分實作（已開始但未完成）

5. 輸出（在主審核開始前）：
   ```
   範疇檢查：[乾淨 / 偵測到蔓延 / 需求缺失]
   既定意圖：<一行摘要，說明要求的內容>
   實際交付：<一行摘要，說明差異實際做的內容>
   [若有蔓延：列出每項超出範疇的變更]
   [若有缺失：列出每項未處理的需求]
   ```

6. 此步驟僅供 **資訊參考** — 不會阻礙審核。繼續執行步驟 2。

---

## 步驟 2：閱讀清單

讀取 `.claude/skills/review/checklist_zh_TW.md`。

**若無法讀取該檔案，請停止並報告錯誤。** 若無此清單，請勿繼續。

---

## 步驟 2.5：檢查 Greptile 審核評論

讀取 `.claude/skills/review/greptile-triage_zh_TW.md` 並遵循獲取、過濾、分類及 **呈報偵測** 步驟。

**若不存在 PR、`gh` 失敗、API 回傳錯誤或無任何 Greptile 評論：** 靜默跳過此步驟。Greptile 整合是附加功能 —— 無需它審核仍可運作。

**若發現 Greptile 評論：** 儲存分類結果（有效且可操作、有效但已修復、誤判、已抑制） —— 你在步驟 5 中會用到它們。

---

## 步驟 3：獲取差異

獲取最新的基準分支以避免來自過時本地狀態的誤報：

```bash
git fetch origin <base> --quiet
```

執行 `git diff origin/<base>` 獲取完整的差異。這包含相對於最新基準分支的所有已提交與未提交的變更。

---

## 步驟 4：雙輪審核

對照清單分兩輪對差異進行審核：

1. **第一輪 (關鍵)：** SQL 與數據安全、競態條件與並發、LLM 輸出信任邊界、列舉 (Enum) 與值完整性
2. **第二輪 (資訊)：** 具備條件的副作用、魔術數字與字串耦合、死代碼與一致性、LLM 提示詞問題、測試缺口、視圖/前端

**列舉與值完整性需要讀取差異之外的代碼。** 當差異引入了新的列舉值、狀態、等級或類型常量時，使用 Grep 尋找所有引用同類值的檔案，然後讀取這些檔案以檢查新值是否已被處理。這是唯一一個僅憑差異審核不足的類別。

遵循清單中指定的輸出格式。尊重抑制項 —— **不要** 標記「請勿標記」章節中列出的項目。

---

## 步驟 4.5：設計審核（具備條件）

使用 `gstack-diff-scope` 檢查差異是否觸及前端檔案：

```bash
source <(~/.claude/skills/gstack/bin/gstack-diff-scope <base> 2>/dev/null)
```

**若 `SCOPE_FRONTEND=false`：** 靜默跳過設計審核。無輸出。

**若 `SCOPE_FRONTEND=true`：**

1. **檢查 DESIGN.md**：若倉庫根目錄存在 `DESIGN.md` 或 `design-system.md`，請讀取它。所有設計發現都將以此為準 —— `DESIGN.md` 中核准的模式不會被標記。若未找到，則使用通用設計原則。

2. **讀取 `.claude/skills/review/design-checklist_zh_TW.md`**：若無法讀取該檔案，則跳過設計審核並註明：「未找到設計清單 — 跳過設計審核。」

3. **讀取每個變更的前端檔案**（完整檔案，而不僅是差異片段）。前端檔案根據清單中列出的模式進行識別。

4. **對照設計清單** 審核變更的檔案。針對每一項：
   - **[高] 機械式 CSS 修復** (`outline: none`, `!important`, `font-size < 16px`)：歸類為 **自動修復 (AUTO-FIX)**
   - **[高/中] 需要設計判斷**：歸類為 **詢問 (ASK)**
   - **[低] 基於意圖的偵測**：呈現為「可能存在問題 — 請進行視覺驗證或執行 /design-review」

5. **包含發現項**：在審核輸出的「設計審核」標題下包含發現項，遵循清單中的輸出格式。設計發現項將與代碼審核發現項合併至同一個「優先修復」流程中。

6. **記錄結果** 以供審核就緒儀表板使用：

```bash
~/.claude/skills/gstack/bin/gstack-review-log '{"skill":"design-review-lite","timestamp":"TIMESTAMP","status":"STATUS","findings":N,"auto_fixed":M,"commit":"COMMIT"}'
```

替換內容：TIMESTAMP = ISO 8601 時間, STATUS = 若發現項為 0 則為 "clean" 否則為 "issues_found", N = 總發現項數, M = 自動修復數, COMMIT = `git rev-parse --short HEAD` 的輸出。

將任何設計發現項與步驟 4 的發現項並列。它們在步驟 5 中遵循相同的「優先修復」流程 —— 機械式 CSS 修復使用 **自動修復**，其餘一切使用 **詢問**。

---

## 步驟 5：優先修復審核 (Fix-First Review)

**每個發現項都必須有對應的操作 —— 不僅是關鍵項。**

輸出一個摘要標題：`交付前審核：N 個問題 (X 個關鍵, Y 個資訊)`

### 步驟 5a：對每個發現項進行分類

根據 `checklist_zh_TW.md` 中的「優先修復啟發式」方法，將每個發現項分類為 **自動修復 (AUTO-FIX)** 或 **詢問 (ASK)**。關鍵發現項傾向於使用 **詢問**；資訊性發現項傾向於使用 **自動修復**。

### 步驟 5b：自動修復所有 AUTO-FIX 項目

直接套用每項修復。針對每一項，輸出一行摘要：
`[自動修復] [檔案:行號] 問題 → 執行了什麼`

### 步驟 5c：批次詢問 ASK 項目

若仍有 **詢問** 項目，請在一個 AskUserQuestion 中呈現：

- 列出每個項目，包含編號、嚴重程度標籤、問題內容以及建議的修復方案
- 為每個項目提供選項：A) 依照建議修復, B) 跳過
- 包含一個整體的「建議」

範例格式：
```
我自動修復了 5 個問題。有 2 個需要你的確認：

1. [關鍵] app/models/post.rb:42 — 狀態轉移中的競態條件
   修復：在 UPDATE 中加入 `WHERE status = 'draft'`
   → A) 修復  B) 跳過

2. [資訊] app/services/generator.rb:88 — LLM 輸出在寫入資料庫前未經類型檢查
   修復：加入 JSON schema 驗證
   → A) 修復  B) 跳過

建議：兩者均修復 — #1 是真實的競態條件，#2 可防止默然的數據損壞。
```

若 **詢問** 項目為 3 個或更少，你可以使用單獨的 AskUserQuestion 調用而非批次處理。

### 步驟 5d：執行用戶批准的修復

針對用戶選擇「修復」的項目套用修復方案。輸出已修復的內容。

若無 **詢問** 項目（一切均為自動修復），則完全跳過該問題。

### 主張驗證 (Verification of claims)

在產出最終審核輸出前：
- 若你主張「此模式是安全的」 → 引用證明安全性的具體行號
- 若你主張「此問題已在別處處理」 → 讀取並引用處理該問題的代碼
- 若你主張「測試已覆蓋此內容」 → 指名測試檔案與方法
- 絕不說「可能已處理」或「大概有測試」 —— 驗證它，或標記為未知

**防止合理化：** 「這看起來沒問題」不是一個發現項。要麼引用證據證明它沒問題，要麼將其標記為未驗證。

### Greptile 評論解決方案

產出你自己的發現項後，若在步驟 2.5 中有歸類的 Greptile 評論：

**在輸出標題中包含 Greptile 摘要：** `+ N 條 Greptile 評論 (X 條有效, Y 條已修復, Z 條誤判)`

在回覆任何評論前，執行 `greptile-triage_zh_TW.md` 中的 **呈報偵測** 演算法，以決定使用第 1 級（友善）或第 2 級（堅定）回覆模板。

1. **有效且可操作的評論**：這些包含在你的發現項中 —— 它們遵循優先修復流程（機械式的自動修復，否則批次進入詢問流程）（A: 現在修復, B: 確認, C: 誤判）。若用戶選擇 A（修復），使用 `greptile-triage_zh_TW.md` 中的 **修復回覆模板** 進行回覆（包含內聯差異 + 解釋）。若用戶選擇 C（誤判），使用 **誤判回覆模板** 進行回覆（包含證據 + 建議重新分級），並儲存至專案本地與全域的 `greptile-history`。

2. **誤判 (FALSE POSITIVE) 評論**：透過 AskUserQuestion 呈現每一條：
   - 展示 Greptile 評論：檔案:行號 (或 [頂層]) + 內容摘要 + 永久連結 URL
   - 簡要解釋為什麼這是誤判
   - 選項：
     - A) 回覆 Greptile 解釋為什麼這是錯誤的（若明顯錯誤則推薦此項）
     - B) 照樣修復（若低成本且無害）
     - C) 忽視 — 不回覆也不修復

   若用戶選擇 A，使用 `greptile-triage_zh_TW.md` 中的 **誤判回覆模板** 進行回覆（包含證據 + 建議重新分級），並儲存至專案本地與全域的 `greptile-history`。

3. **有效但已修復 (VALID BUT ALREADY FIXED) 評論**：使用 `greptile-triage_zh_TW.md` 中的 **已修復回覆模板** 進行回覆 —— 無需 AskUserQuestion：
   - 包含已執行的操作與修復該問題的提交 SHA
   - 儲存至專案本地與全域的 `greptile-history`

4. **已抑制 (SUPPRESSED) 評論**：靜默跳過 —— 這些是來自先前分類的已知誤判。

---

## 步驟 5.5：TODOS 交叉引用

讀取倉庫根目錄中的 `TODOS_zh_TW.md`（若存在）。將 PR 與開啟中的待辦事項進行交叉引用：

- **此 PR 是否關閉了任何開啟中的待辦事項？** 若是，在輸出中註明哪些項目：「此 PR 處理了待辦事項：<標題>」
- **此 PR 是否產生了應成為待辦事項的工作？** 若是，將其標記為資訊性發現。
- **是否存在相關的待辦事項為此次審核提供背景資訊？** 若是，在討論相關發現項時引用它們。

若 `TODOS_zh_TW.md` 不存在，則靜默跳過此步驟。

---

## 步驟 5.6：文件過時檢查

將差異與文件檔案進行交叉引用。針對倉庫根目錄中的每個 `.md` 檔案（README_zh_TW.md, ARCHITECTURE_zh_TW.md, CONTRIBUTING_zh_TW.md, CLAUDE_zh_TW.md 等）：

1. 檢查差異中的代碼變更是否影響了該文件檔案中描述的功能、組件或工作流。
2. 若該文件檔案在此分支中 **未** 更新，但其描述的代碼 **已** 變更，則將其標記為 **資訊性** 發現：
   「文件可能已過時：[檔案] 描述了 [功能/組件]，但代碼在此分支中已變更。請考慮執行 `/document-release`。」

這僅供資訊參考 —— 絕非關鍵。修復動作是執行 `/document-release`。

若無任何文件檔案，則靜默跳過此步驟。

---

## 步驟 5.7：Codex 審核

檢查 Codex CLI 是否可用，並讀取用戶的 Codex 審核偏好：

```bash
which codex 2>/dev/null && echo "CODEX_AVAILABLE" || echo "CODEX_NOT_AVAILABLE"
CODEX_REVIEWS_CFG=$(~/.claude/skills/gstack/bin/gstack-config get codex_reviews 2>/dev/null || true)
echo "CODEX_REVIEWS: ${CODEX_REVIEWS_CFG:-not_set}"
```

若 `CODEX_NOT_AVAILABLE`：靜默跳過此步驟。繼續下一步。

若 `CODEX_REVIEWS` 為 `disabled`：靜默跳過此步驟。繼續下一步。

若 `CODEX_REVIEWS` 為 `enabled`：自動執行代碼審核與對抗性挑戰（無提示）。跳轉至下方的「執行 Codex」章節。

若 `CODEX_REVIEWS` 為 `not_set`：使用 AskUserQuestion 提供一次性的加入提示：

```
GStack 建議啟用 Codex 代碼審核 —— Codex 就像是你身邊那位超級聰明、安靜且能救你一命的工程師朋友。

A) 為未來所有執行啟用（推薦，預設）
B) 這次先試試看，下次再問我
C) 不用了，謝謝，不要再問我
```

若用戶選擇 A：持久化該設置並執行兩者：
```bash
~/.claude/skills/gstack/bin/gstack-config set codex_reviews enabled
```

若用戶選擇 B：這次執行兩者，但不持久化任何設置。

若用戶選擇 C：持久化拒絕設置並跳過：
```bash
~/.claude/skills/gstack/bin/gstack-config set codex_reviews disabled
```
接著跳過此步驟，繼續下一步。

### 執行 Codex

始終同時執行 **代碼審核** 與 **對抗性挑戰**。為每個 Bash 調用設置 5 分鐘逾時 (`timeout: 300000`)。

首先，建立一個暫存檔案以擷取標準錯誤 (stderr)：
```bash
TMPERR=$(mktemp /tmp/codex-review-XXXXXXXX)
```

**代碼審核**：執行：
```bash
codex review --base <base> -c 'model_reasoning_effort="xhigh"' --enable web_search_cached 2>"$TMPERR"
```

指令完成後，讀取標準錯誤以獲取成本/錯誤資訊：
```bash
cat "$TMPERR"
```

在 `CODEX 說 (代碼審核)：` 標題下逐字呈現完整輸出：

```
CODEX 說 (代碼審核)：
════════════════════════════════════════════════════════════
<完整的 codex 輸出，逐字呈現 —— 不要截斷或摘要>
════════════════════════════════════════════════════════════
閘門 (GATE)：通過 (PASS)        Token 數：N | 預估成本：~$X.XX
```

檢查輸出中是否有 `[P1]` 標記。若發現：`閘門：失敗 (FAIL)`。若無 `[P1]`：`閘門：通過 (PASS)`。

**若閘門失敗**：使用 AskUserQuestion：

```
Codex 在差異中發現了 N 個關鍵問題。

A) 現在調查並修復（推薦）
B) 照樣發布 — 這些問題可能會導致生產環境故障
```

若用戶選擇 A：仔細閱讀 Codex 的發現項並著手處理。然後重新執行 `codex review` 以驗證閘門現在是否為 **通過 (PASS)**。

若用戶選擇 B：繼續執行下一步。

### 錯誤處理 (代碼審核)

在持久化閘門結果前，檢查是否有錯誤。所有錯誤均不具阻礙性 —— Codex 是品質增強功能，而非先決條件。檢查 `$TMPERR` 輸出（剛才已讀取）是否有錯誤指示：

- **驗證失敗**：若標準錯誤包含 "auth", "login", "unauthorized" 或 "API key"，告訴用戶：「Codex 驗證失敗。請在終端執行 \`codex login\` 透過 ChatGPT 進行驗證。」不要持久化審核日誌記錄。繼續進行對抗性步驟（很可能也會失敗，但仍請嘗試）。
- **逾時**：若 Bash 調用在 5 分鐘後逾時，告訴用戶：「Codex 已逾時 (5 分鐘)。差異可能過大或 API 反應過慢。」不要持久化審核日誌記錄。跳過至清理步驟。
- **空回應**：若 codex 未回傳任何標準輸出 (stdout)，告訴用戶：「Codex 未回傳回應。錯誤訊息：<貼上相關錯誤>。」不要持久化審核日誌記錄。跳過至清理步驟。

**僅當 codex 產出真實審核（非空輸出）時**：持久化代碼審核結果：
```bash
~/.claude/skills/gstack/bin/gstack-review-log '{"skill":"codex-review","timestamp":"'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'","status":"STATUS","gate":"GATE","commit":"'"$(git rev-parse --short HEAD)"'"}'
```

替換內容：STATUS (若 PASS 則為 "clean" 否則為 "issues_found"), GATE ("pass" 或 "fail")。

**對抗性挑戰**：執行：
```bash
TMPERR_ADV=$(mktemp /tmp/codex-adv-XXXXXXXX)
codex exec "審核此分支相對於基準分支的變更。執行 git diff origin/<base> 查看差異。你的任務是尋找這段代碼在生產環境中可能失效的方式。像攻擊者和混亂工程師一樣思考。尋找邊際情況、競態條件、安全漏洞、資源洩漏、失敗模式以及默然的數據損壞路徑。要有對抗性。要詳盡。不要表揚 —— 只要找出問題。" -s read-only -c 'model_reasoning_effort="xhigh"' --enable web_search_cached 2>"$TMPERR_ADV"
```

指令完成後，讀取對抗性標準錯誤：
```bash
cat "$TMPERR_ADV"
```

在 `CODEX 說 (對抗性挑戰)：` 標題下逐字呈現完整輸出。這僅供資訊參考 —— 絕不會阻擋發布。若對抗性指令逾時或未回傳輸出，註明此事並繼續。

**跨模型分析**：在展示完兩項 Codex 輸出後，將 Codex 的發現項與你之前步驟中的審核發現項進行對比並輸出：

```
跨模型分析：
  雙方均發現：[Claude 與 Codex 重疊的發現項]
  僅 Codex 發現：[Codex 獨有的發現項]
  僅 Claude 發現：[Claude 審核獨有的發現項]
  一致率：X% (N/M 個總體獨特發現項發生重疊)
```

**清理**：處理完成後執行 `rm -f "$TMPERR" "$TMPERR_ADV"`。

---

## 重要規則

- **在評論前閱讀完整差異。** 不要標記差異中已經處理過的問題。
- **優先修復，而非僅讀取。** **自動修復** 項目直接套用。**詢問** 項目僅在用戶批准後套用。絕不執行 commit, push 或建立 PR —— 那是 /ship 的工作。
- **簡明扼要。** 一行描述問題，一行說明修復。無需開場白。
- **僅標記真實問題。** 跳過一切沒問題的內容。
- **使用來自 greptile-triage_zh_TW.md 的 Greptile 回覆模板。** 每個回覆都必須包含證據。絕不發布模糊的回覆。
