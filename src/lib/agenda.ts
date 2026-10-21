import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { obterConfiguracao } from "./configuracao";
import { dataHora, fimDoDia, gerarHorarios, inicioDoDia } from "./datas";

export const SLOT_MIN = 30;

export type Expediente = { abertura: string; fechamento: string; horarios: string[] };

/** Horário de funcionamento configurado pelo pet shop, em blocos de 30 min */
export async function obterExpediente(): Promise<Expediente> {
  const { abertura, fechamento } = await obterConfiguracao();
  return { abertura, fechamento, horarios: gerarHorarios(abertura, fechamento) };
}

/** Agendamentos que ocupam a agenda (cancelados liberam o horário) */
export const OCUPA_AGENDA: Prisma.AgendamentoWhereInput = { status: { not: "CANCELADO" } };

export async function temConflito(profissionalId: string, inicio: Date, fim: Date, ignorarId?: string) {
  const conflito = await prisma.agendamento.findFirst({
    where: {
      ...OCUPA_AGENDA,
      profissionalId,
      inicio: { lt: fim },
      fim: { gt: inicio },
      ...(ignorarId ? { id: { not: ignorarId } } : {}),
    },
    select: { id: true },
  });
  return conflito !== null;
}

/**
 * Horários de início livres para o profissional no dia, considerando a duração do serviço.
 * `ignorarId` desconsidera o próprio agendamento (usado ao remarcar).
 */
export async function calcularHorariosLivres(profissionalId: string, dia: string, duracaoMin: number, ignorarId?: string, agora = new Date()) {
  const { horarios, fechamento } = await obterExpediente();
  const ocupados = await prisma.agendamento.findMany({
    where: {
      ...OCUPA_AGENDA,
      profissionalId,
      inicio: { lt: fimDoDia(dia) },
      fim: { gt: inicioDoDia(dia) },
      ...(ignorarId ? { id: { not: ignorarId } } : {}),
    },
    select: { inicio: true, fim: true },
  });
  const limite = dataHora(dia, fechamento).getTime();
  return horarios.filter((h) => {
    const ini = dataHora(dia, h).getTime();
    const fim = ini + duracaoMin * 60000;
    if (fim > limite || ini < agora.getTime()) return false;
    return !ocupados.some((o) => o.inicio.getTime() < fim && o.fim.getTime() > ini);
  });
}
