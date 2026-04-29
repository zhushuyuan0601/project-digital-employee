# Analysis Service

独立的数据分析服务，负责：

- OpenAI 风格聊天接口
- 独立会话 workspace
- 文件上传与预览
- Python 代码执行
- Markdown / PDF 报告导出

## 快速启动

```bash
cd analysis_service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python run.py
```

默认地址：

- `http://127.0.0.1:18900`
- 健康检查：`GET /health`

## 关键环境变量

- `ANALYSIS_SERVICE_HOST`
- `ANALYSIS_SERVICE_PORT`
- `ANALYSIS_WORKSPACE_ROOT`
- `ANALYSIS_DEFAULT_MODEL`
- `ANALYSIS_DEFAULT_API_BASE`
- `ANALYSIS_DEFAULT_API_KEY`
- `ANALYSIS_EXECUTION_TIMEOUT_SEC`
- `ANALYSIS_PDF_ENABLED`

## 说明

- 本服务为一期本机隔离版本，不包含 Docker 沙箱。
- 若缺失 `pandoc` / `xelatex`，PDF 导出会失败，但 Markdown 导出仍可用。
