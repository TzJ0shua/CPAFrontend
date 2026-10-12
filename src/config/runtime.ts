type PublicConfigKey =
  | 'VITE_API_BASE_URL'
  | 'VITE_KEYCLOAK_URL'
  | 'VITE_KEYCLOAK_REALM'
  | 'VITE_KEYCLOAK_CLIENT_ID'
  | 'VITE_CPA_CAMPAIGN_UNAVAILABLE_MESSAGE'

declare global {
  interface Window {
    __CPA_CONFIG__?: Partial<Record<PublicConfigKey, string>>
  }
}

// Nginx writes the public configuration before the application modules load.
// Vite environments retain build-time configuration for local development.
export function publicConfig(key: PublicConfigKey): string | undefined {
  const runtimeValue = typeof window === 'undefined' ? undefined : window.__CPA_CONFIG__?.[key]
  return runtimeValue?.trim() || import.meta.env[key]?.trim() || undefined
}
