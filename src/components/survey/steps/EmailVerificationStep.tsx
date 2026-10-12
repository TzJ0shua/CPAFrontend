import { useEffect, useState, type FormEvent } from "react";
import { fetchAccessConfiguration, type AccessConfiguration } from "../../../services/email-verification-api";
import { Actions } from "../ui/Actions";
import { Button } from "../ui/Button";

interface EmailProps {
  onBack: () => void;
  onSubmit: (email: string) => Promise<void>;
  onMasterKey: (key: string) => Promise<void>;
  emailUnavailable?: boolean;
  loading: boolean;
  error: string;
}
export function EmailVerificationStep({
  onBack,
  onSubmit,
  loading,
  error,
  onMasterKey,
  emailUnavailable = false,
}: EmailProps) {
  const [email, setEmail] = useState("");
  const [validationError, setValidationError] = useState("");
  const [masterKey, setMasterKey] = useState("");
  const [configuration, setConfiguration] = useState<AccessConfiguration | null>(null);
  const [checking, setChecking] = useState(true);
  const [configurationError, setConfigurationError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    fetchAccessConfiguration().then(value => {
      if (active) { setConfiguration(value); setChecking(false); }
    }).catch(() => {
      if (active) {
        setConfigurationError("Não foi possível verificar o serviço de email. Tente novamente ou use a chave mestra.");
        setChecking(false);
      }
    });
    return () => { active = false; };
  }, [attempt]);
  const emailAvailable = configuration?.emailDisponivel === true && !emailUnavailable;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!emailAvailable || loading || checking) return;
    const normalizedEmail = email.trim();
    if (!/^[A-Za-z._%+-]+@femass\.edu\.br$/i.test(normalizedEmail)) {
      setValidationError(
        "Informe seu e-mail institucional sem matrícula antes do @.",
      );
      return;
    }
    setValidationError("");
    void onSubmit(normalizedEmail);
  };
  return (
    <section className="survey-enter w-full max-w-xl px-4 sm:px-6">
      <div
        className="space-y-6 rounded-xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/10 sm:p-8"
      >
        <div className="space-y-3">
          <h2 className="text-2xl font-black sm:text-3xl">
            Confirme seu acesso
          </h2>
          <p className="leading-relaxed text-slate-600">
            Use seu e-mail institucional ou a chave mestra fornecida pela comissão.
          </p>
        </div>
        {checking ? <p role="status">Verificando serviço de email...</p> : null}
        {configurationError ? <div role="alert" className="space-y-2 text-sm text-amber-800">
          <p>{configurationError}</p>
          <button type="button" className="font-bold underline" disabled={loading || checking} onClick={() => {
            setChecking(true); setConfigurationError(""); setAttempt(value => value + 1);
          }}>Verificar novamente</button>
        </div> : null}
        <form className="space-y-3" onSubmit={submit}>
        <label className="grid gap-2 font-bold">
          E-mail institucional
          <input
            className="h-12 rounded-lg border border-slate-300 px-4 text-base font-normal read-only:bg-slate-100"
            type="email"
            autoComplete="email"
            required={emailAvailable}
            readOnly={!emailAvailable || checking || loading}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (validationError) setValidationError("");
            }}
            aria-invalid={validationError ? "true" : undefined}
            aria-describedby={!emailAvailable && !checking ? "email-service-status" : validationError ? "institutional-email-error" : undefined}
          />
        </label>
        {!emailAvailable && !checking ? <div id="email-service-status" className="text-sm text-amber-800">
          <p className="font-bold">Serviço de email indisponível</p>
          <p>Insira a chave mestra para prosseguir.</p>
        </div> : emailAvailable ? <><p className="text-sm text-slate-600">Enviaremos um código para confirmar o acesso. Não informaremos se o endereço existe.</p><p className="text-sm text-slate-600">Cada email pode responder uma vez por versão de formulário nesta campanha.</p></> : null}
        {validationError ? (
          <p
            id="institutional-email-error"
            role="alert"
            className="text-sm font-semibold text-red-600"
          >
            {validationError}
          </p>
        ) : null}
        <Button disabled={loading || checking || !emailAvailable} type="submit">
          {loading ? "Aguarde..." : "Enviar código"}
        </Button>
        </form>
        <form className="space-y-3 border-t border-slate-200 pt-5" onSubmit={e => {
          e.preventDefault();
          if (loading || checking || configuration?.chaveMestraDisponivel === false || !masterKey) return;
          setValidationError("");
          const key = masterKey;
          setMasterKey("");
          void onMasterKey(key);
        }}>
          <label className="grid gap-2 font-bold">Chave mestra
            <input type="password" autoComplete="off" required maxLength={1024} value={masterKey}
              readOnly={loading || checking || configuration?.chaveMestraDisponivel === false}
              className="h-12 rounded-lg border border-slate-300 px-4 text-base font-normal read-only:bg-slate-100"
              onChange={e => setMasterKey(e.target.value)} />
          </label>
          {configuration?.chaveMestraDisponivel === false ? <p className="text-sm text-amber-800">A chave mestra não foi configurada. Entre em contato com a comissão.</p> : null}
          <Button disabled={loading || checking || configuration?.chaveMestraDisponivel === false} type="submit">
            {loading ? "Aguarde..." : "Acessar com chave mestra"}
          </Button>
        </form>
        {error ? <p role="alert" className="text-sm font-semibold text-red-600">{error}</p> : null}
        <Actions>
          <Button variant="secondary" type="button" disabled={loading} onClick={onBack}>
            Voltar
          </Button>
        </Actions>
      </div>
    </section>
  );
}

interface PinProps {
  onBack: () => void;
  onConfirm: (pin: string) => Promise<void>;
  onResend: () => Promise<void>;
  loading: boolean;
  error: string;
}
export function PinVerificationStep({
  onBack,
  onConfirm,
  onResend,
  loading,
  error,
}: PinProps) {
  const [pin, setPin] = useState("");
  return (
    <section className="survey-enter w-full max-w-xl px-4 sm:px-6">
      <form
        className="space-y-6 rounded-xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/10 sm:p-8"
        onSubmit={(e) => {
          e.preventDefault();
          void onConfirm(pin.trim());
        }}
      >
        <div className="space-y-3">
          <h2 className="text-2xl font-black sm:text-3xl">
            Informe o código recebido
          </h2>
          <p className="leading-relaxed text-slate-600">
            O código tem prazo de validade. Ao solicitar um novo código, o anterior deixa de funcionar.
          </p>
        </div>
        <label className="grid gap-2 font-bold">
          Código
          <input
            className="h-12 rounded-lg border border-slate-300 px-4 text-base font-normal tracking-widest"
            autoComplete="one-time-code"
            required
            value={pin}
            onChange={(e) => setPin(e.target.value)}
          />
        </label>
        {error ? (
          <p className="text-sm font-semibold text-red-600">{error}</p>
        ) : null}
        <Actions>
          <Button variant="secondary" type="button" onClick={onBack}>
            Alterar e-mail
          </Button>
          <Button disabled={loading} type="submit">
            {loading ? "Confirmando..." : "Confirmar código"}
          </Button>
        </Actions>
        <button
          className="text-sm font-bold text-blue-700"
          disabled={loading}
          type="button"
          onClick={() => void onResend()}
        >
          Reenviar código
        </button>
      </form>
    </section>
  );
}
