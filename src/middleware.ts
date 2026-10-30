import { withAuth } from "next-auth/middleware";

// Exige login em todas as rotas do sistema. Restrições por perfil (admin) ficam nas
// próprias páginas e ações via exigirAdmin(), que usa o perfil atual do banco.
export default withAuth({ pages: { signIn: "/login" } });

export const config = {
  matcher: ["/((?!login|sair|privacidade|api/auth|_next/static|_next/image|icon.svg|manifest.webmanifest|robots.txt).*)"],
};
