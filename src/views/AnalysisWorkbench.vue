<template>
  <div class="analysis-shell">
    <div class="analysis-shell__overlay"></div>
    <div class="analysis-shell__grid" aria-hidden="true"></div>

    <header class="analysis-navbar">
      <div class="analysis-navbar__brand">
        <div class="brand-mark">
          <DataAnalysis />
        </div>
        <div>
          <p class="brand-eyebrow">Neural Data Analysis Console</p>
          <h1>数据分析工作台</h1>
        </div>
      </div>

      <div class="analysis-navbar__status">
        <div class="status-chip" :class="{ 'is-running': sending }">
          <span class="status-chip__dot"></span>
          <span>{{ currentSession ? getStatusLabel(currentSession.status) : '未接入会话' }}</span>
        </div>
        <div class="status-chip status-chip--muted">
          <Files />
          <span>{{ workspaceFiles.length }} 个文件</span>
        </div>
        <div class="status-chip status-chip--muted">
          <ChatDotRound />
          <span>{{ messages.length }} 条消息</span>
        </div>
        <button class="help-trigger" type="button" @click="showHelpModal = true">
          <QuestionFilled />
          <span>使用帮助</span>
        </button>
      </div>
    </header>

    <section class="analysis-stage">
      <aside class="workrail">
        <button class="new-session-btn" @click="handleCreateSession">
          <Plus />
          <span>新建会话</span>
        </button>

        <div class="mission-card">
          <div class="mission-card__head">
            <div>
              <p>当前分析强度</p>
              <span>{{ currentPhaseLabel }}</span>
            </div>
            <strong>{{ analysisScore }}</strong>
          </div>
          <div class="mission-card__bar">
            <i :style="{ width: `${analysisScore}%` }"></i>
          </div>
        </div>

        <div class="workrail-section">
          <p class="workrail-section__label">当前工作</p>
          <div class="workrail-menu">
            <button class="workrail-menu__item is-active" type="button">
              <ChatDotRound />
              <span>分析会话</span>
            </button>
            <button class="workrail-menu__item" type="button" @click="selectedFile && handlePreview(selectedFile)">
              <View />
              <span>文件预览</span>
            </button>
          </div>
        </div>

        <div class="workrail-section">
          <div class="workrail-section__head">
            <p class="workrail-section__label">会话管理</p>
            <span>{{ sessions.length }}</span>
          </div>
          <button class="session-manager-card" type="button" @click="showSessionModal = true">
            <div>
              <strong>{{ currentSession?.title || '未选择会话' }}</strong>
              <span>{{ currentSession?.last_user_message || '查看、切换和删除历史会话' }}</span>
            </div>
            <small>打开</small>
          </button>
        </div>

        <div v-if="currentSession" class="workrail-footer">
          <span>当前会话操作</span>
          <button class="side-action" @click="handleClearWorkspace">清空 Workspace</button>
          <button class="side-action side-action--danger" @click="handleDeleteSession">
            <Delete />
            <span>删除会话</span>
          </button>
        </div>
      </aside>

      <main class="analysis-center">
        <div class="analysis-center__header">
          <div class="analysis-title">
            <p class="panel-label">Analysis Flow</p>
            <h2>{{ currentSession?.title || '未选择会话' }}</h2>
            <section class="analysis-pipeline" aria-label="分析流程">
              <div
                v-for="phase in analysisPhases"
                :key="phase.key"
                class="pipeline-node"
                :class="{ 'is-active': phase.key === currentPhaseKey, 'is-done': phase.done }"
              >
                <span class="pipeline-node__icon">
                  <component :is="phase.icon" />
                </span>
                <strong>{{ phase.label }}</strong>
              </div>
            </section>
          </div>
          <button v-if="currentSession" class="header-meta" type="button">
            <span class="header-meta__label">会话 ID</span>
            <span class="header-meta__value">{{ currentSession.id }}</span>
          </button>
        </div>

        <div class="analysis-center__body" ref="messageStreamRef">
          <div v-if="messages.length === 0" class="welcome-state">
            <div class="welcome-state__glyph">
              <TrendCharts />
            </div>
            <h3>让分析从一条任务开始</h3>
            <p>上传数据文件后，系统会按结构化链路完成推理、写代码、执行、回看与报告导出。</p>

            <div class="welcome-actions">
              <button
                v-for="prompt in suggestedPrompts.slice(0, 3)"
                :key="prompt.title"
                class="welcome-card"
                type="button"
                @click="applyStarterPrompt(prompt.prompt)"
              >
                <span class="welcome-card__icon"><component :is="prompt.icon" /></span>
                <strong>{{ prompt.title }}</strong>
                <p>{{ prompt.description }}</p>
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
                  <div class="flow-section__tag">
                    <component :is="getSectionMeta(section.type).icon" />
                    <span>{{ getSectionMeta(section.type).label }}</span>
                  </div>
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

          <div v-if="sending" class="engine-indicator">
            <div class="engine-indicator__pulse">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <p class="engine-indicator__label">{{ engineStatusLabel }}</p>
          </div>
        </div>

        <div class="analysis-composer">
          <div class="composer-box">
            <div class="composer-topbar">
              <div class="analysis-composer__toolbar">
                <label class="tool-pill tool-pill--file">
                  <input type="file" multiple hidden @change="handleUpload" />
                  <Upload />
                  <span>上传</span>
                </label>
                <button class="tool-pill" type="button" :disabled="!currentSessionId || exporting === 'md'" @click="openExportModal('md')">
                  <Download />
                  <span>{{ exporting === 'md' ? '导出中' : 'MD' }}</span>
                </button>
                <button class="tool-pill" type="button" :disabled="!currentSessionId || exporting === 'pdf'" @click="openExportModal('pdf')">
                  <Printer />
                  <span>{{ exporting === 'pdf' ? '导出中' : 'PDF' }}</span>
                </button>
              </div>

              <div class="config-selector">
                <select v-model="activeConfigId" class="config-selector__select" @change="applyActiveConfig">
                  <option value="" disabled>选择模型配置</option>
                  <option v-for="cfg in modelConfigs" :key="cfg.id" :value="cfg.id">
                    {{ cfg.name }} · {{ cfg.model }}
                  </option>
                </select>
                <button class="config-selector__manage" type="button" @click="openConfigModal">
                  <Setting />
                  <span>配置</span>
                </button>
              </div>
            </div>

            <div v-if="suggestedPrompts.length" class="prompt-dock prompt-dock--composer">
              <div class="prompt-dock__head">
                <span>推荐分析</span>
                <button class="text-action" type="button" @click="showPromptModal = true">查看全部</button>
              </div>
              <div class="prompt-dock__list">
                <button
                  v-for="prompt in suggestedPrompts.slice(0, 4)"
                  :key="prompt.title"
                  class="prompt-chip"
                  type="button"
                  @click="useSuggestedPrompt(prompt)"
                >
                  <component :is="prompt.icon" />
                  <span>{{ prompt.title }}</span>
                </button>
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
              <button class="send-trigger" :disabled="!sending && (!draft.trim() || !currentSessionId)" @click="handleComposerAction">
                <Close v-if="sending" />
                <Promotion v-else />
              </button>
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
            <span>{{ reportFiles.length }} 报告</span>
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

        <div class="assetrail__list asset-groups">
          <section
            v-for="group in assetGroups"
            :key="group.key"
            class="asset-group"
          >
            <button
              class="asset-group__head"
              :class="{ 'is-collapsed': !isAssetGroupExpanded(group.key) }"
              type="button"
              @click="toggleAssetGroup(group.key)"
            >
              <span>
                <ArrowDown />
                {{ group.label }}
              </span>
              <small>{{ group.files.length }}</small>
            </button>
            <button
              v-for="file in group.files"
              :key="file.path"
              v-show="isAssetGroupExpanded(group.key)"
              class="asset-item"
              :class="{ 'is-active': selectedFile?.path === file.path }"
              @click="handlePreview(file)"
            >
              <span class="asset-item__icon">
                <component :is="getFileIcon(file)" />
              </span>
              <div class="asset-item__copy">
                <strong>{{ file.name }}</strong>
                <span>{{ formatFileMeta(file) }}</span>
              </div>
              <span class="asset-item__badge" :class="{ 'is-generated': file.is_generated }">
                {{ file.is_generated ? '生成物' : '源文件' }}
              </span>
            </button>
          </section>
        </div>

        <div v-if="shouldShowAssetPreview" class="assetrail__preview">
          <div v-if="selectedFile" class="preview-sheet">
            <div class="preview-sheet__head">
              <div>
                <strong>{{ selectedFile.name }}</strong>
                <span>{{ formatFileMeta(selectedFile) }}</span>
                <div v-if="dataObjectOptions.length" class="data-object-switch">
                  <select v-if="sheetOptions.length" v-model="selectedSheetName" @change="handleDataObjectChange">
                    <option v-for="sheet in sheetOptions" :key="sheet" :value="sheet">{{ sheet }}</option>
                  </select>
                  <select v-if="tableOptions.length" v-model="selectedTableName" @change="handleDataObjectChange">
                    <option v-for="table in tableOptions" :key="table" :value="table">{{ table }}</option>
                  </select>
                </div>
              </div>
              <div class="preview-sheet__actions">
                <button class="icon-action" type="button" title="完整预览" @click="showPreviewModal = true">
                  <FullScreen />
                </button>
                <a class="icon-action" :href="analysisDownloadUrl(selectedFile.path)" target="_blank" rel="noreferrer" title="下载">
                  <Download />
                </a>
                <button class="icon-action icon-action--danger" title="删除" @click="handleDeleteFile(selectedFile.path)">
                  <Delete />
                </button>
              </div>
            </div>

            <div v-if="previewLoading" class="preview-state">加载预览中…</div>
            <div v-else-if="previewError" class="preview-state preview-state--error">{{ previewError }}</div>
            <div v-else-if="preview.kind === 'table' || preview.kind === 'database'" class="preview-summary">
              <div v-if="profileLoading" class="profile-loading">正在计算全量数据画像…</div>
              <div v-if="dataProfile" class="data-profile">
                <div class="data-profile__metrics">
                  <div>
                    <strong>{{ dataProfile.rowCount }}</strong>
                    <span>行</span>
                  </div>
                  <div>
                    <strong>{{ dataProfile.columnCount }}</strong>
                    <span>列</span>
                  </div>
                  <div>
                    <strong>{{ dataProfile.missingRate }}</strong>
                    <span>样例缺失率</span>
                  </div>
                </div>
                <div class="data-profile__fields">
                  <div class="data-profile__fields-head">
                    <span>字段概览</span>
                    <small>{{ dataProfile.fields.length }} 个字段</small>
                  </div>
                  <span
                    v-for="field in dataProfile.fields.slice(0, 6)"
                    :key="field.name"
                    class="field-token"
                  >
                    <strong>{{ field.name }}</strong>
                    <em>{{ field.type }}<template v-if="field.missingRate"> · 缺失 {{ field.missingRate }}</template></em>
                  </span>
                </div>
              </div>
              <button class="preview-open" type="button" @click="showPreviewModal = true">
                <FullScreen />
                <span>打开完整表格预览</span>
              </button>
            </div>
            <div v-else-if="preview.kind === 'image'" class="preview-figure">
              <img :src="analysisDownloadUrl(selectedFile.path)" :alt="selectedFile.name" />
              <button class="preview-open" type="button" @click="showPreviewModal = true">
                <FullScreen />
                <span>查看大图</span>
              </button>
            </div>
            <div v-else-if="preview.kind === 'text'" class="preview-summary">
              <div class="preview-rich preview-rich--compact" v-html="renderMarkdown(preview.content || '')"></div>
              <button class="preview-open" type="button" @click="showPreviewModal = true">
                <FullScreen />
                <span>打开完整文本</span>
              </button>
            </div>
            <div v-else class="preview-state">{{ preview.content || '该文件暂无结构化预览。' }}</div>
          </div>

          <div v-else class="empty-assets">
            <div class="empty-assets__icon"><Files /></div>
            <strong>上传后自动生成数据画像</strong>
            <p>表格文件会显示字段、行列数、样例缺失率，并给出可直接使用的分析建议。</p>
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

    <!-- Session Modal -->
    <Teleport to="body">
      <div v-if="showSessionModal" class="workbench-modal-overlay" @click.self="showSessionModal = false">
        <div class="workbench-modal workbench-modal--sessions">
          <header class="workbench-modal__header">
            <div>
              <p class="panel-label">Session Manager</p>
              <h2>会话管理</h2>
            </div>
            <div class="workbench-modal__actions">
              <button class="mini-action" type="button" @click="handleCreateSession">新建会话</button>
              <button class="workbench-modal__close" type="button" @click="showSessionModal = false">&times;</button>
            </div>
          </header>
          <div class="session-modal-list">
            <div
              v-for="session in sessions"
              :key="session.id"
              class="session-modal-row"
              :class="{ 'is-active': session.id === currentSessionId }"
            >
              <button class="session-modal-row__main" type="button" @click="selectHistorySession(session.id)">
                <div>
                  <strong>{{ session.title }}</strong>
                  <p>{{ session.last_user_message || '从这里继续你的分析任务' }}</p>
                </div>
                <span>{{ getStatusLabel(session.status) }}</span>
              </button>
              <button
                class="session-modal-row__delete"
                type="button"
                title="删除会话"
                @click="handleDeleteHistorySession(session)"
              >
                <Delete />
              </button>
            </div>
            <div v-if="sessions.length === 0" class="history-empty">暂无历史会话</div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Prompt Modal -->
    <Teleport to="body">
      <div v-if="showPromptModal" class="workbench-modal-overlay" @click.self="showPromptModal = false">
        <div class="workbench-modal workbench-modal--prompts">
          <header class="workbench-modal__header">
            <div>
              <p class="panel-label">Suggested Analysis</p>
              <h2>推荐分析任务</h2>
            </div>
            <button class="workbench-modal__close" type="button" @click="showPromptModal = false">&times;</button>
          </header>
          <div class="prompt-modal-grid">
            <button
              v-for="prompt in suggestedPrompts"
              :key="prompt.title"
              class="prompt-modal-card"
              type="button"
              @click="useSuggestedPrompt(prompt)"
            >
              <span class="prompt-modal-card__icon"><component :is="prompt.icon" /></span>
              <strong>{{ prompt.title }}</strong>
              <p>{{ prompt.description }}</p>
              <small>{{ prompt.prompt }}</small>
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Preview Modal -->
    <Teleport to="body">
      <div v-if="showPreviewModal && selectedFile" class="workbench-modal-overlay" @click.self="showPreviewModal = false">
        <div class="workbench-modal workbench-modal--preview">
          <header class="workbench-modal__header">
            <div>
              <p class="panel-label">Asset Preview</p>
              <h2>{{ selectedFile.name }}</h2>
            </div>
            <div class="workbench-modal__actions">
              <a class="mini-action" :href="analysisDownloadUrl(selectedFile.path)" target="_blank" rel="noreferrer">下载</a>
              <button class="mini-action" type="button" @click="copyAssetLink(selectedFile)">复制链接</button>
              <button class="workbench-modal__close" type="button" @click="showPreviewModal = false">&times;</button>
            </div>
          </header>
          <div class="workbench-modal__body">
            <div v-if="dataObjectOptions.length" class="data-object-switch data-object-switch--modal">
              <select v-if="sheetOptions.length" v-model="selectedSheetName" @change="handleDataObjectChange">
                <option v-for="sheet in sheetOptions" :key="sheet" :value="sheet">{{ sheet }}</option>
              </select>
              <select v-if="tableOptions.length" v-model="selectedTableName" @change="handleDataObjectChange">
                <option v-for="table in tableOptions" :key="table" :value="table">{{ table }}</option>
              </select>
            </div>
            <div v-if="previewLoading" class="preview-state">加载预览中…</div>
            <div v-else-if="previewError" class="preview-state preview-state--error">{{ previewError }}</div>
            <div v-else-if="preview.kind === 'table' || preview.kind === 'database'" class="preview-table-stack preview-table-stack--modal">
              <div v-if="profileLoading" class="profile-loading">正在计算全量数据画像…</div>
              <div v-if="dataProfile" class="data-profile data-profile--modal">
                <div class="data-profile__metrics">
                  <div>
                    <strong>{{ dataProfile.rowCount }}</strong>
                    <span>行</span>
                  </div>
                  <div>
                    <strong>{{ dataProfile.columnCount }}</strong>
                    <span>列</span>
                  </div>
                  <div>
                    <strong>{{ dataProfile.missingRate }}</strong>
                    <span>样例缺失率</span>
                  </div>
                </div>
                <div class="data-profile__fields">
                  <span
                    v-for="field in dataProfile.fields"
                    :key="field.name"
                    class="field-token"
                  >
                    {{ field.name }} · {{ field.type }}<template v-if="field.missingRate"> · 缺失 {{ field.missingRate }}</template>
                  </span>
                </div>
              </div>
              <div class="preview-pager">
                <button type="button" :disabled="previewPage <= 1 || previewLoading" @click="changePreviewPage(previewPage - 1)">上一页</button>
                <span>{{ previewPage }} / {{ previewTotalPages }}</span>
                <button type="button" :disabled="previewPage >= previewTotalPages || previewLoading" @click="changePreviewPage(previewPage + 1)">下一页</button>
              </div>
              <div class="preview-grid preview-grid--modal">
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
            </div>
            <div v-else-if="preview.kind === 'image'" class="preview-figure preview-figure--modal">
              <img :src="analysisDownloadUrl(selectedFile.path)" :alt="selectedFile.name" />
            </div>
            <div v-else-if="preview.kind === 'text'" class="preview-rich preview-rich--modal" v-html="renderMarkdown(preview.content || '')"></div>
            <div v-else class="preview-state">{{ preview.content || '该文件暂无结构化预览。' }}</div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Export Modal -->
    <Teleport to="body">
      <div v-if="showExportModal" class="workbench-modal-overlay" @click.self="showExportModal = false">
        <div class="workbench-modal workbench-modal--export">
          <header class="workbench-modal__header">
            <div>
              <p class="panel-label">Report Export</p>
              <h2>导出分析报告</h2>
            </div>
            <button class="workbench-modal__close" type="button" @click="showExportModal = false">&times;</button>
          </header>
          <div class="export-panel">
            <div class="export-format">
              <button
                class="export-format__item"
                :class="{ 'is-active': exportDraft.format === 'md' }"
                type="button"
                @click="exportDraft.format = 'md'"
              >
                <Download />
                <span>Markdown</span>
              </button>
              <button
                class="export-format__item"
                :class="{ 'is-active': exportDraft.format === 'pdf' }"
                type="button"
                @click="exportDraft.format = 'pdf'"
              >
                <Printer />
                <span>PDF</span>
              </button>
            </div>

            <label class="export-field">
              <span>报告类型</span>
              <select v-model="exportDraft.reportType">
                <option value="executive">管理层摘要</option>
                <option value="full">完整分析报告</option>
                <option value="quality">数据质量报告</option>
                <option value="technical">技术复盘</option>
              </select>
            </label>

            <div class="export-checks">
              <label>
                <input v-model="exportDraft.includeCharts" type="checkbox" />
                <span>包含图表</span>
              </label>
              <label>
                <input v-model="exportDraft.includeCode" type="checkbox" />
                <span>包含代码过程</span>
              </label>
              <label>
                <input v-model="exportDraft.includeSamples" type="checkbox" />
                <span>包含数据样例</span>
              </label>
            </div>

            <div class="export-summary">
              <span>{{ exportSummary.answerCount }} 条结论</span>
              <span>{{ exportSummary.chartCount }} 张图表</span>
              <span>{{ exportSummary.codeCount }} 段代码</span>
              <span>{{ generatedFiles.length }} 个产物</span>
            </div>

            <div class="export-panel__footer">
              <button class="cfg-form__btn" type="button" @click="showExportModal = false">取消</button>
              <button class="cfg-form__btn cfg-form__btn--primary" type="button" :disabled="!!exporting" @click="confirmExport">
                {{ exporting ? '导出中…' : '开始导出' }}
              </button>
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
  ArrowDown,
  ChatDotRound,
  Close,
  Cpu,
  DataAnalysis,
  Delete,
  Document,
  DocumentChecked,
  Download,
  Files,
  Finished,
  FullScreen,
  Histogram,
  MagicStick,
  Monitor,
  Picture,
  Plus,
  Printer,
  Promotion,
  QuestionFilled,
  Setting,
  TrendCharts,
  Upload,
  View,
} from '@element-plus/icons-vue'
import {
  clearAnalysisWorkspace,
  createAnalysisSession,
  deleteAnalysisFile,
  deleteAnalysisSession,
  exportAnalysisReport,
  getAnalysisOverview,
  getAnalysisState,
  listAnalysisFiles,
  listAnalysisSessions,
  patchAnalysisSession,
  previewAnalysisFile,
  profileAnalysisFile,
  streamAnalysisChat,
  uploadAnalysisFiles,
  type AnalysisSession,
  type FileProfile,
  type PreviewPayload,
  type SelectedAnalysisFileContext,
  type WorkspaceFile,
  type WorkspaceOverview,
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

interface SuggestedPrompt {
  title: string
  description: string
  prompt: string
  icon: any
}

interface AssetGroup {
  key: string
  label: string
  files: WorkspaceFile[]
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
const workspaceOverview = ref<WorkspaceOverview | null>(null)
const preview = ref<PreviewPayload>({ kind: '', content: '' })
const profile = ref<FileProfile | null>(null)
const previewLoading = ref(false)
const previewError = ref('')
const profileLoading = ref(false)
const previewPage = ref(1)
const previewPageSize = 50
const selectedSheetName = ref('')
const selectedTableName = ref('')
const messages = ref<UIMessage[]>([])
const draft = ref('')
const sending = ref(false)
const activeChatController = ref<AbortController | null>(null)
const exporting = ref<'md' | 'pdf' | null>(null)
const messageStreamRef = ref<HTMLElement | null>(null)
const showSessionModal = ref(false)
const showPromptModal = ref(false)
const showPreviewModal = ref(false)
const showExportModal = ref(false)
const assetGroupExpanded = ref<Record<string, boolean>>({})
const exportDraft = ref({
  format: 'md' as 'md' | 'pdf',
  reportType: 'executive',
  includeCode: false,
  includeCharts: true,
  includeSamples: false,
})

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
const reportFiles = computed(() => workspaceFiles.value.filter((item) => isReportFile(item)))
const dataProfile = computed(() => {
  if (profile.value?.fields) {
    const missingRate = Number(profile.value.missing_rate || 0)
    return {
      rowCount: formatCount(Number(profile.value.row_count || 0)),
      columnCount: Number(profile.value.column_count || profile.value.fields.length || 0),
      missingRate: `${Math.round(missingRate * 100)}%`,
      fields: profile.value.fields.map((field: any, index: number) => ({
        name: String(field.name || `字段 ${index + 1}`),
        type: String(field.type || '未知'),
        missingRate: `${Math.round(Number(field.missing_rate || 0) * 100)}%`,
        uniqueCount: Number(field.unique_count || 0),
      })),
    }
  }
  if (!selectedFile.value || !(preview.value?.kind === 'table' || preview.value?.kind === 'database')) return null
  const columns = Array.isArray(preview.value.columns) ? preview.value.columns.map(String) : []
  const rows: unknown[][] = Array.isArray(preview.value.rows)
    ? preview.value.rows.map((row: unknown) => (Array.isArray(row) ? row : []))
    : []
  const totalCells = Math.max(columns.length * rows.length, 1)
  const missingCells = rows.reduce((count: number, row: unknown[]) => {
    return count + columns.reduce((innerCount, _, index) => innerCount + (isEmptyCell(row?.[index]) ? 1 : 0), 0)
  }, 0)
  const fields = columns.map((column, index) => ({
    name: column || `字段 ${index + 1}`,
    type: inferColumnType(rows.map((row: unknown[]) => row?.[index])),
  }))
  return {
    rowCount: formatCount(Number(preview.value.row_count ?? rows.length)),
    columnCount: columns.length,
    missingRate: `${Math.round((missingCells / totalCells) * 100)}%`,
    fields,
  }
})
const previewTotalPages = computed(() => {
  const total = Number(preview.value?.row_count || 0)
  if (!total) return 1
  return Math.max(1, Math.ceil(total / previewPageSize))
})
const sheetOptions = computed(() => {
  const fromPreview = Array.isArray(preview.value?.sheet_names) ? preview.value.sheet_names : []
  const fromProfile = Array.isArray(profile.value?.sheet_names) ? profile.value.sheet_names : []
  return Array.from(new Set([...fromPreview, ...fromProfile].map(String).filter(Boolean)))
})
const tableOptions = computed(() => {
  const fromPreview = Array.isArray(preview.value?.tables) ? preview.value.tables : []
  const fromProfile = Array.isArray(profile.value?.tables) ? profile.value.tables : []
  return Array.from(new Set([...fromPreview, ...fromProfile].map(String).filter(Boolean)))
})
const dataObjectOptions = computed(() => [...sheetOptions.value, ...tableOptions.value])
const assetGroups = computed<AssetGroup[]>(() => {
  const source = workspaceFiles.value.filter((file) => !file.is_generated)
  const charts = workspaceFiles.value.filter((file) => file.is_generated && file.category === 'image')
  const reports = workspaceFiles.value.filter((file) => file.is_generated && isReportFile(file))
  const intermediate = workspaceFiles.value.filter((file) => file.is_generated && file.category === 'table' && !isReportFile(file))
  const other = workspaceFiles.value.filter((file) => {
    if (!file.is_generated) return false
    if (file.category === 'image') return false
    if (file.category === 'table') return false
    if (isReportFile(file)) return false
    return true
  })
  return [
    { key: 'source', label: '源数据', files: source },
    { key: 'charts', label: '图表', files: charts },
    { key: 'reports', label: '报告', files: reports },
    { key: 'intermediate', label: '中间表', files: intermediate },
    { key: 'other', label: '其他产物', files: other },
  ].filter((group) => group.files.length > 0)
})
const selectedFileGroupKey = computed(() => {
  if (!selectedFile.value) return ''
  return assetGroups.value.find((group) => group.files.some((file) => file.path === selectedFile.value?.path))?.key || ''
})
const isSelectedFileGroupExpanded = computed(() => {
  if (!selectedFile.value || !selectedFileGroupKey.value) return false
  return isAssetGroupExpanded(selectedFileGroupKey.value)
})
const shouldShowAssetPreview = computed(() => {
  if (selectedFile.value) return isSelectedFileGroupExpanded.value
  return workspaceFiles.value.length === 0
})
const selectedFileRelations = computed(() => {
  if (!selectedFile.value || !workspaceOverview.value) return []
  return workspaceOverview.value.relations.filter(
    (relation) => relation.left === selectedFile.value?.path || relation.right === selectedFile.value?.path,
  )
})
const suggestedPrompts = computed<SuggestedPrompt[]>(() => {
  if (tableFiles.value.length > 0) {
    const target = selectedFile.value?.category === 'table' ? selectedFile.value.name : tableFiles.value[0].name
    const fields = dataProfile.value?.fields || []
    const dateFields = fields.filter((field: any) => field.type === '日期').map((field: any) => field.name)
    const numericFields = fields.filter((field: any) => field.type === '数值').map((field: any) => field.name)
    const categoryFields = fields.filter((field: any) => field.type === '分类').map((field: any) => field.name)
    const highMissingFields = fields.filter((field: any) => Number(String(field.missingRate || '0').replace('%', '')) >= 20).map((field: any) => field.name)
    const prompts: SuggestedPrompt[] = [
      {
        title: '字段画像',
        description: '解释字段含义、类型和可能的数据口径。',
        prompt: `请先理解 ${target} 的字段含义，生成数据字典，并指出哪些字段适合作为关键指标、维度和时间字段。`,
        icon: DataAnalysis,
      },
      {
        title: '质量诊断',
        description: '检查缺失、重复、异常值和格式问题。',
        prompt: `请对 ${target} 做数据质量诊断，包括缺失值、重复值、异常值、字段格式问题，并给出清洗建议。`,
        icon: Histogram,
      },
      {
        title: '分组对比',
        description: '自动寻找可分组字段并对比关键指标。',
        prompt: `请基于 ${target} 自动识别适合分组的维度字段，做关键指标对比，并指出表现最好和最差的分组。`,
        icon: TrendCharts,
      },
      {
        title: '趋势洞察',
        description: '识别时间字段并生成趋势分析。',
        prompt: `如果 ${target} 中存在时间字段，请按合适粒度分析趋势变化，并生成图表和业务结论。`,
        icon: TrendCharts,
      },
      {
        title: '汇报报告',
        description: '输出结论、证据和行动建议。',
        prompt: `请基于当前数据生成一份面向业务汇报的分析报告，包含核心结论、图表证据、风险点和行动建议。`,
        icon: DocumentChecked,
      },
    ]
    if (dateFields.length && numericFields.length) {
      prompts.unshift({
        title: '自动趋势',
        description: '基于时间字段和指标字段生成趋势图。',
        prompt: `请基于 ${target} 的时间字段 ${dateFields.slice(0, 3).join('、')} 和指标字段 ${numericFields.slice(0, 4).join('、')} 做趋势分析，并生成图表。`,
        icon: TrendCharts,
      })
    }
    if (categoryFields.length && numericFields.length) {
      prompts.unshift({
        title: '维度拆解',
        description: '按分类维度对关键指标做对比。',
        prompt: `请基于 ${target} 的维度字段 ${categoryFields.slice(0, 4).join('、')} 对 ${numericFields.slice(0, 4).join('、')} 做分组对比，找出主要差异和原因假设。`,
        icon: Histogram,
      })
    }
    if (highMissingFields.length) {
      prompts.unshift({
        title: '缺失诊断',
        description: '聚焦高缺失字段和清洗影响。',
        prompt: `请重点诊断 ${target} 中缺失率较高的字段 ${highMissingFields.slice(0, 5).join('、')}，评估对分析结论的影响并给出处理方案。`,
        icon: Histogram,
      })
    }
    if (selectedFileRelations.value.length) {
      const relation = selectedFileRelations.value[0]
      prompts.unshift({
        title: '关联分析',
        description: '结合可关联字段分析多文件关系。',
        prompt: `请基于当前文件 ${target} 与其他数据文件的共同字段 ${relation.common_fields.slice(0, 6).join('、')} 设计关联分析方案，并在必要时执行 join 分析。`,
        icon: DataAnalysis,
      })
    }
    return prompts
  }
  return [
    {
      title: '趋势洞察',
      description: '适合销售、流量、运营等时间序列数据的快速拆解。',
      prompt: '分析这个文件里的关键指标，并用图表展示趋势变化。',
      icon: TrendCharts,
    },
    {
      title: '质量诊断',
      description: '先识别脏数据、缺失、异常点，再决定下一步分析方向。',
      prompt: '请先理解字段含义，再做异常值检查和数据质量诊断。',
      icon: Histogram,
    },
    {
      title: '报告生成',
      description: '面向业务汇报，直接产出结论、发现和行动建议。',
      prompt: '基于当前数据给我一份结论明确、含建议项的分析报告。',
      icon: DocumentChecked,
    },
  ]
})
const analysisScore = computed(() => {
  const fileScore = Math.min(workspaceFiles.value.length * 12, 36)
  const messageScore = Math.min(messages.value.length * 7, 42)
  const generatedScore = Math.min(generatedFiles.value.length * 8, 18)
  const runningScore = sending.value ? 4 : 0
  return Math.min(100, 12 + fileScore + messageScore + generatedScore + runningScore)
})
const latestAssistantContent = computed(() => {
  return [...messages.value].reverse().find((message) => message.role === 'assistant')?.content || ''
})
const currentPhaseKey = computed(() => {
  if (awaitingClarification.value) return 'ask'
  if (sending.value) {
    const content = latestAssistantContent.value
    if (content.includes('<Execute>') || content.includes('正在执行代码')) return 'run'
    if (content.includes('<Code>')) return 'code'
    if (content.includes('<Answer>')) return 'insight'
    if (content.includes('<Analyze>') || content.includes('<Understand>')) return 'model'
    return 'model'
  }
  if (generatedFiles.value.length > 0) return 'report'
  if (messages.value.some((message) => message.role === 'assistant')) return 'insight'
  if (workspaceFiles.value.length > 0) return 'model'
  return 'ingest'
})
const currentPhaseLabel = computed(() => {
  const phase = analysisPhases.value.find((item) => item.key === currentPhaseKey.value)
  return phase?.label || '待命'
})
const phaseOrder = ['ingest', 'model', 'code', 'run', 'insight', 'report', 'ask']
const analysisPhases = computed(() => [
  { key: 'ingest', label: '采集', hint: '文件接入', icon: Upload, done: workspaceFiles.value.length > 0 },
  { key: 'model', label: '理解', hint: '字段建模', icon: DataAnalysis, done: messages.value.length > 0 },
  { key: 'code', label: '代码', hint: '生成脚本', icon: MagicStick, done: latestAssistantContent.value.includes('<Code>') || generatedFiles.value.length > 0 },
  { key: 'run', label: '执行', hint: '代码沙箱', icon: Cpu, done: generatedFiles.value.length > 0 },
  { key: 'insight', label: '洞察', hint: '结论归纳', icon: TrendCharts, done: messages.value.some((message) => message.content.includes('<Answer>')) },
  { key: 'report', label: '报告', hint: '产物沉淀', icon: DocumentChecked, done: generatedFiles.value.length > 0 },
  { key: 'ask', label: '追问', hint: '补充条件', icon: ChatDotRound, done: awaitingClarification.value },
].map((phase) => ({
  ...phase,
  done: phase.done || phaseOrder.indexOf(phase.key) < phaseOrder.indexOf(currentPhaseKey.value),
})))

const engineStatusLabel = computed(() => {
  const content = latestAssistantContent.value
  if (!content) return '引擎连接中…'
  if (awaitingClarification.value) return '等待补充信息…'
  if (/error|traceback|exception|失败|报错/i.test(content)) return '执行遇到错误，等待修正…'
  if (content.includes('<Answer>')) return '正在总结结论…'
  if (content.includes('<File>')) return '正在整理生成物…'
  if (content.includes('正在执行代码')) return '正在执行代码…'
  if (content.includes('<Code>') && !content.includes('</Execute>')) return '代码执行中…'
  if (content.includes('<Code>')) return '正在生成分析代码…'
  if (content.includes('<Understand>')) return '正在理解字段与数据结构…'
  if (content.includes('<Analyze>')) return '正在制定分析方案…'
  return '引擎运行中…'
})
const exportSummary = computed(() => {
  const assistantContent = messages.value
    .filter((message) => message.role === 'assistant')
    .map((message) => message.content)
    .join('\n')
  return {
    answerCount: (assistantContent.match(/<Answer>/g) || []).length,
    chartCount: (assistantContent.match(/!\[[^\]]*]\(/g) || []).length,
    codeCount: (assistantContent.match(/<Code>/g) || []).length,
  }
})

function formatTimestamp(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString('zh-CN', { hour12: false })
}

function formatFileMeta(file: WorkspaceFile) {
  const sizeKb = `${(file.size / 1024).toFixed(1)} KB`
  const category = file.category === 'table' ? '表格' : file.category === 'image' ? '图片' : '文档'
  return `${category} · ${sizeKb}`
}

function formatCount(value: number) {
  if (!Number.isFinite(value)) return '0'
  if (value >= 10000) return `${(value / 10000).toFixed(1)}万`
  return String(value)
}

function getFileExtension(file: WorkspaceFile) {
  const name = file.name || file.path
  const match = name.toLowerCase().match(/\.([a-z0-9]+)$/)
  return match?.[1] || ''
}

function isReportFile(file: WorkspaceFile) {
  const ext = getFileExtension(file)
  if (['md', 'markdown', 'pdf', 'doc', 'docx', 'html'].includes(ext)) return true
  return /report|报告|分析结果|summary/i.test(file.name) || /report|报告|分析结果|summary/i.test(file.path)
}

function isEmptyCell(value: unknown) {
  return value === null || value === undefined || String(value).trim() === ''
}

function inferColumnType(values: unknown[]) {
  const sample = values.filter((value) => !isEmptyCell(value)).slice(0, 20)
  if (!sample.length) return '空值'
  const numericCount = sample.filter((value) => !Number.isNaN(Number(String(value).replace(/,/g, '')))).length
  if (numericCount / sample.length >= 0.85) return '数值'
  const dateCount = sample.filter((value) => {
    const text = String(value).trim()
    if (!/[/-]|年|月|日/.test(text)) return false
    return !Number.isNaN(Date.parse(text.replace(/年|月/g, '-').replace(/日/g, '')))
  }).length
  if (dateCount / sample.length >= 0.65) return '日期'
  const uniqueCount = new Set(sample.map((value) => String(value))).size
  if (uniqueCount <= Math.max(6, sample.length * 0.45)) return '分类'
  return '文本'
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

function getSectionMeta(type: string) {
  const meta: Record<string, { label: string; icon: any }> = {
    Analyze: { label: '分析策略', icon: DataAnalysis },
    Understand: { label: '数据理解', icon: Monitor },
    Code: { label: '代码生成', icon: MagicStick },
    Execute: { label: '执行回放', icon: Cpu },
    Ask: { label: '需要补充', icon: ChatDotRound },
    Answer: { label: '结论洞察', icon: Finished },
    File: { label: '文件产物', icon: Files },
  }
  return meta[type] || { label: type, icon: Document }
}

function getFileIcon(file: WorkspaceFile) {
  if (file.category === 'image') return Picture
  if (file.category === 'table') return Histogram
  return Document
}

function isAssetGroupExpanded(key: string) {
  return assetGroupExpanded.value[key] !== false
}

function toggleAssetGroup(key: string) {
  assetGroupExpanded.value = {
    ...assetGroupExpanded.value,
    [key]: !isAssetGroupExpanded(key),
  }
}

function analysisDownloadUrl(path: string) {
  return `/api/analysis/workspace/download?session_id=${encodeURIComponent(currentSessionId.value)}&path=${encodeURIComponent(path)}`
}

function applyStarterPrompt(prompt: string) {
  draft.value = prompt
}

function useSuggestedPrompt(prompt: SuggestedPrompt) {
  applyStarterPrompt(prompt.prompt)
  showPromptModal.value = false
}

async function copyAssetLink(file: WorkspaceFile) {
  const url = `${window.location.origin}${analysisDownloadUrl(file.path)}`
  try {
    await navigator.clipboard.writeText(url)
    notification.success('链接已复制')
  } catch {
    notification.error('复制失败，请手动复制下载地址')
  }
}

function openExportModal(format: 'md' | 'pdf') {
  exportDraft.value = {
    ...exportDraft.value,
    format,
  }
  showExportModal.value = true
}

function buildSelectedFileContext(file: WorkspaceFile | null): SelectedAnalysisFileContext | null {
  if (!file) return null
  return {
    name: file.name,
    path: file.path,
    category: file.category,
    sheet_name: selectedSheetName.value || undefined,
    table_name: selectedTableName.value || undefined,
    size: file.size,
    is_generated: file.is_generated,
  }
}

async function confirmExport() {
  await handleExport(exportDraft.value.format, {
    reportType: exportDraft.value.reportType,
    includeCode: exportDraft.value.includeCode,
    includeCharts: exportDraft.value.includeCharts,
    includeSamples: exportDraft.value.includeSamples,
  })
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
        profile.value = null
        previewError.value = ''
      }
    }
  } catch {
    workspaceFiles.value = []
  }
  try {
    workspaceOverview.value = await getAnalysisOverview(currentSessionId.value)
  } catch {
    workspaceOverview.value = null
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

async function selectHistorySession(sessionId: string) {
  await selectSession(sessionId)
  showSessionModal.value = false
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
  await deleteSessionRecord(currentSession.value)
}

async function deleteSessionRecord(session: AnalysisSession) {
  const confirmed = await notification.confirm(`删除会话「${session.title}」？`)
  if (!confirmed) return
  try {
    await deleteAnalysisSession(session.id)
    const deletingCurrent = session.id === currentSessionId.value
    if (deletingCurrent) {
      messages.value = []
      workspaceFiles.value = []
      workspaceOverview.value = null
      selectedFile.value = null
      selectedSheetName.value = ''
      selectedTableName.value = ''
      preview.value = { kind: '', content: '' }
      profile.value = null
      previewError.value = ''
      currentSessionId.value = ''
    }
    await refreshSessions()
    if (deletingCurrent && sessions.value[0]) {
      await selectSession(sessions.value[0].id)
    }
    notification.success('会话已删除')
  } catch (error) {
    notification.error((error as Error).message)
  }
}

async function handleDeleteHistorySession(session: AnalysisSession) {
  await deleteSessionRecord(session)
}

async function handleClearWorkspace() {
  if (!currentSessionId.value) return
  const confirmed = await notification.confirm('清空当前 workspace 会删除已上传文件和生成物，是否继续？')
  if (!confirmed) return
  try {
    await clearAnalysisWorkspace(currentSessionId.value)
    messages.value = []
    workspaceFiles.value = []
    workspaceOverview.value = null
    selectedFile.value = null
    selectedSheetName.value = ''
    selectedTableName.value = ''
    preview.value = { kind: '', content: '' }
    profile.value = null
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
    const response = await uploadAnalysisFiles(currentSessionId.value, files)
    await refreshWorkspace()
    const uploadedPaths = new Set((response.files || []).map((file) => file.path))
    const preferredFile =
      workspaceFiles.value.find((file) => uploadedPaths.has(file.path) && file.category === 'table') ||
      workspaceFiles.value.find((file) => uploadedPaths.has(file.path)) ||
      workspaceFiles.value.find((file) => file.category === 'table') ||
      workspaceFiles.value[0]
    if (preferredFile) {
      await handlePreview(preferredFile)
    }
    notification.success(`已上传 ${files.length} 个文件`)
  } catch (error) {
    notification.error((error as Error).message)
  } finally {
    input.value = ''
  }
}

async function handlePreview(file: WorkspaceFile) {
  selectedFile.value = file
  previewPage.value = 1
  selectedSheetName.value = ''
  selectedTableName.value = ''
  await loadPreview(file)
  await loadProfile(file)
}

async function loadPreview(file = selectedFile.value) {
  if (!file || !currentSessionId.value) return
  previewLoading.value = true
  previewError.value = ''
  try {
    preview.value = await previewAnalysisFile(currentSessionId.value, file.path, {
      page: previewPage.value,
      pageSize: previewPageSize,
      sheetName: selectedSheetName.value,
      tableName: selectedTableName.value,
    })
    if (preview.value.sheet_name) selectedSheetName.value = String(preview.value.sheet_name)
    if (preview.value.table_name) selectedTableName.value = String(preview.value.table_name)
  } catch (error) {
    preview.value = { kind: '', content: '' }
    previewError.value = (error as Error).message
  } finally {
    previewLoading.value = false
  }
}

async function loadProfile(file = selectedFile.value) {
  if (!file || !currentSessionId.value || file.category !== 'table') {
    profile.value = null
    return
  }
  profileLoading.value = true
  try {
    profile.value = await profileAnalysisFile(currentSessionId.value, file.path, {
      sheetName: selectedSheetName.value,
      tableName: selectedTableName.value,
    })
    if (profile.value.sheet_name) selectedSheetName.value = String(profile.value.sheet_name)
    if (profile.value.table_name) selectedTableName.value = String(profile.value.table_name)
  } catch {
    profile.value = null
  } finally {
    profileLoading.value = false
  }
}

async function handleDataObjectChange() {
  if (!selectedFile.value) return
  previewPage.value = 1
  await loadPreview(selectedFile.value)
  await loadProfile(selectedFile.value)
}

async function changePreviewPage(page: number) {
  const nextPage = Math.min(Math.max(page, 1), previewTotalPages.value)
  if (nextPage === previewPage.value) return
  previewPage.value = nextPage
  await loadPreview()
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
      selectedSheetName.value = ''
      selectedTableName.value = ''
      preview.value = { kind: '', content: '' }
      profile.value = null
      previewError.value = ''
      showPreviewModal.value = false
    }
    notification.success('文件已删除')
  } catch (error) {
    notification.error((error as Error).message)
  }
}

async function handleExport(
  format: 'md' | 'pdf',
  options?: { reportType: string; includeCode: boolean; includeCharts: boolean; includeSamples: boolean },
) {
  if (!currentSessionId.value) return
  exporting.value = format
  try {
    const payload = await exportAnalysisReport({
      session_id: currentSessionId.value,
      format,
      report_type: options?.reportType,
      include_code: options?.includeCode,
      include_charts: options?.includeCharts,
      include_samples: options?.includeSamples,
    })
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
    showExportModal.value = false
  } catch (error) {
    notification.error((error as Error).message)
  } finally {
    exporting.value = null
  }
}

async function handleSend() {
  if (!draft.value.trim() || !currentSessionId.value || sending.value) return
  const controller = new AbortController()
  activeChatController.value = controller
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
        selected_file: buildSelectedFileContext(selectedFile.value),
        selected_file_profile: profile.value,
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
      { signal: controller.signal },
    )
  } catch (error) {
    const isAbort = (error as Error).name === 'AbortError'
    assistantMessage.content += `\n<Answer>\n${isAbort ? '分析已取消。' : `分析请求失败：${(error as Error).message}`}\n</Answer>`
    if (isAbort) {
      notification.warning('已取消当前分析')
    } else {
      notification.error((error as Error).message)
    }
  } finally {
    sending.value = false
    if (activeChatController.value === controller) {
      activeChatController.value = null
    }
  }
}

function cancelAnalysis() {
  activeChatController.value?.abort()
}

function handleComposerAction() {
  if (sending.value) {
    cancelAnalysis()
    return
  }
  handleSend()
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
  --analysis-cyan: #22d3ee;
  --analysis-green: #10b981;
  --analysis-violet: #8b5cf6;
  --analysis-amber: #f59e0b;
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

.analysis-shell__grid {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(rgba(148, 163, 184, 0.055) 1px, transparent 1px),
    linear-gradient(90deg, rgba(148, 163, 184, 0.055) 1px, transparent 1px);
  background-size: 42px 42px;
  mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.9), transparent 78%);
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
  background:
    linear-gradient(135deg, rgba(34, 211, 238, 0.24), rgba(59, 130, 246, 0.16)),
    rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(125, 211, 252, 0.36);
  box-shadow: 0 0 28px rgba(34, 211, 238, 0.18);
  color: white;
}

.brand-mark svg,
.status-chip svg,
.help-trigger svg,
.new-session-btn svg,
.workrail-menu__item svg,
.side-action svg,
.tool-pill svg,
.config-selector__manage svg,
.send-trigger svg,
.pipeline-node svg,
.flow-section__tag svg,
.asset-item__icon svg,
.welcome-card__icon svg,
.welcome-state__glyph svg {
  width: 1em;
  height: 1em;
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

.status-chip.is-running {
  color: #a7f3d0;
  background: rgba(16, 185, 129, 0.12);
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

.status-chip.is-running .status-chip__dot {
  animation: status-breathe 1.4s ease-in-out infinite;
}

@keyframes status-breathe {
  0%, 100% { box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.12), 0 0 0 rgba(16, 185, 129, 0); }
  50% { box-shadow: 0 0 0 7px rgba(16, 185, 129, 0.16), 0 0 22px rgba(16, 185, 129, 0.45); }
}

.analysis-stage {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr) 320px;
  gap: 20px;
  margin-top: 18px;
  height: calc(100vh - 150px);
  min-height: 680px;
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
  background: linear-gradient(135deg, var(--analysis-cyan), var(--analysis-blue) 52%, var(--analysis-violet));
  color: white;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 16px 36px rgba(37, 99, 235, 0.26);
}

.mission-card {
  position: relative;
  display: grid;
  gap: 12px;
  margin-top: 16px;
  min-height: 96px;
  padding: 14px 16px;
  overflow: hidden;
  border: 1px solid rgba(34, 211, 238, 0.18);
  border-radius: 14px;
  background:
    linear-gradient(135deg, rgba(34, 211, 238, 0.12), transparent 46%),
    rgba(255, 255, 255, 0.035);
}

.mission-card::after {
  content: '';
  position: absolute;
  inset: auto -20% -44px 18%;
  height: 80px;
  background: linear-gradient(90deg, transparent, rgba(34, 211, 238, 0.18), transparent);
  transform: rotate(-8deg);
}

.mission-card__head {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  min-width: 0;
}

.mission-card__head > div {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.mission-card p,
.mission-card span {
  margin: 0;
  color: var(--analysis-soft);
  font-size: 12px;
  line-height: 1.2;
}

.mission-card strong {
  flex: 0 0 auto;
  color: var(--analysis-main);
  font-family: var(--font-mono);
  font-size: 32px;
  line-height: 1;
}

.mission-card__bar {
  position: relative;
  z-index: 1;
  height: 7px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
}

.mission-card__bar i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--analysis-cyan), var(--analysis-green), var(--analysis-amber));
  transition: width 0.36s ease;
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
.assetrail__list {
  display: grid;
  gap: 8px;
}

.workrail-menu__item,
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
.asset-item.is-active {
  border-color: rgba(59, 130, 246, 0.36);
  background: rgba(59, 130, 246, 0.12);
  color: var(--analysis-main);
}

.asset-item {
  display: grid;
  gap: 8px;
  padding: 12px 13px;
  border-radius: 12px;
}

.session-manager-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 12px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.035);
  color: var(--analysis-main);
  text-align: left;
  cursor: pointer;
}

.session-manager-card:hover {
  border-color: rgba(34, 211, 238, 0.28);
  background: rgba(34, 211, 238, 0.07);
}

.session-manager-card > div {
  display: grid;
  gap: 5px;
  min-width: 0;
}

.session-manager-card strong,
.asset-item strong {
  min-width: 0;
  overflow: hidden;
  color: var(--analysis-main);
  font-size: 14px;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.session-manager-card span,
.asset-item span,
.assetrail__stats span,
.workrail-footer {
  color: var(--analysis-soft);
  font-size: 12px;
  line-height: 1.5;
}

.session-manager-card span {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.session-manager-card small {
  flex: 0 0 auto;
  color: #67e8f9;
  font-size: 12px;
}

.session-modal-list {
  display: grid;
  gap: 10px;
  min-height: 0;
  overflow: auto;
  padding: 18px;
}

.session-modal-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 42px;
  gap: 10px;
  align-items: stretch;
}

.session-modal-row__main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-width: 0;
  padding: 14px 16px;
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.035);
  color: var(--analysis-main);
  text-align: left;
  cursor: pointer;
}

.session-modal-row.is-active .session-modal-row__main {
  border-color: rgba(59, 130, 246, 0.42);
  background: rgba(59, 130, 246, 0.12);
}

.session-modal-row__main > div {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.session-modal-row__main strong,
.session-modal-row__main p {
  min-width: 0;
  overflow: hidden;
  margin: 0;
  text-overflow: ellipsis;
}

.session-modal-row__main strong {
  color: var(--analysis-main);
  font-size: 14px;
  white-space: nowrap;
}

.session-modal-row__main p {
  color: var(--analysis-soft);
  font-size: 12px;
  line-height: 1.45;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.session-modal-row__main span {
  flex: 0 0 auto;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  color: var(--analysis-soft);
  font-size: 11px;
}

.session-modal-row__delete {
  display: grid;
  place-items: center;
  border: 1px solid rgba(251, 113, 133, 0.2);
  border-radius: 12px;
  background: rgba(251, 113, 133, 0.06);
  color: #fecdd3;
  cursor: pointer;
}

.session-modal-row__delete:hover {
  border-color: rgba(251, 113, 133, 0.44);
  background: rgba(251, 113, 133, 0.12);
}

.history-empty {
  padding: 16px 12px;
  border: 1px dashed rgba(148, 163, 184, 0.16);
  border-radius: 12px;
  color: var(--analysis-soft);
  font-size: 12px;
  text-align: center;
}

.workrail-footer {
  display: grid;
  gap: 10px;
  margin-top: auto;
  padding-top: 18px;
}

.workrail-footer > span {
  color: var(--analysis-soft);
  font-size: 11px;
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
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
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

.analysis-title {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.analysis-pipeline {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  overflow-x: auto;
  padding-bottom: 2px;
  scrollbar-width: none;
}

.pipeline-node {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex: 0 0 auto;
  padding: 5px 8px;
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 999px;
  color: var(--analysis-soft);
  background: rgba(255, 255, 255, 0.025);
}

.analysis-pipeline::-webkit-scrollbar {
  display: none;
}

.pipeline-node.is-active {
  color: var(--analysis-main);
  border-color: rgba(34, 211, 238, 0.24);
  background: rgba(34, 211, 238, 0.08);
}

.pipeline-node.is-done {
  color: #a7f3d0;
}

.pipeline-node__icon {
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  width: 22px;
  height: 22px;
  border-radius: 999px;
  color: #93c5fd;
  background: rgba(59, 130, 246, 0.1);
}

.pipeline-node.is-active .pipeline-node__icon {
  color: #cffafe;
  background: rgba(34, 211, 238, 0.18);
  box-shadow: 0 0 24px rgba(34, 211, 238, 0.18);
}

.pipeline-node strong {
  display: block;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.pipeline-node strong {
  color: currentColor;
  font-size: 11px;
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
  display: grid;
  place-items: center;
  width: 72px;
  height: 72px;
  border: 1px solid rgba(34, 211, 238, 0.26);
  border-radius: 22px;
  background:
    linear-gradient(135deg, rgba(34, 211, 238, 0.12), rgba(139, 92, 246, 0.12)),
    rgba(255, 255, 255, 0.04);
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
  border-radius: 8px;
  background:
    linear-gradient(135deg, rgba(34, 211, 238, 0.08), transparent 44%),
    rgba(255, 255, 255, 0.03);
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
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: rgba(59, 130, 246, 0.12);
  color: #bfdbfe;
  font-size: 20px;
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
  display: inline-flex;
  align-items: center;
  gap: 8px;
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
  padding: 10px 14px 12px;
  background: linear-gradient(to top, rgba(21, 27, 43, 0.98), rgba(21, 27, 43, 0.42));
  border-top: 1px solid var(--analysis-border);
}

.analysis-composer__toolbar {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.tool-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 34px;
  padding: 7px 10px;
  border-radius: 9px;
  cursor: pointer;
  font-size: 13px;
}

.tool-pill--file {
  position: relative;
  overflow: hidden;
}

.tool-pill:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.tool-pill:hover,
.side-action:hover,
.mini-action:hover {
  border-color: rgba(34, 211, 238, 0.3);
  background: rgba(34, 211, 238, 0.08);
}

.composer-box {
  position: relative;
  display: grid;
  gap: 8px;
  padding: 10px;
  border: 1px solid var(--analysis-border);
  border-radius: 14px;
  background: var(--analysis-card-strong);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.composer-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-width: 0;
}

.composer-input {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 48px;
  padding: 0 0 0 4px;
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 12px;
  background:
    linear-gradient(90deg, rgba(34, 211, 238, 0.045), transparent 32%),
    rgba(255, 255, 255, 0.025);
}

.composer-input__textarea {
  width: 100%;
  height: 44px;
  min-height: 44px;
  max-height: 96px;
  resize: none;
  overflow-y: auto;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--analysis-main);
  font: inherit;
  line-height: 1.5;
  padding: 11px 4px 8px;
}

.composer-input__textarea::placeholder {
  color: color-mix(in srgb, var(--analysis-soft) 82%, transparent);
}

.send-trigger {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  margin-right: 4px;
  border: 0;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--analysis-blue), #60a5fa);
  color: white;
  font-size: 20px;
  cursor: pointer;
  box-shadow: 0 14px 30px rgba(59, 130, 246, 0.26);
}

.send-trigger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.is-spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
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

.prompt-dock {
  display: grid;
  gap: 10px;
  margin-bottom: 14px;
  padding: 12px;
  border: 1px solid rgba(34, 211, 238, 0.14);
  border-radius: 14px;
  background:
    linear-gradient(135deg, rgba(34, 211, 238, 0.08), transparent 46%),
    rgba(255, 255, 255, 0.025);
}

.prompt-dock--composer {
  margin-bottom: 0;
  padding: 10px 12px;
  border-radius: 12px;
  background:
    linear-gradient(90deg, rgba(34, 211, 238, 0.07), transparent 58%),
    rgba(255, 255, 255, 0.025);
}

.prompt-dock__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: var(--analysis-main);
  font-size: 12px;
  font-weight: 700;
}

.text-action {
  flex: 0 0 auto;
  border: 0;
  background: transparent;
  color: #67e8f9;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}

.text-action:hover {
  color: #cffafe;
}

.prompt-dock__head small {
  color: var(--analysis-soft);
  font-size: 11px;
  font-weight: 500;
}

.prompt-dock__list {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 2px;
  scrollbar-width: none;
}

.prompt-dock__list::-webkit-scrollbar {
  display: none;
}

.prompt-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex: 0 0 auto;
  padding: 7px 10px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.035);
  color: #dbeafe;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}

.prompt-chip svg {
  width: 14px;
  height: 14px;
  color: #67e8f9;
}

.prompt-chip:hover {
  border-color: rgba(34, 211, 238, 0.32);
  background: rgba(34, 211, 238, 0.08);
}

.asset-groups {
  max-height: 240px;
  overflow: auto;
  padding-right: 2px;
}

.asset-group {
  display: grid;
  gap: 8px;
}

.asset-group + .asset-group {
  margin-top: 10px;
}

.asset-group__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  border: 0;
  padding: 0;
  background: transparent;
  color: var(--analysis-soft);
  font: inherit;
  font-size: 11px;
  letter-spacing: 0.12em;
  text-align: left;
  text-transform: uppercase;
  cursor: pointer;
}

.asset-group__head > span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.asset-group__head svg {
  width: 13px;
  height: 13px;
  transition: transform 0.18s ease;
}

.asset-group__head.is-collapsed svg {
  transform: rotate(-90deg);
}

.asset-group__head:hover {
  color: var(--analysis-main);
}

.asset-group__head small {
  display: grid;
  place-items: center;
  min-width: 20px;
  height: 20px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--analysis-main);
  letter-spacing: 0;
}

.asset-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.asset-item__icon {
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  color: #bfdbfe;
  background: rgba(59, 130, 246, 0.1);
}

.asset-item__copy {
  display: grid;
  gap: 6px;
  min-width: 0;
  margin-right: auto;
}

.asset-item__copy strong,
.asset-item__copy span {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
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
  align-items: flex-start;
  gap: 14px;
  padding: 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.preview-sheet__head > div:first-child {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.preview-sheet__head strong {
  overflow: hidden;
  color: var(--analysis-main);
  font-size: 15px;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.preview-sheet__head span {
  display: block;
  color: var(--analysis-soft);
  font-size: 12px;
}

.preview-sheet__actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.data-object-switch {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 8px;
}

.data-object-switch--modal {
  margin: 0 0 12px;
}

.data-object-switch select {
  min-width: 150px;
  min-height: 32px;
  padding: 0 10px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--analysis-main);
  font: inherit;
  font-size: 12px;
  outline: none;
}

.icon-action {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border: 1px solid var(--analysis-border);
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.035);
  color: var(--analysis-main);
  cursor: pointer;
  text-decoration: none;
}

.icon-action svg {
  width: 16px;
  height: 16px;
}

.icon-action:hover {
  border-color: rgba(34, 211, 238, 0.34);
  background: rgba(34, 211, 238, 0.08);
  color: #cffafe;
}

.icon-action--danger {
  color: #fecdd3;
  border-color: rgba(251, 113, 133, 0.28);
}

.icon-action--danger:hover {
  color: #fecdd3;
  border-color: rgba(251, 113, 133, 0.44);
  background: rgba(251, 113, 133, 0.09);
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

.profile-loading {
  padding: 10px 14px 0;
  color: var(--analysis-soft);
  font-size: 12px;
}

.preview-summary {
  display: grid;
  gap: 10px;
  min-height: 0;
  overflow: auto;
}

.preview-open {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: calc(100% - 28px);
  margin: 0 14px 14px;
  padding: 10px 12px;
  border: 1px solid rgba(34, 211, 238, 0.22);
  border-radius: 10px;
  background: rgba(34, 211, 238, 0.08);
  color: #cffafe;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}

.preview-open svg {
  width: 15px;
  height: 15px;
}

.preview-open:hover {
  border-color: rgba(34, 211, 238, 0.38);
  background: rgba(34, 211, 238, 0.12);
}

.preview-table-stack {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  min-height: 0;
  overflow: hidden;
}

.preview-table-stack--modal {
  height: 100%;
}

.data-profile {
  display: grid;
  gap: 12px;
  padding: 14px;
  background: transparent;
}

.data-profile__metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.data-profile--modal {
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  margin-bottom: 12px;
}

.data-profile__metrics div {
  display: grid;
  gap: 6px;
  min-width: 0;
  padding: 10px;
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
}

.data-profile__metrics strong {
  overflow: hidden;
  color: var(--analysis-main);
  font-size: 17px;
  line-height: 1;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.data-profile__metrics span {
  color: var(--analysis-soft);
  font-size: 10px;
}

.data-profile__fields {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.data-profile__fields-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: var(--analysis-soft);
  font-size: 11px;
}

.data-profile__fields-head small {
  color: #93c5fd;
}

.field-token {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-width: 0;
  padding: 7px 9px;
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 8px;
  color: var(--analysis-main);
  background: rgba(255, 255, 255, 0.025);
  font-size: 11px;
}

.field-token strong {
  min-width: 0;
  overflow: hidden;
  font-weight: 600;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.field-token em {
  flex: 0 0 auto;
  color: #93c5fd;
  font-style: normal;
}

.preview-grid table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.preview-grid--modal {
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.02);
}

.preview-pager {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  margin-bottom: 10px;
  color: var(--analysis-soft);
  font-size: 12px;
}

.preview-pager button {
  padding: 6px 10px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--analysis-main);
  font: inherit;
  cursor: pointer;
}

.preview-pager button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
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

.preview-figure--modal {
  display: grid;
  place-items: center;
  height: 100%;
}

.preview-figure--modal img {
  max-width: 100%;
  max-height: 72vh;
  object-fit: contain;
}

.preview-rich--compact {
  max-height: 180px;
  overflow: hidden;
  padding-bottom: 0;
  mask-image: linear-gradient(to bottom, #000 72%, transparent);
}

.preview-rich--modal {
  height: 100%;
  overflow: auto;
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

.flow-section__body :deep(img),
.flow-section__body--files :deep(img) {
  display: block;
  max-width: 100%;
  max-height: 480px;
  border-radius: 12px;
  margin: 10px 0;
  border: 1px solid var(--analysis-border);
  background: rgba(0, 0, 0, 0.15);
  object-fit: contain;
}

/* ── Engine Indicator ────────────────────────────────── */
.engine-indicator {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 20px;
  margin: 8px 56px;
  border-radius: 14px;
  background: rgba(59, 130, 246, 0.08);
  border: 1px solid rgba(59, 130, 246, 0.18);
  animation: engine-fade-in 0.3s ease;
}

@keyframes engine-fade-in {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}

.engine-indicator__pulse {
  display: flex;
  align-items: center;
  gap: 4px;
}

.engine-indicator__pulse span {
  display: block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--analysis-blue);
  animation: engine-dot 1.4s ease-in-out infinite;
}

.engine-indicator__pulse span:nth-child(2) {
  animation-delay: 0.2s;
}

.engine-indicator__pulse span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes engine-dot {
  0%, 80%, 100% { opacity: 0.25; transform: scale(0.8); }
  40% { opacity: 1; transform: scale(1.2); }
}

.engine-indicator__label {
  margin: 0;
  color: #93c5fd;
  font-size: 13px;
  letter-spacing: 0.02em;
}

/* ── Workbench Modals ────────────────────────────────── */
.workbench-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 9998;
  display: grid;
  place-items: center;
  padding: 28px;
  background: rgba(3, 7, 18, 0.68);
  backdrop-filter: blur(8px);
}

.workbench-modal {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  width: min(1120px, calc(100vw - 56px));
  max-height: min(820px, calc(100vh - 56px));
  overflow: hidden;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 18px;
  background:
    radial-gradient(circle at top left, rgba(34, 211, 238, 0.1), transparent 34%),
    #101827;
  box-shadow: 0 34px 90px rgba(0, 0, 0, 0.56);
}

.workbench-modal--prompts {
  width: min(980px, calc(100vw - 56px));
}

.workbench-modal--sessions {
  width: min(820px, calc(100vw - 56px));
  height: min(720px, calc(100vh - 56px));
}

.workbench-modal--preview {
  width: min(1280px, calc(100vw - 56px));
  height: min(820px, calc(100vh - 56px));
}

.workbench-modal--export {
  width: min(620px, calc(100vw - 56px));
}

.workbench-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 22px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.14);
  background: rgba(15, 23, 42, 0.78);
}

.workbench-modal__header h2 {
  margin: 0;
  color: var(--analysis-main);
  font-size: 18px;
  font-weight: 700;
}

.workbench-modal__actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.workbench-modal__close {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--analysis-soft);
  font-size: 20px;
  cursor: pointer;
}

.workbench-modal__close:hover {
  color: var(--analysis-main);
  background: rgba(255, 255, 255, 0.08);
}

.workbench-modal__body {
  min-height: 0;
  overflow: auto;
  padding: 18px;
}

.prompt-modal-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 14px;
  min-height: 0;
  overflow: auto;
  padding: 18px;
}

.prompt-modal-card {
  display: grid;
  gap: 10px;
  min-height: 180px;
  padding: 16px;
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 14px;
  background:
    linear-gradient(135deg, rgba(34, 211, 238, 0.08), transparent 48%),
    rgba(255, 255, 255, 0.035);
  color: var(--analysis-main);
  text-align: left;
  cursor: pointer;
}

.prompt-modal-card:hover {
  border-color: rgba(34, 211, 238, 0.32);
  transform: translateY(-1px);
}

.prompt-modal-card__icon {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  color: #cffafe;
  background: rgba(34, 211, 238, 0.12);
}

.prompt-modal-card__icon svg {
  width: 20px;
  height: 20px;
}

.prompt-modal-card strong {
  font-size: 15px;
}

.prompt-modal-card p,
.prompt-modal-card small {
  margin: 0;
  color: var(--analysis-soft);
  line-height: 1.55;
}

.prompt-modal-card p {
  font-size: 13px;
}

.prompt-modal-card small {
  display: -webkit-box;
  overflow: hidden;
  font-size: 12px;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.export-panel {
  display: grid;
  gap: 18px;
  padding: 20px 22px 22px;
}

.export-format {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.export-format__item {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 58px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.035);
  color: var(--analysis-main);
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.export-format__item svg {
  width: 18px;
  height: 18px;
}

.export-format__item.is-active {
  border-color: rgba(34, 211, 238, 0.36);
  background: rgba(34, 211, 238, 0.1);
  color: #cffafe;
}

.export-field {
  display: grid;
  gap: 8px;
}

.export-field span {
  color: var(--analysis-soft);
  font-size: 12px;
}

.export-field select {
  min-height: 42px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--analysis-main);
  font: inherit;
  padding: 0 12px;
  outline: none;
}

.export-checks {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.export-checks label {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 42px;
  padding: 0 12px;
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  color: var(--analysis-main);
  font-size: 12px;
}

.export-checks input {
  accent-color: var(--analysis-cyan);
}

.export-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.export-summary span {
  min-width: 0;
  padding: 9px 10px;
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.025);
  color: var(--analysis-soft);
  font-size: 12px;
  text-align: center;
}

.export-panel__footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 4px;
}

/* ── Config Selector ──────────────────────────────────── */
.config-selector {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  min-width: 0;
}

.config-selector__select {
  min-height: 34px;
  max-width: 260px;
  padding: 6px 10px;
  border: 1px solid var(--analysis-border);
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--analysis-main);
  font: inherit;
  font-size: 13px;
  min-width: 180px;
  cursor: pointer;
  outline: none;
}

.config-selector__select:focus {
  border-color: var(--analysis-blue);
}

.config-selector__manage {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 34px;
  padding: 6px 10px;
  border: 1px solid var(--analysis-border);
  border-radius: 9px;
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
    height: auto;
    min-height: 0;
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

  .composer-topbar {
    align-items: stretch;
    flex-direction: column;
  }

  .config-selector,
  .config-selector__select {
    width: 100%;
    max-width: none;
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
    align-items: center;
  }

  .send-trigger {
    width: 42px;
    height: 42px;
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

  .engine-indicator {
    margin-left: 0;
    margin-right: 0;
  }

  .workbench-modal-overlay {
    padding: 12px;
  }

  .workbench-modal,
  .workbench-modal--prompts,
  .workbench-modal--preview {
    width: calc(100vw - 24px);
    max-height: calc(100vh - 24px);
  }

  .workbench-modal__header {
    align-items: flex-start;
    padding: 14px;
  }

  .prompt-modal-grid,
  .workbench-modal__body {
    padding: 12px;
  }

  .export-checks,
  .export-format {
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
