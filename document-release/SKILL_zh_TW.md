---
name: document-release
version: 1.0.0
description: |
  交付後的文件更新。讀取專案中的所有文件、與差異進行交叉比對，更新 README/ARCHITECTURE/CONTRIBUTING/CLAUDE_zh_TW.md
  以匹配已交付的內容，修飾更新日誌 (CHANGELOG) 的語氣，清理待辦事項 (TODOS)，並可選擇性地提升版本號 (VERSION)。
  當被要求「update the docs」、「sync documentation」或「post-ship docs」時使用。
  當 PR 合併或程式碼交付後主動建議。
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
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
echo '{"skill":"document-release","ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","repo":"'$(basename "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || echo "unknown")'"}'  >> ~/.gstack/analytics/skill-usage.jsonl 2>/dev/null || true
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

執行此 bash：

```bash
_TEL_END=$(date +%s)
_TEL_DUR=$(( _TEL_END - _TEL_START ))
rm -f ~/.gstack/analytics/.pending-"$_SESSION_ID" 2>/dev/null || true
~/.claude/skills/gstack/bin/gstack-telemetry-log \
  --skill "SKILL_NAME" --duration "$_TEL_DUR" --outcome "OUTCOME" \
  --used-browse "USED_BROWSE" --session-id "$_SESSION_ID" 2>/dev/null &
```

將 `SKILL_NAME` 替換為 frontmatter 中的實際技能名稱，`OUTCOME` 替換為 success/error/abort，並根據是否使用了 `$B` 將 `USED_BROWSE` 替換為 true/false。

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

# Document Release: 交付後文件更新 (Post-Ship Documentation Update)

你正在執行 `/document-release` 工作流。此流程在 **`/ship` 之後**（代碼已提交，PR 已存在或即將建立）但在 **PR 合併之前** 執行。你的任務是：確保專案中的每一份文件檔案都是準確、最新，且以親切、以用戶為中心的語氣撰寫。

此流程大多為自動化。請直接執行明顯的事實更新。僅在面臨高風險或主觀決策時才停下來詢問。

**僅在以下情況停止：**
- 高風險/具爭議的文件變更（敘述方式、哲學、安全性、內容刪除、大規模重寫）
- 版本號 (VERSION) 提升決策（若尚未提升）
- 需要新增的待辦事項 (TODOS)
- 文件間存在敘述性（而非事實性）的矛盾

**絕不因以下情況停止：**
- 根據差異分析得出的事實修正
- 在表格/列表中新增項目
- 更新路徑、計數、版本號
- 修復過時的交叉引用
- 更新日誌 (CHANGELOG) 語氣磨光（微小的措辭調整）
- 標記待辦事項為已完成
- 文件間的事實不一致（例如版本號不匹配）

**鐵律：**
- **絕不** 覆蓋、取代或重新生成 CHANGELOG 條目 —— 僅修飾措辭，保留所有內容
- **絕不** 在未詢問的情況下提升 VERSION —— 版本變更務必使用 AskUserQuestion
- **絕不** 對 CHANGELOG.md 使用 `Write` 工具 —— 務必使用 `Edit` 並配合精確的 `old_string` 匹配

---

## 步驟 1：預檢與差異分析

1. 檢查當前分支。若在基準分支上，則 **中止**：「你正在基準分支上。請從功能分支執行。」

2. 收集關於變更內容的背景資訊：

```bash
git diff <base>...HEAD --stat
```

```bash
git log <base>..HEAD --oneline
```

```bash
git diff <base>...HEAD --name-only
```

3. 尋找倉庫中所有的文件檔案：

```bash
find . -maxdepth 2 -name "*.md" -not -path "./.git/*" -not -path "./node_modules/*" -not -path "./.gstack/*" -not -path "./.context/*" | sort
```

4. 將變更內容歸類為與文件相關的類別：
   - **新功能** — 新檔案、新指令、新技能、新能力
   - **行為變更** — 修改過的服務、更新的 API、配置變更
   - **移除的功能** — 刪除的檔案、移除的指令
   - **基礎設施** — 建置系統、測試基礎設施、CI

5. 輸出簡短摘要：「正在分析 M 次提交中變更的 N 個檔案。發現 K 個文件檔案待審核。」

---

## 步驟 2：各檔案文件審核

閱讀每份文件檔案並與差異進行交叉比對。使用這些通用的啟發式方法（請根據你所處的專案進行調整 —— 這些不限於 gstack）：

**README_zh_TW.md：**
- 是否描述了差異中可見的所有功能與能力？
- 安裝/設置說明是否與變更一致？
- 範例、演示與用法描述是否仍然有效？
- 疑難排解步驟是否仍然準確？

**ARCHITECTURE_zh_TW.md：**
- ASCII 圖表與組件描述是否與當前代碼匹配？
- 設計決策與「為什麼」的解釋是否仍然準確？
- 保持審慎 —— 僅更新與差異內容明確衝突之處。架構文件描述的是不太可能頻繁變動的事物。

**CONTRIBUTING_zh_TW.md — 新貢獻者冒煙測試：**
- 像一名全新的貢獻者一樣走一遍設置說明。
- 列出的指令是否準確？每一步都會成功嗎？
- 測試層級描述是否與當前的測試基礎設施匹配？
- 工作流描述（開發設置、貢獻者模式等）是否為最新？
- 標記任何會導致初次參與者失敗或困惑之處。

**CLAUDE_zh_TW.md / 專案說明：**
- 專案結構章節是否與實際的檔案樹匹配？
- 列出的指令與腳本是否準確？
- 建置/測試說明是否與 package.json（或等效檔案）中的內容匹配？

**其他任何 .md 檔案：**
- 閱讀檔案內容，確定其用途與受眾。
- 與差異進行交叉比對，檢查是否與檔案所述內容矛盾。

針對每個檔案，將需要的更新歸類為：

- **自動更新 (Auto-update)** — 差異中明確證明的事實修正：在表格中新增項目、更新檔案路徑、修正計數、更新專案結構樹。
- **詢問用戶 (Ask user)** — 敘述性變更、章節刪除、安全模型變更、大規模重寫（單一章節超過約 10 行）、相關性不明確、增加全新章節。

---

## 步驟 3：執行自動更新

使用 Edit 工具直接進行所有清晰的事實更新。

針對每個修改的檔案，輸出一段單行摘要描述 **具體變更了什麼** —— 不僅僅是「更新了 README_zh_TW.md」，而是「README_zh_TW.md：在技能表中新增了 /new-skill，將技能總數從 9 更新為 10。」

**絕不自動更新：**
- README 引言或專案定位
- ARCHITECTURE 哲學或設計理由
- 安全模型描述
- 不要從任何文件中移除整個章節

---

## 步驟 4：詢問風險/具爭議的變更

針對步驟 2 中識別的每個具風險或具爭議的更新，使用 AskUserQuestion，包含：
- 背景：專案名稱、分支、哪個文件檔案、審核內容
- 具體的文件決策
- `建議：選擇 [X]，因為 [一行理由]`
- 選項包含 C) 跳過 — 保持原樣

在獲得每個答案後立即套用核准的變更。

---

## 步驟 5：更新日誌 (CHANGELOG) 語氣磨光

**關鍵 — 絕不覆蓋更新日誌條目。**

此步驟僅為磨光語氣。**不應** 重寫、取代或重新生成 CHANGELOG 內容。

曾發生過代理在應該保留現有條目時卻將其替換的案例。此技能 **絕對禁止** 此類行為。

**規則：**
1. 首先閱讀完整的 CHANGELOG_zh_TW.md。了解已存在的內容。
2. 僅修改現有條目內的措辭。絕不刪除、重新排序或取代條目。
3. 絕不重新生成 CHANGELOG 條目。條目是由 `/ship` 根據實際差異與提交歷史撰寫的。它是事實來源。你是在修飾散文，而非重寫歷史。
4. 若條目看起來錯誤或不完整，請使用 AskUserQuestion —— **不要** 靜默修復。
5. 使用 Edit 工具配合精確的 `old_string` 匹配 —— 絕不使用 Write 覆蓋 CHANGELOG_zh_TW.md。

**若 CHANGELOG 在此分支中未被修改：** 跳過此步驟。

**若 CHANGELOG 在此分支中已被修改**，審核該條目的語氣：

- **促銷測試 (Sell test)**：用戶閱讀每個項目符號時，會覺得「喔不錯，我想試試看」嗎？若否，請重寫措辭（而非內容）。
- 以用戶現在能 **做** 什麼開頭 —— 而非實作細節。
- 「你現在可以...」而非「重構了...」
- 標記並重寫任何讀起來像提交訊息的條目。
- 內部/貢獻者變更應放在獨立的「### 給貢獻者」子章節中。
- 自動修復微小的語氣調整。若重寫會改變原意，請使用 AskUserQuestion。

---

## 步驟 6：文件間一致性與可發現性檢查

在單獨審核每個檔案後，執行文件間的一致性檢查：

1. README 的功能/能力列表是否與 CLAUDE_zh_TW.md（或專案說明）描述的內容匹配？
2. ARCHITECTURE 的組件列表是否與 CONTRIBUTING_zh_TW.md 的專案結構描述匹配？
3. CHANGELOG 的最新版本是否與 VERSION 檔案匹配？
4. **可發現性 (Discoverability)**：是否每份文件檔案都能從 README_zh_TW.md 或 CLAUDE_zh_TW.md 連結到達？若存在 ARCHITECTURE_zh_TW.md 但 README 和 CLAUDE_zh_TW.md 都未連結它，請標記。每份文件都應能從這兩個入口檔案之一被發現。
5. 標記文件間的任何矛盾之處。自動修復明顯的事實不一致（例如版本號不匹配）。針對敘述性的矛盾請使用 AskUserQuestion。

---

## 步驟 7：待辦事項 (TODOS_zh_TW.md) 清理

這是對 `/ship` 步驟 5.5 的補充檢查。參閱 `review/TODOS-format_zh_TW.md`（若可用）獲取規範格式。

若 `TODOS_zh_TW.md` 不存在，跳過此步驟。

1. **尚未標記的已完成項目**：將差異與開啟中的待辦項目進行交叉比對。若某個待辦事項顯然已被此分支的變更完成，將其移動至「已完成」章節並註明 `**完成於:** vX.Y.Z.W (YYYY-MM-DD)`。保持審慎 —— 僅標記差異中有明確證據的項目。

2. **需要更新描述的項目**：若某個待辦事項引用的檔案或組件已發生重大變更，其描述可能已過時。使用 AskUserQuestion 確認是否應更新、完成或保持原樣。

3. **新的延後工作**：檢查差異中的 `TODO`, `FIXME`, `HACK` 以及 `XXX` 註釋。針對代表具意義的延後工作（而非微不足道的內聯註記），使用 AskUserQuestion 詢問是否應將其記錄至 `TODOS_zh_TW.md`。

---

## 步驟 8：版本號提升 (VERSION Bump) 詢問

**關鍵 — 絕不在未詢問的情況下提升版本號。**

1. **若 VERSION 不存在**：靜默跳過。

2. 檢查此分支是否已修改 VERSION：

```bash
git diff <base>...HEAD -- VERSION
```

3. **若 VERSION 尚未提升**：使用 AskUserQuestion：
   - 建議：選擇 C (跳過)，因為僅限文件的變更鮮少需要提升版本號
   - A) 提升 PATCH (X.Y.Z+1) — 若文件變更與程式碼變更一同發布
   - B) 提升 MINOR (X.Y+1.0) — 若這是一個重大的獨立發布
   - C) 跳過 — 無需提升版本

4. **若 VERSION 已經提升**：**不要** 靜默跳過。相反，檢查該提升是否仍涵蓋了此分支變更的完整範圍：

   a. 閱讀當前 VERSION 對應的 CHANGELOG 條目。它描述了哪些功能？
   b. 閱讀完整差異 (`git diff <base>...HEAD --stat` 與 `git diff <base>...HEAD --name-only`)。
      是否有重大變更（新功能、新技能、新指令、重大重構）「未」在當前版本的 CHANGELOG 條目中提及？
   c. **若 CHANGELOG 條目涵蓋了所有內容**：跳過 — 輸出「VERSION：已提升至 vX.Y.Z，涵蓋所有變更。」
   d. **若存在顯著的未涵蓋變更**：使用 AskUserQuestion 解釋當前版本涵蓋的內容與新變更，並詢問：
      - 建議：選擇 A，因為新變更值得擁有獨立的版本號
      - A) 提升至下一個 patch (X.Y.Z+1) — 賦予新變更獨立的版本號
      - B) 維持當前版本 — 將新變更加入現有的 CHANGELOG 條目
      - C) 跳過 — 保持版本號不變，稍後處理

   關鍵洞察：為「功能 A」設置的版本號不應靜默吸收「功能 B」，若功能 B 足夠重大到值得擁有自己的版本條目。

---

## 步驟 9：提交與輸出

**首先執行空檢查**：執行 `git status`（絕不使用 `-uall`）。若之前的步驟未修改任何文件檔案，輸出「所有文件均已是最新狀態。」並直接退出而不提交。

**提交：**

1. 按名稱暫存修改的文件檔案（絕不使用 `git add -A` 或 `git add .`）。
2. 建立單一提交：

```bash
git commit -m "$(cat <<'EOF'
docs: update project documentation for vX.Y.Z.W

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

3. 推送至當前分支：

```bash
git push
```

**PR 正文更新（冪等、競態安全）：**

1. 將現有的 PR 正文讀入 PID 唯一的暫存檔案：

```bash
gh pr view --json body -q .body > /tmp/gstack-pr-body-$$.md
```

2. 若暫存檔案已包含 `## 文件` 章節，用更新後的內容替換該章節。若不包含，則在結尾追加 `## 文件` 章節。

3. 「文件」章節應包含 **文件差異預覽** — 針對每個修改的檔案，描述具體變更了什麼（例如：「README_zh_TW.md：在技能表中新增了 /document-release，將技能總數從 9 更新為 10」）。

4. 將更新後的正文寫回：

```bash
gh pr edit --body-file /tmp/gstack-pr-body-$$.md
```

5. 清理暫存檔案：

```bash
rm -f /tmp/gstack-pr-body-$$.md
```

6. 若 `gh pr view` 失敗（不存在 PR）：跳過並顯示訊息「找不到 PR — 跳過正文更新。」
7. 若 `gh pr edit` 失敗：發出警告「無法更新 PR 正文 — 文件變更已包含在提交中。」並繼續。

**結構化文件健康摘要（最終輸出）：**

輸出一個易於掃描的摘要，顯示每份文件檔案的狀態：

```
文件健康狀態：
  README_zh_TW.md       [狀態] ([細節])
  ARCHITECTURE_zh_TW.md [狀態] ([細節])
  CONTRIBUTING_zh_TW.md [狀態] ([細節])
  CHANGELOG_zh_TW.md    [狀態] ([細節])
  TODOS_zh_TW.md        [狀態] ([細節])
  VERSION               [狀態] ([細節])
```

狀態應為以下之一：
- 已更新 — 附帶變更描述
- 目前為最新 — 無需變更
- 語氣已磨光 — 措辭已調整
- 未提升 — 用戶選擇跳過
- 已經提升 — 版本號由 /ship 設置
- 已跳過 — 檔案不存在

---

## 重要規則

- **編輯前必先閱讀**。在修改檔案前務必閱讀其完整內容。
- **絕不覆蓋 CHANGELOG**。僅修飾措辭。絕不刪除、取代或重新生成條目。
- **絕不靜默提升 VERSION**。務必詢問。即使已提升，也要檢查是否涵蓋完整變更範圍。
- **明確說明變更內容**。每次編輯都要有單行摘要。
- **通用啟發式，非專案特定**。審核檢查應適用於任何倉庫。
- **可發現性至關重要**。每份文件都應能從 README 或 CLAUDE_zh_TW.md 到達。
- **語氣：親切、以用戶為中心，而非晦澀**。撰寫方式應像是在向一位沒看過程式碼的聰明人解釋。
