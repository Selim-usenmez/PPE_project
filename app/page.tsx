import { redirect } from "next/navigation";
import Link from "next/link";



export default function Home() {
  // Dès qu'on arrive sur le site, on va sur /login
  redirect("/login");
}


