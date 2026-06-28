import type { ReadStream, WriteStream } from 'node:tty'

export async function readHiddenValue(
  prompt: string,
  input: ReadStream = process.stdin,
  output: WriteStream = process.stdout,
): Promise<string> {
  if (!input.isTTY || !output.isTTY || typeof input.setRawMode !== 'function') {
    throw new Error('Protected terminal input is required.')
  }

  output.write(prompt)
  input.setRawMode(true)
  input.resume()

  let value = ''
  let resolveInput: (value: string) => void
  let rejectInput: (error: Error) => void
  const result = new Promise<string>((resolve, reject) => {
    resolveInput = resolve
    rejectInput = reject
  })

  const onData = (chunk: Buffer) => {
    for (const character of chunk.toString('utf8')) {
      if (character === '\u0003') {
        rejectInput(new Error('Input cancelled.'))
        return
      }
      if (character === '\r' || character === '\n') {
        resolveInput(value)
        return
      }
      if (character === '\u007f' || character === '\b') {
        value = value.slice(0, -1)
        continue
      }
      if (character >= ' ') value += character
    }
  }

  input.on('data', onData)

  try {
    return await result
  } finally {
    input.off('data', onData)
    input.setRawMode(false)
    input.pause()
    output.write('\n')
  }
}
