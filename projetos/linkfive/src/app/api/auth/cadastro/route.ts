import { NextResponse } from "next/server";
import { z } from "zod";
import { criarUsuario, emailEmUso, setSessionCookie } from "@/lib/auth";
import { criarPagina, slugDisponivel } from "@/lib/repo";
import { normalizarSlug, validarSlug } from "@/lib/slug";
import { aplicarAssinaturaPendente } from "@/lib/cobranca";

const Corpo = z.object({
  nome: z.string().trim().min(2, "Digite seu nome."),
  email: z.string().trim().email("E-mail inválido."),
  senha: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres."),
  slug: z.string().trim().min(1, "Escolha o endereço da sua página."),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = Corpo.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ erro: parsed.error.issues[0].message }, { status: 400 });
  }
  const { nome, email, senha } = parsed.data;

  // Normaliza antes de validar: o que o usuário digitou nunca é confiável, e o
  // front pode ter deixado passar acento ou espaço.
  const slug = normalizarSlug(parsed.data.slug);
  const v = validarSlug(slug);
  if (!v.ok) return NextResponse.json({ erro: v.erro, campo: "slug" }, { status: 400 });

  if (await emailEmUso(email)) {
    return NextResponse.json(
      { erro: "Já existe uma conta com esse e-mail.", campo: "email" },
      { status: 409 },
    );
  }
  if (!(await slugDisponivel(slug))) {
    return NextResponse.json(
      { erro: "Esse endereço já está em uso.", campo: "slug" },
      { status: 409 },
    );
  }

  const user = await criarUsuario({ nome, email, senha });
  // A página nasce junto com a conta, em rascunho. Assim o editor e o
  // onboarding nunca precisam lidar com "usuário sem página".
  await criarPagina(user.id, slug, nome);

  // Quem pagou antes de criar a conta — o caminho normal num checkout externo
  // — já entra com o plano que comprou, em vez de cair no Free depois de ter
  // pago.
  const planoPago = await aplicarAssinaturaPendente(user.id, email);

  await setSessionCookie(user.id);

  return NextResponse.json({ ok: true, destino: "/onboarding", plano: planoPago ?? "free" });
}
