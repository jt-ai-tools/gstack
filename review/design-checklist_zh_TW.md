# 設計審核清單 (簡易版) (Design Review Checklist - Lite)

> **DESIGN_METHODOLOGY 的子集** — 在此處增加項目時，請同步更新 `scripts/gen-skill-docs.ts` 中的 `generateDesignMethodology()`，反之亦然。

## 指令

此清單適用於 **差異 (diff) 中的源碼** —— 而非渲染出的輸出結果。請閱讀每個變更的前端檔案（完整檔案，而不僅是差異片段）並標記反模式。

**觸發條件**：僅在差異觸及前端檔案時執行此清單。使用 `gstack-diff-scope` 進行偵測：

```bash
source <(~/.claude/skills/gstack/bin/gstack-diff-scope <base> 2>/dev/null)
```

若 `SCOPE_FRONTEND=false`，則靜默跳過整個設計審核。

**DESIGN.md 校準**：若倉庫根目錄存在 `DESIGN.md` 或 `design-system.md`，請先閱讀它。所有的發現項都將根據專案既定的設計系統進行校準。在 `DESIGN.md` 中明確核准的模式將「不會」被標記。若不存在 `DESIGN.md`，則使用通用設計原則。

---

## 信心等級 (Confidence Tiers)

每個項目均標有偵測信心等級：

- **[高]** — 透過 grep/模式匹配可可靠偵測。確定的發現項。
- **[中]** — 透過模式聚合或啟發式方法可偵測。作為發現項標記，但預期會有少量噪聲。
- **[低]** — 需要理解視覺意圖。呈現方式為：「可能存在問題 — 請進行視覺驗證或執行 /design-review」。

---

## 分類

**自動修復 (AUTO-FIX)**（僅限機械式 CSS 修復 —— 信心等級為「高」，無需設計判斷）：
- `outline: none` 且無替代方案 → 增加 `outline: revert` 或 `&:focus-visible { outline: 2px solid currentColor; }`
- 新 CSS 中出現 `!important` → 移除並修正權重 (specificity)
- 正文文字 `font-size` < 16px → 提升至 16px

**詢問 (ASK)**（其餘所有內容 —— 需要設計判斷）：
- 所有 AI 粗糙感發現項、排版結構、間距選擇、互動狀態缺口、違反 `DESIGN.md` 之處

**低信心等級項目** → 呈現為「可能：[描述]。請進行視覺驗證或執行 /design-review」。絕不執行自動修復。

---

## 輸出格式

```
設計審核：N 個問題 (X 個可自動修復, Y 個需確認, Z 個可能存在)

**自動修復 (AUTO-FIXED)：**
- [檔案:行號] 問題 → 已套用修復

**需確認 (NEEDS INPUT)：**
- [檔案:行號] 問題描述
  建議修復：建議方案

**可能存在 (請進行視覺驗證)：**
- [檔案:行號] 可能存在的問題 — 請透過 /design-review 驗證
```

若未發現問題：`設計審核：未發現問題。`

若無前端檔案變更：靜默跳過，無輸出。

---

## 審核類別

### 1. AI 粗糙感 (Slop) 偵測 (6 項) — 最高優先級

這些是 AI 生成 UI 的典型跡象，任何受人尊敬的工作室設計師都不會發布這種東西。

- **[中]** 紫色/紫色/靛藍色漸層背景或藍到紫配色方案。尋找數值在 `#6366f1`–`#8b5cf6` 範圍內的 `linear-gradient`，或解析為紫色/紫色的 CSS 自定義屬性。

- **[低]** 3 欄功能網格：彩色圓圈圖示 + 粗體標題 + 2 行描述，對稱重複 3 次。尋找具有恰好 3 個子元素的 grid/flex 容器，且每個子元素都包含圓形元素 + 標題 + 段落。

- **[低]** 彩色圓圈中的圖示作為章節裝飾。尋找帶有 `border-radius: 50%` + 背景色、且作為圖示裝飾性容器的元素。

- **[高]** 萬物置中：所有標題、描述和卡片均使用 `text-align: center`。使用 Grep 檢查 `text-align: center` 的密度 —— 若超過 60% 的文字容器使用置中對齊，請標記。

- **[中]** 所有元素統一的泡泡感邊框半徑：卡片、按鈕、輸入框、容器均統一應用相同的大半徑 (16px+)。聚合 `border-radius` 數值 —— 若超過 80% 使用相同的數值且 ≥16px，請標記。

- **[中]** 通用的英雄章節文案：「歡迎來到 [X]」、「釋放...的力量」、「您的全方位解決方案」、「徹底改變您的...」、「簡化您的工作流」。在 HTML/JSX 內容中搜尋這些模式。

### 2. 排版 (4 項)

- **[高]** 正文文字 `font-size` < 16px。使用 Grep 搜尋 `body`, `p`, `.text` 或基礎樣式上的 `font-size` 聲明。低於 16px（或當基數為 16px 時低於 1rem）的數值將被標記。

- **[高]** 差異中引入了超過 3 種字型系列。統計不同的 `font-family` 聲明數量。若在變更的檔案中出現超過 3 種獨特的字型系列，請標記。

- **[高]** 標題層級跳級：同一檔案/組件中 `h1` 後接 `h3` 而無 `h2`。檢查 HTML/JSX 中的標題標籤。

- **[高]** 字體黑名單：Papyrus, Comic Sans, Lobster, Impact, Jokerman。使用 Grep 在 `font-family` 中搜尋這些名稱。

### 3. 間距與佈局 (4 項)

- **[中]** 當 `DESIGN.md` 指定了間距比例時，使用了不在 4px 或 8px 比例上的任意間距值。檢查 `margin`, `padding`, `gap` 數值是否符合既定比例。僅在 `DESIGN.md` 定義了比例時才標記。

- **[中]** 缺失響應式處理的固定寬度：容器使用了 `width: NNNpx` 卻無 `max-width` 或 `@media` 斷點。這在行動版上有出現水平捲軸的風險。

- **[中]** 文字容器缺失 `max-width`：正文文字或段落容器未設置 `max-width`，導致每行超過 75 個字元。檢查文字包裝器 (wrappers) 是否有 `max-width`。

- **[高]** 新 CSS 規則中出現 `!important`。使用 Grep 在新增行中搜尋 `!important`。這幾乎總是權重逃生門，應妥善修復。

### 4. 互動狀態 (3 項)

- **[中]** 互動元素（按鈕、連結、輸入框）缺失懸停 (hover) / 焦點 (focus) 狀態。檢查新互動元素的樣式中是否包含 `:hover` 以及 `:focus` 或 `:focus-visible` 偽類。

- **[高]** `outline: none` 或 `outline: 0` 且無替代的焦點指示器。使用 Grep 搜尋 `outline:\s*none` 或 `outline:\s*0`。這會損害鍵盤無障礙性。

- **[低]** 互動元素的觸控目標 < 44px。檢查按鈕與連結的 `min-height`/`min-width`/`padding`。需要從多個屬性計算有效尺寸 —— 僅憑程式碼判斷信心較低。

### 5. 違反 DESIGN.md (3 項，具備條件)

僅在 `DESIGN.md` 或 `design-system.md` 存在時應用：

- **[中]** 顏色不在既定色調中。對比變更後的 CSS 中的顏色值與 `DESIGN.md` 中定義的色調方案。

- **[中]** 字體不在既定排版章節中。對比 `font-family` 數值與 `DESIGN.md` 的字體清單。

- **[中]** 間距值不在既定比例內。對比 `margin`/`padding`/`gap` 數值與 `DESIGN.md` 的間距比例。

---

## 抑制項

請勿標記：
- 在 `DESIGN.md` 中明確記錄為刻意選擇的模式
- 第三方/外部 CSS 檔案 (node_modules, vendor 目錄)
- CSS resets 或 normalize 樣式表
- 測試用例 (fixtures) 檔案
- 生成或壓縮後的 CSS
