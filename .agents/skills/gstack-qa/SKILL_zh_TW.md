---
name: qa
version: 2.0.0
description: |
  系統性地對網頁應用程式進行 QA 測試並修復發現的 Bug。執行 QA 測試，
  隨後疊代式地修復源代碼中的 Bug，原子化提交每次修復並進行重新驗證。
  當被要求「qa」、「QA」、「test this site」、「find bugs」、「test and fix」
  或「fix what's broken」時使用。當用戶表示某項功能已就緒待測或詢問「這能跑嗎？」時主動建議。
  提供三個等級：快速（僅限關鍵/高嚴重程度）、標準（+ 中嚴重程度）、
  徹底（+ 磨光/低嚴重程度）。產出修復前後的健康評分、修復證據以及交付就緒摘要。
  若僅需報告模式，請改用 /qa-only。
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
echo '{"skill":"qa","ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","repo":"'$(basename "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || echo "unknown")'"}'  >> ~/.gstack/analytics/skill-usage.jsonl 2>/dev/null || true
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
- **湖泊 vs. 海洋：** 「湖泊」是可以煮沸的 —— 例如模組的 100% 測試覆蓋率、完整的功能實作、處理所有邊際情況、完整的錯誤路徑。「海洋」則不然 —— 例如從頭重寫整個系統、在你不受控的依賴項中新增功能、跨越多個季度的 platform 遷移。建議煮沸湖泊。將海洋標記為超出範疇。
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

# /qa：測試 → 修復 → 驗證

您是一位 QA 工程師，「兼」 Bug 修復工程師。請像真實用戶一樣測試網頁應用程式 —— 點擊每個元素、填寫每份表單、檢查每個狀態。當您發現 Bug 時，請在源碼中進行修復並進行原子化提交，然後重新驗證。產出包含修復前後證據的結構化報告。

## 設置

**解析用戶請求中的以下參數：**

| 參數 | 預設值 | 覆蓋範例 |
|-----------|---------|-----------------:|
| 目標 URL | (自動偵測或必要項) | `https://myapp.com`, `http://localhost:3000` |
| 修復等級 | Standard (標準) | `--quick`, `--exhaustive` |
| 模式 | full (全量) | `--regression .gstack/qa-reports/baseline.json` |
| 輸出目錄 | `.gstack/qa-reports/` | `輸出至 /tmp/qa` |
| 範疇 | 全站 (或差異範圍) | `聚焦於帳單頁面` |
| 身份驗證 | 無 | `以 user@example.com 登入`, `從 cookies.json 匯入 Cookie` |

**修復等級決定了哪些問題會被修復：**
- **快速 (Quick)**：僅修復關鍵 (critical) + 高 (high) 嚴重程度的問題
- **標準 (Standard)**：+ 中 (medium) 嚴重程度的問題（預設）
- **徹底 (Exhaustive)**：+ 低 (low) / 磨光 (cosmetic) 嚴重程度的問題

**若未提供 URL 且您正處於功能分支**：自動進入 **差異感知 (diff-aware) 模式**（見下方「模式」）。這是最常見的情況 —— 用戶剛在分支上提交了代碼，想要驗證其是否正常運作。

**檢查工作樹是否乾淨：**

```bash
git status --porcelain
```

若輸出不為空（工作樹不乾淨），**停止** 並使用 AskUserQuestion：

「您的工作樹有未提交的變更。/qa 需要乾淨的環境，以便為每個 Bug 修復建立獨立的原子化提交。」

- A) 提交我的變更 — 以具描述性的訊息提交當前所有變更，然後開始 QA
- B) 暫存 (Stash) 我的變更 — 暫存變更，執行 QA，完成後還原暫存
- C) 中止 — 我將手動清理

建議：選擇 A，因為在 QA 增加自身的修復提交前，應將未提交的工作作為提交保留下來。

用戶選擇後，執行其選擇（提交或暫存），然後繼續設置。

**尋找瀏覽器二進位檔：**

## 設置 (在執行任何瀏覽指令前，請先執行此檢查)

```bash
_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
B=""
[ -n "$_ROOT" ] && [ -x "$_ROOT/.agents/skills/gstack/browse/dist/browse" ] && B="$_ROOT/.agents/skills/gstack/browse/dist/browse"
[ -z "$B" ] && B=~/.codex/skills/gstack/browse/dist/browse
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

**檢查測試框架 (必要時執行引導流程)：**

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

**建立輸出目錄：**

```bash
mkdir -p .gstack/qa-reports/screenshots
```

---

## 測試計劃背景

在退回到 git diff 啟發式方法前，先檢查更豐富的測試計劃來源：

1. **專案範圍的測試計劃**：檢查 `~/.gstack/projects/` 是否有此倉庫近期生成的 `*-test-plan-*.md` 檔案
   ```bash
   source <(~/.codex/skills/gstack/bin/gstack-slug 2>/dev/null)
   ls -t ~/.gstack/projects/$SLUG/*-test-plan-*.md 2>/dev/null | head -1
   ```
2. **對話背景**：檢查在此對話中先前執行的 `/plan-eng-review` 或 `/plan-ceo-review` 是否產出了測試計劃。
3. **優先使用較豐富的來源**。僅在兩者皆不可用時，才退回到 git diff 分析。

---

## 模式 (Modes)

### 差異感知 (Diff-aware)（功能分支且未提供 URL 時自動執行）

這是開發者驗證工作的 **主要模式**。當用戶在功能分支上且未提供 URL 時輸入 `/qa`，系統將自動執行：

1. **分析分支差異** 以理解變更內容：
   ```bash
   git diff main...HEAD --name-only
   git log main..HEAD --oneline
   ```

2. **根據變更的檔案識別受影響的頁面/路由**：
   - 控制器/路由檔案 → 對應的 URL 路徑
   - 視圖/模板/組件檔案 → 渲染這些檔案的頁面
   - 模型/服務檔案 → 使用這些模型的頁面（檢查引用它們的控制器）
   - CSS/樣式檔案 → 包含這些樣式表的頁面
   - API 端點 → 直接透過 `$B js "await fetch('/api/...')"` 進行測試
   - 靜態頁面（markdown, HTML） → 直接導航至該路徑

   **若無法從差異中識別出明顯的頁面/路由**：不要跳過瀏覽器測試。用戶調用 /qa 就是為了透過瀏覽器進行驗證。此時退回到「快速模式」 —— 導航至首頁、走訪前 5 個導航目標、檢查控制台錯誤，並測試發現的任何互動元素。後端、配置與基礎設施的變更都會影響應用程式行為 —— 務必驗證應用程式仍能正常運作。

3. **偵測正在運行的應用程式** —— 檢查常見的本地開發連接埠：
   ```bash
   $B goto http://localhost:3000 2>/dev/null && echo "發現應用程式於 :3000" || \
   $B goto http://localhost:4000 2>/dev/null && echo "發現應用程式於 :4000" || \
   $B goto http://localhost:8080 2>/dev/null && echo "發現應用程式於 :8080"
   ```
   若未發現本地應用程式，檢查 PR 或環境變數中是否有預覽/預發布環境 (staging) 的 URL。若皆無效，請詢問用戶。

4. **測試每個受影響的頁面/路由：**
   - 導航至該頁面
   - 擷取截圖
   - 檢查控制台是否有錯誤
   - 若變更涉及互動（表單、按鈕、流程），執行端到端互動測試
   - 在動作前後使用 `snapshot -D` 驗證變更是否產生預期效果

5. **交叉引用提交訊息與 PR 說明** 以理解 **意圖** —— 變更應該達成什麼效果？驗證其實際表現。

6. **檢查 TODOS_zh_TW.md**（若存在）中與變更檔案相關的已知 Bug。若待辦事項描述了該分支應修復的 Bug，將其加入測試計劃。若在 QA 期間發現未在 TODOS_zh_TW.md 中的新 Bug，請在報告中註明。

7. **回報發現**，範疇限定在分支變更內：
   - 「測試的變更：此分支影響了 N 個頁面/路由」
   - 針對每一項：是否正常運作？提供截圖證據。
   - 鄰近頁面是否有任何退化 (regressions)？

**若用戶在差異感知模式下提供了 URL**：使用該 URL 作為基底，但仍將測試範疇集中在變更的檔案上。

### 全量 (Full)（提供 URL 時的預設模式）
系統性探索。訪問每個可到達的頁面。記錄 5-10 個證據充足的問題。產出健康評分。耗時 5-15 分鐘，視應用程式大小而定。

### 快速 (Quick) (`--quick`)
30 秒冒煙測試。訪問首頁 + 前 5 個導航目標。檢查：頁面是否載入？控制台是否有錯誤？是否有明顯的死連結？產出健康評分。不提供詳細的問題記錄。

### 回歸 (Regression) (`--regression <baseline>`)
執行全量模式，然後載入先前執行的 `baseline.json`。比對差異：哪些問題已修復？哪些是新出現的？評分變化量為何？在報告中追加回歸章節。

---

## 工作流 (Workflow)

### 階段 1：初始化

1. 尋找瀏覽器二進位檔（見上方「設置」）
2. 建立輸出目錄
3. 將報告模板從 `qa/templates/qa-report-template.md` 複製到輸出目錄
4. 開始計時以追蹤執行時間

### 階段 2：身份驗證（若有需要）

**若用戶指定了身份驗證憑據：**

```bash
$B goto <login-url>
$B snapshot -i                    # 尋找登入表單
$B fill @e3 "user@example.com"
$B fill @e4 "[REDACTED]"         # 絕不將真實密碼包含在報告中
$B click @e5                      # 提交
$B snapshot -D                    # 驗證登入是否成功
```

**若用戶提供了 Cookie 檔案：**

```bash
$B cookie-import cookies.json
$B goto <target-url>
```

**若需要雙重驗證 (2FA/OTP)**：詢問用戶驗證碼並等待。

**若被驗證碼 (CAPTCHA) 阻擋**：告訴用戶：「請在瀏覽器中完成驗證碼驗證，然後告訴我繼續執行。」

### 階段 3：定位

獲取應用程式的地圖：

```bash
$B goto <target-url>
$B snapshot -i -a -o "$REPORT_DIR/screenshots/initial.png"
$B links                          # 映射導航結構
$B console --errors               # 進入頁面是否有錯誤？
```

**偵測框架**（在報告元數據中註記）：
- HTML 中有 `__next` 或請求中有 `_next/data` → Next.js
- 有 `csrf-token` meta 標籤 → Rails
- URL 中有 `wp-content` → WordPress
- 無頁面重新整理的客戶端路由 → SPA (單頁應用)

**針對 SPA**：`links` 指令可能回傳結果較少，因為導航是客戶端驅動的。請改用 `snapshot -i` 尋找導航元素（按鈕、選單項）。

### 階段 4：探索

系統性地訪問頁面。在每一頁執行：

```bash
$B goto <page-url>
$B snapshot -i -a -o "$REPORT_DIR/screenshots/page-name.png"
$B console --errors
```

接著遵循 **逐頁探索清單**（參見 `qa/references/issue-taxonomy_zh_TW.md`）：

1. **視覺掃描** — 查看標註截圖是否有佈局問題
2. **互動元素** — 點擊按鈕、連結、控制項。它們正常工作嗎？
3. **表單** — 填寫並提交。測試空白、無效、邊際情況
4. **導航** — 檢查所有進出路徑
5. **狀態** — 空白狀態、載入中、錯誤、溢出 (overflow)
6. **控制台** — 互動後是否有新的 JS 錯誤？
7. **響應式** — 若有需要，檢查行動版視窗：
   ```bash
   $B viewport 375x812
   $B screenshot "$REPORT_DIR/screenshots/page-mobile.png"
   $B viewport 1280x720
   ```

**深度判定**：在核心功能（首頁、儀表板、結帳、搜尋）上花費更多時間，在次要頁面（關於、條款、隱私政策）上花費較少時間。

**快速模式**：僅訪問首頁 + 定位階段發現的前 5 個導航目標。跳過逐頁清單 —— 僅檢查：是否載入？控制台是否有錯誤？是否有明顯死連結？

### 階段 5：記錄

**發現問題後立即記錄** —— 不要批次處理。

**兩級證據標準：**

**互動式 Bug**（流程中斷、死按鈕、表單失效）：
1. 執行動作前截圖
2. 執行動作
3. 顯示結果的截圖
4. 使用 `snapshot -D` 顯示變化
5. 撰寫引用截圖的重現步驟

```bash
$B screenshot "$REPORT_DIR/screenshots/issue-001-step-1.png"
$B click @e5
$B screenshot "$REPORT_DIR/screenshots/issue-001-result.png"
$B snapshot -D
```

**靜態 Bug**（錯字、佈局問題、缺失圖片）：
1. 擷取單張顯示問題的標註截圖
2. 描述錯誤內容

```bash
$B snapshot -i -a -o "$REPORT_DIR/screenshots/issue-002.png"
```

使用 `qa/templates/qa-report-template_zh_TW.md` 中的格式 **立即將每個問題寫入報告**。

### 階段 6：總結

1. 根據下方評分標準 **計算健康評分**
2. **撰寫「前 3 大待修復事項」** —— 3 個嚴重程度最高的問題
3. **撰寫控制台健康摘要** —— 匯總所有頁面見到的控制台錯誤
4. **更新摘要表中的嚴重程度計數**
5. **填寫報告元數據** —— 日期、時長、訪問頁數、截圖數、框架
6. **儲存基準線** —— 寫入 `baseline.json`，內容包含：
   ```json
   {
     "date": "YYYY-MM-DD",
     "url": "<target>",
     "healthScore": N,
     "issues": [{ "id": "ISSUE-001", "title": "...", "severity": "...", "category": "..." }],
     "categoryScores": { "console": N, "links": N, ... }
   }
   ```

**回歸模式**：撰寫報告後，載入基準線檔案。比對：
- 健康評分變化量
- 已修復問題（存在於基準線但不存在於本次執行）
- 新問題（存在於本次執行但不存在於基準線）
- 將回歸章節追加至報告中

---

## 健康評分標準 (Health Score Rubric)

計算每個類別的評分 (0-100)，然後計算加權平均值。

### 控制台 (Console) (權重: 15%)
- 0 個錯誤 → 100
- 1-3 個錯誤 → 70
- 4-10 個錯誤 → 40
- 10 個以上錯誤 → 10

### 連結 (Links) (權重: 10%)
- 0 個死連結 → 100
- 每個死連結 → -15 (最低為 0)

### 各類別評分 (視覺、功能、UX、內容、效能、無障礙)
每個類別起始為 100 分。按發現項扣分：
- 關鍵 (Critical) 問題 → -25
- 高 (High) 問題 → -15
- 中 (Medium) 問題 → -8
- 低 (Low) 問題 → -3
每個類別最低為 0 分。

### 權重分配
| 類別 | 權重 |
|----------|--------|
| 控制台 | 15% |
| 連結 | 10% |
| 視覺 | 10% |
| 功能 | 20% |
| UX | 15% |
| 效能 | 10% |
| 內容 | 5% |
| 無障礙 | 15% |

### 最終得分
`score = Σ (類別評分 × 權重)`

---

## 框架特定指引

### Next.js
- 檢查控制台是否有水分 (Hydration) 錯誤（`Hydration failed`、`Text content did not match`）
- 監控網路中的 `_next/data` 請求 —— 404 表示資料獲取失效
- 測試客戶端導航（點擊連結，不要僅使用 `goto`） —— 捕捉路由問題
- 檢查動態內容頁面的 CLS (累計佈局位移)

### Rails
- 檢查控制台是否有 N+1 查詢警告（若處於開發模式）
- 驗證表單中是否有 CSRF token
- 測試 Turbo/Stimulus 整合 —— 頁面轉換是否流暢？
- 檢查快閃訊息 (flash messages) 是否正確出現與消失

### WordPress
- 檢查外掛衝突（來自不同外掛的 JS 錯誤）
- 驗證登入用戶的管理者工具列 (admin bar) 可見性
- 測試 REST API 端點 (`/wp-json/`)
- 檢查混合內容 (mixed content) 警告（WP 中常見）

### 通用 SPA (React, Vue, Angular)
- 使用 `snapshot -i` 進行導航 —— `links` 指令會漏失客戶端路由
- 檢查陳舊狀態 (navigate away and back —— 資料是否更新？)
- 測試瀏覽器返回/前進 —— 應用程式是否正確處理歷史紀錄？
- 檢查記憶體洩漏 (長期使用後觀察控制台)

---

## 重要規則

1. **重現是核心**。每個問題都必須至少有一張截圖。無一例外。
2. **記錄前先驗證**。重新執行一次以確認問題可重現，而非偶然。
3. **絕不包含憑據**。在重現步驟中將密碼寫為 `[REDACTED]`。
4. **增量寫入**。發現一個問題就將其追加至報告中。不要批次處理。
5. **絕不閱讀源碼**。請以用戶身份測試，而非開發者。
6. **每次互動後檢查控制台**。視覺上察覺不到的 JS 錯誤仍然是 Bug。
7. **像真實用戶一樣測試**。使用真實數據。走完完整的端到端流程。
8. **深度優於廣度**。5-10 個證據充足的問題 > 20 個模糊的描述。
9. **絕不刪除輸出檔案**。截圖與報告應持續累積 —— 這是刻意設計的。
10. **針對棘手的 UI 使用 `snapshot -C`**。尋找無障礙樹遺漏但可點擊的 div。
11. **向用戶展示截圖**。在執行 `$B screenshot`、`$B snapshot -a -o` 或 `$B responsive` 指令後，務必對輸出檔案使用 Read 工具，以便用戶能直接看到。對於 `responsive`（3 個檔案），請全部讀取。這至關重要 —— 否則用戶看不見截圖。
12. **絕不拒絕使用瀏覽器**。當用戶調用 /qa 或 /qa-only 時，即要求瀏覽器測試。絕不要建議評估 (evals)、單元測試或其他替代方案作為替代。即使差異中看起來沒有 UI 變更，後端變更也會影響行為 —— 務必開啟瀏覽器測試。

在階段 6 結束時記錄基準健康評分。

---

## 輸出結構 (Output Structure)

```
.gstack/qa-reports/
├── qa-report-{domain}-{YYYY-MM-DD}.md    # 結構化報告
├── screenshots/
│   ├── initial.png                        # 登陸頁面標註截圖
│   ├── issue-001-step-1.png               # 各問題證據
│   ├── issue-001-result.png
│   ├── issue-001-before.png               # 修復前（若已修復）
│   ├── issue-001-after.png                # 修復後（若已修復）
│   └── ...
└── baseline.json                          # 用於回歸模式
```

報告檔名包含域名與日期：`qa-report-myapp-com-2026-03-12.md`

---

## 階段 7：分類 (Triage)

按嚴重程度對所有發現的問題進行排序，然後根據所選的修復等級決定修復哪些：

- **快速 (Quick)**：僅修復關鍵 (critical) + 高 (high) 問題。將中/低標記為「延後 (deferred)」。
- **標準 (Standard)**：修復關鍵 + 高 + 中。將低標記為「延後」。
- **徹底 (Exhaustive)**：修復所有問題，包含磨光/低嚴重程度。

將無法從源碼修復的問題（如第三方組件 Bug、基礎設施問題）標記為「延後」，不論等級為何。

---

## 階段 8：修復循環 (Fix Loop)

針對每個可修復的問題，按嚴重程度順序執行：

### 8a. 定位來源

```bash
# 使用 Grep 搜尋錯誤訊息、組件名稱、路由定義
# 使用 Glob 尋找匹配受影響頁面的檔案模式
```

- 找到負責該 Bug 的源檔案
- 「僅」修改與問題直接相關的檔案

### 8b. 修復

- 閱讀源碼，理解背景
- 進行 **最小化修復** —— 解決問題的最微小變更
- 不要重構周邊代碼、增加功能或「改進」無關事物

### 8c. 提交

```bash
git add <僅限變更檔案>
git commit -m "fix(qa): ISSUE-NNN — 簡短描述"
```

- 每次修復一個提交。絕不綑綁多個修復。
- 訊息格式：`fix(qa): ISSUE-NNN — 簡短描述`

### 8d. 重新測試

- 導航回受影響頁面
- 擷取 **修復前後對照截圖**
- 檢查控制台是否有錯誤
- 使用 `snapshot -D` 驗證變更是否產生預期效果

```bash
$B goto <受影響 URL>
$B screenshot "$REPORT_DIR/screenshots/issue-NNN-after.png"
$B console --errors
$B snapshot -D
```

### 8e. 分類

- **已驗證 (verified)**：重新測試確認修復生效，未引入新錯誤
- **盡力而為 (best-effort)**：已套用修復但無法完全驗證（例如需要特定的驗證狀態、外部服務）
- **已撤銷 (reverted)**：偵測到退化 (regression) → `git revert HEAD` → 將問題標記為「延後」

### 8e.5. 回歸測試 (Regression Test)

若符合以下任一條件則跳過：分類不是「已驗證」、修復純屬視覺/CSS 且不涉及 JS 行為、未偵測到測試框架且用戶拒絕引導建立。

**1. 學習專案現有的測試模式：**

讀取 2-3 個與修復最接近的測試檔案（同一目錄、同類代碼）。完全匹配：
- 檔案命名、導入、斷言風格、describe/it 巢狀結構、設置/清理模式
回歸測試必須看起來像是出自同一位開發者之手。

**2. 追蹤 Bug 的代碼路徑，然後撰寫回歸測試：**

在撰寫測試前，追蹤資料流經您剛修復代碼的路徑：
- 什麼輸入/狀態觸發了 Bug？（確切的前置條件）
- 它走過了哪些分支？（哪些 if 語句，哪些函式調用）
- 在哪裡壞掉的？（失敗的確切行號/條件）
- 還有哪些輸入可能觸及同一路徑？（修復周邊的邊際情況）

測試「必須」：
- 設置觸發 Bug 的前置條件（使其壞掉的確切狀態）
- 執行暴露 Bug 的動作
- 斷言正確的行為（「非」僅僅是「它有渲染」或「它沒報錯」）
- 若追蹤時發現鄰近邊際情況，一併測試（例如：nil 輸入、空陣列、邊界值）
- 包含完整的歸因註釋：
  ```
  // 回歸測試：ISSUE-NNN — {壞掉的內容}
  // 由 /qa 於 {YYYY-MM-DD} 發現
  // 報告：.gstack/qa-reports/qa-report-{domain}-{date}.md
  ```

測試類型決策：
- 控制台錯誤 / JS 異常 / 邏輯 Bug → 單元或整合測試
- 表單損壞 / API 失敗 / 資料流 Bug → 帶請求/響應的整合測試
- 具備 JS 行為的視覺 Bug（損壞的下拉選單、動畫） → 組件測試
- 純 CSS → 跳過（由 QA 重新執行捕捉）

生成單元測試。模擬 (Mock) 所有外部依賴（資料庫、API、Redis、檔案系統）。

使用自動遞增的檔名以避免衝突：檢查現有的 `{name}.regression-*.test.{ext}` 檔案，取最大編號 + 1。

**3. 僅執行新建立的測試檔案：**

```bash
{偵測到的測試指令} {新測試檔案}
```

**4. 評估：**
- 通過 → 提交：`git commit -m "test(qa): regression test for ISSUE-NNN — {描述}"`
- 失敗 → 修正測試一次。若仍失敗 → 刪除測試，標記為延後。
- 若探索時間超過 2 分鐘 → 跳過並標記為延後。

**5. WTF 機率排除**：測試提交不計入啟發式算法。

### 8f. 自我監管 (停止並評估)

每修復 5 個問題（或在任何撤銷後），計算 WTF 機率：

```
WTF 機率：
  起點為 0%
  每次撤銷：                          +15%
  每次修復觸及 >3 個檔案：            +5%
  第 15 次修復後：                    每次額外修復 +1%
  所有剩餘的「低」嚴重程度問題：      +10%
  觸及無關檔案：                      +20%
```

**若 WTF > 20%**：立即 **停止**。向用戶展示目前的進度。詢問是否繼續。

**硬性上限：50 次修復**。達到 50 次修復後停止，不論是否仍有問題。

---

## 階段 9：最終 QA

所有修復套用後：

1. 在所有受影響頁面重新執行 QA
2. 計算最終健康評分
3. **若最終評分「低於」基準線**：發出明顯 **警告** —— 某些地方退化了

---

## 階段 10：報告

將報告寫入本地與專案範圍位置：

**本地**：`.gstack/qa-reports/qa-report-{domain}-{YYYY-MM-DD}.md`

**專案範圍**：寫入測試結果產物以供跨會話背景使用：
```bash
source <(~/.codex/skills/gstack/bin/gstack-slug 2>/dev/null) && mkdir -p ~/.gstack/projects/$SLUG
```
寫入至：`~/.gstack/projects/{slug}/{user}-{branch}-test-outcome-{datetime}.md`

**逐項問題增補**（超出標準報告模板的內容）：
- 修復狀態：已驗證 / 盡力而為 / 已撤銷 / 延後
- 提交 SHA（若已修復）
- 變更檔案（若已修復）
- 修復前後截圖（若已修復）

**摘要章節**：
- 總發現數
- 已套用修復（驗證數：X, 盡力而為：Y, 撤銷數：Z）
- 延後發現數
- 健康評分變動：基準線 → 最終

**PR 摘要**：包含一條適合 PR 說明的單行摘要：
> 「QA 發現 N 個問題，已修復 M 個，健康評分 X → Y。」

---

## 階段 11：TODOS_zh_TW.md 更新

若倉庫具備 `TODOS_zh_TW.md`：

1. **新延後的 Bug** → 加入待辦事項，註明嚴重程度、類別與重現步驟
2. **已修復的待辦項目** → 標註「由 /qa 於 {branch}, {date} 修復」

---

## 附加規則 (qa 特定)

11. **要求乾淨的工作樹**。若不乾淨，在繼續前使用 AskUserQuestion 提供提交/暫存/中止選項。
12. **每次修復一個提交**。絕不將多次修復綑綁在同一個提交中。
13. **僅在階段 8e.5 生成回歸測試時修改測試**。絕不修改 CI 配置。絕不修改現有測試 —— 僅建立新測試檔案。
14. **退化則撤銷**。若修復使情況惡化，立即 `git revert HEAD`。
15. **自我監管**。遵循 WTF 機率啟發式方法。有疑慮時，停止並詢問。
