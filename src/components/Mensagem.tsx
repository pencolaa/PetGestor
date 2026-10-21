import type { Resultado } from "@/lib/acoes";

export function Mensagem({ r }: { r: Resultado }) {
  if (!r) return null;
  return <p className={`text-sm font-medium ${r.ok ? "text-green-700" : "text-red-600"}`}>{r.mensagem}</p>;
}
