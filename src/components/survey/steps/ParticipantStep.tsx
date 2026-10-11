import { useState, type FormEvent } from "react";
import type { ParticipantType } from "../../../lib/survey-types";
import { Button } from "../ui/Button";

interface Props {
  participantType: ParticipantType | null;
  acceptedTerms: boolean;
  onParticipantTypeChange: (value: ParticipantType) => void;
  onAcceptedTermsChange: (value: boolean) => void;
  onNext: () => void;
  error?: string;
  onRetry?: () => void;
}

const options: Array<{
  value: ParticipantType;
  title: string;
  description: string;
}> = [
  {
    value: "aluno",
    title: "Estudante",
    description: "Vou responder como discente da FeMASS.",
  },
  {
    value: "professor",
    title: "Docente",
    description: "Vou usar meu e-mail institucional ou a chave mestra para responder.",
  },
  {
    value: "funcionario",
    title: "Funcionário",
    description: "Vou usar meu e-mail institucional ou a chave mestra para responder.",
  },
];

export function ParticipantStep(props: Props) {
  const [touched, setTouched] = useState(false);
  const valid = Boolean(props.participantType) && props.acceptedTerms;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (valid) props.onNext();
  };
  return (
    <section className="survey-enter w-full max-w-2xl px-4 sm:px-6">
      <div className="mb-8 space-y-4 text-center sm:mb-10">
        <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700">
          Pesquisa confidencial
        </span>
        <h1 className="text-3xl font-black leading-tight text-slate-950 sm:text-5xl">
          Pesquisa de Satisfação Acadêmica
        </h1>
        <p className="mx-auto max-w-xl text-base text-slate-600 sm:text-lg">
          Escolha como deseja participar da avaliação.
        </p>
      </div>
      <form
        className="space-y-7 rounded-xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/10 sm:p-8"
        onSubmit={submit}
      >
        <fieldset className="grid gap-4">
          <legend className="text-sm font-bold text-slate-700">
            Tipo de participante
          </legend>
          {options.map((option) => (
            <button
              className={`rounded-xl border p-4 text-left transition sm:p-5 ${props.participantType === option.value ? "border-blue-700 bg-blue-50 ring-2 ring-blue-700/10" : "border-slate-200 hover:border-blue-300"}`}
              key={option.value}
              type="button"
              aria-pressed={props.participantType === option.value}
              onClick={() => props.onParticipantTypeChange(option.value)}
            >
              <strong className="block text-slate-950">{option.title}</strong>
              <small className="mt-2 block leading-relaxed text-slate-500">
                {option.description}
              </small>
            </button>
          ))}
        </fieldset>
        <label className="flex items-start gap-3 rounded-lg bg-slate-50 p-4 text-sm leading-relaxed text-slate-600">
          <input
            className="mt-1 shrink-0"
            type="checkbox"
            checked={props.acceptedTerms}
            onChange={(e) => props.onAcceptedTermsChange(e.target.checked)}
          />
          Li e aceito os termos de uso e a política de privacidade.
        </label>
        {touched && !valid ? (
          <p className="text-sm font-semibold text-red-600">
            Preencha os campos obrigatórios para continuar.
          </p>
        ) : null}
        {props.error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            <p>{props.error}</p>
            {props.onRetry ? (
              <Button className="mt-3" type="button" onClick={props.onRetry}>
                Tentar novamente
              </Button>
            ) : null}
          </div>
        ) : null}
        <Button className="w-full" type="submit">
          Continuar
        </Button>
      </form>
    </section>
  );
}
