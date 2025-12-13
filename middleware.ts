import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get("session_user");
  const url = request.nextUrl.pathname;

  // 1. FICHIERS STATIQUES (On laisse passer les images, le CSS, etc.)
  if (url.startsWith("/_next") || url.startsWith("/favicon.ico") || url.includes(".")) {
    return NextResponse.next();
  }

  // 2. ROUTES PUBLIQUES (Celles accessibles SANS connexion)
  const publicPaths = [
    "/login",              // TA PAGE DE LOGIN
    "/forgot-password",    // Mot de passe oublié
    "/reset-password",     // Reset MDP
    "/api/auth/login",     // API Login
    "/api/auth/verify-2fa",// API 2FA
    "/api/auth/forgot-password",
    "/api/auth/reset-password"
  ];

  // Si l'URL demandée est dans la liste publique, on laisse passer.
  if (publicPaths.some(path => url.startsWith(path))) {
    return NextResponse.next();
  }

  // 3. VÉRIFICATION DE CONNEXION (PROTECTION)
  // Si on n'est PAS sur une page publique et qu'on n'a PAS de cookie...
  if (!sessionCookie) {
    // Si c'est une API, erreur 401
    if (url.startsWith("/api/")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    // Si c'est une page (ex: /admin/dashboard), on redirige vers /login
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 4. GESTION DES UTILISATEURS CONNECTÉS
  if (sessionCookie) {
    try {
      const user = JSON.parse(sessionCookie.value);

      // Si l'utilisateur est connecté et essaie d'aller sur "/" ou "/login"
      // On le renvoie direct sur son dashboard (pas besoin de se reconnecter)
      if (url === "/" || url === "/login") {
         const target = user.role === "ADMIN" ? "/admin/dashboard" : "/employe/dashboard";
         return NextResponse.redirect(new URL(target, request.url));
      }

      // Protection ADMIN : Un employé ne peut pas aller sur /admin
      if (url.startsWith("/admin") && user.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/employe/dashboard", request.url));
      }

    } catch (e) {
      // Si le cookie est illisible, on le supprime et on renvoie au login
      const response = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.delete("session_user");
      return response;
    }
  }

  return NextResponse.next();
}

// Configuration pour que le middleware s'applique partout
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};