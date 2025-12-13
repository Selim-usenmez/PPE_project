const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Démarrage du seeding complet...')

  // =======================================================
  // 1. RESSOURCES (Matériel)
  // =======================================================
  const ressourcesData = [
    { nom: "Hotte à flux laminaire", type: "EQUIPEMENT_LABORATOIRE" },
    { nom: "Filtre HEPA", type: "AUTRE" },
    { nom: "Équipements stériles", type: "EQUIPEMENT_LABORATOIRE" },
    { nom: "Paillasse", type: "EQUIPEMENT_LABORATOIRE" },
    { nom: "Microscope", type: "EQUIPEMENT_LABORATOIRE" },
    { nom: "Centrifugeuse", type: "EQUIPEMENT_LABORATOIRE" },
    { nom: "Analyseur", type: "EQUIPEMENT_LABORATOIRE" },
    { nom: "Balance de précision", type: "EQUIPEMENT_LABORATOIRE" },
    { nom: "PC de contrôle", type: "MATERIEL_INFORMATIQUE" },
    { nom: "Machine de fabrication", type: "MATERIEL_SPECIALISE" },
    { nom: "Ligne automatisée", type: "MATERIEL_SPECIALISE" },
    { nom: "Rayonnage", type: "AUTRE" },
    { nom: "Chariot", type: "VEHICULE" },
    { nom: "Capteur température", type: "MATERIEL_SPECIALISE" },
    { nom: "Réfrigérateur industriel", type: "MATERIEL_SPECIALISE" },
    { nom: "Sonde thermique", type: "MATERIEL_SPECIALISE" },
    { nom: "Table de réunion", type: "EQUIPEMENT_REUNION" },
    { nom: "Vidéoprojecteur", type: "EQUIPEMENT_REUNION" },
    { nom: "Écran de projection", type: "EQUIPEMENT_REUNION" },
    { nom: "Serveur", type: "MATERIEL_INFORMATIQUE" },
    { nom: "Onduleur", type: "MATERIEL_INFORMATIQUE" },
    { nom: "Baie réseau", type: "MATERIEL_INFORMATIQUE" },
    { nom: "Casier", type: "AUTRE" },
    { nom: "Douche", type: "AUTRE" },
    { nom: "Kit EPI", type: "AUTRE" },
  ]

  console.log('📦 Traitement des ressources...')
  for (const r of ressourcesData) {
    const existing = await prisma.ressource.findFirst({ where: { nom_ressource: r.nom } })
    if (!existing) {
      await prisma.ressource.create({
        data: { nom_ressource: r.nom, type: r.type, etat: "DISPONIBLE", localisation: "Stock Central" }
      })
    }
  }

  // =======================================================
  // 2. SALLES
  // =======================================================
  const sallesData = [
    { nom: "Zone Stérile (Production)", loc: "Bâtiment Production – RDC", cap: 10, equip: "Hotte à flux laminaire, Filtre HEPA, Équipements stériles" },
    { nom: "Laboratoire R&D", loc: "Bâtiment Recherche – 1er étage", cap: 15, equip: "Paillasse, Microscope, Centrifugeuse" },
    { nom: "Contrôle Qualité", loc: "Bâtiment Qualité – RDC", cap: 8, equip: "Analyseur, Balance de précision, PC de contrôle" },
    { nom: "Salle de Production", loc: "Bâtiment Production – RDC", cap: 20, equip: "Machine de fabrication, Ligne automatisée" },
    { nom: "Stock Matières Premières", loc: "Bâtiment Logistique – RDC", cap: 5, equip: "Rayonnage, Chariot, Capteur température" },
    { nom: "Chambre Froide", loc: "Bâtiment Logistique – RDC", cap: 2, equip: "Réfrigérateur industriel, Sonde thermique" },
    { nom: "Salle de Réunion Principale", loc: "Bâtiment Administratif – 2e étage", cap: 12, equip: "Table de réunion, Vidéoprojecteur, Écran de projection" },
    { nom: "Salle Serveur (Info)", loc: "Bâtiment Administratif – 1er étage", cap: 4, equip: "Serveur, Onduleur, Baie réseau" },
    { nom: "Vestiaires", loc: "Bâtiment Production – RDC", cap: 20, equip: "Casier, Douche, Kit EPI" }
  ]

  console.log('🏢 Traitement des salles...')
  for (const s of sallesData) {
    await prisma.salle.upsert({
      where: { nom_salle: s.nom },
      update: { capacite: s.cap, equipements: s.equip, localisation: s.loc },
      create: { nom_salle: s.nom, localisation: s.loc, capacite: s.cap, equipements: s.equip }
    })
  }

  // =======================================================
  // 3. PROJETS (Nouveau !)
  // =======================================================
  const projetsData = [
    {
      nom: "Mise à niveau salle blanche",
      desc: "Zone : Salle blanche. Remplacement filtres HEPA et validation GMP.",
      statut: "EN_COURS"
    },
    {
      nom: "Nouveau laboratoire R&D",
      desc: "Zone : Laboratoire R&D. Installation nouveaux équipements de recherche.",
      statut: "EN_COURS"
    },
    {
      nom: "Digitalisation CQ",
      desc: "Zone : Contrôle qualité. Mise en place logiciels d’analyse et traçabilité.",
      statut: "TERMINE"
    },
    {
      nom: "Extension stockage",
      desc: "Zone : Stock matières premières. Augmentation capacité de stockage.",
      statut: "TERMINE"
    },
    {
      nom: "Salle de formation interne",
      desc: "Zone : Salle formation. Aménagement et achat matériel pédagogique.",
      statut: "EN_ATTENTE"
    },
    {
      nom: "Modernisation salle réunion",
      desc: "Zone : Salle de réunion. Installation écrans interactifs et visio.",
      statut: "EN_ATTENTE"
    },
    {
      nom: "Sécurisation IT",
      desc: "Zone : Salle informatique. Renforcement serveurs et sauvegardes.",
      statut: "EN_COURS"
    }
  ]

  console.log('🚀 Traitement des projets...')
  
  for (const p of projetsData) {
    // Calcul automatique des dates selon le statut pour que ce soit réaliste
    let debut, fin
    const now = new Date()

    if (p.statut === "EN_COURS") {
      debut = new Date(); debut.setMonth(now.getMonth() - 1); // Commencé il y a 1 mois
      fin = new Date(); fin.setMonth(now.getMonth() + 2);     // Finit dans 2 mois
    } else if (p.statut === "TERMINE") {
      debut = new Date(); debut.setMonth(now.getMonth() - 6); // Commencé il y a 6 mois
      fin = new Date(); fin.setMonth(now.getMonth() - 1);     // Fini le mois dernier
    } else { // EN_ATTENTE
      debut = new Date(); debut.setMonth(now.getMonth() + 1); // Commence le mois prochain
      fin = new Date(); fin.setMonth(now.getMonth() + 3);     // Durée 2 mois
    }

    // On utilise findFirst car "nom_projet" n'est pas @unique, donc pas d'upsert possible
    const existing = await prisma.projet.findFirst({ where: { nom_projet: p.nom } })

    if (!existing) {
      await prisma.projet.create({
        data: {
          nom_projet: p.nom,
          description: p.desc,
          statut: p.statut,
          date_debut: debut,
          date_fin: fin
        }
      })
      console.log(`➕ Projet ajouté : ${p.nom}`)
    } else {
        // Optionnel : Mettre à jour si existe déjà
        // await prisma.projet.update({ where: { id_projet: existing.id_projet }, data: { statut: p.statut } })
        console.log(`⚡️ Projet existe déjà : ${p.nom}`)
    }
  }

  console.log('✅ Seeding terminé avec succès !')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })