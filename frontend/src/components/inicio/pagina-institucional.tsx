import { Cabecalho } from "@/components/inicio/cabecalho";
import { Rodape } from "@/components/inicio/rodape";
import { RolagemSuave } from "@/components/rolagem-suave";

export function PaginaInstitucional({ children }: { children: React.ReactNode }) {
  return (
    <>
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
