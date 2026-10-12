import { buildApiEndpoint } from '../config/api'
import { adminToken, expireAdminSession } from './auth'

export async function adminApi<T = void>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const token = await adminToken()
  const response = await fetch(buildApiEndpoint(`/admin${path}`), {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
  if (response.status === 401) { expireAdminSession(); throw new Error('Sua sessão expirou. Entre novamente.') }
  if (response.status === 403) {
    window.dispatchEvent(new Event('admin-access-denied'))
    throw new Error('Acesso negado. É necessário o perfil cpa-admin.')
  }
  if (!response.ok) {
    const text = await response.text()
    let message = 'Não foi possível concluir a operação.'
    try { const error = JSON.parse(text) as { message?: string; error?: string }; message = error.message || error.error || message } catch { /* Avoid displaying HTML server errors. */ }
    throw new Error(message)
  }
  if (response.status === 204 || response.headers.get('content-length') === '0') return undefined as T
  const text = await response.text()
  return (text ? JSON.parse(text) : undefined) as T
}

export const segment = (value: string | number) => encodeURIComponent(String(value))
