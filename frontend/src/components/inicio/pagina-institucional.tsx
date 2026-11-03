import { Cabecalho } from "@/components/inicio/cabecalho";
import { Rodape } from "@/components/inicio/rodape";
import { RolagemSuave } from "@/components/rolagem-suave";

export function PaginaInstitucional({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 [mask-image:radial-gradient(ellipse_at_50%_25%,black_25%,transparent_80%)]"
      >
        <div className="absolute inset-0 animate-cintilar estrelas-finas" />
        <div className="absolute inset-0 animate-cintilar estrelas-maiores [animation-delay:-4s] [animation-duration:9s]" />
      </div>
      <Cabecalho />
      <RolagemSuave>
        <div className="overflow-x-clip pt-[4.5rem]">
          {children}
          <Rodape />
        </div>
      </RolagemSuave>
    </>
  );
}
