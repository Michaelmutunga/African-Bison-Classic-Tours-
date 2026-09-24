import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "African Bison Classic Tours | Kenya & Tanzania Safaris",
  description:
    "Premium East African safari planning and reservation platform. Kenya, Tanzania, Maasai Mara, Serengeti, Amboseli and beyond.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header
          style={{ borderBottom: "1px solid #e4d9c4", padding: "16px 24px" }}
        >
          <p style={{ fontSize: 12, letterSpacing: "0.2em" }}>
            AFRICAN BISON CLASSIC TOURS
          </p>
        </header>
        <main>{children}</main>
        <footer
          style={{ borderTop: "1px solid #e4d9c4", padding: "16px 24px" }}
        >
          <p style={{ fontSize: 12 }}>Nairobi, Kenya · Phase 0 foundation</p>
        </footer>
      </body>
    </html>
  );
}
