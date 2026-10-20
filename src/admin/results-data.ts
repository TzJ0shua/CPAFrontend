export interface ResultRow { avaliacao: number; participante: string; publico: string; formulario: string; formularioNome: string; versao: number; curso: string | null; disciplina: string | null; professor: string | null; perguntaId: string; pergunta: string; nota: number | null; opcao: string | null; naoSeiResponder: boolean; comentario: string | null; demonstracao?: boolean }
export const labels: Record<string, string> = { aluno: 'Aluno', professor: 'Professor', funcionario: 'Funcionário', gestao: 'Gestão' }
export const unique = (values: string[]) => [...new Set(values)].sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }))
export function filterResults(rows: ResultRow[], filters: Record<string, string>) {
  return rows.filter(row => Object.entries(filters).every(([key, value]) => !value || String(key === 'demonstracao' ? Boolean(row.demonstracao) : row[key as keyof ResultRow]) === value))
}

export function responseLabel(row: ResultRow) {
  return row.naoSeiResponder ? 'Não sei responder' : row.opcao || (row.nota == null ? 'Sem opção registrada' : `Nota ${row.nota}`)
}

export function optionDistribution(rows: ResultRow[]) {
  const counts = new Map<string, { label: string; count: number; order: number }>()
  rows.forEach(row => {
    const label = responseLabel(row)
    const existing = counts.get(label)
    if (existing) existing.count++
    else counts.set(label, { label, count: 1, order: row.naoSeiResponder ? Infinity : row.nota ?? Number.MAX_SAFE_INTEGER })
  })
  return [...counts.values()].sort((a, b) => a.order - b.order || a.label.localeCompare(b.label, 'pt-BR'))
}

export function optionColor(label: string) {
  const known: Record<string, string> = {
    'Discordo totalmente': '#b93e48', 'Discordo parcialmente': '#d88325',
    'Concordo parcialmente': '#247baf', 'Concordo totalmente': '#20836a',
    'Não sei responder': '#758195', 'Sem opção registrada': '#758195',
  }
  const palette = ['#5064b5', '#8a52a0', '#167e87', '#a45a25', '#ad4269', '#4b7d35']
  return known[label] || palette[[...label].reduce((hash, c) => (hash * 31 + c.charCodeAt(0)) >>> 0, 0) % palette.length]
}
export function questionGroups(rows: ResultRow[]) {
  const groups = new Map<string, ResultRow[]>()
  rows.forEach(row => {
    const key = JSON.stringify([row.formulario, row.versao, row.perguntaId, row.pergunta])
    const group = groups.get(key)
    if (group) group.push(row)
    else groups.set(key, [row])
  })
  return [...groups.values()]
}
