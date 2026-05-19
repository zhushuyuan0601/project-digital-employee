# Analysis Service

独立的数据分析服务，负责：

- OpenAI 风格聊天接口
- 独立会话 workspace
- 文件上传与预览
- Python 代码执行
- Markdown / PDF 报告导出

## 分析运行逻辑

分析服务按“模型规划、平台执行”的方式工作，用户不需要复制或粘贴代码：

1. `Analyze`：识别业务问题、数据文件、关键指标和阻塞问题。
2. `Understand`：结合文件画像理解字段、样本规模、缺失率、可关联字段和质量风险。
3. `Code`：模型生成一段自包含 Python 脚本，读取当前会话 workspace 中的相对路径文件，并把图表、表格、报告写入 `generated/`。
4. `Execute`：服务端沙盒自动运行代码，返回真实 stdout/stderr、错误信息和生成物。
5. `Answer`：模型只能基于真实执行结果总结洞察、证据、风险和下一步追问。
6. `File`：平台根据真实生成文件自动挂载图表、表格和报告链接。

如果模型没有遵循标签协议、只返回普通 `python` 代码块，服务会兜底提取最后一个 Python 代码块并自动执行。执行器会拦截 `subprocess`、网络访问、删除文件、危险绝对路径等高风险代码。当前版本仍是本机进程级沙盒；生产环境建议把 `analysis_service` 放入无网络、只读根文件系统的容器中运行。

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
