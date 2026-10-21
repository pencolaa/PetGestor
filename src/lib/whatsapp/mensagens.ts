// Modelos de mensagem. Mantidos em um só lugar para virarem "templates" quando houver API oficial.

function primeiroNome(nome: string) {
  return nome.split(" ")[0];
}

export const mensagens = {
  vacinaVencendo: (p: { tutor: string; pet: string; vacina: string; data: string; petShop: string; atrasada: boolean }) =>
    p.atrasada
      ? `Olá, ${primeiroNome(p.tutor)}! Aqui é do ${p.petShop}. A vacina ${p.vacina} do(a) ${p.pet} venceu em ${p.data}. Vamos agendar a aplicação? 💉🐾`
      : `Olá, ${primeiroNome(p.tutor)}! Aqui é do ${p.petShop}. A vacina ${p.vacina} do(a) ${p.pet} vence em ${p.data}. Quer agendar a próxima dose? 💉🐾`,

  semBanho: (p: { tutor: string; pet: string; dias: number; petShop: string }) =>
    `Olá, ${primeiroNome(p.tutor)}! Aqui é do ${p.petShop}. Já faz ${p.dias} dias desde o último banho do(a) ${p.pet}. Que tal agendar um banho esta semana? 🛁🐶`,

  aniversario: (p: { tutor: string; pet: string; quando: string; petShop: string }) =>
    `Olá, ${primeiroNome(p.tutor)}! O(a) ${p.pet} faz aniversário ${p.quando}! 🎉 Toda a equipe do ${p.petShop} deseja muitas felicidades. Passe aqui para ganhar um mimo! 🎁`,

  confirmacaoAgendamento: (p: { tutor: string; pet: string; servico: string; data: string; hora: string; petShop: string }) =>
    `Olá, ${primeiroNome(p.tutor)}! Confirmando o agendamento de ${p.servico} para o(a) ${p.pet} no dia ${p.data} às ${p.hora}, no ${p.petShop}. Responda SIM para confirmar. 🐾`,

  prontoParaRetirada: (p: { tutor: string; pet: string; petShop: string }) =>
    `Olá, ${primeiroNome(p.tutor)}! O(a) ${p.pet} já está prontinho(a) e esperando por você no ${p.petShop}. 🐾✨`,
};
