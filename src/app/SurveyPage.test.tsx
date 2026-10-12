import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SurveyPage } from "./SurveyPage";
import { fetchCampaignPublicState } from "../services/campaign-state-api";

vi.mock("../services/campaign-state-api", () => ({
  fetchCampaignPublicState: vi.fn(),
}));

vi.mock("../components/survey/SurveyForm", () => ({
  SurveyForm: ({ campaign }: { campaign: string }) => <div data-testid="survey-form">{campaign}</div>,
}));

describe("SurveyPage", () => {
  beforeEach(() => {
    vi.mocked(fetchCampaignPublicState).mockResolvedValue({
      campaign: "cpa-2026",
      state: "ABERTA",
      isOpen: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    cleanup();
  });

  it("renders the survey when the campaign is open", async () => {
    render(<SurveyPage />);

    expect(
      await screen.findByTestId("survey-form"),
    ).not.toBeNull();
  });

  it("shows an unavailable message when the campaign is closed", async () => {
    vi.mocked(fetchCampaignPublicState).mockResolvedValueOnce({
      campaign: "cpa-2026",
      state: "ENCERRADA",
      isOpen: false,
      unavailableMessage: "A campanha está encerrada para respostas.",
    });

    render(<SurveyPage />);

    expect(
      await screen.findByRole("heading", { name: "Pesquisa indisponível" }),
    ).not.toBeNull();
    expect(
      screen.getByText("A campanha está encerrada para respostas."),
    ).not.toBeNull();
    expect(screen.queryByTestId("survey-form")).toBeNull();
  });

  it("keeps the survey hidden when campaign state lookup fails", async () => {
    vi.mocked(fetchCampaignPublicState).mockRejectedValueOnce(
      new Error("Serviço temporariamente indisponível"),
    );

    render(<SurveyPage />);

    expect(
      await screen.findByText("Serviço temporariamente indisponível"),
    ).not.toBeNull();
    expect(screen.getByRole("button", { name: "Tentar novamente" })).not.toBeNull();
    expect(screen.queryByTestId("survey-form")).toBeNull();

    await waitFor(() => expect(fetchCampaignPublicState).toHaveBeenCalledTimes(1));
  });

  it("blocks expired campaigns on the periodic check and keeps the original campaign", async () => {
    vi.useFakeTimers();
    vi.mocked(fetchCampaignPublicState).mockResolvedValueOnce({ campaign: "outubro", state: "ABERTA", isOpen: true });
    render(<SurveyPage />);
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(screen.getByTestId("survey-form").textContent).toBe("outubro");
    vi.mocked(fetchCampaignPublicState).mockResolvedValue({ campaign: "outubro", state: "ABERTA", isOpen: false, unavailableMessage: "Período terminado." });
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(fetchCampaignPublicState).toHaveBeenLastCalledWith("outubro");
    expect(screen.queryByTestId("survey-form")).toBeNull();
    expect(screen.getByText("Período terminado.")).not.toBeNull();
    await act(async () => { fireEvent.focus(window); });
    expect(fetchCampaignPublicState).toHaveBeenLastCalledWith("outubro");
    expect(fetchCampaignPublicState).toHaveBeenCalledTimes(3);
  });

  it("discovers a campaign after an initially unavailable period when returning to the tab", async () => {
    vi.mocked(fetchCampaignPublicState).mockResolvedValueOnce({ campaign: null, state: null, isOpen: false });
    render(<SurveyPage />);
    await screen.findByRole("heading", { name: "Pesquisa indisponível" });
    vi.mocked(fetchCampaignPublicState).mockResolvedValue({ campaign: "novembro", state: "ABERTA", isOpen: true });
    fireEvent(document, new Event("visibilitychange"));
    expect((await screen.findByTestId("survey-form")).textContent).toBe("novembro");
    expect(fetchCampaignPublicState).toHaveBeenLastCalledWith(undefined);
  });
});
