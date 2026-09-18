-- D-17, option A : utiliser l'instance PostgreSQL native déjà installée (port 5433).
-- À exécuter UNE FOIS avec un compte superutilisateur de cette instance :
--
--   psql -h localhost -p 5433 -U postgres -f backend/scripts/create-dev-db.sql
--
-- Puis, dans .env :
--   DATABASE_URL="postgresql://archiflow:archiflow@localhost:5433/archiflow?schema=public"
--   DATABASE_URL_TEST="postgresql://archiflow:archiflow@localhost:5433/archiflow_test?schema=public"
--
-- Identifiants de DÉVELOPPEMENT uniquement. CREATEDB permet aux tests de créer leur base
-- et à la vérification de restauration de créer sa base jetable.

CREATE ROLE archiflow WITH LOGIN PASSWORD 'archiflow' CREATEDB;
CREATE DATABASE archiflow OWNER archiflow;
CREATE DATABASE archiflow_test OWNER archiflow;
