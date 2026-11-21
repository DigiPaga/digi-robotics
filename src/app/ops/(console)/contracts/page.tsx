import { ContractsSection } from "@/components/ops/console/ContractsSection";
import { hasOpsSession } from "@/lib/ops/page-auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Contracts" };

export default async function Page() {
  // The layout gates the first render. A client-side navigation renders only
  // this page, so the session is checked here as well.
  if (!(await hasOpsSession())) return null;
  return <ContractsSection />;
}
