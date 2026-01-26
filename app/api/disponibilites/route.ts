import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const startStr = searchParams.get("start");
    const endStr = searchParams.get("end");
    const ignoreId = searchParams.get("ignoreId"); // Pour ignorer la résa qu'on est en train de modifier

    if (!startStr || !endStr) return NextResponse.json({ salles: [], ressources: [] });

    const start = new Date(startStr);
    const end = new Date(endStr);

    // 1. Trouver les Salles Libres
    const sallesLibres = await prisma.salle.findMany({
      where: {
        reservations: {
          none: {
            // On exclut les réservations qui chevauchent, SAUF si c'est celle qu'on modifie (ignoreId)
            AND: [
                { id_reservation: { not: ignoreId || "" } }, // Ignore soi-même
                { statut: { not: "ANNULEE" } },
                { date_debut: { lt: end } },
                { date_fin: { gt: start } }
            ]
          }
        }
      }
    });

    // 2. Trouver le Matériel Libre (État DISPONIBLE + Pas de résa sur le créneau)
    const ressourcesLibres = await prisma.ressource.findMany({
      where: {
        etat: "DISPONIBLE",
        reservations: {
          none: {
            AND: [
                { id_reservation: { not: ignoreId || "" } },
                { statut: { not: "ANNULEE" } },
                { date_debut: { lt: end } },
                { date_fin: { gt: start } }
            ]
          }
        }
      }
    });

    return NextResponse.json({ salles: sallesLibres, ressources: ressourcesLibres });

  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}