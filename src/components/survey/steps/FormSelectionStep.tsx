import type { CatalogForm } from "../../../lib/survey-types";
import { Actions } from "../ui/Actions";
import { Button } from "../ui/Button";
import { LoadingState } from "../ui/LoadingState";

interface Props {
  forms: CatalogForm[];
  selected: CatalogForm | null;
  loading: boolean;
  error: string;
  onSelect: (form: CatalogForm) => void;
  onRetry: () => void;
  onBack: () => void;
  onNext: () => void;
}
export function FormSelectionStep({
  forms,
  selected,
  loading,
  error,
  onSelect,
  onRetry,
  onBack,
  onNext,
}: Props) {
  return (
    <section className="survey-enter w-full max-w-2xl px-4 sm:px-6">
      <div className="mb-8 space-y-3 text-center sm:mb-10">
        <h2 className="text-3xl font-black text-slate-950 sm:text-4xl">
          Selecione a avaliação
        </h2>
        <p className="text-slate-600">
          Escolha o formulário disponível para o seu público.
        </p>
      </div>
      <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/10 sm:p-8">
        {loading ? <LoadingState message="Carregando formulários..." /> : null}
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
            <Button className="mt-4" onClick={onRetry}>
              Tentar novamente
            </Button>
          </div>
        ) : null}
        <div className="grid gap-4">
          {forms.map((form) => (
            <button
              className={`rounded-xl border p-4 text-left transition sm:p-5 ${selected?.code === form.code && selected.version === form.version ? "border-blue-700 bg-blue-50 ring-2 ring-blue-700/10" : "border-slate-200 hover:border-blue-300"}`}
              key={`${form.code}-${form.version}`}
              onClick={() => onSelect(form)}
            >
              <strong className="block text-slate-950">{form.name}</strong>
              <small className="mt-2 block leading-relaxed text-slate-500">
                Versão {form.version} · {" "}
                {form.scope === "DISCIPLINA"
                  ? "Avaliação por disciplina"
                  : "Avaliação geral"}
              </small>
            </button>
          ))}
        </div>
        {selected?.audience === "aluno" && selected.scope === "DISCIPLINA" ? <p className="text-sm text-slate-600">Selecione todas as disciplinas que deseja avaliar. Cada aluno pode enviar esta versão uma única vez.</p> : null}
        <Actions>
          <Button variant="secondary" onClick={onBack}>
            Voltar
          </Button>
          <Button
            disabled={!selected || loading || Boolean(error)}
            onClick={onNext}
          >
            Continuar
          </Button>
        </Actions>
      </div>
    </section>
  );
}
