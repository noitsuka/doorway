import argparse
import asyncio
import json
import statistics
import time
from datetime import date, timedelta


async def buscar(leitor, escritor, caminho: str) -> tuple[int, bytes]:
    escritor.write(f"GET {caminho} HTTP/1.1\r\nHost: teste-carga\r\n\r\n".encode())
    cabecalho = await leitor.readuntil(b"\r\n\r\n")
    status = int(cabecalho.split(b" ", 2)[1])
    tamanho = next(
        int(linha.split(b":", 1)[1])
        for linha in cabecalho.split(b"\r\n")
        if linha.lower().startswith(b"content-length:")
    )
    return status, await leitor.readexactly(tamanho)


async def executar(args) -> None:
    leitor, escritor = await asyncio.open_connection(args.host, args.porta)
    _, corpo = await buscar(leitor, escritor, f"/publico/{args.slug}")
    escritor.close()
    servico_id = json.loads(corpo)["servicos"][0]["id"]
    caminhos = [
        f"/publico/{args.slug}/horarios-livres?servico_id={servico_id}"
        f"&dia={date.today() + timedelta(days=i)}"
        for i in range(14)
    ]

    latencias: list[float] = []
    erros = 0
    por_conexao = args.requisicoes // args.conexoes

    async def conexao(deslocamento: int) -> None:
        nonlocal erros
        leitor, escritor = await asyncio.open_connection(args.host, args.porta)
        for i in range(por_conexao):
            comeco = time.perf_counter()
            status, _ = await buscar(leitor, escritor, caminhos[(deslocamento + i) % len(caminhos)])
            latencias.append((time.perf_counter() - comeco) * 1000)
            erros += status != 200
        escritor.close()

    comeco = time.perf_counter()
    await asyncio.gather(*(conexao(i) for i in range(args.conexoes)))
    duracao = time.perf_counter() - comeco

    q = statistics.quantiles(latencias, n=100)
    print(f"{len(latencias)} requisições em {args.conexoes} conexões, {erros} erros")
    print(f"vazão       {len(latencias) / duracao:,.0f} req/s")
    print(f"latência    p50 {q[49]:.1f} ms   p95 {q[94]:.1f} ms   p99 {q[98]:.1f} ms")


if __name__ == "__main__":
    argumentos = argparse.ArgumentParser()
    argumentos.add_argument("--host", default="127.0.0.1")
    argumentos.add_argument("--porta", type=int, default=8000)
    argumentos.add_argument("--slug", default="barbearia-ferraz")
    argumentos.add_argument("--requisicoes", type=int, default=10_000)
    argumentos.add_argument("--conexoes", type=int, default=50)
    asyncio.run(executar(argumentos.parse_args()))
