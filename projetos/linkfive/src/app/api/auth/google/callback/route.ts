import { NextResponse } from "next/server";
import { setSessionCookie, usuarioDoGoogle } from "@/lib/auth";
import { conferirEstado, googleConfigurado, trocarCodigoPorConta } from "@/lib/google";
import { adotarCurtos, criarPagina, paginaDoUsuario, slugDisponivel } from "@/lib/repo";
import { curtosDoConvidado, esquecerConvidado } from "@/lib/convidado";
import { aplicarAssinaturaPendente } from "@/lib/cobranca";
import { normalizarSlug, validarSlug } from "@/lib/slug";

// ---------------------------------------------------------------------------
// A volta do Google.
//
// Tudo aqui termina em redirecionamento, nunca em JSON: quem chega nesta rota é
// o navegador do visitante vindo do Google, não um programa. Erro vira recado
// na tela de login, e não uma página branca com um objeto.
// ---------------------------------------------------------------------------

function paraOLogin(req: Request, erro: string) {
  return NextResponse.redirect(new URL(`/entrar?erro=${erro}`, req.url), 307);
}

/**
 * Endereço da página para quem nasce pelo Google.
 *
 * O cadastro normal pergunta isso, mas aqui não há formulário — a pessoa clicou
 * num botão e já entrou. Então o endereço é derivado do nome, e o onboarding
 * deixa trocar antes de publicar. Melhor um endereço provisório e uma conta
 * pronta do que um formulário no meio de um login de um clique.
 */
async function enderecoLivre(nome: string, email: string): Promise<string> {
  const base = normalizarSlug(nome) || normalizarSlug(email.split("@")[0]) || "minha-pagina";

  const candidatos = [base];
  for (let i = 0; i < 30; i++) {
    // Sufixo curto e aleatório em vez de contador: um contador entregaria
    // quantas pessoas já pegaram aquele nome.
    candidatos.push(`${base}-${Math.random().toString(36).slice(2, 6)}`);
  }

  for (const c of candidatos) {
    if (validarSlug(c).ok && (await slugDisponivel(c))) return c;
  }
  return `pagina-${Date.now().toString(36)}`;
}

export async function GET(req: Request) {
  if (!googleConfigurado()) return paraOLogin(req, "google-indisponivel");

  const params = new URL(req.url).searchParams;

  // O visitante clicou em "cancelar" na tela do Google. Não é erro nosso.
  if (params.get("error")) return NextResponse.redirect(new URL("/entrar", req.url), 307);

  const codigo = params.get("code");
  const estado = params.get("state");
  if (!codigo || !estado) return paraOLogin(req, "google-incompleto");

  const conferido = await conferirEstado(estado);
  if (!conferido.ok) return paraOLogin(req, "google-expirado");

  const resultado = await trocarCodigoPorConta(req, codigo);
  if (!resultado.ok) {
    // O motivo real fica no log: dizer ao visitante "o token foi emitido para
    // outro aplicativo" não ajuda ninguém, e ainda descreve a configuração.
    console.error(`[google] ${resultado.erro}`);
    return paraOLogin(req, "google-falhou");
  }

  const { user, novo } = await usuarioDoGoogle(resultado.conta);

  // A página nasce junto com a conta, igual ao cadastro normal — assim o editor
  // e o onboarding nunca precisam lidar com "usuário sem página".
  if (novo) {
    await criarPagina(user.id, await enderecoLivre(resultado.conta.nome, user.email), user.name);
    await aplicarAssinaturaPendente(user.id, user.email);
  } else if (!(await paginaDoUsuario(user.id))) {
    // Conta antiga que por algum motivo ficou sem página: cria em vez de deixar
    // o painel quebrado.
    await criarPagina(user.id, await enderecoLivre(user.name, user.email), user.name);
  }

  // O link encurtado na landing antes de entrar vem junto, igual ao cadastro e
  // ao login por senha.
  if ((await adotarCurtos(user.id, await curtosDoConvidado())) > 0) {
    await esquecerConvidado();
  }

  await setSessionCookie(user.id);

  const destino = conferido.destino || (user.onboarded ? "/app" : "/onboarding");
  return NextResponse.redirect(new URL(destino, req.url), 307);
}
