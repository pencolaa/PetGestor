"use client";

import { useActionState, useEffect } from "react";
import { signOut } from "next-auth/react";
import { CampoSenha } from "@/components/CampoSenha";
import { Mensagem } from "@/components/Mensagem";
import { trocarSenha } from "./actions";

export function FormSenha() {
  const [estado, acao, pendente] = useActionState(trocarSenha, null);

  // Depois de trocar, a sessão atual é invalidada: volta para o login
  useEffect(() => {
    if (estado?.ok) {
      const t = setTimeout(() => signOut({ callbackUrl: "/login" }), 1500);
      return () => clearTimeout(t);
    }
  }, [estado]);

  return (
    <form action={acao} className="space-y-4 p-5">
      <div>
        <label className="label" htmlFor="senha-atual">Senha atual</label>
        <CampoSenha id="senha-atual" name="atual" autoComplete="current-password" required />
      </div>
      <div>
        <label className="label" htmlFor="senha-nova">Nova senha (mínimo 8 caracteres)</label>
        <CampoSenha id="senha-nova" name="nova" autoComplete="new-password" minLength={8} maxLength={128} required />
      </div>
      <div>
        <label className="label" htmlFor="senha-confirma">Confirme a nova senha</label>
        <CampoSenha id="senha-confirma" name="confirmacao" autoComplete="new-password" minLength={8} maxLength={128} required />
      </div>
      <div className="flex items-center gap-3">
        <button className="btn-primary" disabled={pendente || estado?.ok}>{pendente ? "Salvando..." : "Trocar senha"}</button>
        <Mensagem r={estado} />
      </div>
    </form>
  );
}
