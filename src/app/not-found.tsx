import Link from "next/link";
import { PawPrint } from "lucide-react";

export default function NaoEncontrado() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-fundo p-4">
      <div className="card max-w-sm p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-sidebar text-white">
          <PawPrint size={24} />
        </div>
        <h1 className="text-xl font-bold">Página não encontrada</h1>
        <p className="mt-2 text-sm text-suave">O endereço pode ter mudado ou o registro foi excluído.</p>
        <Link href="/agenda" className="btn mt-6 bg-sidebar text-white hover:opacity-90">Ir para a agenda</Link>
      </div>
    </main>
  );
}
