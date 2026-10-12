import type {
  CatalogForm,
  Materia,
  Respostas,
} from "../../../lib/survey-types";
import {
  availableOptions,
  availableQuestions,
  isCommentRequired,
  isQuestionRequired,
} from "../../../lib/survey-catalog";
import { Actions } from "../ui/Actions";
import { Button } from "../ui/Button";

interface Props {
  form: CatalogForm;
  materia?: Materia;
  respostas: Respostas;
  onChange: (value: Respostas) => void;
  onBack: () => void;
  onNext: () => void;
  isSubmitting: boolean;
  blocked?: boolean;
  isLast: boolean;
  isFinalJourney: boolean;
  journeyPosition?: number;
  journeyTotal?: number;
}
export function QuestionnaireStep({
  form,
  materia,
  respostas,
  onChange,
  onBack,
  onNext,
  isSubmitting,
  blocked = false,
  isLast,
  isFinalJourney,
  journeyPosition,
  journeyTotal,
}: Props) {
  const questions = availableQuestions(form);
  const hasMissingRequiredAnswer = questions
    .filter(isQuestionRequired)
    .some((question) =>
      !respostas.opcoes[question.id],
    );
  const hasMissingRequiredComment =
    isCommentRequired(form) && !respostas.comentario.trim();
  const complete = !hasMissingRequiredAnswer && !hasMissingRequiredComment;
  return (
    <section className="survey-enter w-full max-w-2xl px-4 sm:px-6">
      <div className="mb-8 space-y-3 text-center sm:mb-10">
        <h2 className="text-3xl font-black leading-tight text-slate-950 sm:text-4xl">
          {form.name}
        </h2>
        {journeyPosition && journeyTotal ? (
          <p className="text-sm font-bold text-blue-700">
            Etapa {journeyPosition} de {journeyTotal} da sua jornada
          </p>
        ) : null}
        {materia ? (
          <p className="text-slate-600">
            {materia.nome} — {materia.docente}
          </p>
        ) : null}
      </div>
      <div className="grid gap-8 rounded-xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/10 sm:gap-10 sm:p-8">
        {questions.map((question, index) => (
          <fieldset
            className="grid gap-4 border-b border-slate-100 pb-8 last:border-0 last:pb-0"
            key={question.id}
          >
            <legend className="leading-relaxed font-bold text-slate-800">
              <span className="mr-2 text-blue-700">{index + 1}.</span>
              {question.texto}
              {isQuestionRequired(question) ? (
                <span className="ml-1 text-red-700" aria-label="Obrigatória">
                  *
                </span>
              ) : null}
            </legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {availableOptions(question).map((option) => (
                <button
                  className={`min-h-12 rounded-lg border px-4 py-3 text-left text-sm font-semibold transition ${respostas.opcoes[question.id] === option.code ? "border-blue-700 bg-blue-50 text-blue-800 ring-2 ring-blue-700/10" : "border-slate-200 hover:border-blue-300"}`}
                  type="button"
                  key={option.code}
                  aria-pressed={respostas.opcoes[question.id] === option.code}
                  onClick={() =>
                    onChange({
                      ...respostas,
                      opcoes: {
                        ...respostas.opcoes,
                        [question.id]: option.code,
                      },
                    })
                  }
                >
                  {option.label}
                </button>
              ))}
            </div>
            {!isQuestionRequired(question) ? (
              <p className="text-sm text-slate-500">Resposta opcional.</p>
            ) : null}
          </fieldset>
        ))}
        {form.commentAllowed ? (
          <label className="grid gap-3 border-t border-slate-200 pt-7 text-sm font-bold text-slate-700">
            Comentários adicionais{isCommentRequired(form) ? " *" : ""}
            {form.commentNotice ? (
              <small className="font-normal leading-relaxed text-slate-500">
                {form.commentNotice}
              </small>
            ) : null}
            <textarea
              className="min-h-32 rounded-lg border border-slate-300 p-3 text-base font-normal"
              maxLength={1000}
              required={isCommentRequired(form)}
              value={respostas.comentario}
              onChange={(e) =>
                onChange({ ...respostas, comentario: e.target.value })
              }
            />
          </label>
        ) : null}
      </div>
      <Actions>
        <Button variant="secondary" disabled={isSubmitting} onClick={onBack}>
          Voltar
        </Button>
        <Button disabled={!complete || isSubmitting || blocked} onClick={onNext}>
          {isSubmitting
            ? "Enviando..."
            : isLast
              ? isFinalJourney
                ? "Finalizar Pesquisa"
                : "Próxima etapa"
              : "Próxima Disciplina"}
        </Button>
      </Actions>
      {!complete ? (
        <p className="mt-5 text-center text-sm text-slate-500">
          {hasMissingRequiredAnswer
            ? "Responda todas as questões obrigatórias para continuar."
            : "Adicione o comentário obrigatório para continuar."}
        </p>
      ) : null}
    </section>
  );
}
