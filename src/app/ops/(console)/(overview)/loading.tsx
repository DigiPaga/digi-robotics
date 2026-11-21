import { OverviewSkeleton } from "@/components/ops/console/skeletons";

// Lives in the (overview) group, not at the console root: a loading boundary above
// [...rest] would stream a 200 before its notFound() runs, so unknown sections never got a 404.
export default function Loading() {
  return <OverviewSkeleton />;
}
