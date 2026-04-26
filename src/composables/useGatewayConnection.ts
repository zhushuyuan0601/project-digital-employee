import { ref } from 'vue'
import {
  buildGatewaySocketUrl,
  getDefaultGatewayConnectionSettings,
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

  function resolveSocketUrl(): string {
    return buildGatewaySocketUrl(settings.value.wsUrl, settings.value.token)
  }

  async function createChallengeResponse(payload: ConnectChallengePayload) {
    if (!settings.value.token) return null
    return buildChallengeResponseMessage(settings.value.token, payload)
  }

  return {
    settings,
    resolveSocketUrl,
    createChallengeResponse,
  }
}
