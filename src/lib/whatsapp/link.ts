// Sem dependências de servidor: pode ser usado também em componentes de cliente.
export function linkWaMe(telefone: string, mensagem: string): string {
  const d = telefone.replace(/\D/g, "");
  const numero = d.startsWith("55") && d.length >= 12 ? d : `55${d}`;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
}
