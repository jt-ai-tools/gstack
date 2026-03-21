# QA 報告：{APP_NAME}

| 欄位 | 數值 |
|-------|-------|
| **日期** | {DATE} |
| **URL** | {URL} |
| **分支** | {BRANCH} |
| **提交 (Commit)** | {COMMIT_SHA} ({COMMIT_DATE}) |
| **PR** | {PR_NUMBER} ({PR_URL}) 或 "—" |
| **修復等級** | Quick (快速) / Standard (標準) / Exhaustive (徹底) |
| **範疇** | {SCOPE 或 "全站"} |
| **時長** | {DURATION} |
| **訪問頁數** | {COUNT} |
| **截圖數** | {COUNT} |
| **框架** | {DETECTED 或 "未知"} |
| **索引** | [所有 QA 執行記錄](./index.md) |

## 健康評分：{SCORE}/100

| 類別 | 評分 |
|----------|-------|
| 控制台 (Console) | {0-100} |
| 連結 (Links) | {0-100} |
| 視覺 (Visual) | {0-100} |
| 功能 (Functional) | {0-100} |
| UX | {0-100} |
| 效能 (Performance) | {0-100} |
| 無障礙 (Accessibility) | {0-100} |

## 前 3 大待修復事項

1. **{ISSUE-NNN}: {title}** — {一行描述}
2. **{ISSUE-NNN}: {title}** — {一行描述}
3. **{ISSUE-NNN}: {title}** — {一行描述}

## 控制台健康狀況

| 錯誤訊息 | 次數 | 首次發現於 |
|-------|-------|------------|
| {error message} | {N} | {URL} |

## 摘要

| 嚴重程度 | 計數 |
|----------|-------|
| 關鍵 (Critical) | 0 |
| 高 (High) | 0 |
| 中 (Medium) | 0 |
| 低 (Low) | 0 |
| **總計** | **0** |

## 發現的問題

### ISSUE-001: {短標題}

| 欄位 | 數值 |
|-------|-------|
| **嚴重程度** | critical / high / medium / low |
| **類別** | visual / functional / ux / content / performance / console / accessibility |
| **URL** | {page URL} |

**問題描述：** {哪裡出錯了，預期行為 vs 實際行為}

**重現步驟：**

1. 導航至 {URL}
   ![步驟 1](screenshots/issue-001-step-1.png)
2. {執行動作}
   ![步驟 2](screenshots/issue-001-step-2.png)
3. **觀察結果：** {出錯的情況}
   ![結果](screenshots/issue-001-result.png)

---

## 已執行的修復（若適用）

| 問題編號 | 修復狀態 | 提交 (Commit) | 變更檔案 |
|-------|-----------|--------|---------------|
| ISSUE-NNN | verified / best-effort / reverted / deferred | {SHA} | {files} |

### 修復前後證據

#### ISSUE-NNN: {title}
**修復前：** ![Before](screenshots/issue-NNN-before.png)
**修復後：** ![After](screenshots/issue-NNN-after.png)

---

## 回歸測試 (Regression Tests)

| 問題編號 | 測試檔案 | 狀態 | 描述 |
|-------|-----------|--------|-------------|
| ISSUE-NNN | path/to/test | committed / deferred / skipped | 描述 |

### 延後處理的測試

#### ISSUE-NNN: {title}
**前置條件：** {觸發 Bug 的設置狀態}
**用戶動作：** {用戶執行的操作}
**預期結果：** {正確的行為}
**延後原因：** {原因}

---

## 交付就緒度 (Ship Readiness)

| 指標 | 數值 |
|--------|-------|
| 健康評分 | {修復前} → {修復後} ({變化量}) |
| 發現問題數 | N |
| 已套用修復 | N (已驗證: X, 盡力而為: Y, 已撤銷: Z) |
| 延後處理 | N |

**PR 摘要：** 「QA 發現 N 個問題，已修復 M 個，健康評分 X → Y。」

---

## 回歸分析（若適用）

| 指標 | 基準線 (Baseline) | 本次執行 | 變化量 |
|--------|----------|---------|-------|
| 健康評分 | {N} | {N} | {+/-N} |
| 問題數 | {N} | {N} | {+/-N} |

**自基準線起已修復：** {列表}
**自基準線起新發現：** {列表}
