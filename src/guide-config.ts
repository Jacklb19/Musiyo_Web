export function parseGuideConfig(environment: Record<string, string | undefined>) {
  const requestTimeoutMs = Number(environment.VITE_GUIDE_TIMEOUT_MS || 15000)
  if (!Number.isInteger(requestTimeoutMs) || requestTimeoutMs < 1000 || requestTimeoutMs > 60000) {
    throw new Error('Invalid guide request timeout')
  }
  return { requestTimeoutMs } as const
}

export const guideConfig = parseGuideConfig(import.meta.env || {})
