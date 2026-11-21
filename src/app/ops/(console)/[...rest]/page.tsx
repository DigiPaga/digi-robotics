import { notFound } from "next/navigation";

/** Any other /ops path renders the console's own not-found screen, inside the gated frame. */
export default function Page() {
  notFound();
}
