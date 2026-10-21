import type { Perfil } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & { id: string; perfil: Perfil; sessaoVersao: number };
  }
  interface User {
    perfil: Perfil;
    sessaoVersao: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    perfil: Perfil;
    sessaoVersao?: number;
  }
}
