import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { getAgentDemoChains } from "@/lib/agent-demo-chains";
import { ChainSwitch } from "./ChainSwitch";

describe("ChainSwitch", () => {
  it("switches to Robinhood Chain Testnet when its backend is configured", async () => {
    const onChange = vi.fn();
    render(<ChainSwitch chains={getAgentDemoChains({ robinhood: "https://x402-rh.digirobotics.xyz" })} value="arbitrum-sepolia" onChange={onChange} />);
    expect(screen.getByRole("group", { name: "Chain" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Arbitrum Sepolia/ })).toBeChecked();
    await userEvent.click(screen.getByRole("radio", { name: /Robinhood Chain Testnet/ }));
    expect(onChange).toHaveBeenCalledWith("robinhood-testnet");
  });

  it("shows Robinhood Chain Testnet as unavailable when it has no backend", async () => {
    const onChange = vi.fn();
    render(<ChainSwitch chains={getAgentDemoChains({})} value="arbitrum-sepolia" onChange={onChange} />);
    const robinhood = screen.getByRole("radio", { name: "Robinhood Chain Testnet" });
    expect(robinhood).toBeDisabled();
    expect(robinhood).toHaveAccessibleDescription("Not configured");
    await userEvent.click(robinhood);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("locks every option while a run is in progress", () => {
    render(<ChainSwitch chains={getAgentDemoChains({ robinhood: "https://x402-rh.digirobotics.xyz" })} value="arbitrum-sepolia" onChange={vi.fn()} locked />);
    for (const radio of screen.getAllByRole("radio")) expect(radio).toBeDisabled();
    expect(screen.getByRole("group", { name: "Chain" })).toHaveAccessibleDescription("Chain is locked while a run is in progress.");
  });
});
