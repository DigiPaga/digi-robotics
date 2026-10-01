import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearOpsDataCache, prefetchOpsData, revalidateOpsData, setOpsUnauthorizedHandler, useOpsData } from "./use-ops-data";

const URL = "/api/ops/payments";

function respond(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  clearOpsDataCache();
  setOpsUnauthorizedHandler(null);
  fetchMock = vi.fn(async () => respond({ n: 1 }));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function Probe({ url = URL }: { url?: string }) {
  const { data, loading, validating, error } = useOpsData<{ n: number }>(url);
  return <p>{loading ? "loading" : `n=${data?.n ?? "none"}`}{validating ? " validating" : ""}{error ? ` error:${error}` : ""}</p>;
}

describe("useOpsData", () => {
  it("starts loading, then shows the data", async () => {
    render(<Probe />);
    expect(screen.getByText("loading validating")).toBeInTheDocument();
    expect(await screen.findByText("n=1")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(URL, expect.objectContaining({ cache: "no-store", credentials: "same-origin" }));
  });

  it("paints a revisited section from cache on the first render, with no request while it is fresh", async () => {
    const first = render(<Probe />);
    await screen.findByText("n=1");
    first.unmount();
    render(<Probe />);
    // Synchronous: no loading state on remount.
    expect(screen.getByText("n=1")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("revalidates stale cached data in the background while still showing it", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const first = render(<Probe />);
    await screen.findByText("n=1");
    first.unmount();
    vi.advanceTimersByTime(5_000);
    let release!: (response: Response) => void;
    fetchMock.mockImplementationOnce(() => new Promise<Response>((resolve) => { release = resolve; }));
    render(<Probe />);
    expect(screen.getByText("n=1 validating")).toBeInTheDocument();
    await act(async () => release(respond({ n: 2 })));
    expect(await screen.findByText("n=2")).toBeInTheDocument();
  });

  it("shares one request between two components on the same endpoint", async () => {
    render(<><Probe /><Probe /></>);
    expect(await screen.findAllByText("n=1")).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("keeps the last data when a reload fails and reports a generic error", async () => {
    const { result } = renderHook(() => useOpsData<{ n: number }>(URL));
    await waitFor(() => expect(result.current.data).toEqual({ n: 1 }));
    fetchMock.mockResolvedValueOnce(respond({ message: "upstream detail" }, 502));
    await act(() => result.current.refresh());
    expect(result.current).toMatchObject({ data: { n: 1 }, error: "Could not load this section.", loading: false, validating: false });
  });

  it("reports an error instead of loading forever when the first load fails", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));
    const { result } = renderHook(() => useOpsData<{ n: number }>(URL));
    await waitFor(() => expect(result.current.error).toBe("Could not load this section."));
    expect(result.current).toMatchObject({ data: undefined, loading: false });
  });

  it("refresh asks the server to skip its cache", async () => {
    const { result } = renderHook(() => useOpsData<{ n: number }>(URL));
    await waitFor(() => expect(result.current.data).toBeDefined());
    fetchMock.mockResolvedValueOnce(respond({ n: 5 }));
    await act(() => result.current.refresh());
    expect(fetchMock).toHaveBeenLastCalledWith(`${URL}?fresh=1`, expect.anything());
    expect(result.current.data).toEqual({ n: 5 });
    expect(result.current.updatedAt).toBeTypeOf("number");
  });

  it("on 401 empties the whole cache and calls the unauthorized handler", async () => {
    const handler = vi.fn();
    setOpsUnauthorizedHandler(handler);
    await revalidateOpsData("/api/ops/infra");
    const { result } = renderHook(() => useOpsData<{ n: number }>(URL));
    await waitFor(() => expect(result.current.data).toBeDefined());
    fetchMock.mockResolvedValueOnce(respond({ message: "Sign in required." }, 401));
    await act(() => result.current.refresh());
    expect(handler).toHaveBeenCalledTimes(1);
    expect(result.current.data).toBeUndefined();
    const other = renderHook(() => useOpsData<{ n: number }>("/api/ops/infra"));
    expect(other.result.current.data).toBeUndefined();
  });

  it("revalidates on the given interval while visible", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { result } = renderHook(() => useOpsData<{ n: number }>(URL, { refreshInterval: 30_000 }));
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await act(async () => { vi.advanceTimersByTime(30_000); });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });

  it("revalidates stale data when the tab regains focus", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { result } = renderHook(() => useOpsData<{ n: number }>(URL));
    await waitFor(() => expect(result.current.data).toBeDefined());
    await act(async () => { window.dispatchEvent(new Event("focus")); });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(11_000);
    await act(async () => { window.dispatchEvent(new Event("focus")); });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });
});

describe("prefetchOpsData", () => {
  it("warms the cache so the section paints without a loading state", async () => {
    await prefetchOpsData(URL);
    render(<Probe />);
    expect(screen.getByText("n=1")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does nothing when the data is already cached", async () => {
    await prefetchOpsData(URL);
    await prefetchOpsData(URL);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
