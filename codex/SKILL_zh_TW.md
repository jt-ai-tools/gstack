---
name: codex
version: 1.0.0
description: |
  OpenAI Codex CLI 封裝器 — 提供三種模式。代碼審核：透過 codex review 進行獨立的差異審核，
  並設有通過/失敗閘門。挑戰：嘗試破壞你的代碼的對抗模式。諮詢：就代碼庫向 codex 提問任何問題，
  支援會話連續性。提供「智商 200 的工程師」第二意見。當被要求「codex review」、
  「codex challenge」、「ask codex」、「second opinion」或「consult codex」時使用。
allowed-tools:
  - Bash
  - Read
  - Write
  - Glob
  - Grep
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
echo '{"skill":"codex","ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","repo":"'$(basename "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || echo "unknown")'"}'  >> ~/.gstack/analytics/skill-usage.jsonl 2>/dev/null || true
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

# /codex — 多 AI 第二意見

你正在執行 `/codex` 技能。這封裝了 OpenAI Codex CLI，用於從另一個不同的 AI 系統獲取獨立且冷酷坦誠的第二意見。

Codex 就像是「智商 200 且極度精確的開發者」 — 直接、簡明、技術精確、挑戰前提、捕捉你可能遺漏的事項。請忠實呈現其輸出，不要摘要。

---

## 步驟 0：檢查 codex 二進位檔

```bash
CODEX_BIN=$(which codex 2>/dev/null || echo "")
[ -z "$_BIN" ] && echo "NOT_FOUND" || echo "FOUND: $_BIN"
```

若顯示 `NOT_FOUND`：停止並告訴用戶：
「找不到 Codex CLI。請安裝它：`npm install -g @openai/codex` 或參閱 https://github.com/openai/codex」

---

## 步驟 1：偵測模式

解析用戶的輸入以確定執行的模式：

1. `/codex review` 或 `/codex review <說明>` — **審核模式** (步驟 2A)
2. `/codex challenge` 或 `/codex challenge <重點>` — **挑戰模式** (步驟 2B)
3. 僅輸入 `/codex`（無參數） — **自動偵測：**
   - 檢查是否有差異（若 origin 不可用則使用回退方案）：
     `git diff origin/<base> --stat 2>/dev/null | tail -1 || git diff <base> --stat 2>/dev/null | tail -1`
   - 若存在差異，使用 AskUserQuestion：
     ```
     Codex 偵測到相對於基準分支的變更。它應該做什麼？
     A) 審核差異（代碼審核並設有通過/失敗閘門）
     B) 挑戰差異（對抗模式 — 嘗試破壞它）
     C) 其他操作 — 我會提供提示詞
     ```
   - 若無差異，檢查屬於當前專案的計劃檔案：
     `ls -t ~/.claude/plans/*.md 2>/dev/null | xargs grep -l "$(basename $(pwd))" 2>/dev/null | head -1`
     若無專案特定匹配，則回退至：`ls -t ~/.claude/plans/*.md 2>/dev/null | head -1`
     但須警告用戶：「注意：此計劃可能來自不同專案。」
   - 若計劃檔案存在，提議進行審核。
   - 否則，詢問：「你想向 Codex 提問什麼？」
4. `/codex <其他任何內容>` — **諮詢模式** (步驟 2C)，剩餘文本即為提示詞。

---

## 步驟 2A：審核模式

針對當前分支的差異執行 Codex 代碼審核。

1. 建立暫存檔案以擷取輸出：
```bash
TMPERR=$(mktemp /tmp/codex-err-XXXXXX.txt)
```

2. 執行審核 (5 分鐘逾時)：
```bash
codex review --base <base> -c 'model_reasoning_effort="xhigh"' --enable web_search_cached 2>"$TMPERR"
```

在 Bash 調用中使用 `timeout: 300000`。若用戶提供了自定義說明（例如 `/codex review focus on security`），將其作為提示詞參數傳遞：
```bash
codex review "focus on security" --base <base> -c 'model_reasoning_effort="xhigh"' --enable web_search_cached 2>"$TMPERR"
```

3. 擷取輸出。然後從標準錯誤中解析成本資訊：
```bash
grep "tokens used" "$TMPERR" 2>/dev/null || echo "tokens: unknown"
```

4. 檢查審核輸出中的關鍵發現以確定閘門判定。
   若輸出包含 `[P1]` — 閘門判定為 **失敗 (FAIL)**。
   若未發現 `[P1]` 標記（僅有 `[P2]` 或無發現） — 閘門判定為 **通過 (PASS)**。

5. 呈現輸出：

```
CODEX 說 (代碼審核)：
════════════════════════════════════════════════════════════
<完整的 codex 輸出，逐字呈現 —— 不要截斷或摘要>
════════════════════════════════════════════════════════════
閘門：通過 (PASS)              Token 數：14,331 | 預估成本：~$0.12
```

或

```
閘門：失敗 (FAIL) (N 個關鍵發現)
```

6. **跨模型對比**：若在此次對話中先前已執行過 `/review` (Claude 的審核)，請對比兩組發現項：

```
跨模型分析：
  雙方均發現：[Claude 與 Codex 重疊的發現項]
  僅 Codex 發現：[Codex 獨有的發現項]
  僅 Claude 發現：[Claude /review 獨有的發現項]
  一致率：X% (N/M 個總體獨特發現項發生重疊)
```

7. 持久化審核結果：
```bash
~/.claude/skills/gstack/bin/gstack-review-log '{"skill":"codex-review","timestamp":"TIMESTAMP","status":"STATUS","閘門":"GATE","發現項":N}'
```

替換內容：TIMESTAMP (ISO 8601), STATUS (若 PASS 則為 "clean" 否則為 "issues_found"), GATE ("pass" 或 "fail"), 發現項 ( [P1] + [P2] 標記的總數)。

8. 清理暫存檔案：
```bash
rm -f "$TMPERR"
```

---

## 步驟 2B：挑戰 (對抗) 模式

Codex 嘗試破壞你的代碼 — 尋找邊際情況、競態條件、安全漏洞以及一般審核會遺漏的失敗模式。

1. 構建對抗性提示詞。若用戶提供了重點領域（例如 `/codex challenge security`），請將其包含在內：

預設提示詞 (無重點)：
"Review the changes on this branch against the base branch. Run `git diff origin/<base>` to see the diff. Your job is to find ways this code will fail in production. Think like an attacker and a chaos engineer. Find edge cases, race conditions, security holes, resource leaks, failure modes, and silent data corruption paths. Be adversarial. Be thorough. No compliments — just the problems."

帶重點 (例如 "security")：
"Review the changes on this branch against the base branch. Run `git diff origin/<base>` to see the diff. Focus specifically on SECURITY. Your job is to find every way an attacker could exploit this code. Think about injection vectors, auth bypasses, privilege escalation, data exposure, and timing attacks. Be adversarial."

2. 使用 **JSONL 輸出** 執行 codex exec，以擷取推理軌跡與工具調用 (5 分鐘逾時)：
```bash
codex exec "<提示詞>" -s read-only -c 'model_reasoning_effort="xhigh"' --enable web_search_cached --json 2>/dev/null | python3 -c "
import sys, json
for line in sys.stdin:
    line = line.strip()
    if not line: continue
    try:
        obj = json.loads(line)
        t = obj.get('type','')
        if t == 'item.completed' and 'item' in obj:
            item = obj['item']
            itype = item.get('type','')
            text = item.get('text','')
            if itype == 'reasoning' and text:
                print(f'[codex 思考中] {text}')
                print()
            elif itype == 'agent_message' and text:
                print(text)
            elif itype == 'command_execution':
                cmd = item.get('command','')
                if cmd: print(f'[codex 執行了] {cmd}')
        elif t == 'turn.completed':
            usage = obj.get('usage',{})
            tokens = usage.get('input_tokens',0) + usage.get('output_tokens',0)
            if tokens: print(f'\nToken 使用量：{tokens}')
    except: pass
"
```

這會解析 codex 的 JSONL 事件，提取推理軌跡、工具調用以及最終回應。`[codex 思考中]` 行顯示了 codex 在給出答案前的推理過程。

3. 呈現完整的串流輸出：

```
CODEX 說 (對抗性挑戰)：
════════════════════════════════════════════════════════════
<完整的上述輸出，逐字呈現>
════════════════════════════════════════════════════════════
Token 使用量：N | 預估成本：~$X.XX
```

---

## 步驟 2C：諮詢模式

就代碼庫向 Codex 提問任何問題。支援會話連續性以進行後續提問。

1. **檢查現有會話**：
```bash
cat .context/codex-session-id 2>/dev/null || echo "NO_SESSION"
```

若會話檔案存在 (非 `NO_SESSION`)，使用 AskUserQuestion：
```
你有一個先前啟動的 Codex 對話。要繼續該對話還是開始新的？
A) 繼續對話（Codex 會記得先前的背景資訊）
B) 開始新對話
```

2. 建立暫存檔案：
```bash
TMPRESP=$(mktemp /tmp/codex-resp-XXXXXX.txt)
TMPERR=$(mktemp /tmp/codex-err-XXXXXX.txt)
```

3. **計劃審核自動偵測**：若用戶的提示詞是關於審核計劃，或是計劃檔案存在且用戶僅輸入 `/codex`：
```bash
ls -t ~/.claude/plans/*.md 2>/dev/null | xargs grep -l "$(basename $(pwd))" 2>/dev/null | head -1
```
若無專案特定匹配，則回退至 `ls -t ~/.claude/plans/*.md 2>/dev/null | head -1` 但須警告：「注意：此計劃可能來自不同專案 — 在發送給 Codex 前請先驗證。」
讀取計劃檔案，並在用戶提示詞前附加角色描述：
「你是一位極度冷酷坦誠的技術審核員。審核此計劃的：邏輯缺口與未說明的假設、缺失的錯誤處理或邊際情況、過度複雜化（是否有更簡單的方法？）、可行性風險（可能出什麼錯？），以及缺失的依賴關係或順序問題。要直接。要簡明。不要表揚。只要指出問題。

計劃內容：
<計劃內容>"

4. 使用 **JSONL 輸出** 執行 codex exec，以擷取推理軌跡 (5 分鐘逾時)：

針對 **新會話**：
```bash
codex exec "<提示詞>" -s read-only -c 'model_reasoning_effort="xhigh"' --enable web_search_cached --json 2>"$TMPERR" | python3 -c "
import sys, json
for line in sys.stdin:
    line = line.strip()
    if not line: continue
    try:
        obj = json.loads(line)
        t = obj.get('type','')
        if t == 'thread.started':
            tid = obj.get('thread_id','')
            if tid: print(f'SESSION_ID:{tid}')
        elif t == 'item.completed' and 'item' in obj:
            item = obj['item']
            itype = item.get('type','')
            text = item.get('text','')
            if itype == 'reasoning' and text:
                print(f'[codex 思考中] {text}')
                print()
            elif itype == 'agent_message' and text:
                print(text)
            elif itype == 'command_execution':
                cmd = item.get('command','')
                if cmd: print(f'[codex 執行了] {cmd}')
        elif t == 'turn.completed':
            usage = obj.get('usage',{})
            tokens = usage.get('input_tokens',0) + usage.get('output_tokens',0)
            if tokens: print(f'\nToken 使用量：{tokens}')
    except: pass
"
```

針對 **續接會話** (用戶選擇「繼續」)：
```bash
codex exec resume <session-id> "<提示詞>" -s read-only -c 'model_reasoning_effort="xhigh"' --enable web_search_cached --json 2>"$TMPERR" | python3 -c "
<與上述相同的 python 串流解析器>
"
```

5. 從串流輸出中擷取會話 ID。解析器會從 `thread.started` 事件中印出 `SESSION_ID:<id>`。將其儲存以供後續使用：
```bash
mkdir -p .context
```
將解析器印出的會話 ID（以 `SESSION_ID:` 開頭的那行）儲存至 `.context/codex-session-id`。

6. 呈現完整的串流輸出：

```
CODEX 說 (諮詢)：
════════════════════════════════════════════════════════════
<完整的輸出，逐字呈現 —— 包含 [codex 思考中] 軌跡>
════════════════════════════════════════════════════════════
Token 使用量：N | 預估成本：~$X.XX
會話已儲存 — 再次執行 /codex 以繼續此對話。
```

7. 呈現後，註明 Codex 分析與你自身理解不同的任何地方。若存在分歧，請予以標記：
   「注意：Claude Code 對於 X 的看法不同，因為 Y。」

---

## 模型與推理

**模型**：未硬編碼任何模型 — codex 使用其目前的預設模型（尖端代理代碼模型）。這意味著隨著 OpenAI 發布新模型，/codex 會自動採用。若用戶想要特定模型，請透過 `-m` 傳遞給 codex。

**推理強度**：所有模式均使用 `xhigh` — 最大推理能力。在審核、破壞代碼或諮詢架構時，你會希望模型盡可能地深入思考。

**網頁搜尋**：所有的 codex 指令均使用 `--enable web_search_cached`，以便 Codex 在審核期間查找文件與 API。這是 OpenAI 的快取索引 — 快速且無額外成本。

若用戶指定了模型（例如 `/codex review -m gpt-5.1-codex-max` 或 `/codex challenge -m gpt-5.2`），請將 `-m` 旗標傳遞給 codex。

---

## 成本預估

從標準錯誤中解析 Token 計數。Codex 會將 `tokens used\nN` 印至標準錯誤。

顯示格式：`Token 使用量：N`

若無法獲取 Token 計數，顯示：`Token 使用量：未知`

---

## 錯誤處理

- **找不到二進位檔**：在步驟 0 中偵測。停止並顯示安裝說明。
- **驗證錯誤**：Codex 會將驗證錯誤印至標準錯誤。呈現該錯誤：
  「Codex 驗證失敗。請在終端執行 \`codex login\` 透過 ChatGPT 進行驗證。」
- **逾時**：若 Bash 調用逾時 (5 分鐘)，告訴用戶：
  「Codex 已逾時 (5 分鐘)。差異可能過大或 API 反應過慢。請重試或縮小範圍。」
- **空回應**：若 `$TMPRESP` 為空或不存在，告訴用戶：
  「Codex 未回傳回應。請檢查標準錯誤中的錯誤訊息。」
- **會話續接失敗**：若續接失敗，刪除會話檔案並重新開始。

---

## 重要規則

- **絕不修改檔案**。此技能為唯讀。Codex 在唯讀沙箱模式下運行。
- **逐字呈現輸出**。在展示 Codex 的輸出前，不要對其進行截斷、摘要或編輯。請在 CODEX 說 區塊內完整呈現。
- **後置綜合分析，而非取代**。任何 Claude 的評論均應放在完整輸出之後。
- 所有的 codex Bash 調用均設有 **5 分鐘逾時** (`timeout: 300000`)。
- **不重複審核**。若用戶已執行過 `/review`，Codex 提供的是獨立的第二意見。不要重新執行 Claude Code 自身的審核。
