import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { Resend } from 'resend';
import { cookies } from "next/headers"; // 👈 Important

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    // 1. Vérif classique (User + Mdp)
    const user = await prisma.employe.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.mot_de_passe))) {
      return NextResponse.json({ error: "Identifiants incorrects" }, { status: 401 });
    }

    // (Tes vérifications de dates ici... je les passe pour faire court)
    
    // 2. ⚡️ VÉRIFICATION DU "DEVICE DE CONFIANCE" ⚡️
    const cookieStore = await cookies();
    const trustCookie = cookieStore.get(`trusted_device_${user.id_employe}`);

    // SI l'ordinateur est déjà validé (le cookie existe et correspond au secret de l'user)
    // On connecte DIRECTEMENT sans envoyer de code
    if (trustCookie && trustCookie.value === process.env.TRUST_DEVICE_SECRET + user.id_employe) {
        
        // On prépare la session
        const sessionData = {
            id_employe: user.id_employe,
            nom: user.nom,
            prenom: user.prenom,
            role: user.role,
            email: user.email 
        };

        const response = NextResponse.json({ 
            success: true, // ✅ On dit au frontend : "C'est bon, pas besoin de 2FA"
            ...sessionData
        });

        // On remet le cookie de session
        response.cookies.set("session_user", JSON.stringify(sessionData), { 
            httpOnly: true,
            secure: process.env.NODE_ENV === "production", 
            sameSite: "lax",
            maxAge: 60 * 60 * 24, // Session standard 24h (le trust lui reste 30j)
            path: "/",
        });

        return response;
    }

    // 3. SINON : On continue la procédure 2FA classique (Envoi du mail)
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.employe.update({
      where: { id_employe: user.id_employe },
      data: { twoFactorCode: code, twoFactorExpires: expires }
    });

    await resend.emails.send({
      from: 'securite@likeus.dev', 
      to: email,
      subject: 'Code de vérification',
      html: `<p>Votre code : <strong>${code}</strong></p>`
    });

    return NextResponse.json({ require2fa: true, email: user.email });

  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}