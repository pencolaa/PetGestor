"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { KeyRound } from "lucide-react";
import { CampoSenha } from "@/components/CampoSenha";
import { Mensagem } from "@/components/Mensagem";
import { useFecharModal } from "@/components/Modal";
import type { Resultado } from "@/lib/acoes";
import { centavosParaInput, ROTULO_TIPO_SERVICO } from "@/lib/formato";
import { criarUsuario, redefinirSenha, salvarConfiguracao, salvarProfissional, salvarServico } from "./actions";

/** Fecha o modal quando a ação dá certo */
function useFecharAoSalvar(estado: Resultado) {
  const fechar = useFecharModal();
  useEffect(() => {
    if (estado?.ok) fechar();
  }, [estado, fechar]);
}

// Opções de horário de 30 em 30 minutos
const HORAS = Array.from({ length: 48 }, (_, i) => `${String(Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`);

type Config = {
  nomePetShop: string;
  corPrincipal: string;
  logoUrl: string | null;
  telefone: string | null;
  endereco: string | null;
  abertura: string;
  fechamento: string;
};

export function FormConfiguracao({ config }: { config: Config }) {
  const [estado, acao, pendente] = useActionState(salvarConfiguracao, null);
  const [cor, setCor] = useState(config.corPrincipal);

  return (
    <form action={acao} className="space-y-4 p-5">
      <div>
        <label className="label" htmlFor="cfg-nome">Nome do pet shop</label>
        <input id="cfg-nome" name="nomePetShop" defaultValue={config.nomePetShop} className="input" required maxLength={80} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="cfg-abertura">Abre às</label>
          <select id="cfg-abertura" name="abertura" defaultValue={config.abertura} className="input">
            {HORAS.map((h) => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="cfg-fechamento">Fecha às</label>
          <select id="cfg-fechamento" name="fechamento" defaultValue={config.fechamento} className="input">
            {HORAS.map((h) => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label">Cor principal</label>
        <div className="flex items-center gap-3">
          <input type="color" value={cor} onChange={(e) => setCor(e.target.value)} className="h-10 w-14 cursor-pointer rounded-lg border border-borda" aria-label="Escolher cor" />
          <input name="corPrincipal" value={cor} onChange={(e) => setCor(e.target.value)} className="input max-w-32 font-mono" aria-label="Código da cor" />
          <span className="btn text-white" style={{ background: cor }}>Prévia</span>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="cfg-logo">URL do logo (opcional)</label>
        <input id="cfg-logo" name="logoUrl" defaultValue={config.logoUrl ?? ""} placeholder="https://..." className="input" maxLength={500} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="cfg-tel">Telefone</label>
          <input id="cfg-tel" name="telefone" defaultValue={config.telefone ?? ""} className="input" maxLength={30} />
        </div>
        <div>
          <label className="label" htmlFor="cfg-end">Endereço</label>
          <input id="cfg-end" name="endereco" defaultValue={config.endereco ?? ""} className="input" maxLength={200} />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button className="btn-primary" disabled={pendente}>{pendente ? "Salvando..." : "Salvar"}</button>
        <Mensagem r={estado} />
      </div>
    </form>
  );
}

type Servico = { id: string; nome: string; tipo: string; duracaoMin: number; preco: number; ativo: boolean };

export function FormServico({ servico }: { servico?: Servico }) {
  const [estado, acao, pendente] = useActionState(salvarServico, null);
  useFecharAoSalvar(estado);
  return (
    <form action={acao} className="grid gap-4 sm:grid-cols-2">
      {servico && <input type="hidden" name="id" value={servico.id} />}
      <div className="sm:col-span-2">
        <label className="label" htmlFor="sv-nome">Nome *</label>
        <input id="sv-nome" name="nome" defaultValue={servico?.nome} placeholder="Ex.: Banho — pequeno porte" className="input" required maxLength={80} />
      </div>
      <div>
        <label className="label" htmlFor="sv-tipo">Tipo *</label>
        <select id="sv-tipo" name="tipo" defaultValue={servico?.tipo ?? "BANHO"} className="input">
          {Object.entries(ROTULO_TIPO_SERVICO).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="sv-duracao">Duração *</label>
        <select id="sv-duracao" name="duracaoMin" defaultValue={servico?.duracaoMin ?? 60} className="input">
          {Array.from({ length: 16 }, (_, i) => (i + 1) * 30).map((m) => (
            <option key={m} value={m}>{m < 60 ? `${m} min` : `${Math.floor(m / 60)}h${m % 60 ? "30" : ""}`}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="sv-preco">Preço (R$)</label>
        <input id="sv-preco" name="preco" defaultValue={servico ? centavosParaInput(servico.preco) : ""} placeholder="0,00" className="input" inputMode="decimal" />
      </div>
      {servico && (
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input type="checkbox" name="ativo" defaultChecked={servico.ativo} className="h-4 w-4 accent-[var(--cor-principal)]" /> Ativo (aparece na agenda)
        </label>
      )}
      <div className="flex items-center gap-3 sm:col-span-2">
        <button className="btn-primary" disabled={pendente}>{pendente ? "Salvando..." : "Salvar"}</button>
        <Mensagem r={estado?.ok ? null : estado} />
      </div>
    </form>
  );
}

type Profissional = { id: string; nome: string; tipo: string; ativo: boolean };

export function FormProfissional({ profissional }: { profissional?: Profissional }) {
  const [estado, acao, pendente] = useActionState(salvarProfissional, null);
  useFecharAoSalvar(estado);
  return (
    <form action={acao} className="grid gap-4 sm:grid-cols-2">
      {profissional && <input type="hidden" name="id" value={profissional.id} />}
      <div>
        <label className="label" htmlFor="pf-nome">Nome *</label>
        <input id="pf-nome" name="nome" defaultValue={profissional?.nome} className="input" required maxLength={80} />
      </div>
      <div>
        <label className="label" htmlFor="pf-tipo">Especialidade *</label>
        <select id="pf-tipo" name="tipo" defaultValue={profissional?.tipo ?? "BANHO"} className="input">
          {Object.entries(ROTULO_TIPO_SERVICO).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
        </select>
      </div>
      <p className="text-xs text-suave sm:col-span-2">Profissionais de tosa também podem receber agendamentos de banho.</p>
      {profissional && (
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" name="ativo" defaultChecked={profissional.ativo} className="h-4 w-4 accent-[var(--cor-principal)]" /> Ativo (aparece como coluna na agenda)
        </label>
      )}
      <div className="flex items-center gap-3 sm:col-span-2">
        <button className="btn-primary" disabled={pendente}>{pendente ? "Salvando..." : "Salvar"}</button>
        <Mensagem r={estado?.ok ? null : estado} />
      </div>
    </form>
  );
}

export function FormUsuario() {
  const [estado, acao, pendente] = useActionState(criarUsuario, null);
  return (
    <form action={acao} className="grid gap-3 p-5 sm:grid-cols-2">
      <p className="font-semibold sm:col-span-2">Novo usuário</p>
      <input name="nome" placeholder="Nome" aria-label="Nome" className="input" required maxLength={120} />
      <input name="email" type="email" placeholder="E-mail" aria-label="E-mail" className="input" required maxLength={254} />
      <CampoSenha name="senha" placeholder="Senha (mín. 8)" aria-label="Senha" required minLength={8} maxLength={128} autoComplete="off" data-lpignore="true" />
      <select name="perfil" className="input" aria-label="Perfil">
        <option value="ATENDENTE">Atendente</option>
        <option value="ADMIN">Administrador</option>
      </select>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button className="btn-primary" disabled={pendente}>Criar usuário</button>
        <Mensagem r={estado} />
      </div>
      {estado?.ok && <p className="text-xs text-suave sm:col-span-2">Passe o e-mail e a senha para a pessoa. Ela pode trocar a senha depois em Minha conta.</p>}
    </form>
  );
}

/** Gera senha provisória para um funcionário que esqueceu a dele */
export function BotaoRedefinirSenha({ id, nome }: { id: string; nome: string }) {
  const [pendente, iniciar] = useTransition();
  const [resultado, setResultado] = useState<{ mensagem: string; senha?: string } | null>(null);

  function redefinir() {
    if (!confirm(`Gerar uma nova senha para ${nome}? A senha atual deixará de funcionar.`)) return;
    iniciar(async () => setResultado(await redefinirSenha(id)));
  }

  if (resultado?.senha) {
    return (
      <span className="text-xs">
        {resultado.mensagem} <code className="rounded bg-fundo px-1.5 py-0.5 font-mono font-semibold">{resultado.senha}</code>
      </span>
    );
  }
  return (
    <button onClick={redefinir} disabled={pendente} className="btn-ghost px-2 py-1 text-xs" title="Gerar senha provisória">
      <KeyRound size={13} /> {resultado ? resultado.mensagem : "Nova senha"}
    </button>
  );
}
