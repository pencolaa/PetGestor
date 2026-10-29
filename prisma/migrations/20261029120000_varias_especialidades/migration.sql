-- Profissional passa a ter várias especialidades.
-- Quem era de tosa também atendia banho: mantém esse comportamento como Banho + Tosa.
ALTER TABLE "Profissional" ADD COLUMN "tipos" "TipoServico"[] NOT NULL DEFAULT ARRAY[]::"TipoServico"[];
UPDATE "Profissional" SET "tipos" = CASE WHEN "tipo" = 'TOSA' THEN ARRAY['BANHO', 'TOSA']::"TipoServico"[] ELSE ARRAY["tipo"] END;
ALTER TABLE "Profissional" DROP COLUMN "tipo";
ALTER TABLE "Profissional" ALTER COLUMN "tipos" DROP DEFAULT;
