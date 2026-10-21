import { prisma } from "./prisma";
import { dataHora, diaISO, diffDias, formatarData, hojeISO, inicioDoDia, somarDias } from "./datas";
import { DIAS_AVISO_VACINA } from "./vacinas";
import { linkWaMe, mensagens } from "./whatsapp";

export type Lembrete = {
  id: string;
  tipo: "VACINA" | "BANHO" | "ANIVERSARIO";
  titulo: string;
  detalhe: string;
  urgente: boolean;
  petId: string;
  whatsapp: string;
};

const DIAS_SEM_BANHO = 30;
const DIAS_ANIVERSARIO = 7;

export async function gerarLembretes(nomePetShop: string): Promise<Lembrete[]> {
  const hoje = hojeISO();
  const lembretes: Lembrete[] = [];

  // 1) Vacinas vencendo ou atrasadas (considera só a dose mais recente de cada vacina do pet)
  const vacinas = await prisma.vacina.findMany({
    where: { proximaDose: { gte: inicioDoDia(somarDias(hoje, -60)), lte: dataHora(somarDias(hoje, DIAS_AVISO_VACINA), "23:59") } },
    include: { pet: { include: { tutor: true, vacinas: { select: { nome: true, aplicadaEm: true } } } } },
    orderBy: { proximaDose: "asc" },
  });
  for (const v of vacinas) {
    const temDoseMaisNova = v.pet.vacinas.some((o) => o.nome === v.nome && o.aplicadaEm > v.aplicadaEm);
    if (temDoseMaisNova || !v.proximaDose) continue;
    const dias = diffDias(diaISO(v.proximaDose), hoje);
    const data = formatarData(v.proximaDose, { day: "2-digit", month: "2-digit" });
    lembretes.push({
      id: `vac-${v.id}`,
      tipo: "VACINA",
      titulo: `${v.pet.nome} · ${v.nome}`,
      detalhe: dias < 0 ? `Atrasada há ${-dias} dia(s) · ${v.pet.tutor.nome}` : dias === 0 ? `Vence hoje · ${v.pet.tutor.nome}` : `Vence em ${dias} dia(s) · ${v.pet.tutor.nome}`,
      urgente: dias < 0,
      petId: v.petId,
      whatsapp: linkWaMe(v.pet.tutor.telefone, mensagens.vacinaVencendo({ tutor: v.pet.tutor.nome, pet: v.pet.nome, vacina: v.nome, data, petShop: nomePetShop, atrasada: dias < 0 })),
    });
  }

  // 2) Pets há 30+ dias sem banho (e sem banho já agendado)
  const banhos = await prisma.agendamento.groupBy({
    by: ["petId"],
    where: { status: { not: "CANCELADO" }, servico: { tipo: { in: ["BANHO", "TOSA"] } } },
    _max: { inicio: true },
  });
  const limite = inicioDoDia(somarDias(hoje, -DIAS_SEM_BANHO));
  const atrasados = banhos.filter((b) => b._max.inicio && b._max.inicio < limite);
  if (atrasados.length) {
    const pets = await prisma.pet.findMany({ where: { id: { in: atrasados.map((b) => b.petId) } }, include: { tutor: true } });
    for (const b of atrasados) {
      const pet = pets.find((p) => p.id === b.petId);
      if (!pet || !b._max.inicio) continue;
      const dias = diffDias(hoje, diaISO(b._max.inicio));
      lembretes.push({
        id: `banho-${pet.id}`,
        tipo: "BANHO",
        titulo: `${pet.nome} sem banho há ${dias} dias`,
        detalhe: `Último em ${formatarData(b._max.inicio, { day: "2-digit", month: "2-digit" })} · ${pet.tutor.nome}`,
        urgente: false,
        petId: pet.id,
        whatsapp: linkWaMe(pet.tutor.telefone, mensagens.semBanho({ tutor: pet.tutor.nome, pet: pet.nome, dias, petShop: nomePetShop })),
      });
    }
  }

  // 3) Aniversários nos próximos 7 dias
  const proximos = new Map(Array.from({ length: DIAS_ANIVERSARIO + 1 }, (_, i) => [somarDias(hoje, i).slice(5), i]));
  const aniversariantes = await prisma.pet.findMany({ where: { dataNascimento: { not: null } }, include: { tutor: true } });
  for (const pet of aniversariantes) {
    const nasc = diaISO(pet.dataNascimento!);
    const em = proximos.get(nasc.slice(5));
    if (em === undefined) continue;
    const anos = Number(somarDias(hoje, em).slice(0, 4)) - Number(nasc.slice(0, 4));
    const quando = em === 0 ? "hoje" : em === 1 ? "amanhã" : `no dia ${formatarData(somarDias(hoje, em), { day: "2-digit", month: "2-digit" })}`;
    lembretes.push({
      id: `aniv-${pet.id}`,
      tipo: "ANIVERSARIO",
      titulo: `${pet.nome} faz ${anos} ${anos === 1 ? "ano" : "anos"} ${quando}`,
      detalhe: pet.tutor.nome,
      urgente: em === 0,
      petId: pet.id,
      whatsapp: linkWaMe(pet.tutor.telefone, mensagens.aniversario({ tutor: pet.tutor.nome, pet: pet.nome, quando, petShop: nomePetShop })),
    });
  }

  return lembretes.sort((a, b) => Number(b.urgente) - Number(a.urgente));
}
