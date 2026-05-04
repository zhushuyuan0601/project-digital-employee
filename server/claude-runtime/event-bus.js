import { EventEmitter } from 'events'

export const claudeRuntimeEvents = new EventEmitter()
claudeRuntimeEvents.setMaxListeners(200)

export function emitRuntimeEvent(event) {
  claudeRuntimeEvents.emit('event', {
    timestamp: Date.now(),
    ...event,
  })
}
