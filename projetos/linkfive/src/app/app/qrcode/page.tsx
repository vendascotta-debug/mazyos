import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { Download, Printer } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { paginaDoUsuario } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default async function PaginaQrCode() {
  const user = await requireUser();
  const page = await paginaDoUsuario(user.id);
  if (!page) redirect("/onboarding");

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const alvo = `${base}/${page.slug}`;

  // Gerado no servidor e embutido no HTML: a tela abre com o código já
  // desenhado, sem piscar e sem uma requisição extra.
  const svg = await QRCode.toString(alvo, {
    errorCorrectionLevel: "M",
    margin: 2,
    type: "svg",
    color: { dark: "#0a1428", light: "#ffffff" },
  });

  return (
    <div className="mx-auto max-w-[720px] px-5 py-6">
      <h1 className="text-xl font-bold tracking-tight">Meu QR Code</h1>
      <p className="mt-1 text-sm text-ink-500">
        Imprima na vitrine, no balcão, no cartão ou no carro. Quem apontar a câmera cai direto na
        sua página.
      </p>

      <div className="card mt-5 p-6">
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
          <div
            className="w-[240px] shrink-0 rounded-[14px] border border-ink-200 bg-white p-3"
            dangerouslySetInnerHTML={{ __html: svg }}
          />

          <div className="min-w-0 flex-1 text-center sm:text-left">
            <p className="text-sm font-medium text-ink-500">Aponta para</p>
            <p className="mt-1 break-all font-semibold text-brand-600">{alvo}</p>

            {!page.published && (
              <p className="mt-3 rounded-[10px] bg-accent-100 px-3.5 py-2.5 text-sm text-ink-800">
                Sua página ainda é um rascunho. O QR Code só vai funcionar depois de publicar.
              </p>
            )}

            <div className="mt-5 flex flex-wrap justify-center gap-2 sm:justify-start">
              {/* Download por rota de servidor com content-disposition: funciona
                  no celular, onde salvar SVG inline costuma falhar. */}
              <a href="/api/qrcode?formato=png&tamanho=1024" className="btn-brand" download>
                <Download size={16} /> Baixar PNG
              </a>
              <a href="/api/qrcode?formato=svg" className="btn-ghost" target="_blank" rel="noopener">
                <Printer size={16} /> Abrir SVG para imprimir
              </a>
            </div>

            <p className="mt-4 text-xs text-ink-400">
              O PNG sai em 1024px, tamanho suficiente para adesivo e material impresso. O SVG não
              perde qualidade em nenhum tamanho.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
