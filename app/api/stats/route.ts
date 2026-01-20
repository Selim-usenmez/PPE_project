import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Assure-toi que le chemin est bon

export async function GET() {
  try {
    // 1. On récupère toutes les données classiques
    const [
      nbEmployes,
      nbProjetsEnCours,
      nbSalles,
      reservationsFuturs, // On va l'appeler ainsi mais on prend TOUT pour le test
      recents
    ] = await Promise.all([
      prisma.employe.count(),
      prisma.projet.count({ where: { statut: "EN_COURS" } }),
      prisma.salle.count(),
      
      // 👇 MODIFICATION ICI : J'ai enlevé la date pour compter TOUTES les réservations
      prisma.reservationSalle.count({ 
        where: { 
            // date_debut: { gte: new Date() }, // <--- C'est ça qui bloquait l'affichage
            statut: "CONFIRMEE" 
        } 
      }),
      
      prisma.projet.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id_projet: true, nom_projet: true, statut: true, date_debut: true }
      })
    ]);

    // 2. CALCUL DES DONNÉES DU GRAPHIQUE
    const rawReservations = await prisma.reservationSalle.findMany({
      where: { 
        // date_debut: { gte: new Date() }, // 👇 IDEM ICI : On enlève le filtre date pour voir le graph
        statut: "CONFIRMEE"
      },
      select: { date_debut: true }
    });

    // On initialise le compteur pour chaque jour
    const daysCount: Record<string, number> = { 
      'Lun': 0, 'Mar': 0, 'Mer': 0, 'Jeu': 0, 'Ven': 0, 'Sam': 0, 'Dim': 0 
    };

    // On remplit avec les données
    rawReservations.forEach(resa => {
      const date = new Date(resa.date_debut);
      const dayIndex = date.getDay(); 
      const mapDays = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
      const dayName = mapDays[dayIndex];
      
      if (daysCount[dayName] !== undefined) {
        daysCount[dayName]++;
      }
    });

    // On formate pour Recharts
    const chartData = [
      { name: 'Lun', reservations: daysCount['Lun'] },
      { name: 'Mar', reservations: daysCount['Mar'] },
      { name: 'Mer', reservations: daysCount['Mer'] },
      { name: 'Jeu', reservations: daysCount['Jeu'] },
      { name: 'Ven', reservations: daysCount['Ven'] },
      { name: 'Sam', reservations: daysCount['Sam'] },
      { name: 'Dim', reservations: daysCount['Dim'] },
    ];

    return NextResponse.json({
      reservations: reservationsFuturs, // Le chiffre s'affichera ici
      employes: nbEmployes,
      projetsEnCours: nbProjetsEnCours,
      salles: nbSalles,
      recents: recents,
      chartData: chartData 
    });

  } catch (error) {
    console.error("Erreur API Stats:", error);
    return NextResponse.json({ error: "Erreur stats" }, { status: 500 });
  }
}