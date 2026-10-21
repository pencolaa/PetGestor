"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { exigirAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Resultado } from "@/lib/acoes";

export async function salvarConfiguracao(_: Resultado, form: FormData): Promise<Resultado> {
  await exigirAdmin();
  const nomePetShop = String(form.get("nomePetShop") ?? "").trim();
  const corPrincipal = String(form.get("corPrincipal") ?? "").trim();
  if (!nomePetShop) return { ok: false, mensagem: "Informe o nome do pet shop." };
  if (!/^#[0-9a-fA-F]{6}$/.test(corPrincipal)) return { ok: false, mensagem: "Cor inválida." };
  const dados = {
    nomePetShop,
    corPrincipal,
    logoUrl: String(form.get("logoUrl") ?? "").trim() || null,
    telefone: String(form.get("telefone") ?? "").trim() || null,
    endereco: String(form.get("endereco") ?? "").trim() || null,
  };
  await prisma.configuracao.upsert({ where: { id: 1 }, create: { id: 1, ...dados }, update: dados });
  revalidatePath("/", "layout");
  return { ok: true, mensagem: "Configurações salvas." };
}

export async function criarUsuario(_: Resultado, form: FormData): Promise<Resultado> {
  await exigirAdmin();
  const nome = String(form.get("nome") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const senha = String(form.get("senha") ?? "");
  const perfil = form.get("perfil") === "ADMIN" ? "ADMIN" : "ATENDENTE";
  if (!nome || !email) return { ok: false, mensagem: "Preencha nome e e-mail." };
  if (senha.length < 6) return { ok: false, mensagem: "A senha deve ter pelo menos 6 caracteres." };
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
