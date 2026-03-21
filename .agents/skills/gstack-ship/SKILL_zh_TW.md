---
name: ship
version: 1.0.0
description: |
  發布工作流：偵測並合併基準分支、執行測試、審核差異、提升 VERSION、更新 CHANGELOG、提交、推送、建立 PR。
  當被要求「ship」、「deploy」、「push to main」、「create a PR」或「merge and push」時使用。
  當用戶表示代碼已就緒或詢問關於部署的事宜時主動建議。
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - AskUserQuestion
  - WebSearch
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
echo '{"skill":"ship","ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","repo":"'$(basename "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || echo "unknown")'"}'  >> ~/.gstack/analytics/skill-usage.jsonl 2>/dev/null || true
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

如果 `TEL_PROMPTED` 為 `no` 且 `LAKE_INTRO` 為 `yes`：在處理完湖水介紹後，詢問用戶關於遙測的問題。使用 AskUserQuestion：

> 幫助 gstack 變得更好！社群模式會分享使用數據（你使用了哪些技能、花費多少時間、崩潰資訊），並帶有穩定的裝置 ID，以便我們追蹤趨勢並更快修復 Bug。
> 絕不會發送代碼、檔案路徑或倉庫名稱。
> 隨時可透過 `gstack-config set telemetry off` 進行更改。

選項：
- A) 幫助 gstack 變得更好！（推薦）
- B) 不用了，謝謝

若選擇 A：執行 `~/.codex/skills/gstack/bin/gstack-config set telemetry community`

若選擇 B：詢問後續的 AskUserQuestion：

> 那麼匿名模式呢？我們僅會得知「有人」使用了 gstack — 沒有唯一 ID，無法關聯會話。僅作為一個計數器，幫助我們了解是否有人在使用。

選項：
- A) 沒問題，匿名模式可以
- B) 不用了，謝謝，完全關閉

若選擇 B→A：執行 `~/.codex/skills/gstack/bin/gstack-config set telemetry anonymous`
若選擇 B→B：執行 `~/.codex/skills/gstack/bin/gstack-config set telemetry off`

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

- 如果選項 A 是完整實作（完全對等、所有邊際情況、100% 覆蓋率），而選項 B 是節省少量工作量的捷徑 —— **始終建議 A**。在使用 CC+gstack 的情況下，80 行與 150 行之間的差異是微不足道的. 當「完整」僅需多花幾分鐘時，「夠好就好」是錯誤的直覺。
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
~/.codex/skills/gstack/bin/gstack-telemetry-log \
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

# Ship: 全自動發布工作流 (Fully Automated Ship Workflow)

你正在執行 `/ship` 工作流。這是一個 **非互動、全自動** 的工作流。在任何步驟中都 **不要** 詢問確認。用戶輸入了 `/ship`，這意味著：**請直接執行**。直接執行到底並在最後輸出 PR URL。

**僅在以下情況停止：**
- 目前在基準分支上（中止）
- 無法自動解決的合併衝突（停止，展示衝突）
- 測試失敗（停止，展示失敗）
- 交付前審核發現需要用戶判斷的 **詢問 (ASK)** 項目
- 需要 MINOR 或 MAJOR 版本提升（詢問 — 參見步驟 4）
- 需要用戶決策的 Greptile 審核評論（複雜修復、誤判）
- `TODOS_zh_TW.md` 缺失且用戶想要建立（詢問 — 參見步驟 5.5）
- `TODOS_zh_TW.md` 混亂且用戶想要重組（詢問 — 參見步驟 5.5）

**絕不因以下情況停止：**
- 有未提交的變更（始終包含它們）
- 版本提升選擇（自動選擇 MICRO 或 PATCH — 參見步驟 4）
- CHANGELOG 內容（從差異中自動生成）
- 提交訊息批准（自動提交）
- 多檔案變更集（自動拆分為可細分的提交）
- `TODOS_zh_TW.md` 已完成項目偵測（自動標記）
- 可自動修復的審核發現（死代碼、N+1、過時註釋 — 自動修復）
- 測試覆蓋率缺口（自動生成並提交，或在 PR 說明中標記）

---

## 步驟 1：發布前檢查 (Pre-flight)

1. 檢查當前分支。若在基準分支或倉庫的預設分支上，則 **中止**：「你正在基準分支上。請從功能分支發布。」

2. 執行 `git status`（絕不使用 `-uall`）。未提交的變更始終包含在內 — 無需詢問。

3. 執行 `git diff <base>...HEAD --stat` 和 `git log <base>..HEAD --oneline` 以了解即將發布的內容。

4. 檢查審核就緒度：

## 審核就緒儀表板 (Review Readiness Dashboard)

完成審核後，讀取審核日誌與配置以顯示儀表板。

```bash
~/.codex/skills/gstack/bin/gstack-review-read
```

解析輸出結果。尋找每項技能（plan-ceo-review, plan-eng-review, plan-design-review, design-review-lite, codex-review）最近的記錄。忽略時間戳早於 7 天的記錄。對於設計審核，顯示 `plan-design-review`（完整視覺審計）與 `design-review-lite`（代碼級檢查）中較新的一個。在狀態後追加 "(FULL)" 或 "(LITE)" 以示區別。顯示格式：

```
+====================================================================+
|                    審核就緒儀表板 (REVIEW READINESS)                 |
+====================================================================+
| 審核項目        | 次數 | 最後執行時間        | 狀態      | 必要項   |
|-----------------|------|---------------------|-----------|----------|
| 工程審核 (Eng)  |  1   | 2026-03-16 15:00    | 通過      | 是       |
| CEO 審核        |  0   | —                   | —         | 否       |
| 設計審核        |  0   | —                   | —         | 否       |
| Codex 審核      |  0   | —                   | —         | 否       |
+--------------------------------------------------------------------+
| 判定：准予交付 — 工程審核已通過                                      |
+====================================================================+
```

**審核等級：**
- **工程審核 (預設必要)：** 唯一控管發布的審核。涵蓋架構、代碼品質、測試、效能。可透過 `gstack-config set skip_eng_review true` 全域停用（「別煩我」設置）。
- **CEO 審核 (選填)：** 根據判斷使用。建議針對重大產品/業務變更、新的用戶導向功能或範疇決策進行審核。Bug 修復、重構、基礎設施和清理工作可跳過。
- **設計審核 (選填)：** 根據判斷使用。建議針對 UI/UX 變更進行審核。僅限後端、基礎設施或僅限提示詞的變更可跳過。
- **Codex 審核 (安裝 Codex CLI 後預設啟用)：** 來自 OpenAI Codex CLI 的獨立審核 + 對抗性挑戰。顯示通過/失敗閘門。啟用後自動執行 — 透過 `gstack-config set codex_reviews enabled|disabled` 配置。

**判定邏輯：**
- **准予交付 (CLEARED)**：工程審核在 7 天內有 >= 1 條狀態為 "clean" 的記錄（或 `skip_eng_review` 為 `true`）
- **尚未就緒 (NOT CLEARED)**：工程審核缺失、過時（> 7 天）或仍有未解決問題
- CEO、設計與 Codex 審核僅供參考，絕不阻礙發布
- 若 `skip_eng_review` 配置為 `true`，工程審核顯示 "已跳過 (全域)" 且判定為准予交付

**過時偵測**：顯示儀表板後，檢查現有的審核是否可能過時：
- 從 bash 輸出的 `---HEAD---` 章節中解析當前 HEAD 的提交哈希
- 針對每個包含 `commit` 欄位的審核記錄：將其與當前 HEAD 對比。若不一致，計算經過的提交數：`git rev-list --count STORED_COMMIT..HEAD`。顯示：「注意：來自 {date} 的 {skill} 審核可能已過時 — 審核後已有 {N} 次提交」
- 對於不含 `commit` 欄位的記錄（舊記錄）：顯示：「注意：來自 {date} 的 {skill} 審核缺失提交追蹤 — 請考慮重新執行以實現準確的過時偵測」
- 若所有審核均與當前 HEAD 匹配，則不顯示任何過時註釋

若工程審核 **非** "CLEAR"：

1. **檢查此分支先前是否有覆蓋記錄：**
   ```bash
   source <(~/.codex/skills/gstack/bin/gstack-slug 2>/dev/null)
   grep '"skill":"ship-review-override"' ~/.gstack/projects/$SLUG/$BRANCH-reviews.jsonl 2>/dev/null || echo "NO_OVERRIDE"
   ```
   若存在覆蓋記錄，顯示儀表板並註明「審核門檻先前已接受 — 繼續執行。」**不要** 再次詢問。

2. **若無覆蓋記錄，** 使用 AskUserQuestion：
   - 展示工程審核缺失或仍有問題
   - 建議：若變更顯然微不足道（< 20 行、錯字修復、僅限配置），選擇 C；若變更較大，選擇 B
   - 選項：A) 照樣發布  B) 中止 — 先執行 /plan-eng-review  C) 變更過小，無需工程審核
   - 若 CEO 審核缺失，作為資訊提及（「未執行 CEO 審核 — 針對產品變更建議執行」）但 **不** 阻礙
   - 針對設計審核：執行 `source <(~/.codex/skills/gstack/bin/gstack-diff-scope <base> 2>/dev/null)`。若 `SCOPE_FRONTEND=true` 且儀表板中無設計審核（plan-design-review 或 design-review-lite），註明：「未執行設計審核 — 此 PR 更改了前端代碼。簡易設計檢查將在步驟 3.5 自動執行，但建議在實作後執行 /design-review 進行完整的視覺審計。」依然不阻礙發布。

3. **若用戶選擇 A 或 C，** 持久化該決定，以便未來在此分支執行 `/ship` 時跳過門檻：
   ```bash
   source <(~/.codex/skills/gstack/bin/gstack-slug 2>/dev/null)
   echo '{"skill":"ship-review-override","timestamp":"'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'","decision":"USER_CHOICE"}' >> ~/.gstack/projects/$SLUG/$BRANCH-reviews.jsonl
   ```
   將 USER_CHOICE 替換為 "ship_anyway" 或 "not_relevant"。

---

## 步驟 2：合併基準分支 (在測試之前)

獲取基準分支並將其合併至功能分支中，以便測試在合併後的狀態下運行：

```bash
git fetch origin <base> && git merge origin/<base> --no-edit
```

**若有合併衝突：** 若衝突簡單（VERSION, schema.rb, CHANGELOG 排序），嘗試自動解決。若衝突複雜或模糊，則 **停止** 並展示衝突。

**若已是最新狀態：** 靜默繼續。

---

## 步驟 2.5：測試框架引導 (Test Framework Bootstrap)

## 測試框架引導

**偵測現有測試框架與專案運行環境：**

```bash
# 偵測專案運行環境
[ -f Gemfile ] && echo "RUNTIME:ruby"
[ -f package.json ] && echo "RUNTIME:node"
[ -f requirements.txt ] || [ -f pyproject.toml ] && echo "RUNTIME:python"
[ -f go.mod ] && echo "RUNTIME:go"
[ -f Cargo.toml ] && echo "RUNTIME:rust"
[ -f composer.json ] && echo "RUNTIME:php"
[ -f mix.exs ] && echo "RUNTIME:elixir"
# 偵測子框架
[ -f Gemfile ] && grep -q "rails" Gemfile 2>/dev/null && echo "FRAMEWORK:rails"
[ -f package.json ] && grep -q '"next"' package.json 2>/dev/null && echo "FRAMEWORK:nextjs"
# 檢查現有測試基礎設施
ls jest.config.* vitest.config.* playwright.config.* .rspec pytest.ini pyproject.toml phpunit.xml 2>/dev/null
ls -d test/ tests/ spec/ __tests__/ cypress/ e2e/ 2>/dev/null
# 檢查退出標記
[ -f .gstack/no-test-bootstrap ] && echo "BOOTSTRAP_DECLINED"
```

**若偵測到測試框架**（發現配置文件或測試目錄）：
印出：「偵測到測試框架：{名稱} ({N} 個現有測試)。跳過引導流程。」
讀取 2-3 個現有測試檔案以了解規範（命名、導入、斷言風格、設置模式）。
將規範作為敘述背景儲存，供第 8e.5 階段或步驟 3.4 使用。**跳過剩餘引導步驟。**

**若出現 BOOTSTRAP_DECLINED**：印出：「先前已拒絕測試引導 — 跳過。」**跳過剩餘引導步驟。**

**若未偵測到運行環境**（未發現配置文件）：使用 AskUserQuestion：
「我無法偵測您的專案語言。您使用的是哪種運行環境？」
選項：A) Node.js/TypeScript B) Ruby/Rails C) Python D) Go E) Rust F) PHP G) Elixir H) 此專案不需要測試。
若用戶選擇 H → 寫入 `.gstack/no-test-bootstrap` 並在無測試情況下繼續。

**若偵測到運行環境但無測試框架 — 執行引導：**

### B2. 研究最佳實踐

使用 WebSearch 尋找當前運行環境的最佳實踐：
- `"[runtime] best test framework 2025 2026"`
- `"[framework A] vs [framework B] comparison"`

若 WebSearch 不可用，使用此內建知識表：

| 運行環境 | 首選建議 | 替代方案 |
|---------|----------------------|-------------|
| Ruby/Rails | minitest + fixtures + capybara | rspec + factory_bot + shoulda-matchers |
| Node.js | vitest + @testing-library | jest + @testing-library |
| Next.js | vitest + @testing-library/react + playwright | jest + cypress |
| Python | pytest + pytest-cov | unittest |
| Go | stdlib testing + testify | 僅 stdlib |
| Rust | cargo test (內建) + mockall | — |
| PHP | phpunit + mockery | pest |
| Elixir | ExUnit (內建) + ex_machina | — |

### B3. 選擇框架

使用 AskUserQuestion：
「我偵測到這是一個 [運行環境/框架] 專案，但尚未設置測試框架。我研究了當前的最佳實踐，以下是您的選擇：
A) [首選] — [理由]。包含：[套件]。支援：單元、整合、冒煙、e2e 測試
B) [替代方案] — [理由]。包含：[套件]
C) 跳過 — 現在先不設置測試
建議：選擇 A，因為 [基於專案背景的理由]」

若用戶選擇 C → 寫入 `.gstack/no-test-bootstrap`。告訴用戶：「如果您之後改變主意，刪除 `.gstack/no-test-bootstrap` 並重新執行即可。」在無測試情況下繼續。

若偵測到多種運行環境（單一倉庫 monorepo） → 詢問優先設置哪一個，可選擇依序完成兩者。

### B4. 安裝與配置

1. 安裝所選套件 (npm/bun/gem/pip 等)
2. 建立最小化配置文件
3. 建立目錄結構 (test/, spec/ 等)
4. 建立一個匹配專案代碼的範例測試，以驗證設置是否成功

若套件安裝失敗 → 嘗試除錯一次。若仍失敗 → 使用 `git checkout -- package.json package-lock.json`（或對應運行環境的指令）還原。警告用戶並在無測試情況下繼續。

### B4.5. 撰寫第一批真實測試

為現有代碼生成 3-5 個真實測試：

1. **尋找近期變更的檔案**：`git log --since=30.days --name-only --format="" | sort | uniq -c | sort -rn | head -10`
2. **按風險排序**：錯誤處理程序 > 帶條件的業務邏輯 > API 端點 > 純函式
3. **針對每個檔案**：撰寫一個測試真實行為且具備有意義斷言的測試。絕不使用 `expect(x).toBeDefined()` — 要測試代碼的「作用」。
4. 執行每個測試。通過 → 保留。失敗 → 修正一次。仍失敗 → 靜默刪除。
5. 生成至少 1 個測試，上限 5 個。

絕不在此測試檔案中導入秘密、API 金鑰或憑據。請使用環境變數或測試用例。

### B5. 驗證

```bash
# 執行完整測試套件以確認一切正常
{偵測到的測試指令}
```

若測試失敗 → 嘗試除錯一次。若仍失敗 → 還原所有引導變更並警告用戶。

### B5.5. CI/CD 管道

```bash
# 檢查 CI 供應商
ls -d .github/ 2>/dev/null && echo "CI:github"
ls .gitlab-ci.yml .circleci/ bitrise.yml 2>/dev/null
```

若 `.github/` 存在（或未偵測到 CI — 預設為 GitHub Actions）：
建立 `.github/workflows/test.yml`，內容包含：
- `runs-on: ubuntu-latest`
- 適合該運行環境的 setup action (setup-node, setup-ruby, setup-python 等)
- 在 B5 中驗證過的測試指令
- 觸發條件：push + pull_request

若偵測到非 GitHub 的 CI → 跳過 CI 生成並註明：「偵測到 {供應商} — CI 管道生成目前僅支援 GitHub Actions。請手動將測試步驟加入您現有的管道中。」

### B6. 建立 TESTING_zh_TW.md

首先檢查：若 `TESTING_zh_TW.md` 已存在 → 讀取並更新/追加內容而非覆蓋。絕不破壞既有內容。

撰寫 `TESTING_zh_TW.md`，內容包含：
- 理念：「100% 測試覆蓋率是實現優秀憑感覺編程 (Vibe Coding) 的關鍵。測試讓你能快速前進、信任直覺並充滿信心地交付 —— 沒有測試，憑感覺編程就只是在放手一搏。有了測試，它就是一項超能力。」
- 框架名稱與版本
- 如何執行測試（B5 中驗證的指令）
- 測試層級：單元測試（內容、位置、時機）、整合測試、冒煙測試、E2E 測試
- 規範：檔案命名、斷言風格、設置/清除模式

### B7. 更新 CLAUDE_zh_TW.md

首先檢查：若 `CLAUDE_zh_TW.md` 已有 `## 測試` 章節 → 跳過。不要重複。

追加 `## 測試` 章節：
- 執行指令與測試目錄
- 引用 `TESTING_zh_TW.md`
- 測試預期：
  - 目標是 100% 測試覆蓋率 — 測試讓憑感覺編程變得安全
  - 撰寫新函式時，撰寫對應的測試
  - 修復 Bug 時，撰寫回歸測試
  - 增加錯誤處理時，撰寫觸發該錯誤的測試
  - 增加條件分支 (if/else, switch) 時，為「兩條」路徑都撰寫測試
  - 絕不提交會導致既有測試失敗的代碼

### B8. 提交

```bash
git status --porcelain
```

僅在有變更時提交。暫存所有引導檔案（配置、測試目錄、TESTING_zh_TW.md, CLAUDE_zh_TW.md, .github/workflows/test.yml 若已建立）：
`git commit -m "chore: bootstrap test framework ({框架名稱})"`

---

---

## 步驟 3：執行測試 (針對合併後的代碼)

**不要執行 `RAILS_ENV=test bin/rails db:migrate`** — `bin/test-lane` 內部已調用 `db:test:prepare`，這會將 schema 載入正確的車道資料庫。執行裸測試遷移而不指定 INSTANCE 會觸及孤兒資料庫並損壞 structure.sql。

並行執行兩組測試套件：

```bash
bin/test-lane 2>&1 | tee /tmp/ship_tests.txt &
npm run test 2>&1 | tee /tmp/ship_vitest.txt &
wait
```

兩者完成後，讀取輸出檔案並檢查通過/失敗。

**若任何測試失敗：** 展示失敗內容並 **停止**。請勿繼續。

**若全部通過：** 靜默繼續 — 僅簡要註明測試數量。

---

## 步驟 3.25：評估套件 (Eval Suites)（具備條件）

當提示詞相關檔案變更時，評估是強制的。若差異中無提示詞檔案，跳過此步驟。

**1. 檢查差異是否觸及提示詞相關檔案：**

```bash
git diff origin/<base> --name-only
```

比對以下模式（來自 `CLAUDE_zh_TW.md`）：
- `app/services/*_prompt_builder.rb`
- `app/services/*_generation_service.rb`, `*_writer_service.rb`, `*_designer_service.rb`
- `app/services/*_evaluator.rb`, `*_scorer.rb`, `*_classifier_service.rb`, `*_analyzer.rb`
- `app/services/concerns/*voice*.rb`, `*writing*.rb`, `*prompt*.rb`, `*token*.rb`
- `app/services/chat_tools/*.rb`, `app/services/x_thread_tools/*.rb`
- `config/system_prompts/*.txt`
- `test/evals/**/*`（評估基礎設施變更會影響所有套件）

**若無匹配項：** 印出「無提示詞相關檔案變更 — 跳過評估。」並繼續執行步驟 3.5。

**2. 識別受影響的評估套件：**

每個評估運行器 (`test/evals/*_eval_runner.rb`) 都聲明了 `PROMPT_SOURCE_FILES`，列出哪些源檔案會影響它。使用 Grep 尋找與變更檔案匹配的套件：

```bash
grep -l "changed_file_basename" test/evals/*_eval_runner.rb
```

映射 運行器 → 測試檔案：`post_generation_eval_runner.rb` → `post_generation_eval_test.rb`。

**特殊情況：**
- 對 `test/evals/judges/*.rb`、`test/evals/support/*.rb` 或 `test/evals/fixtures/` 的變更會影響所有使用這些裁判/支援檔案的套件。檢查評估測試檔案中的匯入以確定。
- 對 `config/system_prompts/*.txt` 的變更 — 在評估運行器中搜尋該提示詞檔名以尋找受影響的套件。
- 若不確定受影響的套件，請執行所有可能受到影響的套件。過度測試優於遺漏退化問題。

**3. 在 `EVAL_JUDGE_TIER=full` 執行受影響套件：**

`/ship` 是合併前的閘門，因此始終使用完整等級（Sonnet 結構裁判 + Opus 人格裁判）。

```bash
EVAL_JUDGE_TIER=full EVAL_VERBOSE=1 bin/test-lane --eval test/evals/<suite>_eval_test.rb 2>&1 | tee /tmp/ship_evals.txt
```

若需執行多個套件，請依序執行（每個都需要一個測試車道）。若第一個套件失敗，立即停止 — 不要將 API 成本浪費在剩餘套件上。

**4. 檢查結果：**

- **若任何評估失敗：** 展示失敗內容、成本儀表板，並 **停止**。請勿繼續。
- **若全部通過：** 註明通過數量與成本。繼續執行步驟 3.5。

**5. 儲存評估輸出** — 將評估結果與成本儀表板包含在 PR 說明中（步驟 8）。

**等級參考 (僅供參考 — /ship 始終使用 `full`)：**
| 等級 | 時機 | 速度 (快取時) | 成本 |
|------|------|----------------|------|
| `fast` (Haiku) | 開發疊代、冒煙測試 | ~5s (快 14 倍) | 約 $0.07/次 |
| `standard` (Sonnet) | 預設開發、`bin/test-lane --eval` | ~17s (快 4 倍) | 約 $0.37/次 |
| `full` (Opus 人格) | **`/ship` 與合併前** | ~72s (基準) | 約 $1.27/次 |

---

## 步驟 3.4：測試覆蓋率審核 (Test Coverage Audit)

目標是 100% 覆蓋率 — 每個未經測試的路徑都是 Bug 隱藏之處，也是憑感覺編程變成放手一搏之處。請根據「實際編寫的內容」（來自差異）進行評估，而非計劃內容。

**0. 統計測試前後數量：**

```bash
# 計算生成前的測試檔案數
find . -name '*.test.*' -o -name '*.spec.*' -o -name '*_test.*' -o -name '*_spec.*' | grep -v node_modules | wc -l
```

儲存此數字供 PR 說明使用。

**1. 追蹤變更的每個代碼路徑** (使用 `git diff origin/<base>...HEAD`)：

閱讀每個變更的檔案。針對每一項，追蹤數據如何流經代碼 —— 不要只是列出函式，要實際跟隨執行流程：

1. **閱讀差異**。針對每個變更的檔案，閱讀完整檔案（不只是差異片段）以理解背景。
2. **追蹤資料流**。從每個進入點（路由處理程序、導出的函式、事件監聽器、組件渲染）開始，跟隨數據穿過每個分支：
   - 輸入來自何處？（請求參數、props、資料庫、API 調用）
   - 什麼轉換了它？（驗證、映射、計算）
   - 它流向何處？（資料庫寫入、API 響應、渲染輸出、副作用）
   - 每一步可能出什麼錯？（null/undefined、無效輸入、網路故障、空集合）
3. **繪製執行圖**。針對每個變更的檔案，繪製一個 ASCII 圖表顯示：
   - 每個新增或修改的函式/方法
   - 每個條件分支 (if/else, switch, 三元運算, guard clause, 提早回傳)
   - 每個錯誤路徑 (try/catch, rescue, error boundary, fallback)
   - 每個對其他函式的調用（追蹤進去 — 它是否有未測試的分支？）
   - 每個邊界：輸入為 null 時如何？空陣列？無效類型？

這是關鍵步驟 —— 你正在建立一份地圖，標記每一行會根據輸入而執行不同的代碼。圖中的每個分支都需要測試。

**2. 映射用戶流程、互動與錯誤狀態：**

僅有代碼覆蓋率是不夠的 —— 你需要覆蓋真實用戶如何與變更代碼互動。針對每個變更的功能，思考：

- **用戶流程**：用戶執行哪些動作序列會觸及此代碼？映射完整旅程（例如：「用戶點擊『支付』 → 表單驗證 → API 調用 → 成功/失敗畫面」）。旅程中的每一步都需要測試。
- **互動邊際情況**：當用戶執行非預期動作時會發生什麼？
  - 連點/快速重複提交
  - 在操作中途導航離開（返回鍵、關閉分頁、點擊其他連結）
  - 使用過時數據提交（頁面停留在那 30 分鐘、會話過期）
  - 網路緩慢（API 耗時 10 秒 — 用戶看到什麼？）
  - 並發動作（兩個分頁，同一個表單）
- **用戶可見的錯誤狀態**：針對代碼處理的每個錯誤，用戶實際體驗到什麼？
  - 是有清晰的錯誤訊息，還是默然失敗？
  - 用戶能否恢復（重試、返回、修正輸入），還是被卡住了？
  - 無網路時會發生什麼？API 報 500 時？服務端回傳無效數據時？
- **空白/歸零/邊界狀態**：UI 在零結果時顯示什麼？10,000 個結果時？單個字元輸入時？最大長度輸入時？

將這些加入到你的圖表中，與代碼分支並列。沒有測試的用戶流程與未測試的 if/else 一樣都是缺口。

**3. 檢查每個分支相對於既有測試：**

逐一檢查圖表中的分支 —— 包括代碼路徑與用戶流程。針對每一項，尋找對應的測試：
- 函式 `processPayment()` → 尋找 `billing.test.ts`, `billing.spec.ts`, `test/billing_test.rb`
- if/else → 尋找覆蓋了 TRUE 與 FALSE 「兩者」路徑的測試
- 錯誤處理程序 → 尋找觸發該特定錯誤條件的測試
- 調用 `helperFn()` 且其具備自身分支 → 那些分支也需要測試
- 用戶流程 → 尋找走完整個旅程的整合或 E2E 測試
- 互動邊際情況 → 尋找模擬非預期動作的測試

品質評分標準：
- ★★★  測試了包含邊際情況與錯誤路徑的行為
- ★★   僅測試了正確行為（正常路徑）
- ★    冒煙測試 / 存在性檢查 / 微不足道的斷言（例如：「它有渲染」、「它沒報錯」）

**4. 輸出 ASCII 覆蓋率圖表：**

在同一個圖表中包含代碼路徑與用戶流程：

```
代碼路徑覆蓋率 (CODE PATH COVERAGE)
===========================
[+] src/services/billing.ts
    │
    ├── processPayment()
    │   ├── [★★★ 已測試] 正常路徑 + 信用卡遭拒 + 逾時 — billing.test.ts:42
    │   ├── [缺口]         網路逾時 — 無測試 (NO TEST)
    │   └── [缺口]         無效幣別 — 無測試 (NO TEST)
    │
    └── refundPayment()
        ├── [★★  已測試] 全額退款 — billing.test.ts:89
        └── [★   已測試] 部分退款 (僅檢查未報錯) — billing.test.ts:101

用戶流程覆蓋率 (USER FLOW COVERAGE)
===========================
[+] 支付結帳流程
    │
    ├── [★★★ 已測試] 完成購買 — checkout.e2e.ts:15
    ├── [缺口]         重複點擊提交 — 無測試 (NO TEST)
    ├── [缺口]         支付期間導航離開 — 無測試 (NO TEST)
    └── [★   已測試] 表單驗證錯誤 (僅檢查渲染) — checkout.test.ts:40

[+] 錯誤狀態
    │
    ├── [★★  已測試] 信用卡遭拒訊息 — billing.test.ts:58
    ├── [缺口]         網路逾時 UX (用戶看到什麼？) — 無測試 (NO TEST)
    └── [缺口]         提交空購物車 — 無測試 (NO TEST)

─────────────────────────────────
覆蓋率：5/12 路徑已測試 (42%)
  代碼路徑：3/5 (60%)
  用戶流程：2/7 (29%)
品質評分：★★★: 2  ★★: 2  ★: 1
缺口：7 條路徑需要測試
─────────────────────────────────
```

**快速路徑**：若路徑全覆蓋 → 「步驟 3.4：所有新代碼路徑均具備測試覆蓋率 ✓」繼續執行。

**5. 為未覆蓋路徑生成測試：**

若偵測到測試框架（或在步驟 2.5 已引導）：
- 優先處理錯誤處理程序與邊際情況（正常路徑更有可能已測試）
- 讀取 2-3 個現有測試檔案以精確匹配規範
- 生成單元測試。模擬 (Mock) 所有外部依賴（資料庫、API、Redis）。
- 撰寫執行特定未覆蓋路徑且具備真實斷言的測試
- 執行每個測試。通過 → 提交為 `test: coverage for {功能名稱}`
- 失敗 → 修正一次。仍失敗 → 還原變更，並在圖表中註明缺口。

限制：代碼路徑上限 30 個，生成測試上限 20 個（代碼 + 用戶流程合計），單個測試探索時間上限 2 分鐘。

若無測試框架且用戶拒絕引導 → 僅展示圖表，不生成測試。註明：「跳過測試生成 — 未配置測試框架。」

**差異僅含測試變更**：跳過步驟 3.4：「無新應用代碼路徑需審計。」

**6. 更新統計與覆蓋率摘要：**

```bash
# 計算生成後的測試檔案數
find . -name '*.test.*' -o -name '*.spec.*' -o -name '*_test.*' -o -name '*_spec.*' | grep -v node_modules | wc -l
```

供 PR 說明使用：`測試：{之前} → {之後} (+{變化量} 個新測試)`
覆蓋率說明：`測試覆蓋率審計：N 個新代碼路徑。M 個已覆蓋 (X%)。生成了 K 個測試，J 個已提交。`

---

## 步驟 3.5：交付前審核 (Pre-Landing Review)

針對差異進行分析，找出測試無法捕捉的結構性問題。

1. 閱讀 `.claude/skills/review/checklist_zh_TW.md`。若無法讀取該檔案，則 **停止** 並報告錯誤。

2. 執行 `git diff origin/<base>` 獲取完整的差異（範圍限定為功能分支相對於剛獲取的基準分支的變更）。

3. 對照審核清單分兩輪進行：
   - **第一輪 (關鍵)**：SQL 與數據安全、LLM 輸出信任邊界
   - **第二輪 (資訊)**：其餘所有類別

## 設計審核 (具備條件，針對差異範疇)

使用 `gstack-diff-scope` 檢查差異是否觸及前端檔案：

```bash
source <(~/.codex/skills/gstack/bin/gstack-diff-scope <base> 2>/dev/null)
```

**若 `SCOPE_FRONTEND=false`**：靜默跳過設計審核。無輸出。

**若 `SCOPE_FRONTEND=true`**：

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
~/.codex/skills/gstack/bin/gstack-review-log '{"skill":"design-review-lite","timestamp":"TIMESTAMP","status":"STATUS","findings":N,"auto_fixed":M,"commit":"COMMIT"}'
```

替換內容：TIMESTAMP = ISO 8601 時間, STATUS = 若發現項為 0 則為 "clean" 否則為 "issues_found", N = 總發現項數, M = 自動修復數, COMMIT = `git rev-parse --short HEAD` 的輸出。

   將任何設計發現項與代碼審核發現項並列。它們在下方遵循相同的「優先修復」流程。

4. 根據 `checklist_zh_TW.md` 中的「優先修復啟發式」方法，將每個發現項分類為 **自動修復 (AUTO-FIX)** 或 **詢問 (ASK)**。關鍵發現項傾向於使用 **詢問**；資訊性發現項傾向於使用 **自動修復**。

5. **自動修復所有 AUTO-FIX 項目**。直接套用每項修復。針對每一項，輸出一行摘要：
   `[自動修復] [檔案:行號] 問題 → 執行了什麼`

6. **若仍有 ASK 項目**，請在一個 AskUserQuestion 中呈現：
   - 列出每個項目，包含編號、嚴重程度、問題內容以及建議的修復方案
   - 為每個項目提供選項：A) 修復, B) 跳過
   - 包含一個整體的「建議」
   - 若 ASK 項目為 3 個或更少，你可以使用單獨的 AskUserQuestion 調用而非批次處理

7. **在所有修復完成後 (自動修復 + 用戶批准)**：
   - 若有套用「任何」修復：按名稱提交修復後的檔案 (`git add <fixed-files> && git commit -m "fix: pre-landing review fixes"`)，然後 **停止** 並告訴用戶重新執行 `/ship` 以重新測試。
   - 若無套用任何修復（所有 ASK 項目均被跳過，或未發現問題）：繼續執行步驟 4。

8. 輸出摘要：`交付前審核：N 個問題 — M 個自動修復，K 個詢問 (J 個已修復，L 個已跳過)`

   若未發現問題：`交付前審核：未發現問題。`

儲存審核輸出 —— 這些內容將進入步驟 8 的 PR 說明中。

---

## 步驟 3.75：處理 Greptile 審核評論 (若 PR 已存在)

讀取 `.claude/skills/review/greptile-triage_zh_TW.md` 並遵循獲取、過濾、分類及 **呈報偵測** 步驟。

**若不存在 PR、`gh` 失敗、API 回傳錯誤或無任何 Greptile 評論：** 靜默跳過此步驟。繼續執行步驟 4。

**若發現 Greptile 評論：**

在輸出中包含 Greptile 摘要：`+ N 條 Greptile 評論 (X 條有效, Y 條已修復, Z 條誤判)`

在回覆任何評論前，執行 `greptile-triage_zh_TW.md` 中的 **呈報偵測** 演算法，以決定使用第 1 級（友善）或第 2 級（堅定）回覆模板。

針對每條歸類的評論：

**有效且可操作 (VALID & ACTIONABLE)**：使用 AskUserQuestion，包含：
- 評論內容 (檔案:行號 或 [頂層] + 內容摘要 + 永久連結 URL)
- `建議：選擇 A，因為 [一行理由]`
- 選項：A) 現在修復, B) 確認並照樣發布, C) 這是誤判
- 若用戶選擇 A：套用修復、提交修復後的檔案 (`git add <fixed-files> && git commit -m "fix: address Greptile review — <簡短描述>"`）、使用 `greptile-triage_zh_TW.md` 中的 **修復回覆模板** 進行回覆（包含內聯差異 + 解釋），並儲存至專案本地與全域的 `greptile-history`（類型：fix）。
- 若用戶選擇 C：使用 **誤判回覆模板** 進行回覆（包含證據 + 建議重新分級），並儲存至專案本地與全域的 `greptile-history`（類型：fp）。

**有效但已修復 (VALID BUT ALREADY FIXED)**：使用 `greptile-triage_zh_TW.md` 中的 **已修復回覆模板** 進行回覆 —— 無需 AskUserQuestion：
- 包含已執行的操作與修復該問題的提交 SHA
- 儲存至專案本地與全域的 `greptile-history`（類型：already-fixed）

**誤判 (FALSE POSITIVE)**：使用 AskUserQuestion：
- 展示評論內容以及你認為它是錯誤的理由 (檔案:行號 或 [頂層] + 內容摘要 + 永久連結 URL)
- 選項：
  - A) 回覆 Greptile 解釋此誤判（若明顯錯誤則推薦此項）
  - B) 照樣修復（若微不足道）
  - C) 靜默忽視
- 若用戶選擇 A：使用 **誤判回覆模板** 進行回覆（包含證據 + 建議重新分級），並儲存至專案本地與全域的 `greptile-history`（類型：fp）

**已抑制 (SUPPRESSED)**：靜默跳過 —— 這些是來自先前分類的已知誤判。

**在所有評論解決後**：若套用了任何修復，則步驟 3 的測試現已過時。在繼續執行步驟 4 前 **重新執行測試** (步驟 3)。若無套用修復，繼續執行步驟 4。

---

## 步驟 3.8：Codex 審核

檢查 Codex CLI 是否可用，並讀取用戶的 Codex 審核偏好：

```bash
which codex 2>/dev/null && echo "CODEX_AVAILABLE" || echo "CODEX_NOT_AVAILABLE"
CODEX_REVIEWS_CFG=$(~/.codex/skills/gstack/bin/gstack-config get codex_reviews 2>/dev/null || true)
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
~/.codex/skills/gstack/bin/gstack-config set codex_reviews enabled
```

若用戶選擇 B：這次執行兩者，但不持久化任何設置。

若用戶選擇 C：持久化拒絕設置並跳過：
```bash
~/.codex/skills/gstack/bin/gstack-config set codex_reviews disabled
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

若用戶選擇 A：仔細閱讀 Codex 的發現項並著手處理。修復後，重新執行測試 (步驟 3)，因為代碼已變更。然後重新執行 `codex review` 以驗證閘門現在是否為 **通過 (PASS)**。

若用戶選擇 B：繼續執行下一步。

### 錯誤處理 (代碼審核)

在持久化閘門結果前，檢查是否有錯誤。所有錯誤均不具阻礙性 —— Codex 是品質增強功能，而非先決條件。檢查 `$TMPERR` 輸出（剛才已讀取）是否有錯誤指示：

- **驗證失敗**：若標準錯誤包含 "auth", "login", "unauthorized" 或 "API key"，告訴用戶：「Codex 驗證失敗。請在終端執行 \`codex login\` 透過 ChatGPT 進行驗證。」不要持久化審核日誌記錄。繼續進行對抗性步驟（很可能也會失敗，但仍請嘗試）。
- **逾時**：若 Bash 調用在 5 分鐘後逾時，告訴用戶：「Codex 已逾時 (5 分鐘)。差異可能過大或 API 反應過慢。」不要持久化審核日誌記錄。跳過至清理步驟。
- **空回應**：若 codex 未回傳任何標準輸出 (stdout)，告訴用戶：「Codex 未回傳回應。錯誤訊息：<貼上相關錯誤>。」不要持久化審核日誌記錄。跳過至清理步驟。

**僅當 codex 產出真實審核（非空輸出）時**：持久化代碼審核結果：
```bash
~/.codex/skills/gstack/bin/gstack-review-log '{"skill":"codex-review","timestamp":"'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'","status":"STATUS","gate":"GATE","commit":"'"$(git rev-parse --short HEAD)"'"}'
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

**清理**：處理完成後執行 `rm -f "$TMPERR" "$TMPERR_ADV"`。

---

## 步驟 4：版本提升 (自動決定)

1. 讀取目前的 `VERSION` 檔案（4 位數格式：`MAJOR.MINOR.PATCH.MICRO`）

2. **根據差異自動決定提升等級：**
   - 統計變更行數 (`git diff origin/<base>...HEAD --stat | tail -1`)
   - **MICRO** (第 4 位)：變更 < 50 行、微調、錯字修復、配置變更
   - **PATCH** (第 3 位)：變更 50 行以上、Bug 修復、中小型功能
   - **MINOR** (第 2 位)：**詢問用戶** — 僅限重大功能或顯著的架構變更
   - **MAJOR** (第 1 位)：**詢問用戶** — 僅限里程碑版本或破壞性變更

3. 計算新版本號：
   - 提升某位數字會將其右側所有數字重置為 0
   - 範例：`0.19.1.0` + PATCH → `0.19.2.0`

4. 將新版本號寫入 `VERSION` 檔案。

---

## 步驟 5：更新日誌 (CHANGELOG) (自動生成)

1. 讀取 `CHANGELOG_zh_TW.md` 標題以了解格式。

2. 從 **此分支上的「所有」提交**（而不只是最近的）自動生成條目：
   - 使用 `git log <base>..HEAD --oneline` 查看發布的所有提交
   - 使用 `git diff <base>...HEAD` 查看相對於基準分支的完整差異
   - CHANGELOG 條目必須涵蓋進入此 PR 的「所有」變更
   - 若分支上已存在的 CHANGELOG 條目已涵蓋部分提交，請用新版本的單一統一條目替換它們
   - 將變更歸類至適用章節：
     - `### 新增 (Added)` — 新功能
     - `### 變更 (Changed)` — 現有功能的變更
     - `### 修復 (Fixed)` — Bug 修復
     - `### 移除 (Removed)` — 移除的功能
   - 撰寫簡潔、具備描述性的項目符號點
   - 插入至檔案標頭後（第 5 行），標註今日日期
   - 格式：`## [X.Y.Z.W] - YYYY-MM-DD`

**不要詢問用戶描述變更。** 請從差異與提交歷史中推導。

---

## 步驟 5.5：TODOS_zh_TW.md (自動更新)

將專案的 `TODOS_zh_TW.md` 與即將發布的變更進行交叉比對。自動標記已完成項目；僅在檔案缺失或混亂時提示用戶。

參閱 `.claude/skills/review/TODOS-format_zh_TW.md` 獲取規範格式參考。

**1. 檢查倉庫根目錄是否存在 `TODOS_zh_TW.md`**。

**若 `TODOS_zh_TW.md` 不存在**：使用 AskUserQuestion：
- 訊息：「GStack 建議維護一份按技能/組件組織，並按優先級排序（P0 在頂部，P4 在底部，完成項目在最後）的 `TODOS_zh_TW.md`。參閱 `TODOS-format_zh_TW.md` 了解完整格式。您想要建立一份嗎？」
- 選項：A) 現在建立, B) 暫時跳過
- 若選擇 A：建立 `TODOS_zh_TW.md` 骨架（# 待辦事項 標題 + ## 已完成 章節）。繼續執行步驟 3。
- 若選擇 B：跳過步驟 5.5 的剩餘部分。繼續執行步驟 6。

**2. 檢查結構與組織：**

讀取 `TODOS_zh_TW.md` 並驗證是否遵循建議結構：
- 項目歸類在 `## <技能/組件>` 標題下
- 每個項目都有 `**優先級:**` 欄位及 P0-P4 的值
- 底部有 `## 已完成` 章節

**若組織混亂**（缺失優先級欄位、無組件歸類、無已完成章節）：使用 AskUserQuestion：
- 訊息：「`TODOS_zh_TW.md` 未遵循建議結構（技能/組件歸類、P0-P4 優先級、已完成章節）。您想要重組它嗎？」
- 選項：A) 現在重組（推薦）, B) 保持現狀
- 若選擇 A：依照 `TODOS-format_zh_TW.md` 原地進行重組。保留所有內容 —— 僅調整結構，絕不刪除項目。
- 若選擇 B：直接繼續執行步驟 3，不進行重組。

**3. 偵測已完成的待辦事項：**

此步驟為全自動 —— 無用戶互動。

利用先前步驟收集的差異與提交歷史：
- `git diff <base>...HEAD`（相對於基準分支的完整差異）
- `git log <base>..HEAD --oneline`（發布的所有提交）

針對每個待辦項目，透過以下方式檢查此 PR 中的變更是否已完成它：
- 將提交訊息與待辦事項的標題和描述進行比對
- 檢查待辦事項中引用的檔案是否出現在差異中
- 檢查待辦事項描述的工作是否與功能性變更匹配

**保持審慎**：僅在差異中有明確證據時才將待辦事項標記為已完成。若不確定，請保持原樣。

**4. 移動已完成項目** 至底部的 `## 已完成` 章節。追加：`**完成於:** vX.Y.Z (YYYY-MM-DD)`

**5. 輸出摘要：**
- `TODOS_zh_TW.md: N 個項目已標記為完成 (項目1, 項目2, ...)。尚餘 M 個項目。`
- 或：`TODOS_zh_TW.md: 未偵測到已完成項目。尚餘 M 個項目。`
- 或：`TODOS_zh_TW.md: 已建立。` / `TODOS_zh_TW.md: 已重組。`

**6. 防禦性處理**：若無法寫入 `TODOS_zh_TW.md`（權限錯誤、磁碟已滿），警告用戶並繼續。絕不因待辦事項更新失敗而停止發布流程。

儲存此摘要 —— 這些內容將進入步驟 8 的 PR 說明中。

---

## 步驟 6：提交 (拆分為可細分的區塊)

**目標：** 建立小型且邏輯清晰的提交，以便於 `git bisect` 並協助 LLM 理解變更內容。

1. 分析差異並將變更歸組為邏輯提交。每個提交應代表 **一個連貫的變更** —— 不是一個檔案，而是一個邏輯單元。

2. **提交順序** (較早的變更在前)：
   - **基礎設施**：遷移、配置變更、路由增加
   - **模型與服務**：新模型、服務、Concern (及其測試)
   - **控制器與視圖**：控制器、視圖、JS/React 組件 (及其測試)
   - **VERSION + CHANGELOG + TODOS_zh_TW.md**：始終放在最後一個提交

3. **拆分規則：**
   - 模型及其測試檔案放在同一個提交
   - 服務及其測試檔案放在同一個提交
   - 控制器、其視圖及測試放在同一個提交
   - 遷移應獨立為一個提交（或與其支援的模型歸在同一組）
   - 配置/路由變更可與其啟用的功能歸在同一組
   - 若總差異較小（跨越少於 4 個檔案且變更 < 50 行），單一提交即可

4. **每個提交必須獨立有效** —— 無損壞的導入，無指向尚不存在代碼的引用。按依賴關係排序，確保依賴項在前。

5. 撰寫每個提交的訊息：
   - 第一行：`<類型>: <摘要>` (類型 = feat/fix/chore/refactor/docs)
   - 正文：簡要描述此提交包含的內容
   - 僅在 **最後一個提交** (VERSION + CHANGELOG) 包含版本標籤與共同作者後綴：

```bash
git commit -m "$(cat <<'EOF'
chore: bump version and changelog (vX.Y.Z.W)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## 步驟 6.5：驗證門檻 (Verification Gate)

**鐵律：無最新驗證證據，不得宣稱完成。**

在推送前，若代碼在步驟 4-6 期間發生變更，請重新驗證：

1. **測試驗證**：若在步驟 3 的測試運行後有「任何」代碼變更（來自審核發現的修復，CHANGELOG 編輯不計入），請重新執行測試套件。貼上最新的輸出結果。來自步驟 3 的過時輸出是 **不可接受的**。

2. **建置驗證**：若專案具備建置步驟，請執行它並貼上輸出結果。

3. **防止合理化：**
   - 「現在應該沒問題了」 → **請執行測試**。
   - 「我有信心」 → 信心不是證據。
   - 「我剛才測過了」 → 代碼之後又變更了。請重新測試。
   - 「這只是微小的變更」 → 微小的變更也會搞垮生產環境。

**若測試在此處失敗**：停止。不要推送。修復問題並回到步驟 3。

宣稱工作完成卻未經驗證是欺騙行為，而非效率。

---

## 步驟 7：推送 (Push)

推送到遠端並設置上游追蹤：

```bash
git push -u origin <branch-name>
```

---

## 步驟 8：建立 PR

使用 `gh` 建立拉取請求：

```bash
gh pr create --base <base> --title "<類型>: <摘要>" --body "$(cat <<'EOF'
## 摘要
<來自 CHANGELOG 的項目符號點>

## 測試覆蓋率
<來自步驟 3.4 的覆蓋率圖表，或「所有新代碼路徑均具備測試覆蓋率。」>
<若執行了步驟 3.4：「測試：{之前} → {之後} (+{變化量} 個新測試)」>

## 交付前審核
<來自步驟 3.5 的代碼審核發現，或「未發現問題。」>

## 設計審核
<若執行了設計審核：「設計審核 (簡易版)：N 項發現 — M 個自動修復，K 個跳過。AI 粗糙感：乾淨/N 個問題。」>
<若無前端檔案變更：「無前端檔案變更 — 跳過設計審核。」>

## 評估結果
<若執行了評估：套件名稱、通過/失敗計數、成本儀表板摘要。若跳過：「無提示詞相關檔案變更 — 跳過評估。」>

## Greptile 審核
<若發現 Greptile 評論：標註 [已修復] / [誤判] / [先前已修復] 的項目列表 + 每條評論的一行摘要>
<若無 Greptile 評論：「無 Greptile 評論。」>
<若步驟 3.75 期間不存在 PR：完全省略此章節>

## 待辦事項 (TODOS)
<若有項目標記為完成：已完成項目列表及版本號>
<若無項目完成：「此 PR 未完成任何待辦事項。」>
<若建立或重組了 TODOS_zh_TW.md：註明此事>
<若 TODOS_zh_TW.md 不存在且用戶跳過：省略此章節>

## 測試計劃
- [x] 所有 Rails 測試皆通過 (N 次執行，0 次失敗)
- [x] 所有 Vitest 測試皆通過 (N 個測試)

🤖 由 [Claude Code](https://claude.com/claude-code) 自動生成
EOF
)"
```

**輸出 PR URL** — 然後繼續執行步驟 8.5。

---

## 步驟 8.5：自動調用 /document-release

PR 建立後，自動同步專案文件。讀取與此技能目錄相鄰的 `document-release/SKILL_zh_TW.md` 技能檔案，並執行其完整工作流：

1. 讀取 `/document-release` 技能：`cat ${CLAUDE_SKILL_DIR}/../document-release/SKILL_zh_TW.md`
2. 遵循其指令 —— 它會讀取專案中所有 .md 檔案、交叉比對差異，並更新任何產生偏差的內容 (README_zh_TW.md, ARCHITECTURE_zh_TW.md, CONTRIBUTING_zh_TW.md, CLAUDE_zh_TW.md, TODOS_zh_TW.md 等)
3. 若有任何文件更新，提交變更並推送至同一分支：
   ```bash
   git add -A && git commit -m "docs: sync documentation with shipped changes" && git push
   ```
4. 若無文件需更新，說：「文件已是最新狀態 — 無需更新。」

此步驟為自動執行。不要詢問用戶確認。目標是零摩擦的文件更新 —— 用戶執行 `/ship`，文件就能自動保持最新，無需額外指令。

---

## 重要規則

- **絕不跳過測試**。若測試失敗，停止發布。
- **絕不跳過交付前審核**。若無法讀取 `checklist_zh_TW.md`，停止發布。
- **絕不強制推送 (force push)**。僅使用常規的 `git push`。
- **絕不要求微不足道的確認**（例如：「準備好推送了嗎？」、「建立 PR 嗎？」）。**務必** 在以下情況停止：版本提升 (MINOR/MAJOR)、交付前審核發現 (ASK 項目)、Codex 關鍵發現 ([P1])，以及一次性的 Codex 加入提示。
- **始終使用來自 VERSION 檔案的 4 位數版本格式**。
- **CHANGELOG 中的日期格式**：`YYYY-MM-DD`
- **拆分提交以確保可細分性** — 每個提交 = 一個邏輯變更。
- **TODOS_zh_TW.md 的完成偵測必須保守**。僅在差異明確顯示工作已完成時才標記。
- **使用來自 greptile-triage_zh_TW.md 的 Greptile 回覆模板**。每個回覆都必須包含證據（內聯差異、代碼引用、重新分級建議）。絕不發布模糊的回覆。
- **無最新驗證證據，絕不推送**。若步驟 3 測試後代碼有變更，推送前必須重新測試。
- **步驟 3.4 生成的覆蓋率測試必須通過後才能提交**。絕不提交失敗的測試。
- **最終目標：用戶輸入 `/ship`，接下來看到的就是審核結果 + PR URL + 自動同步的文件。**
