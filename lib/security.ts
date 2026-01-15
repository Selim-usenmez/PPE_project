/**
 * Génère un mot de passe aléatoire robuste.
 */
export function genererMotDePasseFort(longueur = 12): string {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+";
  let password = "";
  
  // Force la complexité (1 Maj, 1 Min, 1 Chiffre, 1 Spécial)
  password += "A"; 
  password += "a"; 
  password += "1"; 
  password += "!"; 

  for (let i = 4; i < longueur; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }

  return password.split('').sort(() => 0.5 - Math.random()).join('');
}

/**
 * 👇 C'EST CETTE FONCTION QUI MANQUAIT ET BLOQUAIT VERCEL
 * Vérifie la solidité d'un mot de passe fourni par l'utilisateur.
 */
export function validatePassword(password: string): string | null {
  if (!password || password.length < 8) {
    return "Le mot de passe doit contenir au moins 8 caractères.";
  }
  if (!/[A-Z]/.test(password)) {
    return "Le mot de passe doit contenir au moins une majuscule.";
  }
  if (!/[a-z]/.test(password)) {
    return "Le mot de passe doit contenir au moins une minuscule.";
  }
  if (!/[0-9]/.test(password)) {
    return "Le mot de passe doit contenir au moins un chiffre.";
  }
  
  return null; // Tout est valide
}