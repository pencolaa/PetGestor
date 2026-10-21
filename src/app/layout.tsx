import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { obterConfiguracao } from "@/lib/configuracao";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta" });

export async function generateMetadata(): Promise<Metadata> {
  const { nomePetShop } = await obterConfiguracao();
  return {
    title: { default: nomePetShop, template: `%s · ${nomePetShop}` },
    description: "Agenda e cadastro de clientes e pets",
    robots: { index: false, follow: false },
  };
}

export const viewport: Viewport = { themeColor: "#134E4A" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className={`${jakarta.variable} antialiased`}>{children}</body>
    </html>
  );
}
