"use server";

import type { Especie, Sexo } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { exigirSessao } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { texto, textoOuNull, type Resultado } from "@/lib/acoes";
import { dataHora, hojeISO, somarDias } from "@/lib/datas";
import { apenasDigitos, parseMoeda } from "@/lib/formato";

function dadosTutor(form: FormData) {
  return {
    nome: texto(form, "nome"),
    telefone: apenasDigitos(texto(form, "telefone")),
    email: textoOuNull(form, "email"),
    cpf: textoOuNull(form, "cpf"),
    endereco: textoOuNull(form, "endereco"),
  };
}

export async function salvarTutor(_: Resultado, form: FormData): Promise<Resultado> {
  await exigirSessao();
  const id = texto(form, "id");
  const dados = dadosTutor(form);
  if (!dados.nome) return { ok: false, mensagem: "Informe o nome do tutor." };
  if (dados.telefone.length < 10) return { ok: false, mensagem: "Telefone inválido (inclua o DDD)." };
  const tutor = id ? await prisma.tutor.update({ where: { id }, data: dados }) : await prisma.tutor.create({ data: dados });
  revalidatePath("/clientes");
  return { ok: true, mensagem: "Tutor salvo.", id: tutor.id };
}

function dadosPet(form: FormData) {
  const nasc = texto(form, "dataNascimento");
  const peso = texto(form, "peso").replace(",", ".");
  return {
    nome: texto(form, "nome"),
    especie: texto(form, "especie") as Especie,
    raca: textoOuNull(form, "raca"),
    sexo: texto(form, "sexo") as Sexo,
    dataNascimento: nasc ? dataHora(nasc, "12:00") : null,
    peso: peso ? Number(peso) : null,
  };
}

export async function salvarPet(_: Resultado, form: FormData): Promise<Resultado> {
  await exigirSessao();
  const id = texto(form, "id");
  const tutorId = texto(form, "tutorId");
  const dados = dadosPet(form);
  if (!dados.nome) return { ok: false, mensagem: "Informe o nome do pet." };
  if (!["CAO", "GATO", "OUTRO"].includes(dados.especie)) return { ok: false, mensagem: "Espécie inválida." };
  if (!["MACHO", "FEMEA"].includes(dados.sexo)) return { ok: false, mensagem: "Sexo inválido." };
  if (dados.peso !== null && !(dados.peso > 0)) return { ok: false, mensagem: "Peso inválido." };
  const pet = id
    ? await prisma.pet.update({ where: { id }, data: dados })
    : await prisma.pet.create({ data: { ...dados, tutorId, observacoes: textoOuNull(form, "observacoes") } });
  revalidatePath("/clientes");
  return { ok: true, mensagem: "Pet salvo.", id: pet.id };
}

export async function salvarObservacoes(_: Resultado, form: FormData): Promise<Resultado> {
  await exigirSessao();
  const id = texto(form, "petId");
  await prisma.pet.update({ where: { id }, data: { observacoes: textoOuNull(form, "observacoes") } });
  revalidatePath(`/clientes/pets/${id}`);
  return { ok: true, mensagem: "Observações salvas." };
}

export async function registrarVacina(_: Resultado, form: FormData): Promise<Resultado> {
  await exigirSessao();
  const petId = texto(form, "petId");
  const nome = texto(form, "nome");
  const aplicada = texto(form, "aplicadaEm");
  const proxima = texto(form, "proximaDose");
  if (!nome || !aplicada) return { ok: false, mensagem: "Informe a vacina e a data de aplicação." };
  if (proxima && proxima <= aplicada) return { ok: false, mensagem: "A próxima dose deve ser depois da aplicação." };
  await prisma.vacina.create({
    data: { petId, nome, aplicadaEm: dataHora(aplicada, "12:00"), proximaDose: proxima ? dataHora(proxima, "12:00") : null, lote: textoOuNull(form, "lote") },
  });
  revalidatePath(`/clientes/pets/${petId}`);
  return { ok: true, mensagem: "Vacina registrada." };
}

export async function excluirVacina(id: string) {
  await exigirSessao();
  const v = await prisma.vacina.delete({ where: { id } });
  revalidatePath(`/clientes/pets/${v.petId}`);
}

/** Cria um novo pacote (ou renova, substituindo o anterior como pacote ativo) */
export async function criarPacote(_: Resultado, form: FormData): Promise<Resultado> {
  await exigirSessao();
  const petId = texto(form, "petId");
  const servicoId = texto(form, "servicoId");
  const total = Number(texto(form, "total"));
  const validadeDias = Number(texto(form, "validadeDias"));
  const valor = parseMoeda(texto(form, "valor"));
  if (!servicoId) return { ok: false, mensagem: "Escolha o serviço do pacote." };
  if (!(total > 0) || !(validadeDias > 0)) return { ok: false, mensagem: "Quantidade e validade devem ser maiores que zero." };
  await prisma.pacote.create({
    data: { petId, servicoId, total, validade: dataHora(somarDias(hojeISO(), validadeDias), "23:59"), valor },
  });
  revalidatePath(`/clientes/pets/${petId}`);
  return { ok: true, mensagem: "Pacote registrado. Lance a cobrança no PDV." };
}
