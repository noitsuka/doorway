import { URL_API } from "@/lib/api";

function urlDaLogo(slug: string, versao: number) {
  return `${URL_API}/publico/${slug}/logo?v=${versao}`;
}

export function AvatarNegocio({
  slug,
  versaoLogo,
  src,
  className = "size-12 rounded-control text-lg",
}: {
  slug?: string;
  versaoLogo?: number | null;
  src?: string;
  className?: string;
}) {
  const imagem = src ?? (slug && versaoLogo ? urlDaLogo(slug, versaoLogo) : undefined);
  if (imagem) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- pequena, já redimensionada, servida pela API
      <img src={imagem} alt="" className={`shrink-0 bg-raised object-cover ${className}`} />
    );
  }
  return null;
}
