import { exigirSessao } from "@/lib/auth";
import { Cabecalho, CardTitulo } from "@/components/ui";
import { FormSenha } from "./FormSenha";

export const metadata = { title: "Minha conta" };

export default async function ContaPage() {
  const session = await exigirSessao();
  return (
    <>
      <Cabecalho titulo="Minha conta" />
      <div className="grid max-w-3xl gap-6 md:grid-cols-2">
        <section className="card h-fit">
          <CardTitulo titulo="Dados" />
          <dl className="space-y-3 p-5 text-sm">
            <div><dt className="label">Nome</dt><dd>{session.user.name}</dd></div>
            <div><dt className="label">E-mail</dt><dd>{session.user.email}</dd></div>
            <div><dt className="label">Perfil</dt><dd>{session.user.perfil === "ADMIN" ? "Administrador" : "Atendente"}</dd></div>
          </dl>
        </section>
        <section className="card">
          <CardTitulo titulo="Trocar senha" />
          <FormSenha />
        </section>
      </div>
    </>
  );
}
