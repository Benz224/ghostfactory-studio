import type { Metadata } from "next";
import { AppSidebar } from "@/components/AppSidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "GHOSTFACTORY Studio",
  description: "Local-first AI creator studio for GHOSTFACTORY"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>
        <div className="min-h-screen bg-[#F8FAFC] lg:grid lg:grid-cols-[268px_1fr]">
          <AppSidebar />
          <main className="min-w-0 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
