# gstack 開發指南

## 指令

```bash
bun install          # 安裝依賴項
bun test             # 執行免費測試 (browse + snapshot + 技能驗證)
bun run test:evals   # 執行付費評估：LLM 裁判 + E2E (基於差異，單次執行最高約 $4)
bun run test:evals:all  # 不論差異為何，執行「所有」付費評估
bun run test:e2e     # 僅執行 E2E 測試 (基於差異，單次執行最高約 $3.85)
bun run test:e2e:all # 不論差異為何，執行「所有」E2E 測試
bun run eval:select  # 根據當前差異顯示將會執行的測試
bun run dev <cmd>    # 在開發模式下執行 CLI，例如 bun run dev goto https://example.com
bun run build        # 生成文件 + 編譯二進位檔
bun run gen:skill-docs  # 從模板重新生成 SKILL.md 檔案
bun run skill:check  # 所有技能的健康度儀表板
bun run dev:skill    # 監看模式：變更時自動重新生成 + 驗證
bun run eval:list    # 列出 ~/.gstack-dev/evals/ 中所有的評估執行記錄
bun run eval:compare # 比較兩次評估執行 (自動選擇最近的兩次)
bun run eval:summary # 匯總所有評估執行的統計數據
```

執行 `test:evals` 需要 `ANTHROPIC_API_KEY`。Codex E2E 測試 (`test/codex-e2e.test.ts`) 使用來自 `~/.codex/` 配置的 Codex 自身驗證 —— 無需 `OPENAI_API_KEY` 環境變數。E2E 測試會即時串流進度（透過 `--output-format stream-json --verbose` 逐個工具顯示）。結果會持久化到 `~/.gstack-dev/evals/` 並與前一次執行進行自動對比。

**基於差異的測試選擇：** `test:evals` 和 `test:e2e` 會根據與基準分支的 `git diff` 自動選擇測試。每個測試都在 `test/helpers/touchfiles.ts` 中聲明其檔案依賴關係。對全域追蹤檔案 (session-runner, eval-store, llm-judge, gen-skill-docs) 的更改會觸發所有測試。使用 `EVALS_ALL=1` 或 `:all` 腳本變體可強制執行所有測試。執行 `eval:select` 可預覽將執行的測試。

## 測試 (Testing)

```bash
bun test             # 每次提交前執行 — 免費，<2 秒
bun run test:evals   # 交付前執行 — 付費，基於差異 (單次最高約 $4)
```

`bun test` 執行技能驗證、gen-skill-docs 品質檢查以及瀏覽器整合測試。`bun run test:evals` 透過 `claude -p` 執行 LLM 裁判品質評估和 E2E 測試。在建立 PR 之前，兩者都必須通過。

## 專案結構

```
gstack/
├── browse/          # 無頭瀏覽器 CLI (Playwright)
│   ├── src/         # CLI + 伺服器 + 指令
│   │   ├── commands.ts  # 指令註冊表 (單一事實來源)
│   │   └── snapshot.ts  # SNAPSHOT_FLAGS 元數據數組
│   ├── test/        # 整合測試 + 測試用例 (fixtures)
│   └── dist/        # 編譯後的二進位檔
├── scripts/         # 建置 + DX 工具
│   ├── gen-skill-docs.ts  # 模板 → SKILL.md 生成器
│   ├── skill-check.ts     # 健康度儀表板
│   └── dev-skill.ts       # 監看模式
├── test/            # 技能驗證 + 評估測試
│   ├── helpers/     # skill-parser.ts, session-runner.ts, llm-judge.ts, eval-store.ts
│   ├── fixtures/    # 真值 JSON、植入 Bug 的用例、評估基準
│   ├── skill-validation.test.ts  # 第 1 層：靜態驗證 (免費，<1 秒)
│   ├── gen-skill-docs.test.ts    # 第 1 層：生成器品質 (免費，<1 秒)
│   ├── skill-llm-eval.test.ts   # 第 3 層：LLM 裁判 (~$0.15/次)
│   └── skill-e2e.test.ts         # 第 2 層：透過 claude -p 進行 E2E (~$3.85/次)
├── qa-only/         # /qa-only 技能 (僅報告 QA，不修復)
├── plan-design-review/  # /plan-design-review 技能 (僅報告設計審核)
├── design-review/    # /design-review 技能 (設計審核 + 修復循環)
├── ship/            # 交付工作流技能
├── review/          # PR 審核技能
├── plan-ceo-review/ # /plan-ceo-review 技能
├── plan-eng-review/ # /plan-eng-review 技能
├── office-hours/    # /office-hours 技能 (YC Office Hours — 創業診斷 + 開發者腦力激盪)
├── investigate/     # /investigate 技能 (系統化根因除錯)
├── retro/           # 回顧技能
├── document-release/ # /document-release 技能 (交付後文件更新)
├── setup            # 一次性設置：建置二進位檔 + 技能符號連結
├── SKILL.md         # 從 SKILL.md.tmpl 生成 (請勿直接編輯)
├── SKILL.md.tmpl    # 模板：編輯此檔案，執行 gen:skill-docs
└── package.json     # 瀏覽器功能建置腳本
```

## SKILL.md 工作流

SKILL.md 檔案是從 `.tmpl` 模板 **生成** 的。若要更新文件：

1. 編輯 `.tmpl` 檔案 (例如 `SKILL.md.tmpl` 或 `browse/SKILL.md.tmpl`)
2. 執行 `bun run gen:skill-docs` (或執行會自動執行該指令的 `bun run build`)
3. 提交 `.tmpl` 和生成的 `.md` 檔案

若要新增瀏覽器指令：將其新增至 `browse/src/commands.ts` 並重新建置。
若要新增快照旗標：將其新增至 `browse/src/snapshot.ts` 中的 `SNAPSHOT_FLAGS` 並重新建置。

## 平台無關設計

技能絕不能硬編碼框架特定的指令、檔案模式或目錄結構。相反：

1. **讀取 [CLAUDE_zh_TW.md](CLAUDE_zh_TW.md)** 獲取專案特定配置（測試指令、評估指令等）
2. **若缺失，使用 AskUserQuestion** — 讓用戶告訴你，或者讓 gstack 搜尋倉庫
3. **將答案持久化至 [CLAUDE_zh_TW.md](CLAUDE_zh_TW.md)**，這樣我們就永遠不需要再問一次

這適用於測試指令、評估指令、部署指令以及任何其他專案特定的行為。專案擁有其配置；gstack 讀取它。

## 編寫 SKILL 模板

SKILL.md.tmpl 檔案是 **由 Claude 讀取的提示詞模板**，而不是 bash 腳本。每個 bash 代碼區塊都在單獨的 shell 中執行 —— 變數不會在區塊之間持久存在。

規則：
- **使用自然語言處理邏輯與狀態。** 不要使用 shell 變數在代碼區塊之間傳遞狀態。相反，告訴 Claude 應該記住什麼，並在敘述中引用它（例如，「在步驟 0 中偵測到的基準分支」）。
- **不要硬編碼分支名稱。** 透過 `gh pr view` 或 `gh repo view` 動態偵測 `main`/`master` 等。對於針對 PR 的技能，使用 `{{BASE_BRANCH_DETECT}}`。在敘述中使用「基準分支」，在代碼區塊佔位符中使用 `<base>`。
- **保持 bash 區塊自包含。** 每個代碼區塊都應該能獨立運作。如果一個區塊需要來自前一步驟的背景資訊，請在上面的敘述中重新說明。
- **用英語表達條件語句。** 不要使用 bash 中嵌套的 `if/elif/else`，而是編寫帶編號的決策步驟：「1. 如果為 X，執行 Y。2. 否則，執行 Z。」

## 瀏覽器互動

當你需要與瀏覽器互動時（QA、測試自己的產品、設置 Cookie），請使用 `/browse` 技能或透過 `$B <command>` 直接執行瀏覽器二進位檔。**絕不**使用 `mcp__claude-in-chrome__*` 工具 —— 它們緩慢、不可靠，且不是本專案所使用的工具。

## 本地副本符號連結意識

開發 gstack 時，`.claude/skills/gstack` 可能是一個指回此工作目錄的符號連結（已列入 gitignore）。這意味著技能變更是 **立即生效** 的 —— 這對於快速疊代非常棒，但在大型重構期間具有風險，因為寫到一半的技能可能會破壞並行使用 gstack 的其他 Claude Code 會話。

**每個會話檢查一次：** 執行 `ls -la .claude/skills/gstack` 查看它是符號連結還是真實副本。如果是指向你工作目錄的符號連結，請注意：
- 模板變更 + `bun run gen:skill-docs` 會立即影響所有 gstack 調用
- 對 SKILL.md.tmpl 檔案的破壞性變更可能會破壞並行的 gstack 會話
- 在大型重構期間，移除符號連結 (`rm .claude/skills/gstack`)，以便改用位於 `~/.claude/skills/gstack/` 的全域安裝

**關於計劃審核：** 在審核涉及修改技能模板或 gen-skill-docs 管道的計劃時，請考慮變更是否應該在生效前進行隔離測試（特別是用戶正在其他視窗積極使用 gstack 時）。

## 提交風格 (Commit Style)

**始終對提交進行細分 (bisect)。** 每次提交都應該是一個單一的邏輯變更。當你進行了多項變更時（例如：重命名 + 重寫 + 新測試），請在推送前將其拆分為單獨的提交。每次提交都應該是獨立可理解且可撤銷的。

優秀細分的範例：
- 重命名/移動與行為變更分開
- 測試基礎設施 (touchfiles, helpers) 與測試實作分開
- 模板變更與生成的檔案重新生成分開
- 機械式重構與新功能分開

當用戶說「bisect commit」或「bisect and push」時，請將暫存/未暫存的變更拆分為邏輯提交並推送。

## 更新日誌風格 (CHANGELOG style)

CHANGELOG.md 是 **給用戶看** 的，而不是給貢獻者看的。請像寫產品發布說明一樣撰寫它：

- 以用戶現在能 **做** 而以前不能做的事情開頭。推銷該功能。
- 使用平易近人的語言，而非實作細節。「你現在可以...」而不是「重構了...」
- **絕不提及 [TODOS_zh_TW.md](TODOS_zh_TW.md)、內部追蹤、評估基礎設施或面向貢獻者的細節。** 這些對用戶來說是不可見且無意義的。
- 將貢獻者/內部變更放在底部單獨的「給貢獻者」章節中。
- 每條記錄都應該讓某人想到「喔不錯，我想試試那個」。
- 不使用術語：說「每個問題現在都會告訴你你正處於哪個專案與分支」，而不是「透過導言解析器將 AskUserQuestion 格式在技能模板間標準化」。

## AI 工作量壓縮

在估算或討論工作量時，始終同時顯示人類團隊與 CC+gstack 的時間：

| 任務類型 | 人類團隊 | CC+gstack | 壓縮率 |
|-----------|-----------|-----------|-------------|
| 樣板代碼 / 腳手架 | 2 天 | 15 分鐘 | ~100x |
| 撰寫測試 | 1 天 | 15 分鐘 | ~50x |
| 功能實作 | 1 週 | 30 分鐘 | ~30x |
| Bug 修復 + 回歸測試 | 4 小時 | 15 分鐘 | ~20x |
| 架構 / 設計 | 2 天 | 4 小時 | ~5x |
| 研究 / 探索 | 1 天 | 3 小時 | ~3x |

完整性是廉價的。當完整的實作是「湖泊」（可達成）而非「海洋」（跨季度的遷移）時，不要建議走捷徑。請參閱技能導言中的「完整性原則」獲取完整的理念。

## 本地計劃

貢獻者可以將長線願景文件與設計文件儲存在 `~/.gstack-dev/plans/`。這些僅限本地（不提交）。在審核 [TODOS_zh_TW.md](TODOS_zh_TW.md) 時，請檢查 `plans/` 中可能準備好提升為 TODO 或實作的候選項目。

## E2E 評估失敗歸因協議

當 E2E 評估在 `/ship` 或任何其他工作流中失敗時，**絕不要在未經證實的情況下聲稱「與我們的變更無關」。** 這些系統之間存在隱形耦合 —— 導言文字的更改會影響代理行為，新的助手會改變時機，重新生成的 SKILL.md 會改變提示背景。

**在將失敗歸因於「預先存在」之前，必須：**
1. 在 main（或基準分支）上執行相同的評估，並證明在那裡也會失敗
2. 如果在 main 上通過但在分支上失敗 —— 那就是你的變更。追查原因。
3. 如果你無法在 main 上執行，請說「未經證實 —— 可能相關也可能不相關」，並在 PR 主體中將其標記為風險

沒有憑證的「預先存在」是懶惰的聲稱。證明它，否則不要說。

## 部署到活動技能

活動技能位於 `~/.claude/skills/gstack/`。進行更改後：

1. 推送你的分支
2. 在技能目錄中獲取並重置：`cd ~/.claude/skills/gstack && git fetch origin && git reset --hard origin/main`
3. 重新建置：`cd ~/.claude/skills/gstack && bun run build`

或者直接複製二進位檔：`cp browse/dist/browse ~/.claude/skills/gstack/browse/dist/browse`
