import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { skillsApi, type Skill } from '@/api'

export const useSkillsStore = defineStore('skills', () => {
  // State
  const skills = ref<Skill[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // 统计
  const totalSkills = computed(() => skills.value.length)
  const installedSkills = computed(() => skills.value.filter(s => s.installed).length)
  const availableSkills = computed(() => skills.value.filter(s => !s.installed).length)
  const updateAvailable = computed(() => skills.value.filter(s => s.updateAvailable).length)

  // 按分类过滤
  const categories = computed(() => {
    const cats = new Set<string>()
    skills.value.forEach(s => cats.add(s.category))
    return Array.from(cats)
  })

  // Actions
  async function fetchSkills() {
    loading.value = true
    error.value = null
    try {
      const response = await skillsApi.getSkills()
      skills.value = response.skills || []
    } catch (e: any) {
      error.value = e.message || '加载技能列表失败'
      console.error('Failed to fetch skills:', e)
      // 如果 API 失败，使用空数组
      skills.value = []
    } finally {
      loading.value = false
    }
  }

  async function installSkill(skillData: string | { url: string }) {
    try {
      const result = await skillsApi.installSkill(skillData)
      if (result.success) {
        await fetchSkills()
      }
      return result
    } catch (e: any) {
      console.error('Failed to install skill:', e)
      throw e
    }
  }

  async function updateSkill(skillId: string) {
    try {
      const result = await skillsApi.updateSkill(skillId)
      if (result.success) {
        await fetchSkills()
      }
      return result
    } catch (e: any) {
      console.error('Failed to update skill:', e)
      throw e
    }
  }

  async function uninstallSkill(skillId: string) {
    try {
      const result = await skillsApi.uninstallSkill(skillId)
      if (result.success) {
        await fetchSkills()
      }
      return result
    } catch (e: any) {
      console.error('Failed to uninstall skill:', e)
      throw e
    }
  }

  return {
    // State
    skills,
    loading,
    error,
    // Getters
    totalSkills,
    installedSkills,
    availableSkills,
    updateAvailable,
    categories,
    // Actions
    fetchSkills,
    installSkill,
    updateSkill,
    uninstallSkill,
  }
})
