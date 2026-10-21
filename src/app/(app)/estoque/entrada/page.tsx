import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { exigirAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatarData, horaLocal } from "@/lib/datas";
import { formatarMoeda } from "@/lib/formato";
import { Cabecalho, CardTitulo, Pill, Vazio } from "@/components/ui";
import { FormEntrada } from "../Forms";

export default async function EntradaPage() {
  await exigirAdmin();
  const [produtos, movimentacoes] = await Promise.all([
    prisma.produto.findMany({ where: { ativo: true }, orderBy: { nome: "asc" }, select: { id: true, nome: true, codigoBarras: true, estoque: true, custo: true } }),
    prisma.movimentacaoEstoque.findMany({ orderBy: { criadoEm: "desc" }, take: 25, include: { produto: true, usuario: true } }),
  ]);

  return (
    <>
      <Link href="/estoque" className="mb-3 inline-flex items-center gap-1 text-sm text-suave hover:text-texto">
        <ArrowLeft size={14} /> Estoque
      </Link>
      <Cabecalho titulo="Entrada de mercadoria" subtitulo="Registre compras de fornecedores para atualizar o estoque" />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card h-fit">
          <CardTitulo titulo="Nova entrada" />
          <FormEntrada produtos={produtos} />
        </section>

        <section className="card">
          <CardTitulo titulo="Últimas movimentações" />
          {movimentacoes.length === 0 ? (
            <Vazio>Nenhuma movimentação.</Vazio>
          ) : (
            <div className="overflow-x-auto">
              <table className="tabela">
                <thead><tr><th>Data</th><th>Produto</th><th>Tipo</th><th className="text-right">Qtd.</th><th className="text-right">Custo</th></tr></thead>
                <tbody>
                  {movimentacoes.map((m) => (
                    <tr key={m.id}>
                      <td className="whitespace-nowrap text-suave">{formatarData(m.criadoEm, { day: "2-digit", month: "2-digit" })} {horaLocal(m.criadoEm)}</td>
                      <td>
                        <p className="font-medium">{m.produto.nome}</p>
                        {m.motivo && <p className="text-xs text-suave">{m.motivo}{m.usuario && ` · ${m.usuario.nome}`}</p>}
                      </td>
                      <td>{m.tipo === "ENTRADA" ? <Pill cor="verde">Entrada</Pill> : m.tipo === "SAIDA" ? <Pill cor="azul">Saída</Pill> : <Pill cor="cinza">Ajuste</Pill>}</td>
                      <td className={`text-right font-semibold ${m.quantidade > 0 ? "text-green-700" : ""}`}>{m.quantidade > 0 ? `+${m.quantidade}` : m.quantidade}</td>
                      <td className="text-right text-suave">{m.custoUnitario ? formatarMoeda(m.custoUnitario) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
