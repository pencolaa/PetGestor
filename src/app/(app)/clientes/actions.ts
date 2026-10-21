"use server";

import type { Especie, Sexo } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirAdmin, exigirSessao } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dataValida, emailValido, inteiro, texto, textoOuNull, type Resultado } from "@/lib/acoes";
import { dataHora, hojeISO, somarDias } from "@/lib/datas";
import { apenasDigitos, parseMoeda } from "@/lib/formato";

const ESPECIES: Especie[] = ["CAO", "GATO", "OUTRO"];
const SEXOS: Sexo[] = ["MACHO", "FEMEA"];

function dadosTutor(form: FormData) {
  return {
    nome: texto(form, "nome", 120),
    telefone: apenasDigitos(texto(form, "telefone", 30)),
    email: textoOuNull(form, "email", 254)?.toLowerCase() ?? null,
    cpf: textoOuNull(form, "cpf", 20),
    endereco: textoOuNull(form, "endereco", 200),
  };
}

export async function salvarTutor(_: Resultado, form: FormData): Promise<Resultado> {
  await exigirSessao();
  const id = texto(form, "id", 40);
  const dados = dadosTutor(form);
  if (!dados.nome) return { ok: false, mensagem: "Informe o nome do tutor." };
  if (dados.telefone.length < 10 || dados.telefone.length > 13) return { ok: false, mensagem: "Telefone inválido (inclua o DDD)." };
  if (dados.email && !emailValido(dados.email)) return { ok: false, mensagem: "E-mail inválido." };
  if (dados.cpf && apenasDigitos(dados.cpf).length !== 11) return { ok: false, mensagem: "CPF deve ter 11 dígitos." };
  if (id && !(await prisma.tutor.findUnique({ where: { id }, select: { id: true } }))) return { ok: false, mensagem: "Tutor não encontrado." };
  const tutor = id ? await prisma.tutor.update({ where: { id }, data: dados }) : await prisma.tutor.create({ data: dados });
  revalidatePath("/clientes");
  return { ok: true, mensagem: "Tutor salvo.", id: tutor.id };
}

export async function salvarPet(_: Resultado, form: FormData): Promise<Resultado> {
  await exigirSessao();
  const id = texto(form, "id", 40);
  const tutorId = texto(form, "tutorId", 40);
  const nasc = texto(form, "dataNascimento", 10);
  const pesoTexto = texto(form, "peso", 10).replace(",", ".");
  const peso = pesoTexto ? Number(pesoTexto) : null;
  const dados = {
    nome: texto(form, "nome", 60),
    especie: texto(form, "especie", 10) as Especie,
    raca: textoOuNull(form, "raca", 60),
    sexo: texto(form, "sexo", 10) as Sexo,
    dataNascimento: nasc ? dataHora(nasc, "12:00") : null,
    peso,
  };
  if (!dados.nome) return { ok: false, mensagem: "Informe o nome do pet." };
  if (!ESPECIES.includes(dados.especie)) return { ok: false, mensagem: "Espécie inválida." };
  if (!SEXOS.includes(dados.sexo)) return { ok: false, mensagem: "Sexo inválido." };
  if (nasc && (!dataValida(nasc) || nasc > hojeISO() || nasc < "1980-01-01")) return { ok: false, mensagem: "Data de nascimento inválida." };
  if (peso !== null && !(peso > 0 && peso <= 150)) return { ok: false, mensagem: "Peso inválido (entre 0 e 150 kg)." };

  if (id) {
    if (!(await prisma.pet.findUnique({ where: { id }, select: { id: true } }))) return { ok: false, mensagem: "Pet não encontrado." };
    await prisma.pet.update({ where: { id }, data: dados });
    revalidatePath("/clientes");
    return { ok: true, mensagem: "Pet salvo.", id };
  }
  if (!(await prisma.tutor.findUnique({ where: { id: tutorId }, select: { id: true } }))) return { ok: false, mensagem: "Tutor não encontrado." };
  const pet = await prisma.pet.create({ data: { ...dados, tutorId, observacoes: textoOuNull(form, "observacoes", 1000) } });
  revalidatePath("/clientes");
  return { ok: true, mensagem: "Pet salvo.", id: pet.id };
}

export async function salvarObservacoes(_: Resultado, form: FormData): Promise<Resultado> {
  await exigirSessao();
  const id = texto(form, "petId", 40);
  const r = await prisma.pet.updateMany({ where: { id }, data: { observacoes: textoOuNull(form, "observacoes", 1000) } });
  if (r.count === 0) return { ok: false, mensagem: "Pet não encontrado." };
  revalidatePath(`/clientes/pets/${id}`);
  return { ok: true, mensagem: "Observações salvas." };
}

export async function registrarVacina(_: Resultado, form: FormData): Promise<Resultado> {
  await exigirSessao();
  const petId = texto(form, "petId", 40);
  const nome = texto(form, "nome", 80);
  const aplicada = texto(form, "aplicadaEm", 10);
  const proxima = texto(form, "proximaDose", 10);
  if (!nome || !aplicada) return { ok: false, mensagem: "Informe a vacina e a data de aplicação." };
  if (!dataValida(aplicada) || aplicada > hojeISO()) return { ok: false, mensagem: "Data de aplicação inválida." };
  if (proxima && !dataValida(proxima)) return { ok: false, mensagem: "Data da próxima dose inválida." };
  if (proxima && proxima <= aplicada) return { ok: false, mensagem: "A próxima dose deve ser depois da aplicação." };
  if (!(await prisma.pet.findUnique({ where: { id: petId }, select: { id: true } }))) return { ok: false, mensagem: "Pet não encontrado." };
  await prisma.vacina.create({
    data: { petId, nome, aplicadaEm: dataHora(aplicada, "12:00"), proximaDose: proxima ? dataHora(proxima, "12:00") : null, lote: textoOuNull(form, "lote", 40) },
  });
  revalidatePath(`/clientes/pets/${petId}`);
  return { ok: true, mensagem: "Vacina registrada." };
}

export async function excluirVacina(id: string) {
  await exigirSessao();
  const v = await prisma.vacina.findUnique({ where: { id: String(id).slice(0, 40) } });
  if (!v) return;
  await prisma.vacina.delete({ where: { id: v.id } });
  revalidatePath(`/clientes/pets/${v.petId}`);
}

/** Cria um novo pacote (ou renova, substituindo o anterior como pacote ativo) */
export async function criarPacote(_: Resultado, form: FormData): Promise<Resultado> {
  await exigirSessao();
  const petId = texto(form, "petId", 40);
  const servicoId = texto(form, "servicoId", 40);
  const total = inteiro(texto(form, "total", 5), 1, 100);
  const validadeDias = inteiro(texto(form, "validadeDias", 5), 1, 730);
  const valor = parseMoeda(texto(form, "valor", 15));
  if (!servicoId) return { ok: false, mensagem: "Escolha o serviço do pacote." };
  if (total === null) return { ok: false, mensagem: "Quantidade de banhos deve ser entre 1 e 100." };
  if (validadeDias === null) return { ok: false, mensagem: "Validade deve ser entre 1 e 730 dias." };
  if (valor < 0 || valor > 10_000_000) return { ok: false, mensagem: "Valor inválido." };
  const [pet, servico] = await Promise.all([
    prisma.pet.findUnique({ where: { id: petId }, select: { id: true } }),
    prisma.servico.findUnique({ where: { id: servicoId }, select: { id: true } }),
  ]);
  if (!pet || !servico) return { ok: false, mensagem: "Pet ou serviço não encontrado." };
  await prisma.pacote.create({
    data: { petId, servicoId, total, validade: dataHora(somarDias(hojeISO(), validadeDias), "23:59"), valor },
  });
  revalidatePath(`/clientes/pets/${petId}`);
  return { ok: true, mensagem: "Pacote registrado." };
}

/** Exclui o pet com vacinas, pacotes e histórico de agendamentos (somente administrador) */
export async function excluirPet(id: string): Promise<Resultado> {
  await exigirAdmin();
  const pet = await prisma.pet.findUnique({ where: { id: String(id).slice(0, 40) }, select: { id: true, tutorId: true } });
  if (!pet) return { ok: false, mensagem: "Pet não encontrado." };
  await prisma.pet.delete({ where: { id: pet.id } });
  revalidatePath("/clientes");
  revalidatePath("/agenda");
  redirect(`/clientes/${pet.tutorId}`);
}

/** Exclui o tutor e todos os pets dele (somente administrador) */
export async function excluirTutor(id: string): Promise<Resultado> {
  await exigirAdmin();
  const tutor = await prisma.tutor.findUnique({ where: { id: String(id).slice(0, 40) }, select: { id: true } });
  if (!tutor) return { ok: false, mensagem: "Tutor não encontrado." };
  await prisma.tutor.delete({ where: { id: tutor.id } });
  revalidatePath("/clientes");
  revalidatePath("/agenda");
  redirect("/clientes");
}
