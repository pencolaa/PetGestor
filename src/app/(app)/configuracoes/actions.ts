"use server";

import type { TipoServico } from "@prisma/client";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { exigirAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emailValido, horaValida, inteiro, limparEmail, limparSenha, texto, textoOuNull, urlSegura, type Resultado } from "@/lib/acoes";
import { parseMoeda } from "@/lib/formato";
import { gerarSenha } from "@/lib/senhas";

const TIPOS: TipoServico[] = ["BANHO", "TOSA", "VETERINARIA"];

function minutos(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export async function salvarConfiguracao(_: Resultado, form: FormData): Promise<Resultado> {
  await exigirAdmin();
  const nomePetShop = texto(form, "nomePetShop", 80);
  const corPrincipal = texto(form, "corPrincipal", 7);
  const abertura = texto(form, "abertura", 5);
  const fechamento = texto(form, "fechamento", 5);
  if (!nomePetShop) return { ok: false, mensagem: "Informe o nome do pet shop." };
  if (!/^#[0-9a-fA-F]{6}$/.test(corPrincipal)) return { ok: false, mensagem: "Cor inválida." };
  if (!horaValida(abertura) || !horaValida(fechamento) || minutos(abertura) % 30 || minutos(fechamento) % 30) {
    return { ok: false, mensagem: "Horários devem ser em intervalos de 30 minutos." };
  }
  if (minutos(fechamento) - minutos(abertura) < 60) return { ok: false, mensagem: "O fechamento deve ser pelo menos 1 hora depois da abertura." };
  const dados = {
    nomePetShop,
    corPrincipal,
    abertura,
    fechamento,
    logoUrl: textoOuNull(form, "logoUrl", 500),
    telefone: textoOuNull(form, "telefone", 30),
    endereco: textoOuNull(form, "endereco", 200),
  };
  if (dados.logoUrl && !urlSegura(dados.logoUrl)) return { ok: false, mensagem: "A URL do logo deve começar com https://" };
  await prisma.configuracao.upsert({ where: { id: 1 }, create: { id: 1, ...dados }, update: dados });
  revalidatePath("/", "layout");
  return { ok: true, mensagem: "Configurações salvas." };
}

export async function salvarServico(_: Resultado, form: FormData): Promise<Resultado> {
  await exigirAdmin();
  const id = texto(form, "id", 40);
  const nome = texto(form, "nome", 80);
  const tipo = texto(form, "tipo", 15) as TipoServico;
  const duracaoMin = inteiro(texto(form, "duracaoMin", 4), 30, 480);
  const preco = parseMoeda(texto(form, "preco", 15));
  if (!nome) return { ok: false, mensagem: "Informe o nome do serviço." };
  if (!TIPOS.includes(tipo)) return { ok: false, mensagem: "Tipo inválido." };
  if (duracaoMin === null || duracaoMin % 30) return { ok: false, mensagem: "A duração deve ser em blocos de 30 minutos (30 a 480)." };
  if (preco < 0 || preco > 10_000_000) return { ok: false, mensagem: "Preço inválido." };
  const dados = { nome, tipo, duracaoMin, preco, ativo: id ? form.get("ativo") === "on" : true };
  if (id) {
    const r = await prisma.servico.updateMany({ where: { id }, data: dados });
    if (r.count === 0) return { ok: false, mensagem: "Serviço não encontrado." };
  } else {
    await prisma.servico.create({ data: dados });
  }
  revalidatePath("/configuracoes");
  revalidatePath("/agenda");
  return { ok: true, mensagem: "Serviço salvo." };
}

export async function salvarProfissional(_: Resultado, form: FormData): Promise<Resultado> {
  await exigirAdmin();
  const id = texto(form, "id", 40);
  const nome = texto(form, "nome", 80);
  const tipos = TIPOS.filter((t) => form.getAll("tipos").includes(t));
  if (!nome) return { ok: false, mensagem: "Informe o nome do profissional." };
  if (tipos.length === 0) return { ok: false, mensagem: "Marque pelo menos uma especialidade." };
  const dados = { nome, tipos, ativo: id ? form.get("ativo") === "on" : true };
  if (id) {
    const r = await prisma.profissional.updateMany({ where: { id }, data: dados });
    if (r.count === 0) return { ok: false, mensagem: "Profissional não encontrado." };
  } else {
    await prisma.profissional.create({ data: dados });
  }
  revalidatePath("/configuracoes");
  revalidatePath("/agenda");
  return { ok: true, mensagem: "Profissional salvo." };
}

export async function criarUsuario(_: Resultado, form: FormData): Promise<Resultado> {
  await exigirAdmin();
  const nome = texto(form, "nome", 120);
  // Mesma limpeza do login, para o que foi cadastrado ser exatamente o que será digitado depois
  const email = limparEmail(form.get("email"));
  const senha = limparSenha(form.get("senha"));
  const perfil = form.get("perfil") === "ADMIN" ? "ADMIN" : "ATENDENTE";
  if (!nome || !email) return { ok: false, mensagem: "Preencha nome e e-mail." };
  if (!emailValido(email)) return { ok: false, mensagem: "E-mail inválido." };
  if (senha.length < 8 || senha.length > 128) return { ok: false, mensagem: "A senha deve ter entre 8 e 128 caracteres." };
  if (await prisma.usuario.findUnique({ where: { email } })) return { ok: false, mensagem: "Já existe um usuário com esse e-mail." };
  await prisma.usuario.create({ data: { nome, email, perfil, senhaHash: await bcrypt.hash(senha, 10) } });
  revalidatePath("/configuracoes");
  return { ok: true, mensagem: "Usuário criado." };
}

export async function alternarUsuario(id: string) {
  const session = await exigirAdmin();
  if (id === session.user.id) return;
  const u = await prisma.usuario.findUnique({ where: { id: String(id).slice(0, 40) } });
  if (!u) return;
  await prisma.usuario.update({ where: { id: u.id }, data: { ativo: !u.ativo, sessaoVersao: { increment: 1 } } });
  revalidatePath("/configuracoes");
}

/** Gera uma senha provisória para o usuário e derruba as sessões abertas dele */
export async function redefinirSenha(id: string): Promise<Resultado & { senha?: string }> {
  const session = await exigirAdmin();
  if (id === session.user.id) return { ok: false, mensagem: "Para a sua própria senha, use Minha conta." };
  const u = await prisma.usuario.findUnique({ where: { id: String(id).slice(0, 40) } });
  if (!u) return { ok: false, mensagem: "Usuário não encontrado." };
  const senha = gerarSenha();
  await prisma.usuario.update({ where: { id: u.id }, data: { senhaHash: await bcrypt.hash(senha, 10), sessaoVersao: { increment: 1 } } });
  // Libera o login caso a pessoa tenha sido bloqueada por tentativas erradas
  await prisma.tentativaLogin.deleteMany({ where: { chave: `email:${u.email}` } });
  return { ok: true, mensagem: `Senha provisória de ${u.nome}:`, senha };
}
