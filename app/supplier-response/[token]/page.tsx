import type { Metadata } from "next";
import { SupplierResponseView } from "@/components/supplier-response-view";

export const metadata: Metadata = {
  title: "Supplier request",
  robots: { index: false, follow: false },
};

export default async function SupplierResponsePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <SupplierResponseView token={token} />;
}
