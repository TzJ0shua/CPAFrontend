import type { SurveyApiPayload } from '../lib/survey-types'
import { buildApiEndpoint } from '../config/api'
import { fetchWithRetry } from '../utils/fetch-with-retry'

const SURVEY_API_ENDPOINT = buildApiEndpoint('/formulario')

interface ApiSubmitResponse {
  code?: string
  error?: string
  message?: string
  receipt?: string
  comprovante?: string
  validationCode?: string
  hash?: string
  qrCode?: string
  qrcode?: string
  codigoDigestFinal?: string
}

export interface SubmitSurveyProof {
  kind: 'text' | 'qr'
  value: string
  codigoDigestFinal?: string
}

export interface SubmitSurveyResult {
  code?: string
  ok: boolean
  status: number
  message: string
  proof?: SubmitSurveyProof
}

async function readJsonOrText(response: Response) {
  const responseText = await response.text()
  if (!responseText) return null

  try {
    return JSON.parse(responseText) as ApiSubmitResponse
  } catch {
    return { message: responseText } satisfies ApiSubmitResponse
  }
}

function normalizedProof(
  responseBody: ApiSubmitResponse | null,
): SubmitSurveyProof | undefined {
  if (!responseBody) return undefined
  const qrCode = (responseBody.qrCode ?? responseBody.qrcode)?.trim()
  if (qrCode) {
    const codigoDigestFinal = responseBody.codigoDigestFinal?.trim()
    return {
      kind: 'qr',
      value: qrCode,
      ...(codigoDigestFinal && /^[0-9a-f]{10}$/i.test(codigoDigestFinal)
        ? { codigoDigestFinal }
        : {}),
    }
  }
  const token = (
    responseBody.receipt ??
    responseBody.comprovante ??
    responseBody.validationCode ??
    responseBody.hash
  )?.trim()
  if (!token) return undefined
  return { kind: 'text', value: token }
}

export async function submitSurvey(payload: SurveyApiPayload): Promise<SubmitSurveyResult> {
  let response: Response

  try {
    response = await fetchWithRetry(SURVEY_API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      retries: 1,
    })
  } catch {
    return {
      ok: false,
      status: 0,
      message: 'Não foi possível conectar ao backend. A resposta não foi reenviada automaticamente para evitar duplicidade.',
    }
  }

  const responseBody = await readJsonOrText(response)

  if (response.ok) {
    return {
      ok: true,
      status: response.status,
      message: 'Avaliação enviada com sucesso.',
      proof: normalizedProof(responseBody),
    }
  }

  if (response.status === 409 && responseBody?.code === 'FORMULARIO_JA_RESPONDIDO') return {
    ok: false, status: 409, code: 'FORMULARIO_JA_RESPONDIDO', message: 'Você já respondeu esta versão do formulário nesta campanha.',
  }
  if (response.status === 503 && responseBody?.code === 'IDENTIFICACAO_INDISPONIVEL') return {
    ok: false, status: 503, code: 'IDENTIFICACAO_INDISPONIVEL', message: 'A identificação de alunos está indisponível no momento. Tente novamente mais tarde.',
  }
  return {
    ok: false,
    status: response.status,
    message: 'Não foi possível enviar a avaliação.',
  }
}
