import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { plano } from "@/lib/limites";
import type { PlanId } from "@/lib/types";

// ---------------------------------------------------------------------------
// Envio do PDF do catálogo — do navegador direto para o armazenamento.
//
// A rota comum de upload não serve aqui: a Vercel recusa qualquer requisição
// acima de ~4,5 MB antes mesmo do nosso código rodar (413
// FUNCTION_PAYLOAD_TOO_LARGE), e o usuário recebia um erro genérico sem
// entender que o problema era o tamanho. Foi o que aconteceu com o primeiro
// catálogo real que tentaram enviar.
//
// Aqui o servidor só assina uma autorização; o arquivo vai do navegador para o
// Blob sem atravessar a função. O que o servidor continua mandando é QUEM pode
// enviar, QUE formato e ATÉ QUE TAMANHO — tudo verificado na assinatura, e não
// na tela, que qualquer um pode burlar.
// ---------------------------------------------------------------------------

/** Dez megabytes: é o que a página de venda promete, e agora é verdade. */
const LIMITE_PDF = 10 * 1024 * 1024;

export async function POST(req: Request): Promise<NextResponse> {
  const corpo = (await req.json()) as HandleUploadBody;

  try {
    const resposta = await handleUpload({
      body: corpo,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        const user = await currentUser();
        if (!user) throw new Error("Não autenticado.");
        if (!plano(user.plan as PlanId).catalogoPdf) {
          throw new Error("Enviar o PDF do catálogo está disponível a partir do plano Starter.");
        }
        // O caminho vem do navegador, então quem confere é o servidor: sem
        // isso alguém assinado poderia escrever por cima da pasta de avatares.
        // O dono não entra no caminho porque o navegador não sabe o id dele —
        // de quem é cada catálogo a gente descobre pelo link que o aponta.
        if (!pathname.startsWith("catalogos/") || pathname.includes("..")) {
          throw new Error("Caminho de arquivo inválido.");
        }
        return {
          allowedContentTypes: ["application/pdf"],
          maximumSizeInBytes: LIMITE_PDF,
          addRandomSuffix: true,
        };
      },
      // O Blob avisa o servidor quando termina. Não há o que fazer com isso
      // hoje — o endereço já volta pro navegador —, mas a função é exigida.
      onUploadCompleted: async () => {},
    });

    return NextResponse.json(resposta);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Não foi possível enviar o catálogo.";
    return NextResponse.json({ erro: msg }, { status: 400 });
  }
}
