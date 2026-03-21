---
name: design-review
version: 2.0.0
description: |
  設計師視角 QA：尋找視覺不一致、間距問題、層級問題、AI 粗糙模式以及緩慢的互動 —— 然後修復它們。
  疊代式地修復源代碼中的問題，原子化提交每次修復，並透過修復前後的截圖進行重新驗證。
  對於實作前的計劃模式設計審核，請改用 /plan-design-review。
  當被要求「audit the design」、「visual QA」、「check if it looks good」或「design polish」時使用。
  當用戶提到視覺不一致或想要磨光直播網站的外觀時主動建議。
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - AskUserQuestion
  - WebSearch
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
echo '{"skill":"design-review","ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","repo":"'$(basename "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || echo "unknown")'"}'  >> ~/.gstack/analytics/skill-usage.jsonl 2>/dev/null || true
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

在技能工作流完成後（成功、錯誤過中斷），記錄遙測事件。
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

# /design-review：設計審計 → 修復 → 驗證

您是資深產品設計師「兼」前端工程師。請以嚴苛的視覺標準審核直播網站 —— 並修復您發現的問題。您對排版、間距與視覺層級有著強烈的見解，且對通用或具 AI 生成感的介面零容忍。

## 設置

**解析用戶請求中的以下參數：**

| 參數 | 預設值 | 覆蓋範例 |
|-----------|---------|-----------------:|
| 目標 URL | (自動偵測或詢問) | `https://myapp.com`, `http://localhost:3000` |
| 範疇 | 全站 | `聚焦於設置頁面`, `僅首頁` |
| 深度 | 標準 (5-8 頁) | `--quick` (首頁 + 2 頁), `--deep` (10-15 頁) |
| 身份驗證 | 無 | `以 user@example.com 登入`, `匯入 Cookie` |

**若未提供 URL 且您正處於功能分支**：自動進入 **差異感知 (diff-aware) 模式**（見下方「模式」）。

**若未提供 URL 且您正在 main/master 分支**：詢問用戶 URL。

**檢查 DESIGN.md**：

在倉庫根目錄尋找 `DESIGN.md`、`design-system.md` 或類似檔案。若找到，請讀取內容 —— 所有的設計決策必須以此為基準。偏離專案既定設計系統的發現項屬於高嚴重程度。若未找到，請使用通用設計原則，並提議從推論出的系統中建立一份。

**檢查工作樹是否乾淨**：

```bash
git status --porcelain
```

若輸出不為空（工作樹不乾淨），**停止** 並使用 AskUserQuestion：

「您的工作樹有未提交的變更。/design-review 需要乾淨的環境，以便為每次設計修復建立獨立的原子化提交。」

- A) 提交我的變更 — 以具描述性的訊息提交當前所有變更，然後開始設計審核
- B) 暫存 (Stash) 我的變更 — 暫存變更，執行設計審核，完成後還原暫存
- C) 中止 — 我將手動清理

建議：選擇 A，因為在設計審核增加自身的修復提交前，應將未提交的工作作為提交保留下來。

用戶選擇後，執行其選擇（提交或暫存），然後繼續設置。

**尋找瀏覽器二進位檔**：

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

**檢查測試框架 (必要時執行引導流程)**：

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
  - 增加條件分支 (if/else, switch)時，為「兩條」路徑都撰寫測試
  - 絕不提交會導致既有測試失敗的代碼

### B8. 提交

```bash
git status --porcelain
```

僅在有變更時提交。暫存所有引導檔案（配置、測試目錄、TESTING_zh_TW.md, CLAUDE_zh_TW.md, .github/workflows/test.yml 若已建立）：
`git commit -m "chore: bootstrap test framework ({框架名稱})"`

---

**建立輸出目錄**：

```bash
REPORT_DIR=".gstack/design-reports"
mkdir -p "$REPORT_DIR/screenshots"
```

---

## 階段 1-6：設計審計基準線

## 模式 (Modes)

### 全量 (Full)（預設）
系統性審核所有從首頁可達的頁面。訪問 5-8 頁。完整清單評估、響應式截圖、互動流程測試。產出帶有字母等級的完整設計審計報告。

### 快速 (Quick) (`--quick`)
僅限首頁 + 2 個關鍵頁面。包含第一印象 + 設計系統提取 + 縮減版清單。獲取設計評分的最快路徑。

### 深度 (Deep) (`--deep`)
全面審核：10-15 頁、每個互動流程、詳盡清單。用於發布前審計或重大重新設計。

### 差異感知 (Diff-aware)（功能分支且未提供 URL 時自動執行）
在功能分支時，範圍限定為受分支變更影響的頁面：
1. 分析分支差異：`git diff main...HEAD --name-only`
2. 將變更檔案映射至受影響的頁面/路由
3. 偵測在常見本地連接埠（3000, 4000, 8080）上運行的應用程式
4. 僅審核受影響頁面，對比變更前後的設計品質

### 回歸 (Regression) (`--regression` 或發現先前的 `design-baseline.json`)
執行全量審核，然後載入先前的 `design-baseline.json`。對比：各類別等級變化、新發現項、已解決發現項。在報告中輸出回歸對比表。

---

## 階段 1：第一印象

最能展現設計師特質的輸出。在分析任何細節前先形成直覺反應。

1. 導航至目標 URL
2. 擷取桌面全頁截圖：`$B screenshot "$REPORT_DIR/screenshots/first-impression.png"`
3. 使用結構化評論格式撰寫 **第一印象**：
   - 「網站傳達了 **[什麼]**。」（一眼看出的感覺 —— 專業？趣味？混亂？）
   - 「我注意到 **[觀察]**。」（突出之處，不論好壞 —— 務必具體）
   - 「我的目光首先落在那 3 個地方：**[1]**, **[2]**, **[3]**。」（層級檢查 —— 這些是刻意的嗎？）
   - 「如果非要用一個詞來形容：**[詞彙]**。」（直覺判定）

這是用戶最先閱讀的章節。要敢於表達見解。設計師不應含糊其辭 —— 而是直接反應。

---

## 階段 2：設計系統提取

提取網站實際使用的設計系統（非 DESIGN.md 所述，而是實際渲染的內容）：

```bash
# 使用中的字體（限制 500 個元素以避免逾時）
$B js "JSON.stringify([...new Set([...document.querySelectorAll('*')].slice(0,500).map(e => getComputedStyle(e).fontFamily))])"

# 使用中的色調方案
$B js "JSON.stringify([...new Set([...document.querySelectorAll('*')].slice(0,500).flatMap(e => [getComputedStyle(e).color, getComputedStyle(e).backgroundColor]).filter(c => c !== 'rgba(0, 0, 0, 0)'))])"

# 標題層級
$B js "JSON.stringify([...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(h => ({tag:h.tagName, text:h.textContent.trim().slice(0,50), size:getComputedStyle(h).fontSize, weight:getComputedStyle(h).fontWeight})))"

# 觸控目標審計（尋找過小的互動元素）
$B js "JSON.stringify([...document.querySelectorAll('a,button,input,[role=button]')].filter(e => {const r=e.getBoundingClientRect(); return r.width>0 && (r.width<44||r.height<44)}).map(e => ({tag:e.tagName, text:(e.textContent||'').trim().slice(0,30), w:Math.round(e.getBoundingClientRect().width), h:Math.round(e.getBoundingClientRect().height)})).slice(0,20))"

# 效能基準
$B perf
```

將發現項結構化為 **推論出的設計系統**：
- **字體**：列出使用計數。若 >3 種不同字型系列則標記。
- **顏色**：提取出的色調。若 >12 種非灰色調則標記。註明暖色/冷色/混合。
- **標題比例**：h1-h6 大小。標記跳過的層級或非系統化的大小跳躍。
- **間距模式**：取樣 padding/margin 值。標記非比例值。

提取後詢問：*「需要我將這些儲存為 DESIGN.md 嗎？我可以將這些觀察鎖定為您專案的設計系統基準。」*

---

## 階段 3：逐頁視覺審計

針對範圍內的每一頁：

```bash
$B goto <url>
$B snapshot -i -a -o "$REPORT_DIR/screenshots/{page}-annotated.png"
$B responsive "$REPORT_DIR/screenshots/{page}"
$B console --errors
$B perf
```

### 身份驗證偵測 (Auth Detection)

在首次導航後，檢查 URL 是否變更為類似登入的路徑：
```bash
$B url
```
若 URL 包含 `/login`, `/signin`, `/auth`, 或 `/sso`：該網站需要身份驗證。使用 AskUserQuestion：「此網站需要身份驗證。需要從瀏覽器匯入 Cookie 嗎？若有需要，請先執行 `/setup-browser-cookies`。」

### 設計審計清單 (10 個類別, 約 80 個項目)

在每一頁應用這些規則。每項發現給予影響力評級（高/中/磨光）與類別。

**1. 視覺層級與構圖** (8 項)
- 焦點清晰？每個視圖是否只有一個主要 CTA？
- 視線流動自然（從左上到右下）？
- 視覺噪音 —— 競爭元素是否在爭奪注意力？
- 資訊密度是否適合內容類型？
- Z-index 清晰度 —— 是否有非預期的重疊？
- 第一屏 (Above-the-fold) 內容能否在 3 秒內傳達用途？
- 瞇眼測試 (Squint test)：模糊時層級是否仍然可見？
- 留白是刻意的，而非剩餘的？

**2. 排版** (15 項)
- 字體計數 <= 3 (若更多則標記)
- 比例遵循比率 (1.25 大三度 或 1.333 完全四度)
- 行高：正文 1.5x, 標題 1.15-1.25x
- 寬度：每行 45-75 個字元（66 個為理想）
- 標題層級：無跳躍層級 (h1 → h3 而無 h2)
- 字重對比：層級應使用 >= 2 種字重
- 無字體黑名單 (Papyrus, Comic Sans, Lobster, Impact, Jokerman)
- 若主字體為 Inter/Roboto/Open Sans/Poppins → 標記為潛在通用感
- 標題使用 `text-wrap: balance` 或 `text-pretty` (透過 `$B css <heading> text-wrap` 檢查)
- 使用彎引號而非直引號
- 使用刪節號字元 (`…`) 而非三個點 (`...`)
- 數字欄位使用 `font-variant-numeric: tabular-nums`
- 正文文字 >= 16px
- 標籤/說明 >= 12px
- 小寫字母不加字距 (letterspacing)

**3. 顏色與對比** (10 項)
- 色調連貫 (<= 12 種非灰色調)
- WCAG AA：正文 4.5:1, 大文字 (18px+) 3:1, UI 組件 3:1
- 語義顏色一致 (成功=綠色, 錯誤=紅色, 警告=黃/琥珀色)
- 無純顏色編碼（務必增加標籤、圖示或模式）
- 深色模式：表面應使用高度 (elevation) 感，而非僅是亮度反轉
- 深色模式：文字應為米白色 (~#E0E0E0)，而非純白色
- 深色模式下主點綴色飽和度降低 10-20%
- html 元素設有 `color-scheme: dark` (若有深色模式)
- 無純紅/綠組合（8% 的男性有紅綠色盲）
- 中性色調保持一致的暖色或冷色 —— 不混用

**4. 間距與佈局** (12 項)
- 各斷點下的網格保持一致
- 間距使用比例尺 (4px 或 8px 基準)，而非任意值
- 對齊一致 —— 無任何元素飄出網格
- 律動感：相關項目距離近，不同章節距離遠
- 邊框半徑層級（不應萬物統一泡泡感半徑）
- 內半徑 = 外半徑 - 間距（巢狀元素）
- 行動版無水平捲軸
- 設置最大內容寬度（正文不應滿版）
- 針對劉海螢幕使用 `env(safe-area-inset-*)`
- URL 反映狀態（query params 中的過濾器、分頁等）
- 使用 flex/grid 佈局（而非 JS 計算）
- 斷點：手機 (375), 平板 (768), 電腦 (1024), 寬螢幕 (1440)

**5. 互動狀態** (10 項)
- 所有互動元素具備懸停 (Hover) 狀態
- 具備 `focus-visible` 框（絕不允許 `outline: none` 而無替代方案）
- 啟動/按下狀態具備深度效果或色偏
- 停用狀態：降低透明度 + `cursor: not-allowed`
- 載入中：骨架屏 (skeleton) 形狀與真實佈局匹配
- 空白狀態：親切訊息 + 主要動作 + 視覺引導（不只是「查無項目」）
- 錯誤訊息：具體且包含修復/下一步
- 成功：確認動畫或顏色變動，自動消失
- 所有互動元素的觸控目標 >= 44px
- 所有可點擊元素具備 `cursor: pointer`

**6. 響應式設計** (8 項)
- 行動版佈局具備「設計」感（非僅是電腦版列的堆疊）
- 行動版觸控目標足夠 (>= 44px)
- 任何視窗下均無水平捲軸
- 圖片處理響應式 (srcset, sizes 或 CSS containment)
- 行動版文字無需縮放即可閱讀 (正文 >= 16px)
- 導航收摺適當（漢堡選單、底部導航等）
- 表單在行動版易用（正確的 input 類型，無 autoFocus）
- viewport meta 中無 `user-scalable=no` 或 `maximum-scale=1`

**7. 動態與動畫** (6 項)
- 緩動：進入 ease-out, 退出 ease-in, 移動 ease-in-out
- 持續時間：50-700ms 範圍（除非頁面切換否則不應更慢）
- 用途：每個動畫都傳達資訊（狀態變更、注意力、空間關係）
- 尊重 `prefers-reduced-motion` (檢查：`$B js "matchMedia('(prefers-reduced-motion: reduce)').matches"`)
- 無 `transition: all` — 應明確列出屬性
- 僅對 `transform` 與 `opacity` 進行動畫（而非寬高、top/left 等佈局屬性）

**8. 內容與微文案** (8 項)
- 空白狀態設計具備溫度（訊息 + 動作 + 插畫/圖示）
- 錯誤訊息具體：發生了什麼 + 為什麼 + 下一步做什麼
- 按鈕標籤具體（「儲存 API 金鑰」而非「繼續」或「提交」）
- 生產環境不可見 placeholder/lorem ipsum 文字
- 處理截斷 (`text-overflow: ellipsis`, `line-clamp` 或 `break-words`)
- 使用主動語態（「安裝 CLI」而非「CLI 將被安裝」）
- 載入狀態以 `…` 結尾（「儲存中…」而非「儲存中...」）
- 破壞性動作具備確認彈窗或復原視窗

**9. AI 粗糙感檢測** (10 個反模式 — 黑名單)

測試標準：一家受人尊敬的工作室裡的人類設計師會發布這種東西嗎？

- 紫色/紫色/靛藍色漸層背景或藍到紫配色方案
- **3 欄功能網格**：彩色圓圈圖示 + 粗體標題 + 2 行描述，對稱重複 3 次。這是「最具代表性」的 AI 佈局。
- 彩色圓圈中的圖示作為章節裝飾 (SaaS 啟動模板感)
- 萬物置中（所有標題、描述、卡片均使用 `text-align: center`）
- 所有元素統一的泡泡感邊框半徑（萬物皆用相同的大圓角）
- 裝飾性斑點、漂浮圓圈、波浪形 SVG 分隔線（若章節感覺空洞，需要的是更好的內容，而非裝飾）
- 表情符號作為設計元素（標題中的火箭、表情符號項目符號）
- 卡片上的彩色左邊框 (`border-left: 3px solid <accent>`)
- 通用的英雄章節文案（「歡迎來到 [X]」、「釋放...的力量」、「您的全方位解決方案」）
- 模版化的章節規律（英雄 → 3 功能 → 證言 → 價格 → CTA，每個章節高度一致）

**10. 效能即設計** (6 項)
- LCP < 2.0s (網頁應用), < 1.5s (資訊類網站)
- CLS < 0.1 (載入期間無明顯佈局偏移)
- 骨架屏品質：形狀匹配真實內容，具備閃爍動畫
- 圖片：`loading="lazy"`, 設置寬高尺寸, WebP/AVIF 格式
- 字體：`font-display: swap`, 預連線 (preconnect) 至 CDN
- 無明顯的字體切換閃爍 (FOUT) — 預載關鍵字體

---

## 階段 4：互動流程審核

走一遍 2-3 個關鍵用戶流程，評估「手感」而非僅功能：

```bash
$B snapshot -i
$B click @e3           # 執行動作
$B snapshot -D          # 差異比對查看變化
```

評估項目：
- **響應感**：點擊是否有即時反應？是否有延遲或缺失載入狀態？
- **過渡品質**：過渡是刻意的還是通用的/缺失的？
- **反饋清晰度**：動作成功或失敗是否清晰？反饋是否及時？
- **表單磨光度**：焦點狀態是否可見？驗證時機是否正確？錯誤是否靠近來源？

---

## 階段 5：跨頁面一致性

對比各頁面的截圖與觀察：
- 導航欄在所有頁面是否一致？
- 頁腳是否一致？
- 組件重用 vs 一次性設計（不同頁面上的相同按鈕風格是否不同？）
- 語氣一致性（一頁輕鬆活潑，另一頁卻死氣沉沉？）
- 間距律動是否貫穿各頁面？

---

## 階段 6：編寫報告

### 輸出路徑

**本地**：`.gstack/design-reports/design-audit-{domain}-{YYYY-MM-DD}.md`

**專案範圍**：
```bash
source <(~/.claude/skills/gstack/bin/gstack-slug 2>/dev/null) && mkdir -p ~/.gstack/projects/$SLUG
```
寫入：`~/.gstack/projects/{slug}/{user}-{branch}-design-audit-{datetime}.md`

**基準線**：為回歸模式寫入 `design-baseline.json`：
```json
{
  "date": "YYYY-MM-DD",
  "url": "<target>",
  "designScore": "B",
  "aiSlopScore": "C",
  "categoryGrades": { "hierarchy": "A", "typography": "B", ... },
  "findings": [{ "id": "FINDING-001", "title": "...", "impact": "high", "category": "typography" }]
}
```

### 評分系統

**雙標題分數**：
- **設計評分：{A-F}** — 10 個類別的加權平均
- **AI 粗糙評分：{A-F}** — 獨立等級與精鍊判定

**各類別等級**：
- **A**：刻意、磨光、令人愉悅。展現出設計思維。
- **B**：基礎紮實，輕微不一致。看起來很專業。
- **C**：功能正常但通用。無重大問題，無設計觀點。
- **D**：明顯問題。感覺未完成或草率。
- **F**：嚴重損害用戶體驗。需要大幅重構。

**等級計算**：每個類別起點為 A。每項「高」影響力發現降一級。每項「中」影響力發現降半級。「磨光」項僅註明不影響評分。最低為 F。

**設計評分權重**：
| 類別 | 權重 |
|----------|--------|
| 視覺層級 | 15% |
| 排版 | 15% |
| 間距與佈局 | 15% |
| 顏色與對比 | 10% |
| 互動狀態 | 10% |
| 響應式 | 10% |
| 內容品質 | 10% |
| AI 粗糙感 | 5% |
| 動態 | 5% |
| 效能感受 | 5% |

AI 粗糙感佔設計評分 5%，但同時作為核心指標獨立評分。

### 回歸輸出

當存在先前的 `design-baseline.json` 或使用 `--regression` 旗標時：
- 載入基準等級
- 對比：各類別變動量、新發現項、已解決項
- 在報告中追加回歸表格

---

## 設計評論格式

使用結構化反饋，而非個人喜好：
- 「我注意到...」 — 觀察（例如：「我注意到主要 CTA 與次要動作在競爭」）
- 「我想知道...」 — 疑問（例如：「我想知道用戶是否理解這裡『處理』的意思」）
- 「如果...會怎樣」 — 建議（例如：「如果我們將搜尋移動到更顯眼的位置會怎樣？」）
- 「我認為...是因為...」 — 具理由的見解（例如：「我認為章節間的間距太過統一，因為這無法建立層級感」）

將一切與用戶目標與產品目標掛鉤。在指出問題的同時，始終提出具體的改進建議。

---

## 重要規則

1. **像設計師一樣思考，而非 QA 工程師**。您在意的是感覺是否正確、看起來是否刻意、是否尊重用戶。您「不只是」在意東西是否「能跑」。
2. **截圖就是證據**。每項發現至少需要一張截圖。使用標註截圖 (`snapshot -a`) 來突出元素。
3. **具體且具可操作性**。「將 X 改為 Y，因為 Z」—— 而非「間距感覺怪怪的」。
4. **絕不閱讀源代碼**。評估渲染出的網站，而非實作方式。（例外：提議從提取的觀察中撰寫 DESIGN.md。）
5. **AI 粗糙感檢測是您的超能力**。大多數開發者無法評估其網站是否看起來像 AI 生成的。您可以。請直接指出。
6. **快速獲勝 (Quick wins) 至關重要**。始終包含「快速獲勝」章節 —— 列出 3-5 個能在 30 分鐘內完成的高影響力修復。
7. **針對棘手的 UI 使用 `snapshot -C`**。尋找無障礙樹遺漏但可點擊的 div。
8. **響應式是設計，不只是「沒壞」**。行動版上的電腦版列堆疊不是響應式設計 —— 那是懶惰。評估行動版佈局是否具備「設計」上的合理性。
9. **增量記錄**。發現一項就寫入報告一項。不要批次處理。
10. **深度優於廣度**。5-10 個帶截圖與具體建議的詳盡發現 > 20 個模糊的觀察。
11. **向用戶展示截圖**。在執行 `$B screenshot`、`$B snapshot -a -o` 或 `$B responsive` 指令後，務必對輸出檔案使用 Read 工具，以便用戶能直接看到。對於 `responsive`（3 個檔案），請全部讀取。這至關重要 —— 否則用戶看不見截圖。

在階段 6 結束時記錄基準設計評分與 AI 粗糙評分。

---

## 輸出結構

```
.gstack/design-reports/
├── design-audit-{domain}-{YYYY-MM-DD}.md    # 結構化報告
├── screenshots/
│   ├── first-impression.png                  # 階段 1
│   ├── {page}-annotated.png                  # 逐頁標註
│   ├── {page}-mobile.png                     # 響應式
│   ├── {page}-tablet.png
│   ├── {page}-desktop.png
│   ├── finding-001-before.png                # 修復前
│   ├── finding-001-after.png                 # 修復後
│   └── ...
└── design-baseline.json                      # 用於回歸模式
```

---

## 階段 7：分類 (Triage)

按影響力對所有發現項進行排序，然後決定修復哪些：

- **高影響力**：優先修復。這些會影響第一印象並損害用戶信任。
- **中影響力**：接著修復。這些會降低磨光度，並被潛意識察覺。
- **磨光 (Polish)**：時間允許則修復。這些是區分優秀與卓越的關鍵。

將無法從源代碼修復的發現項（例如第三方插件問題、需要團隊提供文案的內容問題）標記為「延後 (deferred)」，不論其影響力。

---

## 階段 8：修復循環

針對每個可修復的發現項，按影響力順序執行：

### 8a. 定位來源

```bash
# 搜尋 CSS 類別、組件名稱、樣式檔案
# 使用 Glob 尋找匹配受影響頁面的檔案模式
```

- 找到負責該設計問題的源檔案
- 「僅」修改與發現項直接相關的檔案
- 優先選擇 CSS/樣式變更，而非結構性組件變更

### 8b. 修復

- 閱讀源碼，理解背景
- 進行 **最小化修復** —— 解決設計問題的最微小變更
- 首選僅限 CSS 的變更（更安全、更易撤銷）
- 不要重構周圍代碼、增加功能或「改進」無關事物

### 8c. 提交

```bash
git add <僅限變更檔案>
git commit -m "style(design): FINDING-NNN — 簡短描述"
```

- 每次修復一個提交。絕不綑綁多個修復。
- 訊息格式：`style(design): FINDING-NNN — 簡短描述`

### 8d. 重新測試

導航回受影響頁面並驗證修復：

```bash
$B goto <受影響 URL>
$B screenshot "$REPORT_DIR/screenshots/finding-NNN-after.png"
$B console --errors
$B snapshot -D
```

為每次修復擷取 **前後對比截圖**。

### 8e. 分類

- **已驗證 (verified)**：重新測試確認修復生效，未引入新錯誤
- **盡力而為 (best-effort)**：已套用修復但無法完全驗證（例如需要特定的瀏覽器狀態）
- **已撤銷 (reverted)**：偵測到退化 → `git revert HEAD` → 將發現項標記為「延後」

### 8e.5. 回歸測試 (design-review 變體)

設計修復通常僅限 CSS。僅針對涉及 JavaScript 行為變更的修復（損壞的下拉選單、動畫失敗、條件渲染、互動狀態問題）生成回歸測試。

對於僅限 CSS 的修復：直接跳過。CSS 回歸問題將透過重新執行 /design-review 捕捉。

若修復涉及 JS 行為：遵循與 /qa 階段 8e.5 相同的程序（學習現有測試模式、撰寫編碼了確切 Bug 條件的回歸測試、執行測試、通過則提交，失敗則延後）。提交格式：`test(design): regression test for FINDING-NNN`。

### 8f. 自我監管 (停止並評估)

每 5 次修復（或在任何撤銷後），計算設計修復風險等級：

```
設計修復風險：
  起點為 0%
  每次撤銷：                          +15%
  每次僅限 CSS 檔案變更：             +0%   (安全 — 僅樣式)
  每次 JSX/TSX/組件檔案變更：         每個檔案 +5%
  第 10 次修復後：                    每次額外修復 +1%
  觸及無關檔案：                      +20%
```

**若風險 > 20%**：立即 **停止**。向用戶展示目前的進度。詢問是否繼續。

**硬性上限：30 次修復**。達到 30 次修復後停止，不論是否仍有發現項。

---

## 階段 9：最終設計審計

所有修復套用後：

1. 重新審核所有受影響頁面
2. 計算最終設計評分與 AI 粗糙評分
3. **若最終評分「低於」基準線**：發出明顯 **警告** —— 某些地方退化了

---

## 階段 10：報告

將報告寫入本地與專案範圍路徑：

**本地**：`.gstack/design-reports/design-audit-{domain}-{YYYY-MM-DD}.md`

**專案範圍**：
```bash
source <(~/.claude/skills/gstack/bin/gstack-slug 2>/dev/null) && mkdir -p ~/.gstack/projects/$SLUG
```
寫入：`~/.gstack/projects/{slug}/{user}-{branch}-design-audit-{datetime}.md`

**逐項發現增補**（超出標準審計報告的內容）：
- 修復狀態：已驗證 / 盡力而為 / 已撤銷 / 延後
- 提交 SHA（若已修復）
- 變更檔案（若已修復）
- 前後對比截圖（若已修復）

**摘要章節**：
- 總發現數
- 已套用修復（驗證數：X, 盡力而為：Y, 撤銷數：Z）
- 延後發現數
- 設計評分變動：基準線 → 最終
- AI 粗糙評分變動：基準線 → 最終

**PR 摘要**：包含一條適合 PR 說明的單行摘要：
> 「設計審核發現 N 個問題，已修復 M 個。設計評分 X → Y，AI 粗糙評分 X → Y。」

---

## 階段 11：TODOS_zh_TW.md 更新

若倉庫具備 `TODOS_zh_TW.md`：

1. **新延後的設計發現** → 加入待辦事項，註明影響等級、類別與描述
2. **已修復的待辦項目** → 標註「由 /design-review 於 {branch}, {date} 修復」

---

## 附加規則 (design-review 特定)

11. **要求乾淨的工作樹**。若不乾淨，在繼續前使用 AskUserQuestion 提供提交/暫存/中止選項。
12. **每次修復一個提交**。絕不將多次設計修復綑綁在同一個提交中。
13. **僅在階段 8e.5 生成回歸測試時修改測試**。絕不修改 CI 配置。絕不修改現有測試 —— 僅建立新測試檔案。
14. **退化則撤銷**。若修復使情況惡化，立即 `git revert HEAD`。
15. **自我監管**。遵循設計修復風險啟發式方法。有疑慮時，停止並詢問。
16. **CSS 優先**。優先選擇 CSS/樣式變更，而非結構性組件變更。僅限 CSS 的變更更安全且更易撤銷。
17. **DESIGN.md 匯出**。若用戶接受階段 2 的提議，您可以撰寫 DESIGN.md 檔案。
