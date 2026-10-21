import { prisma } from "./prisma";

// Janela e limites de falhas de login
const JANELA_MIN = 15;
const MAX_POR_EMAIL = 5;
const MAX_POR_IP = 20;

export const ERRO_BLOQUEADO = "BLOQUEADO";

function desde() {
  return new Date(Date.now() - JANELA_MIN * 60_000);
}

/** IP do cliente atrás do proxy da Vercel (primeiro da lista x-forwarded-for) */
export function ipDaRequisicao(headers: Record<string, string | string[] | undefined> | undefined): string {
  const bruto = headers?.["x-forwarded-for"] ?? headers?.["x-real-ip"];
  const valor = Array.isArray(bruto) ? bruto[0] : bruto;
  return valor?.split(",")[0]?.trim() || "desconhecido";
}

export async function estaBloqueado(email: string, ip: string): Promise<boolean> {
  const [porEmail, porIp] = await Promise.all([
    prisma.tentativaLogin.count({ where: { chave: `email:${email}`, criadoEm: { gte: desde() } } }),
    prisma.tentativaLogin.count({ where: { chave: `ip:${ip}`, criadoEm: { gte: desde() } } }),
  ]);
  return porEmail >= MAX_POR_EMAIL || porIp >= MAX_POR_IP;
}

export async function registrarFalha(email: string, ip: string) {
  await prisma.tentativaLogin.createMany({ data: [{ chave: `email:${email}` }, { chave: `ip:${ip}` }] });
  // Limpeza oportunista dos registros antigos
  await prisma.tentativaLogin.deleteMany({ where: { criadoEm: { lt: new Date(Date.now() - 24 * 60 * 60_000) } } });
}

export async function limparFalhas(email: string) {
  await prisma.tentativaLogin.deleteMany({ where: { chave: `email:${email}` } });
}
