import { request } from './base'

export interface Skill {
  id: string
  name: string
  author?: string
  version?: string
  description?: string
  category?: string
  icon?: string
  downloads?: number
  rating?: number
  installed: boolean
  updateAvailable: boolean
  securityScan?: { status: 'safe' | 'warning' | 'danger' | 'pending' }
  repository?: string
  path?: string
  source?: string
  security_status?: string
}

export interface SkillsResponse {
  success: boolean
  skills: Skill[]
}

export const skillsApi = {
  async getSkills(): Promise<SkillsResponse> {
    return request('/api/skills')
  },

  async installSkill(skillId: string | { url: string }): Promise<{ success: boolean }> {
    return request('/api/skills/install', {
      method: 'POST',
      body: JSON.stringify(typeof skillId === 'string' ? { id: skillId } : skillId),
    })
  },

  async updateSkill(skillId: string): Promise<{ success: boolean }> {
    return request(`/api/skills/${skillId}/update`, {
      method: 'POST',
    })
  },

  async uninstallSkill(skillId: string): Promise<{ success: boolean }> {
    return request(`/api/skills/${skillId}`, {
      method: 'DELETE',
    })
  },
}
