<template>
  <div class="task-command-page">
    <TaskControlBar
      :ai-status="aiStatus"
      :ai-status-text="aiStatusText"
      :all-connected="allConnected"
      :any-connected="anyConnected"
      :is-light="isLight"
      :timestamp-text="timestampText"
      :current-user="currentUserLabel"
      @toggle-theme="toggleTheme"
      @connect-all="handleConnectAll"
      @disconnect-all="handleDisconnectAll"
      @reset="handleRefresh"
    />

    <div class="task-command-layout">
      <aside class="task-rail">
        <section class="surface task-create">
          <div class="surface-heading">
            <div>
              <p class="eyebrow">任务入口</p>
              <h2>小呦任务分发</h2>
            </div>
            <span class="agent-pill">ceo</span>
          </div>
          <button class="create-launcher" type="button" @click="createDialog = true">
            <span>
              <i class="ri-add-line"></i>
            </span>
            <strong>新增协作任务</strong>
          </button>
        </section>

        <section class="surface task-list">
          <div class="surface-heading">
            <div>
              <p class="eyebrow">任务队列</p>
              <h2>活跃任务</h2>
            </div>
            <button class="icon-btn" type="button" title="刷新任务" @click="handleRefresh">
              <i class="ri-refresh-line"></i>
            </button>
          </div>

          <div ref="taskListScrollRef" class="task-list__body">
            <div v-if="tasksStore.loading" class="quiet-state">任务加载中...</div>
            <div v-else-if="tasks.length === 0" class="quiet-state">暂无任务，先创建一个协作目标。</div>
            <template v-else>
              <button
                v-for="task in tasks"
                :key="task.id"
                type="button"
                class="task-row"
                :class="{ active: selectedTask?.id === task.id }"
                :ref="el => setTaskRowRef(task.id, el as HTMLButtonElement | null)"
                @click="selectTask(task.id)"
              >
                <div class="task-row__top">
                  <strong>{{ task.title }}</strong>
                  <span class="status-chip" :class="`status-chip--${task.status}`">{{ statusText(task.status) }}</span>
                </div>
                <div class="task-row__meta">
                  <span>{{ task.progress || 0 }}%</span>
                  <span>{{ task.completed_subtask_count || completedCount(task) }}/{{ task.subtask_count || task.subtasks?.length || 0 }} 子任务</span>
                  <span>{{ formatTime(task.updated_at) }}</span>
                </div>
                <div class="mini-progress">
                  <span :style="{ width: `${task.progress || 0}%` }"></span>
                </div>
              </button>
            </template>
          </div>
        </section>
      </aside>

      <main class="mission-stage">
        <section v-if="selectedTask" class="surface mission-hero">
          <div class="mission-hero__head">
            <div class="mission-hero__copy">
              <p class="eyebrow">当前任务</p>
              <h1>{{ selectedTask.title }}</h1>
            </div>
            <span class="status-chip" :class="`status-chip--${selectedTask.status}`">{{ statusText(selectedTask.status) }}</span>
          </div>
          <div class="mission-hero__tips">
            <span v-for="tip in taskHeaderTips" :key="tip" class="mission-tip">{{ tip }}</span>
          </div>
          <div class="mission-hero__metrics">
            <div>
              <span>进度</span>
              <strong>{{ selectedTask.progress || 0 }}%</strong>
            </div>
            <div>
              <span>子任务</span>
              <strong>{{ completedCount(selectedTask) }}/{{ selectedTask.subtasks.length }}</strong>
            </div>
            <div>
              <span>成果</span>
              <strong>{{ selectedTask.outputs.length }}</strong>
            </div>
          </div>
        </section>

        <section v-if="selectedTask" class="surface mission-flow mission-flow--compact">
          <div class="mission-flow__compact-head">
            <div class="mission-flow__rail mission-flow__rail--compact">
              <article
                v-for="(step, index) in taskFlowSteps"
                :key="step.key"
                class="flow-step flow-step--compact"
                :class="`flow-step--${step.state}`"
              >
                <div class="flow-step__marker">
                  <span>{{ index + 1 }}</span>
                </div>
                <div class="flow-step__body">
                  <strong>{{ step.title }}</strong>
                </div>
              </article>
            </div>
            <button
              v-if="taskFlowCallout.actionLabel && taskFlowCallout.target"
              class="ghost-btn ghost-btn--compact mission-flow__jump"
              type="button"
              @click="scrollToWorkflowTarget(taskFlowCallout.target)"
            >
              <i class="ri-corner-down-right-line"></i>
              {{ taskFlowCallout.actionLabel }}
            </button>
          </div>
          <div class="mission-flow__hint">
            <span class="mission-flow__label">当前动作</span>
            <strong>{{ taskFlowCallout.title }}</strong>
            <p>{{ taskFlowCallout.detail }}</p>
          </div>
        </section>

        <section v-if="selectedTask" ref="executionSectionRef" class="surface subtask-board">
          <div class="surface-heading">
            <div>
              <p class="eyebrow">执行板</p>
              <h2>子任务和负责人</h2>
            </div>
            <button class="scan-btn" type="button" :disabled="scanningOutputs" @click="scanOutputs">
              <i class="ri-folder-search-line"></i>
              {{ scanningOutputs ? '扫描中' : '扫描成果' }}
            </button>
          </div>

          <div v-if="selectedTask.subtasks.length === 0" class="quiet-state">等待小呦拆解计划。</div>
          <div v-else class="subtask-grid">
            <article v-for="subtask in selectedTask.subtasks" :key="subtask.id" class="subtask-card">
              <div class="subtask-card__head">
                <span class="agent-token">{{ agentName(subtask.assigned_agent_id) }}</span>
                <span class="status-chip" :class="`status-chip--${subtask.status}`">{{ subtaskStatusText(subtask.status) }}</span>
              </div>
              <h3>{{ subtask.title }}</h3>
              <p>{{ subtask.description }}</p>
              <div class="subtask-progress">
                <span :style="{ width: `${subtask.progress || 0}%` }"></span>
              </div>
              <div class="subtask-meta">
                <span>{{ subtask.progress || 0 }}%</span>
                <span>{{ subtask.session_key }}</span>
              </div>
              <p v-if="subtask.error" class="error-line">{{ subtask.error }}</p>
              <div class="subtask-actions">
                <button class="ghost-btn ghost-btn--compact" type="button" @click="retrySubtask(subtask.id)">
                  <i class="ri-restart-line"></i>
                  重试
                </button>
                <button class="ghost-btn ghost-btn--compact" type="button" :disabled="subtask.status === 'completed'" @click="completeSubtask(subtask.id)">
                  <i class="ri-check-line"></i>
                  标记完成
                </button>
              </div>
            </article>
          </div>
        </section>

        <section
          v-if="selectedTask?.subtasks.length"
          class="surface team-live"
          :class="{
            'team-live--active': liveSubtaskCount > 0,
            'team-live--changed': recentTeamChangeCount > 0,
          }"
        >
          <div class="surface-heading">
            <div>
              <p class="eyebrow">协作现场</p>
              <h2>团队成员执行细节</h2>
            </div>
            <div class="surface-heading__meta">
              <span class="status-chip status-chip--running" :class="{ 'status-chip--live': liveSubtaskCount > 0 }">
                {{ liveSubtaskCount }} 名执行中
              </span>
              <span class="status-chip" :class="{ 'status-chip--pulse': recentTeamChangeCount > 0 }">
                刚更新 {{ recentTeamChangeCount }}
              </span>
              <span class="status-chip">产出 {{ selectedTask.outputs.length }}</span>
            </div>
          </div>
          <div class="team-live-grid">
            <article
              v-for="subtask in selectedTask.subtasks"
              :key="subtask.id"
              class="member-card"
              :class="{
                'member-card--active': isSubtaskWorking(subtask),
                'member-card--changed': isSubtaskRecentlyUpdated(subtask),
              }"
            >
              <div class="member-card__top">
                <span class="member-avatar">{{ agentInitial(subtask.assigned_agent_id) }}</span>
                <div>
                  <strong>{{ agentName(subtask.assigned_agent_id) }}</strong>
                  <small>{{ subtask.title }}</small>
                </div>
                <div class="member-card__signals">
                  <span v-if="isSubtaskWorking(subtask)" class="member-live-badge">
                    <span class="member-live-badge__dot"></span>
                    执行中
                  </span>
                  <span v-else-if="isSubtaskRecentlyUpdated(subtask)" class="member-live-badge member-live-badge--changed">
                    刚更新
                  </span>
                  <i class="ri-message-3-line"></i>
                </div>
              </div>
              <div class="member-card__activity">
                <span class="status-chip" :class="`status-chip--${subtask.status}`">{{ subtaskStatusText(subtask.status) }}</span>
                <span>{{ subtask.progress || 0 }}%</span>
              </div>
              <div class="member-card__focus">
                <span class="member-card__label">当前在做</span>
                <p>{{ agentWorkbench(subtask).focus }}</p>
              </div>
              <div class="member-card__focus member-card__focus--muted">
                <span class="member-card__label">交付目标</span>
                <p>{{ subtask.expected_output || subtask.description }}</p>
              </div>
              <div v-if="agentWorkbench(subtask).latestOutput" class="member-card__file">
                <button
                  type="button"
                  class="member-file-pill"
                  @click="agentWorkbench(subtask).latestOutput && previewOutput(agentWorkbench(subtask).latestOutput)"
                >
                  <i :class="fileIcon(agentWorkbench(subtask).latestOutput?.name || '')"></i>
                  <span>
                    <strong>{{ agentWorkbench(subtask).latestOutput?.name }}</strong>
                    <small>{{ agentWorkbench(subtask).latestOutput ? formatOutputTime(agentWorkbench(subtask).latestOutput) : '--' }}</small>
                  </span>
                </button>
              </div>
              <div class="member-card__trail">
                <div
                  v-for="trail in agentWorkbench(subtask).trail"
                  :key="trail.id"
                  class="member-trail"
                  :class="`member-trail--${trail.tone}`"
                >
                  <span class="member-trail__dot"></span>
                  <div>
                    <strong>{{ trail.headline }}</strong>
                    <p>{{ trail.detail }}</p>
                  </div>
                </div>
              </div>
              <div class="member-card__footer">
                <span>{{ agentWorkbench(subtask).outputCount }} 个文件</span>
                <span>{{ agentWorkbench(subtask).statusNote }}</span>
                <button class="ghost-btn ghost-btn--compact" type="button" @click="openMemberConversation(subtask)">
                  查看细节
                </button>
              </div>
            </article>
          </div>
        </section>

        <section
          v-if="selectedTask && needsPlan(selectedTask)"
          ref="planSectionRef"
          class="surface plan-console"
          :class="{ 'plan-console--focus': taskFlowCurrentKey === 'plan' }"
        >
          <div class="surface-heading">
            <div>
              <p class="eyebrow">拆解计划</p>
              <h2>应用小呦返回的 JSON</h2>
            </div>
            <div class="plan-heading-actions">
              <button
                v-if="selectedTask.status === 'failed'"
                class="ghost-btn"
                type="button"
                :disabled="rerunningPlan"
                @click="rerunPlan"
              >
                <i class="ri-restart-line"></i>
                {{ rerunningPlan ? '重试中' : '重新拆解' }}
              </button>
              <button class="ghost-btn" type="button" @click="fillFromCoordinator">
                <i class="ri-robot-line"></i>
                使用小呦最新回复
              </button>
            </div>
          </div>
          <textarea
            v-model="planDraft"
            class="field field--plan"
            placeholder="粘贴小呦返回的结构化 JSON，平台会校验并自动派发子任务。"
          ></textarea>
          <div class="plan-actions">
            <span>状态：{{ statusText(selectedTask.status) }}</span>
            <button class="primary-btn" type="button" :disabled="applyingPlan || !planDraft.trim()" @click="applyPlan">
              <i class="ri-node-tree"></i>
              {{ applyingPlan ? '应用中' : '校验并派发' }}
            </button>
          </div>
        </section>

        <section v-if="!selectedTask" class="surface empty-mission">
          <i class="ri-route-line"></i>
          <h2>选择或创建一个任务</h2>
          <p>平台会把任务交给小呦拆解，再由系统派发给研究、产品、研发和测试 Agent。</p>
        </section>
      </main>

      <aside class="task-inspector">
        <section class="surface">
          <div class="surface-heading">
            <div>
              <p class="eyebrow">事件流</p>
              <h2>关键动向与文件产出</h2>
            </div>
            <span class="status-chip">{{ importantEventInsights.length }} 条关键动向</span>
          </div>
          <div v-if="importantEventInsights.length === 0" class="quiet-state">暂无关键事件。</div>
          <div v-else ref="eventListRef" class="event-list event-list--rich">
            <article
              v-for="insight in importantEventInsights"
              :key="insight.id"
              class="event-item event-item--rich"
              :class="`event-item--${insight.tone}`"
            >
              <span class="event-dot"></span>
              <div class="event-item__body">
                <div class="event-item__top">
                  <span class="event-badge">{{ insight.badge }}</span>
                  <small>{{ formatTime(insight.timestamp) }}</small>
                </div>
                <strong>{{ insight.headline }}</strong>
                <p>{{ insight.detail }}</p>
                <div class="event-item__meta">
                  <span>{{ insight.actor }}</span>
                  <span v-if="insight.fileLabel">{{ insight.fileLabel }}</span>
                </div>
                <button
                  v-if="insight.linkedOutput"
                  class="ghost-btn ghost-btn--compact"
                  type="button"
                  @click="previewOutput(insight.linkedOutput)"
                >
                  查看文件
                </button>
              </div>
            </article>
          </div>
        </section>

        <section class="surface outputs-panel">
          <div class="surface-heading">
            <div>
              <p class="eyebrow">成果资产</p>
              <h2>任务归属</h2>
            </div>
          </div>
          <div v-if="!selectedTask?.outputs?.length" class="quiet-state">暂无绑定成果。</div>
          <button
            v-for="output in orderedTaskOutputs"
            :key="output.id"
            type="button"
            class="output-row"
            :class="{ 'output-row--summary': isSummaryOutput(output) }"
            @click="previewOutput(output)"
          >
            <i :class="fileIcon(output.name)"></i>
            <span class="output-row__content">
              <strong>{{ output.name }}</strong>
              <small>{{ agentName(output.agent_id || '') }}</small>
            </span>
            <span v-if="isSummaryOutput(output)" class="output-badge">汇总报告</span>
          </button>
        </section>

        <section
          v-if="selectedTask"
          ref="reviewPanelRef"
          class="surface review-panel"
          :class="{ 'review-panel--focus': taskFlowCurrentKey === 'review' }"
        >
          <div class="surface-heading">
            <div>
              <p class="eyebrow">汇总验收</p>
              <h2>小呦收口</h2>
            </div>
          </div>
          <p class="review-hint">{{ reviewHint }}</p>
          <textarea v-model="summaryDraft" class="field field--textarea" placeholder="最终验收备注，可留空。"></textarea>
          <div class="review-actions">
            <button class="ghost-btn" type="button" :disabled="!canRequestSummary" @click="finalizeTask">
              <i class="ri-file-list-3-line"></i>
              {{ reviewRequestButtonText }}
            </button>
            <button class="primary-btn" type="button" :disabled="selectedTask.status === 'completed'" @click="completeTask">
              <i class="ri-archive-line"></i>
              验收归档
            </button>
          </div>
        </section>
      </aside>
    </div>

    <el-dialog v-model="previewDialog" :title="previewFileItem?.name || '成果预览'" width="880px">
      <div v-if="previewLoading" class="preview-state">加载中...</div>
      <div v-else-if="previewError" class="preview-state preview-state--error">{{ previewError }}</div>
      <div v-else-if="previewFileItem" class="preview-content">
        <div v-if="previewType === 'markdown'" class="markdown-rendered" v-html="renderPreview()"></div>
        <pre v-else>{{ previewContent }}</pre>
      </div>
    </el-dialog>

    <el-dialog v-model="createDialog" title="新增协作任务" width="560px" class="task-create-dialog">
      <div class="dialog-create-form">
        <div class="dialog-create-form__head">
          <span class="agent-pill">ceo</span>
          <p>任务会先交给小呦拆解，再由 Claude Runtime 队列派发给执行 Agent。</p>
        </div>
        <label>
          <span>任务标题</span>
          <input v-model="createForm.title" class="field" placeholder="例如：东南亚智能客服上线方案" />
        </label>
        <label>
          <span>任务描述</span>
          <textarea v-model="createForm.description" class="field field--textarea" placeholder="描述目标、背景和期望交付物"></textarea>
        </label>
        <label>
          <span>优先级</span>
          <select v-model="createForm.priority" class="field field--select" aria-label="任务优先级">
            <option value="normal">普通</option>
            <option value="high">高优先级</option>
            <option value="urgent">紧急</option>
          </select>
        </label>
      </div>
      <template #footer>
        <div class="dialog-actions">
          <button class="ghost-btn" type="button" :disabled="creating" @click="createDialog = false">取消</button>
          <button class="primary-btn" type="button" :disabled="creating || !canCreateTask" @click="createTask">
            <i class="ri-send-plane-line"></i>
            {{ creating ? '创建中' : '创建任务' }}
          </button>
        </div>
      </template>
    </el-dialog>

    <el-dialog v-model="memberDialog" width="760px" class="member-dialog">
      <template #header>
        <div class="member-dialog__header" v-if="activeMemberSubtask">
          <span class="member-avatar">{{ agentInitial(activeMemberSubtask.assigned_agent_id) }}</span>
          <div>
            <p class="eyebrow">执行日志</p>
            <h2>{{ agentName(activeMemberSubtask.assigned_agent_id) }} · {{ activeMemberSubtask.title }}</h2>
          </div>
          <span class="status-chip" :class="`status-chip--${activeMemberSubtask.status}`">{{ subtaskStatusText(activeMemberSubtask.status) }}</span>
        </div>
      </template>
      <div v-if="activeMemberSubtask" class="member-chat-shell">
        <div class="member-story">
          <div class="member-story__toolbar">
            <div class="member-story__chips">
              <span>progress {{ activeMemberSubtask.progress || 0 }}%</span>
              <span>logs {{ activeMemberTerminalLogs.length }}</span>
              <span>outputs {{ activeMemberStoryOutputs.length }}</span>
              <span>run {{ activeMemberRunId ? shortRunId(activeMemberRunId) : '--' }}</span>
            </div>
            <div class="member-story__actions">
              <button class="ghost-btn ghost-btn--compact" type="button" :disabled="memberLogsLoading" @click="fetchMemberRunLogs(activeMemberSubtask.id)">
                <i class="ri-refresh-line"></i>
                {{ memberLogsLoading ? '刷新中' : '刷新状态' }}
              </button>
              <button
                v-if="activeMemberRunId && ['assigned', 'running'].includes(activeMemberSubtask.status)"
                class="ghost-btn ghost-btn--compact"
                type="button"
                @click="cancelActiveMemberRun"
              >
                <i class="ri-stop-circle-line"></i>
                停止运行
              </button>
              <button class="primary-btn primary-btn--compact" type="button" @click="memberLogsDrawer = true">
                <i class="ri-terminal-box-line"></i>
                原始日志
              </button>
            </div>
          </div>

          <div v-if="memberLogsError" class="member-story__alert">
            <i class="ri-error-warning-line"></i>
            {{ memberLogsError }}
          </div>

          <section class="member-story__overview">
            <div>
              <p class="eyebrow">执行概览</p>
              <h3>{{ activeMemberStoryTitle }}</h3>
              <p>{{ activeMemberStorySummary }}</p>
            </div>
            <button
              v-if="activeMemberStoryOutputs[0]"
              class="story-output-hero"
              type="button"
              @click="previewOutput(activeMemberStoryOutputs[0])"
            >
              <i :class="fileIcon(activeMemberStoryOutputs[0].name)"></i>
              <span>
                <strong>{{ activeMemberStoryOutputs[0].name }}</strong>
                <small>{{ formatOutputTime(activeMemberStoryOutputs[0]) }}</small>
              </span>
            </button>
          </section>

          <section class="member-story__timeline">
            <div class="member-story__section-head">
              <div>
                <p class="eyebrow">关键步骤</p>
                <h3>执行故事线</h3>
              </div>
              <span>{{ activeMemberStorySteps.length }} 个节点</span>
            </div>
            <div class="story-step-list">
              <article
                v-for="step in activeMemberStorySteps"
                :key="step.key"
                class="story-step"
                :class="`story-step--${step.tone}`"
              >
                <span class="story-step__icon">
                  <i :class="step.icon"></i>
                </span>
                <div>
                  <div class="story-step__top">
                    <strong>{{ step.title }}</strong>
                    <span>{{ step.count > 1 ? `${step.count} 次` : formatLogTime(step.timestampMs) }}</span>
                  </div>
                  <p>{{ step.detail }}</p>
                </div>
              </article>
            </div>
          </section>

          <section class="member-story__outputs">
            <div class="member-story__section-head">
              <div>
                <p class="eyebrow">产出</p>
                <h3>报告和文件</h3>
              </div>
              <span>{{ activeMemberStoryOutputs.length }} 个文件</span>
            </div>
            <div v-if="activeMemberStoryOutputs.length === 0" class="member-story__empty">
              暂无报告产出，完成后会在这里显示入口。
            </div>
            <div v-else class="story-output-list">
              <button
                v-for="output in activeMemberStoryOutputs"
                :key="output.id"
                class="story-output-row"
                type="button"
                @click="previewOutput(output)"
              >
                <i :class="fileIcon(output.name)"></i>
                <span>
                  <strong>{{ output.name }}</strong>
                  <small>{{ formatOutputTime(output) }}</small>
                </span>
                <i class="ri-arrow-right-up-line"></i>
              </button>
            </div>
          </section>
        </div>
      </div>
    </el-dialog>

    <el-drawer
      v-model="memberLogsDrawer"
      direction="rtl"
      size="min(820px, 92vw)"
      class="member-logs-drawer"
      append-to-body
    >
      <template #header>
        <div class="member-logs-drawer__header" v-if="activeMemberSubtask">
          <div>
            <p class="eyebrow">Claude 原始日志</p>
            <h2>{{ agentName(activeMemberSubtask.assigned_agent_id) }} · {{ activeMemberSubtask.title }}</h2>
          </div>
          <button class="ghost-btn ghost-btn--compact" type="button" :disabled="memberLogsLoading" @click="fetchMemberRunLogs(activeMemberSubtask.id)">
            <i class="ri-refresh-line"></i>
            {{ memberLogsLoading ? 'sync' : 'refresh' }}
          </button>
        </div>
      </template>
      <div v-if="activeMemberSubtask" class="member-terminal">
        <div class="member-terminal__bar">
          <span class="member-terminal__pill">claude-runtime</span>
          <span>status={{ subtaskStatusText(activeMemberSubtask.status) }}</span>
          <span>progress={{ activeMemberSubtask.progress || 0 }}%</span>
          <span>run={{ activeMemberRunId || '--' }}</span>
          <span>session={{ activeMemberSessionId || '--' }}</span>
          <span>logs={{ activeMemberTerminalLogs.length }}</span>
          <span class="member-terminal__context">task={{ activeMemberSubtask.description }}</span>
        </div>
        <div ref="memberLogListRef" class="member-terminal__screen">
          <div v-if="memberLogsLoading && activeMemberTerminalLogs.length === 0" class="member-terminal__empty">
            正在同步 Claude Runtime 日志...
          </div>
          <div v-else-if="memberLogsError && activeMemberTerminalLogs.length === 0" class="member-terminal__empty member-terminal__empty--error">
            {{ memberLogsError }}
          </div>
          <div v-else-if="activeMemberTerminalLogs.length === 0" class="member-terminal__empty">
            暂无执行日志。Claude Runtime 开始运行后，这里会实时显示步骤、工具、文件和结果。
          </div>
          <article
            v-for="log in activeMemberTerminalLogs"
            :key="log.id"
            class="terminal-entry"
            :class="`terminal-entry--${log.tone}`"
          >
            <div class="terminal-entry__meta">
              <span class="terminal-entry__time">{{ formatLogTime(log.timestampMs || log.timestamp * 1000) }}</span>
              <span class="terminal-entry__prompt">{{ terminalPrompt(log) }}</span>
              <span v-if="log.runId" class="terminal-entry__run">{{ shortRunId(log.runId) }}</span>
            </div>
            <pre
              v-if="log.sourceType === 'agent.assistant'"
              class="terminal-entry__content terminal-entry__content--assistant"
              :class="{ 'terminal-entry__content--expanded': expandedLogIds.has(log.id) }"
            >{{ log.content }}</pre>
            <pre v-else class="terminal-entry__content">{{ log.content }}</pre>
            <button
              v-if="log.sourceType === 'agent.assistant' && isLongTerminalLog(log)"
              class="terminal-entry__expand"
              type="button"
              @click="toggleTerminalLog(log.id)"
            >
              {{ expandedLogIds.has(log.id) ? '收起输出' : '展开完整输出' }}
            </button>
            <div v-if="log.fileLabel || log.linkedOutput" class="terminal-entry__footer">
              <span v-if="log.fileLabel" class="terminal-entry__file">{{ log.fileLabel }}</span>
              <button
                v-if="log.linkedOutput"
                class="ghost-btn ghost-btn--compact"
                type="button"
                @click="previewOutput(log.linkedOutput)"
              >
                打开文件
              </button>
            </div>
          </article>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import MarkdownIt from 'markdown-it'
import TaskControlBar from '@/components/task-center/TaskControlBar.vue'
import { taskApi } from '@/api/tasks'
import type { AgentRunLog } from '@/api/tasks'
import { useAuthStore } from '@/stores/auth'
import { useMultiAgentChatStore } from '@/stores/multiAgentChat'
import { useTasksStore } from '@/stores/tasks'
import { useThemeStore } from '@/stores/theme'
import type { Subtask, Task, TaskEvent, TaskOutput, TaskStatus, SubtaskStatus } from '@/types/task'

const TASK_EVENT_LIMIT = 400
const TASK_SYNC_DEBOUNCE_MS = 1200
const TASK_POLL_INTERVAL_MS = 20000
const MEMBER_ACTIVE_WINDOW_MS = 45000
const MEMBER_CHANGE_WINDOW_MS = 12000
const EVENT_SYNC_TYPES = new Set([
  'plan.accepted',
  'plan.invalid',
  'task.dispatch.queued',
  'agent.done',
  'agent.error',
  'agent.cancelled',
  'agent.orphaned',
  'outputs.bound',
  'task.completed',
  'summary.request.queued',
])

const tasksStore = useTasksStore()
const multiAgentStore = useMultiAgentChatStore()
const themeStore = useThemeStore()
const authStore = useAuthStore()
const route = useRoute()
const md = new MarkdownIt({ html: false, linkify: true, typographer: true })

const createForm = reactive({
  title: '',
  description: '',
  priority: 'normal',
})
const createDialog = ref(false)
const creating = ref(false)
const applyingPlan = ref(false)
const rerunningPlan = ref(false)
const scanningOutputs = ref(false)
const finalizingSummary = ref(false)
const planDraft = ref('')
const summaryDraft = ref('')
const currentTimeMs = ref(Date.now())
const previewDialog = ref(false)
const previewFileItem = ref<TaskOutput | null>(null)
const previewContent = ref('')
const previewType = ref('')
const previewLoading = ref(false)
const previewError = ref<string | null>(null)
const memberDialog = ref(false)
const memberLogsDrawer = ref(false)
const activeMemberSubtaskId = ref('')
const memberRunLogs = ref<Record<string, AgentRunLog[]>>({})
const memberLogsLoading = ref(false)
const memberLogsError = ref('')
const expandedLogIds = ref(new Set<string>())
const eventListRef = ref<HTMLElement | null>(null)
const memberLogListRef = ref<HTMLElement | null>(null)
const taskListScrollRef = ref<HTMLElement | null>(null)
const planSectionRef = ref<HTMLElement | null>(null)
const executionSectionRef = ref<HTMLElement | null>(null)
const reviewPanelRef = ref<HTMLElement | null>(null)
let clockTimer: ReturnType<typeof setInterval> | null = null
let refreshTimer: ReturnType<typeof setInterval> | null = null
let taskEventSource: EventSource | null = null
let taskSyncTimer: ReturnType<typeof setTimeout> | null = null
let taskSyncInFlight = false
let pendingTaskSyncId: string | null = null
let pendingTaskSyncNeedsEvents = false
type EventTone = 'neutral' | 'progress' | 'output' | 'success' | 'warning' | 'danger'
type TimelineInsight = {
  id: number | string
  timestamp: number
  tone: EventTone
  badge: string
  headline: string
  detail: string
  actor: string
  fileLabel: string | null
  linkedOutput: TaskOutput | null
}
type AgentWorkbenchSummary = {
  focus: string
  trail: TimelineInsight[]
  latestOutput: TaskOutput | null
  outputCount: number
  statusNote: string
}
type TerminalLogEntry = {
  id: string
  timestamp: number
  timestampMs: number
  tone: EventTone
  label: string
  content: string
  fileLabel: string | null
  linkedOutput: TaskOutput | null
  sourceType: string
  runId: string
}
type MemberStoryStep = {
  key: string
  title: string
  detail: string
  tone: EventTone
  icon: string
  count: number
  timestampMs: number
}
type WorkflowTarget = 'plan' | 'execution' | 'review'
type FlowStepState = 'done' | 'current' | 'pending'
type TaskFlowStep = {
  key: 'create' | 'plan' | 'execute' | 'review' | 'archive'
  title: string
  description: string
  state: FlowStepState
  stateLabel: string
}
type TaskFlowCallout = {
  title: string
  detail: string
  actionLabel: string | null
  target: WorkflowTarget | null
}

const tasks = computed(() => tasksStore.tasks)
const selectedTask = computed(() => tasksStore.selectedTask)
const selectedTaskEvents = computed(() => selectedTask.value?.events || [])
const selectedTaskOutputs = computed(() => selectedTask.value?.outputs || [])
const isLight = computed(() => themeStore.isLight)
const runtimeStatus = ref<{ healthy: boolean; running: number; queued: number; maxConcurrency: number; maxTurns?: number } | null>(null)
const runtimeStreamConnected = ref(false)
const allConnected = computed(() => !!runtimeStatus.value?.healthy)
const anyConnected = computed(() => !!runtimeStatus.value?.healthy)
const aiStatus = computed<'connected' | 'disconnected' | 'error'>(() => runtimeStatus.value?.healthy ? 'connected' : 'disconnected')
const aiStatusText = computed(() => {
  if (!runtimeStatus.value?.healthy) return 'Claude Runtime 未就绪'
  return `Claude Runtime 就绪 · 运行 ${runtimeStatus.value.running} / 排队 ${runtimeStatus.value.queued} / 并发 ${runtimeStatus.value.maxConcurrency}`
})
const timestampText = computed(() => new Date(currentTimeMs.value).toLocaleString('zh-CN', { hour12: false }))
const currentUserLabel = computed(() => authStore.user?.username || 'Admin')
const canCreateTask = computed(() => createForm.title.trim().length > 0 && createForm.description.trim().length > 0)
const canFinalize = computed(() => !!selectedTask.value?.subtasks.length && selectedTask.value.subtasks.every(subtask => subtask.status === 'completed'))
const hasReviewSummary = computed(() => !!selectedTask.value?.summary?.trim())
const canRequestSummary = computed(() =>
  !!selectedTask.value &&
  canFinalize.value &&
  !finalizingSummary.value &&
  selectedTask.value.status !== 'reviewing' &&
  selectedTask.value.status !== 'completed' &&
  !hasReviewSummary.value
)
const reviewRequestButtonText = computed(() => {
  if (finalizingSummary.value) return '请求中'
  if (selectedTask.value?.status === 'reviewing' || hasReviewSummary.value) return '已请求汇总'
  return '请求汇总'
})
const activeMemberSubtask = computed(() => selectedTask.value?.subtasks.find(subtask => subtask.id === activeMemberSubtaskId.value) || null)
const activeMemberRunId = computed(() => {
  const subtask = activeMemberSubtask.value
  if (!subtask) return ''
  const latestLog = (memberRunLogs.value[subtask.id] || []).at(-1)
  const contextRunId = typeof subtask.context_json?.lastRunId === 'string' ? subtask.context_json.lastRunId : ''
  return latestLog?.run_id || contextRunId
})
const activeMemberSessionId = computed(() => {
  const subtask = activeMemberSubtask.value
  if (!subtask) return ''
  const latestLog = [...(memberRunLogs.value[subtask.id] || [])]
    .reverse()
    .find(log => runLogString(log, 'sessionId'))
  const contextSessionId = typeof subtask.context_json?.lastClaudeSessionId === 'string' ? subtask.context_json.lastClaudeSessionId : ''
  return latestLog ? runLogString(latestLog, 'sessionId') : contextSessionId
})
const taskRowRefs: Record<string, HTMLButtonElement | null> = {}

const agentLabels: Record<string, string> = {
  xiaomu: '小呦',
  xiaoyan: '研究员',
  xiaochan: '产品经理',
  xiaokai: '研发工程师',
  xiaoce: '测试员',
}

const taskStatusLabels: Record<TaskStatus, string> = {
  draft: '草稿',
  planning: '拆解中',
  dispatching: '派发中',
  running: '执行中',
  reviewing: '待验收',
  completed: '已完成',
  failed: '异常',
  cancelled: '已取消',
}

const subtaskStatusLabels: Record<SubtaskStatus, string> = {
  pending: '待派发',
  assigned: '已分配',
  running: '执行中',
  blocked: '阻塞',
  completed: '完成',
  failed: '失败',
}

const IMPORTANT_EVENT_TYPES = new Set([
  'task.created',
  'plan.request.queued',
  'plan.accepted',
  'plan.invalid',
  'task.dispatch.queued',
  'subtask.retry.queued',
  'agent.run.queued',
  'agent.start',
  'outputs.bound',
  'outputs.scanned',
  'agent.done',
  'agent.error',
  'agent.orphaned',
  'agent.cancelled',
  'summary.request.queued',
  'task.completed',
  'subtask.completed',
])

const EVENT_BADGES: Record<string, string> = {
  'task.created': '创建',
  'plan.request.queued': '拆解请求',
  'plan.accepted': '拆解完成',
  'plan.invalid': '计划异常',
  'task.dispatch.queued': '派发',
  'subtask.retry.queued': '重试',
  'agent.run.queued': '排队',
  'agent.start': '开始',
  'agent.assistant': '输出',
  'agent.tool': '工具',
  'outputs.bound': '文件',
  'outputs.scanned': '扫描',
  'agent.done': '完成',
  'agent.error': '异常',
  'agent.orphaned': '恢复',
  'agent.cancelled': '取消',
  'summary.request.queued': '汇总',
  'task.completed': '归档',
  'subtask.completed': '完成',
}

function cleanText(value: unknown, max = 120) {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim()
  if (!normalized) return '暂无细节'
  return normalized.length > max ? `${normalized.slice(0, max - 1)}…` : normalized
}

function eventPayload(event: TaskEvent) {
  return event.payload_json && typeof event.payload_json === 'object'
    ? event.payload_json
    : {}
}

function payloadString(payload: Record<string, unknown>, key: string) {
  const value = payload[key]
  return typeof value === 'string' && value.trim() ? value.trim() : ''
}

function payloadRunId(event: TaskEvent) {
  return payloadString(eventPayload(event), 'runId')
}

function fileBaseName(path = '') {
  return path.split('/').filter(Boolean).at(-1) || path
}

function isSummaryOutput(output: TaskOutput) {
  if (!output) return false
  if (output.agent_id === 'xiaomu' && !output.subtask_id) return true
  return /汇总|总结|final|summary/i.test(`${output.name || ''} ${output.path || ''}`)
}

function formatOutputTime(output: TaskOutput) {
  if (output.mtime) return formatMsTime(output.mtime)
  return formatTime(output.created_at)
}

function eventTone(type: string): EventTone {
  if (['agent.error', 'plan.invalid', 'agent.cancelled'].includes(type)) return 'danger'
  if (['outputs.bound'].includes(type)) return 'output'
  if (['agent.done', 'task.completed', 'subtask.completed'].includes(type)) return 'success'
  if (['subtask.retry.queued', 'agent.run.queued', 'summary.request.queued', 'task.dispatch.queued'].includes(type)) return 'warning'
  if (['agent.start', 'agent.tool', 'agent.assistant', 'outputs.scanned'].includes(type)) return 'progress'
  return 'neutral'
}

function eventPaths(event: TaskEvent) {
  const payload = eventPayload(event)
  const values = new Set<string>()
  const directPath = payloadString(payload, 'path') || payloadString(payload, 'outputPath')
  if (directPath) values.add(directPath)
  const files = Array.isArray(payload.files) ? payload.files : []
  for (const item of files) {
    if (!item || typeof item !== 'object') continue
    const path = typeof (item as { path?: unknown }).path === 'string' ? String((item as { path?: unknown }).path) : ''
    if (path) values.add(path)
  }
  return [...values]
}

function resolveOutputForEvent(event: TaskEvent, outputs: TaskOutput[]) {
  const paths = eventPaths(event)
  for (const path of paths) {
    const matched = outputs.find(output => output.path === path)
    if (matched) return matched
  }

  if (['outputs.bound', 'agent.done'].includes(event.type) && event.subtask_id) {
    return outputs.find(output => output.subtask_id === event.subtask_id) || null
  }

  return null
}

function insightHeadline(event: TaskEvent) {
  switch (event.type) {
    case 'outputs.bound':
      return '产生了新的文件成果'
    case 'agent.done':
      return 'Agent 已提交阶段结果'
    case 'agent.error':
      return '执行过程中出现异常'
    case 'agent.start':
      return 'Agent 开始执行'
    case 'agent.run.queued':
      return '进入 Claude Runtime 队列'
    case 'subtask.retry.queued':
      return '子任务已重新入队'
    case 'plan.accepted':
      return '拆解计划通过校验'
    case 'summary.request.queued':
      return '最终汇总已入队'
    case 'task.completed':
      return '任务已归档'
    default:
      return EVENT_BADGES[event.type] || event.type
  }
}

function terminalEventLabel(event: TaskEvent) {
  switch (event.type) {
    case 'agent.start':
      return 'START'
    case 'agent.assistant':
      return 'CLAUDE'
    case 'agent.tool':
      return 'TOOL'
    case 'outputs.bound':
      return 'OUTPUT'
    case 'agent.done':
      return 'DONE'
    case 'agent.error':
      return 'ERROR'
    case 'subtask.retry.queued':
      return 'RETRY'
    case 'agent.run.queued':
      return 'QUEUE'
    default:
      return String(EVENT_BADGES[event.type] || event.type).toUpperCase()
  }
}

function terminalEventContent(event: TaskEvent) {
  const payload = eventPayload(event)
  if (event.type === 'agent.tool') {
    const toolName = payloadString(payload, 'toolName')
    return toolName ? `invoke readonly tool: ${toolName}` : event.message
  }
  if (event.type === 'agent.assistant') {
    return String(event.message || '')
  }
  return String(event.message || '').trim()
}

function mergeAssistantContent(previous: string, incoming: string) {
  if (!previous) return incoming
  if (!incoming) return previous
  if (incoming.startsWith(previous)) return incoming
  if (previous.endsWith(incoming)) return previous
  return `${previous}${incoming}`
}

function runLogPayload(log: AgentRunLog) {
  return log.payload_json && typeof log.payload_json === 'object'
    ? log.payload_json
    : {}
}

function runLogString(log: AgentRunLog, key: string) {
  const value = runLogPayload(log)[key]
  return typeof value === 'string' && value.trim() ? value.trim() : ''
}

function runLogTone(type: string): EventTone {
  if (['error', 'cancelled'].includes(type)) return 'danger'
  if (['done', 'result'].includes(type)) return 'success'
  if (['output'].includes(type)) return 'output'
  if (['queue'].includes(type)) return 'warning'
  if (['start', 'system', 'tool', 'assistant.delta', 'assistant.snapshot'].includes(type)) return 'progress'
  return 'neutral'
}

function runLogLabel(type: string) {
  const labels: Record<string, string> = {
    queue: 'QUEUE',
    start: 'START',
    system: 'SYSTEM',
    tool: 'TOOL',
    'assistant.delta': 'CLAUDE',
    'assistant.snapshot': 'CLAUDE',
    output: 'OUTPUT',
    result: 'RESULT',
    done: 'DONE',
    error: 'ERROR',
    cancelled: 'CANCEL',
  }
  return labels[type] || type.toUpperCase()
}

function runLogOutput(log: AgentRunLog, outputs: TaskOutput[]) {
  const path = runLogString(log, 'path') || runLogString(log, 'outputPath')
  if (!path) return null
  return outputs.find(output => output.path === path) || null
}

function appendMemberRunLog(log: AgentRunLog) {
  const subtaskId = log.subtask_id || ''
  if (!subtaskId) return
  const current = memberRunLogs.value[subtaskId] || []
  const nextMap = new Map<number, AgentRunLog>()
  for (const item of current) nextMap.set(Number(item.id), item)
  nextMap.set(Number(log.id), log)
  memberRunLogs.value = {
    ...memberRunLogs.value,
    [subtaskId]: [...nextMap.values()].sort((a, b) => Number(a.id) - Number(b.id)),
  }
}

function normalizeStreamRunLog(value: unknown): AgentRunLog | null {
  if (!value || typeof value !== 'object') return null
  const item = value as Partial<AgentRunLog>
  if (item.id == null || !item.run_id || !item.task_id || !item.type) return null
  return {
    id: Number(item.id),
    run_id: String(item.run_id),
    task_id: String(item.task_id),
    subtask_id: item.subtask_id || null,
    agent_id: item.agent_id || null,
    type: String(item.type),
    message: String(item.message || ''),
    payload_json: item.payload_json || null,
    created_at: Number(item.created_at || Math.floor(Date.now() / 1000)),
    created_at_ms: Number(item.created_at_ms || Date.now()),
  }
}

function toTimelineInsight(event: TaskEvent, outputs = selectedTaskOutputs.value): TimelineInsight {
  const output = resolveOutputForEvent(event, outputs)
  const paths = eventPaths(event)
  const files = output?.name
    ? output.name
    : paths.length > 0
      ? paths.map(fileBaseName).join(' / ')
      : null

  return {
    id: event.id,
    timestamp: Number(event.created_at || 0),
    tone: eventTone(event.type),
    badge: EVENT_BADGES[event.type] || event.type,
    headline: insightHeadline(event),
    detail: cleanText(event.message, 160),
    actor: agentName(event.agent_id || 'system'),
    fileLabel: files,
    linkedOutput: output,
  }
}

function isImportantEvent(event: TaskEvent) {
  return IMPORTANT_EVENT_TYPES.has(event.type) || eventPaths(event).length > 0
}

const importantEventInsights = computed(() =>
  (() => {
    const insights = selectedTaskEvents.value
      .filter(isImportantEvent)
      .map(event => toTimelineInsight(event))

    const outputInsights = selectedTaskOutputs.value
      .map((output) => {
        const pathLabel = output.path ? fileBaseName(output.path) : output.name
        return {
          id: `output-${output.id}`,
          timestamp: outputTimestampMs(output),
          tone: 'output' as EventTone,
          badge: '文件',
          headline: '产生了新的文件成果',
          detail: `${agentName(output.agent_id || '')} 输出 ${output.name}`,
          actor: agentName(output.agent_id || 'system'),
          fileLabel: pathLabel,
          linkedOutput: output,
        }
      })
      .filter(item => !insights.some(insight => insight.linkedOutput?.id === item.linkedOutput?.id))

    return [...insights, ...outputInsights]
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-24)
  })()
)

const activeMemberTerminalLogs = computed<TerminalLogEntry[]>(() => {
  const subtask = activeMemberSubtask.value
  if (!subtask) return []

  const subtaskOutputs = selectedTaskOutputs.value.filter(output => output.subtask_id === subtask.id)
  const persistedLogs = memberRunLogs.value[subtask.id] || []

  if (persistedLogs.length > 0) {
    const logs: TerminalLogEntry[] = []
    for (const log of persistedLogs) {
      const content = String(log.message || '')
      if (!content) continue

      const isAssistant = log.type === 'assistant.delta' || log.type === 'assistant.snapshot'
      const linkedOutput = runLogOutput(log, subtaskOutputs)
      const fileLabel = linkedOutput?.name || fileBaseName(runLogString(log, 'path') || runLogString(log, 'outputPath'))
      const previous = logs.at(-1)

      if (
        isAssistant &&
        previous &&
        previous.sourceType === 'agent.assistant' &&
        previous.runId === log.run_id
      ) {
        previous.timestamp = Number(log.created_at || previous.timestamp)
        previous.timestampMs = Number(log.created_at_ms || previous.timestampMs)
        previous.content = log.type === 'assistant.snapshot'
          ? mergeAssistantContent(previous.content, content)
          : `${previous.content}${content}`
        continue
      }

      logs.push({
        id: `run-log-${log.id}`,
        timestamp: Number(log.created_at || 0),
        timestampMs: Number(log.created_at_ms || Number(log.created_at || 0) * 1000),
        tone: runLogTone(log.type),
        label: runLogLabel(log.type),
        content,
        fileLabel: fileLabel || null,
        linkedOutput,
        sourceType: isAssistant ? 'agent.assistant' : log.type,
        runId: log.run_id,
      })
    }
    return logs
  }

  const logs: TerminalLogEntry[] = []

  for (const event of selectedTaskEvents.value.filter(item => item.subtask_id === subtask.id)) {
    const content = terminalEventContent(event)
    if (!content) continue

    const baseInsight = toTimelineInsight(event, subtaskOutputs)
    const runId = payloadRunId(event) || String(event.id)
    const previous = logs.at(-1)

    if (
      event.type === 'agent.assistant' &&
      previous &&
      previous.sourceType === 'agent.assistant' &&
      previous.runId === runId
    ) {
      previous.timestamp = Number(event.created_at || previous.timestamp)
      previous.content = mergeAssistantContent(previous.content, content)
      continue
    }

    logs.push({
      id: `${event.id}-${event.type}-${runId}`,
      timestamp: Number(event.created_at || 0),
      timestampMs: Number(event.created_at || 0) * 1000,
      tone: baseInsight.tone,
      label: terminalEventLabel(event),
      content,
      fileLabel: baseInsight.fileLabel,
      linkedOutput: baseInsight.linkedOutput,
      sourceType: event.type,
      runId,
    })
  }

  return logs
})

function terminalPrompt(log: TerminalLogEntry) {
  switch (log.sourceType) {
    case 'agent.assistant':
      return 'claude >'
    case 'queue':
      return 'queue  >'
    case 'start':
    case 'system':
      return 'system >'
    case 'tool':
    case 'agent.tool':
      return 'tool   >'
    case 'output':
    case 'outputs.bound':
      return 'output >'
    case 'error':
    case 'agent.error':
      return 'error  >'
    case 'done':
    case 'result':
    case 'agent.done':
      return 'done   >'
    case 'cancelled':
      return 'cancel >'
    default:
      return `${log.label.toLowerCase().slice(0, 6).padEnd(6, ' ')} >`
  }
}

const activeMemberStoryOutputs = computed(() => {
  const subtask = activeMemberSubtask.value
  if (!subtask) return []
  return selectedTaskOutputs.value
    .filter(output => output.subtask_id === subtask.id)
    .sort((a, b) => outputTimestampMs(b) - outputTimestampMs(a))
})

function storyStepDefinition(log: TerminalLogEntry) {
  const source = log.sourceType
  const label = log.label
  if (source === 'queue' || source === 'agent.run.queued' || label === 'QUEUE') {
    return { key: 'queue', title: '进入队列', icon: 'ri-list-check-2', tone: 'warning' as EventTone }
  }
  if (source === 'start' || source === 'system' || source === 'agent.start' || label === 'START') {
    return { key: 'start', title: '启动运行', icon: 'ri-play-circle-line', tone: 'progress' as EventTone }
  }
  if (source === 'tool' || source === 'agent.tool' || label === 'TOOL') {
    return { key: 'tool', title: '使用工具', icon: 'ri-tools-line', tone: 'progress' as EventTone }
  }
  if (source === 'agent.assistant' || label === 'CLAUDE') {
    return { key: 'assistant', title: '生成内容', icon: 'ri-quill-pen-line', tone: 'progress' as EventTone }
  }
  if (source === 'output' || source === 'outputs.bound' || label === 'OUTPUT') {
    return { key: 'output', title: '绑定产出', icon: 'ri-file-markdown-line', tone: 'output' as EventTone }
  }
  if (['done', 'result', 'agent.done'].includes(source) || ['DONE', 'RESULT'].includes(label)) {
    return { key: 'done', title: '执行完成', icon: 'ri-checkbox-circle-line', tone: 'success' as EventTone }
  }
  if (['error', 'agent.error'].includes(source) || label === 'ERROR') {
    return { key: 'error', title: '执行异常', icon: 'ri-error-warning-line', tone: 'danger' as EventTone }
  }
  if (source === 'cancelled' || label === 'CANCEL') {
    return { key: 'cancelled', title: '已停止', icon: 'ri-stop-circle-line', tone: 'danger' as EventTone }
  }
  return { key: 'activity', title: log.label || '运行记录', icon: 'ri-pulse-line', tone: log.tone }
}

const activeMemberStorySteps = computed<MemberStoryStep[]>(() => {
  const subtask = activeMemberSubtask.value
  if (!subtask) return []

  const order = ['queue', 'start', 'tool', 'assistant', 'output', 'done', 'error', 'cancelled', 'activity']
  const steps = new Map<string, MemberStoryStep>()

  for (const log of activeMemberTerminalLogs.value) {
    const definition = storyStepDefinition(log)
    const timestampMs = log.timestampMs || log.timestamp * 1000
    const existing = steps.get(definition.key)
    const detail = cleanText(log.fileLabel || log.content, definition.key === 'assistant' ? 96 : 120)

    if (!existing) {
      steps.set(definition.key, {
        ...definition,
        detail,
        count: 1,
        timestampMs,
      })
      continue
    }

    existing.count += 1
    if (timestampMs >= existing.timestampMs) {
      existing.timestampMs = timestampMs
      existing.detail = detail
    }
  }

  if (steps.size === 0) {
    steps.set('pending', {
      key: 'pending',
      title: subtask.status === 'completed' ? '等待日志同步' : '等待执行',
      detail: subtask.status === 'completed'
        ? '当前子任务已完成，但详细运行日志还未同步到本地。'
        : cleanText(subtask.description, 120),
      tone: subtask.status === 'failed' ? 'danger' : 'neutral',
      icon: subtask.status === 'failed' ? 'ri-error-warning-line' : 'ri-time-line',
      count: 1,
      timestampMs: Number(subtask.updated_at || 0) * 1000,
    })
  }

  return [...steps.values()]
    .sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key))
    .slice(0, 8)
})

const activeMemberStoryTitle = computed(() => {
  const subtask = activeMemberSubtask.value
  if (!subtask) return '暂无执行任务'
  if (subtask.status === 'failed') return '执行出现异常，需要查看日志或重试'
  if (subtask.status === 'completed') return '执行已完成，报告可进入产出区查看'
  if (subtask.status === 'running') return '正在执行，关键步骤会持续更新'
  if (subtask.status === 'assigned') return '任务已分配，等待进入 Claude Runtime'
  return '任务等待执行'
})

const activeMemberStorySummary = computed(() => {
  const subtask = activeMemberSubtask.value
  if (!subtask) return '请选择一个团队成员查看执行详情。'
  if (subtask.error) return cleanText(subtask.error, 180)
  if (subtask.result_summary) return cleanText(subtask.result_summary, 180)
  const latestOutput = activeMemberStoryOutputs.value[0]
  if (latestOutput) return `${agentName(subtask.assigned_agent_id)} 已生成 ${latestOutput.name}，可直接打开报告检视结论。`
  const latestAssistant = [...activeMemberTerminalLogs.value].reverse().find(log => log.sourceType === 'agent.assistant')
  if (latestAssistant) return cleanText(latestAssistant.content, 180)
  const latestStep = activeMemberStorySteps.value.at(-1)
  if (latestStep) return cleanText(latestStep.detail, 180)
  return cleanText(subtask.description, 180)
})

function subtaskActivityTimestampMs(subtask: Subtask) {
  const latestEvent = [...selectedTaskEvents.value]
    .reverse()
    .find(event => event.subtask_id === subtask.id)
  if (latestEvent?.created_at) return Number(latestEvent.created_at) * 1000
  return Number(subtask.updated_at || 0) * 1000
}

function isSubtaskWorking(subtask: Subtask) {
  return subtask.status === 'running'
}

function isSubtaskRecentlyUpdated(subtask: Subtask) {
  return currentTimeMs.value - subtaskActivityTimestampMs(subtask) <= MEMBER_CHANGE_WINDOW_MS
}

const liveSubtaskCount = computed(() =>
  selectedTask.value?.subtasks.filter(subtask => isSubtaskWorking(subtask)).length || 0
)

const recentTeamChangeCount = computed(() =>
  selectedTask.value?.subtasks.filter(subtask => isSubtaskRecentlyUpdated(subtask)).length || 0
)

const taskFlowCurrentKey = computed<'create' | 'plan' | 'execute' | 'review' | 'archive'>(() => {
  const task = selectedTask.value
  if (!task) return 'create'
  if (task.status === 'completed') return 'archive'
  if (task.status === 'reviewing' || hasReviewSummary.value || canFinalize.value) return 'review'
  if (task.subtasks.length > 0 || ['dispatching', 'running'].includes(task.status)) return 'execute'
  return 'plan'
})

const taskFlowSteps = computed<TaskFlowStep[]>(() => {
  const task = selectedTask.value
  const order = ['create', 'plan', 'execute', 'review', 'archive']
  const currentIndex = order.indexOf(taskFlowCurrentKey.value)
  const blockedCount = task?.subtasks.filter(subtask => ['failed', 'blocked'].includes(subtask.status)).length || 0
  const runningCount = task?.subtasks.filter(subtask => subtask.status === 'running').length || 0

  const steps: Omit<TaskFlowStep, 'state' | 'stateLabel'>[] = [
    {
      key: 'create',
      title: '创建任务',
      description: task ? '任务已经创建并进入编排流程。' : '先创建一个任务，系统才会开始协作。',
    },
    {
      key: 'plan',
      title: '拆解计划',
      description: task?.subtasks.length
        ? `小呦已拆解出 ${task.subtasks.length} 个子任务。`
        : '等待小呦输出 JSON 计划，并在拆解区校验派发。',
    },
    {
      key: 'execute',
      title: '协同执行',
      description: blockedCount > 0
        ? `${blockedCount} 个子任务异常，优先处理重试或阻塞。`
        : runningCount > 0
          ? `${runningCount} 名成员正在执行，持续观察现场和事件流。`
          : task?.subtasks.length
            ? '任务已分配，等待成员继续推进。'
            : '拆解完成后，这里进入团队执行阶段。',
    },
    {
      key: 'review',
      title: '请求验收',
      description: hasReviewSummary.value
        ? '汇总结果已经返回，检查后即可归档。'
        : canFinalize.value
          ? '所有子任务已完成，现在应先请求汇总。'
          : '等待全部子任务完成后，再进入验收。',
    },
    {
      key: 'archive',
      title: task?.status === 'completed' ? '已归档' : '验收归档',
      description: task?.status === 'completed'
        ? '任务已经归档，可回看结论和产出。'
        : '确认汇总无误后，完成最终归档。',
    },
  ]

  return steps.map((step, index) => {
    const state: FlowStepState = index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'pending'
    return {
      ...step,
      state,
      stateLabel: step.key === 'archive' && task?.status === 'completed'
        ? '已归档'
        : state === 'done'
          ? '已完成'
          : state === 'current'
            ? '当前'
            : '待进行',
    }
  })
})

const taskFlowCallout = computed<TaskFlowCallout>(() => {
  const task = selectedTask.value
  if (!task) {
    return {
      title: '先创建任务',
      detail: '从左侧任务入口开始，后续才会进入拆解、执行和验收流程。',
      actionLabel: null,
      target: null,
    }
  }

  if (taskFlowCurrentKey.value === 'plan') {
    return {
      title: '当前处于拆解阶段',
      detail: '如果小呦已经输出计划，就到拆解区校验并派发；否则先等待拆解结果。',
      actionLabel: '前往拆解区',
      target: 'plan',
    }
  }

  if (taskFlowCurrentKey.value === 'execute') {
    const blockedCount = task.subtasks.filter(subtask => ['failed', 'blocked'].includes(subtask.status)).length
    return {
      title: blockedCount > 0 ? '当前先处理执行异常' : '当前处于团队执行阶段',
      detail: blockedCount > 0
        ? `有 ${blockedCount} 个子任务异常，需要先在执行板处理重试或阻塞。`
        : '持续观察执行板、协作现场和事件流，等全部子任务完成后再请求验收。',
      actionLabel: '前往执行区',
      target: 'execution',
    }
  }

  if (taskFlowCurrentKey.value === 'review') {
    return {
      title: hasReviewSummary.value ? '现在可以验收归档' : '现在应该请求验收',
      detail: hasReviewSummary.value
        ? '右侧汇总验收区已有小呦结论，确认后点击“验收归档”。'
        : '所有子任务已完成，请先到右侧汇总验收区点击“请求汇总”，不要直接归档。',
      actionLabel: '前往验收区',
      target: 'review',
    }
  }

  if (taskFlowCurrentKey.value === 'archive') {
    return {
      title: '任务已完成归档',
      detail: '现在可以回看最终结论、成果文件和完整执行记录。',
      actionLabel: null,
      target: null,
    }
  }

  return {
    title: '任务已进入流程',
    detail: '等待进入下一阶段。',
    actionLabel: null,
    target: null,
  }
})

const reviewHint = computed(() => {
  if (selectedTask.value?.status === 'completed') return '任务已经归档完成，可在成果资产和事件流中回看最终结果。'
  if (selectedTask.value?.status === 'reviewing' && !hasReviewSummary.value) return '汇总请求已发出，等待小呦生成最终报告；结果会在成果资产中高亮显示。'
  if (hasReviewSummary.value) return '汇总报告已生成，请在成果资产里查看高亮的汇总报告，再点击“验收归档”。'
  if (canFinalize.value) return '当前顺序：先点击“请求汇总”，等待小呦收口后，再点击“验收归档”。'
  return '进入验收前，需要先等待所有子任务执行完成。'
})

const taskHeaderTips = computed(() => {
  const task = selectedTask.value
  if (!task) return []

  const tips = [
    cleanText(task.description, 42),
    `当前 ${statusText(task.status)}`,
    `${completedCount(task)}/${task.subtasks.length} 子任务完成`,
  ]

  if (task.outputs.length > 0) {
    tips.push(`已产出 ${task.outputs.length} 个成果`)
  }

  return tips.slice(0, 4)
})

const orderedTaskOutputs = computed(() => {
  const outputs = [...(selectedTask.value?.outputs || [])]
  return outputs.sort((a, b) => {
    const summaryDiff = Number(isSummaryOutput(b)) - Number(isSummaryOutput(a))
    if (summaryDiff !== 0) return summaryDiff
    return Number(b.mtime || b.created_at || 0) - Number(a.mtime || a.created_at || 0)
  })
})

function agentWorkbench(subtask: Subtask): AgentWorkbenchSummary {
  const events = selectedTaskEvents.value.filter(event => event.subtask_id === subtask.id)
  const outputs = selectedTaskOutputs.value.filter(output => output.subtask_id === subtask.id)
  const recentEvents = events.filter(event => event.type !== 'agent.assistant')
  const latestEvent = recentEvents.at(-1) || null
  const latestOutput = outputs[0] || null
  const focusSource = subtask.error || subtask.result_summary || latestEvent?.message || subtask.description
  const lastToolEvent = [...events].reverse().find(event => event.type === 'agent.tool')
  const statusNote = lastToolEvent
    ? cleanText(lastToolEvent.message.replace('Claude Code 使用只读工具：', '最近工具：'), 48)
    : latestOutput
      ? `最新文件 ${latestOutput.name}`
      : `最近更新 ${formatTime(latestEvent?.created_at || subtask.updated_at)}`

  return {
    focus: cleanText(focusSource, 140),
    trail: recentEvents.slice(-3).reverse().map(event => toTimelineInsight(event, outputs)),
    latestOutput,
    outputCount: outputs.length,
    statusNote,
  }
}

async function handleRefresh() {
  await Promise.all([
    tasksStore.fetchTasks(),
    refreshRuntimeStatus(),
  ])
  if (tasksStore.error) ElMessage.error(tasksStore.error)
}

async function refreshRuntimeStatus() {
  try {
    const response = await taskApi.runtimeStatus()
    runtimeStatus.value = response.status
  } catch {
    runtimeStatus.value = { healthy: false, running: 0, queued: 0, maxConcurrency: 3, maxTurns: 256 }
  }
}

async function selectTask(taskId: string) {
  try {
    await tasksStore.fetchTask(taskId)
    planDraft.value = ''
    summaryDraft.value = selectedTask.value?.summary || ''
    await scrollTaskRowIntoView(taskId)
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '加载任务失败')
  }
}

async function createTask() {
  if (!canCreateTask.value || creating.value) return
  creating.value = true
  try {
    const response = await tasksStore.createTask({
      title: createForm.title.trim(),
      description: createForm.description.trim(),
      priority: createForm.priority,
    })
    await tasksStore.fetchTask(response.task.id, { refreshEvents: true, eventLimit: TASK_EVENT_LIMIT })
    await scrollTaskRowIntoView(response.task.id)
    createForm.title = ''
    createForm.description = ''
    createDialog.value = false
    ElMessage.success('任务已创建，小呦拆解已进入 Claude Runtime 队列')
    await refreshRuntimeStatus()
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '创建任务失败')
  } finally {
    creating.value = false
  }
}

function fillFromCoordinator() {
  const coordinator = multiAgentStore.agents.xiaomu
  const latest = [...(coordinator?.messages || [])].reverse().find(message => message.role === 'assistant' && message.content.includes('{'))
  if (!latest) {
    ElMessage.warning('没有找到小呦最近的 JSON 回复')
    return
  }
  planDraft.value = latest.content
}

async function applyPlan() {
  if (!selectedTask.value || !planDraft.value.trim()) return
  applyingPlan.value = true
  try {
    const response = await tasksStore.applyPlan(selectedTask.value.id, planDraft.value)
    planDraft.value = ''
    const runResponse = await tasksStore.runSubtasks(response.task.id)
    await tasksStore.fetchTask(response.task.id, { refreshEvents: true, eventLimit: TASK_EVENT_LIMIT })
    ElMessage.success(`计划已校验，${runResponse.runs?.length || 0} 个子任务已进入 Claude Runtime 队列`)
    await refreshRuntimeStatus()
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '计划应用失败')
    await tasksStore.fetchTask(selectedTask.value.id)
  } finally {
    applyingPlan.value = false
  }
}

async function rerunPlan() {
  if (!selectedTask.value || rerunningPlan.value) return
  rerunningPlan.value = true
  try {
    const response = await tasksStore.runPlan(selectedTask.value.id)
    await tasksStore.fetchTask(response.task.id, { refreshEvents: true, eventLimit: TASK_EVENT_LIMIT })
    ElMessage.success('小呦拆解已重新进入 Claude Runtime 队列')
    await refreshRuntimeStatus()
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '重新拆解失败')
  } finally {
    rerunningPlan.value = false
  }
}

async function retrySubtask(subtaskId: string) {
  try {
    const response = await tasksStore.retrySubtask(subtaskId)
    await tasksStore.fetchTask(response.task.id, { refreshEvents: true, eventLimit: TASK_EVENT_LIMIT })
    ElMessage.success('子任务已进入 Claude Runtime 重试队列')
    await refreshRuntimeStatus()
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '重试失败')
  }
}

async function cancelActiveMemberRun() {
  if (!activeMemberRunId.value || !activeMemberSubtask.value) return
  try {
    await taskApi.cancelRun(activeMemberRunId.value)
    await tasksStore.fetchTask(activeMemberSubtask.value.task_id, { refreshEvents: true, eventLimit: TASK_EVENT_LIMIT })
    ElMessage.success('已请求停止当前 Claude Runtime run')
    await refreshRuntimeStatus()
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '停止运行失败')
  }
}

async function completeSubtask(subtaskId: string) {
  try {
    const response = await tasksStore.completeSubtask(subtaskId, '由操作员在任务指挥中心确认完成')
    await tasksStore.fetchTask(response.task.id, { refreshEvents: true, eventLimit: TASK_EVENT_LIMIT })
    ElMessage.success('子任务已标记完成')
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '更新失败')
  }
}

async function scanOutputs() {
  if (!selectedTask.value || scanningOutputs.value) return
  scanningOutputs.value = true
  try {
    await tasksStore.scanOutputs(selectedTask.value.id)
    await tasksStore.fetchTask(selectedTask.value.id, { refreshEvents: true, eventLimit: TASK_EVENT_LIMIT })
    ElMessage.success('成果扫描完成')
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '成果扫描失败')
  } finally {
    scanningOutputs.value = false
  }
}

async function finalizeTask() {
  if (!selectedTask.value || !canRequestSummary.value) return
  finalizingSummary.value = true
  try {
    await tasksStore.finalizeTask(selectedTask.value.id)
    await tasksStore.fetchTask(selectedTask.value.id, { refreshEvents: true, eventLimit: TASK_EVENT_LIMIT })
    ElMessage.success('最终汇总已进入 Claude Runtime 队列')
    await refreshRuntimeStatus()
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '汇总请求失败')
  } finally {
    finalizingSummary.value = false
  }
}

async function completeTask() {
  if (!selectedTask.value) return
  const confirmed = await ElMessageBox.confirm('确认将该任务标记为验收完成并归档？', '验收归档', {
    confirmButtonText: '归档',
    cancelButtonText: '取消',
    type: 'success',
  }).catch(() => false)
  if (!confirmed) return
  try {
    const finalSummary = summaryDraft.value.trim() || selectedTask.value.summary || ''
    await tasksStore.completeTask(selectedTask.value.id, finalSummary)
    await tasksStore.fetchTask(selectedTask.value.id, { refreshEvents: true, eventLimit: TASK_EVENT_LIMIT })
    ElMessage.success('任务已归档')
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '归档失败')
  }
}

async function previewOutput(output: TaskOutput) {
  previewFileItem.value = output
  previewDialog.value = true
  previewContent.value = ''
  previewType.value = output.type
  previewError.value = null
  if (!output.path) {
    previewContent.value = output.git_url || '该成果没有可预览路径'
    return
  }
  previewLoading.value = true
  try {
    const data = await fetch(`/api/files/content?path=${encodeURIComponent(output.path)}`).then(res => res.json())
    if (!data.success) throw new Error(data.error || '读取失败')
    previewContent.value = data.content || ''
  } catch (err) {
    previewError.value = err instanceof Error ? err.message : '读取失败'
  } finally {
    previewLoading.value = false
  }
}

function renderPreview() {
  return md.render(previewContent.value)
}

function outputTimestampMs(output: TaskOutput) {
  if (output.mtime) return Math.floor(Number(output.mtime) / 1000)
  return Number(output.created_at || 0)
}

function completedCount(task: Task) {
  return task.subtasks?.filter(subtask => subtask.status === 'completed').length || 0
}

function needsPlan(task: Task) {
  return ['planning', 'dispatching', 'failed'].includes(task.status) && !task.subtasks.length
}

function statusText(status: TaskStatus) {
  return taskStatusLabels[status] || status
}

function subtaskStatusText(status: SubtaskStatus) {
  return subtaskStatusLabels[status] || status
}

function agentName(agentId: string) {
  return agentLabels[agentId] || agentId || '未归属'
}

function agentInitial(agentId: string) {
  return agentName(agentId).slice(0, 1)
}

async function openMemberConversation(subtask: Subtask) {
  activeMemberSubtaskId.value = subtask.id
  memberDialog.value = true
  memberLogsDrawer.value = false
  await fetchMemberRunLogs(subtask.id)
  scrollMemberChatToBottom(true)
}

async function fetchMemberRunLogs(subtaskId: string) {
  memberLogsLoading.value = true
  memberLogsError.value = ''
  try {
    const response = await taskApi.listSubtaskLogs(subtaskId, { limit: 2500 })
    memberRunLogs.value = {
      ...memberRunLogs.value,
      [subtaskId]: response.logs || [],
    }
  } catch (err) {
    memberLogsError.value = err instanceof Error ? err.message : '日志同步失败'
  } finally {
    memberLogsLoading.value = false
    scrollMemberChatToBottom(true)
  }
}

function setTaskRowRef(taskId: string, el: HTMLButtonElement | null) {
  if (el) {
    taskRowRefs[taskId] = el
    return
  }
  delete taskRowRefs[taskId]
}

async function scrollTaskRowIntoView(taskId: string) {
  await nextTick()
  const row = taskRowRefs[taskId]
  const container = taskListScrollRef.value
  if (!row || !container) return

  const rowRect = row.getBoundingClientRect()
  const containerRect = container.getBoundingClientRect()
  const rowTop = rowRect.top - containerRect.top + container.scrollTop
  const rowBottom = rowTop + row.offsetHeight
  const viewTop = container.scrollTop
  const viewBottom = viewTop + container.clientHeight

  if (rowTop < viewTop) {
    container.scrollTo({ top: Math.max(rowTop - 10, 0), behavior: 'smooth' })
  } else if (rowBottom > viewBottom) {
    container.scrollTo({ top: Math.max(rowBottom - container.clientHeight + 10, 0), behavior: 'smooth' })
  }
}

async function scrollToWorkflowTarget(target: WorkflowTarget) {
  await nextTick()
  const targetMap: Record<WorkflowTarget, HTMLElement | null> = {
    plan: planSectionRef.value,
    execution: executionSectionRef.value,
    review: reviewPanelRef.value,
  }
  targetMap[target]?.scrollIntoView({ block: 'start', behavior: 'smooth' })
}

function formatTime(value?: number | null) {
  if (!value) return '--'
  return new Date(value * 1000).toLocaleString('zh-CN', { hour12: false, month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function formatMsTime(value?: number | null) {
  if (!value) return '--'
  return new Date(value).toLocaleString('zh-CN', { hour12: false, month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function formatLogTime(value?: number | null) {
  if (!value) return '--'
  return new Date(value).toLocaleTimeString('zh-CN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function shortRunId(runId = '') {
  if (!runId) return '--'
  const parts = runId.split('-')
  return parts.length >= 3 ? `${parts[0]}-${parts.at(-1)}` : runId.slice(0, 12)
}

function isLongTerminalLog(log: TerminalLogEntry) {
  return log.content.length > 900 || log.content.split('\n').length > 16
}

function toggleTerminalLog(logId: string) {
  const next = new Set(expandedLogIds.value)
  if (next.has(logId)) next.delete(logId)
  else next.add(logId)
  expandedLogIds.value = next
}

async function scrollToBottom(target: { value: HTMLElement | null }, force = false) {
  await nextTick()
  if (!target.value) return
  const distanceFromBottom = target.value.scrollHeight - target.value.scrollTop - target.value.clientHeight
  if (!force && distanceFromBottom > 140) return
  target.value.scrollTop = target.value.scrollHeight
}

function scrollEventListToBottom() {
  scrollToBottom(eventListRef, true)
}

function scrollMemberChatToBottom(force = false) {
  scrollToBottom(memberLogListRef, force)
}

function fileIcon(name: string) {
  if (/\.(md|markdown)$/i.test(name)) return 'ri-markdown-line'
  if (/\.(js|ts|vue|py|json|sh)$/i.test(name)) return 'ri-code-s-slash-line'
  if (/\.(docx?|txt)$/i.test(name)) return 'ri-file-text-line'
  return 'ri-file-line'
}

function toggleTheme() {
  themeStore.toggle()
}

function handleConnectAll() {
  refreshRuntimeStatus()
  ElMessage.success('已刷新 Claude Runtime 状态')
}

function handleDisconnectAll() {
  ElMessage.warning('Claude Runtime 运行任务请在任务事件中取消')
}

function closeTaskEventStream() {
  taskEventSource?.close()
  taskEventSource = null
  runtimeStreamConnected.value = false
}

async function syncTaskDetail(taskId: string, { refreshEvents = false } = {}) {
  if (taskSyncInFlight) {
    pendingTaskSyncId = taskId
    pendingTaskSyncNeedsEvents = pendingTaskSyncNeedsEvents || refreshEvents
    return
  }

  taskSyncInFlight = true
  try {
    await tasksStore.fetchTask(taskId, {
      refreshEvents,
      eventLimit: TASK_EVENT_LIMIT,
    })
    await refreshRuntimeStatus()
  } finally {
    taskSyncInFlight = false
    if (pendingTaskSyncId) {
      const nextTaskId = pendingTaskSyncId
      const nextNeedsEvents = pendingTaskSyncNeedsEvents
      pendingTaskSyncId = null
      pendingTaskSyncNeedsEvents = false
      scheduleTaskSync(nextTaskId, {
        delay: TASK_SYNC_DEBOUNCE_MS,
        refreshEvents: nextNeedsEvents,
      })
    }
  }
}

function scheduleTaskSync(taskId: string, { delay = TASK_SYNC_DEBOUNCE_MS, refreshEvents = false } = {}) {
  pendingTaskSyncId = taskId
  pendingTaskSyncNeedsEvents = pendingTaskSyncNeedsEvents || refreshEvents

  if (taskSyncTimer) return

  taskSyncTimer = setTimeout(() => {
    const nextTaskId = pendingTaskSyncId
    const nextNeedsEvents = pendingTaskSyncNeedsEvents
    taskSyncTimer = null
    pendingTaskSyncId = null
    pendingTaskSyncNeedsEvents = false
    if (nextTaskId) {
      syncTaskDetail(nextTaskId, { refreshEvents: nextNeedsEvents }).catch(() => {})
    }
  }, delay)
}

function shouldSyncTaskForEvent(type: string) {
  return EVENT_SYNC_TYPES.has(type)
}

function shouldRefreshEventsForSync(type: string) {
  return [
    'plan.accepted',
    'plan.invalid',
    'agent.done',
    'agent.error',
    'agent.cancelled',
    'agent.orphaned',
    'outputs.bound',
    'task.completed',
  ].includes(type)
}

function ingestRuntimeStreamEvent(taskId: string, data: Record<string, unknown>) {
  if (data.type === 'agent.log') {
    const log = normalizeStreamRunLog(data.log)
    if (log) appendMemberRunLog(log)
    return
  }

  tasksStore.ingestRuntimeEvent({
    type: String(data.type || ''),
    taskId,
    subtaskId: typeof data.subtaskId === 'string' ? data.subtaskId : undefined,
    agentId: typeof data.agentId === 'string' ? data.agentId : undefined,
    message: typeof data.message === 'string' ? data.message : undefined,
    created_at: typeof data.created_at === 'number' ? data.created_at : undefined,
    timestamp: typeof data.timestamp === 'number' ? data.timestamp : undefined,
    runId: typeof data.runId === 'string' ? data.runId : undefined,
    kind: typeof data.kind === 'string' ? data.kind : undefined,
    toolName: typeof data.toolName === 'string' ? data.toolName : undefined,
    sessionId: typeof data.sessionId === 'string' ? data.sessionId : undefined,
    outputPath: typeof data.outputPath === 'string' ? data.outputPath : undefined,
    error: typeof data.error === 'string' ? data.error : undefined,
  })
}

function openTaskEventStream(taskId: string) {
  closeTaskEventStream()
  taskEventSource = new EventSource(`/api/tasks/${encodeURIComponent(taskId)}/events/stream`)
  taskEventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data) as Record<string, unknown>
      if (data.type === 'connected') {
        runtimeStreamConnected.value = true
        return
      }
      if (data.type === 'ping') return

      ingestRuntimeStreamEvent(taskId, data)
      const eventType = String(data.type || '')
      if (shouldSyncTaskForEvent(eventType)) {
        scheduleTaskSync(taskId, {
          refreshEvents: shouldRefreshEventsForSync(eventType),
        })
      }
    } catch {
      // Ignore malformed keepalive messages.
    }
  }
  taskEventSource.onerror = () => {
    closeTaskEventStream()
  }
}

onMounted(async () => {
  authStore.restoreSession()
  multiAgentStore.loadMessages()
  await handleRefresh()
  if (typeof route.query.task === 'string') {
    await selectTask(route.query.task)
  }
  scrollEventListToBottom()
  clockTimer = setInterval(() => {
    currentTimeMs.value = Date.now()
  }, 1000)
  refreshTimer = setInterval(() => {
    if (!runtimeStreamConnected.value && tasksStore.selectedTaskId) {
      tasksStore.fetchTask(tasksStore.selectedTaskId, {
        refreshEvents: false,
        eventLimit: TASK_EVENT_LIMIT,
      }).catch(() => {})
    }
  }, TASK_POLL_INTERVAL_MS)
})

onUnmounted(() => {
  closeTaskEventStream()
  if (taskSyncTimer) clearTimeout(taskSyncTimer)
  if (clockTimer) clearInterval(clockTimer)
  if (refreshTimer) clearInterval(refreshTimer)
})

watch(
  () => [
    selectedTask.value?.id,
    selectedTaskEvents.value.length,
    selectedTaskEvents.value.at(-1)?.message,
  ],
  () => scrollEventListToBottom(),
  { flush: 'post' }
)

watch(
  () => selectedTask.value?.id,
  (taskId) => {
    if (taskId) {
      scrollTaskRowIntoView(taskId)
    }
  },
  { flush: 'post' }
)

watch(
  () => selectedTask.value?.id,
  (taskId) => {
    if (taskId) openTaskEventStream(taskId)
    else closeTaskEventStream()
  },
  { flush: 'post' }
)

watch(
  () => [
    memberDialog.value,
    memberLogsDrawer.value,
    activeMemberSubtaskId.value,
    activeMemberTerminalLogs.value.length,
    activeMemberTerminalLogs.value.at(-1)?.content,
  ],
  () => {
    if (memberLogsDrawer.value) scrollMemberChatToBottom()
  },
  { flush: 'post' }
)
</script>

<style scoped>
.task-command-page {
  display: block;
  min-height: 100%;
  width: 100%;
  min-width: 0;
  overflow: visible;
  background: transparent;
  container-type: inline-size;
  container-name: task-command;
}

.task-command-layout {
  min-height: auto;
  width: 100%;
  display: grid;
  grid-template-columns: minmax(280px, 330px) minmax(420px, 1fr) minmax(300px, 360px);
  align-items: start;
  gap: 20px;
  padding: 20px;
  overflow: visible;
  background: transparent;
}

.task-rail,
.mission-stage,
.task-inspector {
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow: visible;
}

.task-rail {
  position: sticky;
  top: 0;
  max-height: calc(100vh - 24px);
  overflow: hidden;
}

.mission-stage {
  padding-right: 4px;
  padding-bottom: 20px;
}

.surface {
  background: color-mix(in srgb, var(--bg-panel) 92%, transparent);
  border: 1px solid var(--border-default);
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.16);
}

.task-create {
  padding-bottom: 14px;
}

.task-list {
  display: flex;
  flex-direction: column;
  min-height: 0;
  max-height: calc(100vh - 174px);
  overflow: hidden;
}

.task-list .surface-heading {
  flex: 0 0 auto;
}

.task-list__body {
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  padding-right: 4px;
}

.task-list__body::-webkit-scrollbar {
  width: 6px;
}

.task-list__body::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(var(--color-primary-rgb), 0.32);
}

.surface-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.surface-heading__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.surface-heading h2,
.mission-hero h1,
.subtask-card h3 {
  margin: 0;
  color: var(--text-primary);
  letter-spacing: 0;
}

.surface-heading h2 {
  font-size: 16px;
}

.eyebrow {
  margin: 0 0 4px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--text-tertiary);
}

.field {
  width: 100%;
  border: 1px solid var(--border-default);
  border-radius: 6px;
  background: var(--bg-card);
  color: var(--text-primary);
  padding: 10px 12px;
  font: inherit;
  outline: none;
}

.field + .field {
  margin-top: 10px;
}

.field:focus {
  border-color: var(--color-primary);
}

.field--textarea {
  min-height: 96px;
  resize: vertical;
}

.field--plan {
  min-height: 220px;
  font-family: var(--font-mono);
  font-size: 12px;
  resize: vertical;
}

.field--select {
  min-width: 110px;
}

.create-launcher {
  width: 100%;
  border: 1px solid rgba(var(--color-primary-rgb), 0.38);
  border-radius: 8px;
  min-height: 54px;
  padding: 0 14px;
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--text-primary);
  background: rgba(var(--color-primary-rgb), 0.09);
  cursor: pointer;
  transition: transform 0.15s ease, border-color 0.15s ease, background 0.15s ease;
}

.create-launcher:hover {
  transform: translateY(-1px);
  border-color: rgba(var(--color-primary-rgb), 0.7);
  background: rgba(var(--color-primary-rgb), 0.14);
}

.create-launcher span {
  width: 30px;
  height: 30px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #08111f;
  background: var(--color-primary);
  flex: 0 0 auto;
}

.create-launcher strong {
  font-size: 14px;
  letter-spacing: 0;
}

.create-actions,
.plan-actions,
.review-actions,
.subtask-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 12px;
}

.plan-heading-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.plan-heading-actions .ghost-btn {
  white-space: nowrap;
}

.primary-btn,
.ghost-btn,
.scan-btn,
.icon-btn {
  border: 1px solid var(--border-default);
  border-radius: 6px;
  min-height: 34px;
  padding: 0 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  cursor: pointer;
  color: var(--text-primary);
  background: var(--bg-card);
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.primary-btn {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #08111f;
  font-weight: 700;
}

.primary-btn--compact {
  min-height: 30px;
  padding: 0 10px;
  font-size: 12px;
}

.scan-btn {
  min-height: 38px;
  padding: 0 15px;
  border-color: rgba(var(--color-primary-rgb), 0.76);
  background:
    linear-gradient(135deg, rgba(var(--color-primary-rgb), 0.28), rgba(var(--color-primary-rgb), 0.12)),
    var(--bg-card);
  color: var(--color-primary);
  font-weight: 800;
  box-shadow: 0 0 0 1px rgba(var(--color-primary-rgb), 0.18), 0 10px 24px rgba(var(--color-primary-rgb), 0.16);
}

.scan-btn:hover {
  border-color: var(--color-primary);
  background: var(--color-primary);
  color: #08111f;
}

.scan-btn i {
  font-size: 17px;
}

.ghost-btn:hover,
.icon-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.primary-btn:disabled,
.ghost-btn:disabled,
.scan-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.dialog-create-form {
  display: grid;
  gap: 14px;
}

.dialog-create-form__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 4px;
}

.dialog-create-form__head p {
  margin: 0;
  color: var(--text-tertiary);
  font-size: 13px;
  line-height: 1.5;
}

.dialog-create-form label {
  display: grid;
  gap: 7px;
}

.dialog-create-form label > span {
  color: var(--text-secondary);
  font-size: 13px;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

:deep(.task-create-dialog .el-dialog) {
  border: 1px solid var(--border-default);
  border-radius: 8px;
  background: var(--bg-panel);
}

:deep(.task-create-dialog .el-dialog__title) {
  color: var(--text-primary);
}

:deep(.task-create-dialog .el-dialog__body) {
  padding-top: 10px;
}

.ghost-btn--compact {
  min-height: 30px;
  padding: 0 9px;
  font-size: 12px;
}

.icon-btn {
  width: 34px;
  padding: 0;
}

.agent-pill,
.agent-token,
.status-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  min-height: 24px;
  padding: 0 10px;
  font-size: 12px;
  white-space: nowrap;
}

.agent-pill,
.agent-token {
  color: var(--color-primary);
  background: rgba(var(--color-primary-rgb), 0.12);
}

.task-row {
  width: 100%;
  display: block;
  text-align: left;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  background: transparent;
  color: var(--text-primary);
  padding: 12px;
  cursor: pointer;
}

.task-row + .task-row {
  margin-top: 10px;
}

.task-row.active {
  background: rgba(var(--color-primary-rgb), 0.1);
  border-color: rgba(var(--color-primary-rgb), 0.55);
}

.task-row__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.task-row__top strong {
  font-size: 14px;
  line-height: 1.35;
}

.task-row__meta,
.subtask-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
  color: var(--text-tertiary);
  font-size: 12px;
}

.mini-progress,
.subtask-progress {
  height: 6px;
  border-radius: 999px;
  overflow: hidden;
  background: var(--bg-card);
  margin-top: 10px;
}

.mini-progress span,
.subtask-progress span {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary), var(--color-secondary));
}

.status-chip {
  color: var(--text-secondary);
  background: var(--bg-card);
}

.status-chip--running,
.status-chip--reviewing {
  color: var(--color-primary);
  background: rgba(var(--color-primary-rgb), 0.12);
}

.status-chip--live {
  animation: chipLivePulse 1.4s ease-in-out infinite;
}

.status-chip--pulse {
  animation: chipChangePulse 1.2s ease-in-out infinite;
}

.status-chip--completed {
  color: var(--color-success);
  background: rgba(46, 160, 67, 0.14);
}

.status-chip--failed,
.status-chip--blocked {
  color: var(--color-error);
  background: rgba(220, 38, 38, 0.12);
}

.status-chip--planning,
.status-chip--dispatching,
.status-chip--assigned {
  color: var(--color-warning);
  background: rgba(245, 158, 11, 0.14);
}

.mission-flow {
  display: grid;
  gap: 12px;
  border-color: rgba(var(--color-primary-rgb), 0.24);
  background:
    linear-gradient(135deg, rgba(var(--color-primary-rgb), 0.14), transparent 42%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.02), transparent),
    color-mix(in srgb, var(--bg-panel) 94%, transparent);
}

.mission-flow--compact {
  padding-top: 12px;
  padding-bottom: 12px;
}

.mission-flow__compact-head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.mission-flow__rail {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
}

.mission-flow__rail--compact {
  flex: 1;
  gap: 8px;
}

.flow-step {
  position: relative;
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  gap: 12px;
  min-height: 108px;
  padding: 14px;
  border: 1px solid var(--border-default);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.03);
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
}

.flow-step--done {
  border-color: rgba(74, 222, 128, 0.28);
  background: rgba(74, 222, 128, 0.08);
}

.flow-step--current {
  border-color: rgba(var(--color-primary-rgb), 0.62);
  background:
    radial-gradient(circle at top right, rgba(var(--color-primary-rgb), 0.18), transparent 42%),
    rgba(var(--color-primary-rgb), 0.1);
  box-shadow:
    inset 0 0 0 1px rgba(var(--color-primary-rgb), 0.12),
    0 14px 32px rgba(var(--color-primary-rgb), 0.12);
  transform: translateY(-2px);
}

.flow-step--pending {
  opacity: 0.72;
}

.flow-step__marker {
  display: inline-flex;
  align-items: flex-start;
  justify-content: center;
}

.flow-step__marker span {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 800;
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.08);
}

.flow-step--done .flow-step__marker span {
  color: #052814;
  background: #86efac;
}

.flow-step--current .flow-step__marker span {
  color: #08111f;
  background: var(--color-primary);
  box-shadow: 0 0 18px rgba(var(--color-primary-rgb), 0.22);
}

.flow-step__body {
  min-width: 0;
  display: grid;
  gap: 8px;
}

.flow-step__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.flow-step__top strong {
  color: var(--text-primary);
  font-size: 14px;
}

.flow-step__state {
  color: var(--text-tertiary);
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.flow-step--current .flow-step__state {
  color: var(--color-primary);
}

.flow-step--done .flow-step__state {
  color: var(--color-success);
}

.flow-step p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.55;
}

.flow-step--compact {
  min-height: 0;
  padding: 10px 12px;
  grid-template-columns: 26px minmax(0, 1fr);
  border-radius: 10px;
}

.flow-step--compact .flow-step__marker span {
  width: 26px;
  height: 26px;
  border-radius: 8px;
  font-size: 12px;
}

.flow-step--compact .flow-step__body {
  display: flex;
  align-items: center;
}

.flow-step--compact .flow-step__body strong {
  color: var(--text-primary);
  font-size: 13px;
  line-height: 1.2;
}

.mission-flow__hint {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 36px;
  padding: 10px 12px;
  border: 1px solid rgba(var(--color-primary-rgb), 0.16);
  border-radius: 10px;
  background: rgba(7, 16, 28, 0.22);
}

.mission-flow__label {
  display: inline-flex;
  color: var(--color-primary);
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  flex: 0 0 auto;
}

.mission-flow__hint strong {
  color: var(--text-primary);
  font-size: 14px;
  flex: 0 0 auto;
}

.mission-flow__hint p {
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.45;
  min-width: 0;
}

.mission-flow__jump {
  flex: 0 0 auto;
}

.mission-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 14px;
  align-items: start;
  padding-top: 14px;
  padding-bottom: 14px;
}

.mission-hero__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  grid-column: 1 / -1;
}

.mission-hero__tips {
  grid-column: 1 / 2;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.mission-hero h1 {
  font-size: 24px;
}

.mission-tip {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  color: var(--text-secondary);
  font-size: 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.mission-hero__metrics {
  display: grid;
  grid-template-columns: repeat(3, 88px);
  gap: 10px;
  justify-self: end;
}

.mission-hero__metrics div {
  border: 1px solid var(--border-default);
  border-radius: 8px;
  padding: 10px;
  background: var(--bg-card);
}

.mission-hero__metrics span {
  display: block;
  color: var(--text-tertiary);
  font-size: 12px;
}

.mission-hero__metrics strong {
  display: block;
  margin-top: 6px;
  color: var(--text-primary);
  font-size: 20px;
}

.team-live-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.plan-console--focus,
.review-panel--focus {
  border-color: rgba(var(--color-primary-rgb), 0.46);
  box-shadow:
    0 0 0 1px rgba(var(--color-primary-rgb), 0.14),
    0 18px 38px rgba(var(--color-primary-rgb), 0.12);
}

.review-hint {
  margin: 0 0 12px;
  padding: 10px 12px;
  border: 1px solid rgba(var(--color-primary-rgb), 0.18);
  border-radius: 10px;
  color: var(--text-secondary);
  background: rgba(var(--color-primary-rgb), 0.08);
  line-height: 1.6;
}

.team-live {
  position: relative;
  overflow: hidden;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.team-live--active {
  border-color: rgba(var(--color-primary-rgb), 0.28);
  box-shadow:
    0 0 0 1px rgba(var(--color-primary-rgb), 0.14),
    0 10px 30px rgba(var(--color-primary-rgb), 0.08);
}

.team-live--changed {
  box-shadow:
    0 0 0 1px rgba(var(--color-primary-rgb), 0.16),
    0 0 28px rgba(var(--color-primary-rgb), 0.1);
}

.member-card {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  border: 1px solid var(--border-default);
  border-radius: 14px;
  padding: 14px;
  background:
    radial-gradient(circle at top right, rgba(var(--color-primary-rgb), 0.14), transparent 34%),
    color-mix(in srgb, var(--bg-card) 92%, var(--color-primary) 4%);
  color: var(--text-primary);
  text-align: left;
  min-height: 280px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: transform 0.15s ease, border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
}

.member-card::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  border-radius: inherit;
  background: linear-gradient(115deg, transparent 0%, rgba(255, 255, 255, 0.12) 50%, transparent 100%);
  opacity: 0;
  transform: translateX(-120%);
  z-index: 0;
}

.member-card > * {
  position: relative;
  z-index: 1;
}

.member-card:hover {
  transform: translateY(-1px);
  border-color: rgba(var(--color-primary-rgb), 0.62);
  box-shadow: 0 16px 32px rgba(0, 0, 0, 0.18);
}

.member-card--active {
  border-color: rgba(var(--color-primary-rgb), 0.52);
  box-shadow:
    inset 0 0 0 1px rgba(var(--color-primary-rgb), 0.08),
    0 0 24px rgba(var(--color-primary-rgb), 0.12);
  animation: memberWorkingPulse 2.6s ease-in-out infinite;
}

.member-card--active::before {
  opacity: 1;
  animation: memberSignalSweep 2.8s ease-in-out infinite;
}

.member-card--changed {
  border-color: rgba(var(--color-primary-rgb), 0.68);
  animation: memberChangedFlash 1.4s ease-in-out infinite;
}

.member-card__top {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
}

.member-card__signals {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-tertiary);
}

.member-live-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 24px;
  padding: 0 9px;
  border-radius: 999px;
  color: #08111f;
  background: #5eead4;
  font-size: 11px;
  font-weight: 800;
  box-shadow: 0 0 16px rgba(94, 234, 212, 0.24);
}

.member-live-badge--changed {
  color: #08111f;
  background: #93c5fd;
  box-shadow: 0 0 16px rgba(147, 197, 253, 0.24);
}

.member-live-badge__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #08111f;
  animation: liveDotPulse 1s ease-in-out infinite;
}

.member-avatar {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #08111f;
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  font-weight: 800;
  flex: 0 0 auto;
}

.member-card strong,
.member-dialog__header h2 {
  color: var(--text-primary);
  letter-spacing: 0;
}

.member-card small {
  display: block;
  margin-top: 3px;
  color: var(--text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.member-card__activity {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: var(--text-tertiary);
  font-size: 12px;
}

.member-card__label {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  width: fit-content;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-tertiary);
  background: rgba(255, 255, 255, 0.03);
}

.member-card__focus {
  display: grid;
  gap: 8px;
}

.member-card__focus--muted {
  padding-top: 4px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.member-card p,
.member-trail p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.member-card__file {
  margin-top: auto;
}

.member-file-pill {
  width: 100%;
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  border: 1px solid rgba(var(--color-primary-rgb), 0.26);
  border-radius: 10px;
  padding: 10px 12px;
  background: rgba(var(--color-primary-rgb), 0.1);
  color: var(--text-primary);
  cursor: pointer;
}

.member-file-pill span {
  min-width: 0;
  display: grid;
  gap: 2px;
}

.member-file-pill strong,
.member-file-pill small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.member-file-pill small {
  color: var(--text-tertiary);
}

.member-card__trail {
  display: grid;
  gap: 8px;
}

.member-trail {
  display: grid;
  grid-template-columns: 10px minmax(0, 1fr);
  gap: 10px;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.02);
}

.member-trail__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  margin-top: 6px;
  background: currentColor;
  opacity: 0.85;
}

.member-trail--neutral {
  color: var(--text-secondary);
}

.member-trail--progress {
  color: var(--color-primary);
}

.member-trail--output {
  color: var(--color-secondary);
}

.member-trail--success {
  color: var(--color-success);
}

.member-trail--warning {
  color: var(--color-warning);
}

.member-trail--danger {
  color: var(--color-error);
}

.member-trail strong,
.event-item strong {
  color: var(--text-primary);
  font-size: 12px;
}

.member-card__footer,
.event-item__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  color: var(--text-tertiary);
  font-size: 12px;
}

.subtask-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
}

.subtask-card {
  border: 1px solid var(--border-default);
  border-radius: 8px;
  padding: 14px;
  background: var(--bg-card);
}

.subtask-card__head {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
}

.subtask-card h3 {
  font-size: 15px;
}

.subtask-card p {
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.55;
}

.error-line {
  color: var(--color-error) !important;
}

.event-list,
.outputs-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.event-list {
  max-height: 360px;
  overflow: auto;
  padding-right: 4px;
  scroll-behavior: smooth;
}

.outputs-panel {
  max-height: 320px;
  overflow: auto;
  overscroll-behavior: contain;
  padding-right: 4px;
}

.event-item {
  display: grid;
  grid-template-columns: 12px 1fr;
  gap: 10px;
}

.event-list--rich {
  gap: 12px;
}

.event-item--rich {
  padding: 12px;
  border: 1px solid var(--border-default);
  border-radius: 12px;
  background: var(--bg-card);
}

.event-item--output {
  border-color: rgba(var(--color-primary-rgb), 0.48);
  background:
    linear-gradient(135deg, rgba(var(--color-primary-rgb), 0.18), transparent 58%),
    color-mix(in srgb, var(--bg-card) 90%, var(--color-primary) 5%);
  box-shadow: inset 0 0 0 1px rgba(var(--color-primary-rgb), 0.1);
}

.event-item--output .event-badge {
  color: #08111f;
  font-weight: 800;
  background: var(--color-primary);
}

.event-dot {
  width: 8px;
  height: 8px;
  margin-top: 5px;
  border-radius: 50%;
  background: var(--color-primary);
}

.event-item--danger .event-dot {
  background: var(--color-error);
}

.event-item--warning .event-dot {
  background: var(--color-warning);
}

.event-item--success .event-dot {
  background: var(--color-success);
}

.event-item--output .event-dot {
  background: var(--color-secondary);
}

.event-item__body {
  display: grid;
  gap: 8px;
}

.event-item__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.event-badge {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  font-size: 11px;
  color: var(--color-primary);
  background: rgba(var(--color-primary-rgb), 0.12);
}

.event-item p {
  margin: 3px 0;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.45;
}

.event-item small,
.event-item__meta {
  color: var(--text-tertiary);
}

.event-item__meta span:last-child {
  color: var(--text-primary);
  font-weight: 600;
}

.output-row {
  border: 1px solid var(--border-default);
  border-radius: 8px;
  background: var(--bg-card);
  color: var(--text-primary);
  display: grid;
  grid-template-columns: 20px 1fr auto;
  align-items: center;
  gap: 8px;
  padding: 10px;
  cursor: pointer;
  text-align: left;
}

.output-row--summary {
  border-color: rgba(var(--color-primary-rgb), 0.58);
  background:
    linear-gradient(135deg, rgba(var(--color-primary-rgb), 0.16), transparent 62%),
    var(--bg-card);
  box-shadow:
    inset 0 0 0 1px rgba(var(--color-primary-rgb), 0.1),
    0 10px 24px rgba(var(--color-primary-rgb), 0.12);
}

.output-row__content {
  min-width: 0;
  display: grid;
  gap: 4px;
}

.output-row__content strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.output-row small {
  color: var(--text-tertiary);
}

.output-badge {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  color: #08111f;
  font-size: 11px;
  font-weight: 800;
  background: var(--color-primary);
}

.quiet-state,
.empty-mission {
  color: var(--text-secondary);
  line-height: 1.6;
}

.empty-mission {
  margin: auto;
  text-align: center;
  max-width: 480px;
}

.empty-mission i {
  font-size: 42px;
  color: var(--color-primary);
}

.preview-state {
  color: var(--text-secondary);
  padding: 24px;
}

.preview-state--error {
  color: var(--color-error);
}

.preview-content {
  max-height: 70vh;
  overflow: auto;
  color: var(--text-primary);
}

.preview-content pre {
  white-space: pre-wrap;
  color: var(--text-primary);
}

.markdown-rendered {
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.75;
}

.markdown-rendered :deep(h1),
.markdown-rendered :deep(h2),
.markdown-rendered :deep(h3),
.markdown-rendered :deep(h4) {
  color: var(--text-primary);
  letter-spacing: 0;
  line-height: 1.3;
  margin: 22px 0 10px;
}

.markdown-rendered :deep(h1) {
  font-size: 24px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-default);
}

.markdown-rendered :deep(h2) {
  font-size: 20px;
}

.markdown-rendered :deep(h3) {
  font-size: 17px;
}

.markdown-rendered :deep(p) {
  margin: 10px 0;
}

.markdown-rendered :deep(ul),
.markdown-rendered :deep(ol) {
  margin: 10px 0;
  padding-left: 24px;
}

.markdown-rendered :deep(li + li) {
  margin-top: 5px;
}

.markdown-rendered :deep(strong) {
  color: var(--text-primary);
}

.markdown-rendered :deep(a) {
  color: var(--color-primary);
}

.markdown-rendered :deep(blockquote) {
  margin: 14px 0;
  padding: 10px 14px;
  border-left: 3px solid var(--color-primary);
  background: rgba(var(--color-primary-rgb), 0.08);
  color: var(--text-secondary);
}

.markdown-rendered :deep(code) {
  border: 1px solid var(--border-default);
  border-radius: 5px;
  padding: 2px 5px;
  background: var(--bg-card);
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: 0.92em;
}

.markdown-rendered :deep(pre) {
  overflow: auto;
  margin: 14px 0;
  padding: 14px;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  background: var(--bg-card);
}

.markdown-rendered :deep(pre code) {
  border: 0;
  padding: 0;
  background: transparent;
  white-space: pre;
}

.markdown-rendered :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 14px 0;
  overflow: hidden;
  border: 1px solid var(--border-default);
}

.markdown-rendered :deep(th),
.markdown-rendered :deep(td) {
  border: 1px solid var(--border-default);
  padding: 8px 10px;
  text-align: left;
  vertical-align: top;
}

.markdown-rendered :deep(th) {
  color: var(--text-primary);
  background: rgba(var(--color-primary-rgb), 0.09);
}

.markdown-rendered :deep(hr) {
  border: 0;
  border-top: 1px solid var(--border-default);
  margin: 20px 0;
}

:deep(.el-dialog) {
  background: var(--bg-panel);
}

:deep(.el-dialog__title) {
  color: var(--text-primary);
}

:deep(.member-dialog .el-dialog) {
  border: 1px solid var(--border-default);
  border-radius: 8px;
  background: var(--bg-panel);
}

:deep(.member-dialog .el-dialog) {
  width: min(960px, calc(100vw - 32px)) !important;
  max-width: calc(100vw - 32px);
  height: min(760px, 84vh);
  max-height: calc(100vh - 32px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

:deep(.member-dialog .el-dialog__body) {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
}

.member-dialog__header {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  padding-right: 28px;
}

.member-dialog__header h2 {
  margin: 2px 0 0;
  max-width: 560px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 15px;
}

.member-chat-shell {
  flex: 1;
  min-height: 0;
  width: 100%;
  display: flex;
  overflow: hidden;
}

.member-story {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow: auto;
  overscroll-behavior: contain;
  padding-right: 4px;
}

.member-story__toolbar,
.member-story__section-head,
.member-story__actions,
.member-story__chips {
  display: flex;
  align-items: center;
  gap: 8px;
}

.member-story__toolbar {
  justify-content: space-between;
  min-height: 34px;
}

.member-story__chips {
  min-width: 0;
  flex-wrap: wrap;
}

.member-story__chips span,
.member-story__section-head > span {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 9px;
  border-radius: 999px;
  color: var(--text-secondary);
  background: var(--bg-card);
  border: 1px solid var(--border-default);
  font-size: 12px;
}

.member-story__actions {
  flex: 0 0 auto;
}

.member-story__alert {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 11px;
  border: 1px solid rgba(248, 113, 113, 0.3);
  border-radius: 8px;
  color: #fecaca;
  background: rgba(248, 113, 113, 0.08);
}

.member-story__overview {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(220px, 300px);
  gap: 14px;
  align-items: stretch;
  padding: 14px;
  border: 1px solid rgba(var(--color-primary-rgb), 0.2);
  border-radius: 8px;
  background:
    linear-gradient(135deg, rgba(var(--color-primary-rgb), 0.12), transparent 64%),
    var(--bg-card);
}

.member-story h3 {
  margin: 0;
  color: var(--text-primary);
  font-size: 16px;
  letter-spacing: 0;
}

.member-story__overview p {
  margin: 8px 0 0;
  color: var(--text-secondary);
  line-height: 1.6;
}

.member-story__timeline,
.member-story__outputs {
  min-height: 0;
}

.member-story__section-head {
  justify-content: space-between;
  margin-bottom: 10px;
}

.story-step-list {
  display: grid;
  gap: 9px;
}

.story-step {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  background: color-mix(in srgb, var(--bg-card) 92%, transparent);
}

.story-step__icon {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--color-primary);
  background: rgba(var(--color-primary-rgb), 0.12);
}

.story-step--success .story-step__icon {
  color: var(--color-success);
  background: rgba(74, 222, 128, 0.12);
}

.story-step--warning .story-step__icon {
  color: var(--color-warning);
  background: rgba(245, 158, 11, 0.12);
}

.story-step--danger .story-step__icon {
  color: var(--color-error);
  background: rgba(248, 113, 113, 0.12);
}

.story-step--output .story-step__icon {
  color: var(--color-secondary);
  background: rgba(94, 234, 212, 0.12);
}

.story-step__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.story-step__top strong {
  color: var(--text-primary);
  font-size: 13px;
}

.story-step__top span {
  color: var(--text-tertiary);
  font-size: 12px;
  white-space: nowrap;
}

.story-step p {
  margin: 5px 0 0;
  color: var(--text-secondary);
  line-height: 1.5;
  font-size: 13px;
}

.story-output-hero,
.story-output-row {
  border: 1px solid rgba(var(--color-primary-rgb), 0.24);
  border-radius: 8px;
  background: rgba(var(--color-primary-rgb), 0.08);
  color: var(--text-primary);
  cursor: pointer;
}

.story-output-hero {
  min-width: 0;
  display: grid;
  grid-template-columns: 26px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  padding: 12px;
  text-align: left;
}

.story-output-list {
  display: grid;
  gap: 8px;
  max-height: 142px;
  overflow: auto;
  overscroll-behavior: contain;
  padding-right: 4px;
}

.story-output-row {
  width: 100%;
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr) 18px;
  gap: 10px;
  align-items: center;
  padding: 10px 11px;
  text-align: left;
}

.story-output-hero span,
.story-output-row span {
  min-width: 0;
  display: grid;
  gap: 3px;
}

.story-output-hero strong,
.story-output-row strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-primary);
}

.story-output-hero small,
.story-output-row small,
.member-story__empty {
  color: var(--text-tertiary);
}

.member-story__empty {
  padding: 14px;
  border: 1px dashed var(--border-default);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.02);
}

:deep(.member-logs-drawer .el-drawer) {
  background: var(--bg-panel);
}

:deep(.member-logs-drawer .el-drawer__header) {
  margin-bottom: 0;
  padding: 18px 18px 12px;
}

:deep(.member-logs-drawer .el-drawer__body) {
  min-height: 0;
  display: flex;
  padding: 0 18px 18px;
  overflow: hidden;
}

.member-logs-drawer__header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.member-logs-drawer__header h2 {
  margin: 2px 0 0;
  color: var(--text-primary);
  font-size: 15px;
  letter-spacing: 0;
}

.member-terminal {
  border: 1px solid rgba(var(--color-primary-rgb), 0.22);
  border-radius: 8px;
  overflow: hidden;
  background: #0a0f16;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.04),
    0 18px 40px rgba(0, 0, 0, 0.28);
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
}

.member-terminal__bar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: nowrap;
  min-height: 40px;
  padding: 7px 10px;
  border-bottom: 1px solid rgba(var(--color-primary-rgb), 0.18);
  background:
    linear-gradient(180deg, rgba(18, 30, 46, 0.98), rgba(10, 16, 24, 0.98));
  color: #7f93aa;
  font-size: 11px;
  font-family: var(--font-mono);
  overflow-x: auto;
  overflow-y: hidden;
  white-space: nowrap;
}

.member-terminal__bar > span {
  flex: 0 0 auto;
}

.member-terminal__bar::-webkit-scrollbar {
  height: 5px;
}

.member-terminal__bar::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(94, 234, 212, 0.26);
}

.member-terminal__pill {
  display: inline-flex;
  align-items: center;
  min-height: 20px;
  padding: 0 7px;
  border-radius: 999px;
  color: #08111f;
  background: #5eead4;
  font-weight: 700;
}

.member-terminal__context {
  flex: 1 1 auto;
  min-width: 180px;
  max-width: 360px;
  color: #9fb0c4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.member-terminal__refresh {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 22px;
  border: 1px solid rgba(94, 234, 212, 0.2);
  border-radius: 6px;
  padding: 0 8px;
  background: rgba(94, 234, 212, 0.06);
  color: #cfe9e5;
  font-family: var(--font-mono);
  font-size: 11px;
  cursor: pointer;
}

.member-terminal__refresh:disabled {
  cursor: wait;
  opacity: 0.58;
}

.member-terminal__screen {
  flex: 1 1 auto;
  height: 0;
  min-height: min(360px, 48vh);
  overflow: auto;
  overscroll-behavior: contain;
  display: grid;
  align-content: start;
  gap: 9px;
  padding: 10px;
  background:
    linear-gradient(180deg, rgba(94, 234, 212, 0.035), transparent 24%),
    repeating-linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.012) 0,
      rgba(255, 255, 255, 0.012) 1px,
      transparent 1px,
      transparent 28px
    ),
    #0a0f16;
}

.member-terminal__screen::-webkit-scrollbar,
.terminal-entry__content--assistant::-webkit-scrollbar {
  width: 9px;
  height: 9px;
}

.member-terminal__screen::-webkit-scrollbar-track,
.terminal-entry__content--assistant::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.035);
  border-radius: 999px;
}

.member-terminal__screen::-webkit-scrollbar-thumb,
.terminal-entry__content--assistant::-webkit-scrollbar-thumb {
  border: 2px solid rgba(7, 12, 18, 0.92);
  border-radius: 999px;
  background: rgba(94, 234, 212, 0.36);
}

.member-terminal__screen::-webkit-scrollbar-thumb:hover,
.terminal-entry__content--assistant::-webkit-scrollbar-thumb:hover {
  background: rgba(94, 234, 212, 0.58);
}

.member-terminal__empty {
  color: #7f93aa;
  font-family: var(--font-mono);
  line-height: 1.7;
}

.member-terminal__empty--error {
  color: #fca5a5;
}

.terminal-entry {
  border-left: 2px solid rgba(94, 234, 212, 0.18);
  padding: 1px 0 1px 10px;
  display: grid;
  gap: 4px;
  min-width: 0;
  max-width: 100%;
}

.terminal-entry--warning {
  border-left-color: rgba(245, 158, 11, 0.76);
}

.terminal-entry--danger {
  border-left-color: rgba(248, 113, 113, 0.86);
}

.terminal-entry--success {
  border-left-color: rgba(74, 222, 128, 0.78);
}

.terminal-entry--output {
  border-left-color: rgba(94, 234, 212, 0.96);
}

.terminal-entry__meta {
  display: grid;
  gap: 8px;
  grid-template-columns: 68px 72px minmax(0, 1fr);
  align-items: center;
  color: #7f93aa;
  font-family: var(--font-mono);
  font-size: 11px;
}

.terminal-entry__time {
  color: #6f8398;
}

.terminal-entry__prompt {
  color: #5eead4;
  font-weight: 700;
  letter-spacing: 0.03em;
}

.terminal-entry__run {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #647991;
}

.terminal-entry__content {
  margin: 0;
  min-width: 0;
  max-width: 100%;
  color: #d4deea;
  font-size: 12px;
  line-height: 1.62;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: var(--font-mono);
  background: transparent;
  overflow-x: auto;
}

.terminal-entry__content--assistant {
  max-height: 180px;
  overflow: hidden;
  padding: 8px 10px;
  border: 1px solid rgba(94, 234, 212, 0.1);
  border-radius: 7px;
  background: rgba(7, 12, 18, 0.62);
  color: #d9e6f2;
}

.terminal-entry__content--expanded {
  max-height: min(460px, 46vh);
  overflow: auto;
  overscroll-behavior: contain;
}

.terminal-entry__expand {
  justify-self: flex-start;
  border: 0;
  border-radius: 6px;
  padding: 3px 8px;
  background: rgba(94, 234, 212, 0.08);
  color: #8ef1df;
  font-family: var(--font-mono);
  font-size: 11px;
  cursor: pointer;
}

.terminal-entry__expand:hover {
  background: rgba(94, 234, 212, 0.14);
}

.terminal-entry__rendered {
  color: #d4deea;
  font-size: 14px;
  line-height: 1.75;
  padding: 12px 14px;
  border: 1px solid rgba(94, 234, 212, 0.12);
  border-radius: 10px;
  background: rgba(7, 12, 18, 0.72);
}

.terminal-entry__rendered--stream {
  position: relative;
}

.terminal-entry__rendered--stream::before {
  content: 'stream';
  position: absolute;
  top: 10px;
  right: 12px;
  color: rgba(94, 234, 212, 0.78);
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.terminal-entry__rendered:deep(h1),
.terminal-entry__rendered:deep(h2),
.terminal-entry__rendered:deep(h3),
.terminal-entry__rendered:deep(h4) {
  color: #f3f7fb;
  line-height: 1.35;
  margin: 18px 0 10px;
}

.terminal-entry__rendered:deep(h1) {
  font-size: 22px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(94, 234, 212, 0.18);
}

.terminal-entry__rendered:deep(h2) {
  font-size: 18px;
}

.terminal-entry__rendered:deep(h3) {
  font-size: 16px;
}

.terminal-entry__rendered:deep(p) {
  margin: 10px 0;
}

.terminal-entry__rendered:deep(ul),
.terminal-entry__rendered:deep(ol) {
  margin: 10px 0;
  padding-left: 22px;
}

.terminal-entry__rendered:deep(li + li) {
  margin-top: 6px;
}

.terminal-entry__rendered:deep(blockquote) {
  margin: 12px 0;
  padding: 10px 14px;
  border-left: 3px solid rgba(94, 234, 212, 0.62);
  background: rgba(94, 234, 212, 0.06);
  color: #b6c4d5;
}

.terminal-entry__rendered:deep(code) {
  border: 1px solid rgba(94, 234, 212, 0.14);
  border-radius: 6px;
  padding: 2px 5px;
  background: rgba(94, 234, 212, 0.06);
  color: #8ef1df;
  font-family: var(--font-mono);
  font-size: 0.92em;
}

.terminal-entry__rendered:deep(pre) {
  overflow: auto;
  margin: 14px 0;
  padding: 14px;
  border: 1px solid rgba(94, 234, 212, 0.14);
  border-radius: 10px;
  background: rgba(7, 12, 18, 0.86);
}

.terminal-entry__rendered:deep(pre code) {
  border: 0;
  padding: 0;
  background: transparent;
  color: #d6dee7;
  white-space: pre;
}

.terminal-entry__rendered:deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 14px 0;
  border: 1px solid rgba(94, 234, 212, 0.14);
  background: rgba(255, 255, 255, 0.01);
}

.terminal-entry__rendered:deep(th),
.terminal-entry__rendered:deep(td) {
  border: 1px solid rgba(94, 234, 212, 0.1);
  padding: 8px 10px;
  text-align: left;
  vertical-align: top;
}

.terminal-entry__rendered:deep(th) {
  color: #f3f7fb;
  background: rgba(94, 234, 212, 0.08);
}

.terminal-entry__rendered:deep(a) {
  color: #5eead4;
}

.terminal-entry__rendered:deep(hr) {
  border: 0;
  border-top: 1px solid rgba(94, 234, 212, 0.14);
  margin: 18px 0;
}

.terminal-entry__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.terminal-entry__file {
  color: #5eead4;
  font-size: 12px;
  font-family: var(--font-mono);
  word-break: break-all;
}

.terminal-entry .ghost-btn {
  border-color: rgba(94, 234, 212, 0.32);
  background: rgba(94, 234, 212, 0.08);
  color: #d6dee7;
}

@keyframes teamLiveSweep {
  0% {
    transform: translateX(-34%);
  }
  100% {
    transform: translateX(34%);
  }
}

@keyframes teamLivePulse {
  0%, 100% {
    box-shadow:
      0 0 0 1px rgba(var(--color-primary-rgb), 0.14),
      0 0 22px rgba(var(--color-primary-rgb), 0.08);
  }
  50% {
    box-shadow:
      0 0 0 1px rgba(var(--color-primary-rgb), 0.24),
      0 0 34px rgba(var(--color-primary-rgb), 0.18);
  }
}

@keyframes memberWorkingPulse {
  0%, 100% {
    transform: translateY(0);
    box-shadow:
      inset 0 0 0 1px rgba(var(--color-primary-rgb), 0.08),
      0 0 16px rgba(var(--color-primary-rgb), 0.08);
  }
  50% {
    transform: translateY(-2px);
    box-shadow:
      inset 0 0 0 1px rgba(var(--color-primary-rgb), 0.14),
      0 0 28px rgba(var(--color-primary-rgb), 0.18);
  }
}

@keyframes memberSignalSweep {
  0% {
    transform: translateX(-120%);
  }
  100% {
    transform: translateX(120%);
  }
}

@keyframes memberChangedFlash {
  0%, 100% {
    box-shadow: 0 0 0 rgba(var(--color-primary-rgb), 0);
  }
  50% {
    box-shadow: 0 0 24px rgba(var(--color-primary-rgb), 0.22);
  }
}

@keyframes liveDotPulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.38;
    transform: scale(0.7);
  }
}

@keyframes chipLivePulse {
  0%, 100% {
    box-shadow: 0 0 0 rgba(var(--color-primary-rgb), 0);
  }
  50% {
    box-shadow: 0 0 18px rgba(var(--color-primary-rgb), 0.18);
  }
}

@keyframes chipChangePulse {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-1px);
    box-shadow: 0 0 14px rgba(var(--color-primary-rgb), 0.16);
  }
}

@media (max-width: 1180px) {
  .task-command-layout {
    grid-template-columns: 300px minmax(0, 1fr);
  }

  .mission-flow__rail {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .mission-flow__compact-head,
  .mission-flow__hint {
    align-items: flex-start;
    flex-direction: column;
  }

  .task-inspector {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 820px) {
  .task-command-layout {
    grid-template-columns: 1fr;
    overflow: visible;
  }

  .task-rail,
  .mission-stage,
  .task-inspector {
    overflow: visible;
  }

  .task-rail {
    position: static;
    max-height: none;
  }

  .task-list {
    max-height: min(420px, 56vh);
  }

  .task-inspector {
    display: flex;
  }

  .mission-hero {
    grid-template-columns: 1fr;
  }

  .mission-hero__head,
  .mission-hero__tips {
    grid-column: auto;
  }

  .mission-hero__metrics {
    justify-self: start;
  }

  .mission-flow__rail {
    grid-template-columns: 1fr;
  }

  .flow-step {
    min-height: auto;
  }

  .mission-hero__metrics {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

}

@container task-command (max-width: 1260px) {
  .task-command-layout {
    grid-template-columns: minmax(220px, 270px) minmax(0, 1fr);
    gap: 14px;
    padding: 14px;
  }

  .task-rail {
    max-height: calc(100vh - 28px);
  }

  .mission-stage {
    padding-right: 0;
  }

  .task-inspector {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .surface {
    padding: 14px;
  }

  .mission-hero {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 12px;
  }

  .mission-hero__metrics {
    grid-template-columns: repeat(3, 76px);
  }

  .team-live-grid {
    grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
    gap: 10px;
  }

  .member-card {
    min-height: 244px;
    padding: 12px;
    gap: 10px;
  }

  .member-card__top {
    grid-template-columns: 32px minmax(0, 1fr) auto;
    gap: 8px;
  }

  .member-avatar {
    width: 32px;
    height: 32px;
  }

  .member-live-badge {
    padding: 0 7px;
    font-size: 10px;
  }

  .member-card p,
  .member-trail p {
    font-size: 12px;
    line-height: 1.45;
    -webkit-line-clamp: 2;
  }

  .member-card__trail {
    gap: 6px;
  }

  .member-trail {
    padding: 7px 8px;
  }

  .subtask-grid {
    grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  }
}

@container task-command (max-width: 980px) {
  .task-command-layout {
    grid-template-columns: 1fr;
    overflow: visible;
  }

  .task-rail,
  .mission-stage,
  .task-inspector {
    overflow: visible;
  }

  .task-rail {
    position: static;
    max-height: none;
  }

  .task-list {
    max-height: min(420px, 56vh);
  }

  .task-inspector {
    display: flex;
  }
}
</style>
