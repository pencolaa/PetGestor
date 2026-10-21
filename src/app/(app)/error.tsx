"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function Erro({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="card mx-auto mt-10 max-w-md p-8 text-center">
      <AlertTriangle size={32} className="mx-auto mb-3 text-orange-500" />
      <h1 className="text-lg font-bold">Algo deu errado</h1>
      <p className="mt-2 text-sm text-suave">
        Não foi possível carregar esta tela. Verifique a internet e tente de novo. Se continuar, avise o suporte
        {error.digest ? <> informando o código <code className="font-mono">{error.digest}</code></> : null}.
      </p>
      <button onClick={reset} className="btn-primary mt-6">Tentar de novo</button>
    </div>
  );
}
