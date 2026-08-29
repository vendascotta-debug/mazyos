import Link from "next/link";
import { redirect } from "next/navigation";
import { Radar } from "lucide-react";
import { currentUser } from "@/lib/auth";
import { AuthForm } from "@/components/AuthForm";

export const dynamic = "force-dynamic";

export default async function CadastrarPage() {
  if (await currentUser()) redirect("/buscar");

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
          <h1 className="text-lg font-semibold text-ink-900">Criar conta</h1>
          <p className="mt-1 mb-5 text-sm text-ink-500">
            A base de empresas é compartilhada. Seus leads, listas e anotações são
            só seus.
          </p>

          <AuthForm modo="cadastro" />

          <p className="mt-5 border-t border-ink-100 pt-4 text-center text-sm text-ink-500">
            Já tem conta?{" "}
            <Link href="/entrar" className="font-medium text-brand-600 hover:underline">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
