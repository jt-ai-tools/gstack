---
name: investigate
version: 1.0.0
description: |
  系統化根因除錯。分為四個階段：調查、分析、建立假設、實作。鐵律：在未找到根因前不進行修復。
  當被要求「debug this」、「fix this bug」、「why is this broken」、「investigate this error」
  或「root cause analysis」時使用。當用戶回報錯誤、非預期行為或正在排查某功能失效的原因時主動建議。
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - AskUserQuestion
hooks:
  PreToolUse:
    - matcher: "Edit"
      hooks:
        - type: command
          command: "bash ${CLAUDE_SKILL_DIR}/../freeze/bin/check-freeze.sh"
          statusMessage: "正在檢查除錯範圍邊界..."
    - matcher: "Write"
      hooks:
        - type: command
          command: "bash ${CLAUDE_SKILL_DIR}/../freeze/bin/check-freeze.sh"
          statusMessage: "正在檢查除錯範圍邊界..."
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
echo '{"skill":"investigate","ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","repo":"'$(basename "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || echo "unknown")'"}'  >> ~/.gstack/analytics/skill-usage.jsonl 2>/dev/null || true
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

- 如果選項 A 是完整實作（完全對等、所有邊際情況、100% 覆蓋率），而選項 B 是節省少量工作量的捷徑 —— **始終建議 A**。在使用 CC+gstack興的情況下，80 行與 150 行之間的差異是微不足道的。當「完整」僅需多花幾分鐘時，「夠好就好」是錯誤的直覺。
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

# 系統化除錯 (Systematic Debugging)

## 鐵律

**在執行根因調查前，不准進行任何修復。**

只修復症狀會導致「打地鼠」式的除錯。每一項未針對根因的修復，都會讓下一個 Bug 更難被發現。先找到根因，然後再修復。

---

## 階段 1：根因調查

在形成任何假設前先收集背景資訊。

1. **收集症狀**：閱讀錯誤訊息、堆疊追蹤與重現步驟。若用戶提供的資訊不足，請每次透過 AskUserQuestion 詢問「一個」問題。

2. **閱讀代碼**：追蹤從症狀溯源至潛在原因的代碼路徑。使用 Grep 尋找所有引用，使用 Read 理解邏輯。

3. **檢查近期變更**：
   ```bash
   git log --oneline -20 -- <受影響檔案>
   ```
   先前是正常的嗎？變更了什麼？退化意味著根因就在差異 (diff) 中。

4. **重現**：您能否確定地觸發該 Bug？若否，請在繼續前收集更多證據。

輸出：**「根因假設：...」** — 一項具體且可測試的聲明，說明哪裡出錯了以及為什麼。

---

## 範疇鎖定 (Scope Lock)

在形成根因假設後，鎖定對受影響模組的編輯，以防止範疇蔓延。

```bash
[ -x "${CLAUDE_SKILL_DIR}/../freeze/bin/check-freeze.sh" ] && echo "FREEZE_AVAILABLE" || echo "FREEZE_UNAVAILABLE"
```

**若顯示 FREEZE_AVAILABLE**：識別包含受影響檔案的最窄目錄。將其寫入凍結狀態檔案：

```bash
STATE_DIR="${CLAUDE_PLUGIN_DATA:-$HOME/.gstack}"
mkdir -p "$STATE_DIR"
echo "<偵測到的目錄>/" > "$STATE_DIR/freeze-dir.txt"
echo "除錯範圍已鎖定至：<偵測到的目錄>/"
```

將 `<偵測到的目錄>` 替換為實際目錄路徑（例如 `src/auth/`）。告訴用戶：「在此除錯會話中，編輯已限制在 `<dir>/`。這可防止變更到無關的代碼。執行 `/unfreeze` 可移除限制。」

若 Bug 跨越整個倉庫或範圍確實不明確，則跳過鎖定並註明原因。

**若顯示 FREEZE_UNAVAILABLE**：跳過範疇鎖定。編輯不受限制。

---

## 階段 2：模式分析

檢查此 Bug 是否符合已知模式：

| 模式 | 特徵 | 檢查重點 |
|---------|-----------|---------------|
| 競態條件 (Race condition) | 斷斷續續、與時機相關 | 對共享狀態的並發存取 |
| Nil/null 傳播 | NoMethodError, TypeError | 對選填值缺失保護措施 |
| 狀態損壞 | 數據不一致、部分更新 | 交易 (Transactions)、回呼、Hook |
| 整合失效 | 逾時、非預期回應 | 外部 API 調用、服務邊界 |
| 配置偏差 (Configuration drift) | 本地正常，環境（預覽/生產）失效 | 環境變數、功能旗標、資料庫狀態 |
| 過時快取 | 顯示舊數據，清除快取後正常 | Redis, CDN, 瀏覽器快取, Turbo |

同時檢查：
- `TODOS_zh_TW.md` 中相關的已知問題
- `git log` 中同一區域先前的修復 —— **同一檔案中重複出現的 Bug 是架構上的警訊**，而非巧合。

---

## 階段 3：假設測試

在撰寫「任何」修復代碼前，先驗證您的假設。

1. **確認假設**：在懷疑的根因處增加臨時日誌語句、斷言或除錯輸出。執行重現步驟。證據是否匹配？

2. **若假設錯誤**：回到階段 1。收集更多證據。不要靠猜測。

3. **三振條款**：若 3 個假設皆失效，**停止**。使用 AskUserQuestion：
   ```
   已測試 3 個假設，均不匹配。這可能是一個架構問題，而非簡單的 Bug。

   A) 繼續調查 — 我有新的假設：[描述內容]
   B) 呈報給人工審核 — 這需要熟悉該系統的人員處理
   C) 增加日誌並等待 — 在該區域埋點，捕捉下一次發生的情況
   ```

**警訊** — 若出現以下情況，請放慢腳步：
- 「現在先快速修復」 — 沒有所謂的「現在」。要麼正確修復，要麼呈報。
- 在追蹤資料流前就提出修復方案 — 您是在猜測。
- 每次修復都導致別處出現新問題 — 層級錯誤，而非代碼錯誤。

---

## 階段 4：實作

根因確認後：

1. **修復根因，而非症狀**。以解決實際問題的最微小變更為目標。

2. **最小化差異**：觸及最少的檔案，更改最少的行數。克制重構周邊代碼的衝動。

3. **撰寫回歸測試**，該測試必須：
   - 在無修復時 **失敗**（證明測試具備意義）
   - 在有修復時 **通過**（證明修復有效）

4. **執行完整測試套件**。貼上輸出結果。不允許任何退化。

5. **若修復觸及 >5 個檔案**：使用 AskUserQuestion 標記影響範圍：
   ```
   此修復觸及了 N 個檔案。對於 Bug 修復來說，這是一個很大的影響範圍。
   A) 繼續執行 — 根因確實跨越了這些檔案
   B) 拆分執行 — 先修復關鍵路徑，其餘延後處理
   C) 重新思考 — 或許有更精準的處理方法
   ```

---

## 階段 5：驗證與報告

**重新驗證**：重現原始 Bug 情境並確認已修復。此步驟為必選。

執行測試套件並貼上輸出。

產出結構化的除錯報告：
```
除錯報告 (DEBUG REPORT)
════════════════════════════════════════
症狀：           [用戶觀察到的現象]
根因：           [實際出錯的原因]
修復內容：       [變更了什麼，附帶 檔案:行號 引用]
證據：           [測試輸出、證明修復生效的重現嘗試]
回歸測試：       [新測試的 檔案:行號]
相關資訊：       [TODOS_zh_TW.md 項目、該區域先前的 Bug、架構筆記]
狀態：           DONE | DONE_WITH_CONCERNS | BLOCKED
════════════════════════════════════════
```

---

## 重要規則

- **3 次以上修復嘗試失敗 → 停止並質疑架構**。是架構錯誤，而非假設失敗。
- **絕不套用無法驗證的修復**。若無法重現並確認，就不要交付。
- **絕不說「這應該能修復它」**。請驗證並證明。執行測試。
- **若修復觸及 >5 個檔案 → 在繼續前先使用 AskUserQuestion** 詢問影響範圍。
- **完成狀態**：
  - DONE — 找到根因、套用修復、撰寫回歸測試、所有測試通過
  - DONE_WITH_CONCERNS — 已修復但無法完全驗證（例如：偶發性 Bug、需要預覽環境）
  - BLOCKED — 調查後根因仍不明確，已呈報
