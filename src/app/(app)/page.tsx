import { redirect } from "next/navigation";

// A tela inicial do sistema é a agenda do dia
export default function Inicio() {
  redirect("/agenda");
}
