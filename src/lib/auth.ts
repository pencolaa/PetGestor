import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { cache } from "react";
import { prisma } from "./prisma";
import { limparEmail, limparSenha } from "./acoes";
import { ERRO_BLOQUEADO, estaBloqueado, ipDaRequisicao, limparFalhas, registrarFalha } from "./limiteLogin";

// Hash bcrypt de uma senha aleatória, usado quando o e-mail não existe
const HASH_FALSO = "$2b$10$CwTycUXWue0Thq9StjUM0uJ8.MPoQ5ZRj1sZ7m5a/4EhG3QeA6gTe";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 60 * 60 * 12 },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "E-mail e senha",
      credentials: {
        email: { label: "E-mail", type: "email" },
        senha: { label: "Senha", type: "password" },
        site: { label: "Site", type: "text" },
      },
      async authorize(credentials, req) {
        // Campo-isca invisível: só robôs preenchem
        if (credentials?.site) return null;
        // Remove espaços e caracteres invisíveis que vêm junto ao copiar e colar
        const email = limparEmail(credentials?.email);
        const senha = limparSenha(credentials?.senha).slice(0, 128);
        if (!email || !senha) return null;

        const ip = ipDaRequisicao(req?.headers);
        if (await estaBloqueado(email, ip)) throw new Error(ERRO_BLOQUEADO);

        const usuario = await prisma.usuario.findUnique({ where: { email } });
        // Compara mesmo sem usuário, para o tempo de resposta não revelar quais e-mails existem
        const ok = await bcrypt.compare(senha, usuario?.senhaHash ?? HASH_FALSO);
        if (!usuario || !usuario.ativo || !ok) {
          await registrarFalha(email, ip);
          return null;
        }
        await limparFalhas(email);
        return { id: usuario.id, name: usuario.nome, email: usuario.email, perfil: usuario.perfil, sessaoVersao: usuario.sessaoVersao };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.perfil = user.perfil;
        token.sessaoVersao = user.sessaoVersao;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.perfil = token.perfil;
      session.user.sessaoVersao = token.sessaoVersao ?? 0;
      return session;
    },
  },
};

export const exigirSessao = cache(async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  // O JWT pode sobreviver ao usuário: confere se ainda existe, está ativo e se a senha não mudou desde o login
  const usuario = await prisma.usuario.findUnique({ where: { id: session.user.id }, select: { ativo: true, perfil: true, nome: true, sessaoVersao: true } });
  if (!usuario?.ativo || usuario.sessaoVersao !== session.user.sessaoVersao) redirect("/sair");
  session.user.perfil = usuario.perfil;
  session.user.name = usuario.nome;
  return session;
});

export async function exigirAdmin() {
  const session = await exigirSessao();
  if (session.user.perfil !== "ADMIN") redirect("/");
  return session;
}
