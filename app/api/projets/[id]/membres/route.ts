import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ✅ CORRECTION : params est maintenant une Promise<{ id: string }>
export async function GET(
  req: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ✅ CORRECTION : On doit attendre (await) la résolution des params
    const { id } = await params; 

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