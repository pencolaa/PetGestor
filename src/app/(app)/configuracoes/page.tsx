import { Pencil, Plus } from "lucide-react";
import { exigirAdmin } from "@/lib/auth";
import { obterConfiguracao } from "@/lib/configuracao";
import { prisma } from "@/lib/prisma";
import { formatarMoeda, ROTULO_TIPO_SERVICO } from "@/lib/formato";
import { Cabecalho, CardTitulo, Pill, Vazio } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { BotaoRedefinirSenha, FormConfiguracao, FormProfissional, FormServico, FormUsuario } from "./Forms";
import { alternarUsuario } from "./actions";

export const metadata = { title: "Configurações" };

function duracao(min: number) {
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)}h${min % 60 ? "30" : ""}`;
}

export default async function ConfiguracoesPage() {
  const session = await exigirAdmin();
  const [config, usuarios, servicos, profissionais] = await Promise.all([
    obterConfiguracao(),
    prisma.usuario.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true, email: true, perfil: true, ativo: true } }),
    prisma.servico.findMany({ orderBy: [{ ativo: "desc" }, { tipo: "asc" }, { nome: "asc" }] }),
    prisma.profissional.findMany({ orderBy: [{ ativo: "desc" }, { tipo: "asc" }, { nome: "asc" }] }),
  ]);

  const editar = <Pencil size={14} />;
  const classeEditar = "rounded-lg p-1.5 text-suave hover:bg-fundo hover:text-texto";

  return (
    <>
      <Cabecalho titulo="Configurações" subtitulo="Pet shop, serviços, profissionais e usuários" />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card h-fit">
          <CardTitulo titulo="Pet shop" />
          <FormConfiguracao
            config={{
              nomePetShop: config.nomePetShop, corPrincipal: config.corPrincipal, logoUrl: config.logoUrl,
              telefone: config.telefone, endereco: config.endereco, abertura: config.abertura, fechamento: config.fechamento,
            }}
          />
        </section>

        <div className="space-y-6">
          <section className="card" id="servicos">
            <CardTitulo titulo="Serviços">
              <Modal titulo="Novo serviço" gatilho={<><Plus size={14} /> Novo</>} classeGatilho="btn-secondary px-3 py-1.5 text-xs">
                <FormServico />
              </Modal>
            </CardTitulo>
            {servicos.length === 0 ? (
              <Vazio>Cadastre os serviços que o pet shop oferece (banho, tosa, consulta...).</Vazio>
            ) : (
              <div className="overflow-x-auto">
                <table className="tabela min-w-0!">
                  <thead><tr><th>Serviço</th><th>Tipo</th><th>Duração</th><th className="text-right">Preço</th><th></th></tr></thead>
                  <tbody>
                    {servicos.map((s) => (
                      <tr key={s.id} className={s.ativo ? "" : "opacity-50"}>
                        <td className="font-medium">{s.nome}{!s.ativo && <span className="ml-2"><Pill cor="cinza">Inativo</Pill></span>}</td>
                        <td className="text-suave">{ROTULO_TIPO_SERVICO[s.tipo]}</td>
                        <td className="text-suave">{duracao(s.duracaoMin)}</td>
                        <td className="text-right">{formatarMoeda(s.preco)}</td>
                        <td className="text-right">
                          <Modal titulo="Editar serviço" gatilho={editar} classeGatilho={classeEditar}>
                            <FormServico servico={{ id: s.id, nome: s.nome, tipo: s.tipo, duracaoMin: s.duracaoMin, preco: s.preco, ativo: s.ativo }} />
                          </Modal>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="card" id="profissionais">
            <CardTitulo titulo="Profissionais">
              <Modal titulo="Novo profissional" gatilho={<><Plus size={14} /> Novo</>} classeGatilho="btn-secondary px-3 py-1.5 text-xs">
                <FormProfissional />
              </Modal>
            </CardTitulo>
            {profissionais.length === 0 ? (
              <Vazio>Cadastre quem atende (banhistas, tosadores, veterinários). Cada um vira uma coluna na agenda.</Vazio>
            ) : (
              <ul className="divide-y divide-borda">
                {profissionais.map((p) => (
                  <li key={p.id} className={`flex items-center justify-between gap-3 px-5 py-3 text-sm ${p.ativo ? "" : "opacity-50"}`}>
                    <span>
                      <span className="font-medium">{p.nome}</span> <span className="text-suave">· {ROTULO_TIPO_SERVICO[p.tipo]}</span>
                      {!p.ativo && <span className="ml-2"><Pill cor="cinza">Inativo</Pill></span>}
                    </span>
                    <Modal titulo="Editar profissional" gatilho={editar} classeGatilho={classeEditar}>
                      <FormProfissional profissional={{ id: p.id, nome: p.nome, tipo: p.tipo, ativo: p.ativo }} />
                    </Modal>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <section className="card lg:col-span-2">
          <CardTitulo titulo="Usuários" />
          <div className="overflow-x-auto">
            <table className="tabela">
              <thead>
                <tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th></th></tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.id} className={u.ativo ? "" : "opacity-50"}>
                    <td className="font-medium">{u.nome}{u.id === session.user.id && <span className="ml-2 text-xs text-suave">(você)</span>}</td>
                    <td className="text-suave">{u.email}</td>
                    <td><Pill cor={u.perfil === "ADMIN" ? "azul" : "cinza"}>{u.perfil === "ADMIN" ? "Admin" : "Atendente"}</Pill></td>
                    <td className="text-right">
                      {u.id !== session.user.id && (
                        <div className="flex items-center justify-end gap-1">
                          {u.ativo && <BotaoRedefinirSenha id={u.id} nome={u.nome} />}
                          <form action={alternarUsuario.bind(null, u.id)}>
                            <button className="btn-ghost px-2 py-1 text-xs">{u.ativo ? "Desativar" : "Reativar"}</button>
                          </form>
                        </div>
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
