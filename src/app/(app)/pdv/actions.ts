"use server";

import type { FormaPagamento } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { exigirSessao } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apenasDigitos } from "@/lib/formato";

export type TutorBusca = { id: string; nome: string; telefone: string };

export async function buscarTutores(q: string): Promise<TutorBusca[]> {
  await exigirSessao();
  const termo = q.trim();
  if (termo.length < 2) return [];
  const digitos = apenasDigitos(termo);
  return prisma.tutor.findMany({
    where: {
      OR: [
        { nome: { contains: termo, mode: "insensitive" } },
        { pets: { some: { nome: { contains: termo, mode: "insensitive" } } } },
        ...(digitos.length >= 3 ? [{ telefone: { contains: digitos } }] : []),
      ],
    },
    select: { id: true, nome: true, telefone: true },
    take: 8,
    orderBy: { nome: "asc" },
  });
}

export type ItemCarrinho =
  | { tipo: "produto"; produtoId: string; quantidade: number }
  | { tipo: "servico"; servicoId: string; agendamentoId?: string; quantidade: number };

export type DadosVenda = {
  itens: ItemCarrinho[];
  tutorId: string | null;
  desconto: number; // centavos
  formaPagamento: FormaPagamento;
};

export type ResultadoVenda =
  | { ok: true; vendaId: string; total: number; troco?: number }
  | { ok: false; mensagem: string };

const FORMAS: FormaPagamento[] = ["PIX", "CREDITO", "DEBITO", "DINHEIRO"];

export async function finalizarVenda(dados: DadosVenda): Promise<ResultadoVenda> {
  const session = await exigirSessao();
  if (!dados.itens.length) return { ok: false, mensagem: "O carrinho está vazio." };
  if (!FORMAS.includes(dados.formaPagamento)) return { ok: false, mensagem: "Forma de pagamento inválida." };
  if (dados.itens.some((i) => !Number.isInteger(i.quantidade) || i.quantidade <= 0)) return { ok: false, mensagem: "Quantidade inválida." };

  // Preços sempre vêm do banco, nunca do navegador
  const produtoIds = dados.itens.flatMap((i) => (i.tipo === "produto" ? [i.produtoId] : []));
  const servicoIds = dados.itens.flatMap((i) => (i.tipo === "servico" ? [i.servicoId] : []));
  const agendamentoIds = dados.itens.flatMap((i) => (i.tipo === "servico" && i.agendamentoId ? [i.agendamentoId] : []));
  const [produtos, servicos, agendamentos] = await Promise.all([
    prisma.produto.findMany({ where: { id: { in: produtoIds }, ativo: true } }),
    prisma.servico.findMany({ where: { id: { in: servicoIds } } }),
    prisma.agendamento.findMany({ where: { id: { in: agendamentoIds } }, include: { pet: true } }),
  ]);

  const linhas: { produtoId?: string; servicoId?: string; agendamentoId?: string; descricao: string; quantidade: number; precoUnitario: number; total: number }[] = [];
  for (const item of dados.itens) {
    if (item.tipo === "produto") {
      const p = produtos.find((x) => x.id === item.produtoId);
      if (!p) return { ok: false, mensagem: "Produto não encontrado ou inativo." };
      linhas.push({ produtoId: p.id, descricao: p.nome, quantidade: item.quantidade, precoUnitario: p.preco, total: p.preco * item.quantidade });
    } else {
      const s = servicos.find((x) => x.id === item.servicoId);
      if (!s) return { ok: false, mensagem: "Serviço não encontrado." };
      const ag = item.agendamentoId ? agendamentos.find((a) => a.id === item.agendamentoId) : undefined;
      if (item.agendamentoId && !ag) return { ok: false, mensagem: "Agendamento não encontrado." };
      if (ag?.pago) return { ok: false, mensagem: `O atendimento de ${ag.pet.nome} já está pago.` };
      const preco = ag ? ag.valorEstimado : s.preco;
      const quantidade = ag ? 1 : item.quantidade;
      linhas.push({
        servicoId: s.id, agendamentoId: ag?.id, descricao: ag ? `${s.nome} — ${ag.pet.nome}` : s.nome,
        quantidade, precoUnitario: preco, total: preco * quantidade,
      });
    }
  }

  const subtotal = linhas.reduce((acc, l) => acc + l.total, 0);
  const desconto = Math.max(0, Math.min(Math.round(dados.desconto) || 0, subtotal));
  const total = subtotal - desconto;

  try {
    const venda = await prisma.$transaction(async (tx) => {
      const venda = await tx.venda.create({
        data: {
          tutorId: dados.tutorId || null, usuarioId: session.user.id,
          subtotal, desconto, total, formaPagamento: dados.formaPagamento,
          itens: { create: linhas },
        },
      });
      for (const l of linhas) {
        if (l.produtoId) {
          // Baixa atômica: só decrementa se houver estoque suficiente
          const r = await tx.produto.updateMany({ where: { id: l.produtoId, estoque: { gte: l.quantidade } }, data: { estoque: { decrement: l.quantidade } } });
          if (r.count === 0) throw new Error(`ESTOQUE:${l.descricao}`);
          await tx.movimentacaoEstoque.create({
            data: { produtoId: l.produtoId, tipo: "SAIDA", quantidade: -l.quantidade, vendaId: venda.id, motivo: "Venda", usuarioId: session.user.id },
          });
        }
        if (l.agendamentoId) {
          const r = await tx.agendamento.updateMany({ where: { id: l.agendamentoId, pago: false }, data: { pago: true } });
          if (r.count === 0) throw new Error(`PAGO:${l.descricao}`);
        }
      }
      return venda;
    });
    revalidatePath("/pdv");
    revalidatePath("/estoque");
    revalidatePath("/agenda");
    revalidatePath("/");
    return { ok: true, vendaId: venda.id, total };
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("ESTOQUE:")) return { ok: false, mensagem: `Estoque insuficiente de ${e.message.slice(8)}.` };
    if (e instanceof Error && e.message.startsWith("PAGO:")) return { ok: false, mensagem: `${e.message.slice(5)} já foi pago.` };
    throw e;
  }
}
