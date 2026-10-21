// Esqueleto exibido enquanto a tela carrega
export default function Carregando() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Carregando">
      <div className="mb-2 h-7 w-48 rounded-lg bg-borda" />
      <div className="mb-6 h-4 w-64 rounded bg-borda/70" />
      <div className="card space-y-3 p-5">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-10 rounded-lg bg-fundo" />
        ))}
      </div>
    </div>
  );
}
