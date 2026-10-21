"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Mensagem } from "@/components/Mensagem";
import { useFecharModal } from "@/components/Modal";
import type { Resultado } from "@/lib/acoes";
import { centavosParaInput } from "@/lib/formato";
import { criarPacote, registrarVacina, salvarObservacoes, salvarPet, salvarTutor } from "./actions";

/** Fecha o modal (e opcionalmente navega) quando a ação dá certo */
function useAoSalvar(estado: Resultado, destino?: (id: string) => string) {
  const fechar = useFecharModal();
  const router = useRouter();
  useEffect(() => {
    if (estado?.ok) {
      fechar();
      if (destino && estado.id) router.push(destino(estado.id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado]);
}

type Tutor = { id: string; nome: string; telefone: string; email: string | null; cpf: string | null; endereco: string | null };

export function FormTutor({ tutor }: { tutor?: Tutor }) {
  const [estado, acao, pendente] = useActionState(salvarTutor, null);
  useAoSalvar(estado, tutor ? undefined : (id) => `/clientes/${id}`);
  return (
    <form action={acao} className="grid gap-4 sm:grid-cols-2">
      {tutor && <input type="hidden" name="id" value={tutor.id} />}
      <div className="sm:col-span-2">
        <label className="label">Nome completo *</label>
        <input name="nome" defaultValue={tutor?.nome} className="input" required autoFocus />
      </div>
      <div>
        <label className="label">Telefone / WhatsApp *</label>
        <input name="telefone" defaultValue={tutor?.telefone} className="input" placeholder="(11) 98765-4321" required inputMode="tel" />
      </div>
      <div>
        <label className="label">E-mail</label>
        <input name="email" type="email" defaultValue={tutor?.email ?? ""} className="input" />
      </div>
      <div>
        <label className="label">CPF</label>
        <input name="cpf" defaultValue={tutor?.cpf ?? ""} className="input" />
      </div>
      <div>
        <label className="label">Endereço</label>
        <input name="endereco" defaultValue={tutor?.endereco ?? ""} className="input" />
      </div>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button className="btn-primary" disabled={pendente}>{pendente ? "Salvando..." : "Salvar"}</button>
        <Mensagem r={estado?.ok ? null : estado} />
      </div>
    </form>
  );
}

type Pet = { id: string; nome: string; especie: string; raca: string | null; sexo: string; dataNascimento: string | null; peso: number | null };

export function FormPet({ tutorId, pet }: { tutorId: string; pet?: Pet }) {
  const [estado, acao, pendente] = useActionState(salvarPet, null);
  useAoSalvar(estado, pet ? undefined : (id) => `/clientes/pets/${id}`);
  return (
    <form action={acao} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="tutorId" value={tutorId} />
      {pet && <input type="hidden" name="id" value={pet.id} />}
      <div>
        <label className="label">Nome *</label>
        <input name="nome" defaultValue={pet?.nome} className="input" required autoFocus />
      </div>
      <div>
        <label className="label">Espécie *</label>
        <select name="especie" defaultValue={pet?.especie ?? "CAO"} className="input">
          <option value="CAO">Cão</option>
          <option value="GATO">Gato</option>
          <option value="OUTRO">Outro</option>
        </select>
      </div>
      <div>
        <label className="label">Raça</label>
        <input name="raca" defaultValue={pet?.raca ?? ""} className="input" placeholder="SRD" />
      </div>
      <div>
        <label className="label">Sexo *</label>
        <select name="sexo" defaultValue={pet?.sexo ?? "MACHO"} className="input">
          <option value="MACHO">Macho</option>
          <option value="FEMEA">Fêmea</option>
        </select>
      </div>
      <div>
        <label className="label">Data de nascimento</label>
        <input name="dataNascimento" type="date" defaultValue={pet?.dataNascimento ?? ""} className="input" />
      </div>
      <div>
        <label className="label">Peso (kg)</label>
        <input name="peso" defaultValue={pet?.peso?.toString().replace(".", ",") ?? ""} className="input" inputMode="decimal" />
      </div>
      {!pet && (
        <div className="sm:col-span-2">
          <label className="label">Observações de cuidado</label>
          <textarea name="observacoes" rows={2} className="input" placeholder="Alergias, comportamento, preferências..." />
        </div>
      )}
      <div className="flex items-center gap-3 sm:col-span-2">
        <button className="btn-primary" disabled={pendente}>{pendente ? "Salvando..." : "Salvar"}</button>
        <Mensagem r={estado?.ok ? null : estado} />
      </div>
    </form>
  );
}

export function FormVacina({ petId, hoje }: { petId: string; hoje: string }) {
  const [estado, acao, pendente] = useActionState(registrarVacina, null);
  useAoSalvar(estado);
  return (
    <form action={acao} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="petId" value={petId} />
      <div className="sm:col-span-2">
        <label className="label">Vacina *</label>
        <input name="nome" className="input" list="vacinas-comuns" required autoFocus />
        <datalist id="vacinas-comuns">
          {["V8 (polivalente)", "V10 (polivalente)", "Antirrábica", "Gripe canina", "Giárdia", "Leishmaniose", "V4 (quádrupla felina)", "V5 (quíntupla felina)", "FeLV"].map((v) => (
            <option key={v} value={v} />
          ))}
        </datalist>
      </div>
      <div>
        <label className="label">Aplicada em *</label>
        <input name="aplicadaEm" type="date" defaultValue={hoje} className="input" required />
      </div>
      <div>
        <label className="label">Próxima dose</label>
        <input name="proximaDose" type="date" className="input" />
      </div>
      <div className="sm:col-span-2">
        <label className="label">Lote</label>
        <input name="lote" className="input" />
      </div>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button className="btn-primary" disabled={pendente}>Registrar</button>
        <Mensagem r={estado?.ok ? null : estado} />
      </div>
    </form>
  );
}

type Servico = { id: string; nome: string; preco: number };

export function FormPacote({ petId, servicos, padrao }: { petId: string; servicos: Servico[]; padrao?: { servicoId: string; total: number; valor: number } }) {
  const [estado, acao, pendente] = useActionState(criarPacote, null);
  useAoSalvar(estado);
  return (
    <form action={acao} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="petId" value={petId} />
      <div className="sm:col-span-2">
        <label className="label">Serviço</label>
        <select name="servicoId" defaultValue={padrao?.servicoId} className="input" required>
          {servicos.map((s) => (
            <option key={s.id} value={s.id}>{s.nome}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Quantidade de banhos</label>
        <input name="total" type="number" min={1} defaultValue={padrao?.total ?? 4} className="input" required />
      </div>
      <div>
        <label className="label">Validade (dias)</label>
        <input name="validadeDias" type="number" min={1} defaultValue={60} className="input" required />
      </div>
      <div className="sm:col-span-2">
        <label className="label">Valor do pacote (R$)</label>
        <input name="valor" defaultValue={padrao ? centavosParaInput(padrao.valor) : ""} className="input" inputMode="decimal" />
      </div>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button className="btn-primary" disabled={pendente}>Salvar pacote</button>
        <Mensagem r={estado?.ok ? null : estado} />
      </div>
    </form>
  );
}

export function FormObservacoes({ petId, observacoes }: { petId: string; observacoes: string | null }) {
  const [estado, acao, pendente] = useActionState(salvarObservacoes, null);
  return (
    <form action={acao} className="space-y-3 p-5">
      <input type="hidden" name="petId" value={petId} />
      <textarea name="observacoes" rows={4} defaultValue={observacoes ?? ""} className="input" placeholder="Alergias, comportamento, preferências do tutor..." />
      <div className="flex items-center gap-3">
        <button className="btn-secondary" disabled={pendente}>Salvar observações</button>
        <Mensagem r={estado} />
      </div>
    </form>
  );
}
