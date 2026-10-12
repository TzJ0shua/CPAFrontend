import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildSurveyApiPayload } from "../../lib/survey-payload";
import type {
  CatalogForm,
  Curso,
  Materia,
  ParticipantType,
  Respostas,
  Step,
} from "../../lib/survey-types";
import { fetchCatalog, fetchFormCourses } from "../../services/catalog-api";
import {
  confirmEmailVerification,
  requestEmailVerification,
  authorizeMasterKey,
  EmailVerificationError,
} from "../../services/email-verification-api";
import { fetchCampaignPublicState } from "../../services/campaign-state-api";
import {
  submitSurvey,
  fetchStudentProgress,
  type SubmitSurveyResult,
} from "../../services/survey-api";
import { ConfirmationStep } from "./steps/ConfirmationStep";
import { CourseStep } from "./steps/CourseStep";
import {
  EmailVerificationStep,
  PinVerificationStep,
} from "./steps/EmailVerificationStep";
import { FormSelectionStep } from "./steps/FormSelectionStep";
import { ParticipantStep } from "./steps/ParticipantStep";
import { QuestionnaireStep } from "./steps/QuestionnaireStep";
import { SubjectStep } from "./steps/SubjectStep";

const emptyResponses = (): Respostas => ({ opcoes: {}, comentario: "" });

export function SurveyForm({ campaign }: { campaign: string }) {
  const [step, setStep] = useState<Step>("participant");
  const [participantType, setParticipantType] =
    useState<ParticipantType | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [cpf, setCpf] = useState("");
  const [matricula, setMatricula] = useState("");
  const [forms, setForms] = useState<CatalogForm[]>([]);
  const [form, setForm] = useState<CatalogForm | null>(null);
  const [loadingForms, setLoadingForms] = useState(false);
  const [formError, setFormError] = useState("");
  const [email, setEmail] = useState("");
  const [verificationId, setVerificationId] = useState<number | null>(null);
  const [emailVerificationToken, setEmailVerificationToken] = useState<
    string | null
  >(null);
  const [verificationError, setVerificationError] = useState("");
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [emailUnavailable, setEmailUnavailable] = useState(false);
  const [courses, setCourses] = useState<Curso[]>([]);
  const [course, setCourse] = useState<Curso | null>(null);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [subjectIndex, setSubjectIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, Respostas>>({});
  const [generalResponses, setGeneralResponses] = useState(emptyResponses);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitSurveyResult | null>(null);
  const [completedScopes, setCompletedScopes] = useState<string[]>([]);
  const [lastCompletedSubjects, setLastCompletedSubjects] = useState(0);
  const [completedStudentForms, setCompletedStudentForms] = useState<string[]>([]);
  const [journeyError, setJourneyError] = useState("");
  const [checkingProgress, setCheckingProgress] = useState(false);
  const requestInFlight = useRef(false);
  const confirmationInFlight = useRef(false);
  const submissionInFlight = useRef(false);
  const progressInFlight = useRef(false);
  const selectedSubjects = useMemo(
    () =>
      course?.materias.filter((subject) =>
        selectedSubjectIds.includes(subject.id),
      ) ?? [],
    [course, selectedSubjectIds],
  );
  const currentSubject = selectedSubjects[subjectIndex];
  const isStaffJourney =
    participantType === "professor" || participantType === "funcionario";
  const isStudentJourney = participantType === "aluno";
  const currentFormIndex = form
    ? forms.findIndex(
        (item) => item.code === form.code && item.version === form.version,
      )
    : -1;
  const nextForm =
    currentFormIndex >= 0
      ? forms.slice(currentFormIndex + 1).find(item => !isStudentJourney || !completedStudentForms.includes(`${item.code}:${item.version}`))
      : undefined;

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [step, form?.code, form?.version, subjectIndex]);

  const clearVerification = () => {
    setEmail("");
    setVerificationId(null);
    setEmailVerificationToken(null);
    setVerificationError("");
    setEmailUnavailable(false);
  };

  const loadForms = useCallback(async () => {
    if (!participantType) return;
    setLoadingForms(true);
    setFormError("");
    try {
      const catalog = await fetchCatalog(participantType, campaign);
      setForms(catalog);
      setForm((current) =>
        current
          ? (catalog.find((item) => item.code === current.code && item.version === current.version) ?? null)
          : current,
      );
      return catalog;
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os formulários.",
      );
    } finally {
      setLoadingForms(false);
    }
  }, [participantType, campaign]);
  const participantNext = async () => {
    if (participantType === "aluno") {
      await refreshStudentJourney(false);
      return;
    }
    const catalog = await loadForms();
    if (!catalog?.length) return;
    if (!participantType) return;
    setForm(catalog[0]);
    setStep("email");
  };
  const resetAnswersForForm = () => {
    setCourse(null);
    setSelectedSubjectIds([]);
    setSubjectIndex(0);
    setResponses({});
    setGeneralResponses(emptyResponses);
  };
  const clearAfterConfirmation = () => {
    clearVerification();
    resetAnswersForForm();
    setEmailVerificationToken(null);
  };
  const selectParticipantType = (value: ParticipantType) => {
    if (value !== participantType) {
      setCpf(""); setMatricula("");
      clearVerification();
      setForms([]);
      setForm(null);
      setFormError("");
      setCompletedStudentForms([]);
      setCompletedScopes([]);
      setJourneyError("");
      resetAnswersForForm();
    }
    setParticipantType(value);
  };
  const startForm = async (target = form) => {
    if (!target || !participantType) return;
    if (participantType !== "aluno" && !emailVerificationToken) {
      setStep("email");
      return;
    }
    resetAnswersForForm();
    if (target.scope === "DISCIPLINA") {
      try {
        setCourses(await fetchFormCourses(participantType, campaign));
        setStep("course");
      } catch (error) {
        setFormError(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar os cursos.",
        );
        setStep("form");
      }
    } else setStep("questionnaire");
  };
  const refreshStudentJourney = async (advance: boolean) => {
    if (progressInFlight.current) return;
    progressInFlight.current = true;
    setCheckingProgress(true);
    setJourneyError("");
    try {
      const catalog = await fetchCatalog("aluno", campaign);
      const progress = await fetchStudentProgress(campaign, cpf, matricula, acceptedTerms);
      const ordered = progress.formularios.map(item => {
        const found = catalog.find(f => f.code === item.code && f.version === item.version);
        if (!found) throw new Error("Os formulários foram atualizados. Consulte o progresso novamente.");
        return found;
      });
      if (catalog.length !== ordered.length) throw new Error("Os formulários foram atualizados. Consulte o progresso novamente.");
      const completed = progress.formularios.filter(item => item.respondido).map(item => `${item.code}:${item.version}`);
      setForms(ordered);
      setCompletedStudentForms(completed);
      setCompletedScopes(ordered.filter(item => completed.includes(`${item.code}:${item.version}`)).map(item => item.name));
      setFormError("");
      if (progress.concluida) {
        setResult({ ok: true, status: 200, message: "Você concluiu todas as avaliações da campanha. Tire uma captura de tela do QR Code para guardar seu comprovante.", proof: progress.proof });
        clearAfterConfirmation();
        setStep("confirmation");
        return;
      }
      const pending = ordered.find(item => !completed.includes(`${item.code}:${item.version}`));
      setForm(pending ?? null);
      setResult(null);
      if (!pending) throw new Error("Não há formulários disponíveis para seu público nesta campanha.");
      if (advance) await startForm(pending);
      else setStep("form");
    } catch (error) {
      setJourneyError(error instanceof Error ? error.message : "Não foi possível consultar seu progresso.");
    } finally {
      progressInFlight.current = false;
      setCheckingProgress(false);
    }
  };
  const requestCode = async (value: string) => {
    if (
      requestInFlight.current ||
      !form ||
      !participantType ||
      participantType === "aluno"
    )
      return;
    requestInFlight.current = true;
    const nextEmail = value.trim();
    clearVerification();
    setEmail(nextEmail);
    setVerificationLoading(true);
    try {
      const response = await requestEmailVerification(
        nextEmail,
        participantType,
        form,
      );
      setVerificationId(response.verificationId);
      setStep("pin");
    } catch (error) {
      if (error instanceof EmailVerificationError && error.status === 503) setEmailUnavailable(true);
      setVerificationError(
        error instanceof Error
          ? error.message
          : "Não foi possível solicitar a verificação.",
      );
    } finally {
      requestInFlight.current = false;
      setVerificationLoading(false);
    }
  };
  const resend = () => requestCode(email);
  const useMasterKey = async (chave: string) => {
    if (requestInFlight.current || !form || !participantType || participantType === "aluno") return;
    requestInFlight.current = true;
    setVerificationLoading(true);
    setVerificationError("");
    setEmailVerificationToken(null);
    try {
      const response = await authorizeMasterKey(chave, participantType, form);
      setEmailVerificationToken(response.submissionToken);
      setVerificationId(null);
      setEmail("");
      await startAfterVerification();
    } catch (error) {
      setVerificationError(error instanceof Error ? error.message : "Não foi possível validar a chave mestra.");
    } finally {
      requestInFlight.current = false;
      setVerificationLoading(false);
    }
  };
  const confirmCode = async (pin: string) => {
    if (confirmationInFlight.current || !verificationId) return;
    confirmationInFlight.current = true;
    setVerificationLoading(true);
    setVerificationError("");
    try {
      const response = await confirmEmailVerification(verificationId, pin);
      setEmailVerificationToken(response.submissionToken);
      setVerificationId(null);
      setEmail("");
      await startAfterVerification();
    } catch (error) {
      setVerificationError(
        error instanceof Error
          ? error.message
          : "Código de verificação inválido ou expirado.",
      );
    } finally {
      confirmationInFlight.current = false;
      setVerificationLoading(false);
    }
  };
  const startAfterVerification = () => {
    // Access authorization belongs to the audience and campaign. The form sent
    // to the access API is only its initial context, not the participant's choice.
    resetAnswersForForm();
    setForm(null);
    setFormError("");
    setStep("form");
  };
  const restartEmailVerification = () => {
    clearVerification();
    setStep("email");
  };
  const submit = async () => {
    if (submissionInFlight.current || !form || !participantType) return;
    submissionInFlight.current = true;
    setIsSubmitting(true);
    let advancesToNextForm = false;
    let shouldShowConfirmation = true;
    try {
      const campaignState = await fetchCampaignPublicState(campaign);
      if (!campaignState.isOpen) {
        setResult({
          ok: false,
          status: campaignState.state === "ENCERRADA" ? 410 : 409,
          message:
            campaignState.unavailableMessage ||
            (campaignState.state === "ENCERRADA"
              ? "A campanha foi encerrada antes do envio da sua resposta."
              : "A campanha não está disponível para respostas no momento."),
        });
        return;
      }

      const submission = await submitSurvey(
        buildSurveyApiPayload({
          form,
          participantType,
          acceptedTerms,
          emailVerificationToken,
          course,
          subjects: selectedSubjects,
          responses,
          generalResponses,
          studentIdentity: { cpf, matricula },
        }),
      );
      if (isStudentJourney) {
        shouldShowConfirmation = false;
        if (submission.ok || submission.code === "FORMULARIO_JA_RESPONDIDO") {
          setLastCompletedSubjects(selectedSubjects.length);
          await refreshStudentJourney(true);
        } else {
          setJourneyError(submission.message + " Verifique seu progresso antes de continuar; o envio não será repetido automaticamente.");
        }
        return;
      }
      if (submission.ok && nextForm) {
        setCompletedScopes((current) => [...current, form.name]);
        setLastCompletedSubjects(selectedSubjects.length);
        advancesToNextForm = true;
        setForm(nextForm);
        resetAnswersForForm();
        setResult(null);
        if (nextForm.scope === "DISCIPLINA") {
          try {
            setCourses(await fetchFormCourses(participantType, campaign));
            setStep("course");
          } catch (error) {
            setFormError(
              error instanceof Error
                ? error.message
                : "Não foi possível carregar os cursos.",
            );
            setStep("form");
          }
        } else setStep("questionnaire");
        return;
      }
      if (!submission.ok && submission.code === "FORMULARIO_JA_RESPONDIDO") {
        shouldShowConfirmation = false;
        setResult(null);
        setForm(null);
        setFormError("Você já respondeu esta versão do formulário nesta campanha. Escolha outro formulário ou uma nova versão publicada.");
        setStep("form");
        return;
      }
      if (!submission.ok && [400, 404, 409, 422].includes(submission.status)) {
        shouldShowConfirmation = false;
        setResult(null);
        setFormError(
          "Este formulário foi atualizado ou não está mais disponível. Atualize os formulários e tente novamente.",
        );
        setStep("form");
        return;
      }
      if (submission.ok) {
        setCompletedScopes((current) => [...current, form.name]);
        setLastCompletedSubjects(selectedSubjects.length);
      }
      setResult(submission);
    } catch {
      if (isStudentJourney) {
        shouldShowConfirmation = false;
        setJourneyError("Não foi possível verificar o envio. Consulte seu progresso antes de continuar.");
        return;
      }
      setResult({
        ok: false,
        status: 0,
        message: "Não foi possível enviar a avaliação.",
      });
    } finally {
      submissionInFlight.current = false;
      setIsSubmitting(false);
      if (!advancesToNextForm && shouldShowConfirmation) {
        clearAfterConfirmation();
        setStep("confirmation");
      }
    }
  };
  const newResponse = async () => {
    if (!participantType) {
      reset();
      return;
    }
    setResult(null);
    setFormError("");
    clearAfterConfirmation();
    setCompletedScopes([]);
    setLastCompletedSubjects(0);
    if (participantType === "aluno") {
      reset();
      return;
    }
    setForm(forms[0] ?? null);
    setStep("email");
  };
  const reset = () => {
    setCpf(""); setMatricula("");
    setStep("participant");
    setParticipantType(null);
    setAcceptedTerms(false);
    setForm(null);
    setForms([]);
    clearVerification();
    setCourse(null);
    setSelectedSubjectIds([]);
    setResponses({});
    setGeneralResponses(emptyResponses);
    setResult(null);
    setCompletedScopes([]);
    setLastCompletedSubjects(0);
    setCompletedStudentForms([]);
    setJourneyError("");
  };
  const updateSubject = (subject: Materia, value: Respostas) =>
    setResponses((current) => ({ ...current, [subject.id]: value }));

  return (
    <main className="grid flex-1 place-items-center py-6 sm:py-10">
      {journeyError ? <div role="alert" className="w-full max-w-2xl px-4 pb-6 text-center text-red-700">
        <p>{journeyError}</p>
        <button className="mt-3 rounded-lg bg-blue-700 px-4 py-3 font-bold text-white" disabled={checkingProgress} onClick={() => void refreshStudentJourney(step !== "participant" && step !== "form")}>Verificar progresso</button>
      </div> : null}
      {step === "participant" ? (
        <ParticipantStep
          busy={loadingForms || checkingProgress}
          cpf={cpf}
          matricula={matricula}
          onCpfChange={setCpf}
          onMatriculaChange={setMatricula}
          participantType={participantType}
          acceptedTerms={acceptedTerms}
          onParticipantTypeChange={selectParticipantType}
          onAcceptedTermsChange={setAcceptedTerms}
          onNext={() => void participantNext()}
          error={formError}
          onRetry={() => void participantNext()}
        />
      ) : null}
      {step === "form" ? (
        <FormSelectionStep
          forms={forms}
          sequential={isStudentJourney}
          completed={completedStudentForms}
          selected={form}
          loading={loadingForms || checkingProgress}
          error={formError}
          onSelect={value => { setForm(value); setFormError(""); }}
          onRetry={() => void (isStudentJourney ? refreshStudentJourney(false) : loadForms())}
          onBack={() => { setJourneyError(""); setStep("participant"); }}
          onNext={() => void startForm()}
        />
      ) : null}
      {step === "email" ? (
        <EmailVerificationStep
          emailUnavailable={emailUnavailable}
          onMasterKey={useMasterKey}
          loading={verificationLoading}
          error={verificationError}
          onBack={reset}
          onSubmit={requestCode}
        />
      ) : null}
      {step === "pin" ? (
        <PinVerificationStep
          key={verificationId ?? "no-verification"}
          loading={verificationLoading}
          error={verificationError}
          onBack={restartEmailVerification}
          onConfirm={confirmCode}
          onResend={resend}
        />
      ) : null}
      {step === "course" ? (
        <CourseStep
          cursos={courses}
          selectedCourseId={course?.id ?? null}
          onCourseSelect={(id) => {
            setCourse(courses.find((item) => item.id === id) ?? null);
            setSelectedSubjectIds([]);
          }}
          isLoading={false}
          error=""
          onRetry={() => undefined}
          onBack={() => setStep("form")}
          onNext={() => setStep("subjects")}
        />
      ) : null}
      {step === "subjects" && course ? (
        <SubjectStep
          materias={course.materias}
          selectedSubjectIds={selectedSubjectIds}
          onSubjectToggle={(id) =>
            setSelectedSubjectIds((current) =>
              current.includes(id)
                ? current.filter((value) => value !== id)
                : [...current, id],
            )
          }
          onBack={() => setStep("course")}
          onNext={() => {
            setSubjectIndex(0);
            setStep("questionnaire");
          }}
        />
      ) : null}
      {step === "questionnaire" && form ? (
        <QuestionnaireStep
          form={form}
          materia={form.scope === "DISCIPLINA" ? currentSubject : undefined}
          respostas={
            form.scope === "DISCIPLINA" && currentSubject
              ? (responses[currentSubject.id] ?? emptyResponses())
              : generalResponses
          }
          onChange={(value) =>
            currentSubject && form.scope === "DISCIPLINA"
              ? updateSubject(currentSubject, value)
              : setGeneralResponses(value)
          }
          onBack={() =>
            form.scope === "DISCIPLINA"
              ? subjectIndex
                ? setSubjectIndex(subjectIndex - 1)
                : setStep("subjects")
              : setStep("form")
          }
          onNext={() => {
            if (
              form.scope === "DISCIPLINA" &&
              subjectIndex < selectedSubjects.length - 1
            )
              setSubjectIndex(subjectIndex + 1);
            else void submit();
          }}
          isSubmitting={isSubmitting || checkingProgress}
          blocked={Boolean(journeyError)}
          isLast={
            form.scope !== "DISCIPLINA" ||
            subjectIndex === selectedSubjects.length - 1
          }
          isFinalJourney={!nextForm}
          journeyPosition={
            (isStaffJourney || isStudentJourney) && currentFormIndex >= 0
              ? currentFormIndex + 1
              : undefined
          }
          journeyTotal={forms.length}
        />
      ) : null}
      {step === "confirmation" ? (
        <ConfirmationStep
          submitResult={result}
          completedScopes={completedScopes}
          lastCompletedSubjects={lastCompletedSubjects}
          onNewResponse={() => void newResponse()}
        />
      ) : null}
    </main>
  );
}
