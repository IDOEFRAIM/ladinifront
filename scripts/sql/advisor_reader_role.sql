-- Rôle en LECTURE SEULE du service conseiller (schéma `advisor`). À exécuter à la main par un administrateur, JAMAIS par une migration
-- (un rôle est global au cluster et son mot de passe ne doit pas figurer dans le dépôt).
--   psql "$ADMIN_URL" -v advisor_pwd="$(openssl rand -base64 24)" -f scripts/sql/advisor_reader_role.sql
-- Rejouable : le rôle n'est créé que s'il n'existe pas ; les GRANT sont idempotents.
SELECT format('CREATE ROLE advisor_reader LOGIN PASSWORD %L', :'advisor_pwd')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'advisor_reader')
\gexec
GRANT USAGE ON SCHEMA advisor TO advisor_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA advisor TO advisor_reader;
