import { cookies } from "next/headers";

export const DISPLAY_CURRENCY_COOKIE = "bison_display_currency";
export type DisplayCurrency = "USD" | "KES";

export async function getDisplayCurrency(): Promise<DisplayCurrency> {
  const store = await cookies();
  const value = store.get(DISPLAY_CURRENCY_COOKIE)?.value;
  return value === "KES" ? "KES" : "USD";
}
