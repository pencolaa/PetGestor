"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, MessageCircle, Search, UserPlus, X } from "lucide-react";
import type { TipoServico } from "@prisma/client";
import { Modal } from "@/components/Modal";
import { Mensagem } from "@/components/Mensagem";
import { atende, centavosParaInput, formatarTelefone } from "@/lib/formato";
import { buscarPets, criarAgendamento, horariosLivres, type PetBusca } from "./actions";

type Servico = { id: string; nome: string; tipo: TipoServico; preco: number; duracaoMin: number };
type Profissional = { id: string; nome: string; tipos: string[] };

type Props = {
  servicos: Servico[];
  profissionais: Profissional[];
  diaInicial: string;
  hoje: string;
  petInicial: PetBusca | null;
  abertoInicial: boolean;
};

export function NovoAgendamento({ abertoInicial, ...props }: Props) {
  const router = useRouter();
  return (
    <Modal
      titulo="Novo agendamento"
      gatilho={<><CalendarPlus size={16} /> Novo agendamento</>}
      largura="max-w-2xl"
      abertoInicial={abertoInicial}
      // Limpa ?novo=1&pet=... da URL para o modal não reabrir
      aoFechar={() => abertoInicial && router.replace(`/agenda?data=${props.diaInicial}`)}
    >
      <Formulario {...props} />
    </Modal>
  );
}

function Formulario({ servicos, profissionais, diaInicial, hoje, petInicial }: Omit<Props, "abertoInicial">) {
  const [estado, acao, enviando] = useActionState(criarAgendamento, null);
  const [pet, setPet] = useState<PetBusca | null>(petInicial);
  // Cliente que ainda não tem cadastro: tutor e pet são criados junto com o agendamento
  const [novo, setNovo] = useState(false);
  const [busca, setBusca] = useState("");
  const [resultados, setResultados] = useState<PetBusca[]>([]);
  const [servicoId, setServicoId] = useState(servicos[0]?.id ?? "");
  const [profissionalId, setProfissionalId] = useState("");
  const [data, setData] = useState(diaInicial);
  const [hora, setHora] = useState("");
  const [horarios, setHorarios] = useState<string[] | null>(null);
  const [valor, setValor] = useState(centavosParaInput(servicos[0]?.preco ?? 0));
  const [usarPacote, setUsarPacote] = useState(false);

  const servico = servicos.find((s) => s.id === servicoId);
  const profissionaisAptos = useMemo(() => profissionais.filter((p) => !servico || atende(p.tipos, servico.tipo)), [profissionais, servico]);
  const pacote = pet?.pacotes.find((p) => p.servicoId === servicoId);

  // Busca de pet/tutor com debounce
  useEffect(() => {
    if (busca.trim().length < 2) {
      setResultados([]);
      return;
    }
    const t = setTimeout(() => buscarPets(busca).then(setResultados), 250);
    return () => clearTimeout(t);
  }, [busca]);

  // Mantém o profissional compatível com o serviço
  useEffect(() => {
    if (!profissionaisAptos.some((p) => p.id === profissionalId)) setProfissionalId(profissionaisAptos[0]?.id ?? "");
  }, [profissionaisAptos, profissionalId]);

  // Horários livres do profissional no dia
  useEffect(() => {
    if (!profissionalId || !data || !servico) return;
    let ativo = true;
    setHorarios(null);
    horariosLivres(profissionalId, data, servico.duracaoMin).then((h) => {
      if (!ativo) return;
      setHorarios(h);
      setHora((atual) => (h.includes(atual) ? atual : h[0] ?? ""));
    });
    return () => {
      ativo = false;
    };
  }, [profissionalId, data, servico, estado]);

  useEffect(() => setUsarPacote(Boolean(pacote)), [pacote]);

  if (estado?.ok) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-lg font-semibold text-green-700">✅ {estado.mensagem}</p>
        {estado.whatsapp && (
          <a href={estado.whatsapp} target="_blank" rel="noopener noreferrer" className="btn-whatsapp px-4 py-2 text-sm">
            <MessageCircle size={16} /> Enviar confirmação no WhatsApp
          </a>
        )}
      </div>
    );
  }

  return (
    <form action={acao} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <div className="mb-1.5 flex items-center justify-between">
          <label className="label mb-0">{novo ? "Cliente novo *" : "Pet / tutor *"}</label>
          {!pet && (
            <button type="button" onClick={() => setNovo((n) => !n)} className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
              {novo ? <><Search size={13} /> Buscar cliente cadastrado</> : <><UserPlus size={13} /> Cliente novo</>}
            </button>
          )}
        </div>
        {novo && !pet ? (
          <div className="grid gap-3 rounded-lg border border-primary/40 bg-primary-soft p-3 sm:grid-cols-2">
            <input type="hidden" name="novoCliente" value="1" />
            <div>
              <label className="label" htmlFor="nc-tutor">Nome do tutor *</label>
              <input id="nc-tutor" name="tutorNome" className="input" required maxLength={120} autoFocus />
            </div>
            <div>
              <label className="label" htmlFor="nc-telefone">Telefone (WhatsApp) *</label>
              <input id="nc-telefone" name="tutorTelefone" className="input" required inputMode="tel" placeholder="(11) 91234-5678" maxLength={20} />
            </div>
            <div>
              <label className="label" htmlFor="nc-pet">Nome do pet *</label>
              <input id="nc-pet" name="petNome" className="input" required maxLength={60} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label" htmlFor="nc-especie">Espécie</label>
                <select id="nc-especie" name="petEspecie" className="input" defaultValue="CAO">
                  <option value="CAO">Cão</option>
                  <option value="GATO">Gato</option>
                  <option value="OUTRO">Outro</option>
                </select>
              </div>
              <div>
                <label className="label" htmlFor="nc-sexo">Sexo</label>
                <select id="nc-sexo" name="petSexo" className="input" defaultValue="MACHO">
                  <option value="MACHO">Macho</option>
                  <option value="FEMEA">Fêmea</option>
                </select>
              </div>
            </div>
            <p className="text-xs text-suave sm:col-span-2">O cadastro do tutor e do pet é criado junto com o agendamento. Os outros dados podem ser completados depois em Clientes e pets.</p>
          </div>
        ) : pet ? (
          <div className="flex items-center justify-between rounded-lg border border-primary bg-primary-soft px-3 py-2">
            <div>
              <p className="font-semibold">{pet.especie === "GATO" ? "🐱" : "🐶"} {pet.nome} <span className="font-normal text-suave">· {pet.raca ?? "SRD"}</span></p>
              <p className="text-xs text-suave">{pet.tutor} · {formatarTelefone(pet.telefone)}</p>
            </div>
            <button type="button" onClick={() => setPet(null)} className="rounded p-1 text-suave hover:bg-white" aria-label="Trocar pet"><X size={16} /></button>
            <input type="hidden" name="petId" value={pet.id} />
          </div>
        ) : (
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-suave" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Digite o nome do pet, do tutor ou o telefone" className="input pl-9" autoFocus />
            {resultados.length > 0 && (
              <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-borda bg-white shadow-lg">
                {resultados.map((r) => (
                  <li key={r.id}>
                    <button type="button" onClick={() => { setPet(r); setBusca(""); }} className="w-full px-3 py-2 text-left text-sm hover:bg-fundo">
                      <span className="font-semibold">{r.nome}</span> <span className="text-suave">· {r.tutor} · {formatarTelefone(r.telefone)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {busca.trim().length >= 2 && resultados.length === 0 && (
              <p className="mt-1 text-xs text-suave">
                Nenhum pet encontrado.{" "}
                <button type="button" onClick={() => setNovo(true)} className="font-semibold text-primary hover:underline">Cadastrar cliente novo</button>
              </p>
            )}
          </div>
        )}
      </div>

      <div className="sm:col-span-2">
        <label className="label">Serviço *</label>
        <select
          name="servicoId"
          value={servicoId}
          onChange={(e) => {
            setServicoId(e.target.value);
            const s = servicos.find((x) => x.id === e.target.value);
            if (s) setValor(centavosParaInput(s.preco));
          }}
          className="input"
        >
          {servicos.map((s) => (
            <option key={s.id} value={s.id}>{s.nome} — {s.duracaoMin} min</option>
          ))}
        </select>
      </div>

      <div>
        <label className="label">Data *</label>
        <input type="date" name="data" value={data} min={hoje} onChange={(e) => setData(e.target.value)} className="input" required />
      </div>
      <div>
        <label className="label">Profissional *</label>
        <select name="profissionalId" value={profissionalId} onChange={(e) => setProfissionalId(e.target.value)} className="input">
          {profissionaisAptos.map((p) => (
            <option key={p.id} value={p.id}>{p.nome}</option>
          ))}
        </select>
      </div>

      <div className="sm:col-span-2">
        <label className="label">Horário livre *</label>
        {horarios === null ? (
          <p className="text-sm text-suave">Carregando horários...</p>
        ) : horarios.length === 0 ? (
          <p className="text-sm text-orange-700">Sem horários livres para este profissional nesta data.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {horarios.map((h) => (
              <button
                type="button"
                key={h}
                onClick={() => setHora(h)}
                className={`rounded-lg border px-2.5 py-1 text-sm font-medium ${hora === h ? "border-primary bg-primary text-white" : "border-borda bg-white hover:border-primary"}`}
              >
                {h}
              </button>
            ))}
          </div>
        )}
        <input type="hidden" name="hora" value={hora} />
      </div>

      <div className="sm:col-span-2">
        <label className="label">Observações</label>
        <textarea name="observacoes" rows={2} className="input" placeholder="Ex.: tosa na tesoura, laço rosa..." />
      </div>

      <div>
        <label className="label">Valor estimado (R$)</label>
        <input name="valorEstimado" value={usarPacote ? "0,00" : valor} onChange={(e) => setValor(e.target.value)} disabled={usarPacote} className="input" inputMode="decimal" />
      </div>
      <div className="flex flex-col justify-end gap-2 text-sm">
        {pacote && (
          <label className="flex items-center gap-2">
            <input type="checkbox" name="usarPacote" checked={usarPacote} onChange={(e) => setUsarPacote(e.target.checked)} className="h-4 w-4 accent-[var(--cor-principal)]" />
            Usar pacote ({pacote.restantes} restantes)
          </label>
        )}
        <label className="flex items-center gap-2">
          <input type="checkbox" name="confirmarWhatsapp" defaultChecked className="h-4 w-4 accent-[var(--cor-principal)]" />
          Enviar confirmação por WhatsApp
        </label>
      </div>

      <div className="flex items-center gap-3 sm:col-span-2">
        <button className="btn-primary" disabled={enviando || (!pet && !novo) || !hora}>{enviando ? "Salvando..." : "Agendar"}</button>
        <Mensagem r={estado} />
      </div>
    </form>
  );
}
