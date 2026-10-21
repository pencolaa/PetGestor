"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { CalendarDays, LogOut, PawPrint, Settings, UserRound } from "lucide-react";

const ITENS = [
  { href: "/agenda", rotulo: "Agenda", icone: CalendarDays },
  { href: "/clientes", rotulo: "Clientes e pets", icone: PawPrint },
];

type Props = {
  nomePetShop: string;
  logoUrl: string | null;
  usuario: { nome: string; perfil: "ADMIN" | "ATENDENTE" };
};

export function Sidebar({ nomePetShop, logoUrl, usuario }: Props) {
  const pathname = usePathname();
  const conta = { href: "/conta", rotulo: "Minha conta", icone: UserRound };
  const itens = usuario.perfil === "ADMIN" ? [...ITENS, { href: "/configuracoes", rotulo: "Configurações", icone: Settings }, conta] : [...ITENS, conta];
  const ativo = (href: string) => pathname.startsWith(href);

  return (
    <aside className="sticky top-0 z-30 flex shrink-0 flex-col bg-sidebar text-white md:h-screen md:w-60">
      <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-5 md:py-6">
        <div className="flex min-w-0 items-center gap-3">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="h-9 w-9 rounded-lg bg-white object-contain" />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15">
              <PawPrint size={20} />
            </div>
          )}
          <span className="truncate font-bold">{nomePetShop}</span>
        </div>
        <button onClick={() => signOut({ callbackUrl: "/login" })} className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white md:hidden" title="Sair">
          <LogOut size={18} />
        </button>
      </div>

      <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-1 md:flex-col md:overflow-visible md:pb-0">
        {itens.map(({ href, rotulo, icone: Icone }) => (
          <Link
            key={href}
            href={href}
            className={`flex shrink-0 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              ativo(href) ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Icone size={18} />
            {rotulo}
          </Link>
        ))}
      </nav>

      <div className="hidden border-t border-white/10 p-4 md:block">
        <Link href="/conta" className="block truncate text-sm font-semibold hover:underline">{usuario.nome}</Link>
        <p className="text-xs text-white/60">{usuario.perfil === "ADMIN" ? "Administrador" : "Atendente"}</p>
        <button onClick={() => signOut({ callbackUrl: "/login" })} className="mt-3 flex items-center gap-2 text-xs text-white/70 hover:text-white">
          <LogOut size={14} /> Sair
        </button>
      </div>
    </aside>
  );
}
