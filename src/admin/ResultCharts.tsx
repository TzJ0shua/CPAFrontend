import { optionColor, optionDistribution, responseLabel } from './results-data'
import type { ResultRow } from './results-data'

export function DonutChart({ rows }: { rows: ResultRow[] }) {
  const distribution = optionDistribution(rows)
  const stops: string[] = []
  let start = 0
  for (const option of distribution) {
    const end = start + option.count / rows.length * 100
    stops.push(`${optionColor(option.label)} ${start}% ${end}%`)
    start = end
  }
  const description = distribution.map(o => `${o.label}: ${o.count}, ${(o.count / rows.length * 100).toFixed(1)}%`).join('; ')
  return <div className="results-donut-layout">
    <div className="results-donut" role="img" aria-label={`Distribuição de ${rows.length} respostas. ${description}`} style={{ background: `conic-gradient(${stops.join(', ')})` }}>
      <div aria-hidden="true"><strong>{rows.length}</strong><span>respostas</span></div>
    </div>
    <ul className="results-chart-legend">{distribution.map(option => <li key={option.label}>
      <span className="results-color-dot" style={{ background: optionColor(option.label) }} aria-hidden="true" />
      <span>{option.label}</span><strong>{option.count} · {(100 * option.count / rows.length).toFixed(1)}%</strong>
    </li>)}</ul>
  </div>
}

export function QuestionHeatmap({ groups }: { groups: ResultRow[][] }) {
  const forms = new Map<string, ResultRow[][]>()
  groups.forEach(group => {
    const key = JSON.stringify([group[0].formulario, group[0].versao])
    const form = forms.get(key)
    if (form) form.push(group)
    else forms.set(key, [group])
  })
  return <div className="results-heatmaps"><p className="results-note">Em telas pequenas, deslize a tabela horizontalmente para ver todas as opções.</p>{[...forms].map(([key, questions]) => {
    const first = questions[0][0]
    const options = optionDistribution(questions.flat())
    return <div key={key} className="results-heatmap-wrap" role="region" aria-label={`Mapa de calor: ${first.formularioNome}, versão ${first.versao}`} tabIndex={0}>
      <table className="results-heatmap"><caption>{first.formularioNome} · Versão {first.versao}</caption>
        <thead><tr><th scope="col">Pergunta</th><th scope="col">Respostas</th>{options.map(o => <th key={o.label} scope="col">{o.label}</th>)}</tr></thead>
        <tbody>{questions.map(group => <tr key={JSON.stringify([group[0].perguntaId, group[0].pergunta])}>
          <th scope="row">{group[0].pergunta}</th><td>{group.length}</td>
          {options.map(option => {
            const count = group.filter(r => responseLabel(r) === option.label).length
            const ratio = count / group.length
            return <td key={option.label} style={{ backgroundColor: `rgba(23, 94, 130, ${0.04 + ratio * 0.86})`, color: ratio > .55 ? '#fff' : '#172033' }}>
              <strong>{(ratio * 100).toFixed(1)}%</strong><small>{count} de {group.length}</small>
            </td>
          })}
        </tr>)}</tbody>
      </table>
    </div>
  })}<p className="results-note">Quanto mais escura a célula, maior o percentual de respostas naquela opção. Cada linha totaliza 100%; os números também são exibidos para permitir a leitura sem depender das cores.</p></div>
}
