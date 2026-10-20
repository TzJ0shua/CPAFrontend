import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { ActiveResults, ResultsPage } from './ResultsPage'
import { filterResults, optionDistribution, questionGroups } from './results-data'
import type { ResultRow } from './results-data'
import { adminApi } from './api'

vi.mock('./api', () => ({ adminApi: vi.fn(), segment: encodeURIComponent }))
const row: ResultRow = { avaliacao: 1, participante: 'Participante 1', publico: 'aluno', formulario: 'geral', formularioNome: 'Instituição', versao: 1, curso: null, disciplina: null, professor: null, perguntaId: 'p1', pergunta: 'Como avalia a instituição?', nota: 5, opcao: 'Concordo totalmente', naoSeiResponder: false, comentario: null }
afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('resultados das campanhas', () => {
  it('filtra pelos cartões, permite trocar ou desmarcar o tipo e sincroniza com o seletor', async () => {
    vi.mocked(adminApi).mockResolvedValue([row, { ...row, avaliacao: 2, participante: 'Participante 2', publico: 'professor', pergunta: 'Pergunta docente', demonstracao: true }])
    render(<ResultsPage campaign="cpa" />)
    const student = await screen.findByRole('button', { name: /^Aluno/ })
    const teacher = screen.getByRole('button', { name: /^Professor/ })
    fireEvent.click(student)
    expect(student).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('Tipo de participante')).toHaveValue('aluno')
    expect(screen.queryByRole('heading', { name: 'Pergunta docente' })).not.toBeInTheDocument()
    expect(teacher).toBeInTheDocument()
    fireEvent.click(teacher)
    expect(student).toHaveAttribute('aria-pressed', 'false')
    expect(teacher).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('heading', { name: 'Pergunta docente' })).toBeInTheDocument()
    fireEvent.click(teacher)
    expect(screen.getByLabelText('Tipo de participante')).toHaveValue('')
    expect(screen.getByRole('heading', { name: row.pergunta })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Tipo de participante'), { target: { value: 'aluno' } })
    expect(student).toHaveAttribute('aria-pressed', 'true')
    fireEvent.change(screen.getByLabelText('Origem dos dados'), { target: { value: 'true' } })
    expect(screen.getByText('Nenhum resultado para estes filtros')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /^Professor/ }))
    expect(screen.getByRole('heading', { name: 'Pergunta docente' })).toBeInTheDocument()
    expect(screen.getByLabelText('Origem dos dados')).toHaveValue('true')
  })
  it('combina filtros e não mistura versões nem formulários', () => {
    const rows = [row, { ...row, versao: 2 }, { ...row, formulario: 'outro', publico: 'professor' }]
    expect(filterResults(rows, { formulario: 'geral', publico: 'aluno', versao: '2' })).toEqual([rows[1]])
    expect(questionGroups(rows)).toHaveLength(3)
  })
  it('conta não sei responder separadamente e filtra a origem', () => {
    const rows = [row, { ...row, nota: 1, opcao: 'Discordo totalmente', demonstracao: true }, { ...row, nota: null, opcao: null, naoSeiResponder: true, demonstracao: true }]
    expect(optionDistribution(rows).map(o => [o.label, o.count])).toEqual([['Discordo totalmente', 1], ['Concordo totalmente', 1], ['Não sei responder', 1]])
    expect(filterResults(rows, { demonstracao: 'false' })).toEqual([row])
    expect(filterResults(rows, { demonstracao: 'true' })).toHaveLength(2)
  })
  it('alterna roscas e mapa de calor preservando filtros e versões', async () => {
    vi.mocked(adminApi).mockResolvedValue([row,
      { ...row, avaliacao: 2, nota: 1, opcao: 'Discordo totalmente', demonstracao: true },
      { ...row, avaliacao: 3, nota: null, opcao: null, naoSeiResponder: true, demonstracao: true },
      { ...row, avaliacao: 4, versao: 2 },
    ])
    render(<ResultsPage campaign="cpa" />)
    expect(await screen.findByRole('note')).toHaveTextContent('2 avaliações fictícias')
    fireEvent.click(screen.getByRole('button', { name: 'Roscas' }))
    expect(screen.getByRole('button', { name: 'Roscas' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('img', { name: /Distribuição de 3 respostas/ })).toHaveAccessibleName(/Não sei responder: 1, 33.3%/)
    fireEvent.click(screen.getByRole('button', { name: 'Mapa de calor' }))
    expect(screen.getAllByRole('table')).toHaveLength(2)
    expect(screen.getAllByText('33.3%')).toHaveLength(3)
    fireEvent.change(screen.getByLabelText('Origem dos dados'), { target: { value: 'false' } })
    expect(screen.queryByRole('columnheader', { name: 'Não sei responder' })).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Versão'), { target: { value: '1' } })
    expect(screen.getAllByRole('table')).toHaveLength(1)
  })
  it('mostra placeholder quando não há campanha disponível', async () => {
    vi.mocked(adminApi).mockResolvedValue([{ codigo: 'antiga', ativo: true, disponivelParaResposta: false }])
    render(<ActiveResults />)
    expect(await screen.findByText('Não há campanhas ativas no momento')).toBeInTheDocument()
    expect(adminApi).toHaveBeenCalledTimes(1)
  })
  it('mostra contagens, distribuição e estado vazio ao filtrar', async () => {
    vi.mocked(adminApi).mockResolvedValue([row, { ...row, avaliacao: 2, participante: 'Participante 2', formulario: 'outro', formularioNome: 'Outro formulário', publico: 'professor', nota: null, opcao: null, naoSeiResponder: true }])
    render(<ResultsPage campaign="cpa" />)
    expect(await screen.findByText('Concordo totalmente')).toBeInTheDocument()
    expect(screen.getAllByText('1 · 100.0%')).toHaveLength(2)
    fireEvent.change(screen.getByLabelText('Formulário'), { target: { value: 'geral' } })
    expect(screen.queryByText('Outro formulário · Versão 1')).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Tipo de participante'), { target: { value: 'professor' } })
    expect(screen.getByText('Nenhum resultado para estes filtros')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Exportar Excel' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }))
    expect(screen.getByRole('button', { name: 'Exportar Excel' })).toBeEnabled()
  })
})

