import type { StatusAgendamento } from "@prisma/client";
import { ROTULO_STATUS } from "@/lib/formato";

const COR_STATUS: Record<StatusAgendamento, string> = {
  CONFIRMADO: "bg-blue-50 text-blue-700",
  AGUARDANDO: "bg-orange-50 text-orange-700",
  EM_ATENDIMENTO: "bg-teal-50 text-teal-700",
  PRONTO: "bg-green-50 text-green-700",
  CONCLUIDO: "bg-slate-100 text-slate-600",
  CANCELADO: "bg-red-50 text-red-600",
};

const PONTO_STATUS: Record<StatusAgendamento, string> = {
  CONFIRMADO: "bg-blue-500",
  AGUARDANDO: "bg-orange-500",
  EM_ATENDIMENTO: "bg-teal-500",
  PRONTO: "bg-green-500",
  CONCLUIDO: "bg-slate-400",
  CANCELADO: "bg-red-500",
};

export function StatusPill({ status }: { status: StatusAgendamento }) {
  return (
    <span className={`pill ${COR_STATUS[status]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${PONTO_STATUS[status]}`} />
      {ROTULO_STATUS[status]}
    </span>
  );
}

export function Pill({ cor, children }: { cor: "verde" | "vermelho" | "laranja" | "azul" | "cinza"; children: React.ReactNode }) {
  const classes = {
    verde: "bg-green-50 text-green-700",
    vermelho: "bg-red-50 text-red-600",
    laranja: "bg-orange-50 text-orange-700",
    azul: "bg-blue-50 text-blue-700",
    cinza: "bg-slate-100 text-slate-600",
  }[cor];
  return <span className={`pill ${classes}`}>{children}</span>;
}

export function Cabecalho({ titulo, subtitulo, children }: { titulo: string; subtitulo?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{titulo}</h1>
        {subtitulo && <p className="mt-1 text-sm text-suave">{subtitulo}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export function CardTitulo({ titulo, children }: { titulo: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-borda px-5 py-4">
      <h2 className="font-semibold">{titulo}</h2>
      {children}
    </div>
  );
}

export function Vazio({ children }: { children: React.ReactNode }) {
  return <p className="px-5 py-8 text-center text-sm text-suave">{children}</p>;
}
