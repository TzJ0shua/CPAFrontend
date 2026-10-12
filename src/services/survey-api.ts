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

export interface StudentProgress {
  formularios: { code: string; version: number; respondido: boolean }[]
  concluida: boolean
  proof?: SubmitSurveyProof
}

export async function fetchStudentProgress(campaign: string, cpf: string, matricula: string, acceptedTerms: boolean): Promise<StudentProgress> {
  const response = await fetchWithRetry(buildApiEndpoint('/formulario/aluno/progresso'), {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, retries: 1,
    body: JSON.stringify({ campaign, cpf: cpf.replace(/\D/g, ''), matricula, aceiteTermosCondicoesServico: acceptedTerms }),
  })
  if (!response.ok) throw new Error('Não foi possível consultar seu progresso. Confira CPF e matrícula e tente novamente.')
  const body = await response.json() as {
    formularios: StudentProgress['formularios']; concluida: boolean; comprovante?: ApiSubmitResponse
  }
  if (!Array.isArray(body.formularios) || typeof body.concluida !== 'boolean'
      || body.formularios.some(item => typeof item.code !== 'string' || !Number.isInteger(item.version) || typeof item.respondido !== 'boolean')) {
    throw new Error('Não foi possível consultar seu progresso.')
  }
  const proof = body.concluida ? normalizedProof(body.comprovante ?? null) : undefined
  if (body.concluida && (!proof || body.formularios.length === 0 || body.formularios.some(item => !item.respondido)))
    throw new Error('Não foi possível recuperar o comprovante da campanha.')
  return { formularios: body.formularios, concluida: body.concluida, proof }
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
