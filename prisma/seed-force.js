const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('🔗 Démarrage de l\'assignation forcée...')

  const employes = await prisma.employe.findMany();
  const projets = await prisma.projet.findMany();

  if (employes.length === 0 || projets.length === 0) {
    console.log("❌ Pas assez de données (Crée d'abord des employés et des projets)");
    return;
  }

  let count = 0;

  for (const emp of employes) {
    for (const proj of projets) {
      // On essaie de créer le lien. Si ça plante (déjà existant), on ignore.
      try {
        await prisma.participationProjet.upsert({
            where: {
                id_employe_id_projet: {
                    id_employe: emp.id_employe,
                    id_projet: proj.id_projet
                }
            },
            update: {}, // Si existe, on fait rien
            create: {
                id_employe: emp.id_employe,
                id_projet: proj.id_projet,
                role_dans_projet: "Développeur (Auto)"
            }
        });
        count++;
      } catch (e) {
        // Ignorer les erreurs
      }
    }
  }

  console.log(`✅ Succès ! ${count} liens (Participation) vérifiés ou créés.`);
  console.log(`👉 L'employé ${employes[0].prenom} devrait maintenant voir ${projets.length} projets.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); })