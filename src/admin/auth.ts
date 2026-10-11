import Keycloak from 'keycloak-js'
import { publicConfig } from '../config/runtime'

let client: Keycloak | undefined
let initialization: Promise<Keycloak> | undefined

export function initializeAdminAuth(): Promise<Keycloak> {
  if (initialization) return initialization
  const url = publicConfig('VITE_KEYCLOAK_URL')
  const realm = publicConfig('VITE_KEYCLOAK_REALM')
  if (!url || !realm) return Promise.reject(new Error('Configure a URL e o realm do Keycloak para acessar o painel.'))
  client = new Keycloak({ url, realm, clientId: publicConfig('VITE_KEYCLOAK_CLIENT_ID') || 'cpa-frontend' })
  const instance = client
  initialization = instance.init({ onLoad: 'login-required', pkceMethod: 'S256', flow: 'standard', checkLoginIframe: false,
    redirectUri: window.location.origin + window.location.pathname,
  }).then(() => {
    instance.onAuthLogout = () => window.dispatchEvent(new Event('admin-session-expired'))
    return instance
  }).catch((error: unknown) => { initialization = undefined; throw error })
  return initialization
}

export async function adminToken(): Promise<string> {
  if (!client?.authenticated) throw new Error('Sua sessão expirou. Entre novamente.')
  try {
    await client.updateToken(30)
    if (!client.token) throw new Error('Token indisponível')
    return client.token
  } catch {
    client.clearToken()
    window.dispatchEvent(new Event('admin-session-expired'))
    throw new Error('Sua sessão expirou. Entre novamente.')
  }
}

export function expireAdminSession() {
  client?.clearToken()
  window.dispatchEvent(new Event('admin-session-expired'))
}
export function loginAdmin() { return client?.login({ redirectUri: window.location.origin + window.location.pathname }) }
export function logoutAdmin() { return client?.logout({ redirectUri: window.location.origin + '/' }) }
