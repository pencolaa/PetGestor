import { cache } from "react";
import { prisma } from "./prisma";

export const obterConfiguracao = cache(async () => {
  const config = await prisma.configuracao.findUnique({ where: { id: 1 } });
  return config ?? { id: 1, nomePetShop: "Meu Pet Shop", corPrincipal: "#0F766E", logoUrl: null, telefone: null, endereco: null, atualizadoEm: new Date() };
});
