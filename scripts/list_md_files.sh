#!/bin/bash
# 查找所有 .md 和 .mdx 檔案，排除 PROGRESS.md 和已經翻譯好的 *_zh_TW.md/*_zh_TW.mdx
find . -type f \( -name "*.md" -o -name "*.mdx" \) \
    ! -name "PROGRESS.md" \
    ! -name "*_zh_TW.md" \
    ! -name "*_zh_TW.mdx" \
    ! -path "*/node_modules/*" \
    ! -path "*/.git/*" \
    ! -path "*/dist/*" | sed 's|^\./||' | sort
