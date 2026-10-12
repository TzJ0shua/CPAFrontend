import { useMemo, useState } from "react";
import type { Materia } from "../../../lib/survey-types";
import { Actions } from "../ui/Actions";
import { Button } from "../ui/Button";
import { OptionButton } from "../ui/OptionButton";
import { StepTitle } from "../ui/StepTitle";

interface SubjectStepProps {
  materias: Materia[];
  selectedSubjectIds: string[];
  onSubjectToggle: (subjectId: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export function SubjectStep({
  materias,
  selectedSubjectIds,
  onSubjectToggle,
  onNext,
  onBack,
}: SubjectStepProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredMaterias = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase("pt-BR");

    if (!query) return materias;

    return materias.filter((materia) => {
      const nome = materia.nome.toLocaleLowerCase("pt-BR");
      const docente = materia.docente.toLocaleLowerCase("pt-BR");

      return nome.includes(query) || docente.includes(query);
    });
  }, [materias, searchTerm]);

  return (
    <section className="survey-enter w-full max-w-2xl px-4">
      <StepTitle
        title="Selecione as Disciplinas"
        subtitle="Escolha uma ou mais disciplinas que você deseja avaliar."
      />

      <p className="mb-5 text-sm text-slate-600">Selecione todas as disciplinas desejadas antes de enviar. Alunos e participantes que entram por email podem responder cada versão do formulário uma única vez.</p>

      <label className="mb-5 grid gap-2 text-sm font-bold text-slate-700">
        Buscar disciplina
        <input
          className="h-12 rounded-lg border border-slate-300 bg-white px-4 text-base font-medium text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-700 focus:ring-4 focus:ring-blue-700/10"
          type="search"
          placeholder="Digite o nome da disciplina ou docente"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
      </label>

      {selectedSubjectIds.length > 0 ? (
        <div className="mx-auto mb-5 w-fit rounded-full bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700">
          {selectedSubjectIds.length}{" "}
          {selectedSubjectIds.length === 1
            ? "disciplina selecionada"
            : "disciplinas selecionadas"}
        </div>
      ) : null}

      <div
        className="mb-7 max-h-[50vh] overflow-y-auto overscroll-contain pr-2 sm:max-h-[32rem]"
        aria-label="Disciplinas disponíveis"
      >
        <div className="grid gap-3">
          {filteredMaterias.map((materia) => {
            const selected = selectedSubjectIds.includes(materia.id);

            return (
              <OptionButton
                icon={selected ? "OK" : "MAT"}
                key={materia.id}
                selected={selected}
                title={materia.nome}
                subtitle={materia.docente}
                onClick={() => onSubjectToggle(materia.id)}
              />
            );
          })}
        </div>
      </div>

      {filteredMaterias.length === 0 ? (
        <div className="mb-7 rounded-lg border border-slate-200 bg-white/80 p-6 text-center text-sm font-medium text-slate-500">
          Nenhuma disciplina encontrada para a busca informada.
        </div>
      ) : null}

      <Actions>
        <Button variant="secondary" onClick={onBack}>
          Voltar
        </Button>
        <Button disabled={selectedSubjectIds.length === 0} onClick={onNext}>
          Iniciar Questionário
        </Button>
      </Actions>
    </section>
  );
}
