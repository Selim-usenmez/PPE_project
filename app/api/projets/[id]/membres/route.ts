import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/projets/[id]/membres
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params; // ID du projet

    // On cherche toutes les participations liées à ce projet
    const participations = await prisma.participationProjet.findMany({
      where: { id_projet: id },
      include: {
        employe: {
          select: { id_employe: true, nom: true, prenom: true, role: true }
        }
      }
    });

    // On renvoie juste la liste des employés
    const membres = participations.map(p => p.employe);
    
    return NextResponse.json(membres);
  } catch (error) {
    return NextResponse.json({ error: "Erreur récupération équipe" }, { status: 500 });
  }
}