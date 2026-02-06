// prisma/seed.ts
import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Démarrage du seeding...')

  // Mot de passe commun haché (Azerty123!)
  const hashedPassword = await bcrypt.hash('Azerty123!', 10)

  // 1. ADMIN
  const admin = await prisma.employe.upsert({
    where: { email: 'admin@nexus.test' },
    update: {}, // Ne rien faire si existe déjà
    create: {
      email: 'admin@nexus.test',
      nom: 'Admin',
      prenom: 'System',
      role: 'ADMIN',
      mot_de_passe: hashedPassword,
      doit_changer_mdp: false, // Pas besoin de changer pour le test
      couleur_fond: '#ef4444', // Rouge
      date_debut_validite: new Date(),
    },
  })

  // 2. RH
  const rh = await prisma.employe.upsert({
    where: { email: 'rh@nexus.test' },
    update: {},
    create: {
      email: 'rh@nexus.test',
      nom: 'Manager',
      prenom: 'Sophie',
      role: 'RH',
      mot_de_passe: hashedPassword,
      doit_changer_mdp: false,
      couleur_fond: '#ec4899', // Rose
      date_debut_validite: new Date(),
    },
  })

  // 3. EMPLOYÉ STANDARD
  const employe = await prisma.employe.upsert({
    where: { email: 'user@nexus.test' },
    update: {},
    create: {
      email: 'user@nexus.test',
      nom: 'Dupont',
      prenom: 'Jean',
      role: 'EMPLOYE',
      mot_de_passe: hashedPassword,
      doit_changer_mdp: false,
      couleur_fond: '#3b82f6', // Bleu
      date_debut_validite: new Date(),
    },
  })

  console.log({ admin, rh, employe })
  console.log('✅ Seeding terminé avec succès !')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })