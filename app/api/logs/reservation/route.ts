import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id"); // On récupère l'ID de la réservation

  if (!id) return NextResponse.json([]);

  try {
    // On cherche dans l'historique tous les logs qui contiennent cet ID
    const logs = await prisma.historiqueAction.findMany({
      where: {
        details: { contains: id } // Recherche textuelle de l'ID
      },
      orderBy: { createdAt: 'desc' },
      include: {
        employe: {
          select: { nom: true, prenom: true }
        }
      }
    });

    return NextResponse.json(logs);
  } catch (e) {
    console.error("Erreur logs réservation:", e);
    return NextResponse.json([]);
  }
}