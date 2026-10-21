"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import type { CategoriaProduto } from "@prisma/client";
import { Mensagem } from "@/components/Mensagem";
import { useFecharModal } from "@/components/Modal";
import { centavosParaInput, ROTULO_CATEGORIA } from "@/lib/formato";
import { registrarEntrada, salvarProduto } from "./actions";

type Produto = {
  id: string; nome: string; codigoBarras: string | null; categoria: CategoriaProduto;
  preco: number; custo: number | null; estoque: number; estoqueMinimo: number; ativo: boolean;
};

export function FormProduto({ produto }: { produto?: Produto }) {
  const [estado, acao, pendente] = useActionState(salvarProduto, null);
  const fechar = useFecharModal();
  useEffect(() => {
    if (estado?.ok) fechar();
  }, [estado, fechar]);

  return (
    <form action={acao} className="grid gap-4 sm:grid-cols-2">
      {produto && <input type="hidden" name="id" value={produto.id} />}
      <div className="sm:col-span-2">
        <label className="label">Nome *</label>
        <input name="nome" defaultValue={produto?.nome} className="input" required />
      </div>
      <div>
        <label className="label">Código de barras</label>
        <input name="codigoBarras" defaultValue={produto?.codigoBarras ?? ""} className="input" inputMode="numeric" />
      </div>
      <div>
        <label className="label">Categoria *</label>
        <select name="categoria" defaultValue={produto?.categoria ?? "RACOES"} className="input">
          {Object.entries(ROTULO_CATEGORIA).map(([v, r]) => (
            <option key={v} value={v}>{r}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Preço de venda (R$) *</label>
        <input name="preco" defaultValue={produto ? centavosParaInput(produto.preco) : ""} className="input" inputMode="decimal" required />
      </div>
      <div>
        <label className="label">Custo (R$)</label>
        <input name="custo" defaultValue={produto?.custo ? centavosParaInput(produto.custo) : ""} className="input" inputMode="decimal" />
      </div>
      <div>
        <label className="label">Estoque mínimo</label>
        <input name="estoqueMinimo" type="number" min={0} defaultValue={produto?.estoqueMinimo ?? 5} className="input" />
      </div>
      {produto && (
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input type="checkbox" name="ativo" defaultChecked={produto.ativo} className="h-4 w-4 accent-[var(--cor-principal)]" /> Ativo (aparece no PDV)
        </label>
      )}
      {!produto && <p className="self-end pb-2 text-xs text-suave">O estoque inicial entra pela tela de entrada de mercadoria.</p>}
      <div className="flex items-center gap-3 sm:col-span-2">
        <button className="btn-primary" disabled={pendente}>{pendente ? "Salvando..." : "Salvar"}</button>
        <Mensagem r={estado?.ok ? null : estado} />
      </div>
    </form>
  );
}

type ProdutoEntrada = { id: string; nome: string; codigoBarras: string | null; estoque: number; custo: number | null };

export function FormEntrada({ produtos }: { produtos: ProdutoEntrada[] }) {
  const [estado, acao, pendente] = useActionState(registrarEntrada, null);
  const [busca, setBusca] = useState("");
  const [produtoId, setProdutoId] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const termo = busca.trim().toLowerCase();
  const opcoes = useMemo(
    () => (termo ? produtos.filter((p) => p.nome.toLowerCase().includes(termo) || p.codigoBarras?.includes(termo)) : produtos),
    [produtos, termo],
  );
  const selecionado = produtos.find((p) => p.id === produtoId);

  useEffect(() => {
    if (estado?.ok) {
      formRef.current?.reset();
      setProdutoId("");
      setBusca("");
    }
  }, [estado]);

  return (
    <form ref={formRef} action={acao} className="grid gap-4 p-5 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="label">Produto (busque por nome ou bipe o código) *</label>
        <input
          value={busca}
          onChange={(e) => {
            setBusca(e.target.value);
            const exato = produtos.find((p) => p.codigoBarras === e.target.value.trim());
            if (exato) setProdutoId(exato.id);
          }}
          placeholder="Filtrar produtos..."
          className="input mb-2"
        />
        <select name="produtoId" value={produtoId} onChange={(e) => setProdutoId(e.target.value)} className="input" required size={Math.min(6, Math.max(2, opcoes.length))}>
          {opcoes.map((p) => (
            <option key={p.id} value={p.id}>{p.nome} — estoque {p.estoque}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Quantidade *</label>
        <input name="quantidade" type="number" min={1} step={1} className="input" required />
      </div>
      <div>
        <label className="label">Custo unitário (R$)</label>
        <input name="custoUnitario" key={produtoId} defaultValue={selecionado?.custo ? centavosParaInput(selecionado.custo) : ""} className="input" inputMode="decimal" />
      </div>
      <div>
        <label className="label">Fornecedor</label>
        <input name="fornecedor" className="input" />
      </div>
      <div>
        <label className="label">Nº da nota fiscal</label>
        <input name="nota" className="input" />
      </div>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button className="btn-primary" disabled={pendente}>{pendente ? "Registrando..." : "Registrar entrada"}</button>
        <Mensagem r={estado} />
      </div>
    </form>
  );
}
