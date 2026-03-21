---
name: gstack-upgrade
version: 1.1.0
description: |
  將 gstack 升級到最新版本。偵測是全域安裝還是本地副本安裝，執行升級，並顯示更新內容。
  當被要求「upgrade gstack」、「update gstack」或「get latest version」時使用。
allowed-tools:
  - Bash
  - Read
  - Write
  - AskUserQuestion
---
<!-- 由 SKILL.md.tmpl 自動生成 — 請勿直接編輯 -->
<!-- 重新生成請執行：bun run gen:skill-docs -->

# /gstack-upgrade

將 gstack 升級到最新版本並顯示更新內容。

## 內聯升級流程 (Inline upgrade flow)

此章節被所有技能的導言引用，用於偵測到 `UPGRADE_AVAILABLE` 時執行。

### 步驟 1：詢問用戶（或自動升級）

首先，檢查是否啟用了自動升級：
```bash
_AUTO=""
[ "${GSTACK_AUTO_UPGRADE:-}" = "1" ] && _AUTO="true"
[ -z "$_AUTO" ] && _AUTO=$(~/.claude/skills/gstack/bin/gstack-config get auto_upgrade 2>/dev/null || true)
echo "AUTO_UPGRADE=$_AUTO"
```

**若 `AUTO_UPGRADE=true` 或 `AUTO_UPGRADE=1`**：跳過 AskUserQuestion。記錄「正在自動升級 gstack v{old} → v{new}...」並直接進入步驟 2。若 `./setup` 在自動升級期間失敗，從備份（`.bak` 目錄）還原並警告用戶：「自動升級失敗 — 已還原至先前版本。請手動執行 `/gstack-upgrade` 重試。」

**否則**，使用 AskUserQuestion：
- 問題：「gstack **v{new}** 已發布（您目前使用的是 v{old}）。現在升級嗎？」
- 選項：["是的，現在升級", "始終保持最新", "現在不要", "不再詢問"]

**若選擇「是的，現在升級」**：進入步驟 2。

**若選擇「始終保持最新」**：
```bash
~/.claude/skills/gstack/bin/gstack-config set auto_upgrade true
```
告訴用戶：「自動升級已啟用。未來的更新將自動安裝。」然後進入步驟 2。

**若選擇「現在不要」**：寫入推遲狀態並採指數級退避（第一次推遲 = 24 小時，第二次 = 48 小時，第三次以上 = 1 週），然後繼續執行當前技能。不要再次提及升級。
```bash
_SNOOZE_FILE=~/.gstack/update-snoozed
_REMOTE_VER="{new}"
_CUR_LEVEL=0
if [ -f "$_SNOOZE_FILE" ]; then
  _SNOOZED_VER=$(awk '{print $1}' "$_SNOOZE_FILE")
  if [ "$_SNOOZED_VER" = "$_REMOTE_VER" ]; then
    _CUR_LEVEL=$(awk '{print $2}' "$_SNOOZE_FILE")
    case "$_CUR_LEVEL" in *[!0-9]*) _CUR_LEVEL=0 ;; esac
  fi
fi
_NEW_LEVEL=$((_CUR_LEVEL + 1))
[ "$_NEW_LEVEL" -gt 3 ] && _NEW_LEVEL=3
echo "$_REMOTE_VER $_NEW_LEVEL $(date +%s)" > "$_SNOOZE_FILE"
```
注意：`{new}` 是來自 `UPGRADE_AVAILABLE` 輸出的遠端版本 —— 請從更新檢查結果中替換它。

告訴用戶推遲時間：「下次提醒將於 24 小時後」（或 48 小時、1 週，視等級而定）。提示：「在 `~/.gstack/config.yaml` 中設置 `auto_upgrade: true` 即可實現自動升級。」

**若選擇「不再詢問」**：
```bash
~/.claude/skills/gstack/bin/gstack-config set update_check false
```
告訴用戶：「更新檢查已停用。執行 `~/.claude/skills/gstack/bin/gstack-config set update_check true` 可重新啟用。」
繼續執行當前技能。

### 步驟 2：偵測安裝類型

```bash
if [ -d "$HOME/.claude/skills/gstack/.git" ]; then
  INSTALL_TYPE="global-git"
  INSTALL_DIR="$HOME/.claude/skills/gstack"
elif [ -d ".claude/skills/gstack/.git" ]; then
  INSTALL_TYPE="local-git"
  INSTALL_DIR=".claude/skills/gstack"
elif [ -d ".claude/skills/gstack" ]; then
  INSTALL_TYPE="vendored"
  INSTALL_DIR=".claude/skills/gstack"
elif [ -d "$HOME/.claude/skills/gstack" ]; then
  INSTALL_TYPE="vendored-global"
  INSTALL_DIR="$HOME/.claude/skills/gstack"
else
  echo "錯誤：找不到 gstack"
  exit 1
fi
echo "安裝類型：$INSTALL_TYPE 位於 $INSTALL_DIR"
```

上方印出的安裝類型與目錄路徑將用於後續所有步驟。

### 步驟 3：儲存舊版本

使用步驟 2 輸出的安裝目錄：

```bash
OLD_VERSION=$(cat "$INSTALL_DIR/VERSION" 2>/dev/null || echo "unknown")
```

### 步驟 4：執行升級

根據步驟 2 偵測到的安裝類型與目錄：

**針對 Git 安裝** (global-git, local-git)：
```bash
cd "$INSTALL_DIR"
STASH_OUTPUT=$(git stash 2>&1)
git fetch origin
git reset --hard origin/main
./setup
```
若 `$STASH_OUTPUT` 包含 "Saved working directory"，警告用戶：「注意：本地變更已被暫存 (stash)。在技能目錄執行 `git stash pop` 可還原變更。」

**針對拷貝副本 (Vendored) 安裝** (vendored, vendored-global)：
```bash
PARENT=$(dirname "$INSTALL_DIR")
TMP_DIR=$(mktemp -d)
git clone --depth 1 https://github.com/garrytan/gstack.git "$TMP_DIR/gstack"
mv "$INSTALL_DIR" "$INSTALL_DIR.bak"
mv "$TMP_DIR/gstack" "$INSTALL_DIR"
cd "$INSTALL_DIR" && ./setup
rm -rf "$INSTALL_DIR.bak" "$TMP_DIR"
```

### 步驟 4.5：同步本地副本

使用步驟 2 的安裝目錄。檢查是否也有需要更新的本地副本：

```bash
_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
LOCAL_GSTACK=""
if [ -n "$_ROOT" ] && [ -d "$_ROOT/.claude/skills/gstack" ]; then
  _RESOLVED_LOCAL=$(cd "$_ROOT/.claude/skills/gstack" && pwd -P)
  _RESOLVED_PRIMARY=$(cd "$INSTALL_DIR" && pwd -P)
  if [ "$_RESOLVED_LOCAL" != "$_RESOLVED_PRIMARY" ]; then
    LOCAL_GSTACK="$_ROOT/.claude/skills/gstack"
  fi
fi
echo "LOCAL_GSTACK=$LOCAL_GSTACK"
```

若 `LOCAL_GSTACK` 不為空，從剛升級完的主安裝路徑複製以進行更新（與 README 的副本安裝方法相同）：
```bash
mv "$LOCAL_GSTACK" "$LOCAL_GSTACK.bak"
cp -Rf "$INSTALL_DIR" "$LOCAL_GSTACK"
rm -rf "$LOCAL_GSTACK/.git"
cd "$LOCAL_GSTACK" && ./setup
rm -rf "$LOCAL_GSTACK.bak"
```
告訴用戶：「同時更新了位於 `$LOCAL_GSTACK` 的本地副本 —— 準備好後請提交 `.claude/skills/gstack/` 的變更。」

若 `./setup` 失敗，從備份還原並警告用戶：
```bash
rm -rf "$LOCAL_GSTACK"
mv "$LOCAL_GSTACK.bak" "$LOCAL_GSTACK"
```
告訴用戶：「同步失敗 — 已還原位於 `$LOCAL_GSTACK` 的先前版本。請手動執行 `/gstack-upgrade` 重試。」

### 步驟 5：寫入標記並清除快取

```bash
mkdir -p ~/.gstack
echo "$OLD_VERSION" > ~/.gstack/just-upgraded-from
rm -f ~/.gstack/last-update-check
rm -f ~/.gstack/update-snoozed
```

### 步驟 6：顯示更新內容

讀取 `$INSTALL_DIR/CHANGELOG_zh_TW.md`。找出舊版本與新版本之間的所有版本條目。按主題歸納為 5-7 個項目符號。不要給予過多資訊 —— 專注於用戶導向的變更。除非內部重構非常重大，否則跳過。

格式：
```
gstack v{new} — 已從 v{old} 升級！

更新內容：
- [項目 1]
- [項目 2]
- ...

祝開發愉快！
```

### 步驟 7：繼續

顯示更新內容後，繼續執行用戶最初調用的技能。升級已完成 —— 無需進一步操作。

---

## 獨立使用

當直接調用為 `/gstack-upgrade` 時（非從導言觸發）：

1. 強制執行新鮮的更新檢查（繞過快取）：
```bash
~/.claude/skills/gstack/bin/gstack-update-check --force 2>/dev/null || \
.claude/skills/gstack/bin/gstack-update-check --force 2>/dev/null || true
```
使用輸出結果判斷是否有可用更新。

2. 若顯示 `UPGRADE_AVAILABLE <old> <new>`：遵循上方的步驟 2-6。

3. 若無輸出（主安裝已是最新）：檢查是否有過時的本地副本。

執行上方的步驟 2 bash 區塊以偵測主安裝類型與目錄 (`INSTALL_TYPE` 與 `INSTALL_DIR`)。然後執行上方的步驟 4.5 偵測 bash 區塊以檢查本地副本 (`LOCAL_GSTACK`)。

**若 `LOCAL_GSTACK` 為空**（無本地副本）：告訴用戶：「您已在使用最新版本 (v{version})。」

**若 `LOCAL_GSTACK` 不為空**，對比版本：
```bash
PRIMARY_VER=$(cat "$INSTALL_DIR/VERSION" 2>/dev/null || echo "unknown")
LOCAL_VER=$(cat "$LOCAL_GSTACK/VERSION" 2>/dev/null || echo "unknown")
echo "PRIMARY=$PRIMARY_VER LOCAL=$LOCAL_VER"
```

**若版本不一致**：執行步驟 4.5 同步 bash 區塊，從主安裝路徑更新本地副本。告訴用戶：「全域 v{PRIMARY_VER} 已是最新。已將本地副本從 v{LOCAL_VER} 更新至 v{PRIMARY_VER}。準備好後請提交 `.claude/skills/gstack/` 的變更。」

**若版本一致**：告訴用戶：「您已在使用最新版本 (v{PRIMARY_VER})。全域與本地副本皆已是最新。」
