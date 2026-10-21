export type Resultado = { ok: boolean; mensagem: string; id?: string } | null;

export function texto(form: FormData, campo: string): string {
  return String(form.get(campo) ?? "").trim();
}

export function textoOuNull(form: FormData, campo: string): string | null {
  return texto(form, campo) || null;
}
