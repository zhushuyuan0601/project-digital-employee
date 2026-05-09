import { request } from './base'

export interface MailChannel {
  id: string
  name: string
  enabled: boolean
  provider: string
  host: string
  port: number
  secure: boolean
  username: string
  mailbox: string
  scan_interval_minutes: number
  unseen_only: boolean
  mark_seen: boolean
  subject_filter: string
  from_filter: string
  body_keywords: string
  task_priority: string
  last_uid?: number | null
  last_scan_at?: number | null
  last_success_at?: number | null
  last_error?: string | null
  has_password: boolean
  created_at?: number
  updated_at?: number
}

export interface MailTrigger {
  id: number
  channel_id: string
  message_uid?: number | null
  message_id?: string | null
  subject?: string | null
  from_address?: string | null
  received_at?: number | null
  task_id?: string | null
  status: string
  error?: string | null
  created_at: number
}

export interface MailStatus {
  scannerStarted: boolean
  scannerRunning: boolean
  channelCount: number
  activeChannelCount: number
  lastScanAt?: number | null
  recentTriggers: MailTrigger[]
}

export type MailChannelPayload = Partial<MailChannel> & {
  password?: string
}

interface MailChannelsResponse {
  success: boolean
  channels: MailChannel[]
}

interface MailChannelResponse {
  success: boolean
  channel: MailChannel
}

interface MailStatusResponse {
  success: boolean
  status: MailStatus
}

interface MailActionResponse {
  success: boolean
  result?: Record<string, unknown>
  channel?: MailChannel
  triggers?: MailTrigger[]
}

interface MailTriggersResponse {
  success: boolean
  triggers: MailTrigger[]
}

export const mailApi = {
  status() {
    return request<MailStatusResponse>('/api/mail/status')
  },

  listChannels() {
    return request<MailChannelsResponse>('/api/mail/channels')
  },

  createChannel(payload: MailChannelPayload) {
    return request<MailChannelResponse>('/api/mail/channels', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  updateChannel(channelId: string, payload: MailChannelPayload) {
    return request<MailChannelResponse>(`/api/mail/channels/${encodeURIComponent(channelId)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },

  deleteChannel(channelId: string) {
    return request<{ success: boolean }>(`/api/mail/channels/${encodeURIComponent(channelId)}`, {
      method: 'DELETE',
    })
  },

  testChannel(channelId: string) {
    return request<MailActionResponse>(`/api/mail/channels/${encodeURIComponent(channelId)}/test`, {
      method: 'POST',
    })
  },

  scanChannel(channelId: string) {
    return request<MailActionResponse>(`/api/mail/channels/${encodeURIComponent(channelId)}/scan`, {
      method: 'POST',
    })
  },

  scanDueChannels() {
    return request<MailActionResponse>('/api/mail/scan', {
      method: 'POST',
    })
  },

  listTriggers(params: { channelId?: string; limit?: number } = {}) {
    const search = new URLSearchParams()
    if (params.channelId) search.set('channelId', params.channelId)
    if (params.limit) search.set('limit', String(params.limit))
    const query = search.toString()
    return request<MailTriggersResponse>(`/api/mail/triggers${query ? `?${query}` : ''}`)
  },
}
