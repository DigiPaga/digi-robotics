"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { agentDemoChains, resolveAgentDemoChain, type AgentDemoChainId } from "@/lib/agent-demo-chains";
import { AgentDemoConsole } from "./AgentDemoConsole";
import { ChainSwitch } from "./ChainSwitch";

const CHAIN_PARAM = "chain";

const subscribeToNothing = () => () => undefined;
const readChainParam = () => new URLSearchParams(window.location.search).get(CHAIN_PARAM);
const noChainParamOnServer = () => null;

/** The chain switch plus the console of the selected chain. `?chain=robinhood-testnet` preselects a chain. */
export function AgentDemo() {
  const linkedChain = useSyncExternalStore(subscribeToNothing, readChainParam, noChainParamOnServer);
  const [picked, setPicked] = useState<AgentDemoChainId>();
  const [active, setActive] = useState(false);
  const chain = resolveAgentDemoChain(agentDemoChains, picked ?? linkedChain);

  const select = useCallback((id: AgentDemoChainId) => {
    setPicked(id);
    const url = new URL(window.location.href);
    url.searchParams.set(CHAIN_PARAM, id);
    window.history.replaceState(window.history.state, "", url);
  }, []);

  return (
    <>
      <div className="mx-auto mb-5 w-full max-w-[1500px] px-5 sm:px-8 lg:px-12">
        <ChainSwitch chains={agentDemoChains} value={chain.id} onChange={select} locked={active} />
      </div>
      <AgentDemoConsole key={chain.id} chain={chain} onActiveChange={setActive} />
    </>
  );
}
