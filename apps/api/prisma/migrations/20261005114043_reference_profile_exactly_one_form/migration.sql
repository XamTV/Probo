-- RG-08 — un référentiel porte EXACTEMENT une de ses deux formes.
--
-- Prisma ne génère pas de contrainte CHECK : sans cette migration écrite à la
-- main, la règle ne vivrait que dans le code applicatif, et la base accepterait
-- un référentiel vide ou doublement rempli. C'est l'écart n°10 de
-- docs/conception/ecarts-mcd-mpd.md, et le seul que la liste qualifiait de
-- faiblesse plutôt que de choix.
--
-- Forme « profil décrit »   : text renseigné, aucune colonne de fichier.
-- Forme « document déposé » : file_name et storage_key renseignés, text vide.
--   extracted_text reste facultatif : il est rempli après l'extraction, qui
--   survient une fois le référentiel déjà enregistré.

ALTER TABLE "reference_profile"
  ADD CONSTRAINT "reference_profile_exactly_one_form" CHECK (
    (
      "text" IS NOT NULL
      AND "file_name" IS NULL
      AND "storage_key" IS NULL
      AND "extracted_text" IS NULL
    )
    OR (
      "text" IS NULL
      AND "file_name" IS NOT NULL
      AND "storage_key" IS NOT NULL
    )
  );
