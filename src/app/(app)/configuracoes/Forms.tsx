"use client";

import { useActionState, useState } from "react";
import { Mensagem } from "@/components/Mensagem";
import { criarUsuario, salvarConfiguracao } from "./actions";

type Config = { nomePetShop: string; corPrincipal: string; logoUrl: string | null; telefone: string | null; endereco: string | null };

export function FormConfiguracao({ config }: { config: Config }) {
  const [estado, acao, pendente] = useActionState(salvarConfiguracao, null);
  const [cor, setCor] = useState(config.corPrincipal);

  return (
    <form action={acao} className="space-y-4 p-5">
      <div>
        <label className="label">Nome do pet shop</label>
        <input name="nomePetShop" defaultValue={config.nomePetShop} className="input" required />
      </div>
      <div>
        <label className="label">Cor principal</label>
        <div className="flex items-center gap-3">
          <input type="color" value={cor} onChange={(e) => setCor(e.target.value)} className="h-10 w-14 cursor-pointer rounded-lg border border-borda" />
          <input name="corPrincipal" value={cor} onChange={(e) => setCor(e.target.value)} className="input max-w-32 font-mono" />
          <span className="btn text-white" style={{ background: cor }}>Prévia</span>
        </div>
      </div>
      <div>
        <label className="label">URL do logo (opcional)</label>
        <input name="logoUrl" defaultValue={config.logoUrl ?? ""} placeholder="https://..." className="input" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Telefone</label>
          <input name="telefone" defaultValue={config.telefone ?? ""} className="input" />
        </div>
        <div>
          <label className="label">Endereço</label>
          <input name="endereco" defaultValue={config.endereco ?? ""} className="input" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button className="btn-primary" disabled={pendente}>{pendente ? "Salvando..." : "Salvar"}</button>
        <Mensagem r={estado} />
      </div>
    </form>
  );
}

export function FormUsuario() {
  const [estado, acao, pendente] = useActionState(criarUsuario, null);
  return (
    <form action={acao} className="grid gap-3 p-5 sm:grid-cols-2">
      <p className="font-semibold sm:col-span-2">Novo usuário</p>
      <input name="nome" placeholder="Nome" className="input" required />
      <input name="email" type="email" placeholder="E-mail" className="input" required />
      <input name="senha" type="password" placeholder="Senha (mín. 6)" className="input" required minLength={6} autoComplete="new-password" />
      <select name="perfil" className="input">
        <option value="ATENDENTE">Atendente</option>
        <option value="ADMIN">Administrador</option>
      </select>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button className="btn-primary" disabled={pendente}>Criar usuário</button>
        <Mensagem r={estado} />
      </div>
    </form>
  );
}
