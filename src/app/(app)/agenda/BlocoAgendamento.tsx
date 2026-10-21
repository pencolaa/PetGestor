"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { StatusAgendamento } from "@prisma/client";
import { MessageCircle } from "lucide-react";
import { Modal } from "@/components/Modal";
import { StatusPill } from "@/components/ui";
import { formatarMoeda, formatarTelefone, ROTULO_STATUS } from "@/lib/formato";
import { alterarStatus, linkAvisoAgendamento } from "./actions";

export type AgendamentoBloco = {
  id: string;
  inicio: string;
  fim: string;
  status: StatusAgendamento;
  pet: string;
  petId: string;
  especie: string;
  tutor: string;
  telefone: string;
  servico: string;
  profissional: string;
  profissionalId: string;
  valor: number;
  pacote: boolean;
  observacoes: string | null;
};

const BORDA: Record<StatusAgendamento, string> = {
  CONFIRMADO: "border-l-blue-500 bg-blue-50/70",
  AGUARDANDO: "border-l-orange-500 bg-orange-50/70",
  EM_ATENDIMENTO: "border-l-teal-500 bg-teal-50/70",
  PRONTO: "border-l-green-500 bg-green-50/70",
  CONCLUIDO: "border-l-slate-400 bg-slate-50",
  CANCELADO: "border-l-red-400 bg-red-50/50 line-through opacity-60",
};

const FLUXO: StatusAgendamento[] = ["AGUARDANDO", "CONFIRMADO", "EM_ATENDIMENTO", "PRONTO", "CONCLUIDO"];

function emoji(especie: string) {
  return especie === "GATO" ? "🐱" : especie === "CAO" ? "🐶" : "🐾";
}

export function BlocoAgendamento({ ag, compacto = false }: { ag: AgendamentoBloco; compacto?: boolean }) {
  return (
    <Modal
      titulo={`${emoji(ag.especie)} ${ag.pet} — ${ag.servico}`}
      classeGatilho={`flex h-full w-full flex-col justify-start overflow-hidden rounded-lg border border-borda border-l-4 px-2 py-1 text-left text-xs transition hover:shadow-md ${BORDA[ag.status]}`}
      gatilho={
        compacto ? (
          <>
            <p className="font-semibold">{ag.inicio} {emoji(ag.especie)} {ag.pet}</p>
            <p className="truncate text-suave">{ag.servico} · {ag.profissional}</p>
          </>
        ) : (
          <>
            <p className="flex items-center justify-between gap-1">
              <span className="truncate font-semibold">{emoji(ag.especie)} {ag.pet}</span>
              <span className="shrink-0 text-suave">{ag.inicio}</span>
            </p>
            <p className="truncate text-suave">{ag.servico}</p>
            <p className="truncate text-suave">{ag.tutor}</p>
          </>
        )
      }
    >
      <Detalhes ag={ag} />
    </Modal>
  );
}

/** Linha da visão "Lista": horário, pet, tutor, serviço, profissional e status */
export function LinhaAgendamento({ ag }: { ag: AgendamentoBloco }) {
  return (
    <Modal
      titulo={`${emoji(ag.especie)} ${ag.pet} — ${ag.servico}`}
      classeGatilho="grid w-full grid-cols-[88px_1fr] items-center gap-x-4 gap-y-1 px-5 py-3 text-left text-sm transition hover:bg-fundo sm:grid-cols-[76px_1fr_1.3fr_100px_150px]"
      gatilho={
        <>
          <span className="font-semibold tabular-nums">{ag.inicio}<span className="block text-xs font-normal text-suave">até {ag.fim}</span></span>
          <span className="min-w-0">
            <span className="block truncate font-semibold">{emoji(ag.especie)} {ag.pet}</span>
            <span className="block truncate text-xs text-suave">{ag.tutor}</span>
          </span>
          <span className="col-start-2 truncate text-suave sm:col-start-auto">{ag.servico}</span>
          <span className="col-start-2 truncate text-suave sm:col-start-auto">{ag.profissional}</span>
          <span className="col-start-2 sm:col-start-auto"><StatusPill status={ag.status} /></span>
        </>
      }
    >
      <Detalhes ag={ag} />
    </Modal>
  );
}

function Detalhes({ ag }: { ag: AgendamentoBloco }) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState("");

  function mudar(status: StatusAgendamento) {
    setErro("");
    iniciar(async () => {
      const r = await alterarStatus(ag.id, status);
      if (r && !r.ok) setErro(r.mensagem);
    });
  }

  function avisar(tipo: "confirmacao" | "pronto") {
    // Abre a aba já no clique (evita bloqueio de pop-up) e depois aponta para o link gerado
    const aba = window.open("", "_blank");
    linkAvisoAgendamento(ag.id, tipo).then((url) => {
      if (url && aba) aba.location.href = url;
      else aba?.close();
    });
  }

  const linhas: [string, React.ReactNode][] = [
    ["Horário", `${ag.inicio} – ${ag.fim}`],
    ["Profissional", ag.profissional],
    ["Tutor", `${ag.tutor} · ${formatarTelefone(ag.telefone)}`],
    ["Valor", ag.pacote ? "Pacote de banhos" : formatarMoeda(ag.valor)],
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <StatusPill status={ag.status} />
        <Link href={`/clientes/pets/${ag.petId}`} className="text-sm font-semibold text-primary hover:underline">Ficha do pet</Link>
      </div>

      <dl className="divide-y divide-borda rounded-xl border border-borda text-sm">
        {linhas.map(([r, v]) => (
          <div key={r} className="flex justify-between gap-4 px-4 py-2">
            <dt className="text-suave">{r}</dt>
            <dd className="text-right">{v}</dd>
          </div>
        ))}
        {ag.observacoes && <div className="px-4 py-2 text-suave">📝 {ag.observacoes}</div>}
      </dl>

      <div>
        <p className="label">Alterar status</p>
        <div className="flex flex-wrap gap-2">
          {FLUXO.map((s) => (
            <button
              key={s}
              onClick={() => mudar(s)}
              disabled={pendente || ag.status === s}
              className={`btn px-3 py-1.5 text-xs ${ag.status === s ? "bg-primary text-white" : "border border-borda bg-white hover:bg-fundo"}`}
            >
              {ROTULO_STATUS[s]}
            </button>
          ))}
        </div>
        {erro && <p className="mt-2 text-sm font-medium text-red-600">{erro}</p>}
      </div>

      <div className="flex flex-wrap gap-2 border-t border-borda pt-4">
        <button onClick={() => avisar("confirmacao")} className="btn-whatsapp"><MessageCircle size={14} /> Confirmar</button>
        <button onClick={() => avisar("pronto")} className="btn-whatsapp"><MessageCircle size={14} /> Avisar pronto</button>
        {ag.status === "CANCELADO" ? (
          <button onClick={() => mudar("AGUARDANDO")} disabled={pendente} className="btn-ghost ml-auto px-3 py-1.5 text-xs">Reativar</button>
        ) : (
          <button onClick={() => mudar("CANCELADO")} disabled={pendente} className="btn-ghost ml-auto px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 hover:text-red-700">Cancelar agendamento</button>
        )}
      </div>
    </div>
  );
}
