# 貢獻指南 (Contributing to gstack)

感謝你想讓 gstack 變得更好。無論你是要修復技能提示中的錯字，還是要構建一個全新的工作流，本指南都將協助你快速上手。

## 快速開始

gstack 技能是 Claude Code 從 `skills/` 目錄中發現的 Markdown 檔案。通常它們位於 `~/.claude/skills/gstack/`（你的全域安裝路徑）。但在開發 gstack 本身時，你會希望 Claude Code 使用你 *工作樹 (working tree)* 中的技能 —— 這樣編輯就能立即生效，而無需複製或部署任何內容。

這就是開發模式 (dev mode) 的作用。它會將你的倉庫符號連結 (symlink) 到本地的 `.claude/skills/` 目錄，讓 Claude Code 直接從你的簽出路徑讀取技能。

```bash
git clone <repo> && cd gstack
bun install                    # 安裝依賴項
bin/dev-setup                  # 啟動開發模式
```

現在編輯任何 `SKILL.md`，在 Claude Code 中調用它（例如 `/review`），即可看到你的變更即時生效。開發完成後：

```bash
bin/dev-teardown               # 停用開發模式 — 回到你的全域安裝
```

## 貢獻者模式 (Contributor mode)

貢獻者模式將 gstack 變成一個自我改進的工具。啟用它後，Claude Code 會定期反映其使用 gstack 的經驗 —— 在每個主要工作流步驟結束時評分 0-10。當評分不是 10 分時，它會思考原因並在 `~/.gstack/contributor-logs/` 中提交一份報告，包含發生的情況、重現步驟以及如何改進。

```bash
~/.claude/skills/gstack/bin/gstack-config set gstack_contributor true
```

日誌是為 **你** 準備的。當某些事情煩到讓你想要修復時，Bug 報告已經寫好了。Fork gstack，將你的 Fork 符號連結到你遇到問題的專案中，修復它，然後開啟一個 PR。

### 貢獻者工作流

1. **正常使用 gstack** —— 貢獻者模式會自動反映並記錄問題
2. **檢查你的日誌：** `ls ~/.gstack/contributor-logs/`
3. **Fork 並克隆 gstack**（如果你還沒這麼做）
4. **將你的 Fork 符號連結到你遇到 Bug 的專案中：**
   ```bash
   # 在你的核心專案中（讓你感到困擾的那個專案）
   ln -sfn /path/to/your/gstack-fork .claude/skills/gstack
   cd .claude/skills/gstack && bun install && bun run build
   ```
5. **修復問題** —— 你的變更會在此專案中立即生效
6. **透過實際使用 gstack 進行測試** —— 執行讓你感到困擾的操作，驗證是否已修復
7. **從你的 Fork 開啟一個 PR**

這是最棒的貢獻方式：在你實際感到痛苦的專案中，一邊執行真實工作，一邊修復 gstack。

### 會話感知 (Session awareness)

當你同時開啟 3 個以上的 gstack 會話時，每個提問都會告訴你哪個專案、哪個分支以及正在發生什麼。不再需要看著問題想「等等，這是哪個視窗？」。這種格式在所有 15 個技能中都是一致的。

## 在 gstack 倉庫內部開發 gstack

當你在編輯 gstack 技能並希望透過在同一個倉庫中實際使用 gstack 來測試它們時，`bin/dev-setup` 會負責這部分的連結。它會建立指向你工作樹的 `.claude/skills/` 符號連結（已列入 gitignore），以便 Claude Code 使用你的本地編輯而非全域安裝。

```
gstack/                          <- 你的工作樹
├── .claude/skills/              <- 由 dev-setup 建立 (已列入 gitignore)
│   ├── gstack -> ../../         <- 指回倉庫根目錄的符號連結
│   ├── review -> gstack/review
│   ├── ship -> gstack/ship
│   └── ...                      <- 每個技能一個符號連結
├── review/
│   └── SKILL.md                 <- 編輯此檔案，使用 /review 測試
├── ship/
│   └── SKILL.md
├── browse/
│   ├── src/                     <- TypeScript 源代碼
│   └── dist/                    <- 編譯後的二進位檔 (已列入 gitignore)
└── ...
```

## 日常工作流

```bash
# 1. 進入開發模式
bin/dev-setup

# 2. 編輯一個技能
vim review/SKILL.md

# 3. 在 Claude Code 中測試 — 變更即時生效
#    > /review

# 4. 編輯瀏覽器源代碼？重新編譯二進位檔
bun run build

# 5. 今天的工作結束了？清除環境
bin/dev-teardown
```

## 測試與評估 (Testing & evals)

### 設置

```bash
# 1. 複製 .env.example 並加入你的 API 金鑰
cp .env.example .env
# 編輯 .env → 設置 ANTHROPIC_API_KEY=sk-ant-...

# 2. 安裝依賴項 (如果你還沒安裝)
bun install
```

Bun 會自動載入 `.env` —— 無需額外配置。Conductor 工作空間會自動繼承主工作樹的 `.env`（見下方的「Conductor 工作空間」）。

### 測試層級

| 層級 | 指令 | 成本 | 測試內容 |
|------|---------|------|---------------|
| 1 — 靜態 | `bun test` | 免費 | 指令驗證、快照旗標、SKILL.md 正確性、TODOS-format.md 引用、觀測能力單元測試 |
| 2 — E2E | `bun run test:e2e` | 約 $3.85 | 透過 `claude -p` 子進程執行完整的技能 |
| 3 — LLM 評估 | `bun run test:evals` | 獨立執行約 $0.15 | 使用 LLM 作為裁判對生成的 SKILL.md 文件評分 |
| 2+3 | `bun run test:evals` | 總計約 $4 | E2E + LLM 裁判 (兩者皆執行) |

```bash
bun test                     # 僅第 1 層 (每次提交前執行，<5 秒)
bun run test:e2e             # 第 2 層：僅 E2E (需要 EVALS=1，無法在 Claude Code 內部運行)
bun run test:evals           # 第 2 + 3 層組合 (單次執行約 $4)
```

### 第 1 層：靜態驗證 (免費)

隨 `bun test` 自動執行。無需 API 金鑰。

- **技能解析器測試** (`test/skill-parser.test.ts`) — 從 SKILL.md bash 代碼區塊中擷取每個 `$B` 指令，並對照 `browse/src/commands.ts` 中的指令註冊表進行驗證。捕捉錯字、已移除的指令以及無效的快照旗標。
- **技能驗證測試** (`test/skill-validation.test.ts`) — 驗證 SKILL.md 檔案僅引用真實的指令和旗標，且指令描述符合品質閾值。
- **生成器測試** (`test/gen-skill-docs.test.ts`) — 測試模板系統：驗證佔位符是否正確解析、輸出是否包含旗標的值提示（例如 `-d <N>` 而不只是 `-d`）、關鍵指令的強化描述（例如 `is` 列出有效狀態, `press` 列出關鍵範例）。

### 第 2 層：透過 `claude -p` 進行 E2E (單次執行約 $3.85)

啟動 `claude -p` 作為帶有 `--output-format stream-json --verbose` 的子進程，串流 NDJSON 以獲取即時進度，並掃描瀏覽器錯誤。這是最接近「此技能在端到端流程中是否真的能運作？」的測試。

```bash
# 必須從普通終端執行 — 無法嵌套在 Claude Code 或 Conductor 內部
EVALS=1 bun test test/skill-e2e.test.ts
```

- 受 `EVALS=1` 環境變數控制（防止意外執行昂貴的測試）
- 若在 Claude Code 內部運行則自動跳過（`claude -p` 無法嵌套）
- API 連接預檢 — 在燒錢前針對 ConnectionRefused 快速失敗
- 輸出即時進度到標準錯誤 (stderr)：`[Ns] turn T tool #C: Name(...)`
- 儲存完整的 NDJSON 轉錄與失敗 JSON 以供偵錯
- 測試位於 `test/skill-e2e.test.ts`，運行器邏輯位於 `test/helpers/session-runner.ts`

### E2E 觀測能力

當 E2E 測試運行時，它們會在 `~/.gstack-dev/` 中產出機器可讀的產物：

| 產物 | 路徑 | 用途 |
|----------|------|---------|
| 心跳 (Heartbeat) | `e2e-live.json` | 當前測試狀態 (按工具調用更新) |
| 局部結果 | `evals/_partial-e2e.json` | 已完成的測試 (在進程被殺掉後仍能倖存) |
| 進度日誌 | `e2e-runs/{runId}/progress.log` | 僅限追加的文字日誌 |
| NDJSON 轉錄 | `e2e-runs/{runId}/{test}.ndjson` | 每個測試的原始 `claude -p` 輸出 |
| 失敗 JSON | `e2e-runs/{runId}/{test}-failure.json` | 失敗時的診斷數據 |

**實時儀表板：** 在第二個終端中執行 `bun run eval:watch`，即可看到顯示已完成測試、當前運行測試以及成本的實時儀表板。使用 `--tail` 可同時顯示進度日誌的最後 10 行。

**評估歷史工具：**

```bash
bun run eval:list            # 列出所有評估執行 (回合數、持續時間、單次成本)
bun run eval:compare         # 比較兩次執行 — 顯示每個測試的變化量 + 要點評論
bun run eval:summary         # 匯總統計數據 + 各次執行的平均測試效率
```

**評估對比評論：** `eval:compare` 會生成自然語言的「要點」 (Takeaway) 章節，解釋兩次執行之間的變動 —— 標記回歸、註明改進、指出效率提升（更少回合、更快、更便宜），並產出整體摘要。這由 `eval-store.ts` 中的 `generateCommentary()` 驅動。

產物永遠不會被清理 —— 它們累積在 `~/.gstack-dev/` 中以供事後偵錯和趨勢分析。

### 第 3 層：LLM 作為裁判 (單次執行約 $0.15)

使用 Claude Sonnet 從三個維度為生成的 [SKILL_zh_TW.md](SKILL_zh_TW.md) 文件評分：

- **清晰度 (Clarity)** — AI 代理能否毫無歧義地理解指令？
- **完整性 (Completeness)** — 所有指令、旗標和使用模式是否都已記錄？
- **可操作性 (Actionability)** — 代理能否僅憑文件中的資訊執行任務？

每個維度評分 1-5。門檻：每個維度必須獲得 **≥ 4 分**。此外還有一個回歸測試，將生成的文件與來自 `origin/main` 的人工維護基準進行對比 —— 生成的文件評分必須等於或更高。

```bash
# 需要在 .env 中設置 ANTHROPIC_API_KEY — 已包含在 bun run test:evals 中
```

- 使用 `claude-sonnet-4-6` 以維持評分穩定性
- 測試位於 `test/skill-llm-eval.test.ts`
- 直接調用 Anthropic API（而非 `claude -p`），因此可以在任何地方運行，包括 Claude Code 內部

### CI

GitHub Action (`.github/workflows/skill-docs.yml`) 在每次推送和 PR 時執行 `bun run gen:skill-docs --dry-run`。如果生成的 SKILL.md 檔案與提交的檔案不同，CI 將失敗。這能在合併前捕捉過時的文件。

測試直接針對瀏覽器二進位檔運行 —— 不需要開發模式。

## 編輯 SKILL.md 檔案

SKILL.md 檔案是從 `.tmpl` 模板 **生成** 的。請勿直接編輯 `.md` —— 你的變更將在下次建置時被覆蓋。

```bash
# 1. 編輯模板
vim SKILL.md.tmpl              # 或 browse/SKILL.md.tmpl

# 2. 為兩個主機重新生成
bun run gen:skill-docs
bun run gen:skill-docs --host codex

# 3. 檢查健康度 (同時報告 Claude 和 Codex)
bun run skill:check

# 或使用監看模式 — 儲存時自動重新生成
bun run dev:skill
```

關於編寫模板的最佳實踐（自然語言優於 bash 語法、動態分支偵測、使用 `{{BASE_BRANCH_DETECT}}`），請參閱 [CLAUDE_zh_TW.md](CLAUDE_zh_TW.md) 的「編寫 SKILL 模板」章節。

若要新增瀏覽器指令，請將其新增至 `browse/src/commands.ts`。若要新增快照旗標，請將其新增至 `browse/src/snapshot.ts` 中的 `SNAPSHOT_FLAGS`。然後重新建置。

## 雙主機開發 (Claude + Codex)

gstack 為兩個主機生成 SKILL.md 檔案：**Claude** (`.claude/skills/`) 和 **Codex** (`.agents/skills/`)。每次模板變更都需要為兩者重新生成。

### 為兩個主機生成

```bash
# 生成 Claude 輸出 (預設)
bun run gen:skill-docs

# 生成 Codex 輸出
bun run gen:skill-docs --host codex
# --host agents 是 --host codex 的別名

# 或使用 build，它會同時執行兩者並編譯二進位檔
bun run build
```

### 主機之間的變動

| 項目 | Claude | Codex |
|--------|--------|-------|
| 輸出目錄 | `{skill}/SKILL.md` | `.agents/skills/gstack-{skill}/SKILL.md` |
| Frontmatter | 完整 (名稱, 描述, 允許工具, hooks, 版本) | 最小化 (僅名稱 + 描述) |
| 路徑 | `~/.claude/skills/gstack` | `~/.codex/skills/gstack` |
| Hook 技能 | `hooks:` frontmatter (由 Claude 強制執行) | 內聯安全建議文字 (僅供參考) |
| `/codex` 技能 | 包含 (Claude 封裝了 codex exec) | 排除 (自引用) |

### 測試 Codex 輸出

```bash
# 執行所有靜態測試 (包含 Codex 驗證)
bun test

# 檢查兩個主機的新鮮度
bun run gen:skill-docs --dry-run
bun run gen:skill-docs --host codex --dry-run

# 健康度儀表板涵蓋兩個主機
bun run skill:check
```

### .agents/ 的開發設置

當你執行 `bin/dev-setup` 時，它會在 `.claude/skills/` 和 `.agents/skills/`（如果適用）中同時建立符號連結，以便與 Codex 相容的代理也能發現你的開發中技能。

### 新增一項新技能

當你新增一個新的技能模板時，兩個主機都會自動獲得它：
1. 建立 `{skill}/SKILL.md.tmpl`
2. 執行 `bun run gen:skill-docs` (Claude 輸出) 和 `bun run gen:skill-docs --host codex` (Codex 輸出)
3. 動態模板發現機制會自動捕捉它 —— 無需手動更新清單
4. 提交 `{skill}/SKILL.md` 和 `.agents/skills/gstack-{skill}/SKILL.md`

## Conductor 工作空間

如果你正在使用 [Conductor](https://conductor.build) 並行執行多個 Claude Code 會話，`conductor.json` 會自動處理工作空間生命週期：

| Hook | 腳本 | 作用 |
|------|--------|-------------|
| `setup` | `bin/dev-setup` | 從主工作樹複製 `.env`、安裝依賴項、符號連結技能 |
| `archive` | `bin/dev-teardown` | 移除技能符號連結、清理 `.claude/` 目錄 |

當 Conductor 建立一個新工作空間時，`bin/dev-setup` 會自動執行。它會偵測主工作樹（透過 `git worktree list`），複製你的 `.env` 以便 API 金鑰能延續使用，並設置開發模式 —— 無需手動步驟。

**初次設置：** 將你的 `ANTHROPIC_API_KEY` 放入主倉庫的 `.env` 中（見 `.env.example`）。每個 Conductor 工作空間都會自動繼承它。

## 注意事項

- **SKILL.md 檔案是生成的。** 編輯 `.tmpl` 模板，而非 `.md`。執行 `bun run gen:skill-docs` 進行重新生成。
- **[TODOS_zh_TW.md](TODOS_zh_TW.md) 是統一的待辦清單。** 按技能/組件組織，具有 P0-P4 優先級。`/ship` 會自動偵測已完成項目。所有計劃/審核/回顧技能都會讀取它以獲取背景資訊。
- **瀏覽器源代碼變更後需要重新建置。** 如果你觸動了 `browse/src/*.ts`，請執行 `bun run build`。
- **開發模式會遮蔽你的全域安裝。** 專案本地技能優先於 `~/.claude/skills/gstack`。`bin/dev-teardown` 會恢復全域安裝。
- **Conductor 工作空間是獨立的。** 每個工作空間都是其自身的 git 工作樹。`bin/dev-setup` 透過 `conductor.json` 自動執行。
- **`.env` 會跨工作樹傳播。** 在主倉庫設置一次，所有 Conductor 工作空間都會獲得。
- **`.claude/skills/` 已列入 gitignore。** 符號連結永遠不會被提交。

## 在真實專案中測試你的變更

**這是開發 gstack 的推薦方式。** 將你的 gstack 簽出路徑符號連結到你實際使用它的專案中，這樣你在執行真實工作時，你的變更就能即時生效：

```bash
# 在你的核心專案中
ln -sfn /path/to/your/gstack-checkout .claude/skills/gstack
cd .claude/skills/gstack && bun install && bun run build
```

現在此專案中調用的每個 gstack 技能都會使用你的工作樹。編輯一個模板，執行 `bun run gen:skill-docs`，下一次 `/review` 或 `/qa` 調用將立即採用。

**若要回到穩定的全域安裝**，只需移除符號連結：

```bash
rm .claude/skills/gstack
```

Claude Code 會自動回退到使用 `~/.claude/skills/gstack/`。

### 替代方案：將你的全域安裝指向一個分支

如果你不想要針對每個專案建立符號連結，你可以切換全域安裝：

```bash
cd ~/.claude/skills/gstack
git fetch origin
git checkout origin/<分支名稱>
bun install && bun run build
```

這會影響所有專案。若要恢復：`git checkout main && git pull && bun run build`。

## 交付你的變更

當你對技能編輯感到滿意時：

```bash
/ship
```

這會執行測試、審核差異、分類 Greptile 評論（帶有 2 級升級機制）、管理 [TODOS_zh_TW.md](TODOS_zh_TW.md)、提升版本並開啟一個 PR。請參閱 [ship/SKILL_zh_TW.md](ship/SKILL_zh_TW.md) 獲取完整工作流。
