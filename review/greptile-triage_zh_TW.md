# Greptile 評論分類 (Greptile Comment Triage)

此文件為獲取、過濾及分類 GitHub PR 上 Greptile 審核評論的共享參考。`/review`（步驟 2.5）與 `/ship`（步驟 3.75）均引用此文件。

---

## 獲取 (Fetch)

執行以下指令以偵測 PR 並獲取評論。兩個 API 調用將並行執行。

```bash
REPO=$(gh repo view --json nameWithOwner --jq '.nameWithOwner' 2>/dev/null)
PR_NUMBER=$(gh pr view --json number --jq '.number' 2>/dev/null)
```

**若其中任一項失敗或為空**：靜默跳過 Greptile 分類。此整合為附加功能 —— 工作流在無此功能下仍可運作。

```bash
# 並行獲取行級 (line-level) 審核評論與頂層 (top-level) PR 評論
gh api repos/$REPO/pulls/$PR_NUMBER/comments \
  --jq '.[] | select(.user.login == "greptile-apps[bot]") | select(.position != null) | {id: .id, path: .path, line: .line, body: .body, html_url: .html_url, source: "line-level"}' > /tmp/greptile_line.json &
gh api repos/$REPO/issues/$PR_NUMBER/comments \
  --jq '.[] | select(.user.login == "greptile-apps[bot]") | {id: .id, body: .body, html_url: .html_url, source: "top-level"}' > /tmp/greptile_top.json &
wait
```

**若發生 API 錯誤或兩個端點均無任何 Greptile 評論**：靜默跳過。

行級評論上的 `position != null` 過濾器會自動跳過來自已強制推送 (force-push) 代碼的過時評論。

---

## 抑制項檢查 (Suppressions Check)

推導專案特定的歷史紀錄路徑：
```bash
REMOTE_SLUG=$(browse/bin/remote-slug 2>/dev/null || ~/.claude/skills/gstack/browse/bin/remote-slug 2>/dev/null || basename "$(git rev-parse --show-toplevel 2>/dev/null || pwd)")
PROJECT_HISTORY="$HOME/.gstack/projects/$REMOTE_SLUG/greptile-history_zh_TW.md"
```

若 `$PROJECT_HISTORY` 存在則讀取它（各專案獨立的抑制項）。每行記錄一個先前的分類結果：

```
<日期> | <倉庫> | <類型:fp|fix|already-fixed> | <檔案模式> | <類別>
```

**類別**（固定集合）：`race-condition` (競態條件), `null-check` (空值檢查), `error-handling` (錯誤處理), `style` (風格), `type-safety` (類型安全), `security` (安全), `performance` (效能), `correctness` (正確性), `other` (其他)

將每個獲取的評論與條目進行匹配，條件為：
- `type == fp`（僅抑制已知的誤判，而非先前已修復的真實問題）
- `repo` 與當前倉庫匹配
- `file-pattern` 與評論的檔案路徑匹配
- `category` 與評論中的問題類型匹配

匹配成功的評論標記為 **已抑制 (SUPPRESSED)** 並跳過。

若歷史檔案不存在或包含無法解析的行，跳過該行並繼續 —— 絕不因歷史檔案格式錯誤而導致流程失敗。

---

## 分類 (Classify)

針對每個未被抑制的評論：

1. **行級評論**：讀取指定 `path:line` 處的檔案及其周邊背景（±10 行）
2. **頂層評論**：閱讀完整評論內容
3. 將評論與完整差異 (`git diff origin/main`) 以及審核清單進行交叉比對
4. 進行分類：
   - **有效且可操作 (VALID & ACTIONABLE)** — 當前代碼中確實存在的 Bug、競態條件、安全問題或正確性問題
   - **有效但已修復 (VALID BUT ALREADY FIXED)** — 分支上隨後的提交已處理的真實問題。識別修復該問題的提交 SHA。
   - **誤判 (FALSE POSITIVE)** — 評論誤解了代碼、標記了已在別處處理的事項，或屬於風格方面的噪聲
   - **已抑制 (SUPPRESSED)** — 已在上述抑制項檢查中被過濾

---

## 回覆 API

回覆 Greptile 評論時，請根據評論來源使用正確的端點：

**行級評論**（來自 `pulls/$PR/comments`）：
```bash
gh api repos/$REPO/pulls/$PR_NUMBER/comments/$COMMENT_ID/replies \
  -f body="<回覆文本>"
```

**頂層評論**（來自 `issues/$PR/comments`）：
```bash
gh api repos/$REPO/issues/$PR_NUMBER/comments \
  -f body="<回覆文本>"
```

**若回覆 POST 失敗**（例如：PR 已關閉、無寫入權限）：發出警告並繼續。絕不因回覆失敗而停止工作流。

---

## 回覆模板 (Reply Templates)

針對每次 Greptile 回覆使用以下模板。務必包含具體證據 —— 絕不發布模糊的回覆。

### 第 1 級 (初步回應) — 友善，包含證據

**針對修復 (FIXES)（用戶選擇修復該問題）：**

```
**已修復** 於 `<commit-sha>`。

\`\`\`diff
- <舊有問題行>
+ <新修復行>
\`\`\`

**原因**：<一句話解釋哪裡出錯了以及修復方案如何解決它>
```

**針對已修復 (ALREADY FIXED)（問題已在分支先前的提交中處理）：**

```
**先前已修復** 於 `<commit-sha>`。

**執行內容**：<1-2 句話描述現有的提交如何解決此問題>
```

**針對誤判 (FALSE POSITIVES)（評論內容錯誤）：**

```
**並非 Bug**。<一句話直接說明為什麼這是錯誤的>

**證據**：
- <具體的代碼引用，顯示該模式是安全/正確的>
- <例如：「空值檢查已由 `ActiveRecord::FinderMethods#find` 處理，該方法會拋出 RecordNotFound 而非回傳 nil」>

**建議重新分級**：這似乎是一個 `<風格|噪聲|誤讀>` 問題，而非 `<Greptile 所稱的類別>`。建議調降嚴重程度。
```

### 第 2 級 (先前已回覆但 Greptile 再次標記) — 堅定，提供壓倒性證據

當呈報偵測（見下文）識別出同一對話串中先前已有 GStack 回覆時，使用第 2 級模板。包含最詳盡的證據以結束討論。

```
**此項已完成審核並確認為 [刻意設計/先前已修復/並非 Bug]**。

\`\`\`diff
<完整的相關差異，顯示變更或安全的模式>
\`\`\`

**證據鏈**：
1. <檔案:行號 永久連結，顯示安全模式或修復方案>
2. <處理該問題的提交 SHA，若適用>
3. <架構理由或設計決策，若適用>

**建議重新分級**：請重新校準 —— 這是一個 `<實際類別>` 問題，而非 `<宣稱的類別>`。[若有幫助，請附上特定檔案變更的永久連結]
```

---

## 呈報偵測 (Escalation Detection)

在撰寫回覆前，檢查此評論串中是否已存在先前的 GStack 回覆：

1. **針對行級評論**：透過 `gh api repos/$REPO/pulls/$PR_NUMBER/comments/$COMMENT_ID/replies` 獲取回覆。檢查是否有任何回覆內容包含 GStack 標記：`**已修復**`、`**並非 Bug**`、`**先前已修復**`。

2. **針對頂層評論**：掃描獲取的議題 (issue) 評論，尋找在 Greptile 評論之後發布且包含 GStack 標記的回覆。

3. **若先前已存在 GStack 回覆，且 Greptile 針對同一檔案+類別再次發文**：使用第 2 級（堅定）模板。

4. **若無先前的 GStack 回覆**：使用 第 1 級（友善）模板。

若呈報偵測失敗（API 錯誤、對話串模糊）：預設使用第 1 級。絕不因模糊情況而升級語氣。

---

## 嚴重程度評估與重新分級

分類評論時，同時評估 Greptile 暗示的嚴重程度是否符合現實：

- 若 Greptile 將某事標記為 **安全/正確性/競態條件** 問題，但實際上僅是 **風格/效能** 的微小瑕疵：在回覆中包含 `**建議重新分級：**` 並要求修正類別。
- 若 Greptile 將低嚴重程度的風格問題視為關鍵問題：在回覆中予以反駁。
- 務必具體說明為什麼需要重新分級 —— 引用代碼與行號，而非僅憑個人意見。

---

## 歷史檔案寫入

寫入前，確保兩個目錄均存在：
```bash
REMOTE_SLUG=$(browse/bin/remote-slug 2>/dev/null || ~/.claude/skills/gstack/browse/bin/remote-slug 2>/dev/null || basename "$(git rev-parse --show-toplevel 2>/dev/null || pwd)")
mkdir -p "$HOME/.gstack/projects/$REMOTE_SLUG"
mkdir -p ~/.gstack
```

將分類結果追加至 **兩個** 檔案（專案特定用於抑制，全域用於回顧）：
- `~/.gstack/projects/$REMOTE_SLUG/greptile-history_zh_TW.md`（專案特定）
- `~/.gstack/greptile-history_zh_TW.md`（全域匯總）

格式：
```
<YYYY-MM-DD> | <擁有者/倉庫> | <類型> | <檔案模式> | <類別>
```

範例條目：
```
2026-03-13 | garrytan/myapp | fp | app/services/auth_service.rb | race-condition
2026-03-13 | garrytan/myapp | fix | app/models/user.rb | null-check
2026-03-13 | garrytan/myapp | already-fixed | lib/payments.rb | error-handling
```

---

## 輸出格式

在輸出標題中包含 Greptile 摘要：
```
+ N 條 Greptile 評論 (X 條有效, Y 條已修復, Z 條誤判)
```

針對每個已分類的評論，顯示：
- 分類標籤：`[有效] (VALID)`, `[已修復] (FIXED)`, `[誤判] (FALSE POSITIVE)`, `[已抑制] (SUPPRESSED)`
- 檔案:行號 引用（針對行級）或 `[頂層]`（針對頂層）
- 一句話內容摘要
- 永久連結 URL（`html_url` 欄位）
