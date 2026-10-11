import { redirect } from "next/navigation";

/**
 * Services is a retired legacy entrypoint. Keep the URL compatible while
 * making Products the only canonical commercial catalog.
 */
export default function ServicesPage() {
  redirect("/products");
}
