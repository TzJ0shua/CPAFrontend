import { useState, type FormEvent } from "react";
import type { ParticipantType } from "../../../lib/survey-types";
import { Button } from "../ui/Button";
import { formatCpf, validCpf } from "../../../lib/student-identity";

interface Props {
  participantType: ParticipantType | null;
  acceptedTerms: boolean;
  cpf: string;
  matricula: string;
  onCpfChange: (value: string) => void;
  onMatriculaChange: (value: string) => void;
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
  const student = props.participantType === "aluno";
  const cpfError = student && !validCpf(props.cpf);
  const matriculaError = student && !/^[0-9]{10}$/.test(props.matricula);
  const valid = Boolean(props.participantType) && props.acceptedTerms && !cpfError && !matriculaError;
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
        {student ? <div className="space-y-4">
          <p className="text-sm text-slate-600">CPF e matrícula serão transformados em hashes no servidor para impedir respostas repetidas à mesma versão. Os valores originais não serão armazenados.</p>
          <label className="grid gap-2 font-bold">CPF
            <input type="text" inputMode="numeric" autoComplete="off" required maxLength={14} placeholder="000.000.000-00"
              className="h-12 rounded-lg border border-slate-300 px-4 font-normal" value={props.cpf}
              onChange={e => props.onCpfChange(formatCpf(e.target.value))}
              aria-invalid={touched && cpfError} aria-describedby={touched && cpfError ? "cpf-error" : undefined} />
          </label>
          {touched && cpfError ? <p id="cpf-error" role="alert" className="text-sm text-red-600">Informe um CPF válido.</p> : null}
          <label className="grid gap-2 font-bold">Matrícula
            <input type="text" inputMode="numeric" autoComplete="off" required maxLength={10}
              className="h-12 rounded-lg border border-slate-300 px-4 font-normal" value={props.matricula}
              onChange={e => props.onMatriculaChange(e.target.value.replace(/\D/g, '').slice(0, 10))}
              aria-invalid={touched && matriculaError} aria-describedby={touched && matriculaError ? "matricula-error" : undefined} />
          </label>
          {touched && matriculaError ? <p id="matricula-error" role="alert" className="text-sm text-red-600">Informe uma matrícula com 10 dígitos.</p> : null}
        </div> : null}
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
