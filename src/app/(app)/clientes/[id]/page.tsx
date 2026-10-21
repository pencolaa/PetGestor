import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageCircle, Pencil, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { diaISO, formatarData, horaLocal, idade } from "@/lib/datas";
import { formatarTelefone, ROTULO_ESPECIE, ROTULO_SEXO } from "@/lib/formato";
import { linkWaMe } from "@/lib/whatsapp";
import { Cabecalho, CardTitulo, StatusPill, Vazio } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { FormPet, FormTutor } from "../Forms";

export default async function TutorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tutor = await prisma.tutor.findUnique({
    where: { id },
    include: {
      pets: { orderBy: { nome: "asc" } },
    },
  });
  if (!tutor) notFound();

  // Próximos horários primeiro, depois os mais recentes
  const agora = new Date();
  const [proximos, recentes] = await Promise.all([
    prisma.agendamento.findMany({
      where: { pet: { tutorId: id }, inicio: { gte: agora }, status: { not: "CANCELADO" } },
      include: { pet: true, servico: true, profissional: true },
      orderBy: { inicio: "asc" },
      take: 10,
    }),
    prisma.agendamento.findMany({
      where: { pet: { tutorId: id }, inicio: { lt: agora } },
      include: { pet: true, servico: true, profissional: true },
      orderBy: { inicio: "desc" },
      take: 10,
    }),
  ]);
  const agendamentos = [...proximos, ...recentes];

  return (
    <>
      <Link href="/clientes" className="mb-3 inline-flex items-center gap-1 text-sm text-suave hover:text-texto">
        <ArrowLeft size={14} /> Clientes
      </Link>
      <Cabecalho titulo={tutor.nome} subtitulo={`Cliente desde ${formatarData(tutor.criadoEm)}`}>
        <a href={linkWaMe(tutor.telefone, `Olá, ${tutor.nome.split(" ")[0]}!`)} target="_blank" rel="noopener noreferrer" className="btn-secondary">
          <MessageCircle size={16} /> WhatsApp
        </a>
        <Modal titulo="Editar tutor" gatilho={<><Pencil size={16} /> Editar</>} classeGatilho="btn-secondary">
          <FormTutor tutor={{ id: tutor.id, nome: tutor.nome, telefone: tutor.telefone, email: tutor.email, cpf: tutor.cpf, endereco: tutor.endereco }} />
        </Modal>
        <Modal titulo="Novo pet" gatilho={<><Plus size={16} /> Novo pet</>}>
          <FormPet tutorId={tutor.id} />
        </Modal>
      </Cabecalho>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card h-fit">
          <CardTitulo titulo="Contato" />
          <dl className="space-y-3 p-5 text-sm">
            <div><dt className="label">Telefone</dt><dd>{formatarTelefone(tutor.telefone)}</dd></div>
            <div><dt className="label">E-mail</dt><dd>{tutor.email ?? "—"}</dd></div>
            <div><dt className="label">CPF</dt><dd>{tutor.cpf ?? "—"}</dd></div>
            <div><dt className="label">Endereço</dt><dd>{tutor.endereco ?? "—"}</dd></div>
          </dl>
        </section>

        <div className="space-y-6 lg:col-span-2">
          <section className="card">
            <CardTitulo titulo={`Pets (${tutor.pets.length})`} />
            {tutor.pets.length === 0 ? (
              <Vazio>Nenhum pet cadastrado.</Vazio>
            ) : (
              <div className="grid gap-3 p-5 sm:grid-cols-2">
                {tutor.pets.map((p) => (
                  <Link key={p.id} href={`/clientes/pets/${p.id}`} className="rounded-xl border border-borda p-4 transition hover:border-primary hover:bg-primary-soft">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-xl">
                        {p.especie === "GATO" ? "🐱" : p.especie === "CAO" ? "🐶" : "🐾"}
                      </span>
                      <div>
                        <p className="font-semibold">{p.nome}</p>
                        <p className="text-xs text-suave">
                          {ROTULO_ESPECIE[p.especie]} · {p.raca ?? "SRD"} · {ROTULO_SEXO[p.sexo]} · {idade(p.dataNascimento)}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="card">
            <CardTitulo titulo="Agendamentos">
              <Link href="/agenda?novo=1" className="text-sm font-semibold text-primary hover:underline">Novo agendamento</Link>
            </CardTitulo>
            {agendamentos.length === 0 ? (
              <Vazio>Nenhum agendamento ainda.</Vazio>
            ) : (
              <div className="overflow-x-auto">
                <table className="tabela">
                  <thead><tr><th>Data</th><th>Pet</th><th>Serviço</th><th>Profissional</th><th>Status</th></tr></thead>
                  <tbody>
                    {agendamentos.map((a) => (
                      <tr key={a.id} className={a.inicio >= agora ? "bg-primary-soft/40" : ""}>
                        <td className="whitespace-nowrap">
                          <Link href={`/agenda?data=${diaISO(a.inicio)}`} className="hover:text-primary">{formatarData(a.inicio)} {horaLocal(a.inicio)}</Link>
                        </td>
                        <td><Link href={`/clientes/pets/${a.petId}`} className="font-medium hover:text-primary">{a.pet.nome}</Link></td>
                        <td>{a.servico.nome}</td>
                        <td className="text-suave">{a.profissional.nome}</td>
                        <td><StatusPill status={a.status} /></td>
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
