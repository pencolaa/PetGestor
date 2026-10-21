"use client";

import { signOut } from "next-auth/react";
import { useEffect } from "react";

/** Encerra a sessão (usado quando o usuário foi desativado ou removido) */
export default function SairPage() {
  useEffect(() => {
    signOut({ callbackUrl: "/login" });
  }, []);
  return <p className="p-8 text-center text-sm text-suave">Encerrando sessão...</p>;
}
