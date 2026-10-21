"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CategoriaProduto, FormaPagamento } from "@prisma/client";
import { Banknote, CheckCircle2, CreditCard, Minus, Plus, QrCode, ScanBarcode, Scissors, Trash2, UserRound, X } from "lucide-react";
import { centavosParaInput, formatarMoeda, formatarTelefone, parseMoeda, ROTULO_CATEGORIA, ROTULO_PAGAMENTO } from "@/lib/formato";
import { buscarTutores, finalizarVenda, type ItemCarrinho, type TutorBusca } from "./actions";

type Produto = { id: string; nome: string; codigoBarras: string | null; categoria: CategoriaProduto; preco: number; estoque: number; estoqueMinimo: number };
type Servico = { id: string; nome: string; preco: number };
export type AtendimentoPendente = { id: string; servicoId: string; descricao: string; hora: string; valor: number; prontoParaCobrar: boolean; tutor: TutorBusca };

type Linha = {
  chave: string;
  descricao: string;
  preco: number;
  quantidade: number;
  max?: number; // estoque disponível (produtos)
  item: ItemCarrinho;
};

type Filtro = CategoriaProduto | "SERVICOS" | "TODOS";
const FILTROS: Filtro[] = ["TODOS", "RACOES", "HIGIENE", "MEDICAMENTOS", "ACESSORIOS", "SERVICOS"];

const PAGAMENTOS: { forma: FormaPagamento; icone: typeof QrCode }[] = [
  { forma: "PIX", icone: QrCode },
  { forma: "CREDITO", icone: CreditCard },
  { forma: "DEBITO", icone: CreditCard },
  { forma: "DINHEIRO", icone: Banknote },
];

type Props = { produtos: Produto[]; servicos: Servico[]; atendimentos: AtendimentoPendente[]; agendamentoInicial: string | null };

export function Pdv({ produtos, servicos, atendimentos, agendamentoInicial }: Props) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("TODOS");
  const [carrinho, setCarrinho] = useState<Linha[]>([]);
  const [tutor, setTutor] = useState<TutorBusca | null>(null);
  const [descontoTexto, setDescontoTexto] = useState("");
  const [descontoPct, setDescontoPct] = useState(false);
  const [forma, setForma] = useState<FormaPagamento>("PIX");
  const [recebido, setRecebido] = useState("");
  const [erro, setErro] = useState("");
  const [concluida, setConcluida] = useState<{ total: number; troco: number } | null>(null);
  const [pendente, iniciar] = useTransition();
  const buscaRef = useRef<HTMLInputElement>(null);

  // Vindo da agenda ("Cobrar no PDV"): já coloca o atendimento no carrinho
  const carregouInicial = useRef(false);
  useEffect(() => {
    if (carregouInicial.current || !agendamentoInicial) return;
    const a = atendimentos.find((x) => x.id === agendamentoInicial);
    if (a) adicionarAtendimento(a);
    carregouInicial.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const termo = busca.trim().toLowerCase();
  const produtosFiltrados = useMemo(
    () =>
      produtos.filter(
        (p) => (filtro === "TODOS" || p.categoria === filtro) && (!termo || p.nome.toLowerCase().includes(termo) || p.codigoBarras?.includes(termo)),
      ),
    [produtos, filtro, termo],
  );
  const servicosFiltrados = servicos.filter((s) => !termo || s.nome.toLowerCase().includes(termo));
  // Em "Todos" mostramos só quem está sendo atendido ou pronto; a lista completa fica em "Serviços"
  const atendimentosFiltrados = atendimentos.filter(
    (a) =>
      !carrinho.some((l) => l.chave === `ag:${a.id}`) &&
      (filtro === "SERVICOS" || a.prontoParaCobrar || a.id === agendamentoInicial) &&
      (!termo || a.descricao.toLowerCase().includes(termo)),
  );

  const subtotal = carrinho.reduce((acc, l) => acc + l.preco * l.quantidade, 0);
  const descontoBruto = descontoPct ? Math.round((subtotal * (Number(descontoTexto.replace(",", ".")) || 0)) / 100) : parseMoeda(descontoTexto);
  const desconto = Math.min(Math.max(descontoBruto, 0), subtotal);
  const total = subtotal - desconto;
  const recebidoCentavos = parseMoeda(recebido);
  const troco = forma === "DINHEIRO" && recebidoCentavos > total ? recebidoCentavos - total : 0;

  function quantidadeNoCarrinho(chave: string) {
    return carrinho.find((l) => l.chave === chave)?.quantidade ?? 0;
  }

  function adicionarProduto(p: Produto) {
    setErro("");
    const chave = `p:${p.id}`;
    if (quantidadeNoCarrinho(chave) >= p.estoque) {
      setErro(`Estoque insuficiente de ${p.nome} (${p.estoque} disponíveis).`);
      return;
    }
    setCarrinho((c) =>
      c.some((l) => l.chave === chave)
        ? c.map((l) => (l.chave === chave ? { ...l, quantidade: l.quantidade + 1 } : l))
        : [...c, { chave, descricao: p.nome, preco: p.preco, quantidade: 1, max: p.estoque, item: { tipo: "produto", produtoId: p.id, quantidade: 1 } }],
    );
  }

  function adicionarServico(s: Servico) {
    const chave = `s:${s.id}`;
    setCarrinho((c) =>
      c.some((l) => l.chave === chave)
        ? c.map((l) => (l.chave === chave ? { ...l, quantidade: l.quantidade + 1 } : l))
        : [...c, { chave, descricao: s.nome, preco: s.preco, quantidade: 1, item: { tipo: "servico", servicoId: s.id, quantidade: 1 } }],
    );
  }

  function adicionarAtendimento(a: AtendimentoPendente) {
    const chave = `ag:${a.id}`;
    setCarrinho((c) =>
      c.some((l) => l.chave === chave)
        ? c
        : [...c, { chave, descricao: `${a.descricao} (${a.hora})`, preco: a.valor, quantidade: 1, max: 1, item: { tipo: "servico", servicoId: a.servicoId, agendamentoId: a.id, quantidade: 1 } }],
    );
    setTutor((t) => t ?? a.tutor);
  }

  function alterarQuantidade(chave: string, delta: number) {
    setErro("");
    setCarrinho((c) =>
      c.flatMap((l) => {
        if (l.chave !== chave) return [l];
        const q = l.quantidade + delta;
        if (q <= 0) return [];
        if (l.max !== undefined && q > l.max) {
          setErro(`Limite de ${l.max} para ${l.descricao}.`);
          return [l];
        }
        return [{ ...l, quantidade: q }];
      }),
    );
  }

  // Leitor de código de barras: digita o código e envia Enter
  function onBuscaEnter(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const codigo = busca.trim();
    const exato = produtos.find((p) => p.codigoBarras === codigo);
    const unico = produtosFiltrados.length === 1 ? produtosFiltrados[0] : undefined;
    const alvo = exato ?? unico;
    if (alvo) {
      adicionarProduto(alvo);
      setBusca("");
    }
  }

  function finalizar() {
    setErro("");
    if (forma === "DINHEIRO" && recebido && recebidoCentavos < total) {
      setErro("Valor recebido menor que o total.");
      return;
    }
    iniciar(async () => {
      const r = await finalizarVenda({
        itens: carrinho.map((l) => ({ ...l.item, quantidade: l.quantidade })),
        tutorId: tutor?.id ?? null,
        desconto,
        formaPagamento: forma,
      });
      if (!r.ok) {
        setErro(r.mensagem);
        return;
      }
      setConcluida({ total: r.total, troco });
      router.refresh();
    });
  }

  function novaVenda() {
    setCarrinho([]);
    setTutor(null);
    setDescontoTexto("");
    setRecebido("");
    setForma("PIX");
    setConcluida(null);
    setErro("");
    if (agendamentoInicial) router.replace("/pdv");
    buscaRef.current?.focus();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_400px]">
      {/* Catálogo */}
      <div className="min-w-0 space-y-4">
        <div className="relative">
          <ScanBarcode size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-suave" />
          <input
            ref={buscaRef}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            onKeyDown={onBuscaEnter}
            placeholder="Buscar por nome ou código de barras (Enter adiciona)"
            className="input py-2.5 pl-10"
            autoFocus
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTROS.map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${filtro === f ? "border-primary bg-primary text-white" : "border-borda bg-white text-suave hover:text-texto"}`}
            >
              {f === "TODOS" ? "Todos" : f === "SERVICOS" ? "Serviços" : ROTULO_CATEGORIA[f]}
            </button>
          ))}
        </div>

        {(filtro === "SERVICOS" || filtro === "TODOS") && atendimentosFiltrados.length > 0 && (
          <div className="card p-4">
            <p className="mb-3 text-sm font-semibold">Atendimentos a cobrar</p>
            <div className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-3">
              {atendimentosFiltrados.map((a) => (
                <button key={a.id} onClick={() => adicionarAtendimento(a)} className="rounded-xl border border-dashed border-primary/40 bg-primary-soft p-3 text-left text-sm transition hover:border-primary">
                  <p className="font-semibold">{a.descricao}</p>
                  <p className="text-xs text-suave">{a.hora} · {a.tutor.nome}</p>
                  <p className="mt-1 font-bold text-primary">{a.valor === 0 ? "Pacote" : formatarMoeda(a.valor)}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filtro === "SERVICOS"
            ? servicosFiltrados.map((s) => (
                <button key={s.id} onClick={() => adicionarServico(s)} className="card flex flex-col p-4 text-left transition hover:border-primary hover:shadow-sm">
                  <Scissors size={18} className="mb-2 text-primary" />
                  <p className="flex-1 text-sm font-semibold">{s.nome}</p>
                  <p className="mt-2 font-bold">{formatarMoeda(s.preco)}</p>
                  <p className="text-xs text-suave">Serviço avulso</p>
                </button>
              ))
            : produtosFiltrados.map((p) => {
                const baixo = p.estoque <= p.estoqueMinimo;
                const semEstoque = p.estoque - quantidadeNoCarrinho(`p:${p.id}`) <= 0;
                return (
                  <button
                    key={p.id}
                    onClick={() => adicionarProduto(p)}
                    disabled={semEstoque}
                    className={`card flex flex-col p-4 text-left transition hover:border-primary hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-60 ${baixo ? "border-orange-300" : ""}`}
                  >
                    <p className="text-xs font-medium text-suave">{ROTULO_CATEGORIA[p.categoria]}</p>
                    <p className="mt-1 flex-1 text-sm font-semibold leading-snug">{p.nome}</p>
                    <p className="mt-2 font-bold">{formatarMoeda(p.preco)}</p>
                    <p className={`text-xs font-medium ${p.estoque === 0 ? "text-red-600" : baixo ? "text-orange-600" : "text-suave"}`}>
                      {p.estoque === 0 ? "Sem estoque" : `${p.estoque} em estoque${baixo ? " · baixo" : ""}`}
                    </p>
                  </button>
                );
              })}
          {filtro !== "SERVICOS" && produtosFiltrados.length === 0 && <p className="col-span-full py-8 text-center text-sm text-suave">Nenhum produto encontrado.</p>}
        </div>
      </div>

      {/* Carrinho */}
      <aside className="card flex h-fit flex-col lg:sticky lg:top-8">
        {concluida ? (
          <div className="space-y-4 p-6 text-center">
            <CheckCircle2 size={48} className="mx-auto text-green-600" />
            <div>
              <p className="text-lg font-bold">Venda finalizada!</p>
              <p className="text-sm text-suave">{ROTULO_PAGAMENTO[forma]} · {formatarMoeda(concluida.total)}</p>
              {concluida.troco > 0 && <p className="mt-2 text-xl font-bold text-primary">Troco: {formatarMoeda(concluida.troco)}</p>}
            </div>
            <button onClick={novaVenda} className="btn-primary w-full">Nova venda</button>
          </div>
        ) : (
          <>
            <div className="border-b border-borda p-4">
              <p className="mb-2 font-semibold">Carrinho</p>
              <SeletorCliente tutor={tutor} onChange={setTutor} />
            </div>

            <div className="max-h-[40vh] flex-1 divide-y divide-borda overflow-y-auto">
              {carrinho.length === 0 && <p className="p-6 text-center text-sm text-suave">Adicione produtos ou serviços.</p>}
              {carrinho.map((l) => (
                <div key={l.chave} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{l.descricao}</p>
                    <p className="text-xs text-suave">{formatarMoeda(l.preco)} {l.item.tipo === "servico" && "· serviço"}</p>
                  </div>
                  {l.chave.startsWith("ag:") ? (
                    <button onClick={() => alterarQuantidade(l.chave, -1)} className="rounded p-1 text-suave hover:bg-red-50 hover:text-red-600" aria-label="Remover"><Trash2 size={14} /></button>
                  ) : (
                    <div className="flex items-center rounded-lg border border-borda">
                      <button onClick={() => alterarQuantidade(l.chave, -1)} className="p-1.5 text-suave hover:text-texto" aria-label="Diminuir"><Minus size={12} /></button>
                      <span className="w-6 text-center text-sm font-semibold">{l.quantidade}</span>
                      <button onClick={() => alterarQuantidade(l.chave, 1)} className="p-1.5 text-suave hover:text-texto" aria-label="Aumentar"><Plus size={12} /></button>
                    </div>
                  )}
                  <p className="w-20 text-right text-sm font-semibold">{formatarMoeda(l.preco * l.quantidade)}</p>
                </div>
              ))}
            </div>

            <div className="space-y-4 border-t border-borda p-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-suave" htmlFor="desconto">Desconto</label>
                <input id="desconto" value={descontoTexto} onChange={(e) => setDescontoTexto(e.target.value)} placeholder="0" inputMode="decimal" className="input ml-auto w-24 py-1.5 text-right" />
                <div className="flex rounded-lg border border-borda p-0.5 text-xs font-semibold">
                  <button onClick={() => setDescontoPct(false)} className={`rounded-md px-2 py-1 ${!descontoPct ? "bg-primary text-white" : "text-suave"}`}>R$</button>
                  <button onClick={() => setDescontoPct(true)} className={`rounded-md px-2 py-1 ${descontoPct ? "bg-primary text-white" : "text-suave"}`}>%</button>
                </div>
              </div>

              <div className="space-y-1 text-sm">
                <div className="flex justify-between text-suave"><span>Subtotal</span><span>{formatarMoeda(subtotal)}</span></div>
                {desconto > 0 && <div className="flex justify-between text-red-600"><span>Desconto</span><span>− {formatarMoeda(desconto)}</span></div>}
                <div className="flex justify-between pt-1 text-xl font-bold"><span>Total</span><span>{formatarMoeda(total)}</span></div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {PAGAMENTOS.map(({ forma: f, icone: Icone }) => (
                  <button
                    key={f}
                    onClick={() => setForma(f)}
                    className={`flex flex-col items-center gap-1 rounded-lg border px-1 py-2 text-xs font-semibold transition ${forma === f ? "border-primary bg-primary-soft text-primary" : "border-borda text-suave hover:text-texto"}`}
                  >
                    <Icone size={18} />
                    {ROTULO_PAGAMENTO[f]}
                  </button>
                ))}
              </div>

              {forma === "DINHEIRO" && (
                <div className="flex items-center gap-2 text-sm">
                  <label htmlFor="recebido" className="text-suave">Valor recebido</label>
                  <input id="recebido" value={recebido} onChange={(e) => setRecebido(e.target.value)} placeholder={centavosParaInput(total)} inputMode="decimal" className="input ml-auto w-28 py-1.5 text-right" />
                  {troco > 0 && <span className="font-semibold text-primary">Troco {formatarMoeda(troco)}</span>}
                </div>
              )}

              {erro && <p className="text-sm font-medium text-red-600">{erro}</p>}
              <button onClick={finalizar} disabled={pendente || carrinho.length === 0} className="btn-primary w-full py-3 text-base">
                {pendente ? "Finalizando..." : `Finalizar venda · ${formatarMoeda(total)}`}
              </button>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

function SeletorCliente({ tutor, onChange }: { tutor: TutorBusca | null; onChange: (t: TutorBusca | null) => void }) {
  const [q, setQ] = useState("");
  const [res, setRes] = useState<TutorBusca[]>([]);

  useEffect(() => {
    if (q.trim().length < 2) {
      setRes([]);
      return;
    }
    const t = setTimeout(() => buscarTutores(q).then(setRes), 250);
    return () => clearTimeout(t);
  }, [q]);

  if (tutor) {
    return (
      <div className="flex items-center justify-between rounded-lg bg-primary-soft px-3 py-2 text-sm">
        <span className="flex items-center gap-2"><UserRound size={14} className="text-primary" /><strong>{tutor.nome}</strong> <span className="text-suave">{formatarTelefone(tutor.telefone)}</span></span>
        <button onClick={() => onChange(null)} className="rounded p-0.5 text-suave hover:bg-white" aria-label="Remover cliente"><X size={14} /></button>
      </div>
    );
  }
  return (
    <div className="relative">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Vincular cliente (nome, telefone ou pet)" className="input py-1.5" />
      {res.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-borda bg-white shadow-lg">
          {res.map((t) => (
            <li key={t.id}>
              <button onClick={() => { onChange(t); setQ(""); }} className="w-full px-3 py-2 text-left text-sm hover:bg-fundo">
                <strong>{t.nome}</strong> <span className="text-suave">{formatarTelefone(t.telefone)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
