"use client";

import { X } from "lucide-react";
import { createContext, useContext, useEffect, useRef, useState } from "react";

const FecharModal = createContext<() => void>(() => {});

/** Permite que formulários dentro do modal o fechem após salvar */
export function useFecharModal() {
  return useContext(FecharModal);
}

type Props = {
  titulo: string;
  gatilho: React.ReactNode;
  classeGatilho?: string;
  largura?: string;
  abertoInicial?: boolean;
  aoFechar?: () => void;
  children: React.ReactNode;
};

export function Modal({ titulo, gatilho, classeGatilho = "btn-primary", largura = "max-w-lg", abertoInicial = false, aoFechar, children }: Props) {
  const [aberto, setAberto] = useState(abertoInicial);
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (aberto && !d.open) {
      d.showModal();
      // showModal foca o primeiro botão (fechar); preferimos o primeiro campo do formulário
      d.querySelector<HTMLElement>("input:not([type=hidden]):not([type=checkbox]):not([disabled]), textarea")?.focus();
    }
    if (!aberto && d.open) d.close();
  }, [aberto]);

  return (
    <>
      <button type="button" className={classeGatilho} onClick={() => setAberto(true)}>
        {gatilho}
      </button>
      <dialog
        ref={ref}
        onClose={() => {
          setAberto(false);
          aoFechar?.();
        }}
        onClick={(e) => e.target === ref.current && setAberto(false)}
        className={`m-auto w-[calc(100%-2rem)] ${largura} rounded-card border border-borda bg-white p-0 text-texto shadow-xl backdrop:bg-slate-900/40`}
      >
        {aberto && (
          <FecharModal.Provider value={() => setAberto(false)}>
            <div className="flex items-center justify-between border-b border-borda px-5 py-4">
              <h2 className="font-semibold">{titulo}</h2>
              <button type="button" onClick={() => setAberto(false)} className="rounded-lg p-1 text-suave hover:bg-fundo" aria-label="Fechar">
                <X size={18} />
              </button>
            </div>
            <div className="max-h-[75vh] overflow-y-auto p-5">{children}</div>
          </FecharModal.Provider>
        )}
      </dialog>
    </>
  );
}
