import Link from "next/link";
import { primaryButtonClass } from "@/components/ops/console/primitives";
import { OpsProblem } from "@/components/ops/OpsPanels";

export default function NotFound() {
  return (
    <OpsProblem title="No such section" action={<Link href="/ops" className={`!h-9 ${primaryButtonClass}`}>Go to Overview</Link>}>
      This address is not part of the ops console. Use the navigation, or press Ctrl K to jump to a section.
    </OpsProblem>
  );
}
