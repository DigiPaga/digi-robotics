"use client";

import { buttonClass } from "@/components/ops/console/primitives";
import { OpsProblem } from "@/components/ops/OpsPanels";

/** Deliberately generic: the error itself is never shown. */
export default function OpsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <OpsProblem title="This section failed to render" action={<button type="button" onClick={reset} className={`!h-9 ${buttonClass}`}>Try again</button>}>
      Something went wrong while drawing this section. Your session is not affected. Try again, or pick another section.
    </OpsProblem>
  );
}
