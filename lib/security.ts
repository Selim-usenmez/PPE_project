export function validatePassword(password: string): string | null {
    if (password.length < 12) return "Le mot de passe doit faire au moins 12 caractères.";
    if (!/[A-Z]/.test(password)) return "Le mot de passe doit contenir au moins une majuscule.";
    if (!/[a-z]/.test(password)) return "Le mot de passe doit contenir au moins une minuscule.";
    if (!/[0-9]/.test(password)) return "Le mot de passe doit contenir au moins un chiffre.";
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return "Le mot de passe doit contenir un caractère spécial (!@#$...).";
    
    return null; // Si tout est bon, on renvoie null (pas d'erreur)
  }