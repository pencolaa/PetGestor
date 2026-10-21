# PetGestor — gestão para pet shops

Sistema web para pequenos pet shops, focado em duas coisas: **clientes e pets** (ficha,
vacinas, pacotes de banho, histórico) e **agenda** de banho, tosa e veterinária, com visão
por dia, por semana e lista dos horários marcados.

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · Prisma 6 + PostgreSQL · NextAuth (e-mail e senha)

## Rodando localmente

```bash
cp .env.example .env          # ajuste NEXTAUTH_SECRET
npm install
npm run db:up                 # sobe o PostgreSQL no Docker (porta 5433)
npm run db:migrate            # cria as tabelas
npm run db:seed               # dados de demonstração
npm run dev                   # http://localhost:3300
```

O seed cria dois usuários: `admin@petshop.com` (administrador) e `atendente@petshop.com`.
**As senhas nunca ficam no repositório:** defina `SEED_SENHA_ADMIN` e `SEED_SENHA_ATENDENTE`
no `.env`, ou deixe em branco para o seed gerar senhas aleatórias e gravá-las em
`.credenciais.local` (arquivo ignorado pelo Git).

O seed gera os dados **relativos à data de hoje** (agenda do dia e dos próximos dias,
vacinas vencendo), então a demonstração sempre parece "viva". Rodar o seed de novo
apaga e recria tudo — e invalida sessões abertas (é só entrar de novo).

## Primeiro uso (pet shop novo)

1. Entre com o usuário administrador.
2. Em **Configurações**: nome, logo, cor, horário de funcionamento, **serviços** (duração e
   preço) e **profissionais** (cada um vira uma coluna na agenda).
3. Ainda em Configurações, crie os usuários da equipe. Quem esquecer a senha recebe uma
   senha provisória pelo botão "Nova senha"; cada um troca a sua em **Minha conta**.

## Perfis

- **Admin:** tudo, mais Configurações (pet shop, horário, serviços, profissionais, usuários)
  e exclusão de tutores e pets.
- **Atendente:** agenda e clientes e pets.

## Organização

```
prisma/schema.prisma        modelo de dados (valores em centavos)
prisma/seed.ts              dados de demonstração
src/app/(app)/              telas autenticadas: agenda (tela inicial), clientes, configuracoes
src/lib/datas.ts            datas sempre no fuso America/Sao_Paulo
src/lib/agenda.ts           horários de funcionamento e checagem de conflito
src/lib/whatsapp/           camada isolada de WhatsApp (hoje: links wa.me)
```

### WhatsApp

Hoje os botões abrem `wa.me` com a mensagem pronta. Todos os textos ficam em
`src/lib/whatsapp/mensagens.ts`, e o envio passa por `provedorWhatsApp()` em
`src/lib/whatsapp/index.ts`. Para usar uma API oficial (Meta Cloud API, Z-API, Twilio...),
implemente `ProvedorWhatsApp` com `modo: "api"` e troque o retorno de `provedorWhatsApp()`.

### Regras importantes

- **Conflito de agenda:** o mesmo profissional não pode ter dois atendimentos sobrepostos
  (checado no servidor com trava por profissional; cancelados liberam o horário).
- **Pacotes:** agendar com pacote consome um banho; cancelar devolve.
- As tabelas de produtos, estoque e vendas continuam no banco (sem uso pelas telas), para
  não perder dados; podem ser removidas numa migração futura.
- Horário de funcionamento configurável em Configurações (blocos de 30 min).
- Agendamentos podem ser remarcados (data, horário, profissional) com a mesma checagem de conflito.
