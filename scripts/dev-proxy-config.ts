export function resolveDevApiTarget(environment: Record<string, string | undefined>) {
  const apiTarget = environment.MUSIYO_DEV_API_TARGET || 'http://127.0.0.1:8000'
  const target = new URL(apiTarget)
  if (!['http:', 'https:'].includes(target.protocol) || target.username || target.password
    || target.pathname !== '/' || target.search || target.hash) {
    throw new Error('MUSIYO_DEV_API_TARGET must be an HTTP or HTTPS origin without a path or credentials.')
  }
  return apiTarget
}
