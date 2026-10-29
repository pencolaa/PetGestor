import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { obterExpediente, OCUPA_AGENDA } from "./agenda";
import { dataHora, diffDias, hojeISO, somarDias } from "./datas";

/** Quantas semanas à frente os horários fixos ficam marcados na agenda */
export const SEMANAS_A_FRENTE = 8;

const DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

/** "Toda quinta, 09:00" / "A cada 2 semanas, quinta, 09:00" */
export function descreverHorarioFixo(h: { primeiroDia: string; hora: string; intervaloSemanas: number }): string {
  const dia = DIAS[new Date(`${h.primeiroDia}T12:00:00Z`).getUTCDay()];
  return h.intervaloSemanas === 1 ? `Toda ${dia}, ${h.hora}` : `A cada ${h.intervaloSemanas} semanas, ${dia}, ${h.hora}`;
}

/** Dias do horário fixo entre `de` e `ate` (inclusive), respeitando o ritmo a partir do primeiro dia */
export function diasDoHorarioFixo(primeiroDia: string, intervaloSemanas: number, de: string, ate: string): string[] {
  const passo = 7 * intervaloSemanas;
  const pulos = Math.max(0, Math.ceil(diffDias(de, primeiroDia) / passo));
  const dias: string[] = [];
  for (let d = somarDias(primeiroDia, pulos * passo); d <= ate; d = somarDias(d, passo)) dias.push(d);
  return dias;
}

/**
 * Cria os agendamentos dos horários fixos ativos até SEMANAS_A_FRENTE semanas à frente.
 * Datas em que o profissional já está ocupado (ou fora do expediente) são puladas.
 * Pode ser chamada a qualquer momento: cada horário só avança a partir de onde parou.
 */
export async function gerarHorariosFixos(somenteId?: string, tx?: Prisma.TransactionClient): Promise<{ criados: number; pulados: string[] }> {
  const hoje = hojeISO();
  const ate = somarDias(hoje, SEMANAS_A_FRENTE * 7);
  const db = tx ?? prisma;
  const pendentes = await db.horarioFixo.findMany({
    where: { ativo: true, geradoAte: { lt: ate }, ...(somenteId ? { id: somenteId } : {}) },
    select: { id: true },
  });
  const resultado = { criados: 0, pulados: [] as string[] };
  if (pendentes.length === 0) return resultado;
  const { abertura, fechamento } = await obterExpediente();

  const gerar = async (t: Prisma.TransactionClient, id: string) => {
    // Trava o horário fixo: duas telas abertas ao mesmo tempo não duplicam agendamentos
    await t.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${id}))`;
    const hf = await t.horarioFixo.findUnique({ where: { id }, include: { servico: true, profissional: true } });
    if (!hf?.ativo || hf.geradoAte >= ate) return;
    // Serviço ou profissional desativado: espera, sem avançar (volta a marcar se reativarem)
    if (!hf.servico.ativo || !hf.profissional.ativo) return;
    await t.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${hf.profissionalId}))`;

    const de = hf.geradoAte >= hoje ? somarDias(hf.geradoAte, 1) : hoje;
    for (const dia of diasDoHorarioFixo(hf.primeiroDia, hf.intervaloSemanas, de, ate)) {
      const inicio = dataHora(dia, hf.hora);
      const fim = new Date(inicio.getTime() + hf.servico.duracaoMin * 60000);
      const foraDoExpediente = hf.hora < abertura || fim > dataHora(dia, fechamento) || inicio < new Date();
      const conflito =
        !foraDoExpediente &&
        (await t.agendamento.findFirst({
          where: { ...OCUPA_AGENDA, profissionalId: hf.profissionalId, inicio: { lt: fim }, fim: { gt: inicio } },
          select: { id: true },
        }));
      if (foraDoExpediente || conflito) {
        resultado.pulados.push(dia);
        continue;
      }
      await t.agendamento.create({
        data: {
          petId: hf.petId, servicoId: hf.servicoId, profissionalId: hf.profissionalId, inicio, fim,
          status: "AGUARDANDO", valorEstimado: hf.valorEstimado, observacoes: hf.observacoes, horarioFixoId: hf.id,
        },
      });
      resultado.criados++;
    }
    await t.horarioFixo.update({ where: { id: hf.id }, data: { geradoAte: ate } });
  };

  for (const { id } of pendentes) {
    if (tx) await gerar(tx, id);
    else await prisma.$transaction((t) => gerar(t, id));
  }
  return resultado;
}
