#!/bin/sh
set -eu

# Only public settings are exposed. jq escapes quotes, backslashes and newlines.
config_file=/usr/share/nginx/html/runtime-config.js
{
  printf 'window.__CPA_CONFIG__ = '
  jq -n \
    --arg api "${VITE_API_BASE_URL:-}" \
    --arg keycloak "${VITE_KEYCLOAK_URL:-}" \
    --arg realm "${VITE_KEYCLOAK_REALM:-}" \
    --arg client "${VITE_KEYCLOAK_CLIENT_ID:-}" \
    --arg message "${VITE_CPA_CAMPAIGN_UNAVAILABLE_MESSAGE:-}" \
    '{VITE_API_BASE_URL: $api, VITE_KEYCLOAK_URL: $keycloak,
      VITE_KEYCLOAK_REALM: $realm, VITE_KEYCLOAK_CLIENT_ID: $client,
      VITE_CPA_CAMPAIGN_UNAVAILABLE_MESSAGE: $message}'
  printf ';\n'
} > "$config_file"
