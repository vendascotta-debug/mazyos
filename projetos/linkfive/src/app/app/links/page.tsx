import { redirect } from "next/navigation";

// Os links se editam junto com o resto da página — separar em duas telas faria
// o usuário salvar em dois lugares para publicar uma coisa só.
export default function Links() {
  redirect("/app/pagina");
}
