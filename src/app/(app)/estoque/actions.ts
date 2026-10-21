"use server";

import type { CategoriaProduto } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { exigirAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { texto, textoOuNull, type Resultado } from "@/lib/acoes";
import { parseMoeda } from "@/lib/formato";

const CATEGORIAS: CategoriaProduto[] = ["RACOES", "HIGIENE", "MEDICAMENTOS", "ACESSORIOS"];

export async function salvarProduto(_: Resultado, form: FormData): Promise<Resultado> {
  await exigirAdmin();
  const id = texto(form, "id");
  const categoria = texto(form, "categoria") as CategoriaProduto;
  const dados = {
    nome: texto(form, "nome"),
    codigoBarras: textoOuNull(form, "codigoBarras"),
    categoria,
    preco: parseMoeda(texto(form, "preco")),
    custo: texto(form, "custo") ? parseMoeda(texto(form, "custo")) : null,
    estoqueMinimo: Number(texto(form, "estoqueMinimo") || 0),
    ativo: id ? form.get("ativo") === "on" : true,
  };
  if (!dados.nome) return { ok: false, mensagem: "Informe o nome do produto." };
  if (!CATEGORIAS.includes(categoria)) return { ok: false, mensagem: "Categoria inválida." };
  if (dados.preco <= 0) return { ok: false, mensagem: "Informe o preço de venda." };
  if (!Number.isInteger(dados.estoqueMinimo) || dados.estoqueMinimo < 0) return { ok: false, mensagem: "Estoque mínimo inválido." };
  if (dados.codigoBarras) {
    const existe = await prisma.produto.findUnique({ where: { codigoBarras: dados.codigoBarras } });
    if (existe && existe.id !== id) return { ok: false, mensagem: `Código de barras já usado em “${existe.nome}”.` };
  }
  if (id) await prisma.produto.update({ where: { id }, data: dados });
  else await prisma.produto.create({ data: dados });
  revalidatePath("/estoque");
  revalidatePath("/pdv");
  return { ok: true, mensagem: "Produto salvo." };
}

export async function registrarEntrada(_: Resultado, form: FormData): Promise<Resultado> {
  const session = await exigirAdmin();
  const produtoId = texto(form, "produtoId");
  const quantidade = Number(texto(form, "quantidade"));
  const custo = texto(form, "custoUnitario") ? parseMoeda(texto(form, "custoUnitario")) : null;
  if (!produtoId) return { ok: false, mensagem: "Selecione o produto." };
  if (!Number.isInteger(quantidade) || quantidade <= 0) return { ok: false, mensagem: "Quantidade deve ser um número inteiro maior que zero." };

  const fornecedor = texto(form, "fornecedor");
  const nota = texto(form, "nota");
  const motivo = ["Entrada de mercadoria", fornecedor && `Fornecedor: ${fornecedor}`, nota && `NF ${nota}`].filter(Boolean).join(" · ");

  const produto = await prisma.$transaction(async (tx) => {
    await tx.movimentacaoEstoque.create({
      data: { produtoId, tipo: "ENTRADA", quantidade, custoUnitario: custo, motivo, usuarioId: session.user.id },
    });
    return tx.produto.update({
      where: { id: produtoId },
      data: { estoque: { increment: quantidade }, ...(custo !== null ? { custo } : {}) },
    });
  });
  revalidatePath("/estoque");
  revalidatePath("/pdv");
  revalidatePath("/");
  return { ok: true, mensagem: `Entrada registrada: ${quantidade}× ${produto.nome}. Estoque atual: ${produto.estoque}.` };
}
