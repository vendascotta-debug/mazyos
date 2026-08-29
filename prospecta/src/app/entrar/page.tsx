import Link from "next/link";
import { redirect } from "next/navigation";
import { Radar } from "lucide-react";
import { currentUser } from "@/lib/auth";
import { AuthForm } from "@/components/AuthForm";
import { GoogleButton } from "@/components/GoogleButton";
import { googleConfigurado } from "@/lib/google";

export const dynamic = "force-dynamic";

const MENSAGEM_ERRO: Record<string, string> = {
  'google-nao-configurado': 'Login com Google ainda não está configurado neste ambiente.',
  'google-state': 'A sessão do Google expirou. Tente entrar de novo.',
  'google-falhou': 'Não foi possível entrar com o Google. Tente de novo ou use e-mail e senha.',
};


export default async function EntrarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (await currentUser()) redirect("/buscar");
  const sp = await searchParams;
  const novo = sp.novo === "1";
  const erro = typeof sp.erro === "string" ? MENSAGEM_ERRO[sp.erro] : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-500">
            <Radar size={20} className="text-white" strokeWidth={2.4} />
          </span>
          <span className="text-xl font-semibold tracking-tight text-white">Prospecta</span>
        </div>

        <div className="card p-6">
          <h1 className="text-lg font-semibold text-ink-900">Entrar na sua conta</h1>
          <p className="mt-1 mb-5 text-sm text-ink-500">
            {novo
              ? "Conta criada. Faça login para começar."
              : "Seus leads, listas e CRM são privados da sua conta."}
          </p>

          {erro && (
            <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>
          )}

          {googleConfigurado() && <GoogleButton texto="Entrar com Google" />}

          <AuthForm modo="login" />

          <p className="mt-5 border-t border-ink-100 pt-4 text-center text-sm text-ink-500">
            Ainda não tem conta?{" "}
            <Link href="/cadastrar" className="font-medium text-brand-600 hover:underline">
              Criar conta
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
