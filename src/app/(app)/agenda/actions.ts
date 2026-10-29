"use server";

import type { Especie, Prisma, Sexo, StatusAgendamento } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { exigirSessao } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dataValida, texto, textoOuNull, type Resultado } from "@/lib/acoes";
import { calcularHorariosLivres, obterExpediente, temConflito } from "@/lib/agenda";
import { dataHora, diaISO, formatarData, hojeISO, horaLocal } from "@/lib/datas";
import { apenasDigitos, atende, parseMoeda } from "@/lib/formato";
import { obterConfiguracao } from "@/lib/configuracao";
import { mensagens, provedorWhatsApp } from "@/lib/whatsapp";

export type PetBusca = {
  id: string;
  nome: string;
  especie: string;
  raca: string | null;
  tutor: string;
  telefone: string;
  pacotes: { id: string; servicoId: string; restantes: number }[];
};

export async function buscarPets(q: string): Promise<PetBusca[]> {
  await exigirSessao();
  const termo = String(q).trim().slice(0, 100);
  if (termo.length < 2) return [];
  const digitos = apenasDigitos(termo);
  const pets = await prisma.pet.findMany({
    where: {
      OR: [
        { nome: { contains: termo, mode: "insensitive" } },
        { tutor: { nome: { contains: termo, mode: "insensitive" } } },
        ...(digitos.length >= 3 ? [{ tutor: { telefone: { contains: digitos } } }] : []),
      ],
    },
    include: { tutor: true, pacotes: { where: { validade: { gte: new Date() } } } },
    take: 10,
    orderBy: { nome: "asc" },
  });
  return pets.map(paraPetBusca);
}

export async function obterPet(id: string): Promise<PetBusca | null> {
  await exigirSessao();
  const pet = await prisma.pet.findUnique({ where: { id }, include: { tutor: true, pacotes: { where: { validade: { gte: new Date() } } } } });
  return pet ? paraPetBusca(pet) : null;
}

function paraPetBusca(p: {
  id: string; nome: string; especie: string; raca: string | null;
  tutor: { nome: string; telefone: string };
  pacotes: { id: string; servicoId: string; total: number; usados: number }[];
}): PetBusca {
  return {
    id: p.id, nome: p.nome, especie: p.especie, raca: p.raca, tutor: p.tutor.nome, telefone: p.tutor.telefone,
    pacotes: p.pacotes.filter((x) => x.usados < x.total).map((x) => ({ id: x.id, servicoId: x.servicoId, restantes: x.total - x.usados })),
  };
}

export async function horariosLivres(profissionalId: string, dia: string, duracaoMin: number, ignorarId?: string): Promise<string[]> {
  await exigirSessao();
  if (typeof profissionalId !== "string" || !profissionalId || !dataValida(String(dia)) || !Number.isInteger(duracaoMin) || duracaoMin <= 0 || duracaoMin > 600) return [];
  return calcularHorariosLivres(profissionalId, dia, duracaoMin, typeof ignorarId === "string" ? ignorarId.slice(0, 40) : undefined);
}

export type ResultadoAgendamento = (Resultado & { whatsapp?: string }) | null;

type NovoCliente = { tutorNome: string; telefone: string; petNome: string; especie: Especie; sexo: Sexo };

/** Lê e valida o "cliente novo" do formulário de agendamento */
function lerNovoCliente(form: FormData): NovoCliente | string {
  const tutorNome = texto(form, "tutorNome", 120);
  const telefone = apenasDigitos(texto(form, "tutorTelefone", 20));
  const petNome = texto(form, "petNome", 60);
  const especie = texto(form, "petEspecie", 10) as Especie;
  const sexo = texto(form, "petSexo", 10) as Sexo;
  if (!tutorNome) return "Informe o nome do tutor.";
  if (telefone.length < 10 || telefone.length > 13) return "Telefone inválido (inclua o DDD).";
  if (!petNome) return "Informe o nome do pet.";
  if (!["CAO", "GATO", "OUTRO"].includes(especie)) return "Espécie inválida.";
  if (!["MACHO", "FEMEA"].includes(sexo)) return "Sexo inválido.";
  return { tutorNome, telefone, petNome, especie, sexo };
}

/** Usa o tutor com o mesmo telefone (e o pet com o mesmo nome) se já existirem; senão cria */
async function obterOuCriarPet(tx: Prisma.TransactionClient, c: NovoCliente): Promise<string> {
  const tutor =
    (await tx.tutor.findFirst({ where: { telefone: c.telefone }, orderBy: { criadoEm: "asc" } })) ??
    (await tx.tutor.create({ data: { nome: c.tutorNome, telefone: c.telefone } }));
  const pet =
    (await tx.pet.findFirst({ where: { tutorId: tutor.id, nome: { equals: c.petNome, mode: "insensitive" } } })) ??
    (await tx.pet.create({ data: { nome: c.petNome, especie: c.especie, sexo: c.sexo, tutorId: tutor.id } }));
  return pet.id;
}

export async function criarAgendamento(_: ResultadoAgendamento, form: FormData): Promise<ResultadoAgendamento> {
  await exigirSessao();
  let petId = texto(form, "petId", 40);
  const novoCliente = !petId && form.get("novoCliente") === "1" ? lerNovoCliente(form) : null;
  if (typeof novoCliente === "string") return { ok: false, mensagem: novoCliente };
  const servicoId = texto(form, "servicoId", 40);
  const profissionalId = texto(form, "profissionalId", 40);
  const dia = texto(form, "data", 10);
  const hora = texto(form, "hora", 5);
  const usarPacote = form.get("usarPacote") === "on";
  const confirmarWhatsapp = form.get("confirmarWhatsapp") === "on";

  if (!petId && !novoCliente) return { ok: false, mensagem: "Selecione o pet ou cadastre um cliente novo." };
  if (!servicoId || !profissionalId) return { ok: false, mensagem: "Selecione o serviço e o profissional." };
  if (!dia || !hora) return { ok: false, mensagem: "Escolha a data e o horário." };
  // Só datas reais e horários da grade (blocos de 30 min dentro do expediente)
  const expediente = await obterExpediente();
  if (!dataValida(dia) || !expediente.horarios.includes(hora)) return { ok: false, mensagem: "Data ou horário inválido." };

  const [pet, servico, profissional] = await Promise.all([
    novoCliente ? null : prisma.pet.findUnique({ where: { id: petId }, include: { tutor: true } }),
    prisma.servico.findUnique({ where: { id: servicoId } }),
    prisma.profissional.findUnique({ where: { id: profissionalId } }),
  ]);
  if ((!pet && !novoCliente) || !servico?.ativo || !profissional?.ativo) return { ok: false, mensagem: "Pet, serviço ou profissional inválido." };
  if (!atende(profissional.tipos, servico.tipo)) {
    return { ok: false, mensagem: `${profissional.nome} não realiza esse tipo de serviço.` };
  }

  const inicio = dataHora(dia, hora);
  const fim = new Date(inicio.getTime() + servico.duracaoMin * 60000);
  if (fim > dataHora(dia, expediente.fechamento)) return { ok: false, mensagem: `O serviço terminaria após o fechamento (${expediente.fechamento}).` };
  if (dia < hojeISO() || inicio < new Date()) return { ok: false, mensagem: "Não é possível agendar em horário que já passou." };
  const valorInformado = parseMoeda(texto(form, "valorEstimado", 15));
  if (valorInformado < 0 || valorInformado > 10_000_000) return { ok: false, mensagem: "Valor estimado inválido." };

  let pacoteId: string | null = null;
  if (usarPacote && !novoCliente) {
    const pacote = await prisma.pacote.findFirst({
      where: { petId, servicoId, validade: { gte: inicio } },
      orderBy: { validade: "asc" },
    });
    if (!pacote || pacote.usados >= pacote.total) return { ok: false, mensagem: "O pet não tem pacote válido para esse serviço." };
    pacoteId = pacote.id;
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Trava os agendamentos do profissional para evitar dois cadastros simultâneos no mesmo horário
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${profissionalId}))`;
      const conflito = await tx.agendamento.findFirst({
        where: { profissionalId, status: { not: "CANCELADO" }, inicio: { lt: fim }, fim: { gt: inicio } },
        include: { pet: true },
      });
      if (conflito) throw new Error(`CONFLITO:${horaLocal(conflito.inicio)}–${horaLocal(conflito.fim)} (${conflito.pet.nome})`);
      // Cliente novo: cria tutor e pet na mesma transação (se o horário der conflito, nada fica criado)
      if (novoCliente) petId = await obterOuCriarPet(tx, novoCliente);
      if (pacoteId) {
        // Só consome se ainda houver banho disponível (evita usar o último banho duas vezes ao mesmo tempo)
        const pacote = await tx.pacote.findUniqueOrThrow({ where: { id: pacoteId } });
        const r = await tx.pacote.updateMany({ where: { id: pacoteId, usados: { lt: pacote.total } }, data: { usados: { increment: 1 } } });
        if (r.count === 0) throw new Error("PACOTE_ESGOTADO");
      }
      await tx.agendamento.create({
        data: {
          petId, servicoId, profissionalId, inicio, fim,
          status: "AGUARDANDO",
          valorEstimado: pacoteId ? 0 : valorInformado || servico.preco,
          observacoes: textoOuNull(form, "observacoes", 500),
          confirmarWhatsapp,
          pacoteId,
          pago: pacoteId !== null,
        },
      });
    });
  } catch (e) {
    if (e instanceof Error && e.message === "PACOTE_ESGOTADO") return { ok: false, mensagem: "O pacote deste pet acabou de ser esgotado." };
    if (e instanceof Error && e.message.startsWith("CONFLITO:")) {
      return { ok: false, mensagem: `${profissional.nome} já tem atendimento em ${e.message.slice(9)}. Escolha outro horário.` };
    }
    throw e;
  }

  revalidatePath("/agenda");
  revalidatePath("/");
  if (novoCliente) revalidatePath("/clientes");

  const tutorNome = pet?.tutor.nome ?? novoCliente!.tutorNome;
  const tutorTelefone = pet?.tutor.telefone ?? novoCliente!.telefone;
  const petNome = pet?.nome ?? novoCliente!.petNome;
  let whatsapp: string | undefined;
  if (confirmarWhatsapp) {
    const config = await obterConfiguracao();
    const envio = await provedorWhatsApp().enviar(
      tutorTelefone,
      mensagens.confirmacaoAgendamento({
        tutor: tutorNome, pet: petNome, servico: servico.nome,
        data: formatarData(dia, { day: "2-digit", month: "2-digit" }), hora, petShop: config.nomePetShop,
      }),
    );
    if (envio.modo === "link") whatsapp = envio.url;
  }
  return { ok: true, mensagem: novoCliente ? "Agendamento criado e cliente cadastrado." : "Agendamento criado.", whatsapp };
}

export async function remarcarAgendamento(_: Resultado, form: FormData): Promise<Resultado> {
  await exigirSessao();
  const id = texto(form, "id", 40);
  const profissionalId = texto(form, "profissionalId", 40);
  const dia = texto(form, "data", 10);
  const hora = texto(form, "hora", 5);

  const atual = await prisma.agendamento.findUnique({ where: { id }, include: { servico: true } });
  if (!atual) return { ok: false, mensagem: "Agendamento não encontrado." };
  if (atual.status === "CANCELADO" || atual.status === "CONCLUIDO") return { ok: false, mensagem: "Agendamentos cancelados ou concluídos não podem ser remarcados." };

  const expediente = await obterExpediente();
  if (!dataValida(dia) || !expediente.horarios.includes(hora)) return { ok: false, mensagem: "Escolha uma data e um horário válidos." };
  const profissional = await prisma.profissional.findUnique({ where: { id: profissionalId } });
  if (!profissional?.ativo) return { ok: false, mensagem: "Profissional inválido." };
  if (!atende(profissional.tipos, atual.servico.tipo)) return { ok: false, mensagem: `${profissional.nome} não realiza esse tipo de serviço.` };

  const inicio = dataHora(dia, hora);
  const fim = new Date(inicio.getTime() + atual.servico.duracaoMin * 60000);
  if (inicio < new Date()) return { ok: false, mensagem: "Não é possível remarcar para um horário que já passou." };
  if (fim > dataHora(dia, expediente.fechamento)) return { ok: false, mensagem: `O serviço terminaria após o fechamento (${expediente.fechamento}).` };

  try {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${profissionalId}))`;
      const conflito = await tx.agendamento.findFirst({
        where: { id: { not: id }, profissionalId, status: { not: "CANCELADO" }, inicio: { lt: fim }, fim: { gt: inicio } },
        include: { pet: true },
      });
      if (conflito) throw new Error(`CONFLITO:${horaLocal(conflito.inicio)}–${horaLocal(conflito.fim)} (${conflito.pet.nome})`);
      await tx.agendamento.update({
        where: { id },
        data: { profissionalId, inicio, fim, observacoes: textoOuNull(form, "observacoes", 500) },
      });
    });
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("CONFLITO:")) {
      return { ok: false, mensagem: `${profissional.nome} já tem atendimento em ${e.message.slice(9)}.` };
    }
    throw e;
  }
  revalidatePath("/agenda");
  revalidatePath("/clientes");
  return { ok: true, mensagem: "Agendamento remarcado." };
}

const STATUS_VALIDOS: StatusAgendamento[] = ["AGUARDANDO", "CONFIRMADO", "EM_ATENDIMENTO", "PRONTO", "CONCLUIDO", "CANCELADO"];

export async function alterarStatus(id: string, status: StatusAgendamento): Promise<Resultado> {
  await exigirSessao();
  if (!STATUS_VALIDOS.includes(status)) return { ok: false, mensagem: "Status inválido." };
  const atual = await prisma.agendamento.findUnique({ where: { id } });
  if (!atual) return { ok: false, mensagem: "Agendamento não encontrado." };
  if (atual.status === status) return { ok: true, mensagem: "" };
  if (atual.status === "CANCELADO" && (await temConflito(atual.profissionalId, atual.inicio, atual.fim, atual.id))) {
    return { ok: false, mensagem: "Esse horário já foi ocupado por outro agendamento." };
  }
  await prisma.$transaction(async (tx) => {
    // Cancelar devolve o banho ao pacote; reativar consome de novo
    if (atual.pacoteId && status === "CANCELADO") {
      await tx.pacote.update({ where: { id: atual.pacoteId }, data: { usados: { decrement: 1 } } });
    }
    if (atual.pacoteId && atual.status === "CANCELADO") {
      await tx.pacote.update({ where: { id: atual.pacoteId }, data: { usados: { increment: 1 } } });
    }
    await tx.agendamento.update({ where: { id }, data: { status } });
  });
  revalidatePath("/agenda");
  revalidatePath("/");
  return { ok: true, mensagem: "Status atualizado." };
}

/** Link de WhatsApp para confirmação ou aviso de "pronto para retirada" */
export async function linkAvisoAgendamento(id: string, tipo: "confirmacao" | "pronto"): Promise<string | null> {
  await exigirSessao();
  const ag = await prisma.agendamento.findUnique({ where: { id }, include: { pet: { include: { tutor: true } }, servico: true } });
  if (!ag) return null;
  const config = await obterConfiguracao();
  const base = { tutor: ag.pet.tutor.nome, pet: ag.pet.nome, petShop: config.nomePetShop };
  const msg =
    tipo === "pronto"
      ? mensagens.prontoParaRetirada(base)
      : mensagens.confirmacaoAgendamento({
          ...base, servico: ag.servico.nome,
          data: formatarData(diaISO(ag.inicio), { day: "2-digit", month: "2-digit" }), hora: horaLocal(ag.inicio),
        });
  const envio = await provedorWhatsApp().enviar(ag.pet.tutor.telefone, msg);
  return envio.modo === "link" ? envio.url : null;
}
