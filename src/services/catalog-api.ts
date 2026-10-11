import type { CatalogForm, Curso, ParticipantType } from '../lib/survey-types'
import { normalizeCatalog } from '../lib/survey-catalog'
import { buildApiEndpoint } from '../config/api'
import { fetchWithRetry } from '../utils/fetch-with-retry'

interface ApiDisciplina { id: number; nome: string; professor: string }
interface ApiCurso { id: number; nome: string; disciplinas: ApiDisciplina[] }

async function responseMessage(response: Response) {
  const text = await response.text()
  try { const body = JSON.parse(text) as { error?: string; message?: string }; return body.error ?? body.message ?? text } catch { return text }
}

export async function fetchCatalog(participantType: ParticipantType, campaign: string): Promise<CatalogForm[]> {
  const query = new URLSearchParams({ campaign, publico: participantType })
  const response = await fetchWithRetry(buildApiEndpoint(`/formularios?${query}`))
  if (!response.ok) throw new Error((await responseMessage(response)) || 'Não foi possível carregar os formulários.')
  const catalog = normalizeCatalog(await response.json())
  if (catalog.some((form) => form.audience !== participantType || form.campaign !== campaign)) {
    throw new Error('O catálogo retornou um formulário incompatível com o seu perfil.')
  }

  return catalog
}

export async function fetchFormCourses(participantType: ParticipantType, campaign: string): Promise<Curso[]> {
  const query = new URLSearchParams({ campaign, publico: participantType })
  const response = await fetchWithRetry(buildApiEndpoint(`/dados-formulario?${query}`))
  if (!response.ok) throw new Error((await responseMessage(response)) || 'Não foi possível carregar cursos e disciplinas.')
  const body = await response.json() as { cursos: ApiCurso[] }
  return body.cursos.map((curso) => ({ id: String(curso.id), nome: curso.nome, materias: curso.disciplinas.map((disciplina) => ({ id: String(disciplina.id), nome: disciplina.nome, docente: disciplina.professor })) }))
}
