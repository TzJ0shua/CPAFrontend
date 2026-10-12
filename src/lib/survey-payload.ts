import type { CatalogForm, Curso, Materia, ParticipantType, Respostas, SurveyApiAnswer, SurveyApiPayload } from './survey-types'
import { availableOptions, availableQuestions } from './survey-catalog'

function answersFor(form: CatalogForm, respostas: Respostas): SurveyApiAnswer[] {
  return availableQuestions(form).flatMap((question) => {
    const optionCode = respostas.opcoes[question.id]
    if (!optionCode) return []

    const isAvailableOption = availableOptions(question).some(
      (option) => option.code === optionCode,
    )

    return isAvailableOption ? [{ questionId: question.id, optionCode }] : []
  })
}

interface BuildPayloadInput {
  form: CatalogForm; participantType: ParticipantType; acceptedTerms: boolean
  emailVerificationToken: string | null; course: Curso | null; subjects: Materia[]
  responses: Record<string, Respostas>; generalResponses: Respostas
  studentIdentity?: { cpf: string; matricula: string }
}

export function buildSurveyApiPayload(input: BuildPayloadInput): SurveyApiPayload {
  const respondent: SurveyApiPayload['respondent'] = { type: input.participantType, aceiteTermosCondicoesServico: input.acceptedTerms }
  if (input.participantType === 'aluno') {
    respondent.cpf = input.studentIdentity?.cpf.replace(/\D/g, '') ?? ''
    respondent.matricula = input.studentIdentity?.matricula ?? ''
  }
  if (input.participantType !== 'aluno' && input.emailVerificationToken) {
    respondent.emailVerificationToken = input.emailVerificationToken
  }
  const payload: SurveyApiPayload = { campaign: input.form.campaign, form: input.form.code, formVersion: input.form.version, submittedAt: new Date().toISOString(), respondent }
  if (input.form.scope === 'DISCIPLINA' && input.course) {
    payload.course = { id: input.course.id, name: input.course.nome }
    payload.subjects = input.subjects.map((subject) => {
      const respostas = input.responses[subject.id] ?? { opcoes: {}, comentario: '' }
      return { subjectId: subject.id, subjectName: subject.nome, teacherName: subject.docente, answers: answersFor(input.form, respostas), ...(input.form.commentAllowed && respostas.comentario.trim() ? { comment: respostas.comentario.trim() } : {}) }
    })
  } else {
    payload.answers = answersFor(input.form, input.generalResponses)
    if (input.form.commentAllowed && input.generalResponses.comentario.trim()) payload.comment = input.generalResponses.comentario.trim()
  }
  return payload
}
