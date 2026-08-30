import { randomUUID } from 'node:crypto'

import { getHeader, getMethod, getRequestURL, getResponseStatus, setHeader, type H3Event } from 'h3'

import {
  createRequestIdentity,
  createRequestLogRecord,
  requestTelemetryRoute,
  type RequestLogRecord,
} from '../modules/operations/request-observability'

type RequestObservation = Readonly<{
  requestId: string
  startedAt: number
  failed: boolean
}>

const observationFrom = (value: unknown): RequestObservation | undefined => {
  if (!value || typeof value !== 'object') return undefined
  const requestId = Reflect.get(value, 'requestId')
  const startedAt = Reflect.get(value, 'startedAt')
  const failed = Reflect.get(value, 'failed')
  return typeof requestId === 'string' && typeof startedAt === 'number' && typeof failed === 'boolean'
    ? { requestId, startedAt, failed }
    : undefined
}

const errorStatusCode = (error: unknown): number => {
  if (!error || typeof error !== 'object') return 500
  const statusCode = Reflect.get(error, 'statusCode')
  return typeof statusCode === 'number' && Number.isSafeInteger(statusCode) ? statusCode : 500
}

const createRecord = (event: H3Event, observation: RequestObservation, type: 'completed' | 'failed', statusCode: number): RequestLogRecord =>
  createRequestLogRecord({
    type,
    requestId: observation.requestId,
    method: getMethod(event),
    route: requestTelemetryRoute(getRequestURL(event).pathname),
    statusCode,
    durationMs: performance.now() - observation.startedAt,
    occurredAt: new Date().toISOString(),
  })

const writeRecord = (record: RequestLogRecord): void => {
  process.stdout.write(`${JSON.stringify(record)}\n`)
}

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('request', (event) => {
    const requestId = createRequestIdentity(getHeader(event, 'x-request-id'), randomUUID)
    event.context.requestObservation = { requestId, startedAt: performance.now(), failed: false }
    setHeader(event, 'X-Request-ID', requestId)
  })

  nitroApp.hooks.hook('afterResponse', (event) => {
    const observation = observationFrom(event.context.requestObservation)
    if (!observation || observation.failed) return
    writeRecord(createRecord(event, observation, 'completed', getResponseStatus(event)))
  })

  nitroApp.hooks.hook('error', (error, context) => {
    const event = context.event
    if (!event) return
    const observation = observationFrom(event.context.requestObservation)
    if (!observation || observation.failed) return
    event.context.requestObservation = { ...observation, failed: true }
    writeRecord(createRecord(event, observation, 'failed', errorStatusCode(error)))
  })
})
