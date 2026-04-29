<template>
  <div class="analysis-shell">
    <div class="analysis-shell__overlay"></div>

    <header class="analysis-navbar">
      <div class="analysis-navbar__brand">
        <div class="brand-mark">▦</div>
        <div>
          <p class="brand-eyebrow">Data Analysis Console</p>
          <h1>数据分析工作台</h1>
        </div>
      </div>

      <div class="analysis-navbar__status">
        <div class="status-chip">
          <span class="status-chip__dot"></span>
          <span>{{ currentSession ? getStatusLabel(currentSession.status) : '未接入会话' }}</span>
        </div>
        <div class="status-chip status-chip--muted">
          <span>{{ workspaceFiles.length }} 个文件</span>
        </div>
        <div class="status-chip status-chip--muted">
          <span>{{ messages.length }} 条消息</span>
        </div>
        <button class="help-trigger" type="button" @click="showHelpModal = true">
          <span>?</span>
          <span>使用帮助</span>
        </button>
      </div>
    </header>

    <section class="analysis-stage">
      <aside class="workrail">
        <button class="new-session-btn" @click="handleCreateSession">
          <span>＋</span>
          <span>新建会话</span>
        </button>

        <div class="workrail-section">
          <p class="workrail-section__label">当前工作</p>
          <div class="workrail-menu">
            <button class="workrail-menu__item is-active" type="button">
              <span>◉</span>
              <span>分析会话</span>
            </button>
            <button class="workrail-menu__item" type="button" @click="selectedFile && handlePreview(selectedFile)">
              <span>◎</span>
              <span>文件预览</span>
            </button>
          </div>
        </div>

        <div class="workrail-section">
          <div class="workrail-section__head">
            <p class="workrail-section__label">历史记录</p>
            <span>{{ sessions.length }}</span>
          </div>
          <div class="history-list">
            <button
              v-for="session in sessions"
              :key="session.id"
              class="history-item"
              :class="{ 'is-active': session.id === currentSessionId }"
              @click="selectSession(session.id)"
            >
              <div class="history-item__top">
                <strong>{{ session.title }}</strong>
                <span>{{ getStatusLabel(session.status) }}</span>
              </div>
              <p>{{ session.last_user_message || '从这里继续你的分析任务' }}</p>
            </button>
          </div>
        </div>

        <div v-if="currentSession" class="workrail-footer">
          <button class="side-action" @click="handleClearWorkspace">清空 Workspace</button>
          <button class="side-action side-action--danger" @click="handleDeleteSession">删除会话</button>
        </div>
      </aside>

      <main class="analysis-center">
        <div class="analysis-center__header">
          <div>
            <p class="panel-label">Analysis Flow</p>
            <h2>{{ currentSession?.title || '未选择会话' }}</h2>
          </div>
          <button v-if="currentSession" class="header-meta" type="button">
            <span class="header-meta__label">会话 ID</span>
            <span class="header-meta__value">{{ currentSession.id }}</span>
          </button>
        </div>

        <div class="analysis-center__body" ref="messageStreamRef">
          <div v-if="messages.length === 0" class="welcome-state">
            <div class="welcome-state__glyph">◈</div>
            <h3>让分析从一条任务开始</h3>
            <p>上传数据文件后，系统会按结构化链路完成推理、写代码、执行、回看与报告导出。</p>

            <div class="welcome-actions">
              <button class="welcome-card" type="button" @click="applyStarterPrompt('分析这个文件里的关键指标，并用图表展示趋势变化。')">
                <span class="welcome-card__icon">📈</span>
                <strong>趋势洞察</strong>
                <p>适合销售、流量、运营等时间序列数据的快速拆解。</p>
              </button>
              <button class="welcome-card" type="button" @click="applyStarterPrompt('请先理解字段含义，再做异常值检查和数据质量诊断。')">
                <span class="welcome-card__icon">🧪</span>
                <strong>质量诊断</strong>
                <p>先识别脏数据、缺失、异常点，再决定下一步分析方向。</p>
              </button>
              <button class="welcome-card" type="button" @click="applyStarterPrompt('基于当前数据给我一份结论明确、含建议项的分析报告。')">
                <span class="welcome-card__icon">📝</span>
                <strong>报告生成</strong>
                <p>面向业务汇报，直接产出结论、发现和行动建议。</p>
              </button>
            </div>
          </div>

          <div
            v-for="message in messages"
            :key="message.id"
            class="stream-row"
            :class="`stream-row--${message.role}`"
          >
            <div class="stream-presence" :class="`stream-presence--${message.role}`" aria-hidden="true">
              {{ message.role === 'user' ? '你' : 'AI' }}
            </div>
            <article
              class="stream-card"
              :class="`stream-card--${message.role}`"
            >
              <header class="stream-card__head">
                <strong>{{ message.role === 'user' ? '你' : '分析引擎' }}</strong>
                <span>{{ formatTimestamp(message.createdAt) }}</span>
              </header>

              <div v-if="message.role === 'assistant' && parseSections(message.content).length" class="flow-sections">
                <section
                  v-for="(section, index) in parseSections(message.content)"
                  :key="`${message.id}-${section.type}-${index}`"
                  class="flow-section"
                  :class="`flow-section--${section.type.toLowerCase()}`"
                >
                  <div class="flow-section__tag">{{ section.type }}</div>
                  <div v-if="section.type === 'Code' || section.type === 'Execute'" class="flow-section__code">
                    <pre>{{ section.content }}</pre>
                  </div>
                  <div v-else-if="section.type === 'File'" class="flow-section__body flow-section__body--files" v-html="renderMarkdown(section.content)"></div>
                  <div v-else class="flow-section__body" v-html="renderMarkdown(section.content)"></div>
                </section>
              </div>

              <div v-else class="stream-card__body" v-html="renderMarkdown(message.content)"></div>
            </article>
          </div>
        </div>

        <div class="analysis-composer">
          <div class="analysis-composer__toolbar">
            <label class="tool-pill tool-pill--file">
              <input type="file" multiple hidden @change="handleUpload" />
              <span>上传文件</span>
            </label>
            <button class="tool-pill" type="button" :disabled="!currentSessionId || exporting === 'md'" @click="handleExport('md')">
              <span>{{ exporting === 'md' ? '导出中' : '导出 MD' }}</span>
            </button>
            <button class="tool-pill" type="button" :disabled="!currentSessionId || exporting === 'pdf'" @click="handleExport('pdf')">
              <span>{{ exporting === 'pdf' ? '导出中' : '导出 PDF' }}</span>
            </button>
          </div>

          <div class="composer-box">
            <div class="runtime-bar">
              <div class="config-selector">
                <select v-model="activeConfigId" class="config-selector__select" @change="applyActiveConfig">
                  <option value="" disabled>选择模型配置</option>
                  <option v-for="cfg in modelConfigs" :key="cfg.id" :value="cfg.id">
                    {{ cfg.name }} · {{ cfg.model }}
                  </option>
                </select>
                <button class="config-selector__manage" type="button" @click="openConfigModal">
                  <span>配置</span>
                </button>
              </div>
              <div v-if="activeConfig" class="config-summary">
                <span class="config-summary__tag">{{ activeConfig.apiBase || '未设置 Base' }}</span>
                <span class="config-summary__tag">{{ activeConfig.model }}</span>
              </div>
            </div>

            <div class="composer-input">
              <textarea
                v-model="draft"
                class="composer-input__textarea"
                :placeholder="awaitingClarification ? '模型正在等待你的补充说明…' : '输入分析问题，Enter 发送，Shift+Enter 换行'"
                rows="4"
                @keydown.enter.exact.prevent="handleSend"
              />
              <button class="send-trigger" :disabled="sending || !draft.trim() || !currentSessionId" @click="handleSend">
                <span>{{ sending ? '…' : '↗' }}</span>
              </button>
            </div>

            <div class="composer-footnote">
              <span>{{ awaitingClarification ? '上一轮输出了 <Ask>，继续回复即可接着分析。' : '支持结构化分析、代码执行、生成物回挂与报告导出。' }}</span>
            </div>
          </div>
        </div>
      </main>

      <aside class="assetrail">
        <div class="assetrail__header">
          <div>
            <p class="panel-label">Workspace Assets</p>
            <h2>文件与产物</h2>
          </div>
          <div class="assetrail__stats">
            <span>{{ sourceFiles.length }} 源文件</span>
            <span>{{ generatedFiles.length }} 生成物</span>
          </div>
        </div>

        <div class="assetrail__segments">
          <div class="asset-chip">
            <strong>{{ workspaceFiles.length }}</strong>
            <span>全部文件</span>
          </div>
          <div class="asset-chip">
            <strong>{{ tableFiles.length }}</strong>
            <span>表格/数据库</span>
          </div>
          <div class="asset-chip">
            <strong>{{ imageFiles.length }}</strong>
            <span>图表图片</span>
          </div>
        </div>

        <div class="assetrail__list">
          <button
            v-for="file in workspaceFiles"
            :key="file.path"
            class="asset-item"
            :class="{ 'is-active': selectedFile?.path === file.path }"
            @click="handlePreview(file)"
          >
            <div class="asset-item__copy">
              <strong>{{ file.name }}</strong>
              <span>{{ formatFileMeta(file) }}</span>
            </div>
            <span class="asset-item__badge" :class="{ 'is-generated': file.is_generated }">
              {{ file.is_generated ? '生成物' : '源文件' }}
            </span>
          </button>
        </div>

        <div class="assetrail__preview">
          <div v-if="selectedFile" class="preview-sheet">
            <div class="preview-sheet__head">
              <div>
                <strong>{{ selectedFile.name }}</strong>
                <span>{{ selectedFile.path }}</span>
              </div>
              <div class="preview-sheet__actions">
                <a class="mini-action" :href="analysisDownloadUrl(selectedFile.path)" target="_blank" rel="noreferrer">下载</a>
                <button class="mini-action mini-action--danger" @click="handleDeleteFile(selectedFile.path)">删除</button>
              </div>
            </div>

            <div v-if="previewLoading" class="preview-state">加载预览中…</div>
            <div v-else-if="previewError" class="preview-state preview-state--error">{{ previewError }}</div>
            <div v-else-if="preview.kind === 'table' || preview.kind === 'database'" class="preview-grid">
              <table>
                <thead>
                  <tr>
                    <th v-for="column in preview.columns || []" :key="column">{{ column }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, rowIndex) in preview.rows || []" :key="rowIndex">
                    <td v-for="(cell, cellIndex) in row" :key="cellIndex">{{ cell }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else-if="preview.kind === 'image'" class="preview-figure">
              <img :src="analysisDownloadUrl(selectedFile.path)" :alt="selectedFile.name" />
            </div>
            <div v-else-if="preview.kind === 'text'" class="preview-rich" v-html="renderMarkdown(preview.content || '')"></div>
            <div v-else class="preview-state">{{ preview.content || '该文件暂无结构化预览。' }}</div>
          </div>

          <div v-else class="empty-assets">
            <div class="empty-assets__icon">☰</div>
            <strong>选择文件开始预览</strong>
            <p>右侧会聚焦当前会话的上传文件、图表、报告与其他生成物。</p>
          </div>
        </div>
      </aside>
    </section>

    <!-- Model Config Modal -->
    <Teleport to="body">
      <div v-if="showConfigModal" class="cfg-modal-overlay" @click.self="closeConfigModal">
        <div class="cfg-modal">
          <header class="cfg-modal__header">
            <h2>模型配置管理</h2>
            <button class="cfg-modal__close" type="button" @click="closeConfigModal">&times;</button>
          </header>

          <div class="cfg-modal__body">
            <!-- Config List -->
            <div class="cfg-list">
              <div class="cfg-list__head">
                <span>已保存的配置</span>
                <button class="cfg-list__add" type="button" @click="startNewConfig">+ 新增</button>
              </div>
              <div v-if="modelConfigs.length === 0" class="cfg-list__empty">暂无配置，请新增一个。</div>
              <div
                v-for="cfg in modelConfigs"
                :key="cfg.id"
                class="cfg-list__item"
                :class="{ 'is-editing': editingConfig?.id === cfg.id }"
              >
                <div class="cfg-list__info">
                  <strong>{{ cfg.name }}</strong>
                  <span>{{ cfg.model }} · {{ cfg.apiBase || '默认' }}</span>
                </div>
                <div class="cfg-list__actions">
                  <button type="button" @click="editConfig(cfg)">编辑</button>
                  <button type="button" class="cfg-list__del" @click="deleteConfig(cfg.id)">删除</button>
                </div>
              </div>
            </div>

            <!-- Config Form -->
            <div v-if="editingConfig" class="cfg-form">
              <h3>{{ editingConfig._isNew ? '新增配置' : '编辑配置' }}</h3>
              <label class="cfg-form__field">
                <span>配置名称</span>
                <input v-model="editingConfig.name" type="text" placeholder="如：GPT-4o、DeepSeek" />
              </label>
              <label class="cfg-form__field">
                <span>API Base URL</span>
                <input v-model="editingConfig.apiBase" type="text" placeholder="http://127.0.0.1:8000/v1" />
              </label>
              <label class="cfg-form__field">
                <span>API Key</span>
                <input v-model="editingConfig.apiKey" type="password" placeholder="可选，留空表示无需鉴权" />
              </label>
              <label class="cfg-form__field">
                <span>Model</span>
                <input v-model="editingConfig.model" type="text" placeholder="gpt-4o-mini" />
              </label>

              <div class="cfg-form__footer">
                <button class="cfg-form__btn cfg-form__btn--test" type="button" :disabled="testing" @click="testConfig">
                  {{ testing ? '测试中…' : '连接测试' }}
                </button>
                <span v-if="testResult" :class="['cfg-form__test-result', testResult.ok ? 'is-ok' : 'is-fail']">
                  {{ testResult.ok ? `连接成功 ${testResult.ms}ms${testResult.statusNote || ''}` : `失败: ${testResult.error}` }}
                </span>
                <div class="cfg-form__spacer"></div>
                <button class="cfg-form__btn" type="button" @click="cancelEdit">取消</button>
                <button class="cfg-form__btn cfg-form__btn--primary" type="button" @click="saveConfig">保存</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Help Modal -->
    <Teleport to="body">
      <div v-if="showHelpModal" class="help-overlay" @click.self="showHelpModal = false">
        <div class="help-modal">
          <header class="help-modal__header">
            <h2>数据分析工作台 · 使用手册</h2>
            <button class="help-modal__close" type="button" @click="showHelpModal = false">&times;</button>
          </header>

          <div class="help-modal__body">
            <nav class="help-toc">
              <a v-for="s in helpSections" :key="s.id" :href="`#${s.id}`" class="help-toc__link" @click.prevent="scrollHelpTo(s.id)">{{ s.title }}</a>
            </nav>

            <div class="help-content" ref="helpContentRef">
              <!-- Overview -->
              <section :id="helpSections[0].id" class="help-section">
                <h3>{{ helpSections[0].title }}</h3>
                <p>数据分析工作台是一个<strong>对话式数据分析环境</strong>。上传数据文件，用自然语言描述需求，AI 自动完成数据理解、代码编写、执行、图表生成和报告导出。</p>
                <div class="help-overview-grid">
                  <div class="help-overview-card"><span class="help-overview-card__icon">📂</span><strong>上传数据</strong><p>CSV、Excel、JSON、SQLite 等</p></div>
                  <div class="help-overview-card"><span class="help-overview-card__icon">💬</span><strong>自然语言对话</strong><p>像和分析师聊天一样描述需求</p></div>
                  <div class="help-overview-card"><span class="help-overview-card__icon">⚙️</span><strong>自动执行</strong><p>AI 编写 Python 代码并运行</p></div>
                  <div class="help-overview-card"><span class="help-overview-card__icon">📊</span><strong>产出报告</strong><p>图表、表格、Markdown / PDF</p></div>
                </div>
              </section>

              <!-- Quick Start -->
              <section :id="helpSections[1].id" class="help-section">
                <h3>{{ helpSections[1].title }}</h3>
                <div class="help-step"><div class="help-step__num">1</div><div class="help-step__body"><strong>配置模型连接</strong><p>点击底部输入区左侧的 <code>配置</code> 按钮，新增一个模型配置：</p><div class="help-code-block"><div><span class="help-k">配置名称：</span>DashScope</div><div><span class="help-k">API Base URL：</span>https://coding.dashscope.aliyuncs.com/v1</div><div><span class="help-k">API Key：</span>你的密钥</div><div><span class="help-k">Model：</span>qwen3.6-plus</div></div><p>点击 <code>连接测试</code> 确认可达后，点击 <code>保存</code>。</p></div></div>
                <div class="help-step"><div class="help-step__num">2</div><div class="help-step__body"><strong>新建会话并上传文件</strong><p>点击左侧面板的 <code>＋ 新建会话</code>，然后点击底部工具栏的 <code>上传文件</code>，选择你的数据文件（支持 CSV、XLSX、JSON、Parquet、SQLite 等）。<span class="help-tip-inline">可一次选择多个文件。</span></p></div></div>
                <div class="help-step"><div class="help-step__num">3</div><div class="help-step__body"><strong>输入分析需求</strong><p>在底部文本框中用自然语言描述你想做什么，按 Enter 发送。AI 自动理解数据结构、编写代码并执行。</p></div></div>
                <div class="help-step"><div class="help-step__num">4</div><div class="help-step__body"><strong>查看结果</strong><p>分析结果以结构化卡片展示（理解 → 代码 → 执行 → 结论）。右侧文件面板实时显示生成的图表和报告，点击可预览。</p></div></div>
                <div class="help-step"><div class="help-step__num">5</div><div class="help-step__body"><strong>导出报告</strong><p>点击 <code>导出 MD</code> 或 <code>导出 PDF</code>，基于当前对话上下文生成完整分析报告。</p></div></div>
              </section>

              <!-- Cases -->
              <section :id="helpSections[2].id" class="help-section">
                <h3>{{ helpSections[2].title }}</h3>

                <div class="help-case">
                  <div class="help-case__header"><span class="help-case__tag">案例一</span><strong>销售数据趋势分析</strong></div>
                  <div class="help-step"><div class="help-step__num">1</div><div class="help-step__body"><strong>上传文件</strong><p>上传 <code>sales_2024.csv</code>，包含列：<code>日期, 产品, 区域, 销量, 金额</code></p></div></div>
                  <div class="help-step"><div class="help-step__num">2</div><div class="help-step__body"><strong>发送第一轮对话</strong><div class="help-prompt">分析这个文件里的关键指标，用图表展示月度销售趋势变化。</div><p>AI 自动：读取 CSV → 统计月度汇总 → 绘制折线图 → 给出趋势结论</p></div></div>
                  <div class="help-step"><div class="help-step__num">3</div><div class="help-step__body"><strong>追问深挖</strong><div class="help-prompt">哪个区域增长最快？请做区域对比分析。</div><div class="help-prompt">找出销量下降最明显的产品，分析可能原因。</div></div></div>
                  <div class="help-step"><div class="help-step__num">4</div><div class="help-step__body"><strong>导出报告</strong><p>点击 <code>导出 MD</code>，获得包含图表和结论的完整分析报告。</p></div></div>
                </div>

                <div class="help-case">
                  <div class="help-case__header"><span class="help-case__tag">案例二</span><strong>数据质量诊断</strong></div>
                  <div class="help-step"><div class="help-step__num">1</div><div class="help-step__body"><strong>上传文件</strong><p>上传一份可能存在数据问题的文件，如 <code>user_data.xlsx</code></p></div></div>
                  <div class="help-step"><div class="help-step__num">2</div><div class="help-step__body"><strong>发送诊断请求</strong><div class="help-prompt">请先理解字段含义，再做异常值检查和数据质量诊断。</div><p>AI 自动：分析每列含义 → 检测缺失值 → 发现异常值 → 输出质量报告</p></div></div>
                  <div class="help-step"><div class="help-step__num">3</div><div class="help-step__body"><strong>修复建议</strong><div class="help-prompt">针对发现的问题，给出数据清洗方案并执行。</div></div></div>
                </div>

                <div class="help-case">
                  <div class="help-case__header"><span class="help-case__tag">案例三</span><strong>自动生成分析报告</strong></div>
                  <div class="help-step"><div class="help-step__num">1</div><div class="help-step__body"><strong>上传文件后直接请求报告</strong><div class="help-prompt">基于当前数据给我一份结论明确、含建议项的分析报告。</div><p>AI 全流程：数据概览 → 关键发现 → 图表佐证 → 行动建议</p></div></div>
                  <div class="help-step"><div class="help-step__num">2</div><div class="help-step__body"><strong>导出为 PDF</strong><p>点击 <code>导出 PDF</code> 获得可直接用于汇报的文档。</p></div></div>
                </div>
              </section>

              <!-- FAQ -->
              <section :id="helpSections[3].id" class="help-section">
                <h3>{{ helpSections[3].title }}</h3>
                <div class="help-faq">
                  <div class="help-faq__item"><strong>Q: 连接测试失败怎么办？</strong><p>确认 API Base URL 是否正确（需包含 <code>/v1</code>），API Key 是否有效。如果是自建服务，确认服务是否已启动。</p></div>
                  <div class="help-faq__item"><strong>Q: 分析过程中出现错误？</strong><p>AI 会自动尝试修复代码错误。如果反复失败，用更具体的描述重新提问，或检查数据文件格式。</p></div>
                  <div class="help-faq__item"><strong>Q: 支持哪些文件格式？</strong><p>CSV、TSV、Excel（.xlsx/.xls）、JSON、Parquet、SQLite。建议单文件不超过 50MB。</p></div>
                  <div class="help-faq__item"><strong>Q: 对话中的代码安全吗？</strong><p>代码在服务器本地 Python 环境中执行。请注意不要上传包含敏感信息的数据。</p></div>
                  <div class="help-faq__item"><strong>Q: 如何切换模型？</strong><p>在底部配置下拉框中选择已保存的其他配置即可。</p></div>
                  <div class="help-faq__item"><strong>Q: PDF 导出失败？</strong><p>PDF 导出依赖服务器上的 <code>pandoc</code> 和 <code>xelatex</code>。缺失时系统自动回退为 Markdown。</p></div>
                </div>
              </section>

              <!-- Tips -->
              <section :id="helpSections[4].id" class="help-section">
                <h3>{{ helpSections[4].title }}</h3>
                <div class="help-tips-grid">
                  <div class="help-tip-card"><strong>具体描述优于模糊</strong><p>"按月统计销售额并画折线图" 比 "分析一下数据" 效果好得多。</p></div>
                  <div class="help-tip-card"><strong>分步骤提问</strong><p>先让 AI 理解数据，再做分析，最后要报告。一步步来比一次全要效果好。</p></div>
                  <div class="help-tip-card"><strong>善用追问</strong><p>AI 回复后可以继续追问细节，它会基于上下文深入分析。</p></div>
                  <div class="help-tip-card"><strong>关注 &lt;Ask&gt; 标签</strong><p>如果 AI 回复中出现 <code>&lt;Ask&gt;</code>，说明它需要你补充信息，直接回复即可。</p></div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import MarkdownIt from 'markdown-it'
import {
  clearAnalysisWorkspace,
  createAnalysisSession,
  deleteAnalysisFile,
  deleteAnalysisSession,
  exportAnalysisReport,
  getAnalysisState,
  listAnalysisFiles,
  listAnalysisSessions,
  patchAnalysisSession,
  previewAnalysisFile,
  streamAnalysisChat,
  uploadAnalysisFiles,
  type AnalysisSession,
  type WorkspaceFile,
} from '@/api/analysis'
import { useNotification } from '@/composables/useNotification'

type MessageRole = 'user' | 'assistant'

interface UIMessage {
  id: string
  role: MessageRole
  content: string
  createdAt: number
}

interface ParsedSection {
  type: string
  content: string
}

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
})

const notification = useNotification()

const sessions = ref<AnalysisSession[]>([])
const currentSessionId = ref('')
const workspaceFiles = ref<WorkspaceFile[]>([])
const selectedFile = ref<WorkspaceFile | null>(null)
const preview = ref<any>({ kind: '', content: '' })
const previewLoading = ref(false)
const previewError = ref('')
const messages = ref<UIMessage[]>([])
const draft = ref('')
const sending = ref(false)
const exporting = ref<'md' | 'pdf' | null>(null)
const messageStreamRef = ref<HTMLElement | null>(null)

// ─── Help Modal ─────────────────────────────────────────
const showHelpModal = ref(false)
const helpContentRef = ref<HTMLElement | null>(null)
const helpSections = [
  { id: 'help-overview', title: '功能概览' },
  { id: 'help-quickstart', title: '快速开始' },
  { id: 'help-cases', title: '实战案例' },
  { id: 'help-faq', title: '常见问题' },
  { id: 'help-tips', title: '使用技巧' },
]

function scrollHelpTo(id: string) {
  const el = helpContentRef.value?.querySelector(`#${id}`)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

// ─── Model Config Management ────────────────────────────
interface ModelConfig {
  id: string
  name: string
  apiBase: string
  apiKey: string
  model: string
}

const STORAGE_KEY = 'analysis.modelConfigs'
const ACTIVE_KEY = 'analysis.activeConfigId'

const modelConfigs = ref<ModelConfig[]>([])
const activeConfigId = ref('')
const showConfigModal = ref(false)
const editingConfig = ref<(Partial<ModelConfig> & { _isNew?: boolean }) | null>(null)
const testing = ref(false)
const testResult = ref<{ ok: boolean; ms?: number; error?: string; statusNote?: string } | null>(null)

const activeConfig = computed(() => modelConfigs.value.find((c) => c.id === activeConfigId.value) || null)

function loadConfigs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    modelConfigs.value = raw ? JSON.parse(raw) : []
  } catch {
    modelConfigs.value = []
  }
  activeConfigId.value = localStorage.getItem(ACTIVE_KEY) || ''
  if (activeConfigId.value && !modelConfigs.value.find((c) => c.id === activeConfigId.value)) {
    activeConfigId.value = ''
  }
}

function persistConfigs() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(modelConfigs.value))
  localStorage.setItem(ACTIVE_KEY, activeConfigId.value)
}

watch(modelConfigs, persistConfigs, { deep: true })
watch(activeConfigId, persistConfigs)

function applyActiveConfig() {
  persistConfigs()
}

function openConfigModal() {
  showConfigModal.value = true
  editingConfig.value = null
  testResult.value = null
}

function closeConfigModal() {
  showConfigModal.value = false
  editingConfig.value = null
  testResult.value = null
}

function startNewConfig() {
  editingConfig.value = {
    id: '',
    name: '',
    apiBase: '',
    apiKey: '',
    model: 'gpt-4o-mini',
    _isNew: true,
  }
  testResult.value = null
}

function editConfig(cfg: ModelConfig) {
  editingConfig.value = { ...cfg, _isNew: false }
  testResult.value = null
}

function cancelEdit() {
  editingConfig.value = null
  testResult.value = null
}

function saveConfig() {
  if (!editingConfig.value) return
  const cfg = editingConfig.value
  if (!cfg.name?.trim()) {
    notification.error('请填写配置名称')
    return
  }

  if (cfg._isNew) {
    const newCfg: ModelConfig = {
      id: `mc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: cfg.name.trim(),
      apiBase: cfg.apiBase?.trim() || '',
      apiKey: cfg.apiKey?.trim() || '',
      model: cfg.model?.trim() || 'gpt-4o-mini',
    }
    modelConfigs.value.push(newCfg)
    activeConfigId.value = newCfg.id
  } else {
    const idx = modelConfigs.value.findIndex((c) => c.id === cfg.id)
    if (idx !== -1) {
      modelConfigs.value[idx] = {
        id: cfg.id!,
        name: cfg.name.trim(),
        apiBase: cfg.apiBase?.trim() || '',
        apiKey: cfg.apiKey?.trim() || '',
        model: cfg.model?.trim() || 'gpt-4o-mini',
      }
    }
  }
  editingConfig.value = null
  testResult.value = null
  notification.success('配置已保存')
}

function deleteConfig(id: string) {
  modelConfigs.value = modelConfigs.value.filter((c) => c.id !== id)
  if (activeConfigId.value === id) {
    activeConfigId.value = modelConfigs.value[0]?.id || ''
  }
  if (editingConfig.value?.id === id) {
    editingConfig.value = null
    testResult.value = null
  }
}

async function testConfig() {
  if (!editingConfig.value) return
  const { apiBase, apiKey } = editingConfig.value
  if (!apiBase?.trim()) {
    testResult.value = { ok: false, error: '请填写 API Base URL' }
    return
  }

  testing.value = true
  testResult.value = null
  try {
    const res = await fetch('/api/analysis/test-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_base: apiBase.trim(), api_key: apiKey?.trim() || '' }),
    })
    const text = await res.text()
    let data: any
    try {
      data = text ? JSON.parse(text) : {}
    } catch {
      testResult.value = { ok: false, error: text.slice(0, 120) || `HTTP ${res.status}` }
      return
    }
    if (data.ok) {
      const statusNote = data.status && data.status !== 200 ? ` (HTTP ${data.status})` : ''
      testResult.value = { ok: true, ms: data.ms, statusNote }
    } else {
      testResult.value = { ok: false, error: data.error || `HTTP ${res.status}` }
    }
  } catch (err) {
    testResult.value = { ok: false, error: (err as Error).message || '连接失败' }
  } finally {
    testing.value = false
  }
}

const currentSession = computed(() => sessions.value.find((item) => item.id === currentSessionId.value) || null)
const awaitingClarification = computed(() => {
  const lastAssistant = [...messages.value].reverse().find((message) => message.role === 'assistant')
  if (!lastAssistant) return false
  const sections = parseSections(lastAssistant.content)
  return sections.length > 0 && sections[sections.length - 1]?.type === 'Ask'
})
const sourceFiles = computed(() => workspaceFiles.value.filter((item) => !item.is_generated))
const generatedFiles = computed(() => workspaceFiles.value.filter((item) => item.is_generated))
const tableFiles = computed(() => workspaceFiles.value.filter((item) => item.category === 'table'))
const imageFiles = computed(() => workspaceFiles.value.filter((item) => item.category === 'image'))

function formatTimestamp(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString('zh-CN', { hour12: false })
}

function formatFileMeta(file: WorkspaceFile) {
  const sizeKb = `${(file.size / 1024).toFixed(1)} KB`
  const category = file.category === 'table' ? '表格' : file.category === 'image' ? '图片' : '文档'
  return `${category} · ${sizeKb}`
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    idle: '待命',
    running: '运行中',
    error: '异常',
  }
  return labels[status] || status
}

function renderMarkdown(content: string) {
  return md.render(content || '')
}

function parseSections(content: string): ParsedSection[] {
  const pattern = /<(Analyze|Understand|Code|Execute|Ask|Answer|File)>([\s\S]*?)<\/\1>/g
  const sections: ParsedSection[] = []
  let match: RegExpExecArray | null
  while ((match = pattern.exec(content)) !== null) {
    sections.push({ type: match[1], content: (match[2] || '').trim() })
  }
  return sections
}

function analysisDownloadUrl(path: string) {
  return `/api/analysis/workspace/download?session_id=${encodeURIComponent(currentSessionId.value)}&path=${encodeURIComponent(path)}`
}

function applyStarterPrompt(prompt: string) {
  draft.value = prompt
}

async function refreshSessions(selectLatest = false) {
  const response = await listAnalysisSessions()
  sessions.value = response.sessions
  if (selectLatest && sessions.value.length > 0) {
    await selectSession(sessions.value[0].id)
  }
}

async function refreshWorkspace() {
  if (!currentSessionId.value) return
  try {
    const response = await listAnalysisFiles(currentSessionId.value)
    workspaceFiles.value = response.files
    if (selectedFile.value) {
      const latest = workspaceFiles.value.find((item) => item.path === selectedFile.value?.path)
      if (!latest) {
        selectedFile.value = null
        preview.value = { kind: '', content: '' }
        previewError.value = ''
      }
    }
  } catch {
    workspaceFiles.value = []
  }
}

async function refreshState() {
  if (!currentSessionId.value) return
  try {
    const state = await getAnalysisState(currentSessionId.value)
    messages.value = (state.messages || []).map((message, index) => ({
      id: `${currentSessionId.value}-${index}`,
      role: message.role,
      content: message.content,
      createdAt: Date.now() + index,
    }))
  } catch {
    messages.value = []
  }
}

async function selectSession(sessionId: string) {
  currentSessionId.value = sessionId
  await Promise.all([refreshState(), refreshWorkspace()])
  await nextTick()
  messageStreamRef.value?.scrollTo({ top: messageStreamRef.value.scrollHeight, behavior: 'smooth' })
}

async function handleCreateSession() {
  try {
    const response = await createAnalysisSession({ model: activeConfig.value?.model })
    await refreshSessions()
    await selectSession(response.session.id)
    notification.success('已创建新的分析会话')
  } catch (error) {
    notification.error((error as Error).message)
  }
}

async function handleDeleteSession() {
  if (!currentSession.value) return
  const confirmed = await notification.confirm(`删除会话「${currentSession.value.title}」？`)
  if (!confirmed) return
  try {
    await deleteAnalysisSession(currentSession.value.id)
    messages.value = []
    workspaceFiles.value = []
    selectedFile.value = null
    preview.value = { kind: '', content: '' }
    previewError.value = ''
    currentSessionId.value = ''
    await refreshSessions()
    if (sessions.value[0]) {
      await selectSession(sessions.value[0].id)
    }
    notification.success('会话已删除')
  } catch (error) {
    notification.error((error as Error).message)
  }
}

async function handleClearWorkspace() {
  if (!currentSessionId.value) return
  const confirmed = await notification.confirm('清空当前 workspace 会删除已上传文件和生成物，是否继续？')
  if (!confirmed) return
  try {
    await clearAnalysisWorkspace(currentSessionId.value)
    messages.value = []
    workspaceFiles.value = []
    selectedFile.value = null
    preview.value = { kind: '', content: '' }
    previewError.value = ''
    notification.success('Workspace 已清空')
  } catch (error) {
    notification.error((error as Error).message)
  }
}

async function handleUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files || [])
  if (!files.length || !currentSessionId.value) return
  try {
    await uploadAnalysisFiles(currentSessionId.value, files)
    await refreshWorkspace()
    notification.success(`已上传 ${files.length} 个文件`)
  } catch (error) {
    notification.error((error as Error).message)
  } finally {
    input.value = ''
  }
}

async function handlePreview(file: WorkspaceFile) {
  selectedFile.value = file
  previewLoading.value = true
  previewError.value = ''
  try {
    preview.value = await previewAnalysisFile(currentSessionId.value, file.path)
  } catch (error) {
    preview.value = { kind: '', content: '' }
    previewError.value = (error as Error).message
  } finally {
    previewLoading.value = false
  }
}

async function handleDeleteFile(path: string) {
  if (!currentSessionId.value) return
  const confirmed = await notification.confirm(`删除文件 ${path}？`)
  if (!confirmed) return
  try {
    await deleteAnalysisFile(currentSessionId.value, path)
    await refreshWorkspace()
    if (selectedFile.value?.path === path) {
      selectedFile.value = null
      preview.value = { kind: '', content: '' }
      previewError.value = ''
    }
    notification.success('文件已删除')
  } catch (error) {
    notification.error((error as Error).message)
  }
}

async function handleExport(format: 'md' | 'pdf') {
  if (!currentSessionId.value) return
  exporting.value = format
  try {
    const payload = await exportAnalysisReport({ session_id: currentSessionId.value, format })
    const file = payload?.file || payload?.fallback?.file
    if (file?.download_url) {
      window.open(`/api/analysis${file.download_url}`, '_blank', 'noopener,noreferrer')
    }
    if (payload.success) {
      notification.success(`${format.toUpperCase()} 报告已生成`)
    } else if (payload.fallback?.file) {
      notification.warning(`PDF 导出失败，已回退到 Markdown：${payload.error || '依赖缺失'}`)
    } else {
      notification.error(payload.error || '导出失败')
    }
    await refreshWorkspace()
  } catch (error) {
    notification.error((error as Error).message)
  } finally {
    exporting.value = null
  }
}

async function handleSend() {
  if (!draft.value.trim() || !currentSessionId.value || sending.value) return
  const prompt = draft.value.trim()
  const userMessage: UIMessage = {
    id: `${currentSessionId.value}-user-${Date.now()}`,
    role: 'user',
    content: prompt,
    createdAt: Date.now(),
  }
  const assistantMessage: UIMessage = {
    id: `${currentSessionId.value}-assistant-${Date.now()}`,
    role: 'assistant',
    content: '',
    createdAt: Date.now(),
  }
  const requestMessages = [...messages.value, userMessage].map((item) => ({ role: item.role, content: item.content }))
  messages.value.push(userMessage, assistantMessage)
  draft.value = ''
  sending.value = true

  if (currentSession.value && currentSession.value.title === '未命名分析会话') {
    const derivedTitle = prompt.slice(0, 32)
    await patchAnalysisSession(currentSession.value.id, { title: derivedTitle || currentSession.value.title })
    await refreshSessions()
  }

  try {
    await streamAnalysisChat(
      {
        session_id: currentSessionId.value,
        stream: true,
        model: activeConfig.value?.model || '',
        api_base: activeConfig.value?.apiBase || '',
        api_key: activeConfig.value?.apiKey || '',
        messages: requestMessages,
      },
      async (chunk) => {
        if (chunk.content) {
          assistantMessage.content += chunk.content
        }
        if (chunk.done) {
          sending.value = false
          await refreshSessions()
          await refreshWorkspace()
        }
        await nextTick()
        messageStreamRef.value?.scrollTo({ top: messageStreamRef.value.scrollHeight, behavior: 'smooth' })
      },
    )
  } catch (error) {
    assistantMessage.content += `\n<Answer>\n分析请求失败：${(error as Error).message}\n</Answer>`
    notification.error((error as Error).message)
  } finally {
    sending.value = false
  }
}

onMounted(async () => {
  loadConfigs()
  try {
    const sessionResponse = await listAnalysisSessions()
    sessions.value = sessionResponse.sessions
    if (sessions.value[0]) {
      await selectSession(sessions.value[0].id)
    } else {
      await handleCreateSession()
    }
  } catch (error) {
    notification.error((error as Error).message)
  }
})
</script>

<style scoped>
.analysis-shell {
  --analysis-bg: #0b0f19;
  --analysis-card: rgba(21, 27, 43, 0.72);
  --analysis-card-strong: rgba(30, 38, 56, 0.94);
  --analysis-border: rgba(148, 163, 184, 0.18);
  --analysis-soft: #94a3b8;
  --analysis-main: #f8fafc;
  --analysis-blue: #3b82f6;
  --analysis-blue-strong: #2563eb;
  --analysis-green: #10b981;
  --analysis-danger: #fb7185;
  position: relative;
  min-height: calc(100vh - 24px);
  padding: 18px;
  overflow: hidden;
  background:
    radial-gradient(circle at top right, rgba(59, 130, 246, 0.2), transparent 25%),
    radial-gradient(circle at bottom left, rgba(16, 185, 129, 0.12), transparent 20%),
    linear-gradient(180deg, #0b0f19, #0f172a 52%, #0a1221);
}

.analysis-shell__overlay {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.02), transparent 34%),
    radial-gradient(circle at 20% 12%, rgba(255, 255, 255, 0.03), transparent 20%);
  pointer-events: none;
}

.analysis-navbar,
.workrail,
.analysis-center,
.assetrail {
  position: relative;
  z-index: 1;
  background: var(--analysis-card);
  backdrop-filter: blur(18px);
  border: 1px solid var(--analysis-border);
  box-shadow: 0 22px 60px rgba(0, 0, 0, 0.25);
}

.analysis-navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 16px 22px;
  border-radius: 18px;
}

.analysis-navbar__brand {
  display: flex;
  align-items: center;
  gap: 14px;
}

.brand-mark {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--analysis-blue), #60a5fa);
  color: white;
  font-size: 20px;
  font-weight: 700;
}

.brand-eyebrow,
.panel-label,
.workrail-section__label {
  margin: 0 0 6px;
  color: var(--analysis-soft);
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.analysis-navbar h1,
.analysis-center__header h2,
.assetrail__header h2 {
  margin: 0;
  color: var(--analysis-main);
  font-size: 18px;
  font-weight: 600;
}

.analysis-navbar__status {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.status-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(59, 130, 246, 0.12);
  color: #bfdbfe;
  font-size: 12px;
}

.status-chip--muted {
  background: rgba(255, 255, 255, 0.05);
  color: var(--analysis-soft);
}

.status-chip__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--analysis-green);
  box-shadow: 0 0 0 5px rgba(16, 185, 129, 0.12);
}

.analysis-stage {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr) 320px;
  gap: 20px;
  margin-top: 18px;
  min-height: calc(100vh - 150px);
}

.workrail,
.assetrail {
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-radius: 18px;
  padding: 16px;
}

.new-session-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 12px 14px;
  border: 0;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--analysis-blue), var(--analysis-blue-strong));
  color: white;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.workrail-section {
  margin-top: 22px;
}

.workrail-section__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
  color: var(--analysis-soft);
}

.workrail-menu,
.history-list,
.assetrail__list {
  display: grid;
  gap: 8px;
}

.workrail-menu__item,
.history-item,
.asset-item {
  width: 100%;
  border: 1px solid transparent;
  background: rgba(255, 255, 255, 0.03);
  color: var(--analysis-soft);
  text-align: left;
  cursor: pointer;
  transition: 0.2s ease;
}

.workrail-menu__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 12px;
  border-radius: 10px;
  font: inherit;
}

.workrail-menu__item.is-active,
.history-item.is-active,
.asset-item.is-active {
  border-color: rgba(59, 130, 246, 0.36);
  background: rgba(59, 130, 246, 0.12);
  color: var(--analysis-main);
}

.history-item,
.asset-item {
  display: grid;
  gap: 8px;
  padding: 12px 13px;
  border-radius: 12px;
}

.history-item__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.history-item strong,
.asset-item strong {
  color: var(--analysis-main);
  font-size: 14px;
}

.history-item p,
.asset-item span,
.assetrail__stats span,
.workrail-footer {
  color: var(--analysis-soft);
  font-size: 12px;
  line-height: 1.5;
}

.workrail-footer {
  display: grid;
  gap: 10px;
  margin-top: auto;
  padding-top: 18px;
}

.side-action,
.tool-pill,
.mini-action,
.header-meta {
  border: 1px solid var(--analysis-border);
  background: rgba(255, 255, 255, 0.03);
  color: var(--analysis-main);
  font: inherit;
}

.side-action {
  padding: 10px 12px;
  border-radius: 10px;
  cursor: pointer;
}

.side-action--danger,
.mini-action--danger {
  color: #fecdd3;
  border-color: rgba(251, 113, 133, 0.26);
}

.analysis-center {
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-radius: 20px;
  overflow: hidden;
}

.analysis-center__header,
.assetrail__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 22px;
  border-bottom: 1px solid var(--analysis-border);
}

.header-meta {
  display: grid;
  gap: 2px;
  min-width: 180px;
  padding: 10px 12px;
  border-radius: 12px;
  text-align: left;
}

.header-meta__label {
  color: var(--analysis-soft);
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.header-meta__value {
  font-size: 12px;
  color: var(--analysis-main);
}

.analysis-center__body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 24px;
  background:
    linear-gradient(180deg, rgba(8, 14, 26, 0.84), rgba(8, 14, 26, 0.97)),
    radial-gradient(circle at top center, rgba(59, 130, 246, 0.07), transparent 26%);
}

.welcome-state {
  display: grid;
  justify-items: center;
  text-align: center;
  gap: 12px;
  max-width: 760px;
  margin: 42px auto 0;
}

.welcome-state__glyph {
  font-size: 54px;
  color: #93c5fd;
}

.welcome-state h3 {
  margin: 0;
  font-size: 28px;
  color: var(--analysis-main);
}

.welcome-state p {
  margin: 0;
  color: var(--analysis-soft);
  line-height: 1.65;
}

.welcome-actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  width: 100%;
  margin-top: 18px;
}

.welcome-card {
  display: grid;
  gap: 10px;
  padding: 18px;
  border: 1px solid var(--analysis-border);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.03);
  color: var(--analysis-main);
  text-align: left;
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
}

.welcome-card:hover {
  transform: translateY(-2px);
  border-color: rgba(59, 130, 246, 0.4);
  background: rgba(255, 255, 255, 0.05);
}

.welcome-card__icon {
  font-size: 24px;
}

.welcome-card p {
  font-size: 13px;
}

.stream-card {
  display: grid;
  gap: 12px;
  padding: 16px 18px;
  border-radius: 22px;
  border: 1px solid var(--analysis-border);
  background: rgba(255, 255, 255, 0.035);
  box-shadow: 0 18px 40px rgba(3, 7, 18, 0.22);
}

.stream-row {
  display: grid;
  width: 100%;
  align-items: end;
  column-gap: 12px;
  margin-bottom: 18px;
}

.stream-row--assistant {
  grid-template-columns: 36px minmax(0, 920px) minmax(0, 1fr);
}

.stream-row--user {
  grid-template-columns: minmax(0, 1fr) minmax(0, 720px) 36px;
}

.stream-presence {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--analysis-main);
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.05);
}

.stream-presence--assistant {
  background: color-mix(in srgb, var(--analysis-green) 18%, rgba(255, 255, 255, 0.04));
  color: #d1fae5;
}

.stream-presence--user {
  background: color-mix(in srgb, var(--analysis-blue) 22%, rgba(255, 255, 255, 0.04));
  color: #dbeafe;
}

.stream-row--assistant .stream-presence {
  grid-column: 1;
}

.stream-row--assistant .stream-card {
  grid-column: 2;
}

.stream-row--user .stream-card {
  grid-column: 2;
}

.stream-row--user .stream-presence {
  grid-column: 3;
}

.stream-card--user {
  border-radius: 22px 22px 8px 22px;
  background:
    linear-gradient(180deg, rgba(37, 99, 235, 0.16), rgba(16, 24, 40, 0.3)),
    rgba(255, 255, 255, 0.04);
  border-color: rgba(96, 165, 250, 0.24);
}

.stream-card--assistant {
  border-radius: 22px 22px 22px 8px;
  background:
    linear-gradient(180deg, rgba(15, 23, 42, 0.84), rgba(15, 23, 42, 0.6)),
    rgba(255, 255, 255, 0.03);
  border-color: rgba(45, 212, 191, 0.16);
}

.stream-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--analysis-soft);
  font-size: 12px;
}

.stream-card--user .stream-card__head {
  justify-content: space-between;
  color: #bfdbfe;
}

.stream-card__body,
.flow-section__body,
.preview-rich {
  color: var(--analysis-main);
  line-height: 1.7;
}

.stream-card__body :deep(p:last-child),
.flow-section__body :deep(p:last-child),
.preview-rich :deep(p:last-child) {
  margin-bottom: 0;
}

.flow-sections {
  display: grid;
  gap: 12px;
}

.flow-section {
  display: grid;
  gap: 10px;
  padding: 14px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.02);
}

.flow-section--analyze {
  border-color: rgba(59, 130, 246, 0.18);
}

.flow-section--understand {
  border-color: rgba(125, 211, 252, 0.18);
}

.flow-section--code {
  border-color: rgba(196, 181, 253, 0.18);
}

.flow-section--execute {
  border-color: rgba(45, 212, 191, 0.18);
}

.flow-section--ask {
  border-color: rgba(250, 204, 21, 0.24);
}

.flow-section--answer {
  border-color: rgba(16, 185, 129, 0.24);
}

.flow-section__tag {
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--analysis-soft);
}

.flow-section__code pre {
  margin: 0;
  padding: 14px;
  border-radius: 12px;
  overflow: auto;
  background: rgba(0, 0, 0, 0.28);
  color: #dbeafe;
  white-space: pre-wrap;
  word-break: break-word;
}

.analysis-composer {
  padding: 18px 20px 20px;
  background: linear-gradient(to top, rgba(21, 27, 43, 1), rgba(21, 27, 43, 0.55));
  border-top: 1px solid var(--analysis-border);
}

.analysis-composer__toolbar {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.tool-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 9px 12px;
  border-radius: 10px;
  cursor: pointer;
}

.tool-pill--file {
  position: relative;
  overflow: hidden;
}

.tool-pill:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.composer-box {
  padding: 16px;
  border: 1px solid var(--analysis-border);
  border-radius: 18px;
  background: var(--analysis-card-strong);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.composer-input {
  display: flex;
  align-items: flex-end;
  gap: 12px;
}

.composer-input__textarea {
  width: 100%;
  min-height: 90px;
  resize: none;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--analysis-main);
  font: inherit;
  line-height: 1.6;
}

.composer-input__textarea::placeholder {
  color: color-mix(in srgb, var(--analysis-soft) 82%, transparent);
}

.send-trigger {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--analysis-blue), #60a5fa);
  color: white;
  font-size: 20px;
  cursor: pointer;
}

.send-trigger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.composer-footnote {
  margin-top: 12px;
  color: var(--analysis-soft);
  font-size: 12px;
}

.assetrail__stats {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.assetrail__segments {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin: 16px 0;
}

.asset-chip {
  display: grid;
  gap: 4px;
  padding: 12px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.04);
}

.asset-chip strong {
  color: var(--analysis-main);
  font-size: 18px;
}

.asset-chip span {
  color: var(--analysis-soft);
  font-size: 11px;
}

.asset-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.asset-item__copy {
  display: grid;
  gap: 6px;
}

.asset-item__badge {
  flex-shrink: 0;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--analysis-soft);
  font-size: 11px;
}

.asset-item__badge.is-generated {
  background: rgba(59, 130, 246, 0.14);
  color: #bfdbfe;
}

.assetrail__preview {
  margin-top: 16px;
  min-height: 0;
  flex: 1;
  display: flex;
}

.preview-sheet,
.empty-assets {
  width: 100%;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  background: rgba(255, 255, 255, 0.03);
}

.preview-sheet {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  overflow: hidden;
}

.preview-sheet__head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.preview-sheet__head span {
  display: block;
  margin-top: 4px;
  color: var(--analysis-soft);
  font-size: 12px;
}

.preview-sheet__actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.mini-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 7px 10px;
  border-radius: 9px;
  text-decoration: none;
  cursor: pointer;
}

.preview-state,
.preview-rich,
.preview-grid,
.preview-figure {
  min-height: 0;
  overflow: auto;
  padding: 14px;
}

.preview-state {
  color: var(--analysis-soft);
}

.preview-state--error {
  color: #fecdd3;
}

.preview-grid table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.preview-grid th,
.preview-grid td {
  padding: 8px 10px;
  border: 1px solid rgba(255, 255, 255, 0.07);
  text-align: left;
  vertical-align: top;
  color: var(--analysis-main);
}

.preview-figure img {
  display: block;
  width: 100%;
  height: auto;
  border-radius: 12px;
}

.empty-assets {
  display: grid;
  place-items: center;
  align-content: center;
  gap: 10px;
  padding: 22px;
  text-align: center;
}

.empty-assets__icon {
  font-size: 32px;
  color: var(--analysis-soft);
}

.preview-rich :deep(pre),
.flow-section__body :deep(pre) {
  overflow: auto;
  padding: 12px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.25);
}

.preview-rich :deep(a),
.flow-section__body :deep(a) {
  color: #93c5fd;
}

/* ── Config Selector ──────────────────────────────────── */
.runtime-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.config-selector {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.config-selector__select {
  padding: 8px 12px;
  border: 1px solid var(--analysis-border);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--analysis-main);
  font: inherit;
  font-size: 13px;
  min-width: 200px;
  cursor: pointer;
  outline: none;
}

.config-selector__select:focus {
  border-color: var(--analysis-blue);
}

.config-selector__manage {
  padding: 8px 14px;
  border: 1px solid var(--analysis-border);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--analysis-soft);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}

.config-selector__manage:hover {
  border-color: var(--analysis-blue);
  color: var(--analysis-main);
}

.config-summary {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.config-summary__tag {
  padding: 4px 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--analysis-soft);
  font-size: 11px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
}

/* ── Config Modal ─────────────────────────────────────── */
.cfg-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.cfg-modal {
  width: 720px;
  max-width: calc(100vw - 48px);
  max-height: calc(100vh - 80px);
  background: #151b2b;
  border: 1px solid var(--analysis-border);
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5);
}

.cfg-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--analysis-border);
}

.cfg-modal__header h2 {
  margin: 0;
  font-size: 1.1rem;
  color: var(--analysis-main);
}

.cfg-modal__close {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--analysis-soft);
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cfg-modal__close:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--analysis-main);
}

.cfg-modal__body {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  flex: 1;
  overflow: hidden;
}

/* ── Config List (left panel) ─────────────────────────── */
.cfg-list {
  border-right: 1px solid var(--analysis-border);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.cfg-list__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--analysis-border);
  color: var(--analysis-soft);
  font-size: 12px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.cfg-list__add {
  padding: 5px 12px;
  border: 1px solid var(--analysis-border);
  border-radius: 8px;
  background: transparent;
  color: var(--analysis-blue);
  font-size: 12px;
  cursor: pointer;
}

.cfg-list__add:hover {
  background: rgba(59, 130, 246, 0.1);
}

.cfg-list__empty {
  padding: 32px 20px;
  text-align: center;
  color: var(--analysis-soft);
  font-size: 13px;
}

.cfg-list__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
  transition: background 0.1s;
}

.cfg-list__item:hover {
  background: rgba(255, 255, 255, 0.03);
}

.cfg-list__item.is-editing {
  background: rgba(59, 130, 246, 0.08);
  border-left: 2px solid var(--analysis-blue);
}

.cfg-list__info {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.cfg-list__info strong {
  color: var(--analysis-main);
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cfg-list__info span {
  color: var(--analysis-soft);
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cfg-list__actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.cfg-list__actions button {
  padding: 4px 10px;
  border: 1px solid var(--analysis-border);
  border-radius: 6px;
  background: transparent;
  color: var(--analysis-soft);
  font-size: 11px;
  cursor: pointer;
}

.cfg-list__actions button:hover {
  border-color: var(--analysis-blue);
  color: var(--analysis-main);
}

.cfg-list__del:hover {
  border-color: var(--analysis-danger) !important;
  color: var(--analysis-danger) !important;
}

/* ── Config Form (right panel) ────────────────────────── */
.cfg-form {
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
}

.cfg-form h3 {
  margin: 0;
  font-size: 0.95rem;
  color: var(--analysis-main);
}

.cfg-form__field {
  display: grid;
  gap: 6px;
}

.cfg-form__field span {
  font-size: 12px;
  color: var(--analysis-soft);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.cfg-form__field input {
  padding: 10px 12px;
  border: 1px solid var(--analysis-border);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--analysis-main);
  font: inherit;
  font-size: 13px;
  outline: none;
  transition: border-color 0.15s;
}

.cfg-form__field input:focus {
  border-color: var(--analysis-blue);
}

.cfg-form__field input::placeholder {
  color: color-mix(in srgb, var(--analysis-soft) 60%, transparent);
}

.cfg-form__footer {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid var(--analysis-border);
  flex-wrap: wrap;
}

.cfg-form__spacer {
  flex: 1;
}

.cfg-form__btn {
  padding: 8px 16px;
  border: 1px solid var(--analysis-border);
  border-radius: 10px;
  background: transparent;
  color: var(--analysis-soft);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}

.cfg-form__btn:hover {
  border-color: var(--analysis-blue);
  color: var(--analysis-main);
}

.cfg-form__btn--primary {
  background: linear-gradient(135deg, var(--analysis-blue), #60a5fa);
  border-color: transparent;
  color: #fff;
}

.cfg-form__btn--primary:hover {
  opacity: 0.9;
}

.cfg-form__btn--test {
  border-color: var(--analysis-green);
  color: var(--analysis-green);
}

.cfg-form__btn--test:hover {
  background: rgba(16, 185, 129, 0.1);
}

.cfg-form__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cfg-form__test-result {
  font-size: 12px;
  font-weight: 600;
}

.cfg-form__test-result.is-ok {
  color: var(--analysis-green);
}

.cfg-form__test-result.is-fail {
  color: var(--analysis-danger);
}

@media (max-width: 1440px) {
  .analysis-stage {
    grid-template-columns: 240px minmax(0, 1fr) 300px;
  }

  .welcome-actions {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 1180px) {
  .analysis-stage {
    grid-template-columns: 1fr;
  }

  .assetrail__segments {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 860px) {
  .analysis-navbar,
  .analysis-center__header,
  .assetrail__header {
    padding: 16px;
  }

  .analysis-center__body,
  .analysis-composer,
  .workrail,
  .assetrail {
    padding-left: 16px;
    padding-right: 16px;
  }

  .stream-row--assistant {
    grid-template-columns: 32px minmax(0, 1fr);
  }

  .stream-row--user {
    grid-template-columns: minmax(0, 1fr) 32px;
  }

  .stream-row--assistant .stream-card,
  .stream-row--user .stream-card {
    grid-column: 2 / 3;
  }

  .stream-row--assistant .stream-presence,
  .stream-row--user .stream-presence {
    grid-column: 1 / 2;
  }

  .stream-row--user .stream-card {
    grid-column: 1 / 2;
  }

  .stream-row--user .stream-presence {
    grid-column: 2 / 3;
  }
}

@media (max-width: 640px) {
  .analysis-shell {
    padding: 12px;
  }

  .analysis-navbar {
    flex-direction: column;
    align-items: flex-start;
  }

  .analysis-navbar__status {
    width: 100%;
  }

  .composer-input {
    flex-direction: column;
    align-items: stretch;
  }

  .send-trigger {
    width: 100%;
    height: 48px;
  }

  .stream-row {
    margin-bottom: 14px;
  }

  .stream-presence {
    width: 28px;
    height: 28px;
    font-size: 10px;
  }

  .stream-card {
    padding: 14px;
  }

  .stream-card--assistant {
    border-radius: 18px 18px 18px 6px;
  }

  .stream-card--user {
    border-radius: 18px 18px 6px 18px;
  }

  .assetrail__segments {
    grid-template-columns: 1fr;
  }
}

/* ─── Help Modal ────────────────────────────────────── */
.help-trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border: 1px solid var(--analysis-border);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--analysis-soft);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  letter-spacing: 0.02em;
}

.help-trigger span:first-child {
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(59, 130, 246, 0.18);
  color: #93c5fd;
  font-size: 12px;
  font-weight: 700;
}

.help-trigger:hover {
  background: rgba(59, 130, 246, 0.12);
  border-color: rgba(59, 130, 246, 0.3);
  color: #bfdbfe;
}

.help-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: grid;
  place-items: center;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
}

.help-modal {
  width: min(960px, 92vw);
  height: min(720px, 88vh);
  display: flex;
  flex-direction: column;
  background: #0f172a;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 18px;
  box-shadow: 0 32px 80px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.help-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 24px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.12);
  background: rgba(15, 23, 42, 0.9);
}

.help-modal__header h2 {
  margin: 0;
  color: #f8fafc;
  font-size: 16px;
  font-weight: 700;
}

.help-modal__close {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  color: #94a3b8;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.15s;
}

.help-modal__close:hover {
  background: rgba(251, 113, 133, 0.15);
  color: #fb7185;
}

.help-modal__body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.help-toc {
  width: 180px;
  flex-shrink: 0;
  padding: 18px 14px;
  border-right: 1px solid rgba(148, 163, 184, 0.1);
  background: rgba(15, 23, 42, 0.6);
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
}

.help-toc__link {
  display: block;
  padding: 9px 14px;
  border-radius: 8px;
  color: #94a3b8;
  font-size: 13px;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.15s;
}

.help-toc__link:hover {
  background: rgba(59, 130, 246, 0.1);
  color: #93c5fd;
}

.help-content {
  flex: 1;
  padding: 24px 28px;
  overflow-y: auto;
  scroll-behavior: smooth;
}

.help-content::-webkit-scrollbar {
  width: 6px;
}

.help-content::-webkit-scrollbar-track {
  background: transparent;
}

.help-content::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.2);
  border-radius: 3px;
}

.help-section {
  margin-bottom: 36px;
  scroll-margin-top: 16px;
}

.help-section h3 {
  margin: 0 0 16px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.12);
  color: #f8fafc;
  font-size: 15px;
  font-weight: 700;
}

.help-section p {
  margin: 8px 0;
  color: #cbd5e1;
  font-size: 13px;
  line-height: 1.7;
}

.help-section strong {
  color: #f1f5f9;
}

.help-section code {
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(59, 130, 246, 0.12);
  color: #93c5fd;
  font-size: 12px;
  font-family: 'SF Mono', 'Fira Code', monospace;
}

/* Overview grid */
.help-overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
  margin-top: 14px;
}

.help-overview-card {
  padding: 16px;
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  text-align: center;
}

.help-overview-card__icon {
  display: block;
  font-size: 28px;
  margin-bottom: 8px;
}

.help-overview-card strong {
  display: block;
  margin-bottom: 4px;
  color: #f1f5f9;
  font-size: 13px;
}

.help-overview-card p {
  margin: 0;
  color: #94a3b8;
  font-size: 12px;
}

/* Steps */
.help-step {
  display: flex;
  gap: 14px;
  margin-bottom: 16px;
}

.help-step__num {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(59, 130, 246, 0.15);
  color: #93c5fd;
  font-size: 13px;
  font-weight: 700;
}

.help-step__body {
  flex: 1;
}

.help-step__body strong {
  display: block;
  margin-bottom: 4px;
  color: #f1f5f9;
  font-size: 13px;
}

.help-step__body p {
  margin: 4px 0 0;
  color: #cbd5e1;
  font-size: 13px;
  line-height: 1.65;
}

/* Code block */
.help-code-block {
  margin: 10px 0;
  padding: 12px 16px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(148, 163, 184, 0.08);
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 12px;
  line-height: 1.8;
  color: #e2e8f0;
}

.help-code-block .help-k {
  color: #94a3b8;
}

/* Prompt box */
.help-prompt {
  margin: 8px 0;
  padding: 10px 14px;
  border-radius: 8px;
  border-left: 3px solid var(--analysis-blue);
  background: rgba(59, 130, 246, 0.08);
  color: #bfdbfe;
  font-size: 13px;
  line-height: 1.6;
}

.help-tip-inline {
  display: inline;
  color: #94a3b8;
  font-size: 12px;
}

/* Cases */
.help-case {
  margin-bottom: 24px;
  padding: 18px;
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.02);
}

.help-case__header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}

.help-case__tag {
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(16, 185, 129, 0.15);
  color: #6ee7b7;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.help-case__header strong {
  color: #f1f5f9;
  font-size: 14px;
}

/* FAQ */
.help-faq {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.help-faq__item {
  padding: 14px 16px;
  border: 1px solid rgba(148, 163, 184, 0.08);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.02);
}

.help-faq__item strong {
  display: block;
  margin-bottom: 6px;
  color: #f1f5f9;
  font-size: 13px;
}

.help-faq__item p {
  margin: 0;
  color: #94a3b8;
  font-size: 12.5px;
  line-height: 1.65;
}

/* Tips grid */
.help-tips-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.help-tip-card {
  padding: 16px;
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.02);
}

.help-tip-card strong {
  display: block;
  margin-bottom: 6px;
  color: #f1f5f9;
  font-size: 13px;
}

.help-tip-card p {
  margin: 0;
  color: #94a3b8;
  font-size: 12.5px;
  line-height: 1.6;
}
</style>
