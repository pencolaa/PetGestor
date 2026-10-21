import { prisma } from "@/lib/prisma";
import { fimDoDia, hojeISO, horaLocal, inicioDoDia, somarDias } from "@/lib/datas";
import { Cabecalho } from "@/components/ui";
import { Pdv, type AtendimentoPendente } from "./Pdv";

export default async function PdvPage({ searchParams }: { searchParams: Promise<{ agendamento?: string }> }) {
  const { agendamento } = await searchParams;
  const hoje = hojeISO();

  const [produtos, servicos, pendentes] = await Promise.all([
    prisma.produto.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
    prisma.servico.findMany({ where: { ativo: true }, orderBy: [{ tipo: "asc" }, { nome: "asc" }] }),
    // Atendimentos ainda não pagos de ontem e hoje (e o que veio pelo link da agenda)
    prisma.agendamento.findMany({
      where: {
        pago: false,
        status: { not: "CANCELADO" },
        OR: [{ inicio: { gte: inicioDoDia(somarDias(hoje, -1)), lt: fimDoDia(hoje) } }, ...(agendamento ? [{ id: agendamento }] : [])],
      },
      include: { pet: { include: { tutor: true } }, servico: true },
      orderBy: { inicio: "asc" },
    }),
  ]);

  const atendimentos: AtendimentoPendente[] = pendentes.map((a) => ({
    id: a.id,
    servicoId: a.servicoId,
    descricao: `${a.servico.nome} — ${a.pet.nome}`,
    hora: horaLocal(a.inicio),
    valor: a.valorEstimado,
    prontoParaCobrar: ["EM_ATENDIMENTO", "PRONTO", "CONCLUIDO"].includes(a.status),
    tutor: { id: a.pet.tutor.id, nome: a.pet.tutor.nome, telefone: a.pet.tutor.telefone },
  }));

  return (
    <>
      <Cabecalho titulo="Vendas (PDV)" subtitulo="Produtos e serviços no mesmo carrinho" />
      <Pdv
        produtos={produtos.map((p) => ({ id: p.id, nome: p.nome, codigoBarras: p.codigoBarras, categoria: p.categoria, preco: p.preco, estoque: p.estoque, estoqueMinimo: p.estoqueMinimo }))}
        servicos={servicos.map((s) => ({ id: s.id, nome: s.nome, preco: s.preco }))}
        atendimentos={atendimentos}
        agendamentoInicial={agendamento ?? null}
      />
    </>
  );
}
