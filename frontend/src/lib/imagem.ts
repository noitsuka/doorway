const LADO = 256;
const MAXIMO_BYTES = 60 * 1024;

function paraBlob(canvas: HTMLCanvasElement, tipo: string, qualidade: number) {
  return new Promise<Blob | null>((resolver) => canvas.toBlob(resolver, tipo, qualidade));
}

export async function logoQuadrada(arquivo: File): Promise<Blob> {
  const bitmap = await createImageBitmap(arquivo);
  const menorLado = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = LADO;
  const contexto = canvas.getContext("2d")!;
  contexto.imageSmoothingQuality = "high";
  contexto.drawImage(
    bitmap,
    (bitmap.width - menorLado) / 2,
    (bitmap.height - menorLado) / 2,
    menorLado,
    menorLado,
    0,
    0,
    LADO,
    LADO,
  );
  bitmap.close();

  for (const qualidade of [0.9, 0.8, 0.65, 0.5]) {
    let blob = await paraBlob(canvas, "image/webp", qualidade);
    if (blob?.type !== "image/webp") {
      contexto.globalCompositeOperation = "destination-over";
      contexto.fillStyle = "#ffffff";
      contexto.fillRect(0, 0, LADO, LADO);
      blob = await paraBlob(canvas, "image/jpeg", qualidade);
    }
    if (blob && blob.size <= MAXIMO_BYTES) return blob;
  }
  throw new Error("imagem grande demais");
}
