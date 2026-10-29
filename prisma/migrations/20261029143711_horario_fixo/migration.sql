-- AlterTable
ALTER TABLE "Agendamento" ADD COLUMN     "horarioFixoId" TEXT;

-- CreateTable
CREATE TABLE "HorarioFixo" (
    "id" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "servicoId" TEXT NOT NULL,
    "profissionalId" TEXT NOT NULL,
    "hora" TEXT NOT NULL,
    "intervaloSemanas" INTEGER NOT NULL DEFAULT 1,
    "primeiroDia" TEXT NOT NULL,
    "geradoAte" TEXT NOT NULL,
    "valorEstimado" INTEGER NOT NULL,
    "observacoes" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HorarioFixo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HorarioFixo_ativo_geradoAte_idx" ON "HorarioFixo"("ativo", "geradoAte");

-- CreateIndex
CREATE INDEX "Agendamento_horarioFixoId_idx" ON "Agendamento"("horarioFixoId");

-- AddForeignKey
ALTER TABLE "Agendamento" ADD CONSTRAINT "Agendamento_horarioFixoId_fkey" FOREIGN KEY ("horarioFixoId") REFERENCES "HorarioFixo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HorarioFixo" ADD CONSTRAINT "HorarioFixo_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HorarioFixo" ADD CONSTRAINT "HorarioFixo_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "Servico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HorarioFixo" ADD CONSTRAINT "HorarioFixo_profissionalId_fkey" FOREIGN KEY ("profissionalId") REFERENCES "Profissional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
