"use client";

import { useState, useTransition } from "react";
import { encerrarHorarioFixo } from "./actions";

/** Encerra um horário fixo (com confirmação) e cancela as datas futuras */
export function BotaoEncerrarFixo({ id, descricao }: { id: string; descricao: string }) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState("");

  function encerrar() {
    if (!confirm(`Encerrar o horário fixo de ${descricao}? As datas futuras serão canceladas.`)) return;
    setErro("");
    iniciar(async () => {
      const r = await encerrarHorarioFixo(id);
      if (!r?.ok) setErro(r?.mensagem ?? "Não foi possível encerrar.");
    });
  }

  return (
    <span className="flex shrink-0 items-center gap-2">
      {erro && <span className="text-xs text-red-600">{erro}</span>}
      <button onClick={encerrar} disabled={pendente} className="btn-ghost px-2 py-1 text-xs text-red-600 hover:bg-red-50 hover:text-red-700">
        {pendente ? "Encerrando..." : "Encerrar"}
      </button>
    </span>
  );
}
