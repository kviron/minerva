import { expect, it, vi } from 'vitest'
import { runBootstrapCommand } from '../../../scripts/bootstrap-super-admin'

it('prints no bootstrap identity or password', async () => {
  const output: string[] = []
  const bootstrap = vi.fn().mockResolvedValue({ outcome: 'created', userId: 'user-id' })

  await runBootstrapCommand({
    readValue: vi.fn()
      .mockResolvedValueOnce('admin@example.com')
      .mockResolvedValueOnce('root.admin'),
    readHiddenValue: vi.fn().mockResolvedValue('Correct-Horse-Battery-1'),
    bootstrap,
    writeLine: line => output.push(line),
  })

  expect(bootstrap).toHaveBeenCalledWith({
    email: 'admin@example.com',
    username: 'root.admin',
    password: 'Correct-Horse-Battery-1',
  })
  expect(output).toEqual(['Bootstrap super administrator is ready.'])
  expect(output.join('\n')).not.toMatch(/admin@example|root\.admin|Correct-Horse/)
})
