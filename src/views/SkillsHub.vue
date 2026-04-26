<template>
  <div class="skills-hub-page">
    <!-- 背景效果 -->
    <div class="bg-grid"></div>
    <div class="bg-glow"></div>

    <!-- 内容区域 -->
    <div class="content-wrapper relative z-10">
      <!-- 顶部导航栏 -->
      <nav class="glass-card border-b border-white/10 sticky top-0 z-50">
        <div class="max-w-7xl mx-auto px-6 py-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-4">
              <div class="w-12 h-12 bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/30">
                <span class="text-2xl">⚡</span>
              </div>
              <div>
                <h1 class="text-2xl font-bold glow-text">
                  <span class="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">技能中心</span>
                </h1>
                <p class="text-xs text-gray-400 mono">SKILLS HUB // 本地管理技能并浏览外部注册表</p>
              </div>
            </div>
            <div class="flex items-center space-x-4">
              <button @click="refreshSkills" class="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-all shadow-lg shadow-cyan-500/30">
                <i :class="['fas fa-sync-alt', { 'animate-spin': loading }]"></i>
                <span>刷新</span>
              </button>
              <button @click="showCreateModal = true" class="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white text-sm rounded-lg hover:from-purple-600 hover:to-pink-700 transition-all shadow-lg shadow-purple-500/30">
                <i class="fas fa-plus"></i>
                <span>创建技能</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <!-- 主内容区 -->
      <div class="max-w-7xl mx-auto px-6 py-8">
        <!-- 标签页切换 -->
        <div class="flex items-center space-x-4 mb-8">
          <button
            @click="activeTab = 'installed'"
            :class="[
              'px-6 py-3 rounded-xl font-semibold transition-all',
              activeTab === 'installed'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            ]"
          >
            <i class="fas fa-folder-open mr-2"></i>
            已安装
            <span class="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">{{ skills.length }}</span>
          </button>
          <button
            @click="activeTab = 'registry'"
            :class="[
              'px-6 py-3 rounded-xl font-semibold transition-all',
              activeTab === 'registry'
                ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg shadow-purple-500/30'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            ]"
          >
            <i class="fas fa-cloud mr-2"></i>
            注册表
          </button>
        </div>

        <!-- ========== 已安装标签页 ========== -->
        <div v-show="activeTab === 'installed'">
          <!-- 统计卡片 -->
          <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div class="glass-card p-6 border-l-4 border-cyan-500">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-gray-400 text-sm">总技能数</p>
                  <p class="text-3xl font-bold text-white mono">{{ skills.length }}</p>
                </div>
                <div class="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center">
                  <i class="fas fa-cube text-cyan-400 text-xl"></i>
                </div>
              </div>
            </div>
            <div class="glass-card p-6 border-l-4 border-green-500">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-gray-400 text-sm">已安装</p>
                  <p class="text-3xl font-bold text-white mono">{{ installedCount }}</p>
                </div>
                <div class="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                  <i class="fas fa-check-circle text-green-400 text-xl"></i>
                </div>
              </div>
            </div>
            <div class="glass-card p-6 border-l-4 border-yellow-500">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-gray-400 text-sm">可更新</p>
                  <p class="text-3xl font-bold text-white mono">{{ updateCount }}</p>
                </div>
                <div class="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                  <i class="fas fa-cloud-download-alt text-yellow-400 text-xl"></i>
                </div>
              </div>
            </div>
            <div class="glass-card p-6 border-l-4 border-purple-500">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-gray-400 text-sm">安全扫描</p>
                  <p class="text-3xl font-bold text-white mono">{{ safeCount }}</p>
                </div>
                <div class="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                  <i class="fas fa-shield-alt text-purple-400 text-xl"></i>
                </div>
              </div>
            </div>
          </div>

          <!-- 搜索与过滤 -->
          <div class="glass-card p-6 mb-8">
            <div class="flex flex-col md:flex-row gap-4">
              <div class="flex-1 relative">
                <i class="fas fa-search absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                <input
                  v-model="searchQuery"
                  type="text"
                  placeholder="搜索技能名称、描述..."
                  class="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none transition-colors"
                />
              </div>
              <select v-model="categoryFilter" class="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-cyan-500 focus:outline-none transition-colors">
                <option value="">全部分类</option>
                <option value="tool">🔧 工具类</option>
                <option value="analysis">📊 分析类</option>
                <option value="automation">⚙️ 自动化</option>
                <option value="security">🔐 安全类</option>
                <option value="communication">📡 通信类</option>
              </select>
              <select v-model="sourceFilter" class="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-cyan-500 focus:outline-none transition-colors">
                <option value="">全部来源</option>
                <option value="workspace">💼 Workspace</option>
                <option value="user-agents">🔧 User Agents</option>
                <option value="openclaw">🔌 OpenClaw</option>
              </select>
            </div>
          </div>

          <!-- 加载状态 -->
          <div v-if="loading" class="flex items-center justify-center py-20">
            <div class="text-center">
              <i class="fas fa-spinner fa-spin text-4xl text-cyan-400 mb-4"></i>
              <p class="text-gray-400">加载技能库中...</p>
            </div>
          </div>

          <!-- 技能网格 -->
          <div v-else-if="filteredSkills.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div
              v-for="skill in filteredSkills"
              :key="skill.id"
              class="glass-card overflow-hidden border-l-4 transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/10 cursor-pointer"
              :class="getBorderColorClass(skill)"
              @click="viewSkillDetail(skill)"
            >
              <!-- 卡片头部 -->
              <div class="p-6 border-b border-white/5 bg-gradient-to-r from-white/5 to-transparent">
                <div class="flex items-start justify-between">
                  <div class="flex items-center space-x-4">
                    <div class="w-14 h-14 rounded-xl flex items-center justify-center text-2xl"
                         :class="getIconBgClass(skill.source)">
                      {{ skill.icon }}
                    </div>
                    <div>
                      <h3 class="text-lg font-bold text-white">{{ skill.name }}</h3>
                      <p class="text-xs text-gray-500 mono">{{ skill.source }}</p>
                    </div>
                  </div>
                  <span class="px-2 py-1 text-xs rounded-full mono"
                        :class="getStatusBadgeClass(skill)">
                    {{ skill.installed ? '已安装' : '未安装' }}
                  </span>
                </div>
              </div>

              <!-- 卡片主体 -->
              <div class="p-6">
                <p class="text-gray-400 text-sm mb-4 line-clamp-2">
                  {{ skill.description || '暂无描述' }}
                </p>
                <div class="flex items-center space-x-4 text-xs text-gray-500">
                  <span class="flex items-center space-x-1">
                    <i class="fas fa-folder"></i>
                    <span>{{ skill.category }}</span>
                  </span>
                  <span v-if="skill.securityScan" class="flex items-center space-x-1">
                    <i :class="getSecurityIcon(skill.securityScan.status)"></i>
                    <span>{{ getSecurityText(skill.securityScan.status) }}</span>
                  </span>
                </div>
              </div>

              <!-- 卡片底部 -->
              <div class="px-6 py-4 border-t border-white/5 bg-white/2 flex items-center justify-between">
                <div class="flex items-center space-x-2">
                  <button v-if="!skill.installed" @click.stop="installSkill(skill)"
                          class="px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-all">
                    <i class="fas fa-download mr-1"></i>安装
                  </button>
                  <button v-else-if="skill.updateAvailable" @click.stop="updateSkill(skill)"
                          class="px-3 py-1.5 bg-gradient-to-r from-yellow-500 to-orange-600 text-white text-xs rounded-lg hover:from-yellow-600 hover:to-orange-700 transition-all">
                    <i class="fas fa-sync-alt mr-1"></i>更新
                  </button>
                  <button v-else @click.stop="uninstallSkill(skill)"
                          class="px-3 py-1.5 bg-white/10 text-gray-300 text-xs rounded-lg hover:bg-red-500/20 hover:text-red-400 transition-all">
                    <i class="fas fa-trash mr-1"></i>卸载
                  </button>
                </div>
                <button @click.stop="viewSkillDetail(skill)"
                        class="px-3 py-1.5 text-cyan-400 text-xs hover:text-cyan-300 transition-colors">
                  查看详情 <i class="fas fa-arrow-right ml-1"></i>
                </button>
              </div>
            </div>
          </div>

          <!-- 空状态 -->
          <div v-else class="text-center py-20">
            <i class="fas fa-box-open text-6xl text-gray-600 mb-4"></i>
            <p class="text-gray-400">没有找到匹配的技能</p>
          </div>
        </div>

        <!-- ========== 注册表标签页 ========== -->
        <div v-show="activeTab === 'registry'">
          <!-- 注册表来源切换 -->
          <div class="glass-card p-6 mb-8">
            <div class="flex flex-col lg:flex-row gap-6">
              <!-- 搜索框 -->
              <div class="flex-1 relative">
                <i class="fas fa-search absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                <input
                  v-model="registrySearchQuery"
                  type="text"
                  placeholder="搜索 ClawdHub、skills.sh 或 Awesome OpenClaw..."
                  class="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none transition-colors"
                  @keyup.enter="searchRegistry"
                />
              </div>

              <!-- 安装目录选择 -->
              <div class="flex items-center space-x-4">
                <span class="text-gray-400 text-sm whitespace-nowrap">安装到：</span>
                <select v-model="installTarget" class="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-purple-500 focus:outline-none transition-colors">
                  <option value="workspace">~/.openclaw/workspace/skills</option>
                  <option value="user-agents">~/.agents/skills</option>
                  <option value="openclaw">~/.openclaw/skills</option>
                </select>
                <button @click="searchRegistry" class="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl hover:from-purple-600 hover:to-pink-700 transition-all whitespace-nowrap">
                  <i class="fas fa-search mr-2"></i>搜索
                </button>
              </div>
            </div>

            <!-- 注册表来源标签 -->
            <div class="flex items-center space-x-4 mt-6">
              <button
                v-for="src in registrySources"
                :key="src.id"
                @click="toggleRegistrySource(src.id)"
                :class="[
                  'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  selectedRegistrySources.includes(src.id)
                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50'
                    : 'bg-white/5 text-gray-500 border border-white/10'
                ]"
              >
                <i :class="src.icon" class="mr-2"></i>{{ src.name }}
                <span v-if="registryResults[src.id]?.total" class="ml-2 text-xs">
                  ({{ registryResults[src.id].total }})
                </span>
              </button>
            </div>
          </div>

          <!-- 搜索中状态 -->
          <div v-if="registrySearching" class="flex items-center justify-center py-20">
            <div class="text-center">
              <i class="fas fa-spinner fa-spin text-4xl text-purple-400 mb-4"></i>
              <p class="text-gray-400">正在搜索注册表...</p>
            </div>
          </div>

          <!-- 注册表搜索结果 -->
          <div v-else class="space-y-8">
            <div v-for="source in selectedRegistrySources" :key="source" class="space-y-4">
              <!-- 来源标题 -->
              <div class="flex items-center space-x-3">
                <i :class="getRegistrySourceIcon(source)" class="text-xl"></i>
                <h3 class="text-lg font-bold text-white">{{ getRegistrySourceName(source) }}</h3>
                <span class="text-sm text-gray-500">
                  {{ registryResults[source]?.total || 0 }} 个技能
                </span>
                <span v-if="registryResults[source]?.error" class="text-sm text-red-400">
                  ({{ registryResults[source].error }})
                </span>
              </div>

              <!-- 技能列表 -->
              <div v-if="registryResults[source]?.skills?.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div
                  v-for="skill in registryResults[source].skills"
                  :key="skill.slug"
                  class="glass-card p-5 border-l-4 border-purple-500/50 hover:border-purple-500 transition-all cursor-pointer"
                  @click="viewRegistrySkillDetail(skill)"
                >
                  <div class="flex items-start justify-between mb-3">
                    <div>
                      <h4 class="font-bold text-white">{{ skill.name }}</h4>
                      <p class="text-xs text-gray-500 mono">{{ skill.slug }}</p>
                    </div>
                    <span class="px-2 py-1 text-xs rounded-full bg-purple-500/20 text-purple-400">
                      {{ skill.version || 'v1.0' }}
                    </span>
                  </div>
                  <p class="text-gray-400 text-sm mb-3 line-clamp-2">{{ skill.description }}</p>
                  <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-3 text-xs text-gray-500">
                      <span v-if="skill.author"><i class="fas fa-user mr-1"></i>{{ skill.author }}</span>
                      <span v-if="skill.installCount"><i class="fas fa-download mr-1"></i>{{ skill.installCount }}</span>
                    </div>
                    <button @click.stop="installFromRegistry(skill)"
                            :disabled="installingSkills.has(skill.slug)"
                            class="px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-600 text-white text-xs rounded-lg hover:from-purple-600 hover:to-pink-700 transition-all disabled:opacity-50">
                      <i :class="installingSkills.has(skill.slug) ? 'fas fa-spinner fa-spin' : 'fas fa-download'" class="mr-1"></i>
                      {{ installingSkills.has(skill.slug) ? '安装中' : '安装' }}
                    </button>
                  </div>
                </div>
              </div>

              <!-- 空状态 -->
              <div v-else-if="!registryResults[source]?.error" class="text-center py-10">
                <p class="text-gray-500">暂无技能</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 技能详情对话框 -->
    <div v-if="showDetailModal && selectedSkill" class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" @click="showDetailModal = false">
      <div class="glass-card w-full max-w-4xl max-h-[90vh] overflow-hidden" @click.stop>
        <!-- 详情头部 -->
        <div class="p-6 border-b border-white/10 bg-gradient-to-r from-cyan-500/10 to-purple-500/10">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-4">
              <div class="w-16 h-16 rounded-xl flex items-center justify-center text-3xl"
                   :class="getIconBgClass(selectedSkill.source)">
                {{ selectedSkill.icon }}
              </div>
              <div>
                <h2 class="text-2xl font-bold text-white">{{ selectedSkill.name }}</h2>
                <div class="flex items-center space-x-4 mt-1 text-sm text-gray-400">
                  <span><i class="fas fa-folder mr-1"></i>{{ selectedSkill.category }}</span>
                  <span><i class="fas fa-code-branch mr-1"></i>{{ selectedSkill.source }}</span>
                  <span v-if="selectedSkill.version"><i class="fas fa-tag mr-1"></i>v{{ selectedSkill.version }}</span>
                </div>
              </div>
            </div>
            <button @click="showDetailModal = false" class="text-gray-400 hover:text-white transition-colors">
              <i class="fas fa-times text-xl"></i>
            </button>
          </div>
        </div>

        <!-- 详情主体 -->
        <div class="p-6 overflow-y-auto max-h-[60vh]">
          <!-- 安全扫描状态 -->
          <div v-if="selectedSkill.securityScan" class="mb-6 p-4 rounded-xl"
               :class="getSecurityBgClass(selectedSkill.securityScan.status)">
            <div class="flex items-center space-x-3">
              <i :class="getSecurityIcon(selectedSkill.securityScan.status)" class="text-xl"></i>
              <div>
                <p class="font-semibold" :class="getSecurityTextClass(selectedSkill.securityScan.status)">
                  {{ getSecurityText(selectedSkill.securityScan.status) }}
                </p>
                <p class="text-sm text-gray-400">安全扫描状态</p>
              </div>
            </div>
          </div>

          <!-- 技能描述 -->
          <div class="mb-6">
            <h4 class="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">描述</h4>
            <p class="text-gray-300">{{ selectedSkill.description || '暂无描述' }}</p>
          </div>

          <!-- 技能内容 -->
          <div v-if="skillContent" class="mb-6">
            <h4 class="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">技能内容</h4>
            <div class="bg-black/30 rounded-xl p-4 max-h-96 overflow-y-auto">
              <pre class="text-sm text-gray-300 whitespace-pre-wrap font-mono">{{ skillContent }}</pre>
            </div>
          </div>

          <!-- 技能路径 -->
          <div v-if="selectedSkill.path" class="mb-6">
            <h4 class="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">文件路径</h4>
            <div class="bg-black/30 rounded-xl p-4">
              <code class="text-sm text-cyan-400 mono break-all">{{ selectedSkill.path }}</code>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="flex items-center space-x-4">
            <button v-if="!selectedSkill.installed" @click="installSkill(selectedSkill)"
                    class="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl hover:from-cyan-600 hover:to-blue-700 transition-all">
              <i class="fas fa-download mr-2"></i>安装技能
            </button>
            <button v-else-if="selectedSkill.updateAvailable" @click="updateSkill(selectedSkill)"
                    class="flex-1 py-3 bg-gradient-to-r from-yellow-500 to-orange-600 text-white rounded-xl hover:from-yellow-600 hover:to-orange-700 transition-all">
              <i class="fas fa-sync-alt mr-2"></i>更新技能
            </button>
            <button v-else @click="uninstallSkill(selectedSkill)"
                    class="flex-1 py-3 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 transition-all">
              <i class="fas fa-trash mr-2"></i>卸载技能
            </button>
            <button @click="scanSkillSecurity(selectedSkill)"
                    class="py-3 px-6 bg-white/10 text-gray-300 rounded-xl hover:bg-white/20 transition-all">
              <i class="fas fa-shield-alt mr-2"></i>安全扫描
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 注册表技能详情对话框 -->
    <div v-if="showRegistryDetailModal && selectedRegistrySkill" class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" @click="showRegistryDetailModal = false">
      <div class="glass-card w-full max-w-4xl max-h-[90vh] overflow-hidden" @click.stop>
        <div class="p-6 border-b border-white/10 bg-gradient-to-r from-purple-500/10 to-pink-500/10">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-2xl font-bold text-white">{{ selectedRegistrySkill.name }}</h2>
              <div class="flex items-center space-x-4 mt-1 text-sm text-gray-400">
                <span><i class="fas fa-code-branch mr-1"></i>{{ selectedRegistrySkill.slug }}</span>
                <span v-if="selectedRegistrySkill.author"><i class="fas fa-user mr-1"></i>{{ selectedRegistrySkill.author }}</span>
                <span><i class="fas fa-tag mr-1"></i>{{ selectedRegistrySkill.version || 'v1.0' }}</span>
              </div>
            </div>
            <button @click="showRegistryDetailModal = false" class="text-gray-400 hover:text-white transition-colors">
              <i class="fas fa-times text-xl"></i>
            </button>
          </div>
        </div>

        <div class="p-6 overflow-y-auto max-h-[60vh]">
          <div class="mb-6">
            <h4 class="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">描述</h4>
            <p class="text-gray-300">{{ selectedRegistrySkill.description || '暂无描述' }}</p>
          </div>

          <div v-if="selectedRegistrySkill.tags?.length" class="mb-6">
            <h4 class="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">标签</h4>
            <div class="flex flex-wrap gap-2">
              <span v-for="tag in selectedRegistrySkill.tags" :key="tag"
                    class="px-3 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-full">
                {{ tag }}
              </span>
            </div>
          </div>

          <div class="flex items-center space-x-4">
            <button @click="installFromRegistry(selectedRegistrySkill)"
                    :disabled="installingSkills.has(selectedRegistrySkill.slug)"
                    class="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl hover:from-purple-600 hover:to-pink-700 transition-all disabled:opacity-50">
              <i :class="installingSkills.has(selectedRegistrySkill.slug) ? 'fas fa-spinner fa-spin' : 'fas fa-download'" class="mr-2"></i>
              {{ installingSkills.has(selectedRegistrySkill.slug) ? '安装中...' : '安装技能' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 创建技能对话框 -->
    <div v-if="showCreateModal" class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" @click="showCreateModal = false">
      <div class="glass-card w-full max-w-2xl overflow-hidden" @click.stop>
        <div class="p-6 border-b border-white/10 bg-gradient-to-r from-purple-500/10 to-pink-500/10">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-bold text-white">
              <i class="fas fa-magic mr-2 text-purple-400"></i>创建新技能
            </h2>
            <button @click="showCreateModal = false" class="text-gray-400 hover:text-white transition-colors">
              <i class="fas fa-times text-xl"></i>
            </button>
          </div>
        </div>

        <div class="p-6 space-y-6">
          <div>
            <label class="block text-sm font-semibold text-gray-400 mb-2">技能名称</label>
            <input v-model="newSkill.name" type="text" placeholder="my-awesome-skill"
                   class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none transition-colors" />
          </div>

          <div>
            <label class="block text-sm font-semibold text-gray-400 mb-2">技能来源</label>
            <select v-model="newSkill.source"
                    class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-purple-500 focus:outline-none transition-colors">
              <option value="workspace">💼 Workspace</option>
              <option value="user-agents">🔧 User Agents</option>
              <option value="openclaw">🔌 OpenClaw</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-semibold text-gray-400 mb-2">技能内容 (Markdown)</label>
            <textarea v-model="newSkill.content" rows="8" placeholder="# My Skill&#10;&#10;描述这个技能的功能..."
                      class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none transition-colors font-mono text-sm resize-none"></textarea>
          </div>

          <div class="flex items-center justify-end space-x-4">
            <button @click="showCreateModal = false" class="px-6 py-3 bg-white/10 text-gray-300 rounded-xl hover:bg-white/20 transition-all">
              取消
            </button>
            <button @click="createSkill" :disabled="!newSkill.name" class="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl hover:from-purple-600 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
              <i class="fas fa-plus mr-2"></i>创建技能
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { useNotification } from '@/composables/useNotification'

interface Skill {
  id: string
  name: string
  author?: string
  version?: string
  description?: string
  icon?: string
  category?: string
  downloads?: number
  rating?: number
  installed?: boolean
  updateAvailable?: boolean
  securityScan?: { status: string }
  source?: string
  path?: string
  content_hash?: string
  registry_slug?: string
  security_status?: string
}

interface RegistrySkill {
  slug: string
  name: string
  description?: string
  author?: string
  version?: string
  source: string
  installCount?: number
  tags?: string[]
  hash?: string
  url?: string
}

const notification = useNotification()

const skills = ref<Skill[]>([])
const loading = ref(false)
const activeTab = ref<'installed' | 'registry'>('installed')
const searchQuery = ref('')
const categoryFilter = ref('')
const sourceFilter = ref('')
const showDetailModal = ref(false)
const showCreateModal = ref(false)
const showRegistryDetailModal = ref(false)
const selectedSkill = ref<Skill | null>(null)
const selectedRegistrySkill = ref<RegistrySkill | null>(null)
const skillContent = ref('')

// 注册表相关
const registrySearchQuery = ref('')
const registrySearching = ref(false)
const registryResults = reactive<Record<string, { skills: RegistrySkill[], total: number, error?: string }>>({})
const selectedRegistrySources = ref(['clawhub', 'skills-sh', 'awesome-openclaw'])
const installTarget = ref('workspace')
const installingSkills = ref(new Set<string>())

const registrySources = [
  { id: 'clawhub', name: 'ClawdHub', icon: 'fas fa-gem' },
  { id: 'skills-sh', name: 'Skills.sh', icon: 'fas fa-terminal' },
  { id: 'awesome-openclaw', name: 'Awesome OpenClaw', icon: 'fab fa-github' }
]

const newSkill = ref({
  name: '',
  source: 'workspace',
  content: ''
})

// 统计计算
const installedCount = computed(() => skills.value.filter(s => s.installed).length)
const updateCount = computed(() => skills.value.filter(s => s.updateAvailable).length)
const safeCount = computed(() => skills.value.filter(s => s.securityScan?.status === 'safe').length)

// 过滤后的技能列表
const filteredSkills = computed(() => {
  return skills.value.filter(skill => {
    const matchesSearch = !searchQuery.value ||
      skill.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      (skill.description || '').toLowerCase().includes(searchQuery.value.toLowerCase())
    const matchesCategory = !categoryFilter.value || skill.category === categoryFilter.value
    const matchesSource = !sourceFilter.value || skill.source === sourceFilter.value
    return matchesSearch && matchesCategory && matchesSource
  })
})

// 获取技能列表
async function fetchSkills() {
  loading.value = true
  try {
    const response = await fetch('/api/skills')
    const data = await response.json()
    if (data.success) {
      skills.value = data.skills || []
    }
  } catch (e) {
    console.error('Failed to fetch skills:', e)
  } finally {
    loading.value = false
  }
}

// 刷新技能
function refreshSkills() {
  fetchSkills()
}

// 搜索注册表
async function searchRegistry() {
  registrySearching.value = true
  try {
    const response = await fetch(`/api/skills/registry/search?q=${encodeURIComponent(registrySearchQuery.value)}`)
    const data = await response.json()
    if (data.success) {
      // 清空旧结果
      Object.keys(registryResults).forEach(key => {
        registryResults[key] = { skills: [], total: 0 }
      })
      // 填充新结果
      if (data.registries) {
        Object.assign(registryResults, data.registries)
      }
    }
  } catch (e) {
    console.error('Registry search failed:', e)
  } finally {
    registrySearching.value = false
  }
}

// 切换注册表来源
function toggleRegistrySource(sourceId: string) {
  const idx = selectedRegistrySources.value.indexOf(sourceId)
  if (idx > -1) {
    selectedRegistrySources.value.splice(idx, 1)
  } else {
    selectedRegistrySources.value.push(sourceId)
  }
}

// 从注册表安装
async function installFromRegistry(skill: RegistrySkill) {
  installingSkills.value.add(skill.slug)
  try {
    const response = await fetch('/api/skills/registry/install', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: skill.source,
        slug: skill.slug,
        targetRoot: getInstallPath()
      })
    })
    const data = await response.json()
    if (data.success) {
      notification.success(`安装成功：${skill.name}`)
      fetchSkills()
      showRegistryDetailModal.value = false
    } else {
      notification.error('安装失败: ' + (data.error || data.message))
    }
  } catch (e: any) {
    notification.error('安装失败: ' + e.message)
  } finally {
    installingSkills.value.delete(skill.slug)
  }
}

// 获取安装路径
function getInstallPath() {
  const home = '~' // 会被后端解析
  const paths: Record<string, string> = {
    'workspace': `${home}/.openclaw/workspace/skills`,
    'user-agents': `${home}/.agents/skills`,
    'openclaw': `${home}/.openclaw/skills`
  }
  return paths[installTarget.value] || paths['workspace']
}

// 查看技能详情
async function viewSkillDetail(skill: Skill) {
  selectedSkill.value = skill
  skillContent.value = ''
  showDetailModal.value = true

  if (skill.source && skill.name) {
    try {
      const response = await fetch(`/api/skills?mode=content&source=${skill.source}&name=${skill.name}`)
      const data = await response.json()
      if (data.success) {
        skillContent.value = data.content || ''
        if (data.security && selectedSkill.value) {
          selectedSkill.value = { ...selectedSkill.value, securityScan: { status: data.security.status } }
        }
      }
    } catch (e) {
      console.error('Failed to fetch skill content:', e)
    }
  }
}

// 查看注册表技能详情
function viewRegistrySkillDetail(skill: RegistrySkill) {
  selectedRegistrySkill.value = skill
  showRegistryDetailModal.value = true
}

// 安装技能
async function installSkill(skill: Skill) {
  try {
    const response = await fetch('/api/skills/install', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: skill.id })
    })
    const data = await response.json()
    if (data.success) {
      fetchSkills()
      showDetailModal.value = false
    } else {
      notification.error('安装失败: ' + data.error)
    }
  } catch (e: any) {
    notification.error('安装失败: ' + e.message)
  }
}

// 更新技能
async function updateSkill(skill: Skill) {
  try {
    const response = await fetch(`/api/skills/${encodeURIComponent(skill.id)}/update`, {
      method: 'POST'
    })
    const data = await response.json()
    if (data.success) {
      fetchSkills()
    } else {
      notification.error('更新失败: ' + data.error)
    }
  } catch (e: any) {
    notification.error('更新失败: ' + e.message)
  }
}

// 卸载技能
async function uninstallSkill(skill: Skill) {
  const confirmed = await notification.confirm(`确定要卸载 ${skill.name} 吗？`, '卸载技能')
  if (!confirmed) return

  try {
    const response = await fetch(`/api/skills?source=${skill.source}&name=${skill.name}`, {
      method: 'DELETE'
    })
    const data = await response.json()
    if (data.success) {
      fetchSkills()
      showDetailModal.value = false
    } else {
      notification.error('卸载失败: ' + data.error)
    }
  } catch (e: any) {
    notification.error('卸载失败: ' + e.message)
  }
}

// 安全扫描
async function scanSkillSecurity(skill: Skill) {
  if (!skill.source || !skill.name) return

  try {
    const response = await fetch(`/api/skills?mode=check&source=${skill.source}&name=${skill.name}`)
    const data = await response.json()
    if (data.success && data.security && selectedSkill.value) {
      selectedSkill.value = { ...selectedSkill.value, securityScan: { status: data.security.status } }
      notification.success(`安全扫描完成: ${data.security.status}`)
    }
  } catch (e: any) {
    notification.error('扫描失败: ' + e.message)
  }
}

// 创建技能
async function createSkill() {
  if (!newSkill.value.name) return

  try {
    const response = await fetch('/api/skills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSkill.value)
    })
    const data = await response.json()
    if (data.success) {
      showCreateModal.value = false
      newSkill.value = { name: '', source: 'workspace', content: '' }
      fetchSkills()
    } else {
      notification.error('创建失败: ' + data.error)
    }
  } catch (e: any) {
    notification.error('创建失败: ' + e.message)
  }
}

// 样式辅助函数
function getBorderColorClass(skill: Skill) {
  if (skill.updateAvailable) return 'border-yellow-500'
  if (skill.installed) return 'border-green-500'
  return 'border-cyan-500/50'
}

function getIconBgClass(source?: string) {
  const classes: Record<string, string> = {
    'workspace': 'bg-purple-500/20 text-purple-400',
    'user-agents': 'bg-cyan-500/20 text-cyan-400',
    'openclaw': 'bg-green-500/20 text-green-400',
    'user-codex': 'bg-yellow-500/20 text-yellow-400',
    'project-agents': 'bg-pink-500/20 text-pink-400'
  }
  return classes[source || ''] || 'bg-gray-500/20 text-gray-400'
}

function getStatusBadgeClass(skill: Skill) {
  if (skill.updateAvailable) return 'bg-yellow-500/20 text-yellow-400'
  if (skill.installed) return 'bg-green-500/20 text-green-400'
  return 'bg-gray-500/20 text-gray-400'
}

function getSecurityIcon(status: string) {
  const icons: Record<string, string> = {
    'safe': 'fas fa-check-circle text-green-400',
    'warning': 'fas fa-exclamation-triangle text-yellow-400',
    'danger': 'fas fa-times-circle text-red-400',
    'pending': 'fas fa-clock text-gray-400'
  }
  return icons[status] || 'fas fa-question-circle text-gray-400'
}

function getSecurityText(status: string) {
  const texts: Record<string, string> = {
    'safe': '安全',
    'warning': '警告',
    'danger': '危险',
    'pending': '未扫描'
  }
  return texts[status] || '未知'
}

function getSecurityBgClass(status: string) {
  const classes: Record<string, string> = {
    'safe': 'bg-green-500/10 border border-green-500/20',
    'warning': 'bg-yellow-500/10 border border-yellow-500/20',
    'danger': 'bg-red-500/10 border border-red-500/20',
    'pending': 'bg-gray-500/10 border border-gray-500/20'
  }
  return classes[status] || 'bg-gray-500/10 border border-gray-500/20'
}

function getSecurityTextClass(status: string) {
  const classes: Record<string, string> = {
    'safe': 'text-green-400',
    'warning': 'text-yellow-400',
    'danger': 'text-red-400',
    'pending': 'text-gray-400'
  }
  return classes[status] || 'text-gray-400'
}

function getRegistrySourceIcon(source: string) {
  const icons: Record<string, string> = {
    'clawhub': 'fas fa-gem text-purple-400',
    'skills-sh': 'fas fa-terminal text-cyan-400',
    'awesome-openclaw': 'fab fa-github text-gray-400'
  }
  return icons[source] || 'fas fa-cube text-gray-400'
}

function getRegistrySourceName(source: string) {
  const names: Record<string, string> = {
    'clawhub': 'ClawdHub',
    'skills-sh': 'Skills.sh',
    'awesome-openclaw': 'Awesome OpenClaw'
  }
  return names[source] || source
}

onMounted(() => {
  fetchSkills()
  // 初始加载注册表
  searchRegistry()
})
</script>

<style>
/* 技能中心专属样式 */
.skills-hub-page {
  position: relative;
  width: 100%;
  min-height: 100vh;
  background: linear-gradient(135deg, #0f172a 0%, #020617 100%);
  overflow-x: hidden;
}

.skills-hub-page .content-wrapper {
  position: relative;
  z-index: 10;
  width: 100%;
  min-height: 100vh;
}

.skills-hub-page .bg-grid {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image:
    linear-gradient(rgba(99, 102, 241, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(99, 102, 241, 0.03) 1px, transparent 1px);
  background-size: 50px 50px;
  pointer-events: none;
  z-index: 0;
}

.skills-hub-page .bg-glow {
  position: fixed;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle at 20% 80%, rgba(6, 182, 212, 0.08) 0%, transparent 50%),
              radial-gradient(circle at 80% 20%, rgba(139, 92, 246, 0.08) 0%, transparent 50%);
  animation: float 20s ease-in-out infinite;
  pointer-events: none;
  z-index: 0;
}

@keyframes float {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(-2%, -2%) scale(1.05); }
}

.skills-hub-page .glass-card {
  background: rgba(17, 24, 39, 0.8);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  transition: all 0.3s ease;
}

.skills-hub-page .mono {
  font-family: 'JetBrains Mono', monospace;
}

.skills-hub-page .glow-text {
  text-shadow: 0 0 20px rgba(6, 182, 212, 0.5);
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 下拉选择框样式修复 */
.skills-hub-page select option {
  background: #1e293b;
  color: white;
}
</style>
