import { exigirAdmin } from "@/lib/auth";
import { obterConfiguracao } from "@/lib/configuracao";
import { prisma } from "@/lib/prisma";
import { Cabecalho, CardTitulo, Pill } from "@/components/ui";
import { FormConfiguracao, FormUsuario } from "./Forms";
import { alternarUsuario } from "./actions";

export default async function ConfiguracoesPage() {
  const session = await exigirAdmin();
  const config = await obterConfiguracao();
  const usuarios = await prisma.usuario.findMany({ orderBy: { nome: "asc" } });

  return (
    <>
      <Cabecalho titulo="Configurações" subtitulo="Dados do pet shop, identidade visual e usuários" />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <CardTitulo titulo="Pet shop" />
          <FormConfiguracao config={config} />
        </section>

        <section className="card">
          <CardTitulo titulo="Usuários" />
          <div className="overflow-x-auto">
            <table className="tabela">
              <thead>
                <tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th></th></tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.id} className={u.ativo ? "" : "opacity-50"}>
                    <td className="font-medium">{u.nome}</td>
                    <td className="text-suave">{u.email}</td>
                    <td><Pill cor={u.perfil === "ADMIN" ? "azul" : "cinza"}>{u.perfil === "ADMIN" ? "Admin" : "Atendente"}</Pill></td>
                    <td className="text-right">
                      {u.id !== session.user.id && (
                        <form action={alternarUsuario.bind(null, u.id)}>
                          <button className="btn-ghost px-2 py-1 text-xs">{u.ativo ? "Desativar" : "Reativar"}</button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-borda">
            <FormUsuario />
          </div>
        </section>
      </div>
    </>
  );
}
