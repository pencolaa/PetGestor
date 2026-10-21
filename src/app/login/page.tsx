import { prisma } from "@/lib/prisma";
import { FormLogin } from "./FormLogin";
import { PawPrint } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const config = await prisma.configuracao.findUnique({ where: { id: 1 } });
  return (
    <main
      className="flex min-h-screen items-center justify-center bg-fundo p-4"
      style={{ "--cor-principal": config?.corPrincipal ?? "#0F766E" } as React.CSSProperties}
    >
      <div className="card w-full max-w-sm p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white">
            <PawPrint size={24} />
          </div>
          <h1 className="text-xl font-bold">{config?.nomePetShop ?? "PetGestor"}</h1>
          <p className="text-sm text-suave">Entre para acessar o sistema</p>
        </div>
        <FormLogin />
      </div>
    </main>
  );
}
