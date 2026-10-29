"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

/** Campo de senha com botão para mostrar o que foi digitado */
export function CampoSenha(props: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [visivel, setVisivel] = useState(false);
  return (
    <div className="relative">
      <input
        {...props}
        type={visivel ? "text" : "password"}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className={`${props.className ?? "input"} pr-10`}
      />
      <button
        type="button"
        onClick={() => setVisivel((v) => !v)}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-suave hover:text-texto"
        aria-label={visivel ? "Ocultar senha" : "Mostrar senha"}
        title={visivel ? "Ocultar senha" : "Mostrar senha"}
        tabIndex={-1}
      >
        {visivel ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}
