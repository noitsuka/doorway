import { ScrollSmoother } from "gsap/ScrollSmoother";

const ALTURA_DO_CABECALHO = 88;

export function rolarAte(id: string | undefined, suave = true) {
  const suavizador = ScrollSmoother.get();
  if (!id) {
    if (suavizador) suavizador.scrollTo(0, suave);
    else window.scrollTo({ top: 0, behavior: suave ? "smooth" : "auto" });
    return true;
  }
  const alvo = document.getElementById(id);
  if (!alvo) return false;
  if (suavizador) suavizador.scrollTo(alvo, suave, `top ${ALTURA_DO_CABECALHO}px`);
  else alvo.scrollIntoView({ behavior: suave ? "smooth" : "auto", block: "start" });
  return true;
}
