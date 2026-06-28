import { resolve } from 'node:path'
import { createInterface } from 'node:readline/promises'
import { pathToFileURL } from 'node:url'
import { bootstrapSuperAdmin } from '../server/modules/identity/bootstrap-super-admin'
import { readHiddenValue } from './read-hidden-value'

interface BootstrapCommandDependencies {
  readValue(prompt: string): Promise<string>
  readHiddenValue(prompt: string): Promise<string>
  bootstrap: typeof bootstrapSuperAdmin
  writeLine(line: string): void
}

export async function runBootstrapCommand(dependencies: BootstrapCommandDependencies) {
  const email = await dependencies.readValue('Email: ')
  const username = await dependencies.readValue('Username: ')
  const password = await dependencies.readHiddenValue('Password: ')

  await dependencies.bootstrap({ email, username, password })
  dependencies.writeLine('Bootstrap super administrator is ready.')
}

async function main() {
  const terminal = createInterface({ input: process.stdin, output: process.stdout })
  const readValue = (prompt: string) => terminal.question(prompt)

  const email = await readValue('Email: ')
  const username = await readValue('Username: ')
  terminal.close()

  await runBootstrapCommand({
    readValue: async prompt => prompt === 'Email: ' ? email : username,
    readHiddenValue,
    bootstrap: bootstrapSuperAdmin,
    writeLine: line => process.stdout.write(`${line}\n`),
  })
}

const entryPoint = process.argv[1]
if (entryPoint && pathToFileURL(resolve(entryPoint)).href === import.meta.url) {
  main().catch(() => {
    process.stderr.write('Bootstrap failed.\n')
    process.exitCode = 1
  })
}
