"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function Form() {
  const router = useRouter();
  const params = useSearchParams();
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro("");
    setCarregando(true);
    const form = new FormData(e.currentTarget);
    const res = await signIn("credentials", {
      email: form.get("email"),
      senha: form.get("senha"),
      site: form.get("site"),
      redirect: false,
    });
    setCarregando(false);
    if (res?.error) {
      setErro(res.error === "BLOQUEADO" ? "Muitas tentativas. Aguarde 15 minutos e tente de novo." : "E-mail ou senha inválidos.");
      return;
    }
    // Só redireciona para dentro do próprio sistema
    const destino = new URL(params.get("callbackUrl") ?? "/", window.location.origin);
    router.replace(destino.origin === window.location.origin ? destino.pathname + destino.search : "/");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="label" htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" required autoComplete="email" className="input" />
      </div>
      <div>
        <label className="label" htmlFor="senha">Senha</label>
        <input id="senha" name="senha" type="password" required autoComplete="current-password" className="input" />
      </div>
      {/* Campo-isca contra robôs: invisível para pessoas */}
      <input type="text" name="site" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" />
      {erro && <p className="text-sm font-medium text-red-600">{erro}</p>}
      <button type="submit" className="btn-primary w-full" disabled={carregando}>
        {carregando ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}

export function FormLogin() {
  return (
    <Suspense>
      <Form />
    </Suspense>
  );
}
