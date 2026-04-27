import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Cairo } from "next/font/google";
import "./globals.css";
import { LOCALE_COOKIE } from "@/lib/ui/prefs";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const jar = await cookies();
  const en = jar.get(LOCALE_COOKIE)?.value === "en";
  return {
    title: en ? "AQWAD Pro | Attendance & time" : "أكواد برو | منصة الحضور والانصراف",
    description: en
      ? "Attendance, devices, and payroll-ready reporting."
      : "منصة متكاملة للحضور والانصراف مع دعم أجهزة ZK",
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jar = await cookies();
  const locale = jar.get(LOCALE_COOKIE)?.value === "en" ? "en" : "ar";
  const dir = locale === "en" ? "ltr" : "rtl";

  return (
    <html lang={locale} dir={dir} className={`${cairo.variable} h-full`} suppressHydrationWarning>
      <body className="min-h-full bg-slate-50 font-sans text-slate-900 antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
