import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarPlus, MessageCircle, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { diaISO, formatarData, hojeISO, horaLocal, idade } from "@/lib/datas";
import { formatarMoeda, formatarTelefone, ROTULO_ESPECIE, ROTULO_SEXO } from "@/lib/formato";
import { ROTULO_SITUACAO, situacaoVacina } from "@/lib/vacinas";
import { linkWaMe } from "@/lib/whatsapp";
import { Cabecalho, CardTitulo, Pill, StatusPill, Vazio } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { FormObservacoes, FormPacote, FormPet, FormVacina } from "../../Forms";
import { excluirVacina } from "../../actions";

export default async function PetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const hoje = hojeISO();
  const [pet, servicosBanho] = await Promise.all([
    prisma.pet.findUnique({
      where: { id },
      include: {
        tutor: true,
        vacinas: { orderBy: { aplicadaEm: "desc" } },
        pacotes: { orderBy: { criadoEm: "desc" }, include: { servico: true } },
        agendamentos: { orderBy: { inicio: "desc" }, take: 30, include: { servico: true, profissional: true } },
      },
    }),
    prisma.servico.findMany({ where: { ativo: true, tipo: { in: ["BANHO", "TOSA"] } }, orderBy: { nome: "asc" } }),
  ]);
  if (!pet) notFound();

  const pacote = pet.pacotes[0];
  const pacoteVencido = pacote ? diaISO(pacote.validade) < hoje : false;
  const pacoteEsgotado = pacote ? pacote.usados >= pacote.total : false;

  const info: [string, React.ReactNode][] = [
    ["Espécie", ROTULO_ESPECIE[pet.especie]],
    ["Raça", pet.raca ?? "SRD"],
    ["Sexo", ROTULO_SEXO[pet.sexo]],
    ["Idade", pet.dataNascimento ? `${idade(pet.dataNascimento)} (${formatarData(pet.dataNascimento)})` : "—"],
    ["Peso", pet.peso ? `${pet.peso.toLocaleString("pt-BR")} kg` : "—"],
    ["Tutor", <Link key="t" href={`/clientes/${pet.tutor.id}`} className="font-semibold text-primary hover:underline">{pet.tutor.nome}</Link>],
    ["Telefone", formatarTelefone(pet.tutor.telefone)],
  ];

  return (
    <>
      <Link href={`/clientes/${pet.tutor.id}`} className="mb-3 inline-flex items-center gap-1 text-sm text-suave hover:text-texto">
        <ArrowLeft size={14} /> {pet.tutor.nome}
      </Link>
      <Cabecalho titulo={`${pet.especie === "GATO" ? "🐱" : pet.especie === "CAO" ? "🐶" : "🐾"} ${pet.nome}`} subtitulo={`${ROTULO_ESPECIE[pet.especie]} · ${pet.raca ?? "SRD"} · ${idade(pet.dataNascimento)}`}>
        <a href={linkWaMe(pet.tutor.telefone, `Olá, ${pet.tutor.nome.split(" ")[0]}! Sobre o(a) ${pet.nome}:`)} target="_blank" rel="noopener noreferrer" className="btn-secondary">
          <MessageCircle size={16} /> WhatsApp
        </a>
        <Modal titulo="Editar pet" gatilho={<><Pencil size={16} /> Editar</>} classeGatilho="btn-secondary">
          <FormPet tutorId={pet.tutorId} pet={{ ...pet, dataNascimento: pet.dataNascimento ? diaISO(pet.dataNascimento) : null }} />
        </Modal>
        <Link href={`/agenda?novo=1&pet=${pet.id}`} className="btn-primary"><CalendarPlus size={16} /> Agendar</Link>
      </Cabecalho>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          <section className="card">
            <CardTitulo titulo="Ficha do pet" />
            <dl className="divide-y divide-borda text-sm">
              {info.map(([rotulo, valor]) => (
                <div key={rotulo} className="flex justify-between gap-4 px-5 py-2.5">
                  <dt className="text-suave">{rotulo}</dt>
                  <dd className="text-right">{valor}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="card">
            <CardTitulo titulo="Pacote de banhos">
              <Modal
                titulo={pacote ? "Renovar pacote" : "Novo pacote"}
                gatilho={pacote ? <><RefreshCw size={14} /> Renovar</> : <><Plus size={14} /> Novo</>}
                classeGatilho="btn-secondary px-3 py-1.5 text-xs"
              >
                <FormPacote petId={pet.id} servicos={servicosBanho} padrao={pacote ? { servicoId: pacote.servicoId, total: pacote.total, valor: pacote.valor } : undefined} />
              </Modal>
            </CardTitulo>
            {pacote ? (
              <div className="space-y-3 p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{pacote.servico.nome}</p>
                  {pacoteVencido ? <Pill cor="vermelho">Vencido</Pill> : pacoteEsgotado ? <Pill cor="laranja">Esgotado</Pill> : <Pill cor="verde">Ativo</Pill>}
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-suave">Usados</span>
                    <span className="font-semibold">{pacote.usados}/{pacote.total}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-fundo">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (pacote.usados / pacote.total) * 100)}%` }} />
                  </div>
                </div>
                <p className="text-sm text-suave">
                  Validade: <span className="text-texto">{formatarData(pacote.validade)}</span> · Valor: <span className="text-texto">{formatarMoeda(pacote.valor)}</span>
                </p>
              </div>
            ) : (
              <Vazio>Nenhum pacote contratado.</Vazio>
            )}
          </section>

          <section className="card">
            <CardTitulo titulo="Observações de cuidado" />
            <FormObservacoes petId={pet.id} observacoes={pet.observacoes} />
          </section>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <section className="card">
            <CardTitulo titulo="Carteira de vacinação">
              <Modal titulo="Registrar vacina" gatilho={<><Plus size={14} /> Registrar</>} classeGatilho="btn-secondary px-3 py-1.5 text-xs">
                <FormVacina petId={pet.id} hoje={hoje} />
              </Modal>
            </CardTitulo>
            {pet.vacinas.length === 0 ? (
              <Vazio>Nenhuma vacina registrada.</Vazio>
            ) : (
              <div className="overflow-x-auto">
                <table className="tabela">
                  <thead><tr><th>Vacina</th><th>Aplicada</th><th>Próxima dose</th><th>Situação</th><th></th></tr></thead>
                  <tbody>
                    {pet.vacinas.map((v) => {
                      const s = ROTULO_SITUACAO[situacaoVacina(v.proximaDose, hoje)];
                      return (
                        <tr key={v.id}>
                          <td>
                            <p className="font-medium">{v.nome}</p>
                            {v.lote && <p className="text-xs text-suave">Lote {v.lote}</p>}
                          </td>
                          <td>{formatarData(v.aplicadaEm)}</td>
                          <td>{v.proximaDose ? formatarData(v.proximaDose) : "—"}</td>
                          <td><Pill cor={s.cor}>{s.texto}</Pill></td>
                          <td className="text-right">
                            <form action={excluirVacina.bind(null, v.id)}>
                              <button className="rounded-lg p-1.5 text-suave hover:bg-red-50 hover:text-red-600" title="Excluir registro"><Trash2 size={14} /></button>
                            </form>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="card">
            <CardTitulo titulo="Histórico de atendimentos" />
            {pet.agendamentos.length === 0 ? (
              <Vazio>Nenhum atendimento ainda.</Vazio>
            ) : (
              <div className="overflow-x-auto">
                <table className="tabela">
                  <thead><tr><th>Data</th><th>Serviço</th><th>Profissional</th><th>Status</th><th className="text-right">Valor</th></tr></thead>
                  <tbody>
                    {pet.agendamentos.map((a) => (
                      <tr key={a.id}>
                        <td className="whitespace-nowrap">{formatarData(a.inicio)} {horaLocal(a.inicio)}</td>
                        <td>
                          {a.servico.nome}
                          {a.observacoes && <p className="text-xs text-suave">{a.observacoes}</p>}
                        </td>
                        <td>{a.profissional.nome}</td>
                        <td><StatusPill status={a.status} /></td>
                        <td className="whitespace-nowrap text-right">
                          {a.pacoteId ? <span className="text-xs text-suave">Pacote</span> : formatarMoeda(a.valorEstimado)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
