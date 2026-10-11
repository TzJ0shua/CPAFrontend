export interface Campaign { id: number; codigo: string; nome: string; mensagem: string | null; estado: string; ativo: boolean; dataInicio: string | null; dataFim: string | null; disponivelParaResposta: boolean }
export interface Course { id: number; nome: string; ativo: boolean }
export interface Subject { id: number; nome: string; professor: string; cursoId: number; cursoNome: string; ativo: boolean; cursoAtivo: boolean }
export interface AdminForm { id: number; codigo: string; nome: string; publico: string; ativo: boolean }
export interface Option { id?: number; code: string; label: string; value: number | null; naoSeiResponder: boolean; ativo: boolean }
export interface Question { id?: number; codigo: string; texto: string; ordem: number; ativo: boolean; opcoes: Option[] }
export interface FormInput { codigo: string; nome: string; publico: string; escopo: string; ordem: number; commentAllowed: boolean; commentNotice: string | null; perguntas: Question[] }
export interface Version extends FormInput { id: number; numero: number; estado: string; ativo: boolean }
