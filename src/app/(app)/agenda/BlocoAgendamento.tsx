"use client";

import Link from "next/link";
import { useActionState, useEffect, useState, useTransition } from "react";
import type { StatusAgendamento } from "@prisma/client";
import { CalendarClock, MessageCircle } from "lucide-react";
import { Modal } from "@/components/Modal";
import { StatusPill } from "@/components/ui";
import { formatarMoeda, formatarTelefone, ROTULO_STATUS } from "@/lib/formato";
import { Mensagem } from "@/components/Mensagem";
import { alterarStatus, horariosLivres, linkAvisoAgendamento, remarcarAgendamento } from "./actions";

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
  dia: string;
  duracaoMin: number;
  tipoServico: string;
};

export type ProfissionalAgenda = { id: string; nome: string; tipo: string };

type PropsAg = { ag: AgendamentoBloco; profissionais: ProfissionalAgenda[]; hoje: string };

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

export function BlocoAgendamento({ ag, profissionais, hoje, compacto = false }: PropsAg & { compacto?: boolean }) {
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
      <Detalhes ag={ag} profissionais={profissionais} hoje={hoje} />
    </Modal>
  );
}

/** Linha da visão "Lista": horário, pet, tutor, serviço, profissional e status */
export function LinhaAgendamento({ ag, profissionais, hoje }: PropsAg) {
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
      <Detalhes ag={ag} profissionais={profissionais} hoje={hoje} />
    </Modal>
  );
}

function Detalhes({ ag, profissionais, hoje }: PropsAg) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState("");
  const [remarcando, setRemarcando] = useState(false);
  const podeRemarcar = ag.status !== "CANCELADO" && ag.status !== "CONCLUIDO";

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

      {remarcando && <FormRemarcar ag={ag} profissionais={profissionais} hoje={hoje} aoConcluir={() => setRemarcando(false)} />}

      <div className="flex flex-wrap gap-2 border-t border-borda pt-4">
        {podeRemarcar && !remarcando && (
          <button onClick={() => setRemarcando(true)} className="btn-secondary px-3 py-1.5 text-xs"><CalendarClock size={14} /> Remarcar</button>
        )}
        <button onClick={() => avisar("confirmacao")} className="btn-whatsapp"><MessageCircle size={14} /> Confirmar</button>
        <button onClick={() => avisar("pronto")} className="btn-whatsapp"><MessageCircle size={14} /> Avisar pronto</button>
        {ag.status === "CANCELADO" ? (
          <button onClick={() => mudar("AGUARDANDO")} disabled={pendente} className="btn-ghost ml-auto px-3 py-1.5 text-xs">Reativar</button>
        ) : (
          <button onClick={() => confirm(`Cancelar o agendamento de ${ag.pet} às ${ag.inicio}?`) && mudar("CANCELADO")} disabled={pendente} className="btn-ghost ml-auto px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 hover:text-red-700">Cancelar agendamento</button>
        )}
      </div>
    </div>
  );
}

/** Profissional pode atender o serviço? (tosadores também dão banho) */
function atende(tipoProfissional: string, tipoServico: string) {
  return tipoProfissional === tipoServico || (tipoServico === "BANHO" && tipoProfissional === "TOSA");
}

function FormRemarcar({ ag, profissionais, hoje, aoConcluir }: PropsAg & { aoConcluir: () => void }) {
  const [estado, acao, enviando] = useActionState(remarcarAgendamento, null);
  const aptos = profissionais.filter((p) => atende(p.tipo, ag.tipoServico));
  const [data, setData] = useState(ag.dia < hoje ? hoje : ag.dia);
  const [profissionalId, setProfissionalId] = useState(aptos.some((p) => p.id === ag.profissionalId) ? ag.profissionalId : aptos[0]?.id ?? "");
  const [horarios, setHorarios] = useState<string[] | null>(null);
  const [hora, setHora] = useState("");

  // Horários livres do profissional na data, ignorando o próprio agendamento
  useEffect(() => {
    let ativo = true;
    setHorarios(null);
    horariosLivres(profissionalId, data, ag.duracaoMin, ag.id).then((h) => {
      if (!ativo) return;
      setHorarios(h);
      setHora((atual) => (h.includes(atual) ? atual : h.includes(ag.inicio) && data === ag.dia ? ag.inicio : h[0] ?? ""));
    });
    return () => {
      ativo = false;
    };
  }, [profissionalId, data, ag.duracaoMin, ag.id, ag.inicio, ag.dia]);

  useEffect(() => {
    if (estado?.ok) aoConcluir();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado]);

  return (
    <form action={acao} className="space-y-3 rounded-xl border border-borda bg-fundo p-4">
      <p className="text-sm font-semibold">Remarcar</p>
      <input type="hidden" name="id" value={ag.id} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Data</label>
          <input type="date" name="data" value={data} min={hoje} onChange={(e) => setData(e.target.value)} className="input" required />
        </div>
        <div>
          <label className="label">Profissional</label>
          <select name="profissionalId" value={profissionalId} onChange={(e) => setProfissionalId(e.target.value)} className="input">
            {aptos.map((p) => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="label">Horário livre</label>
        {horarios === null ? (
          <p className="text-sm text-suave">Carregando horários...</p>
        ) : horarios.length === 0 ? (
          <p className="text-sm text-orange-700">Sem horários livres nesta data.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {horarios.map((h) => (
              <button
                type="button"
                key={h}
                onClick={() => setHora(h)}
                className={`rounded-lg border px-2.5 py-1 text-sm font-medium ${hora === h ? "border-primary bg-primary text-white" : "border-borda bg-white hover:border-primary"}`}
              >
                {h}
              </button>
            ))}
          </div>
        )}
        <input type="hidden" name="hora" value={hora} />
      </div>
      <div>
        <label className="label">Observações</label>
        <textarea name="observacoes" rows={2} defaultValue={ag.observacoes ?? ""} maxLength={500} className="input" />
      </div>
      <div className="flex items-center gap-2">
        <button className="btn-primary px-3 py-1.5 text-xs" disabled={enviando || !hora}>{enviando ? "Salvando..." : "Salvar nova data"}</button>
        <button type="button" onClick={aoConcluir} className="btn-ghost px-3 py-1.5 text-xs">Voltar</button>
        <Mensagem r={estado?.ok ? null : estado} />
      </div>
    </form>
  );
}
