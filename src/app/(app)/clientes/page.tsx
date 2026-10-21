import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Search, UserPlus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { apenasDigitos, formatarTelefone } from "@/lib/formato";
import { Cabecalho, Vazio } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { FormTutor } from "./Forms";

export const metadata = { title: "Clientes e pets" };

export default async function ClientesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = (await searchParams).q?.trim() ?? "";
  const digitos = apenasDigitos(q);

  const where: Prisma.TutorWhereInput = q
    ? {
        OR: [
          { nome: { contains: q, mode: "insensitive" } },
          { pets: { some: { nome: { contains: q, mode: "insensitive" } } } },
          ...(digitos.length >= 3 ? [{ telefone: { contains: digitos } }] : []),
        ],
      }
    : {};

  const [tutores, total] = await Promise.all([
    prisma.tutor.findMany({
      where,
      orderBy: { nome: "asc" },
      take: 100,
      include: { pets: { select: { id: true, nome: true, especie: true }, orderBy: { nome: "asc" } } },
    }),
    prisma.tutor.count(),
  ]);

  return (
    <>
      <Cabecalho titulo="Clientes e pets" subtitulo={`${total} tutores cadastrados`}>
        <Modal titulo="Novo tutor" gatilho={<><UserPlus size={16} /> Novo tutor</>}>
          <FormTutor />
        </Modal>
      </Cabecalho>

      <form className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-suave" />
          <input name="q" defaultValue={q} placeholder="Buscar por tutor, telefone ou nome do pet" className="input pl-9" />
        </div>
        <button className="btn-secondary">Buscar</button>
        {q && <Link href="/clientes" className="btn-ghost">Limpar</Link>}
      </form>

      <div className="card overflow-x-auto">
        {tutores.length === 0 ? (
          <Vazio>Nenhum tutor encontrado{q && <> para “{q}”</>}.</Vazio>
        ) : (
          <table className="tabela">
            <thead>
              <tr>
                <th>Tutor</th>
                <th>Telefone</th>
                <th>Pets</th>
                <th className="text-right"></th>
              </tr>
            </thead>
            <tbody>
              {tutores.map((t) => (
                <tr key={t.id} className="hover:bg-fundo/60">
                  <td>
                    <Link href={`/clientes/${t.id}`} className="font-semibold hover:text-primary">{t.nome}</Link>
                    {t.email && <p className="text-xs text-suave">{t.email}</p>}
                  </td>
                  <td className="whitespace-nowrap text-suave">{formatarTelefone(t.telefone)}</td>
                  <td>
                    <div className="flex flex-wrap gap-1.5">
                      {t.pets.map((p) => (
                        <Link key={p.id} href={`/clientes/pets/${p.id}`} className="pill bg-primary-soft text-primary hover:bg-primary hover:text-white">
                          {p.especie === "GATO" ? "🐱" : p.especie === "CAO" ? "🐶" : "🐾"} {p.nome}
                        </Link>
                      ))}
                      {t.pets.length === 0 && <span className="text-xs text-suave">Nenhum pet</span>}
                    </div>
                  </td>
                  <td className="text-right">
                    <Link href={`/clientes/${t.id}`} className="btn-ghost px-3 py-1 text-xs">Abrir</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
