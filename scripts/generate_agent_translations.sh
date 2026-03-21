#!/bin/bash

# 定義來源與目標的對應關係
declare -A SKILL_MAP
SKILL_MAP["browse/SKILL_zh_TW.md"]=".agents/skills/gstack-browse/SKILL_zh_TW.md"
SKILL_MAP["careful/SKILL_zh_TW.md"]=".agents/skills/gstack-careful/SKILL_zh_TW.md"
SKILL_MAP["design-consultation/SKILL_zh_TW.md"]=".agents/skills/gstack-design-consultation/SKILL_zh_TW.md"
SKILL_MAP["design-review/SKILL_zh_TW.md"]=".agents/skills/gstack-design-review/SKILL_zh_TW.md"
SKILL_MAP["document-release/SKILL_zh_TW.md"]=".agents/skills/gstack-document-release/SKILL_zh_TW.md"
SKILL_MAP["freeze/SKILL_zh_TW.md"]=".agents/skills/gstack-freeze/SKILL_zh_TW.md"
SKILL_MAP["guard/SKILL_zh_TW.md"]=".agents/skills/gstack-guard/SKILL_zh_TW.md"
SKILL_MAP["investigate/SKILL_zh_TW.md"]=".agents/skills/gstack-investigate/SKILL_zh_TW.md"
SKILL_MAP["office-hours/SKILL_zh_TW.md"]=".agents/skills/gstack-office-hours/SKILL_zh_TW.md"
SKILL_MAP["plan-ceo-review/SKILL_zh_TW.md"]=".agents/skills/gstack-plan-ceo-review/SKILL_zh_TW.md"
SKILL_MAP["plan-design-review/SKILL_zh_TW.md"]=".agents/skills/gstack-plan-design-review/SKILL_zh_TW.md"
SKILL_MAP["plan-eng-review/SKILL_zh_TW.md"]=".agents/skills/gstack-plan-eng-review/SKILL_zh_TW.md"
SKILL_MAP["qa-only/SKILL_zh_TW.md"]=".agents/skills/gstack-qa-only/SKILL_zh_TW.md"
SKILL_MAP["qa/SKILL_zh_TW.md"]=".agents/skills/gstack-qa/SKILL_zh_TW.md"
SKILL_MAP["retro/SKILL_zh_TW.md"]=".agents/skills/gstack-retro/SKILL_zh_TW.md"
SKILL_MAP["review/SKILL_zh_TW.md"]=".agents/skills/gstack-review/SKILL_zh_TW.md"
SKILL_MAP["setup-browser-cookies/SKILL_zh_TW.md"]=".agents/skills/gstack-setup-browser-cookies/SKILL_zh_TW.md"
SKILL_MAP["ship/SKILL_zh_TW.md"]=".agents/skills/gstack-ship/SKILL_zh_TW.md"
SKILL_MAP["unfreeze/SKILL_zh_TW.md"]=".agents/skills/gstack-unfreeze/SKILL_zh_TW.md"
SKILL_MAP["gstack-upgrade/SKILL_zh_TW.md"]=".agents/skills/gstack-upgrade/SKILL_zh_TW.md"
SKILL_MAP["SKILL_zh_TW.md"]=".agents/skills/gstack/SKILL_zh_TW.md"

for src in "${!SKILL_MAP[@]}"; do
    dest="${SKILL_MAP[$src]}"
    if [ -f "$src" ]; then
        echo "正在處理：$src -> $dest"
        # 複製並轉換路徑：將 ~/.claude/skills/gstack 替換為 ~/.codex/skills/gstack (或適當的路徑)
        # 注意：.agents 下的版本通常使用不同的路徑規則
        sed 's|~/.claude/skills/gstack|~/.codex/skills/gstack|g' "$src" > "$dest"
        # 額外的轉換：針對 .agents 特有的路徑
        sed -i 's|.claude/skills/gstack|.agents/skills/gstack|g' "$dest"
    else
        echo "警告：找不到來源檔案 $src"
    fi
done
