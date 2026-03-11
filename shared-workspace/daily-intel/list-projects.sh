#!/bin/bash
# 列出所有项目及其中文名称

PROJECTS_DIR="/Users/lihzz/.openclaw/shared-workspace/projects"

echo "==================================="
echo "数字员工团队 - 项目列表"
echo "==================================="
echo ""

for project_dir in "$PROJECTS_DIR"/*/; do
    if [ -d "$project_dir" ]; then
        project_name=$(basename "$project_dir")
        txt_file="$project_dir$project_name.txt"
        
        if [ -f "$txt_file" ]; then
            chinese_name=$(cat "$txt_file")
            echo "📁 $project_name"
            echo "   中文名称：$chinese_name"
        else
            echo "📁 $project_name"
            echo "   中文名称：(未设置)"
        fi
        echo ""
    fi
done

echo "==================================="