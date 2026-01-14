// lib/security.ts
export function genererMotDePasseFort(longueur = 12): string {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+";
  let password = "";
  
  // Force la complexité
  password += "A"; 
  password += "a"; 
  password += "1"; 
  password += "!"; 

  for (let i = 4; i < longueur; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }

  return password.split('').sort(() => 0.5 - Math.random()).join('');
}