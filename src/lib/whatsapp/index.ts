/**
 * Camada de serviço de WhatsApp.
 *
 * Hoje o envio é manual: geramos um link wa.me com a mensagem pronta e o atendente
 * clica para abrir o WhatsApp. Para integrar uma API oficial (Meta Cloud API, Z-API,
 * Twilio...), crie outro provedor que implemente `ProvedorWhatsApp` com `modo: "api"`
 * e troque o retorno de `provedorWhatsApp()`. As telas só usam `prepararEnvio()`.
 */
import { apenasDigitos } from "../formato";
import { linkWaMe } from "./link";

export { linkWaMe } from "./link";
export * from "./mensagens";

export type EnvioWhatsApp =
  | { modo: "link"; url: string } // o navegador abre o link
  | { modo: "api"; enviado: boolean; erro?: string }; // enviado pelo servidor

export interface ProvedorWhatsApp {
  enviar(telefone: string, mensagem: string): Promise<EnvioWhatsApp>;
}

class ProvedorLink implements ProvedorWhatsApp {
  async enviar(telefone: string, mensagem: string): Promise<EnvioWhatsApp> {
    return { modo: "link", url: linkWaMe(telefone, mensagem) };
  }
}

export function provedorWhatsApp(): ProvedorWhatsApp {
  // Ponto único de troca do provedor (ex.: if (process.env.WHATSAPP_API_TOKEN) return new ProvedorMetaCloud()).
  return new ProvedorLink();
}

/** Normaliza para o formato internacional brasileiro (55 + DDD + número) */
export function telefoneInternacional(telefone: string): string {
  const d = apenasDigitos(telefone);
  return d.startsWith("55") && d.length >= 12 ? d : `55${d}`;
}
