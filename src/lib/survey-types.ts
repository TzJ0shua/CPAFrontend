export type ParticipantType = 'aluno' | 'professor' | 'funcionario'

export type QuestionId = string
export type FormScope = 'DISCIPLINA' | 'GERAL'

export interface CatalogOption {
  code: string
  label: string
  order?: number
  active?: boolean
  naoSeiResponder?: boolean
}

export interface Pergunta {
  id: QuestionId
  texto: string
  ordem?: number
  required?: boolean
  active?: boolean
  options: CatalogOption[]
}

export interface CatalogForm {
  campaign: string
  code: string
  name: string
  audience: ParticipantType
  version: number
  order: number
  scope: FormScope
  commentAllowed: boolean
  commentRequired?: boolean
  commentNotice?: string
  active?: boolean
  questions: Pergunta[]
}

export interface Materia { id: string; nome: string; docente: string }
export interface Curso { id: string; nome: string; materias: Materia[] }
export interface Respostas { opcoes: Record<QuestionId, string>; comentario: string }
export interface SurveyApiAnswer { questionId: QuestionId; optionCode: string }
export interface SurveyApiSubject { subjectId: string; subjectName: string; teacherName: string; answers: SurveyApiAnswer[]; comment?: string }

export interface SurveyRespondent {
  cpf?: string
  matricula?: string
  type: ParticipantType
  aceiteTermosCondicoesServico: boolean
  /** Comprovante opaco emitido após a confirmação do PIN institucional. */
  emailVerificationToken?: string
}

export interface SurveyApiPayload {
  campaign: string
  form: string
  formVersion: number
  submittedAt: string
  respondent: SurveyRespondent
  course?: { id?: string; name: string }
  subjects?: SurveyApiSubject[]
  answers?: SurveyApiAnswer[]
  comment?: string
}

export type Step = 'participant' | 'form' | 'email' | 'pin' | 'course' | 'subjects' | 'questionnaire' | 'confirmation'
