const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Démarrage du seeding des Réservations & Équipes...')

  // 1. Récupérer les données existantes
  const projets = await prisma.projet.findMany();
  const salles = await prisma.salle.findMany();
  const employes = await prisma.employe.findMany();

  if (projets.length === 0 || salles.length === 0 || employes.length === 0) {
    console.error("❌ ERREUR : Il faut d'abord avoir des employés, des projets et des salles en base.");
    console.error("   -> Crée au moins un employé via l'app ou la BDD.");
    return;
  }

  console.log(`ℹ️ Trouvé : ${employes.length} employés, ${projets.length} projets, ${salles.length} salles.`);

  // =======================================================
  // 2. ASSIGNER LES EMPLOYÉS AUX PROJETS (Participation)
  // =======================================================
  console.log('👥 Assignation des équipes...');
  
  for (const proj of projets) {
    // On assigne TOUS les employés à TOUS les projets pour être sûr que tu voies des données
    for (const emp of employes) {
      // On vérifie si déjà assigné pour éviter erreur unique
      const exists = await prisma.participationProjet.findUnique({
        where: {
            id_employe_id_projet: {
                id_employe: emp.id_employe,
                id_projet: proj.id_projet
            }
        }
      });

      if (!exists) {
        await prisma.participationProjet.create({
          data: {
            id_employe: emp.id_employe,
            id_projet: proj.id_projet,
            role_dans_projet: "Membre de l'équipe"
          }
        });
      }
    }
  }
  console.log('✅ Équipes constituées.');

  // =======================================================
  // 3. CRÉER DES RÉSERVATIONS (Planning)
  // =======================================================
  console.log('📅 Création des réservations pour CETTE SEMAINE...');

  // On vide les vieilles réservations pour éviter le bazar (optionnel)
  // await prisma.reservationSalle.deleteMany({}); 

  const today = new Date();
  
  // Quelques exemples de réservations dynamiques
  const reservationsData = [
    { decalageJour: 0, heure: 9, duree: 2, objet: "Kick-off Meeting" }, // Aujourd'hui 9h
    { decalageJour: 0, heure: 14, duree: 3, objet: "Atelier Conception" }, // Aujourd'hui 14h
    { decalageJour: 1, heure: 10, duree: 1, objet: "Daily Scrum" }, // Demain 10h
    { decalageJour: 2, heure: 15, duree: 2, objet: "Revue de code" }, // Après-demain
    { decalageJour: -1, heure: 11, duree: 2, objet: "Rétrospective" }, // Hier
  ];

  let resIndex = 0;

  for (const res of reservationsData) {
    // On boucle sur les projets et salles pour varier
    const projet = projets[resIndex % projets.length];
    const salle = salles[resIndex % salles.length];

    // Calcul des dates
    const start = new Date(today);
    start.setDate(today.getDate() + res.decalageJour);
    start.setHours(res.heure, 0, 0, 0);

    const end = new Date(start);
    end.setHours(res.heure + res.duree, 0, 0, 0);

    await prisma.reservationSalle.create({
      data: {
        id_projet: projet.id_projet,
        id_salle: salle.id_salle,
        date_debut: start,
        date_fin: end,
        objet: res.objet,
        statut: "CONFIRMEE"
      }
    });

    console.log(`➕ Réservation créée : ${res.objet} (${salle.nom_salle})`);
    resIndex++;
  }

  console.log('✅ Seeding terminé ! Recharge ta page Dashboard.');
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })