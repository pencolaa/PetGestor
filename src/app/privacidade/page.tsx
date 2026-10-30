import Link from "next/link";
import type { Metadata } from "next";
import { obterConfiguracao } from "@/lib/configuracao";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Política de privacidade" };

const ATUALIZADA_EM = "29/10/2026";

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold">{titulo}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-texto">{children}</div>
    </section>
  );
}

/** Página pública (LGPD): o que o pet shop guarda, para quê e como o titular exerce seus direitos */
export default async function PrivacidadePage() {
  const config = await obterConfiguracao();
  const contato = [config.telefone, config.endereco].filter(Boolean).join(" · ");

  return (
    <main className="min-h-screen bg-fundo px-4 py-10" style={{ "--cor-principal": config.corPrincipal } as React.CSSProperties}>
      <article className="card mx-auto max-w-2xl space-y-6 p-6 sm:p-8">
        <header className="space-y-1">
          <h1 className="text-xl font-bold">Política de privacidade</h1>
          <p className="text-sm text-suave">{config.nomePetShop} · atualizada em {ATUALIZADA_EM}</p>
        </header>

        <Secao titulo="Quem cuida dos seus dados">
          <p>
            O <strong>{config.nomePetShop}</strong> é o responsável (controlador) pelos dados cadastrados neste
            sistema, conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018).
            {contato && <> Contato: {contato}.</>}
          </p>
        </Secao>

        <Secao titulo="Quais dados guardamos">
          <ul className="list-disc space-y-1 pl-5">
            <li><strong>Tutor:</strong> nome, telefone e, se informados, e-mail, CPF e endereço.</li>
            <li><strong>Pet:</strong> nome, espécie, raça, sexo, data de nascimento, peso, vacinas e observações de cuidado e saúde.</li>
            <li><strong>Atendimentos:</strong> datas, horários, serviços, valores e pacotes.</li>
            <li><strong>Equipe:</strong> nome e e-mail de quem usa o sistema. As senhas são guardadas criptografadas.</li>
          </ul>
        </Secao>

        <Secao titulo="Para que usamos">
          <ul className="list-disc space-y-1 pl-5">
            <li>Agendar e realizar banho, tosa e demais serviços contratados.</li>
            <li>Avisar sobre agendamentos e quando o pet estiver pronto, pelo WhatsApp.</li>
            <li>Cuidar bem do pet (alergias, comportamento, vacinas).</li>
            <li>Controle interno de atendimentos e pacotes.</li>
          </ul>
          <p>
            A base legal é a execução do serviço contratado e o legítimo interesse do pet shop em atender bem o
            cliente. Não vendemos nem usamos seus dados para publicidade de terceiros.
          </p>
        </Secao>

        <Secao titulo="Com quem compartilhamos">
          <p>Somente com os serviços necessários para o sistema funcionar:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li><strong>Vercel</strong> — hospedagem do sistema.</li>
            <li><strong>Neon</strong> — banco de dados (servidores em São Paulo).</li>
            <li><strong>GitHub</strong> — cópia de segurança diária, criptografada.</li>
            <li><strong>WhatsApp</strong> — apenas as mensagens enviadas a você pelo pet shop.</li>
          </ul>
          <p>Alguns desses serviços podem armazenar dados fora do Brasil, com medidas de segurança adequadas.</p>
        </Secao>

        <Secao titulo="Por quanto tempo">
          <p>
            Enquanto você for cliente. Se pedir a exclusão, os dados são apagados do sistema, e as cópias de
            segurança antigas são descartadas automaticamente em até 30 dias, salvo o que a lei obrigar a manter.
          </p>
        </Secao>

        <Secao titulo="Seus direitos">
          <p>
            Você pode, a qualquer momento, pedir para confirmar, ver, corrigir, exportar ou excluir seus dados e os
            do seu pet, falando diretamente com o {config.nomePetShop}
            {config.telefone && <> pelo telefone {config.telefone}</>}. Também pode reclamar à Autoridade Nacional
            de Proteção de Dados (ANPD).
          </p>
        </Secao>

        <Secao titulo="Segurança">
          <p>
            O acesso ao sistema exige login, a conexão é criptografada (HTTPS), as senhas são guardadas com hash e
            há limite de tentativas de login. Só a equipe do pet shop acessa os cadastros.
          </p>
        </Secao>

        <footer className="border-t border-borda pt-4 text-sm">
          <Link href="/login" className="text-primary hover:underline">Voltar</Link>
        </footer>
      </article>
    </main>
  );
}
