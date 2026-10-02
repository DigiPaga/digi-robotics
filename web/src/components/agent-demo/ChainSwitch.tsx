import { isAgentDemoChainAvailable, type AgentDemoChain, type AgentDemoChainId } from "@/lib/agent-demo-chains";

/**
 * Native radio group, so arrow keys, focus and the checked state come from the browser. A chain
 * without a configured backend stays listed but disabled, with the reason as its description.
 */
export function ChainSwitch({ chains, value, onChange, locked = false }: { chains: readonly AgentDemoChain[]; value: AgentDemoChainId; onChange: (chain: AgentDemoChainId) => void; locked?: boolean }) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-5" aria-describedby={locked ? "agent-demo-chain-locked" : undefined}>
      <legend className="sr-only">Chain</legend>
      <span aria-hidden="true" className="font-mono text-[10px] uppercase tracking-[.14em] text-white/40">Chain</span>
      <div className="inline-flex w-full flex-wrap gap-1 rounded-full border border-white/10 bg-white/[.025] p-1 sm:w-auto">
        {chains.map((chain) => {
          const available = isAgentDemoChainAvailable(chain);
          const descriptionId = `agent-demo-chain-${chain.id}-note`;
          return (
            <label key={chain.id} className={`relative flex-1 sm:flex-none ${available && !locked ? "cursor-pointer" : "cursor-not-allowed"}`}>
              <input
                type="radio"
                name="agent-demo-chain"
                value={chain.id}
                checked={chain.id === value}
                disabled={!available || locked}
                onChange={() => onChange(chain.id)}
                aria-describedby={available ? undefined : descriptionId}
                className="peer sr-only"
              />
              <span className="flex min-h-11 flex-col items-center justify-center rounded-full px-4 py-1.5 text-center font-mono text-[10px] uppercase tracking-[.1em] text-white/65 transition peer-checked:bg-[var(--primary)] peer-checked:font-semibold peer-checked:text-[#10140e] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--primary)] peer-enabled:hover:text-white peer-enabled:peer-checked:hover:text-[#10140e] peer-disabled:text-white/30">
                {chain.name}
                {available ? null : <span id={descriptionId} aria-hidden="true" className="text-[9px] normal-case tracking-normal text-white/35">Not configured</span>}
              </span>
            </label>
          );
        })}
      </div>
      {locked ? <p id="agent-demo-chain-locked" className="text-xs text-white/40">Chain is locked while a run is in progress.</p> : null}
    </fieldset>
  );
}
