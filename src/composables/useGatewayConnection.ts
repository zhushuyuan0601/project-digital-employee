import { ref } from 'vue'
import {
  buildGatewaySocketUrl,
  getDefaultGatewayConnectionSettings,
  getGatewayToken,
  type GatewayConnectionSettings,
} from '@/config/gateway'
import {
  buildChallengeResponseMessage,
  type ConnectChallengePayload,
} from '@/utils/gateway-protocol'

export function useGatewayConnection(initialSettings?: Partial<GatewayConnectionSettings>) {
  const settings = ref<GatewayConnectionSettings>({
    ...getDefaultGatewayConnectionSettings(),
    ...initialSettings,
  })

  function refreshTokenFromStorage() {
    const token = getGatewayToken()
    if (token && token !== settings.value.token) {
      settings.value.token = token
    }
  }

  function resolveSocketUrl(): string {
    refreshTokenFromStorage()
    return buildGatewaySocketUrl(settings.value.wsUrl, settings.value.token)
  }

  async function createChallengeResponse(payload: ConnectChallengePayload) {
    refreshTokenFromStorage()
    if (!settings.value.token) return null
    return buildChallengeResponseMessage(settings.value.token, payload)
  }

  return {
    settings,
    resolveSocketUrl,
    createChallengeResponse,
    refreshTokenFromStorage,
  }
}
