-- CreateEnum
CREATE TYPE "role_utilisateur" AS ENUM ('ADMIN', 'CHARGE_ADMISSION');

-- CreateEnum
CREATE TYPE "statut_campagne" AS ENUM ('BROUILLON', 'ACTIVE', 'CLOTUREE', 'ARCHIVEE');

-- CreateEnum
CREATE TYPE "type_document" AS ENUM ('CV', 'LETTRE_MOTIVATION', 'LETTRE_RECOMMANDATION', 'PORTFOLIO', 'AUTRE');

-- CreateEnum
CREATE TYPE "type_critere" AS ENUM ('MOT_CLE', 'NIVEAU_REQUIS', 'LANGUE');

-- CreateEnum
CREATE TYPE "source_import" AS ENUM ('ZIP', 'GOOGLE_DRIVE');

-- CreateEnum
CREATE TYPE "statut_lot_import" AS ENUM ('EN_ATTENTE', 'EN_COURS', 'TERMINE', 'ERREUR');

-- CreateEnum
CREATE TYPE "statut_candidature" AS ENUM ('EN_ATTENTE', 'EN_COURS', 'ANALYSEE', 'ERREUR');

-- CreateEnum
CREATE TYPE "methode_extraction" AS ENUM ('NATIVE', 'OCR', 'ECHEC');

-- CreateEnum
CREATE TYPE "statut_document" AS ENUM ('EN_ATTENTE', 'EXTRACTION', 'ANALYSE_NIVEAU_1', 'ANALYSE_NIVEAU_2', 'TERMINE', 'ERREUR');

-- CreateEnum
CREATE TYPE "motif_atypique" AS ENUM ('CONFIANCE_INSUFFISANTE', 'TYPE_INATTENDU', 'ILLISIBLE');

-- CreateTable
CREATE TABLE "etablissement" (
    "id" UUID NOT NULL,
    "nom" TEXT NOT NULL,
    "siret" VARCHAR(14),
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifie_le" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "etablissement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "utilisateur" (
    "id" UUID NOT NULL,
    "etablissement_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "mot_de_passe_hash" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "role" "role_utilisateur" NOT NULL DEFAULT 'CHARGE_ADMISSION',
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "derniere_connexion_le" TIMESTAMP(3),
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifie_le" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "utilisateur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "connexion_drive" (
    "id" UUID NOT NULL,
    "etablissement_id" UUID NOT NULL,
    "libelle" TEXT NOT NULL,
    "folder_id" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "derniere_utilisation" TIMESTAMP(3),
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "connexion_drive_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campagne" (
    "id" UUID NOT NULL,
    "etablissement_id" UUID NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "statut" "statut_campagne" NOT NULL DEFAULT 'BROUILLON',
    "types_attendus" "type_document"[],
    "seuil_confiance_n1" INTEGER NOT NULL DEFAULT 70,
    "poids_adequation" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "poids_clarte" DOUBLE PRECISION NOT NULL DEFAULT 0.25,
    "poids_qualite_formelle" DOUBLE PRECISION NOT NULL DEFAULT 0.25,
    "date_ouverture" TIMESTAMP(3),
    "date_cloture" TIMESTAMP(3),
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifie_le" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campagne_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "critere" (
    "id" UUID NOT NULL,
    "campagne_id" UUID NOT NULL,
    "type" "type_critere" NOT NULL,
    "libelle" TEXT NOT NULL,
    "valeur" TEXT NOT NULL,
    "poids" DOUBLE PRECISION NOT NULL DEFAULT 1,

    CONSTRAINT "critere_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lot_import" (
    "id" UUID NOT NULL,
    "campagne_id" UUID NOT NULL,
    "utilisateur_id" UUID,
    "connexion_drive_id" UUID,
    "source" "source_import" NOT NULL,
    "statut" "statut_lot_import" NOT NULL DEFAULT 'EN_ATTENTE',
    "nb_fichiers" INTEGER NOT NULL DEFAULT 0,
    "nb_fichiers_rejetes" INTEGER NOT NULL DEFAULT 0,
    "message_erreur" TEXT,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "termine_le" TIMESTAMP(3),

    CONSTRAINT "lot_import_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidature" (
    "id" UUID NOT NULL,
    "campagne_id" UUID NOT NULL,
    "etablissement_id" UUID NOT NULL,
    "nom_candidat" TEXT NOT NULL,
    "email_candidat" TEXT,
    "identifiant_externe" TEXT,
    "statut" "statut_candidature" NOT NULL DEFAULT 'EN_ATTENTE',
    "score_global" DOUBLE PRECISION,
    "nb_documents_atypiques" INTEGER NOT NULL DEFAULT 0,
    "date_purge_prevue" TIMESTAMP(3) NOT NULL,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifie_le" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document" (
    "id" UUID NOT NULL,
    "candidature_id" UUID NOT NULL,
    "lot_import_id" UUID NOT NULL,
    "etablissement_id" UUID NOT NULL,
    "nom_fichier_origine" TEXT NOT NULL,
    "cle_stockage" TEXT NOT NULL,
    "hash_sha256" CHAR(64) NOT NULL,
    "taille_octets" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "methode_extraction" "methode_extraction",
    "statut" "statut_document" NOT NULL DEFAULT 'EN_ATTENTE',
    "message_erreur" TEXT,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifie_le" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_texte" (
    "document_id" UUID NOT NULL,
    "contenu" TEXT NOT NULL,
    "nb_caracteres" INTEGER NOT NULL,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_texte_pkey" PRIMARY KEY ("document_id")
);

-- CreateTable
CREATE TABLE "analyse_document" (
    "document_id" UUID NOT NULL,
    "type_detecte" "type_document",
    "confiance_n1" INTEGER,
    "est_atypique" BOOLEAN NOT NULL DEFAULT false,
    "motif_atypique" "motif_atypique",
    "justification_n1" TEXT,
    "score_adequation" INTEGER,
    "score_clarte" INTEGER,
    "score_qualite_formelle" INTEGER,
    "justification_adequation" TEXT,
    "justification_clarte" TEXT,
    "justification_qualite_formelle" TEXT,
    "score_document" DOUBLE PRECISION,
    "modele_n1" TEXT,
    "modele_n2" TEXT,
    "version_prompt" TEXT NOT NULL,
    "tokens_n1" INTEGER,
    "tokens_n2" INTEGER,
    "duree_ms" INTEGER,
    "analysee_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analyse_document_pkey" PRIMARY KEY ("document_id")
);

-- CreateTable
CREATE TABLE "journal_audit" (
    "id" UUID NOT NULL,
    "etablissement_id" UUID NOT NULL,
    "utilisateur_id" UUID,
    "action" TEXT NOT NULL,
    "entite_type" TEXT NOT NULL,
    "entite_id" TEXT,
    "adresse_ip" TEXT,
    "user_agent" TEXT,
    "details" JSONB,
    "horodatage" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "journal_audit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "utilisateur_email_key" ON "utilisateur"("email");

-- CreateIndex
CREATE INDEX "utilisateur_etablissement_id_idx" ON "utilisateur"("etablissement_id");

-- CreateIndex
CREATE UNIQUE INDEX "connexion_drive_etablissement_id_folder_id_key" ON "connexion_drive"("etablissement_id", "folder_id");

-- CreateIndex
CREATE INDEX "campagne_etablissement_id_statut_idx" ON "campagne"("etablissement_id", "statut");

-- CreateIndex
CREATE INDEX "critere_campagne_id_idx" ON "critere"("campagne_id");

-- CreateIndex
CREATE INDEX "lot_import_campagne_id_idx" ON "lot_import"("campagne_id");

-- CreateIndex
CREATE INDEX "candidature_campagne_id_score_global_idx" ON "candidature"("campagne_id", "score_global" DESC);

-- CreateIndex
CREATE INDEX "candidature_date_purge_prevue_idx" ON "candidature"("date_purge_prevue");

-- CreateIndex
CREATE INDEX "candidature_etablissement_id_idx" ON "candidature"("etablissement_id");

-- CreateIndex
CREATE INDEX "document_candidature_id_idx" ON "document"("candidature_id");

-- CreateIndex
CREATE INDEX "document_hash_sha256_idx" ON "document"("hash_sha256");

-- CreateIndex
CREATE INDEX "document_statut_idx" ON "document"("statut");

-- CreateIndex
CREATE INDEX "analyse_document_est_atypique_idx" ON "analyse_document"("est_atypique");

-- CreateIndex
CREATE INDEX "journal_audit_etablissement_id_horodatage_idx" ON "journal_audit"("etablissement_id", "horodatage" DESC);

-- AddForeignKey
ALTER TABLE "utilisateur" ADD CONSTRAINT "utilisateur_etablissement_id_fkey" FOREIGN KEY ("etablissement_id") REFERENCES "etablissement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connexion_drive" ADD CONSTRAINT "connexion_drive_etablissement_id_fkey" FOREIGN KEY ("etablissement_id") REFERENCES "etablissement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campagne" ADD CONSTRAINT "campagne_etablissement_id_fkey" FOREIGN KEY ("etablissement_id") REFERENCES "etablissement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "critere" ADD CONSTRAINT "critere_campagne_id_fkey" FOREIGN KEY ("campagne_id") REFERENCES "campagne"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lot_import" ADD CONSTRAINT "lot_import_campagne_id_fkey" FOREIGN KEY ("campagne_id") REFERENCES "campagne"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lot_import" ADD CONSTRAINT "lot_import_utilisateur_id_fkey" FOREIGN KEY ("utilisateur_id") REFERENCES "utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lot_import" ADD CONSTRAINT "lot_import_connexion_drive_id_fkey" FOREIGN KEY ("connexion_drive_id") REFERENCES "connexion_drive"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidature" ADD CONSTRAINT "candidature_campagne_id_fkey" FOREIGN KEY ("campagne_id") REFERENCES "campagne"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidature" ADD CONSTRAINT "candidature_etablissement_id_fkey" FOREIGN KEY ("etablissement_id") REFERENCES "etablissement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document" ADD CONSTRAINT "document_candidature_id_fkey" FOREIGN KEY ("candidature_id") REFERENCES "candidature"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document" ADD CONSTRAINT "document_lot_import_id_fkey" FOREIGN KEY ("lot_import_id") REFERENCES "lot_import"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document" ADD CONSTRAINT "document_etablissement_id_fkey" FOREIGN KEY ("etablissement_id") REFERENCES "etablissement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_texte" ADD CONSTRAINT "document_texte_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analyse_document" ADD CONSTRAINT "analyse_document_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_audit" ADD CONSTRAINT "journal_audit_etablissement_id_fkey" FOREIGN KEY ("etablissement_id") REFERENCES "etablissement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_audit" ADD CONSTRAINT "journal_audit_utilisateur_id_fkey" FOREIGN KEY ("utilisateur_id") REFERENCES "utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;
