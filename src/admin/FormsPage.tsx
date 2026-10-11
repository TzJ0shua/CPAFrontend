import { useCallback, useState } from 'react'
import type { FormEvent } from 'react'
import { adminApi, segment } from './api'
import type { AdminForm, Campaign, CloneFormResult, FormInput, Option, Question, Version } from './types'
import { CloneFormPanel } from './CloneFormPanel'
import { AdminLink, Filters, Notice, StatusBadge } from './ui'
import { matches, navigate, useAction, useAdminData } from './hooks'

const formBase = (campaign: string, form?: string) => `/campanhas/${segment(campaign)}/formularios${form ? `/${segment(form)}` : ''}`
const audienceNames: Record<string, string> = { aluno: 'Aluno', professor: 'Professor', funcionario: 'Funcionário', gestao: 'Gestão' }

export function FormsPage({ campaign, form }: { campaign: string; form?: string }) {
  if (form) return <VersionsList campaign={campaign} form={form} />
  return <FormsList campaign={campaign} />
}

function FormsList({ campaign }: { campaign: string }) {
  const base = formBase(campaign)
  const read = useCallback(async () => ({ items: await adminApi<AdminForm[]>(formBase(campaign)), campaign: await adminApi<Campaign>(`/campanhas/${segment(campaign)}`) }), [campaign])
  const { data, error, loading, reload } = useAdminData(read)
  const { busy, message, run } = useAction(reload)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('active')
  const [creating, setCreating] = useState(false)
  const [cloning, setCloning] = useState(false)
  const configuring = data?.campaign.estado === 'RASCUNHO' || data?.campaign.estado === 'APROVADA'
  const items = data?.items.filter(f => matches(f, search, status)) || []
  return <section className="admin-card"><AdminLink href={`/admin/campanhas/${segment(campaign)}`}>← Campanha {campaign}</AdminLink><div className="admin-title"><h1>Formulários</h1><div className="admin-actions"><button disabled={busy} onClick={() => { setCreating(true); setCloning(false) }}>Novo formulário</button><button className="secondary" disabled={busy || !configuring} onClick={() => { setCloning(true); setCreating(false) }}>Clonar de outra campanha</button></div></div>
    {!loading && data && !configuring && <p>A clonagem de outra campanha está disponível quando a campanha de destino estiver em rascunho ou aprovada.</p>}
    {message && <Notice>{message}</Notice>}{error && <Notice>{error} <button onClick={reload}>Tentar novamente</button></Notice>}
    {creating && <FormEditor busy={busy} onCancel={() => setCreating(false)} onSave={async dto => {
      let number = 1
      if (await run(async () => { number = await adminApi<number>(base, 'POST', dto) }, 'Criar este formulário? A campanha voltará ao estado de rascunho.')) navigate(`/admin${base}/${segment(dto.codigo)}/versoes/${number}`)
    }} />}
    {cloning && <CloneFormPanel campaign={campaign} busy={busy} onCancel={() => setCloning(false)} onSave={async dto => {
      await run(async () => {
        const result = await adminApi<CloneFormResult>(`${base}/clonar`, 'POST', dto)
        navigate(`/admin${base}/${segment(result.codigo)}/versoes/${result.versao}`)
      }, 'Criar uma cópia em rascunho nesta campanha? A campanha de destino voltará ao estado de rascunho.')
    }} />}
    <Filters search={search} status={status} onSearch={setSearch} onStatus={setStatus} />
    {loading ? <p role="status">Carregando formulários…</p> : <div className="admin-table-wrap"><table><thead><tr><th>Formulário</th><th>Código</th><th>Público inicial</th><th>Situação</th><th>Ações</th></tr></thead><tbody>{items.map(f => <tr key={f.id}><td><AdminLink href={`/admin${base}/${segment(f.codigo)}`}>{f.nome}</AdminLink></td><td>{f.codigo}</td><td>{audienceNames[f.publico] || f.publico}</td><td><StatusBadge ativo={f.ativo} /></td><td><div className="admin-actions"><AdminLink href={`/admin${base}/${segment(f.codigo)}`}>Versões →</AdminLink><button className="secondary" disabled={busy} onClick={() => void run(() => adminApi(`${base}/${segment(f.codigo)}/status`, 'PATCH', { ativo: !f.ativo }), `${f.ativo ? 'Desativar' : 'Reativar'} o formulário ${f.nome}? Todas as versões serão afetadas na pesquisa.`)}>{f.ativo ? 'Desativar' : 'Reativar'}</button></div></td></tr>)}</tbody></table>{!items.length && <p>Nenhum formulário encontrado.</p>}</div>}
  </section>
}

function VersionsList({ campaign, form }: { campaign: string; form: string }) {
  const base = formBase(campaign, form)
  const read = useCallback(() => adminApi<Version[]>(`${formBase(campaign, form)}/versoes`), [campaign, form])
  const { data, error, loading, reload } = useAdminData(read)
  const { busy, message, run } = useAction(reload)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  return <section className="admin-card"><AdminLink href={`/admin${formBase(campaign)}`}>← Formulários</AdminLink><div className="admin-title"><div><p className="admin-eyebrow">{campaign} / {form}</p><h1>Versões do formulário</h1></div><button disabled={busy || !data?.length} onClick={() => void run(async () => {
      const number = await adminApi<number>(`${base}/versoes`, 'POST')
      navigate(`/admin${base}/versoes/${number}`)
    }, 'Clonar a versão mais recente em um novo rascunho? A campanha voltará ao estado de rascunho.')}>Clonar versão mais recente</button></div>
    <p>Versões publicadas preservam o questionário usado nas avaliações. Para alterar o conteúdo, crie um novo rascunho.</p>
    {message && <Notice>{message}</Notice>}{error && <Notice>{error} <button onClick={reload}>Tentar novamente</button></Notice>}
    <Filters search={search} status={status} onSearch={setSearch} onStatus={setStatus} />
    {loading ? <p role="status">Carregando versões…</p> : <div className="admin-table-wrap"><table><thead><tr><th>Versão</th><th>Nome</th><th>Público</th><th>Estado</th><th>Situação</th><th>Ações</th></tr></thead><tbody>{data?.filter(v => matches(v, search, status)).map(v => <tr key={v.id}><td>{v.numero}</td><td>{v.nome}</td><td>{audienceNames[v.publico]}</td><td>{v.estado}</td><td><StatusBadge ativo={v.ativo} /></td><td><div className="admin-actions"><AdminLink href={`/admin${base}/versoes/${v.numero}`}>{v.estado === 'RASCUNHO' ? 'Editar' : 'Consultar'} →</AdminLink><button className="secondary" disabled={busy} onClick={() => void run(() => adminApi(`${base}/versoes/${v.numero}/status`, 'PATCH', { ativo: !v.ativo }), `${v.ativo ? 'Desativar' : 'Reativar'} a versão ${v.numero}?`)}>{v.ativo ? 'Desativar' : 'Reativar'}</button></div></td></tr>)}</tbody></table>{!data?.filter(v => matches(v, search, status)).length && <p>Nenhuma versão encontrada.</p>}</div>}
  </section>
}

export function VersionPage({ campaign, form, number }: { campaign: string; form: string; number: number }) {
  const base = `${formBase(campaign, form)}/versoes/${number}`
  const read = useCallback(() => adminApi<Version>(`${formBase(campaign, form)}/versoes/${number}`), [campaign, form, number])
  const { data, error, loading, reload } = useAdminData(read)
  const { busy, message, run } = useAction(reload)
  const [dirty, setDirty] = useState(false)
  return <section className="admin-card"><AdminLink href={`/admin${formBase(campaign, form)}`}>← Versões de {form}</AdminLink><div className="admin-title"><h1>Versão {number}</h1>{data && <StatusBadge ativo={data.ativo} />}</div>
    {message && <Notice>{message}</Notice>}{error && <Notice>{error} <button onClick={reload}>Tentar novamente</button></Notice>}
    {loading ? <p role="status">Carregando questionário…</p> : data && <>
      <p>Estado: <strong>{data.estado}</strong>{data.estado === 'PUBLICADA' && ' · Conteúdo somente para leitura.'}</p>
      {data.estado === 'RASCUNHO' && <p>{dirty ? 'Há alterações não salvas. Salve o rascunho antes de publicar ou alterar sua situação.' : 'Salve as alterações antes de publicar. A publicação usa o conteúdo salvo no banco.'}</p>}
      <div className="admin-actions">
        {data.estado === 'RASCUNHO' && <button disabled={busy || !data.ativo || dirty || !data.perguntas.some(p => p.ativo)} onClick={() => void run(() => adminApi(`${base}/publicar`, 'POST'), 'Publicar o conteúdo salvo desta versão? Ele não poderá mais ser editado e a campanha voltará ao estado de rascunho.')}>Publicar versão salva</button>}
        <button className="secondary" disabled={busy || dirty} onClick={() => void run(() => adminApi(`${base}/status`, 'PATCH', { ativo: !data.ativo }), `${data.ativo ? 'Desativar' : 'Reativar'} esta versão?`)}>{data.ativo ? 'Desativar' : 'Reativar'}</button>
      </div>
      <FormEditor key={`${data.id}-${data.estado}`} initial={data} readOnly={data.estado !== 'RASCUNHO'} busy={busy} onDirtyChange={setDirty} onSave={async dto => { if (await run(() => adminApi(base, 'PUT', dto), 'Salvar o rascunho? A campanha voltará ao estado de rascunho.')) setDirty(false) }} />
    </>}
  </section>
}

function newOptions(): Option[] {
  return [...[1, 2, 3, 4].map(value => ({ code: `opcao_${value}`, label: ['Discordo totalmente', 'Discordo parcialmente', 'Concordo parcialmente', 'Concordo totalmente'][value - 1], value, naoSeiResponder: false, ativo: true })), { code: 'nao_sei_responder', label: 'Não sei responder', value: null, naoSeiResponder: true, ativo: true }]
}
function newQuestion(index: number): Question { return { codigo: `q${index}`, texto: '', ordem: index, ativo: true, opcoes: newOptions() } }

export function FormEditor({ initial, readOnly = false, busy, onSave, onCancel, onDirtyChange }: { initial?: FormInput; readOnly?: boolean; busy: boolean; onSave: (dto: FormInput) => Promise<void>; onCancel?: () => void; onDirtyChange?: (dirty: boolean) => void }) {
  const [draft, setDraft] = useState<FormInput>(() => initial ? structuredClone(initial) : { codigo: '', nome: '', publico: 'aluno', escopo: 'GERAL', ordem: 1, commentAllowed: false, commentNotice: '', perguntas: [newQuestion(1)] })
  const [showInactive, setShowInactive] = useState(false)
  const change = <K extends keyof FormInput>(key: K, value: FormInput[K]) => { onDirtyChange?.(true); setDraft(d => ({ ...d, [key]: value })) }
  const changeQuestion = (index: number, value: Partial<Question>) => { onDirtyChange?.(true); setDraft(d => ({ ...d, perguntas: d.perguntas.map((p, i) => i === index ? { ...p, ...value } : p) })) }
  const changeOption = (question: number, option: number, value: Partial<Option>) => { onDirtyChange?.(true); setDraft(d => ({ ...d, perguntas: d.perguntas.map((p, i) => i === question ? { ...p, opcoes: p.opcoes.map((o, j) => j === option ? { ...o, ...value } : o) } : p) })) }
  const submit = (event: FormEvent) => { event.preventDefault(); if (!readOnly && !busy) void onSave(draft) }
  return <form className="admin-editor" onSubmit={submit}><h2>{initial ? 'Questionário' : 'Novo formulário'}</h2><fieldset disabled={busy || readOnly}>
    <div className="admin-grid"><label>Código<input required disabled={!!initial} maxLength={60} value={draft.codigo} onChange={e => change('codigo', e.target.value)} /></label><label>Nome<input required maxLength={180} value={draft.nome} onChange={e => change('nome', e.target.value)} /></label>
      <label>Público<select value={draft.publico} onChange={e => change('publico', e.target.value)}>{Object.entries(audienceNames).map(([code, name]) => <option value={code} key={code}>{name}</option>)}</select></label>
      <label>Escopo<select value={draft.escopo} onChange={e => change('escopo', e.target.value)}><option value="GERAL">Geral</option><option value="DISCIPLINA">Por disciplina</option></select></label><label>Ordem<input type="number" required min={1} step={1} value={draft.ordem} onChange={e => change('ordem', Number(e.target.value))} /></label>
    </div><label className="admin-check"><input type="checkbox" checked={draft.commentAllowed} onChange={e => change('commentAllowed', e.target.checked)} />Permitir comentário</label>
    {draft.commentAllowed && <label>Aviso sobre o comentário<textarea required maxLength={500} value={draft.commentNotice || ''} onChange={e => change('commentNotice', e.target.value)} /></label>}
    <h3>Perguntas e opções</h3><p>{readOnly ? 'Este conteúdo foi preservado na publicação. Para alterá-lo, clone a versão em um novo rascunho.' : 'Remova perguntas durante a configuração do rascunho. As perguntas já salvas serão desativadas para preservar o histórico. É necessário ter uma pergunta ativa para publicar.'}</p>
    {!readOnly && <label className="admin-check"><input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />Mostrar perguntas desativadas</label>}
    {!draft.perguntas.some(p => p.ativo) && !readOnly && <p>Nenhuma pergunta ativa. Adicione ou reative uma pergunta antes de publicar.</p>}
    {draft.perguntas.map((p, i) => (readOnly || p.ativo || showInactive) && <section className={`admin-question ${!p.ativo ? 'is-inactive' : ''}`} key={i}><div className="admin-title"><h3>Pergunta {i + 1}</h3><div className="admin-actions"><label className="admin-check"><input type="checkbox" checked={p.ativo} onChange={e => changeQuestion(i, { ativo: e.target.checked })} />Ativa</label>{!readOnly && p.ativo && <button type="button" className="secondary" onClick={() => {
        if (window.confirm('Remover esta pergunta do rascunho? Perguntas já salvas serão desativadas e poderão ser reativadas.')) {
          if (p.id) changeQuestion(i, { ativo: false })
          else change('perguntas', draft.perguntas.filter((_, index) => index !== i))
        }
      }}>Remover pergunta</button>}</div></div>
      <div className="admin-grid"><label>Código<input required maxLength={40} value={p.codigo} onChange={e => changeQuestion(i, { codigo: e.target.value })} /></label><label>Ordem<input required type="number" min={1} step={1} value={p.ordem} onChange={e => changeQuestion(i, { ordem: Number(e.target.value) })} /></label></div><label>Texto<textarea required maxLength={1000} value={p.texto} onChange={e => changeQuestion(i, { texto: e.target.value })} /></label>
      {p.opcoes.map((o, j) => <div className={`admin-option ${!o.ativo ? 'is-inactive' : ''}`} key={j}><label>Código da opção<input required maxLength={30} value={o.code} onChange={e => changeOption(i, j, { code: e.target.value })} /></label><label>Rótulo<input required maxLength={100} value={o.label} onChange={e => changeOption(i, j, { label: e.target.value })} /></label><label>Valor<input type="number" required={!o.naoSeiResponder} disabled={o.naoSeiResponder} min={1} max={5} step={1} value={o.value ?? ''} onChange={e => changeOption(i, j, { value: e.target.value === '' ? null : Number(e.target.value) })} /></label><div><label className="admin-check"><input type="checkbox" checked={o.naoSeiResponder} onChange={e => changeOption(i, j, { naoSeiResponder: e.target.checked, value: e.target.checked ? null : 1 })} />Não sei responder</label><label className="admin-check"><input type="checkbox" checked={o.ativo} onChange={e => changeOption(i, j, { ativo: e.target.checked })} />Ativa</label></div></div>)}
      {!readOnly && <button type="button" className="secondary" onClick={() => {
        let index = p.opcoes.length + 1
        while (p.opcoes.some(o => o.code === `opcao_${index}`)) index++
        changeQuestion(i, { opcoes: [...p.opcoes, { code: `opcao_${index}`, label: '', value: 1, naoSeiResponder: false, ativo: true }] })
      }}>Adicionar opção</button>}
    </section>)}
    {!readOnly && <button type="button" className="secondary" onClick={() => {
      let index = draft.perguntas.length + 1
      while (draft.perguntas.some(p => p.codigo === `q${index}`)) index++
      change('perguntas', [...draft.perguntas, newQuestion(index)])
    }}>Adicionar pergunta</button>}
  </fieldset>{!readOnly && <div className="admin-actions"><button disabled={busy}>{busy ? 'Salvando…' : 'Salvar rascunho'}</button>{onCancel && <button type="button" className="secondary" disabled={busy} onClick={onCancel}>Cancelar</button>}</div>}</form>
}
