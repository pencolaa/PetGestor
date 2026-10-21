"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import type { Resultado } from "@/lib/acoes";

type Props = {
  acao: () => Promise<Resultado>;
  confirmacao: string;
  rotulo?: string;
};

/** Botão de exclusão com confirmação; a ação redireciona quando dá certo */
export function BotaoExcluir({ acao, confirmacao, rotulo = "Excluir" }: Props) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState("");

  function excluir() {
    if (!confirm(confirmacao)) return;
    setErro("");
    iniciar(async () => {
      const r = await acao();
      if (r && !r.ok) setErro(r.mensagem);
    });
  }

  return (
    <>
      <button onClick={excluir} disabled={pendente} className="btn-secondary text-red-600 hover:bg-red-50 hover:text-red-700">
        <Trash2 size={16} /> {pendente ? "Excluindo..." : rotulo}
      </button>
      {erro && <span className="self-center text-sm text-red-600">{erro}</span>}
    </>
  );
}
