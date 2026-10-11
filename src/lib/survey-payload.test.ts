import { describe, expect, it } from 'vitest'
import { buildSurveyApiPayload } from './survey-payload'
import type { CatalogForm } from './survey-types'

const form: CatalogForm = {
  campaign: 'cpa-2026',
  code: 'discente_gestao',
  name: 'Gestão',
  audience: 'aluno',
  version: 3,
  order: 1,
  scope: 'GERAL',
  commentAllowed: true,
  questions: [
    {
      id: 'q-obrigatoria',
      texto: 'Obrigatória',
      options: [
        { code: 'nao_sei_responder', label: 'Não sei responder', naoSeiResponder: true },
      ],
    },
    {
      id: 'q-opcional',
      texto: 'Opcional',
      required: false,
      options: [{ code: 'concordo', label: 'Concordo' }],
    },
    {
      id: 'q-inativa',
      texto: 'Inativa',
      active: false,
      options: [{ code: 'ignorar', label: 'Ignorar' }],
    },
  ],
}

describe('buildSurveyApiPayload', () => {
  it('references the form version and sends only valid active answers', () => {
    const payload = buildSurveyApiPayload({
      form,
      participantType: 'aluno',
      studentIdentity: { cpf: '529.982.247-25', matricula: '0001234567' },
      acceptedTerms: true,
      emailVerificationToken: null,
      course: null,
      subjects: [],
      responses: {},
      generalResponses: {
        opcoes: {
          'q-obrigatoria': 'nao_sei_responder',
          'q-opcional': 'opcao-invalida',
          'q-inativa': 'ignorar',
        },
        comentario: ' Comentário livre ',
      },
    })

    expect(payload).toMatchObject({
      campaign: 'cpa-2026',
      form: 'discente_gestao',
      formVersion: 3,
      comment: 'Comentário livre',
      respondent: { type: 'aluno', aceiteTermosCondicoesServico: true, cpf: '52998224725', matricula: '0001234567' },
    })
    expect(payload.answers).toEqual([
      { questionId: 'q-obrigatoria', optionCode: 'nao_sei_responder' },
    ])
  })

  it('sends only an opaque verification proof for staff respondents', () => {
    const payload = buildSurveyApiPayload({
      form: { ...form, audience: 'professor' },
      participantType: 'professor',
      acceptedTerms: true,
      emailVerificationToken: 'opaque-proof',
      course: null,
      subjects: [],
      responses: {},
      generalResponses: { opcoes: { 'q-obrigatoria': 'nao_sei_responder' }, comentario: '' },
    })

    expect(payload.respondent).toEqual({
      type: 'professor',
      aceiteTermosCondicoesServico: true,
      emailVerificationToken: 'opaque-proof',
    })
    expect(payload.respondent).not.toHaveProperty('email')
    expect(payload.respondent).not.toHaveProperty('pin')
    expect(payload.respondent).not.toHaveProperty('cpf')
    expect(payload.respondent).not.toHaveProperty('matricula')
  })
})
