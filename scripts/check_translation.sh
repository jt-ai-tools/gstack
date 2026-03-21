#!/bin/bash
# 檢查翻譯完成度。對應每個原始 .md/.mdx，確認是否有 *_zh_TW.md/*_zh_TW.mdx 存在

ALL_FILES=$(./scripts/list_md_files.sh)
TOTAL=$(echo "$ALL_FILES" | wc -l)
DONE=0
PENDING=()

for f in $ALL_FILES; do
    EXT="${f##*.}"
    BASE="${f%.*}"
    ZH_FILE="${BASE}_zh_TW.${EXT}"
    if [ -f "$ZH_FILE" ]; then
        DONE=$((DONE + 1))
    else
        PENDING+=("$f")
    fi
done

echo "=== 翻譯進度檢查 ==="
echo "總計檔案: $TOTAL"
echo "已完成: $DONE"
echo "待處理: $((TOTAL - DONE))"
echo "完成率: $(printf "%.2f" $(echo "scale=2; $DONE * 100 / $TOTAL" | bc))%"

if [ ${#PENDING[@]} -gt 0 ]; then
    echo -e "\n--- 待處理檔案清單 ---"
    for p in "${PENDING[@]}"; do
        echo "$p"
    done
fi
