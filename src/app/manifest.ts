import type { MetadataRoute } from "next";
import { obterConfiguracao } from "@/lib/configuracao";

// Permite "instalar" o sistema na tela inicial do celular ou tablet (dinâmico: acompanha o nome do pet shop)
export const dynamic = "force-dynamic";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const config = await obterConfiguracao();
  return {
    name: config.nomePetShop,
    short_name: config.nomePetShop.slice(0, 12),
    description: "Agenda e cadastro de clientes e pets",
    start_url: "/agenda",
    display: "standalone",
    background_color: "#F4F6F8",
    theme_color: "#134E4A",
    lang: "pt-BR",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
