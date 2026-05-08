import { EventEmitter } from 'events'

export const claudeRuntimeEvents = new EventEmitter()
claudeRuntimeEvents.setMaxListeners(200)

let nextEventId = 1

export function emitRuntimeEvent(event) {
  claudeRuntimeEvents.emit('event', {
    eventId: nextEventId++,
    timestamp: Date.now(),
    ...event,
  })
}
