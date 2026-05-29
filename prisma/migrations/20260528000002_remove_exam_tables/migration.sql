-- Drop exam tables (DETRAN-MS operates Central de Exames directly)
DROP TABLE IF EXISTS "OfficialTheoryExam";
DROP TABLE IF EXISTS "MedicalExam";
DROP TABLE IF EXISTS "PsychologicalExam";
DROP TABLE IF EXISTS "Clinic";

-- Drop orphan columns from StudentChecklist
ALTER TABLE "StudentChecklist" DROP COLUMN IF EXISTS "medico";
ALTER TABLE "StudentChecklist" DROP COLUMN IF EXISTS "psicotecnico";
