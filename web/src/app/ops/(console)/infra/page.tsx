import { InfraSection } from "@/components/ops/console/InfraSection";
import { hasOpsSession } from "@/lib/ops/page-auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Infra" };

export default async function Page() {
  // The layout gates the first render. A client-side navigation renders only
  // this page, so the session is checked here as well.
  if (!(await hasOpsSession())) return null;
  return <InfraSection />;
}
