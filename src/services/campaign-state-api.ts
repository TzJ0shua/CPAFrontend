import { buildApiEndpoint } from "../config/api";
import { fetchWithRetry } from "../utils/fetch-with-retry";


interface CampaignStateApiResponse {
  campanha: string | null;
  estado: CampaignState | null;
  dataInicio?: string | null;
  dataFim?: string | null;
  disponivelParaResposta: boolean;
  mensagem?: string | null;
}

export type CampaignState = "RASCUNHO" | "APROVADA" | "ABERTA" | "ENCERRADA";

export interface CampaignPublicState {
  campaign: string | null;
  state: CampaignState | null;
  startDate?: string | null;
  endDate?: string | null;
  isOpen: boolean;
  unavailableMessage?: string;
}

async function responseMessage(response: Response) {
  const text = await response.text();
  try {
    const body = JSON.parse(text) as { error?: string; message?: string };
    return body.error ?? body.message ?? text;
  } catch {
    return text;
  }
}

export async function fetchCampaignPublicState(campaign?: string): Promise<CampaignPublicState> {
  const response = await fetchWithRetry(buildApiEndpoint(`/campanhas/${campaign ? encodeURIComponent(campaign) : "atual"}/disponibilidade`), {
    retries: 1,
  });
  if (!response.ok) {
    throw new Error(
      (await responseMessage(response)) ||
        "Não foi possível consultar o estado da campanha.",
    );
  }

  const body = (await response.json()) as CampaignStateApiResponse;
  if (typeof body.disponivelParaResposta !== "boolean" || (body.disponivelParaResposta && (typeof body.campanha !== "string" || !body.campanha))) {
    throw new Error("A resposta de disponibilidade da campanha é inválida.");
  }

  return {
    campaign: body.campanha,
    state: body.estado,
    startDate: body.dataInicio,
    endDate: body.dataFim,
    isOpen: body.disponivelParaResposta,
    unavailableMessage: body.mensagem?.trim() || undefined,
  };
}
