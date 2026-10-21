import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageCircle, Pencil, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatarData, horaLocal, idade } from "@/lib/datas";
import { formatarMoeda, formatarTelefone, ROTULO_ESPECIE, ROTULO_PAGAMENTO, ROTULO_SEXO } from "@/lib/formato";
import { linkWaMe } from "@/lib/whatsapp";
import { Cabecalho, CardTitulo, Vazio } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { FormPet, FormTutor } from "../Forms";

export default async function TutorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tutor = await prisma.tutor.findUnique({
    where: { id },
    include: {
      pets: { orderBy: { nome: "asc" } },
      vendas: { orderBy: { criadoEm: "desc" }, take: 10, include: { itens: true } },
    },
  });
  if (!tutor) notFound();

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
          <FormTutor tutor={tutor} />
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
            <CardTitulo titulo="Últimas compras" />
            {tutor.vendas.length === 0 ? (
              <Vazio>Nenhuma compra registrada.</Vazio>
            ) : (
              <div className="overflow-x-auto">
                <table className="tabela">
                  <thead><tr><th>Data</th><th>Itens</th><th>Pagamento</th><th className="text-right">Total</th></tr></thead>
                  <tbody>
                    {tutor.vendas.map((v) => (
                      <tr key={v.id}>
                        <td className="whitespace-nowrap">{formatarData(v.criadoEm)} {horaLocal(v.criadoEm)}</td>
                        <td className="text-suave">{v.itens.map((i) => `${i.quantidade}× ${i.descricao}`).join(", ")}</td>
                        <td>{ROTULO_PAGAMENTO[v.formaPagamento]}</td>
                        <td className="text-right font-semibold">{formatarMoeda(v.total)}</td>
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
