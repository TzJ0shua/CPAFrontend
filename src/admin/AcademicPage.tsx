import { useCallback, useState } from 'react'
import type { FormEvent } from 'react'
import { adminApi } from './api'
import type { Course, Subject } from './types'
import { Filters, Notice, StatusBadge } from './ui'
import { matches, useAction, useAdminData } from './hooks'

export function AcademicPage({ kind }: { kind: 'cursos' | 'disciplinas' }) {
  const read = useCallback(async () => ({ items: await adminApi<(Course | Subject)[]>(`/${kind}`), courses: kind === 'disciplinas' ? await adminApi<Course[]>('/cursos') : [] }), [kind])
  const { data, error, loading, reload } = useAdminData(read)
  const { busy, message, run } = useAction(reload)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('active')
  const [courseFilter, setCourseFilter] = useState('')
  const [editing, setEditing] = useState<Course | Subject | 'new'>()
  const subjects = kind === 'disciplinas'
  const items = data?.items.filter(item => matches(item, search, status) && (!subjects || !courseFilter || (item as Subject).cursoId === Number(courseFilter))) || []
  return <section className="admin-card"><div className="admin-title"><div><p className="admin-eyebrow">CADASTROS ACADÊMICOS</p><h1>{subjects ? 'Disciplinas' : 'Cursos'}</h1></div><button disabled={busy} onClick={() => setEditing('new')}>{subjects ? 'Nova disciplina' : 'Novo curso'}</button></div>
    <p>Desativar um cadastro preserva os registros e o histórico de avaliações.</p>
    {message && <Notice>{message}</Notice>}{error && <Notice>{error} <button onClick={reload}>Tentar novamente</button></Notice>}
    {editing && <AcademicEditor key={editing === 'new' ? 'new' : editing.id} kind={kind} item={editing === 'new' ? undefined : editing} courses={data?.courses || []} busy={busy} onCancel={() => setEditing(undefined)} onSave={async input => {
      const saved = await run(() => adminApi(`/${kind}${editing === 'new' ? '' : `/${editing.id}`}`, editing === 'new' ? 'POST' : 'PUT', input))
      if (saved) setEditing(undefined)
    }} />}
    <Filters search={search} status={status} onSearch={setSearch} onStatus={setStatus} />
    {subjects && <label className="admin-course-filter">Curso<select value={courseFilter} onChange={e => setCourseFilter(e.target.value)}><option value="">Todos os cursos</option>{data?.courses.map(c => <option key={c.id} value={c.id}>{c.nome}{!c.ativo && ' (inativo)'}</option>)}</select></label>}
    {loading ? <p role="status">Carregando cadastros…</p> : <div className="admin-table-wrap"><table><thead><tr><th>Nome</th>{subjects && <><th>Curso</th><th>Professor</th></>}<th>Situação</th><th>Ações</th></tr></thead><tbody>{items.map(item => <tr key={item.id}><td>{item.nome}</td>{subjects && <><td>{(item as Subject).cursoNome}{!(item as Subject).cursoAtivo && <small>Curso inativo: oculto na pesquisa</small>}</td><td>{(item as Subject).professor}</td></>}<td><StatusBadge ativo={item.ativo} /></td><td><div className="admin-actions"><button className="secondary" disabled={busy} onClick={() => setEditing(item)}>Editar</button><button className="secondary" disabled={busy} onClick={() => void run(() => adminApi(`/${kind}/${item.id}/status`, 'PATCH', { ativo: !item.ativo }), `${item.ativo ? 'Desativar' : 'Reativar'} ${item.nome}? ${item.ativo ? 'O cadastro ficará indisponível para novas avaliações.' : 'O cadastro voltará a ficar disponível quando seus vínculos também estiverem ativos.'}`)}>{item.ativo ? 'Desativar' : 'Reativar'}</button></div></td></tr>)}</tbody></table>{!items.length && <p>Nenhum cadastro encontrado.</p>}</div>}
  </section>
}

function AcademicEditor({ kind, item, courses, busy, onCancel, onSave }: { kind: string; item?: Course | Subject; courses: Course[]; busy: boolean; onCancel: () => void; onSave: (input: unknown) => Promise<void> }) {
  const [name, setName] = useState(item?.nome || '')
  const [teacher, setTeacher] = useState((item as Subject | undefined)?.professor || '')
  const [course, setCourse] = useState(String((item as Subject | undefined)?.cursoId || ''))
  const submit = (e: FormEvent) => { e.preventDefault(); void onSave(kind === 'cursos' ? { nome: name } : { nome: name, professor: teacher, cursoId: Number(course) }) }
  return <form className="admin-editor" onSubmit={submit}><h2>{item ? 'Editar cadastro' : 'Novo cadastro'}</h2><label>Nome<input required maxLength={255} value={name} onChange={e => setName(e.target.value)} /></label>
    {kind === 'disciplinas' && <div className="admin-grid"><label>Curso<select required value={course} onChange={e => setCourse(e.target.value)}><option value="">Selecione um curso</option>{courses.filter(c => c.ativo || c.id === (item as Subject | undefined)?.cursoId).map(c => <option key={c.id} value={c.id}>{c.nome}{!c.ativo && ' (inativo)'}</option>)}</select></label><label>Professor<input required maxLength={255} value={teacher} onChange={e => setTeacher(e.target.value)} /></label></div>}
    <div className="admin-actions"><button disabled={busy}>{busy ? 'Salvando…' : 'Salvar'}</button><button className="secondary" type="button" disabled={busy} onClick={onCancel}>Cancelar</button></div>
  </form>
}
