import { diaISO, diffDias, hojeISO } from "./datas";

export type SituacaoVacina = "ATRASADA" | "VENCE_EM_BREVE" | "EM_DIA" | "SEM_REFORCO";

export const DIAS_AVISO_VACINA = 15;

export function situacaoVacina(proximaDose: Date | null, hoje = hojeISO()): SituacaoVacina {
  if (!proximaDose) return "SEM_REFORCO";
  const dias = diffDias(diaISO(proximaDose), hoje);
  if (dias < 0) return "ATRASADA";
  if (dias <= DIAS_AVISO_VACINA) return "VENCE_EM_BREVE";
  return "EM_DIA";
}

export const ROTULO_SITUACAO: Record<SituacaoVacina, { texto: string; cor: "vermelho" | "laranja" | "verde" | "cinza" }> = {
  ATRASADA: { texto: "Atrasada", cor: "vermelho" },
  VENCE_EM_BREVE: { texto: "Vence em breve", cor: "laranja" },
  EM_DIA: { texto: "Em dia", cor: "verde" },
  SEM_REFORCO: { texto: "Sem reforço", cor: "cinza" },
};
