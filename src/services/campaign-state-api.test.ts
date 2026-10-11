import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchCampaignPublicState } from "./campaign-state-api";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchCampaignPublicState", () => {
  it("queries the current campaign and revalidates an explicit campaign", async () => {
    const fetch = vi.fn().mockImplementation(async () => new Response(JSON.stringify({
      campanha: "outubro", estado: "ABERTA", dataInicio: "2026-10-01", dataFim: "2026-10-31", disponivelParaResposta: true,
    })));
    vi.stubGlobal("fetch", fetch);
    const current = await fetchCampaignPublicState();
    expect(current.campaign).toBe("outubro");
    expect(current.startDate).toBe("2026-10-01");
    expect(current.endDate).toBe("2026-10-31");
    expect(String(fetch.mock.calls[0][0])).toContain("/campanhas/atual/disponibilidade");
    await fetchCampaignPublicState("outubro");
    expect(String(fetch.mock.calls[1][0])).toContain("/campanhas/outubro/disponibilidade");
  });

  it("accepts a successful lookup without an available campaign", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      campanha: null, estado: null, dataInicio: null, dataFim: null, disponivelParaResposta: false,
      mensagem: "Não há campanha disponível para respostas no momento.",
    }))));
    expect(await fetchCampaignPublicState()).toMatchObject({ campaign: null, state: null, isOpen: false });
  });
  it("uses backend availability as the source of truth", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            campanha: "cpa-2026",
            estado: "ABERTA",
            disponivelParaResposta: true,
            mensagem: "Campanha disponível para respostas.",
          }),
          { status: 200 },
        ),
      ),
    );

    await expect(fetchCampaignPublicState()).resolves.toEqual({
      campaign: "cpa-2026",
      state: "ABERTA",
      isOpen: true,
      unavailableMessage: "Campanha disponível para respostas.",
    });
  });

  it("maps unavailable message from the backend", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            campanha: "cpa-2026",
            estado: "ENCERRADA",
            disponivelParaResposta: false,
            mensagem: "A campanha está encerrada para respostas no momento.",
          }),
          { status: 200 },
        ),
      ),
    );

    await expect(fetchCampaignPublicState()).resolves.toEqual({
      campaign: "cpa-2026",
      state: "ENCERRADA",
      isOpen: false,
      unavailableMessage:
        "A campanha está encerrada para respostas no momento.",
    });
  });

  it("rejects responses without backend availability", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            campanha: "cpa-2026",
            estado: "ABERTA",
          }),
          { status: 200 },
        ),
      ),
    );

    await expect(fetchCampaignPublicState()).rejects.toThrow(
      "A resposta de disponibilidade da campanha é inválida.",
    );
  });

  it("surfaces backend failure messages", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: "Falha ao consultar estado" }), {
          status: 503,
        }),
      ),
    );

    await expect(fetchCampaignPublicState()).rejects.toThrow(
      "Falha ao consultar estado",
    );
  });
});
