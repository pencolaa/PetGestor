# PetGestor — gestão para pet shops

Sistema web para pequenos pet shops: agenda de banho/tosa/veterinária, clientes e pets
(vacinas, pacotes, histórico), PDV com produtos e serviços no mesmo carrinho, estoque e
painel com lembretes de WhatsApp.

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

Logins de demonstração (criados pelo seed):

| Perfil    | E-mail                 | Senha        |
|-----------|------------------------|--------------|
| Admin     | admin@petshop.com      | admin123     |
| Atendente | atendente@petshop.com  | atendente123 |

O seed gera os dados **relativos à data de hoje** (agenda do dia, vacinas vencendo,
aniversários da semana), então a demonstração sempre parece "viva". Rodar o seed de novo
apaga e recria tudo — e invalida sessões abertas (é só entrar de novo).

## Perfis

- **Admin:** tudo, mais Configurações (nome, cor principal, logo, usuários), cadastro/edição
  de produtos e entrada de mercadoria.
- **Atendente:** painel, agenda, clientes e pets, PDV e consulta de estoque.

## Organização

```
prisma/schema.prisma        modelo de dados (valores em centavos)
prisma/seed.ts              dados de demonstração
src/app/(app)/              telas autenticadas: painel, agenda, clientes, pdv, estoque, configuracoes
src/lib/datas.ts            datas sempre no fuso America/Sao_Paulo
src/lib/agenda.ts           horários de funcionamento e checagem de conflito
src/lib/lembretes.ts        vacinas vencendo, 30+ dias sem banho, aniversários
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
- **PDV:** preços sempre lidos do banco; a baixa de estoque é atômica e falha se não houver
  saldo; atendimentos da agenda cobrados no PDV ficam marcados como pagos.
- Horário de funcionamento (08:00–18:00, blocos de 30 min) em `src/lib/agenda.ts`.
