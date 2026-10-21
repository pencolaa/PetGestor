export type Resultado = { ok: boolean; mensagem: string; id?: string } | null;

/** Lê um campo de texto do formulário, sem espaços nas pontas e com tamanho máximo */
export function texto(form: FormData, campo: string, max = 200): string {
  return String(form.get(campo) ?? "").trim().slice(0, max);
}

export function textoOuNull(form: FormData, campo: string, max = 200): string | null {
  return texto(form, campo, max) || null;
}

/** "YYYY-MM-DD" que existe no calendário */
export function dataValida(dia: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) return false;
  const d = new Date(`${dia}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === dia;
}

export function horaValida(hora: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(hora);
}

export function emailValido(email: string): boolean {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Inteiro dentro do intervalo, ou null */
export function inteiro(valor: string, min: number, max: number): number | null {
  if (!/^-?\d+$/.test(valor)) return null;
  const n = Number(valor);
  return n >= min && n <= max ? n : null;
}

/** Só aceita endereços http(s), para não virar vetor de javascript: ou data: */
export function urlSegura(valor: string): boolean {
  try {
    const u = new URL(valor);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}
