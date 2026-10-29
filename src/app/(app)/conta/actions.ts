"use server";

import bcrypt from "bcryptjs";
import { exigirSessao } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { limparSenha, type Resultado } from "@/lib/acoes";

export async function trocarSenha(_: Resultado, form: FormData): Promise<Resultado> {
  const session = await exigirSessao();
  const atual = limparSenha(form.get("atual")).slice(0, 128);
  const nova = limparSenha(form.get("nova"));
  const confirmacao = limparSenha(form.get("confirmacao"));
  if (nova.length < 8 || nova.length > 128) return { ok: false, mensagem: "A nova senha deve ter entre 8 e 128 caracteres." };
  if (nova !== confirmacao) return { ok: false, mensagem: "A confirmação não confere com a nova senha." };
  if (nova === atual) return { ok: false, mensagem: "A nova senha deve ser diferente da atual." };

  const usuario = await prisma.usuario.findUnique({ where: { id: session.user.id } });
  if (!usuario || !(await bcrypt.compare(atual, usuario.senhaHash))) return { ok: false, mensagem: "Senha atual incorreta." };

  // Incrementar a versão derruba as outras sessões abertas com a senha antiga
  await prisma.usuario.update({ where: { id: usuario.id }, data: { senhaHash: await bcrypt.hash(nova, 10), sessaoVersao: { increment: 1 } } });
  return { ok: true, mensagem: "Senha alterada. Entre novamente com a nova senha." };
}
