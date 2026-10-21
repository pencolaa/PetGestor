import Link from "next/link";
import type { CategoriaProduto, Prisma } from "@prisma/client";
import { PackagePlus, Pencil, Plus, Search } from "lucide-react";
import { exigirSessao } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatarMoeda, ROTULO_CATEGORIA } from "@/lib/formato";
import { Cabecalho, Pill, Vazio } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { FormProduto } from "./Forms";

type Busca = { q?: string; categoria?: string; baixo?: string };

export default async function EstoquePage({ searchParams }: { searchParams: Promise<Busca> }) {
  const session = await exigirSessao();
  const admin = session.user.perfil === "ADMIN";
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const categoria = sp.categoria && sp.categoria in ROTULO_CATEGORIA ? (sp.categoria as CategoriaProduto) : undefined;

  const where: Prisma.ProdutoWhereInput = {
    ...(categoria ? { categoria } : {}),
    ...(q ? { OR: [{ nome: { contains: q, mode: "insensitive" } }, { codigoBarras: { contains: q } }] } : {}),
  };
  let produtos = await prisma.produto.findMany({ where, orderBy: [{ ativo: "desc" }, { nome: "asc" }] });
  if (sp.baixo === "1") produtos = produtos.filter((p) => p.ativo && p.estoque <= p.estoqueMinimo);
  const qtdBaixo = (await prisma.produto.findMany({ where: { ativo: true }, select: { estoque: true, estoqueMinimo: true } })).filter((p) => p.estoque <= p.estoqueMinimo).length;

  const link = (extra: Partial<Busca>) => {
    const p = new URLSearchParams({ ...(q ? { q } : {}), ...(categoria ? { categoria } : {}), ...(sp.baixo ? { baixo: sp.baixo } : {}), ...extra });
    for (const [k, v] of [...p.entries()]) if (!v) p.delete(k);
    return `/estoque?${p}`;
  };

  return (
    <>
      <Cabecalho titulo="Estoque" subtitulo={`${produtos.length} produtos · ${qtdBaixo} com estoque baixo`}>
        {admin && (
          <>
            <Link href="/estoque/entrada" className="btn-secondary"><PackagePlus size={16} /> Entrada de mercadoria</Link>
            <Modal titulo="Novo produto" gatilho={<><Plus size={16} /> Novo produto</>}>
              <FormProduto />
            </Modal>
          </>
        )}
      </Cabecalho>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <form className="flex flex-1 gap-2">
          {categoria && <input type="hidden" name="categoria" value={categoria} />}
          <div className="relative flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-suave" />
            <input name="q" defaultValue={q} placeholder="Nome ou código de barras" className="input pl-9" />
          </div>
          <button className="btn-secondary">Buscar</button>
        </form>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <Link href={link({ categoria: "" })} className={`pill shrink-0 border px-3 py-1.5 ${!categoria ? "border-primary bg-primary text-white" : "border-borda bg-white text-suave"}`}>Todas</Link>
          {Object.entries(ROTULO_CATEGORIA).map(([v, r]) => (
            <Link key={v} href={link({ categoria: v })} className={`pill shrink-0 border px-3 py-1.5 ${categoria === v ? "border-primary bg-primary text-white" : "border-borda bg-white text-suave"}`}>{r}</Link>
          ))}
          <Link href={link({ baixo: sp.baixo === "1" ? "" : "1" })} className={`pill shrink-0 border px-3 py-1.5 ${sp.baixo === "1" ? "border-orange-500 bg-orange-500 text-white" : "border-orange-200 bg-orange-50 text-orange-700"}`}>Estoque baixo</Link>
        </div>
      </div>

      <div className="card overflow-x-auto">
        {produtos.length === 0 ? (
          <Vazio>Nenhum produto encontrado.</Vazio>
        ) : (
          <table className="tabela">
            <thead>
              <tr><th>Produto</th><th>Categoria</th><th className="text-right">Preço</th><th className="text-right">Estoque</th><th className="text-right">Mínimo</th><th>Situação</th>{admin && <th></th>}</tr>
            </thead>
            <tbody>
              {produtos.map((p) => (
                <tr key={p.id} className={p.ativo ? "" : "opacity-50"}>
                  <td>
                    <p className="font-medium">{p.nome}</p>
                    {p.codigoBarras && <p className="font-mono text-xs text-suave">{p.codigoBarras}</p>}
                  </td>
                  <td className="text-suave">{ROTULO_CATEGORIA[p.categoria]}</td>
                  <td className="text-right">{formatarMoeda(p.preco)}</td>
                  <td className="text-right font-semibold">{p.estoque}</td>
                  <td className="text-right text-suave">{p.estoqueMinimo}</td>
                  <td>
                    {!p.ativo ? <Pill cor="cinza">Inativo</Pill> : p.estoque === 0 ? <Pill cor="vermelho">Sem estoque</Pill> : p.estoque <= p.estoqueMinimo ? <Pill cor="laranja">Baixo</Pill> : <Pill cor="verde">OK</Pill>}
                  </td>
                  {admin && (
                    <td className="text-right">
                      <Modal titulo="Editar produto" gatilho={<Pencil size={14} />} classeGatilho="rounded-lg p-1.5 text-suave hover:bg-fundo hover:text-texto">
                        <FormProduto produto={p} />
                      </Modal>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
