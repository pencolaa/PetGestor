"use client";

import { useActionState, useEffect } from "react";
import { signOut } from "next-auth/react";
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
        <input id="senha-atual" name="atual" type="password" autoComplete="current-password" className="input" required />
      </div>
      <div>
        <label className="label" htmlFor="senha-nova">Nova senha (mínimo 8 caracteres)</label>
        <input id="senha-nova" name="nova" type="password" autoComplete="new-password" minLength={8} maxLength={128} className="input" required />
      </div>
      <div>
        <label className="label" htmlFor="senha-confirma">Confirme a nova senha</label>
        <input id="senha-confirma" name="confirmacao" type="password" autoComplete="new-password" minLength={8} maxLength={128} className="input" required />
      </div>
      <div className="flex items-center gap-3">
        <button className="btn-primary" disabled={pendente || estado?.ok}>{pendente ? "Salvando..." : "Trocar senha"}</button>
        <Mensagem r={estado} />
      </div>
    </form>
  );
}
