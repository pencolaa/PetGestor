import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { HORARIOS, OCUPA_AGENDA } from "@/lib/agenda";
import { diaISO, diaDaSemana, fimDoDia, formatarData, hojeISO, horaLocal, inicioDaSemana, inicioDoDia, somarDias } from "@/lib/datas";
import { ROTULO_TIPO_SERVICO } from "@/lib/formato";
import { Cabecalho, Vazio } from "@/components/ui";
import { BlocoAgendamento, LinhaAgendamento, type AgendamentoBloco } from "./BlocoAgendamento";
import { NovoAgendamento } from "./NovoAgendamento";
import { obterPet } from "./actions";

type Busca = { data?: string; visao?: string; novo?: string; pet?: string };

const ALTURA_SLOT = 44;
const DIAS_LISTA = 14;
const VISOES = [
  { id: "dia", rotulo: "Dia" },
  { id: "semana", rotulo: "Semana" },
  { id: "lista", rotulo: "Lista" },
] as const;
type Visao = (typeof VISOES)[number]["id"];
const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default async function AgendaPage({ searchParams }: { searchParams: Promise<Busca> }) {
  const sp = await searchParams;
  const hoje = hojeISO();
  const dia = sp.data && /^\d{4}-\d{2}-\d{2}$/.test(sp.data) ? sp.data : hoje;
  const visao: Visao = VISOES.find((v) => v.id === sp.visao)?.id ?? "dia";
  const inicio = visao === "semana" ? inicioDaSemana(dia) : dia;
  const qtdDias = visao === "semana" ? 7 : visao === "lista" ? DIAS_LISTA : 1;
  const dias = Array.from({ length: qtdDias }, (_, i) => somarDias(inicio, i));

  const [profissionais, servicos, agendamentos, petInicial] = await Promise.all([
    prisma.profissional.findMany({ where: { ativo: true }, orderBy: [{ tipo: "asc" }, { nome: "asc" }] }),
    prisma.servico.findMany({ where: { ativo: true }, orderBy: [{ tipo: "asc" }, { nome: "asc" }] }),
    prisma.agendamento.findMany({
      where: { ...(visao === "semana" ? {} : OCUPA_AGENDA), inicio: { gte: inicioDoDia(dias[0]), lt: fimDoDia(dias[dias.length - 1]) } },
      include: { pet: { include: { tutor: true } }, servico: true, profissional: true },
      orderBy: { inicio: "asc" },
    }),
    sp.pet ? obterPet(sp.pet) : null,
  ]);

  const blocos: (AgendamentoBloco & { dia: string; slot: number; slots: number })[] = agendamentos.map((a) => {
    const hora = horaLocal(a.inicio);
    const slot = HORARIOS.findIndex((h) => h >= hora);
    return {
      id: a.id,
      dia: diaISO(a.inicio),
      slot: slot < 0 ? HORARIOS.length - 1 : slot,
      slots: Math.max(1, Math.round((a.fim.getTime() - a.inicio.getTime()) / (30 * 60000))),
      inicio: hora,
      fim: horaLocal(a.fim),
      status: a.status,
      pet: a.pet.nome,
      petId: a.pet.id,
      especie: a.pet.especie,
      tutor: a.pet.tutor.nome,
      telefone: a.pet.tutor.telefone,
      servico: a.servico.nome,
      profissional: a.profissional.nome,
      profissionalId: a.profissionalId,
      valor: a.valorEstimado,
      pacote: a.pacoteId !== null,
      observacoes: a.observacoes,
    };
  });

  const passo = qtdDias;
  const url = (d: string, v = visao) => `/agenda?data=${d}&visao=${v}`;
  const titulo =
    visao === "dia"
      ? formatarData(dia, { weekday: "long", day: "2-digit", month: "long", year: "numeric" })
      : `${formatarData(dias[0], { day: "2-digit", month: "short" })} – ${formatarData(dias[dias.length - 1], { day: "2-digit", month: "short", year: "numeric" })}`;

  return (
    <>
      <Cabecalho titulo="Agenda" subtitulo={<span className="inline-block first-letter:uppercase">{titulo}</span>}>
        <NovoAgendamento
          servicos={servicos.map((s) => ({ id: s.id, nome: s.nome, tipo: s.tipo, preco: s.preco, duracaoMin: s.duracaoMin }))}
          profissionais={profissionais.map((p) => ({ id: p.id, nome: p.nome, tipo: p.tipo }))}
          diaInicial={dia < hoje ? hoje : dia}
          hoje={hoje}
          petInicial={petInicial}
          abertoInicial={sp.novo === "1"}
        />
      </Cabecalho>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex">
          <Link href={url(somarDias(dia, -passo))} className="btn-secondary rounded-r-none px-2.5" aria-label="Anterior"><ChevronLeft size={16} /></Link>
          <Link href={url(hoje)} className="btn-secondary rounded-none border-x-0">Hoje</Link>
          <Link href={url(somarDias(dia, passo))} className="btn-secondary rounded-l-none px-2.5" aria-label="Próximo"><ChevronRight size={16} /></Link>
        </div>
        <form className="flex gap-2">
          <input type="hidden" name="visao" value={visao} />
          <input type="date" name="data" defaultValue={dia} className="input w-auto" />
          <button className="btn-secondary">Ir</button>
        </form>
        <div className="ml-auto flex rounded-lg border border-borda bg-white p-0.5">
          {VISOES.map((v) => (
            <Link key={v.id} href={url(dia, v.id)} className={`rounded-md px-3 py-1.5 text-sm font-semibold ${visao === v.id ? "bg-primary text-white" : "text-suave hover:text-texto"}`}>
              {v.rotulo}
            </Link>
          ))}
        </div>
      </div>

      {visao === "lista" ? (
        <ListaHorarios dias={dias} blocos={blocos} hoje={hoje} />
      ) : (
      <div className="card overflow-x-auto">
        {visao === "dia" ? (
          <div
            className="grid min-w-max"
            style={{
              gridTemplateColumns: `64px repeat(${profissionais.length}, minmax(180px, 1fr))`,
              gridTemplateRows: `auto repeat(${HORARIOS.length}, ${ALTURA_SLOT}px)`,
            }}
          >
            <div className="sticky left-0 z-10 border-b border-borda bg-white" />
            {profissionais.map((p, i) => (
              <div key={p.id} className="border-b border-l border-borda px-3 py-3" style={{ gridColumn: i + 2, gridRow: 1 }}>
                <p className="font-semibold">{p.nome}</p>
                <p className="text-xs text-suave">{ROTULO_TIPO_SERVICO[p.tipo]}</p>
              </div>
            ))}
            {HORARIOS.map((h, r) => (
              <div key={h} className="sticky left-0 z-10 border-b border-borda bg-white pr-2 pt-1 text-right text-xs text-suave" style={{ gridColumn: 1, gridRow: r + 2 }}>
                {h.endsWith(":00") ? h : ""}
              </div>
            ))}
            {HORARIOS.flatMap((h, r) =>
              profissionais.map((p, c) => (
                <div
                  key={`${h}-${p.id}`}
                  className={`border-l border-borda ${h.endsWith(":30") ? "border-b" : "border-b border-b-borda/50 border-dashed"}`}
                  style={{ gridColumn: c + 2, gridRow: r + 2 }}
                />
              )),
            )}
            {blocos.map((b) => {
              const col = profissionais.findIndex((p) => p.id === b.profissionalId);
              if (col < 0) return null;
              return (
                <div key={b.id} className="z-[1] p-0.5" style={{ gridColumn: col + 2, gridRow: `${b.slot + 2} / span ${Math.min(b.slots, HORARIOS.length - b.slot)}` }}>
                  {/* Blocos de 30 min só comportam duas linhas */}
                  <BlocoAgendamento ag={b} compacto={b.slots === 1} />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid min-w-max" style={{ gridTemplateColumns: `64px repeat(7, minmax(150px, 1fr))` }}>
            <div className="sticky left-0 z-10 border-b border-borda bg-white" />
            {dias.map((d) => (
              <Link
                key={d}
                href={url(d, "dia")}
                className={`border-b border-l border-borda px-3 py-3 hover:bg-fundo ${d === hoje ? "bg-primary-soft" : ""}`}
              >
                <p className="text-xs font-semibold uppercase text-suave">{DIAS_SEMANA[diaDaSemana(d)]}</p>
                <p className={`text-lg font-bold ${d === hoje ? "text-primary" : ""}`}>{d.slice(8)}</p>
              </Link>
            ))}
            {HORARIOS.map((h) => (
              <div key={h} className="contents">
                <div className="sticky left-0 z-10 border-b border-borda bg-white pr-2 pt-1 text-right text-xs text-suave" style={{ minHeight: ALTURA_SLOT }}>
                  {h}
                </div>
                {dias.map((d) => (
                  <div key={d} className="space-y-1 border-b border-l border-borda p-1">
                    {blocos
                      .filter((b) => b.dia === d && HORARIOS[b.slot] === h)
                      .map((b) => (
                        <BlocoAgendamento key={b.id} ag={b} compacto />
                      ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
      )}
    </>
  );
}

/** Horários marcados dos próximos dias, agrupados por data */
function ListaHorarios({ dias, blocos, hoje }: { dias: string[]; blocos: (AgendamentoBloco & { dia: string })[]; hoje: string }) {
  const comHorario = dias.filter((d) => blocos.some((b) => b.dia === d));
  if (comHorario.length === 0) {
    return (
      <div className="card">
        <Vazio>Nenhum horário marcado nesse período.</Vazio>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {comHorario.map((d) => {
        const doDia = blocos.filter((b) => b.dia === d);
        return (
          <section key={d} className="card overflow-hidden">
            <div className={`flex items-center justify-between border-b border-borda px-5 py-3 ${d === hoje ? "bg-primary-soft" : ""}`}>
              <Link href={`/agenda?data=${d}&visao=dia`} className="font-semibold first-letter:uppercase hover:text-primary">
                {d === hoje ? "Hoje · " : ""}
                {formatarData(d, { weekday: "long", day: "2-digit", month: "long" })}
              </Link>
              <span className="text-sm text-suave">{doDia.length} {doDia.length === 1 ? "horário" : "horários"}</span>
            </div>
            <div className="divide-y divide-borda">
              {doDia.map((b) => (
                <LinhaAgendamento key={b.id} ag={b} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
