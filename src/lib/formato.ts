const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** Recebe centavos e devolve "R$ 12,34" */
export function formatarMoeda(centavos: number): string {
  return moeda.format(centavos / 100);
}

/** Converte texto digitado ("12,50", "12.5", "R$ 12,50") em centavos */
export function parseMoeda(valor: string | number | null | undefined): number {
  if (valor === null || valor === undefined || valor === "") return 0;
  if (typeof valor === "number") return Math.round(valor * 100);
  const limpo = valor.replace(/[^\d,.-]/g, "");
  const normalizado = limpo.includes(",") ? limpo.replace(/\./g, "").replace(",", ".") : limpo;
  const n = Number(normalizado);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

export function centavosParaInput(centavos: number): string {
  return (centavos / 100).toFixed(2).replace(".", ",");
}

export function apenasDigitos(s: string): string {
  return s.replace(/\D/g, "");
}

export function formatarTelefone(tel: string): string {
  const d = apenasDigitos(tel);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return tel;
}

export const ROTULO_ESPECIE = { CAO: "Cão", GATO: "Gato", OUTRO: "Outro" } as const;
export const ROTULO_SEXO = { MACHO: "Macho", FEMEA: "Fêmea" } as const;
export const ROTULO_TIPO_SERVICO = { BANHO: "Banho", TOSA: "Tosa", VETERINARIA: "Veterinária" } as const;
export const ROTULO_CATEGORIA = {
  RACOES: "Rações",
  HIGIENE: "Higiene",
  MEDICAMENTOS: "Medicamentos",
  ACESSORIOS: "Acessórios",
} as const;
export const ROTULO_PAGAMENTO = { PIX: "Pix", CREDITO: "Crédito", DEBITO: "Débito", DINHEIRO: "Dinheiro" } as const;
export const ROTULO_STATUS = {
  AGUARDANDO: "Aguardando",
  CONFIRMADO: "Confirmado",
  EM_ATENDIMENTO: "Em atendimento",
  PRONTO: "Pronto p/ retirada",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
} as const;
