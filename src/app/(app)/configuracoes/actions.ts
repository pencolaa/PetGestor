"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { exigirAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emailValido, texto, textoOuNull, urlSegura, type Resultado } from "@/lib/acoes";

export async function salvarConfiguracao(_: Resultado, form: FormData): Promise<Resultado> {
  await exigirAdmin();
  const nomePetShop = texto(form, "nomePetShop", 80);
  const corPrincipal = texto(form, "corPrincipal", 7);
  if (!nomePetShop) return { ok: false, mensagem: "Informe o nome do pet shop." };
  if (!/^#[0-9a-fA-F]{6}$/.test(corPrincipal)) return { ok: false, mensagem: "Cor inválida." };
  const dados = {
    nomePetShop,
    corPrincipal,
    logoUrl: textoOuNull(form, "logoUrl", 500),
    telefone: textoOuNull(form, "telefone", 30),
    endereco: textoOuNull(form, "endereco", 200),
  };
  if (dados.logoUrl && !urlSegura(dados.logoUrl)) return { ok: false, mensagem: "A URL do logo deve começar com https://" };
  await prisma.configuracao.upsert({ where: { id: 1 }, create: { id: 1, ...dados }, update: dados });
  revalidatePath("/", "layout");
  return { ok: true, mensagem: "Configurações salvas." };
}

export async function criarUsuario(_: Resultado, form: FormData): Promise<Resultado> {
  await exigirAdmin();
  const nome = texto(form, "nome", 120);
  const email = texto(form, "email", 254).toLowerCase();
  const senha = String(form.get("senha") ?? "").trim();
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
  const u = await prisma.usuario.findUnique({ where: { id } });
  if (!u) return;
  await prisma.usuario.update({ where: { id }, data: { ativo: !u.ativo } });
  revalidatePath("/configuracoes");
}
