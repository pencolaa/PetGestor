// Utilitários de data sempre no fuso do pet shop, independente do fuso do servidor.
// Datas "de calendário" circulam como string "YYYY-MM-DD".

export const FUSO = "America/Sao_Paulo";
const OFFSET = "-03:00"; // Brasil sem horário de verão desde 2019

const fmtISO = new Intl.DateTimeFormat("en-CA", { timeZone: FUSO });
const fmtHora = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, hour: "2-digit", minute: "2-digit" });

export function diaISO(data: Date = new Date()): string {
  return fmtISO.format(data);
}

export function hojeISO(): string {
  return diaISO(new Date());
}

export function dataHora(dia: string, hhmm = "00:00"): Date {
  return new Date(`${dia}T${hhmm}:00${OFFSET}`);
}

export function inicioDoDia(dia: string): Date {
  return dataHora(dia);
}

export function fimDoDia(dia: string): Date {
  return new Date(dataHora(dia).getTime() + 24 * 60 * 60 * 1000);
}

export function somarDias(dia: string, n: number): string {
  const d = new Date(`${dia}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** 0 = domingo ... 6 = sábado */
export function diaDaSemana(dia: string): number {
  return new Date(`${dia}T12:00:00Z`).getUTCDay();
}

/** Segunda-feira da semana do dia informado */
export function inicioDaSemana(dia: string): string {
  const dow = diaDaSemana(dia);
  return somarDias(dia, dow === 0 ? -6 : 1 - dow);
}

export function inicioDoMes(dia: string): string {
  return `${dia.slice(0, 7)}-01`;
}

export function horaLocal(data: Date): string {
  return fmtHora.format(data);
}

export function diffDias(a: string, b: string): number {
  return Math.round((new Date(`${a}T12:00:00Z`).getTime() - new Date(`${b}T12:00:00Z`).getTime()) / 86400000);
}

export function formatarData(data: Date | string, opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "2-digit", year: "numeric" }): string {
  const d = typeof data === "string" ? new Date(`${data}T12:00:00Z`) : data;
  return new Intl.DateTimeFormat("pt-BR", { timeZone: typeof data === "string" ? "UTC" : FUSO, ...opts }).format(d);
}

export function idade(nascimento: Date | null | undefined, hoje = hojeISO()): string {
  if (!nascimento) return "—";
  const n = diaISO(nascimento);
  let anos = Number(hoje.slice(0, 4)) - Number(n.slice(0, 4));
  let meses = Number(hoje.slice(5, 7)) - Number(n.slice(5, 7));
  if (Number(hoje.slice(8, 10)) < Number(n.slice(8, 10))) meses--;
  if (meses < 0) {
    anos--;
    meses += 12;
  }
  if (anos <= 0) return `${Math.max(meses, 0)} ${meses === 1 ? "mês" : "meses"}`;
  return `${anos} ${anos === 1 ? "ano" : "anos"}`;
}

/** Gera horários "HH:MM" de 30 em 30 min entre abertura e fechamento */
export function gerarHorarios(abertura = "08:00", fechamento = "18:00"): string[] {
  const [ha, ma] = abertura.split(":").map(Number);
  const [hf, mf] = fechamento.split(":").map(Number);
  const out: string[] = [];
  for (let m = ha * 60 + ma; m < hf * 60 + mf; m += 30) {
    out.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
  }
  return out;
}
