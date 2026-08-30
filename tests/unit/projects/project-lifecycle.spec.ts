import { describe, expect, it } from 'vitest'
import {
  availableProjectLifecycleTransitions,
  decideProjectLifecycleTransition,
  PROJECT_LIFECYCLE_PERMISSION_BY_TRANSITION,
  projectStateAllowsOperation,
} from '../../../shared/projects/project-lifecycle'

const states = ['active', 'paused', 'closed', 'archived'] as const
const transitions = ['pause', 'resume', 'close', 'reopen', 'archive', 'restore'] as const

const expectedNextState: Readonly<Record<string, string>> = {
  'active:pause': 'paused',
  'active:close': 'closed',
  'paused:resume': 'active',
  'paused:close': 'closed',
  'closed:reopen': 'active',
  'closed:archive': 'archived',
  'archived:restore': 'closed',
}

describe('project lifecycle policy', () => {
  it('maps every semantic transition to its exact permission code', () => {
    expect(PROJECT_LIFECYCLE_PERMISSION_BY_TRANSITION).toEqual({
      pause: 'project.pause',
      resume: 'project.resume',
      close: 'project.close',
      reopen: 'project.reopen',
      archive: 'project.archive',
      restore: 'project.restore',
    })
  })

  it('decides every state and transition pair deterministically', () => {
    for (const state of states) {
      for (const transition of transitions) {
        const result = decideProjectLifecycleTransition(state, transition)
        const nextState = expectedNextState[`${state}:${transition}`]
        expect(result, `${state}:${transition}`).toEqual(nextState === undefined
          ? { type: 'reject', code: 'transition_not_allowed', state, transition }
          : { type: 'apply', previousState: state, nextState, transition })
      }
    }
  })

  it('returns available transitions in stable business order', () => {
    expect(availableProjectLifecycleTransitions('active')).toEqual(['pause', 'close'])
    expect(availableProjectLifecycleTransitions('paused')).toEqual(['resume', 'close'])
    expect(availableProjectLifecycleTransitions('closed')).toEqual(['reopen', 'archive'])
    expect(availableProjectLifecycleTransitions('archived')).toEqual(['restore'])
  })

  it('admits operations according to the approved state matrix', () => {
    const operations = [
      'authenticated_read',
      'credential_reveal',
      'work_mutation',
      'security_reduction',
      'ai',
      'mcp',
      'public_read',
      'public_capability_issue',
      'public_capability_revoke',
    ] as const
    const readOnlyOperations = new Set([
      'authenticated_read',
      'credential_reveal',
      'security_reduction',
      'public_read',
      'public_capability_revoke',
    ])

    for (const operation of operations) {
      expect(projectStateAllowsOperation('active', operation), `active:${operation}`).toBe(true)
      expect(projectStateAllowsOperation('paused', operation), `paused:${operation}`).toBe(readOnlyOperations.has(operation))
      expect(projectStateAllowsOperation('closed', operation), `closed:${operation}`).toBe(readOnlyOperations.has(operation))
      expect(projectStateAllowsOperation('archived', operation), `archived:${operation}`).toBe(false)
    }
  })
})
