import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { cache } from "react";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 60 * 60 * 12 },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "E-mail e senha",
      credentials: {
        email: { label: "E-mail", type: "email" },
        senha: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const senha = credentials?.senha;
        if (!email || !senha) return null;
        const usuario = await prisma.usuario.findUnique({ where: { email } });
        if (!usuario || !usuario.ativo) return null;
        const ok = await bcrypt.compare(senha, usuario.senhaHash);
        if (!ok) return null;
        return { id: usuario.id, name: usuario.nome, email: usuario.email, perfil: usuario.perfil };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.perfil = user.perfil;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.perfil = token.perfil;
      return session;
    },
  },
};

export const exigirSessao = cache(async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  // O JWT pode sobreviver ao usuário: confere se ainda existe e está ativo, e usa o perfil atual
  const usuario = await prisma.usuario.findUnique({ where: { id: session.user.id }, select: { ativo: true, perfil: true, nome: true } });
  if (!usuario?.ativo) redirect("/sair");
  session.user.perfil = usuario.perfil;
  session.user.name = usuario.nome;
  return session;
});

export async function exigirAdmin() {
  const session = await exigirSessao();
  if (session.user.perfil !== "ADMIN") redirect("/");
  return session;
}
