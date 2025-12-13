-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'EMPLOYE');

-- CreateEnum
CREATE TYPE "StatutProjet" AS ENUM ('EN_COURS', 'TERMINE', 'EN_ATTENTE', 'ANNULE');

-- CreateEnum
CREATE TYPE "TypeRessource" AS ENUM ('EQUIPEMENT_LABORATOIRE', 'MATERIEL_INFORMATIQUE', 'EQUIPEMENT_REUNION', 'MATERIEL_SPECIALISE', 'VEHICULE', 'AUTRE');

-- CreateEnum
CREATE TYPE "EtatRessource" AS ENUM ('DISPONIBLE', 'EN_UTILISATION', 'EN_MAINTENANCE', 'HORS_SERVICE');

-- CreateEnum
CREATE TYPE "StatutReservation" AS ENUM ('CONFIRMEE', 'EN_ATTENTE', 'ANNULEE');

-- CreateTable
CREATE TABLE "employes" (
    "id_employe" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "mot_de_passe" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'EMPLOYE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employes_pkey" PRIMARY KEY ("id_employe")
);

-- CreateTable
CREATE TABLE "projets" (
    "id_projet" TEXT NOT NULL,
    "nom_projet" TEXT NOT NULL,
    "description" TEXT,
    "date_debut" TIMESTAMP(3) NOT NULL,
    "date_fin" TIMESTAMP(3),
    "statut" "StatutProjet" NOT NULL DEFAULT 'EN_COURS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projets_pkey" PRIMARY KEY ("id_projet")
);

-- CreateTable
CREATE TABLE "participation_projets" (
    "id_participation" TEXT NOT NULL,
    "id_employe" TEXT NOT NULL,
    "id_projet" TEXT NOT NULL,
    "date_assignation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "role_dans_projet" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "participation_projets_pkey" PRIMARY KEY ("id_participation")
);

-- CreateTable
CREATE TABLE "ressources" (
    "id_ressource" TEXT NOT NULL,
    "nom_ressource" TEXT NOT NULL,
    "type" "TypeRessource" NOT NULL,
    "etat" "EtatRessource" NOT NULL DEFAULT 'DISPONIBLE',
    "localisation" TEXT,
    "numero_serie" TEXT,
    "date_acquisition" TIMESTAMP(3),
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ressources_pkey" PRIMARY KEY ("id_ressource")
);

-- CreateTable
CREATE TABLE "salles" (
    "id_salle" TEXT NOT NULL,
    "nom_salle" TEXT NOT NULL,
    "capacite" INTEGER NOT NULL,
    "equipements" TEXT,
    "localisation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "salles_pkey" PRIMARY KEY ("id_salle")
);

-- CreateTable
CREATE TABLE "reservation_salles" (
    "id_reservation" TEXT NOT NULL,
    "id_salle" TEXT NOT NULL,
    "id_projet" TEXT NOT NULL,
    "date_debut" TIMESTAMP(3) NOT NULL,
    "date_fin" TIMESTAMP(3) NOT NULL,
    "objet" TEXT,
    "statut" "StatutReservation" NOT NULL DEFAULT 'CONFIRMEE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reservation_salles_pkey" PRIMARY KEY ("id_reservation")
);

-- CreateTable
CREATE TABLE "historique_actions" (
    "id_action" TEXT NOT NULL,
    "id_employe" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historique_actions_pkey" PRIMARY KEY ("id_action")
);

-- CreateIndex
CREATE UNIQUE INDEX "employes_email_key" ON "employes"("email");

-- CreateIndex
CREATE UNIQUE INDEX "participation_projets_id_employe_id_projet_key" ON "participation_projets"("id_employe", "id_projet");

-- CreateIndex
CREATE UNIQUE INDEX "ressources_numero_serie_key" ON "ressources"("numero_serie");

-- CreateIndex
CREATE UNIQUE INDEX "salles_nom_salle_key" ON "salles"("nom_salle");

-- AddForeignKey
ALTER TABLE "participation_projets" ADD CONSTRAINT "participation_projets_id_employe_fkey" FOREIGN KEY ("id_employe") REFERENCES "employes"("id_employe") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participation_projets" ADD CONSTRAINT "participation_projets_id_projet_fkey" FOREIGN KEY ("id_projet") REFERENCES "projets"("id_projet") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservation_salles" ADD CONSTRAINT "reservation_salles_id_salle_fkey" FOREIGN KEY ("id_salle") REFERENCES "salles"("id_salle") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservation_salles" ADD CONSTRAINT "reservation_salles_id_projet_fkey" FOREIGN KEY ("id_projet") REFERENCES "projets"("id_projet") ON DELETE CASCADE ON UPDATE CASCADE;
