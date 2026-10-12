import { buildApiEndpoint } from '../config/api'
import type { CatalogForm, ParticipantType } from '../lib/survey-types'
import { fetchWithRetry } from '../utils/fetch-with-retry'

export type EmailVerificationErrorCode =
  | 'invalid-email'
  | 'invalid-master-key'
  | 'invalid-or-expired-pin'
  | 'service-unavailable'
  | 'network'

export class EmailVerificationError extends Error {
  readonly code: EmailVerificationErrorCode
  readonly status: number

  constructor(
    code: EmailVerificationErrorCode,
    status: number,
    message: string,
  ) {
    super(message)
    this.name = 'EmailVerificationError'
    this.code = code
    this.status = status
  }
}

export interface EmailVerificationRequestResponse {
  verificationId: number
}

export interface EmailVerificationConfirmationResponse {
  submissionToken: string
}

export interface AccessConfiguration {
  emailDisponivel: boolean
  chaveMestraDisponivel: boolean
}

export async function fetchAccessConfiguration(): Promise<AccessConfiguration> {
  let response: Response
  try {
    response = await fetchWithRetry(buildApiEndpoint('/verificacao-email/configuracao'), {
      cache: 'no-store', retries: 1,
    })
  } catch { throw networkError() }
  if (!response.ok) throw requestError(response.status)
  const body = await readJson<AccessConfiguration>(response)
  if (!body || typeof body.emailDisponivel !== 'boolean' || typeof body.chaveMestraDisponivel !== 'boolean') {
    throw new EmailVerificationError('service-unavailable', response.status, 'Não foi possível verificar as opções de acesso.')
  }
  return body
}

export async function authorizeMasterKey(
  chave: string,
  participantType: Exclude<ParticipantType, 'aluno'>,
  form: CatalogForm,
): Promise<EmailVerificationConfirmationResponse> {
  let response: Response
  try {
    response = await fetchWithRetry(buildApiEndpoint('/verificacao-email/chave-mestra'), {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, retries: 1,
      body: JSON.stringify({ chave, publico: participantType, campaign: form.campaign, form: form.code, formVersion: form.version }),
    })
  } catch { throw networkError() }
  if (!response.ok) {
    throw new EmailVerificationError(response.status === 401 ? 'invalid-master-key' : 'service-unavailable', response.status,
      response.status === 401 ? 'Chave mestra inválida.' : response.status === 409
        ? 'A campanha não está disponível para respostas no momento.'
        : 'Não foi possível liberar o acesso por chave mestra. Tente novamente.')
  }
  const body = await readJson<EmailVerificationConfirmationResponse>(response)
  if (!body || typeof body.submissionToken !== 'string' || !body.submissionToken.trim())
    throw new EmailVerificationError('service-unavailable', response.status, 'O serviço de acesso retornou uma resposta inválida.')
  return body
}

function requestError(status: number) {
  if (status === 400) {
    return new EmailVerificationError(
      'invalid-email',
      status,
      'Informe um e-mail institucional válido para solicitar o código.',
    )
  }
  if (status === 503) {
    return new EmailVerificationError(
      'service-unavailable',
      status,
      'O serviço de e-mail está indisponível no momento. Tente novamente mais tarde.',
    )
  }
  return new EmailVerificationError(
    'service-unavailable',
    status,
    'Não foi possível solicitar a verificação no momento.',
  )
}

function confirmationError(status: number) {
  if (status === 400) {
    return new EmailVerificationError(
      'invalid-or-expired-pin',
      status,
      'O código é inválido ou expirou. Confira o código recebido ou solicite outro.',
    )
  }
  if (status === 503) {
    return new EmailVerificationError(
      'service-unavailable',
      status,
      'O serviço de e-mail está indisponível no momento. Tente novamente mais tarde.',
    )
  }
  return new EmailVerificationError(
    'service-unavailable',
    status,
    'Não foi possível confirmar o código no momento.',
  )
}

function networkError() {
  return new EmailVerificationError(
    'network',
    0,
    'Não foi possível conectar ao serviço de verificação. Tente novamente.',
  )
}

async function readJson<T>(response: Response): Promise<T> {
  try {
    return await response.json() as T
  } catch {
    throw new EmailVerificationError(
      'service-unavailable',
      response.status,
      'O serviço de verificação retornou uma resposta inválida.',
    )
  }
}

export async function requestEmailVerification(
  email: string,
  participantType: Exclude<ParticipantType, 'aluno'>,
  form: CatalogForm,
): Promise<EmailVerificationRequestResponse> {
  let response: Response
  try {
    response = await fetchWithRetry(buildApiEndpoint('/verificacao-email/solicitar'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        publico: participantType,
        campaign: form.campaign,
        form: form.code,
        formVersion: form.version,
      }),
      retries: 1,
    })
  } catch {
    throw networkError()
  }

  if (!response.ok) throw requestError(response.status)
  const body = await readJson<EmailVerificationRequestResponse>(response)
  if (!Number.isInteger(body.verificationId)) {
    throw new EmailVerificationError(
      'service-unavailable',
      response.status,
      'O serviço de verificação retornou uma resposta inválida.',
    )
  }
  return body
}

export async function confirmEmailVerification(
  verificationId: number,
  pin: string,
): Promise<EmailVerificationConfirmationResponse> {
  let response: Response
  try {
    response = await fetchWithRetry(buildApiEndpoint('/verificacao-email/confirmar'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verificationId, pin }),
      retries: 1,
    })
  } catch {
    throw networkError()
  }

  if (!response.ok) throw confirmationError(response.status)
  const body = await readJson<EmailVerificationConfirmationResponse>(response)
  if (!body.submissionToken?.trim()) {
    throw new EmailVerificationError(
      'service-unavailable',
      response.status,
      'O serviço de verificação retornou uma resposta inválida.',
    )
  }
  return body
}
