import Link from "next/link";
import { AlertTriangle, CalendarDays, Cake, Droplets, MessageCircle, PawPrint, Syringe, Wallet } from "lucide-react";
import { exigirSessao } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { obterConfiguracao } from "@/lib/configuracao";
import { gerarLembretes, type Lembrete } from "@/lib/lembretes";
import { fimDoDia, formatarData, hojeISO, horaLocal, inicioDoDia, inicioDoMes, FUSO } from "@/lib/datas";
import { formatarMoeda } from "@/lib/formato";
import { CardTitulo, StatusPill, Vazio } from "@/components/ui";

function saudacao() {
  const hora = Number(new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, hour: "numeric", hourCycle: "h23" }).format(new Date()));
  return hora >= 5 && hora < 12 ? "Bom dia" : hora >= 12 && hora < 18 ? "Boa tarde" : "Boa noite";
}

const ICONE_LEMBRETE: Record<Lembrete["tipo"], { icone: typeof Syringe; cor: string }> = {
  VACINA: { icone: Syringe, cor: "bg-red-50 text-red-600" },
  BANHO: { icone: Droplets, cor: "bg-sky-50 text-sky-600" },
  ANIVERSARIO: { icone: Cake, cor: "bg-pink-50 text-pink-600" },
};

export default async function PainelPage() {
  const session = await exigirSessao();
  const config = await obterConfiguracao();
  const hoje = hojeISO();
  const ini = inicioDoDia(hoje);
  const fim = fimDoDia(hoje);

  const [agendamentosHoje, itensHoje, vendasHoje, atendidosMes, produtosAtivos, lembretes] = await Promise.all([
    prisma.agendamento.findMany({
      where: { inicio: { gte: ini, lt: fim }, status: { not: "CANCELADO" } },
      include: { pet: { include: { tutor: true } }, servico: true, profissional: true },
      orderBy: { inicio: "asc" },
    }),
    prisma.itemVenda.findMany({ where: { venda: { criadoEm: { gte: ini, lt: fim } } }, select: { total: true, produtoId: true } }),
    prisma.venda.aggregate({ where: { criadoEm: { gte: ini, lt: fim } }, _sum: { total: true, desconto: true }, _count: true }),
    prisma.agendamento.findMany({
      where: { inicio: { gte: inicioDoDia(inicioDoMes(hoje)), lt: fim }, status: { in: ["EM_ATENDIMENTO", "PRONTO", "CONCLUIDO"] } },
      distinct: ["petId"],
      select: { petId: true },
    }),
    prisma.produto.findMany({ where: { ativo: true }, orderBy: { estoque: "asc" } }),
    gerarLembretes(config.nomePetShop),
  ]);

  const estoqueBaixo = produtosAtivos.filter((p) => p.estoque <= p.estoqueMinimo);
  const fatServicos = itensHoje.filter((i) => !i.produtoId).reduce((a, i) => a + i.total, 0);
  const fatProdutos = itensHoje.filter((i) => i.produtoId).reduce((a, i) => a + i.total, 0);
  const fatTotal = vendasHoje._sum.total ?? 0;
  const descontos = vendasHoje._sum.desconto ?? 0;
  const concluidos = agendamentosHoje.filter((a) => a.status === "CONCLUIDO" || a.status === "PRONTO").length;
  const primeiroNome = (session.user.name ?? "").split(" ")[0];

  const cards = [
    {
      titulo: "Agendamentos hoje",
      valor: String(agendamentosHoje.length),
      detalhe: `${concluidos} prontos/concluídos · ${agendamentosHoje.length - concluidos} pendentes`,
      icone: CalendarDays,
      href: "/agenda",
    },
    {
      titulo: "Faturamento do dia",
      valor: formatarMoeda(fatTotal),
      detalhe: (
        <>
          Serviços {formatarMoeda(fatServicos)} · Produtos {formatarMoeda(fatProdutos)}
          {descontos > 0 && <> · Descontos −{formatarMoeda(descontos)}</>}
        </>
      ),
      icone: Wallet,
      href: "/pdv",
    },
    { titulo: "Pets atendidos no mês", valor: String(atendidosMes.length), detalhe: formatarData(hoje, { month: "long", year: "numeric" }), icone: PawPrint, href: "/clientes" },
    {
      titulo: "Estoque baixo",
      valor: String(estoqueBaixo.length),
      detalhe: estoqueBaixo.length ? `${estoqueBaixo.filter((p) => p.estoque === 0).length} sem estoque` : "Tudo em ordem",
      icone: AlertTriangle,
      href: "/estoque?baixo=1",
      alerta: estoqueBaixo.length > 0,
    },
  ];

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">{saudacao()}, {primeiroNome}! 👋</h1>
        <p className="mt-1 text-sm text-suave first-letter:uppercase">{formatarData(hoje, { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ titulo, valor, detalhe, icone: Icone, href, alerta }) => (
          <Link key={titulo} href={href} className="card p-5 transition hover:border-primary">
            <div className="flex items-start justify-between">
              <p className="text-sm font-medium text-suave">{titulo}</p>
              <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${alerta ? "bg-orange-50 text-orange-600" : "bg-primary-soft text-primary"}`}>
                <Icone size={18} />
              </span>
            </div>
            <p className={`mt-2 text-2xl font-bold ${alerta ? "text-orange-600" : ""}`}>{valor}</p>
            <p className="mt-1 text-xs text-suave">{detalhe}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="card min-w-0 xl:col-span-2">
          <CardTitulo titulo="Atendimentos de hoje">
            <Link href="/agenda" className="text-sm font-semibold text-primary hover:underline">Ver agenda</Link>
          </CardTitulo>
          {agendamentosHoje.length === 0 ? (
            <Vazio>Nenhum atendimento agendado para hoje.</Vazio>
          ) : (
            <div className="overflow-x-auto">
              <table className="tabela">
                <thead><tr><th>Horário</th><th>Pet</th><th>Serviço</th><th>Profissional</th><th>Status</th></tr></thead>
                <tbody>
                  {agendamentosHoje.map((a) => (
                    <tr key={a.id}>
                      <td className="whitespace-nowrap font-semibold">{horaLocal(a.inicio)}</td>
                      <td>
                        <Link href={`/clientes/pets/${a.petId}`} className="font-medium hover:text-primary">{a.pet.nome}</Link>
                        <p className="text-xs text-suave">{a.pet.tutor.nome}</p>
                      </td>
                      <td>{a.servico.nome}</td>
                      <td className="text-suave">{a.profissional.nome}</td>
                      <td><StatusPill status={a.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="space-y-6">
          <section className="card">
            <CardTitulo titulo={`Lembretes (${lembretes.length})`} />
            {lembretes.length === 0 ? (
              <Vazio>Nenhum lembrete por enquanto.</Vazio>
            ) : (
              <ul className="max-h-[420px] divide-y divide-borda overflow-y-auto">
                {lembretes.map((l) => {
                  const { icone: Icone, cor } = ICONE_LEMBRETE[l.tipo];
                  return (
                    <li key={l.id} className="flex items-center gap-3 px-5 py-3">
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${cor}`}><Icone size={16} /></span>
                      <Link href={`/clientes/pets/${l.petId}`} className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{l.titulo}</p>
                        <p className={`truncate text-xs ${l.urgente ? "font-semibold text-red-600" : "text-suave"}`}>{l.detalhe}</p>
                      </Link>
                      <a href={l.whatsapp} target="_blank" rel="noopener noreferrer" className="btn-whatsapp shrink-0">
                        <MessageCircle size={14} /> WhatsApp
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="card">
            <CardTitulo titulo="Estoque baixo">
              <Link href="/estoque?baixo=1" className="text-sm font-semibold text-primary hover:underline">Ver todos</Link>
            </CardTitulo>
            {estoqueBaixo.length === 0 ? (
              <Vazio>Nenhum produto abaixo do mínimo.</Vazio>
            ) : (
              <ul className="divide-y divide-borda">
                {estoqueBaixo.slice(0, 6).map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                    <span className="truncate">{p.nome}</span>
                    <span className={`shrink-0 font-semibold ${p.estoque === 0 ? "text-red-600" : "text-orange-600"}`}>
                      {p.estoque} <span className="font-normal text-suave">/ mín. {p.estoqueMinimo}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
