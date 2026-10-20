import { useCallback, useState } from 'react'
import { adminApi, segment } from './api'
import { useAdminData } from './hooks'
import { AdminLink, Notice } from './ui'
import type { Campaign } from './types'

import { filterResults, questionGroups, unique, labels, optionColor, optionDistribution } from './results-data'
import type { ResultRow } from './results-data'
import { DonutChart, QuestionHeatmap } from './ResultCharts'

export function ActiveResults() {
  const read = useCallback(() => adminApi<Campaign[]>('/campanhas'), [])
  const { data, error, loading, reload } = useAdminData(read)
  const [selected, setSelected] = useState('')
  const campaigns = data?.filter(c => c.disponivelParaResposta) || []
  const current = campaigns.find(c => c.codigo === selected) || campaigns[0]
  return <section className="admin-card"><h2>Resultados das campanhas ativas</h2>
    {error ? <Notice>{error} <button onClick={reload}>Tentar novamente</button></Notice> : loading ? <p role="status">Carregando campanhas…</p> : !current ? <div className="results-empty"><h3>Não há campanhas ativas no momento</h3><p>Os resultados aparecerão aqui quando uma campanha estiver aberta e dentro do período de respostas.</p><AdminLink href="/admin/campanhas">Ver campanhas</AdminLink></div> : <>
      <label>Campanha<select value={current.codigo} onChange={e => setSelected(e.target.value)}>{campaigns.map(c => <option key={c.codigo} value={c.codigo}>{c.nome}</option>)}</select></label>
      <ResultsPanel key={current.codigo} campaign={current.codigo} />
    </>}
  </section>
}

export function ResultsPage({ campaign }: { campaign: string }) {
  return <section className="admin-card"><AdminLink href="/admin/campanhas">← Campanhas</AdminLink><h1>Resultados da campanha</h1><p>{campaign}</p><ResultsPanel campaign={campaign} /></section>
}

function ResultsPanel({ campaign }: { campaign: string }) {
  const read = useCallback(() => adminApi<ResultRow[]>(`/campanhas/${segment(campaign)}/resultados`), [campaign])
  const { data, loading, error, reload } = useAdminData(read)
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')
  const [chart, setChart] = useState<'bars' | 'donut' | 'heatmap'>('bars')
  const rows = filterResults(data || [], filters)
  const participantRows = filterResults(data || [], { ...filters, publico: '' })
  const groups = questionGroups(rows)
  const demoCount = new Set((data || []).filter(r => r.demonstracao).map(r => r.avaliacao)).size
  const comments = [...new Map(rows.filter(r => r.comentario?.trim()).map(r => [r.avaliacao, r])).values()]
  const exportExcel = async () => {
    setExporting(true); setExportError('')
    try {
      const { Workbook } = await import('exceljs')
      const book = new Workbook()
      const sheet = book.addWorksheet('Respostas')
      sheet.addRow(['Campanha', 'Avaliação', 'Participante anônimo', 'Tipo', 'Formulário', 'Versão', 'Curso', 'Disciplina', 'Professor', 'Pergunta', 'Resposta', 'Nota', 'Não sei responder', 'Origem'])
      rows.forEach(r => sheet.addRow([campaign, r.avaliacao, r.participante, labels[r.publico] || r.publico, r.formularioNome, r.versao, r.curso, r.disciplina, r.professor, r.pergunta, r.opcao, r.naoSeiResponder ? null : r.nota, r.naoSeiResponder ? 'Sim' : 'Não', r.demonstracao ? 'Demonstração' : 'Real']))
      const notes = book.addWorksheet('Comentários')
      notes.addRow(['Avaliação', 'Tipo', 'Formulário', 'Versão', 'Comentário', 'Origem'])
      comments.forEach(r => notes.addRow([r.avaliacao, labels[r.publico] || r.publico, r.formularioNome, r.versao, r.comentario, r.demonstracao ? 'Demonstração' : 'Real']))
      const context = book.addWorksheet('Filtros')
      context.addRow(['Campanha', campaign]); context.addRow(['Exportado em', new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })])
      Object.entries(filters).forEach(([key, value]) => { if (value) context.addRow([key, value]) })
      book.eachSheet(s => { s.getRow(1).font = { bold: true }; s.views = [{ state: 'frozen', ySplit: 1 }]; s.columns.forEach(c => { c.width = 25 }); s.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: s.columnCount } } })
      const buffer = await book.xlsx.writeBuffer()
      const url = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
      const a = document.createElement('a'); a.href = url; a.download = `resultados-${campaign.replace(/[^a-z0-9_-]/gi, '_')}.xlsx`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch { setExportError('Não foi possível exportar. Tente novamente.') } finally { setExporting(false) }
  }
  if (loading) return <p role="status">Carregando resultados…</p>
  if (error) return <Notice>{error} <button onClick={reload}>Tentar novamente</button></Notice>
  return <div className="results-panel"><div className="admin-title"><p>Explore as respostas por formulário e perfil de participação.</p><div className="admin-actions"><button className="secondary" onClick={reload}>Atualizar</button><button disabled={!rows.length || exporting} onClick={() => void exportExcel()}>{exporting ? 'Exportando…' : 'Exportar Excel'}</button></div></div>
    {exportError && <Notice>{exportError}</Notice>}
    {demoCount > 0 && <p className="results-demo-notice" role="note">Esta campanha contém {demoCount} avaliações fictícias de demonstração. Use o filtro “Origem dos dados” para visualizá-las separadamente. A origem também é identificada no Excel.</p>}
    <div className="results-filters">{([['formulario', 'Formulário'], ['publico', 'Tipo de participante'], ['participante', 'Participante'], ['versao', 'Versão'], ['curso', 'Curso'], ['disciplina', 'Disciplina']] as const).map(([key, title]) => <label key={key}>{title}<select value={filters[key] || ''} onChange={e => setFilters(f => ({ ...f, [key]: e.target.value }))}><option value="">Todos</option>{unique((data || []).map(r => String(r[key] ?? '')).filter(Boolean)).map(value => <option key={value} value={value}>{key === 'publico' ? labels[value] || value : key === 'formulario' ? (data?.find(r => r.formulario === value)?.formularioNome || value) : value}</option>)}</select></label>)}</div>
    {demoCount > 0 && <label className="results-origin-filter">Origem dos dados<select value={filters.demonstracao || ''} onChange={e => setFilters(f => ({ ...f, demonstracao: e.target.value }))}><option value="">Todos os dados</option><option value="false">Somente dados reais</option><option value="true">Somente demonstração</option></select></label>}
    <button className="secondary" onClick={() => setFilters({})}>Limpar filtros</button>
    <p className="results-note">Participantes são identificados anonimamente nesta campanha. Uma pessoa pode enviar várias avaliações. Não há base de convidados para calcular taxa de adesão. As versões são analisadas separadamente.</p>
    <div className="results-stats">{[[new Set(rows.map(r => r.participante)).size, 'Participantes identificados'], [new Set(rows.map(r => r.avaliacao)).size, 'Avaliações enviadas'], [rows.length, 'Respostas'], [rows.filter(r => r.naoSeiResponder).length, 'Não sei responder']].map(([n, title]) => <div key={title}><strong>{n}</strong><span>{title}</span></div>)}</div>
    {participantRows.length > 0 && <><h2>Avaliações por tipo de participante</h2><p className="results-note">Clique em um tipo para filtrar os resultados abaixo. Clique novamente para mostrar todos os tipos. Os demais filtros são mantidos.</p><div className="results-breakdown" role="group" aria-label="Filtro rápido por tipo de participante">{unique(participantRows.map(r => r.publico)).map(p => {
      const audienceRows = participantRows.filter(r => r.publico === p)
      const evaluations = new Set(audienceRows.map(r => r.avaliacao)).size
      const participants = new Set(audienceRows.map(r => r.participante)).size
      return <button type="button" key={p} aria-pressed={filters.publico === p} onClick={() => setFilters(f => ({ ...f, publico: f.publico === p ? '' : p }))}><strong>{labels[p] || p}</strong><span>{evaluations} {evaluations === 1 ? 'avaliação' : 'avaliações'} · {participants} {participants === 1 ? 'participante' : 'participantes'}</span><small>{filters.publico === p ? 'Selecionado · Clique para remover' : 'Ver resultados →'}</small></button>
    })}</div></>}
    {!rows.length ? <div className="results-empty"><h3>{data?.length ? 'Nenhum resultado para estes filtros' : 'Esta campanha ainda não possui respostas'}</h3><p>{data?.length ? 'Altere ou limpe os filtros para visualizar os dados.' : 'Os gráficos estarão disponíveis após o envio de avaliações.'}</p></div> : <>
      <h2>Distribuição das respostas por pergunta</h2><p>Percentuais calculados sobre as respostas de cada pergunta, incluindo “não sei responder”.</p>
      <div className="results-chart-picker" role="group" aria-label="Visualização dos resultados">{([['bars', 'Barras'], ['donut', 'Roscas'], ['heatmap', 'Mapa de calor']] as const).map(([value, title]) => <button key={value} className={chart === value ? '' : 'secondary'} aria-pressed={chart === value} onClick={() => setChart(value)}>{title}</button>)}</div>
      <p className="results-note">{chart === 'bars' ? 'Barras: compare a frequência de cada opção em uma pergunta.' : chart === 'donut' ? 'Roscas: veja como as opções dividem o total de respostas de cada pergunta. As cores e a legenda permanecem consistentes.' : 'Mapa de calor: compare as opções de várias perguntas do mesmo formulário e versão em uma única tabela.'}</p>
      {chart === 'heatmap' ? <QuestionHeatmap groups={groups} /> : <div className="results-questions">{groups.map(group => {
        const first = group[0]
        return <article key={JSON.stringify([first.formulario, first.versao, first.perguntaId, first.pergunta])} className="results-question"><p className="admin-eyebrow">{first.formularioNome} · Versão {first.versao}</p><h3>{first.pergunta}</h3><p>{group.length} respostas</p>
          {chart === 'donut' ? <DonutChart rows={group} /> : optionDistribution(group).map(({ label, count }) => <div className="results-bar" key={label}><div><span>{label}</span><strong>{count} · {(100 * count / group.length).toFixed(1)}%</strong></div><div className="results-track"><div style={{ width: `${100 * count / group.length}%`, background: optionColor(label) }} /></div></div>)}
        </article>
      })}</div>}
      <h2>Comentários ({comments.length})</h2>{!comments.length ? <p>Sem comentários neste recorte.</p> : <details><summary>Exibir comentários</summary>{comments.map(r => <article className="results-comment" key={r.avaliacao}><strong>{r.formularioNome} · {labels[r.publico] || r.publico} · Versão {r.versao}</strong><p>{r.comentario}</p></article>)}</details>}
    </>}
  </div>
}
