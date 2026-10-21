import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { dataHora, fimDoDia, gerarHorarios, inicioDoDia } from "./datas";

export const ABERTURA = "08:00";
export const FECHAMENTO = "18:00";
export const SLOT_MIN = 30;

export const HORARIOS = gerarHorarios(ABERTURA, FECHAMENTO);

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

/** Horários de início livres para o profissional no dia, considerando a duração do serviço */
export async function calcularHorariosLivres(profissionalId: string, dia: string, duracaoMin: number, agora = new Date()) {
  const ocupados = await prisma.agendamento.findMany({
    where: { ...OCUPA_AGENDA, profissionalId, inicio: { lt: fimDoDia(dia) }, fim: { gt: inicioDoDia(dia) } },
    select: { inicio: true, fim: true },
  });
  const fechamento = dataHora(dia, FECHAMENTO).getTime();
  return HORARIOS.filter((h) => {
    const ini = dataHora(dia, h).getTime();
    const fim = ini + duracaoMin * 60000;
    if (fim > fechamento || ini < agora.getTime()) return false;
    return !ocupados.some((o) => o.inicio.getTime() < fim && o.fim.getTime() > ini);
  });
}
