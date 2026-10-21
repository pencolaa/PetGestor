-- AlterTable
ALTER TABLE "Configuracao" ADD COLUMN     "abertura" TEXT NOT NULL DEFAULT '08:00',
ADD COLUMN     "fechamento" TEXT NOT NULL DEFAULT '18:00';
