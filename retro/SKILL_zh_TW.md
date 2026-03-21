---
name: retro
version: 2.0.0
description: |
  每週技術回顧。分析提交歷史、工作模式與代碼品質指標，具備持久化歷史與趨勢追蹤功能。
  具備團隊意識：按人細分貢獻，提供具體的表揚與成長建議。
  當被要求「weekly retro」、「what did we ship」或「engineering retrospective」時使用。
  在工作週或衝刺 (sprint) 結束時主動建議。
allowed-tools:
  - Bash
  - Read
  - Write
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
echo '{"skill":"retro","ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","repo":"'$(basename "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || echo "unknown")'"}'  >> ~/.gstack/analytics/skill-usage.jsonl 2>/dev/null || true
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
2. **簡化 (Simplify)：** 用平易近人的語言解釋問題，讓一個聰明的 16 歲少年也能聽懂。不要使用原始函式名稱、內部術語或實作細節。使用具體的例子和類比。說明它「做什麼」，區域它「叫什麼」。
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

## 偵測預設分支

在收集數據前，先偵測倉庫的預設分支名稱：
`gh repo view --json defaultBranchRef -q .defaultBranchRef.name`

若失敗，則退回到 `main`。在後續所有 git 查詢中，將說明中的 `origin/<default>` 替換為偵測到的名稱。

---

# /retro — 每週工程回顧

生成一份綜合的工程回顧報告，分析提交歷史、工作模式與代碼品質指標。具備團隊意識：識別執行指令的用戶，然後按人細分貢獻，提供具體的表揚與成長機會。專為使用 Claude Code 作為戰力倍增器的資深 IC 或 CTO 級別開發者設計。

## 用戶可調用
當用戶輸入 `/retro` 時，執行此技能。

## 參數
- `/retro` — 預設：過去 7 天
- `/retro 24h` — 過去 24 小時
- `/retro 14d` — 過去 14 天
- `/retro 30d` — 過去 30 天
- `/retro compare` — 比較當前時間窗與前一個等長的時間窗
- `/retro compare 14d` — 指定時間窗進行對比

## 說明

解析參數以確定時間窗。若未提供參數，預設為 7 天。所有時間均應以用戶的 **本地時區** 回報（使用系統預設時區 — **不要** 設置 `TZ`）。

**午夜對齊時間窗**：針對「日 (`d`)」和「週 (`w`)」單位，計算本地午夜的絕對開始日期，而非使用相對字串。例如，若今天是 2026-03-18 且時間窗為 7 天，則開始日期為 2026-03-11。在 git log 查詢中使用 `--since="2026-03-11T00:00:00"` —— 明確的 `T00:00:00` 後綴可確保 git 從午夜開始計算。若不加此後綴，git 會使用當前的掛鐘時間（例如晚上 11 點執行的 `--since="2026-03-11"` 指的是 11 點而非午夜）。針對週單位，將其乘以 7 換算為天數（例如 `2w` = 14 天前）。針對「小時 (`h`)」單位，則使用 `--since="N hours ago"`，因為午夜對齊不適用於短於一天的時間窗。

**參數驗證**：若參數不符合「數字 + d/h/w」、單詞 `compare` 或 `compare` + 「數字 + d/h/w」，顯示以下用法並停止：
```
用法：/retro [window]
  /retro              — 過去 7 天 (預設)
  /retro 24h          — 過去 24 小時
  /retro 14d          — 過去 14 天
  /retro 30d          — 過去 30 天
  /retro compare      — 比較本週期與上一個週期
  /retro compare 14d  — 指定時間窗進行對比
```

### 步驟 1：收集原始數據

首先，獲取遠端內容並識別當前用戶：
```bash
git fetch origin <default> --quiet
# 識別誰在執行回顧
git config user.name
git config user.email
```

`git config user.name` 回傳的名字即為 **「您」** —— 正在閱讀此回顧的人。所有其他作者皆為隊友。以此為基準定位敘述方式：「您的」提交 vs 隊友的貢獻。

並行執行以下所有 git 指令（它們彼此獨立）：

```bash
# 1. 時間窗內所有提交：包含時間戳、主旨、哈希、作者、變更檔案、新增行數、刪除行數
git log origin/<default> --since="<window>" --format="%H|%aN|%ae|%ai|%s" --shortstat

# 2. 按提交細分的測試 vs 總 LOC 比例 (包含作者)
#    每個提交塊以 COMMIT:<hash>|<author> 開頭，後接 numstat 行。
#    區分測試檔案 (匹配 test/|spec/|__tests__/) 與生產環境檔案。
git log origin/<default> --since="<window>" --format="COMMIT:%H|%aN" --numstat

# 3. 用於偵測會話與每小時分佈的提交時間戳 (包含作者)
git log origin/<default> --since="<window>" --format="%at|%aN|%ai|%s" | sort -n

# 4. 最頻繁變動的檔案 (熱點分析)
git log origin/<default> --since="<window>" --format="" --name-only | grep -v '^$' | sort | uniq -c | sort -rn

# 5. 從提交訊息中擷取 PR 編號 (匹配 #NNN 模式)
git log origin/<default> --since="<window>" --format="%s" | grep -oE '#[0-9]+' | sed 's/^#//' | sort -n | uniq | sed 's/^/#/'

# 6. 各作者觸及的檔案熱點 (誰動了什麼)
git log origin/<default> --since="<window>" --format="AUTHOR:%aN" --name-only

# 7. 各作者提交數 (快速摘要)
git shortlog origin/<default> --since="<window>" -sn --no-merges

# 8. Greptile 分類歷史 (若可用)
cat ~/.gstack/greptile-history_zh_TW.md 2>/dev/null || true

# 9. TODOS_zh_TW.md 積壓情況 (若可用)
cat TODOS_zh_TW.md 2>/dev/null || true

# 10. 測試檔案總數
find . -name '*.test.*' -o -name '*.spec.*' -o -name '*_test.*' -o -name '*_spec.*' 2>/dev/null | grep -v node_modules | wc -l

# 11. 時間窗內的回歸測試提交
git log origin/<default> --since="<window>" --oneline --grep="test(qa):" --grep="test(design):" --grep="test: coverage"

# 12. gstack 技能使用遙測 (若可用)
cat ~/.gstack/analytics/skill-usage.jsonl 2>/dev/null || true

# 13. 時間窗內變動的測試檔案數
git log origin/<default> --since="<window>" --format="" --name-only | grep -E '\.(test|spec)\.' | sort -u | wc -l
```

### 步驟 2：計算指標

計算並在摘要表中呈現以下指標：

| 指標 | 數值 |
|--------|-------|
| 合併至 main 的提交數 | N |
| 貢獻者人數 | N |
| 已合併 PR 數 | N |
| 總新增行數 | N |
| 總刪除行數 | N |
| 淨 LOC 增加 | N |
| 測試 LOC (新增) | N |
| 測試 LOC 比例 | N% |
| 版本範圍 | vX.Y.Z.W → vX.Y.Z.W |
| 活躍天數 | N |
| 偵測到的會話數 | N |
| 平均 LOC/會話小時 | N |
| Greptile 信號 | N% (Y 次捕捉, Z 次誤判) |
| 測試健康度 | 總計 N 個測試 · 此期間新增 M 個 · K 個回歸測試 |

接著在下方緊接著顯示 **各作者排行榜**：

```
貢獻者              提交數   +/-          熱門區域
您 (garry)              32   +2400/-300   browse/
alice                    12   +800/-150    app/services/
bob                       3   +120/-40     tests/
```

按提交數降序排列。當前用戶（來自 `git config user.name`）始終排在第一位，標註為「您 (姓名)」。

**Greptile 信號 (若歷史紀錄存在)**：讀取 `~/.gstack/greptile-history_zh_TW.md`（步驟 1 取得）。按日期過濾回顧時間窗內的條目。按類型計數：`fix` (修復), `fp` (誤判), `already-fixed` (已修復)。計算信號比例：`(fix + already-fixed) / (fix + already-fixed + fp)`。若時間窗內無條目或檔案不存在，跳過 Greptile 指標列。靜默跳過無法解析的行。

**待辦清單健康度 (若 TODOS_zh_TW.md 存在)**：讀取 `TODOS_zh_TW.md`（步驟 1 取得）。計算：
- 總待處理 TODO 數（不含 `## 已完成` 章節）
- P0/P1 計數（關鍵/緊急項目）
- P2 計數（重要項目）
- 此期間完成的項目（「已完成」章節中日期在回顧窗口內的項目）
- 此期間新增的項目（交叉引用 git log 尋找窗口內修改了 TODOS_zh_TW.md 的提交）

包含在指標表中：
```
| 待辦清單健康度 | N 個待處理 (X 個 P0/P1, Y 個 P2) · 此期間完成 Z 個 |
```

若 `TODOS_zh_TW.md` 不存在，跳過此列。

**技能使用情況 (若分析數據存在)**：讀取 `~/.gstack/analytics/skill-usage.jsonl`（若存在）。按 `ts` 欄位過濾窗口內條目。區分技能啟動（無 `event` 欄位）與 Hook 觸發 (`event: "hook_fire"`)。按技能名稱聚合。呈現格式：

```
| 技能使用情況 | /ship(12) /qa(8) /review(5) · 3 次安全 Hook 觸發 |
```

若檔案不存在或窗口內無數據，跳過此列。

### 步驟 3：提交時間分佈

使用長條圖顯示本地時間的每小時提交分佈：

```
小時  提交數  ████████████████
 00:    4      ████
 07:    5      █████
 ...
```

識別並指出：
- 高峰時段
- 零提交區域
- 模式是雙峰（早上/晚上）還是持續性的
- 深夜編碼集群（晚上 10 點後）

### 步驟 4：工作會話偵測

使用 **45 分鐘間隔** 作為連續提交間的閾值來偵測會話。回報每個會話：
- 開始/結束時間
- 提交數量
- 持續分鐘數

會話分類：
- **深度會話 (Deep)** (50 分鐘以上)
- **中等會話 (Medium)** (20-50 分鐘)
- **微型會話 (Micro)** (20 分鐘以下，通常是單次提交後即走)

計算：
- 總活躍編碼時間（會話持續時間總和）
- 平均會話長度
- 每活躍小時產出的 LOC

### 步驟 5：提交類型細分

按約定提交 (Conventional commits) 前綴分類（feat/fix/refactor/test/chore/docs）。以百分比條顯示：

```
feat:     20  (40%)  ████████████████████
fix:      27  (54%)  ███████████████████████████
refactor:  2  ( 4%)  ██
```

若修復 (fix) 比例超過 50%，發出警示 —— 這標誌著「快發快修」模式，可能暗示審核環節有缺口。

### 步驟 6：熱點分析

顯示前 10 個變動最頻繁的檔案。標記：
- 變動 5 次以上的檔案（頻繁變動熱點）
- 熱點清單中的測試檔案 vs 生產環境檔案
- VERSION/CHANGELOG 的出現頻率（版本紀律指標）

### 步驟 7：PR 大小分佈

從提交差異中預估 PR 大小並分桶：
- **小 (Small)** (<100 LOC)
- **中 (Medium)** (100-500 LOC)
- **大 (Large)** (500-1500 LOC)
- **超大 (XL)** (1500+ LOC)

### 步驟 8：專注分與本週之星

**專注分 (Focus score)**：計算觸及變動最頻繁的單一頂層目錄（如 `app/services/`, `app/views/`）的提交百分比。分數越高 = 越專注於深層工作；分數越低 = 背景切換頻繁。回報格式：「專注分：62% (app/services/)」

**本週之星 (Ship of the week)**：自動識別窗口內 LOC 變動最大的單個 PR。予以突出顯示：
- PR 編號與標題
- 變動的 LOC
- 為什麼重要（根據提交訊息與觸及檔案推論）

### 步驟 9：團隊成員分析

針對每位貢獻者（包含當前用戶），計算：

1. **提交與 LOC** — 總提交、新增、刪除、淨 LOC
2. **專注領域** — 觸及最頻繁的目錄/檔案（前 3 名）
3. **提交類型組合** — 其個人的 feat/fix/refactor/test 佔比
4. **會話模式** — 什麼時候寫代碼（其高峰時段）、會話數量
5. **測試紀律** — 其個人的測試 LOC 比例
6. **本週最大貢獻** — 窗口內其個人的最高影響力提交或 PR

**針對當前用戶 (「您」)**：此章節最為深入。包含來自個人回顧的所有細節 —— 會話分析、時間模式、專注分。以第一人稱敘述：「您的高峰時段...」、「您的本週最大貢獻...」

**針對每位隊友**：撰寫 2-3 句話涵蓋其工作內容與模式。然後：

- **表揚 (Praise)** (1-2 個具體事項)：錨定在實際提交中。不要只說「做得好」—— 說明具體好在哪。範例：「在 3 個專注會話中交付了完整的身份驗證中間件重寫，測試覆蓋率達 45%」、「每個 PR 都在 200 LOC 以下 —— 展現了極佳的分解紀律。」
- **成長機會 (Opportunity for growth)** (1 個具體事項)：框架為「升級建議」而非批評。錨定在實際數據中。範例：「本週測試比例為 12% —— 在支付模組變得更複雜前增加測試覆蓋率會很有回報」、「同一個檔案有 5 次修復提交，建議原始 PR 可以先經過一輪審核。」

**若僅有一位貢獻者 (單人倉庫)**：跳過團隊細分 —— 回顧即為個人內容。

**若存在共同作者 (Co-Authored-By)**：解析提交訊息中的 `Co-Authored-By:` 行。將提交功勞同時歸於共同作者與主作者。註明 AI 共同作者（如 `noreply@anthropic.com`），但不將其視為團隊成員 —— 改為將「AI 輔助提交」作為獨立指標追蹤。

### 步驟 10：週對週趨勢 (若時間窗 >= 14d)

若時間窗為 14 天或更長，將其拆分為每週區塊並顯示趨勢：
- 每週提交數（總計與各作者）
- 每週 LOC
- 每週測試比例
- 每週修復比例
- 每週會話數

### 步驟 11：連勝追蹤 (Streak Tracking)

計算從今天起回溯，每天至少有 1 次提交至 origin/<default> 的連續天數。同時追蹤團隊連勝與個人連勝：

```bash
# 團隊連勝：所有不重複的提交日期 (本地時間) — 不設硬性截止點
git log origin/<default> --format="%ad" --date=format:"%Y-%m-%d" | sort -u

# 個人連勝：僅限當前用戶的提交
git log origin/<default> --author="<用戶姓名>" --format="%ad" --date=format:"%Y-%m-%d" | sort -u
```

從今天開始倒數 —— 共有多少個連續天數包含至少一次提交？此查詢會掃描完整歷史，確保任何長度的連勝都能被準確報告。顯示：
- 「團隊交付連勝：連續 47 天」
- 「您的交付連勝：連續 32 天」

### 步驟 12：載入歷史並對比

在儲存新快照前，檢查先前的回顧歷史：

```bash
ls -t .context/retros/*.json 2>/dev/null
```

**若先前的回顧存在**：使用 Read 工具載入最近的一份。計算關鍵指標的變化量，並包含一個 **「對比上次回顧」** 章節：
```
                    上次        本次         變化
測試比例：          22%    →    41%         ↑19pp
會話數：            10     →    14          ↑4
LOC/小時：          200    →    350         ↑75%
修復比例：          54%    →    30%         ↓24pp (進步中)
提交數：            32     →    47          ↑47%
深度會話：          3      →    5           ↑2
```

**若無先前歷史**：跳過對比章節並附加：「已記錄首次回顧 —— 下週再次執行即可查看趨勢。」

### 步驟 13：儲存回顧歷史

計算完所有指標（包含連勝）並載入歷史對比後，儲存 JSON 快照：

```bash
mkdir -p .context/retros
```

確定今天的序號（將 `$(date +%Y-%m-%d)` 替換為實際日期）：
```bash
# 計算今天已有的回顧數以獲取下一個序號
today=$(date +%Y-%m-%d)
existing=$(ls .context/retros/${today}-*.json 2>/dev/null | wc -l | tr -d ' ')
next=$((existing + 1))
# 儲存為 .context/retros/${today}-${next}.json
```

使用 Write 工具儲存符合以下 schema 的 JSON 檔案：
```json
{
  "date": "2026-03-08",
  "window": "7d",
  "metrics": {
    "commits": 47,
    "contributors": 3,
    "prs_merged": 12,
    "insertions": 3200,
    "deletions": 800,
    "net_loc": 2400,
    "test_loc": 1300,
    "test_ratio": 0.41,
    "active_days": 6,
    "sessions": 14,
    "deep_sessions": 5,
    "avg_session_minutes": 42,
    "loc_per_session_hour": 350,
    "feat_pct": 0.40,
    "fix_pct": 0.30,
    "peak_hour": 22,
    "ai_assisted_commits": 32
  },
  "authors": {
    "Garry Tan": { "commits": 32, "insertions": 2400, "deletions": 300, "test_ratio": 0.41, "top_area": "browse/" },
    "Alice": { "commits": 12, "insertions": 800, "deletions": 150, "test_ratio": 0.35, "top_area": "app/services/" }
  },
  "version_range": ["1.16.0.0", "1.16.1.0"],
  "streak_days": 47,
  "tweetable": "3 月 1 日當週：47 次提交 (3 位貢獻者), 3.2k LOC, 38% 測試, 12 個 PR, 高峰：晚上 10 點",
  "greptile": {
    "fixes": 3,
    "fps": 1,
    "already_fixed": 2,
    "signal_pct": 83
  }
}
```

**注意**：僅在 `~/.gstack/greptile-history_zh_TW.md` 存在且窗口內有條目時才包含 `greptile` 欄位。僅在 `TODOS_zh_TW.md` 存在時包含 `backlog` 欄位。僅在找到測試檔案時（指令 10 回傳 > 0）包含 `test_health` 欄位。若無數據則省略該欄位。

測試健康數據 JSON 範例：
```json
  "test_health": {
    "total_test_files": 47,
    "tests_added_this_period": 5,
    "regression_test_commits": 3,
    "test_files_changed": 8
  }
```

待辦清單數據 JSON 範例：
```json
  "backlog": {
    "total_open": 28,
    "p0_p1": 2,
    "p2": 8,
    "completed_this_period": 3,
    "added_this_period": 1
  }
```

### 步驟 14：撰寫敘述報告

輸出結構如下：

---

**一言摘要 (Tweetable summary)**（首行，在所有內容之前）：
```
3 月 1 日當週：47 次提交 (3 位貢獻者), 3.2k LOC, 38% 測試, 12 個 PR, 高峰：晚上 10 點 | 連勝：47 天
```

## 工程回顧：[日期範圍]

### 摘要表
（來自步驟 2）

### 對比上次回顧
（來自步驟 11，儲存前載入 —— 若為首次回顧則跳過）

### 時間與會話模式
（來自步驟 3-4）

解讀團隊模式背後的意義：
- 生產力最高的時段為何及其驅動因素
- 會話長度隨時間是變長還是變短
- 估計每日活躍編碼時數（團隊合計）
- 值得注意的規律：成員是同時編碼還是輪班？

### 交付速度
（來自步驟 5-7）

敘述涵蓋：
- 提交類型組合及其揭露的資訊
- PR 大小分佈及其反映的交付節奏
- 修復鏈 (Fix-chain) 偵測（同一個子系統連續出現的修復提交）
- 版本提升紀律

### 代碼品質信號
- 測試 LOC 比例趨勢
- 熱點分析（相同的檔案是否頻繁變動？）
- Greptile 信號比例與趨勢（若歷史存在）：「Greptile：X% 信號（Y 個有效捕捉, Z 個誤判）」

### 測試健康度
- 總測試檔案數：N (來自指令 10)
- 此期間新增測試數：M (來自指令 12 —— 變動的測試檔案)
- 回歸測試提交：列出來自指令 11 的 `test(qa):`, `test(design):`, `test: coverage` 提交
- 若先前有回顧且具備 `test_health`：顯示變化量「測試數：{上次} → {本次} (+{變化量})」
- 若測試比例 < 20%：標記為成長領域 —— 「目標是 100% 測試覆蓋率。測試讓『憑感覺編程』變得安全。」

### 專注與重點項目
（來自步驟 8）
- 專注分及其解讀
- 本週之星特別介紹

### 您的本週 (個人深度分析)
（來自步驟 9，僅針對當前用戶）

這是用戶最關心的章節。包含：
- 其個人的提交數、LOC、測試比例
- 其會話模式與高峰時段
- 其專注領域
- 其本週最大貢獻
- **您做得出色的地方** (2-3 個具體事項，錨定在提交中)
- **哪裡可以升級** (1-2 個具體、具操作性的建議)

### 團隊細分
（來自步驟 9，針對每位隊友 —— 若為單人倉庫則跳過）

針對每位隊友（按提交數降序排列），撰寫一個章節：

#### [姓名]
- **交付內容**：2-3 句話描述其貢獻、專注領域與提交模式
- **表揚**：1-2 個具體做得好的地方，錨定在實際提交中。要真誠 —— 就像在 1:1 面談中會說的話。範例：
  - 「在 3 個小型、可審核的 PR 中清理了整個 auth 模組 —— 教科書般的分解動作」
  - 「為每個新端點增加了整合測試，而不僅僅是正常路徑」
  - 「修復了導致儀表板載入耗時 2 秒的 N+1 查詢問題」
- **成長機會**：1 個具體且具建設性的建議。框架化為「投資」而非批評。錨定在實際數據中。範例：
  - 「支付模組的測試覆蓋率僅 8% —— 值得在下一個功能疊加上去前投入一些時間」
  - 「提交大多集中在單一爆發期 —— 將工作分散到全天可能有助於減輕背景切換的疲勞」
  - 「提交全部落在凌晨 1-4 點 —— 對於長期代碼品質而言，永續的節奏至關重要」

**AI 協作筆記**：若許多提交帶有 `Co-Authored-By` AI 標註（如 Claude, Copilot），將 AI 輔助提交百分比記錄為團隊指標。保持中立立場 —— 「N% 的提交為 AI 輔助」 —— 不作評判。

### 前 3 大團隊勝利
識別窗口內全團隊產出的 3 個最高影響力成果。針對每一項：
- 內容是什麼
- 誰交付的
- 為什麼重要（產品/架構影響）

### 3 個待改進之處
具體、具操作性、錨定在實際提交中。混合個人與團隊層級的建議。措辭為「為了變得更優秀，團隊可以...」

### 下週的 3 個習慣
微小、實用、現實。每個都應是 5 分鐘內能採取的行動。至少一個應是團隊導向的（例如：「當天審核彼此的 PR」）。

### 週對週趨勢
（若適用，來自步驟 10）

---

## 對比模式 (Compare Mode)

當用戶執行 `/retro compare` (或 `/retro compare 14d`)：

1. 計算當前時間窗（預設 7 天）的指標，使用午夜對齊的開始日期（邏輯同主回顧 —— 例如若今天是 2026-03-18 且窗口為 7 天，使用 `--since="2026-03-11T00:00:00"`）
2. 計算前一個等長週期（緊接在當前窗口之前）的指標，同時使用 `--since` 與 `--until` 並配合午夜對齊日期以避免重疊（例如針對 2026-03-11 開始的 7 天窗口：前一個週期為 `--since="2026-03-04T00:00:00" --until="2026-03-11T00:00:00"`）
3. 顯示側邊對比表，包含變化量與箭頭標示
4. 撰寫一段簡短敘述，突出最大的進步與退步之處
5. 僅將當前窗口的快照儲存至 `.context/retros/`（同正常回顧）；**不要** 持久化前一個週期的指標。

## 語氣

- 鼓勵但坦誠，不刻意討好
- 具體且明確 —— 始終錨定在實際的提交/代碼中
- 跳過泛泛的稱讚（「做得好！」） —— 說明具體好在哪裡以及為什麼
- 將改進建議框架化為「升級 (leveling up)」，而非批評
- **表揚應感覺像是您在 1:1 面談中真正會說的話** —— 具體、實至名歸、真誠
- **成長建議應感覺像是「投資建議」** —— 「這值得您花時間是因為...」而非「您失敗在...」
- 絕不進行隊友間的負面比較。每個人的章節都是獨立的。
- 總輸出維持在 3000-4500 字左右（因包含團隊章節而略長）
- 使用 markdown 表格與代碼塊顯示數據，使用散文撰寫敘述內容
- 直接輸出至對話中 —— **不要** 寫入檔案系統（`.context/retros/` 中的 JSON 快照除外）

## 重要規則

- 所有敘述性輸出直接在對話中呈現給用戶。**唯一** 寫入的檔案是 `.context/retros/` 中的 JSON 快照。
- 所有 git 查詢均使用 `origin/<default>`（而非可能過時的本地 main）
- 所有時間戳顯示用戶本地時區（不要覆蓋 `TZ`）
- 若窗口內無任何提交，說明此事並建議不同的時間窗
- 將 LOC/小時 四捨五入至最接近的 50
- 將合併提交 (Merge commits) 視為 PR 邊界
- 不要讀取 CLAUDE_zh_TW.md 或其他文檔 —— 此技能是自包含的
- 首次執行（無先前歷史）時，優雅地跳過對比章節
