declare module 'node:assert' {
  export const strict: {
    equal(actual: unknown, expected: unknown, message?: string): void
    fail(message?: string): never
  }
}

declare const process: {
  exitCode?: number
}

