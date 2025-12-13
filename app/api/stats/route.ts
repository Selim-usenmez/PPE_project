import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // 1. On récupère toutes les données classiques
    const [
      nbEmployes,
      nbProjetsEnCours,
      nbSalles,
      reservationsFuturs,
      recents
    ] = await Promise.all([
      prisma.employe.count(),
      prisma.projet.count({ where: { statut: "EN_COURS" } }),
      prisma.salle.count(),
      prisma.reservationSalle.count({ 
        where: { date_debut: { gte: new Date() }, statut: "CONFIRMEE" } 
      }),
      prisma.projet.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id_projet: true, nom_projet: true, statut: true, date_debut: true }
      })
    ]);

    // 2. CALCUL DES DONNÉES DU GRAPHIQUE (VRAIES DONNÉES)
    // On récupère toutes les réservations futures pour voir la charge par jour
    const rawReservations = await prisma.reservationSalle.findMany({
      where: { 
        date_debut: { gte: new Date() }, // À venir
        statut: "CONFIRMEE"
      },
      select: { date_debut: true }
    });

    // On initialise le compteur pour chaque jour
    const daysCount: Record<string, number> = { 
      'Lun': 0, 'Mar': 0, 'Mer': 0, 'Jeu': 0, 'Ven': 0, 'Sam': 0, 'Dim': 0 
    };

    // On remplit avec les vraies données
    rawReservations.forEach(resa => {
      const date = new Date(resa.date_debut);
      // getDay() renvoie 0 pour Dimanche, 1 pour Lundi...
      const dayIndex = date.getDay(); 
      
      const mapDays = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
      const dayName = mapDays[dayIndex];
      
      if (daysCount[dayName] !== undefined) {
        daysCount[dayName]++;
      }
    });

    // On formate pour Recharts (Tableau d'objets)
    // On force l'ordre Lundi -> Dimanche
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
      employes: nbEmployes,
      projetsEnCours: nbProjetsEnCours,
      salles: nbSalles,
      reservations: reservationsFuturs,
      recents: recents,
      chartData: chartData // 👈 On envoie les vraies données ici
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur stats" }, { status: 500 });
  }
}