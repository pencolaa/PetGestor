import { PrismaClient, type Especie, type Sexo, type StatusAgendamento } from "@prisma/client";
import bcrypt from "bcryptjs";
import { gerarSenha } from "../src/lib/senhas";
import { writeFileSync } from "node:fs";
import { dataHora, hojeISO, somarDias } from "../src/lib/datas";

const prisma = new PrismaClient();

// Gerador pseudoaleatório determinístico, para a demo ficar sempre igual
let semente = 42;
function rand() {
  semente = (semente * 1664525 + 1013904223) % 4294967296;
  return semente / 4294967296;
}
function senhaAleatoria() {
  return gerarSenha();
}
function escolher<T>(lista: T[]): T {
  return lista[Math.floor(rand() * lista.length)];
}

const hoje = hojeISO();
const dia = (n: number) => somarDias(hoje, n);

async function limpar() {
  await prisma.itemVenda.deleteMany();
  await prisma.movimentacaoEstoque.deleteMany();
  await prisma.venda.deleteMany();
  await prisma.agendamento.deleteMany();
  await prisma.pacote.deleteMany();
  await prisma.vacina.deleteMany();
  await prisma.pet.deleteMany();
  await prisma.tutor.deleteMany();
  await prisma.produto.deleteMany();
  await prisma.servico.deleteMany();
  await prisma.profissional.deleteMany();
  await prisma.usuario.deleteMany();
  await prisma.configuracao.deleteMany();
}

async function main() {
  await limpar();

  await prisma.configuracao.create({
    data: {
      id: 1,
      nomePetShop: "Patinhas Pet Shop",
      corPrincipal: "#0F766E",
      telefone: "(11) 3456-7890",
      endereco: "Rua das Acácias, 120 — São Paulo/SP",
    },
  });

  // Senhas nunca ficam no código: vêm do .env (SEED_SENHA_ADMIN / SEED_SENHA_ATENDENTE)
  // ou são geradas na hora e gravadas em .credenciais.local, que o Git ignora.
  const senhaAdmin = process.env.SEED_SENHA_ADMIN || senhaAleatoria();
  const senhaAtendente = process.env.SEED_SENHA_ATENDENTE || senhaAleatoria();
  await prisma.usuario.create({
    data: { nome: "Mariana Souza", email: "admin@petshop.com", senhaHash: await bcrypt.hash(senhaAdmin, 10), perfil: "ADMIN" },
  });
  await prisma.usuario.create({
    data: { nome: "Lucas Lima", email: "atendente@petshop.com", senhaHash: await bcrypt.hash(senhaAtendente, 10), perfil: "ATENDENTE" },
  });
  const geradas = !process.env.SEED_SENHA_ADMIN || !process.env.SEED_SENHA_ATENDENTE;
  if (geradas) {
    const linhas = [
      `# Gerado pelo seed em ${new Date().toISOString()} — NÃO commitar`,
      `admin@petshop.com ${senhaAdmin}`,
      `atendente@petshop.com ${senhaAtendente}`,
    ];
    writeFileSync(".credenciais.local", linhas.join("\n") + "\n");
  }

  const [ana, bruno, carla, rafael] = await Promise.all([
    prisma.profissional.create({ data: { nome: "Ana", tipos: ["BANHO"] } }),
    prisma.profissional.create({ data: { nome: "Bruno", tipos: ["BANHO", "TOSA"] } }),
    prisma.profissional.create({ data: { nome: "Carla", tipos: ["BANHO", "TOSA"] } }),
    prisma.profissional.create({ data: { nome: "Dr. Rafael", tipos: ["VETERINARIA"] } }),
  ]);

  const s = {
    banhoP: await prisma.servico.create({ data: { nome: "Banho — pequeno porte", tipo: "BANHO", duracaoMin: 60, preco: 4500 } }),
    banhoM: await prisma.servico.create({ data: { nome: "Banho — médio porte", tipo: "BANHO", duracaoMin: 60, preco: 6000 } }),
    banhoG: await prisma.servico.create({ data: { nome: "Banho — grande porte", tipo: "BANHO", duracaoMin: 90, preco: 8000 } }),
    tosaHig: await prisma.servico.create({ data: { nome: "Tosa higiênica", tipo: "TOSA", duracaoMin: 30, preco: 4000 } }),
    tosaComp: await prisma.servico.create({ data: { nome: "Banho e tosa completa", tipo: "TOSA", duracaoMin: 120, preco: 11000 } }),
    consulta: await prisma.servico.create({ data: { nome: "Consulta veterinária", tipo: "VETERINARIA", duracaoMin: 30, preco: 15000 } }),
    vacinacao: await prisma.servico.create({ data: { nome: "Aplicação de vacina", tipo: "VETERINARIA", duracaoMin: 30, preco: 9000 } }),
  };

  // Tutores e pets
  type PetSeed = { nome: string; especie: Especie; raca: string; sexo: Sexo; nasc: string; peso: number; obs?: string };
  const tutores: { nome: string; telefone: string; email?: string; pets: PetSeed[] }[] = [
    { nome: "Fernanda Oliveira", telefone: "11987654321", email: "fernanda@email.com", pets: [
      { nome: "Thor", especie: "CAO", raca: "Golden Retriever", sexo: "MACHO", nasc: "2020-03-14", peso: 32.5, obs: "Agitado no secador. Usar focinheira na tosa das patas." },
      { nome: "Mel", especie: "CAO", raca: "Shih-tzu", sexo: "FEMEA", nasc: "2021-07-02", peso: 5.8 },
    ] },
    { nome: "Ricardo Almeida", telefone: "11991234567", pets: [
      { nome: "Luna", especie: "GATO", raca: "Siamês", sexo: "FEMEA", nasc: "2019-11-20", peso: 4.1, obs: "Alérgica a shampoo com fragrância." },
    ] },
    { nome: "Juliana Costa", telefone: "11998765432", email: "ju.costa@email.com", pets: [
      { nome: "Bob", especie: "CAO", raca: "Bulldog Francês", sexo: "MACHO", nasc: "2022-01-09", peso: 12.3, obs: "Braquicefálico: evitar calor excessivo." },
    ] },
    { nome: "Paulo Henrique", telefone: "11976543210", pets: [
      { nome: "Pipoca", especie: "CAO", raca: "Poodle", sexo: "FEMEA", nasc: "2018-05-30", peso: 6.2 },
      { nome: "Nina", especie: "GATO", raca: "SRD", sexo: "FEMEA", nasc: "2023-02-11", peso: 3.4 },
    ] },
    { nome: "Camila Rodrigues", telefone: "11965432109", pets: [
      { nome: "Max", especie: "CAO", raca: "Labrador", sexo: "MACHO", nasc: "2017-09-03", peso: 30.0, obs: "Idoso, artrose. Cuidado ao subir na mesa." },
    ] },
    { nome: "André Santos", telefone: "11954321098", email: "andre.s@email.com", pets: [
      { nome: "Amora", especie: "CAO", raca: "Spitz Alemão", sexo: "FEMEA", nasc: "2022-08-17", peso: 3.2 },
    ] },
    { nome: "Beatriz Martins", telefone: "11943210987", pets: [
      { nome: "Simba", especie: "GATO", raca: "Persa", sexo: "MACHO", nasc: "2020-12-25", peso: 5.0 },
    ] },
    { nome: "Gustavo Pereira", telefone: "11932109876", pets: [
      { nome: "Rex", especie: "CAO", raca: "Pastor Alemão", sexo: "MACHO", nasc: "2019-04-08", peso: 35.4, obs: "Não gosta de outros cães machos." },
    ] },
    { nome: "Larissa Fernandes", telefone: "11921098765", pets: [
      { nome: "Bidu", especie: "CAO", raca: "Yorkshire", sexo: "MACHO", nasc: "2021-10-12", peso: 2.9 },
      { nome: "Lola", especie: "CAO", raca: "Maltês", sexo: "FEMEA", nasc: "2023-06-21", peso: 3.1 },
    ] },
    { nome: "Rafael Gomes", telefone: "11910987654", pets: [
      { nome: "Paçoca", especie: "CAO", raca: "Dachshund", sexo: "MACHO", nasc: "2020-02-29", peso: 8.0 },
    ] },
    { nome: "Patrícia Barbosa", telefone: "11909876543", pets: [
      { nome: "Frida", especie: "GATO", raca: "Maine Coon", sexo: "FEMEA", nasc: "2021-03-05", peso: 6.7 },
    ] },
    { nome: "Marcelo Ribeiro", telefone: "11998123456", pets: [
      { nome: "Zeus", especie: "CAO", raca: "Rottweiler", sexo: "MACHO", nasc: "2018-08-15", peso: 42.0, obs: "Usar focinheira. Tutor prefere horário cedo." },
    ] },
  ];

  // Ajusta dois aniversários para cair nos próximos dias, para aparecerem nos lembretes
  tutores[1].pets[0].nasc = `2019-${dia(2).slice(5)}`;
  tutores[6].pets[0].nasc = `2020-${dia(5).slice(5)}`;

  const pets: Awaited<ReturnType<typeof prisma.pet.create>>[] = [];
  for (const t of tutores) {
    const tutor = await prisma.tutor.create({ data: { nome: t.nome, telefone: t.telefone, email: t.email } });
    for (const p of t.pets) {
      pets.push(
        await prisma.pet.create({
          data: {
            nome: p.nome, especie: p.especie, raca: p.raca, sexo: p.sexo, peso: p.peso,
            dataNascimento: dataHora(p.nasc, "12:00"), observacoes: p.obs, tutorId: tutor.id,
          },
        }),
      );
    }
  }

  // Vacinas: mistura de em dia, vencendo em breve e atrasadas
  const vacinasCao = ["V10 (polivalente)", "Antirrábica", "Gripe canina", "Giárdia"];
  const vacinasGato = ["V4 (quádrupla felina)", "Antirrábica", "FeLV"];
  for (const [i, pet] of pets.entries()) {
    const nomes = pet.especie === "GATO" ? vacinasGato : vacinasCao;
    for (const [j, nome] of nomes.entries()) {
      // deslocamento da próxima dose: alguns atrasados, alguns vencendo nesta semana
      let proxima: number;
      if (i % 5 === 0 && j === 0) proxima = -12; // atrasada
      else if (i % 4 === 1 && j === 1) proxima = 4; // vence em 4 dias
      else if (i % 6 === 2 && j === 0) proxima = 2;
      else proxima = 60 + Math.floor(rand() * 200);
      const aplicada = proxima - 365;
      await prisma.vacina.create({
        data: { petId: pet.id, nome, aplicadaEm: dataHora(dia(aplicada), "10:00"), proximaDose: dataHora(dia(proxima), "10:00"), lote: `L${2400 + i * 10 + j}` },
      });
    }
  }

  // Pacotes de banho
  const pacoteThor = await prisma.pacote.create({ data: { petId: pets[0].id, servicoId: s.banhoG.id, total: 4, usados: 2, validade: dataHora(dia(40), "23:59"), valor: 28000 } });
  await prisma.pacote.create({ data: { petId: pets[1].id, servicoId: s.banhoP.id, total: 4, usados: 4, validade: dataHora(dia(-3), "23:59"), valor: 16000 } });
  await prisma.pacote.create({ data: { petId: pets[4].id, servicoId: s.banhoP.id, total: 8, usados: 3, validade: dataHora(dia(75), "23:59"), valor: 30000 } });

  // Histórico de atendimentos (últimos 60 dias). Alguns pets ficam 30+ dias sem banho de propósito.
  const banhistas = [ana, bruno];
  const semBanhoRecente = new Set([3, 6, 10]); // índices de pets cujo último banho foi há mais de 30 dias
  const historico: { pet: number; dias: number; hora: string; servico: typeof s.banhoP; prof: typeof ana }[] = [];
  for (const [i, pet] of pets.entries()) {
    const servicoBanho = pet.peso && pet.peso > 25 ? s.banhoG : pet.peso && pet.peso > 10 ? s.banhoM : s.banhoP;
    const ultimo = semBanhoRecente.has(i) ? -(35 + i) : -(3 + ((i * 3) % 20));
    historico.push({ pet: i, dias: ultimo, hora: escolher(["09:00", "10:00", "11:00", "14:00", "15:00"]), servico: servicoBanho, prof: escolher(banhistas) });
    historico.push({ pet: i, dias: ultimo - 21, hora: escolher(["09:00", "13:00", "16:00"]), servico: servicoBanho, prof: escolher(banhistas) });
    if (i % 3 === 0) historico.push({ pet: i, dias: -(10 + i), hora: "10:30", servico: s.consulta, prof: rafael });
    if (i % 4 === 2 && !semBanhoRecente.has(i)) historico.push({ pet: i, dias: -(6 + i), hora: "14:00", servico: s.tosaComp, prof: carla });
  }

  for (const h of historico) {
    const pet = pets[h.pet];
    const inicio = dataHora(dia(h.dias), h.hora);
    await prisma.agendamento.create({
      data: {
        petId: pet.id, servicoId: h.servico.id, profissionalId: h.prof.id, inicio,
        fim: new Date(inicio.getTime() + h.servico.duracaoMin * 60000),
        status: "CONCLUIDO", valorEstimado: h.servico.preco, pago: true,
      },
    });
  }

  // Agenda de hoje com status variados
  const hojeAg: { pet: number; hora: string; servico: typeof s.banhoP; prof: typeof ana; status: StatusAgendamento; obs?: string; pago?: boolean; pacote?: string }[] = [
    { pet: 0, hora: "08:00", servico: s.banhoG, prof: ana, status: "PRONTO", pacote: pacoteThor.id, pago: true },
    { pet: 1, hora: "08:30", servico: s.tosaComp, prof: carla, status: "EM_ATENDIMENTO", obs: "Tosa bebê, deixar orelhas compridas." },
    { pet: 5, hora: "09:00", servico: s.banhoP, prof: bruno, status: "EM_ATENDIMENTO" },
    { pet: 7, hora: "09:30", servico: s.consulta, prof: rafael, status: "CONFIRMADO", obs: "Retorno — coceira nas orelhas." },
    { pet: 2, hora: "10:30", servico: s.banhoP, prof: ana, status: "CONFIRMADO" },
    { pet: 9, hora: "11:00", servico: s.banhoG, prof: bruno, status: "AGUARDANDO" },
    { pet: 12, hora: "13:30", servico: s.vacinacao, prof: rafael, status: "CONFIRMADO" },
    { pet: 4, hora: "14:00", servico: s.banhoP, prof: ana, status: "AGUARDANDO" },
    { pet: 11, hora: "15:00", servico: s.tosaHig, prof: carla, status: "AGUARDANDO" },
    { pet: 14, hora: "16:00", servico: s.banhoG, prof: bruno, status: "CONFIRMADO", obs: "Usar focinheira." },
  ];
  for (const a of hojeAg) {
    const inicio = dataHora(hoje, a.hora);
    await prisma.agendamento.create({
      data: {
        petId: pets[a.pet].id, servicoId: a.servico.id, profissionalId: a.prof.id, inicio,
        fim: new Date(inicio.getTime() + a.servico.duracaoMin * 60000), status: a.status,
        valorEstimado: a.pacote ? 0 : a.servico.preco, observacoes: a.obs, pago: a.pago ?? false,
        pacoteId: a.pacote, confirmarWhatsapp: a.status === "CONFIRMADO",
      },
    });
  }

  // Próximos dias
  const proximos: { pet: number; d: number; hora: string; servico: typeof s.banhoP; prof: typeof ana }[] = [
    { pet: 12, d: 1, hora: "09:00", servico: s.banhoP, prof: ana },
    { pet: 6, d: 1, hora: "10:00", servico: s.consulta, prof: rafael },
    { pet: 8, d: 1, hora: "14:00", servico: s.tosaComp, prof: carla },
    { pet: 7, d: 2, hora: "09:30", servico: s.banhoP, prof: bruno },
    { pet: 0, d: 3, hora: "11:00", servico: s.vacinacao, prof: rafael },
    { pet: 13, d: 3, hora: "15:00", servico: s.banhoP, prof: ana },
    { pet: 9, d: 4, hora: "08:30", servico: s.banhoG, prof: bruno },
  ];
  for (const a of proximos) {
    const inicio = dataHora(dia(a.d), a.hora);
    await prisma.agendamento.create({
      data: {
        petId: pets[a.pet].id, servicoId: a.servico.id, profissionalId: a.prof.id, inicio,
        fim: new Date(inicio.getTime() + a.servico.duracaoMin * 60000),
        status: "AGUARDANDO", valorEstimado: a.servico.preco,
      },
    });
  }

  console.log(`Seed concluído: ${tutores.length} tutores e ${pets.length} pets.`);
  console.log(
    geradas
      ? "Usuários admin@petshop.com e atendente@petshop.com criados; senhas geradas em .credenciais.local"
      : "Usuários admin@petshop.com e atendente@petshop.com criados com as senhas do .env",
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
