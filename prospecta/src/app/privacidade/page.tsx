import Link from "next/link";
import type { Metadata } from "next";
import { Radar } from "lucide-react";
import { CONTROLADOR, POLITICA_ATUALIZADA_EM } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Política de Privacidade — Prospecta",
  description: "Como o Prospecta trata dados pessoais e como exercer seus direitos pela LGPD.",
};

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold text-ink-900">{titulo}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-ink-700">{children}</div>
    </section>
  );
}

export default function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-ink-50">
      <header className="bg-ink-950 px-4 py-4">
        <Link href="/" className="mx-auto flex max-w-3xl items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-500">
            <Radar size={18} className="text-white" strokeWidth={2.4} />
          </span>
          <span className="font-semibold tracking-tight text-white">Prospecta</span>
        </Link>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Política de Privacidade</h1>
          <p className="mt-1 text-sm text-ink-500">Atualizada em {POLITICA_ATUALIZADA_EM}</p>
        </div>

        <div className="card space-y-6 p-6">
          <Secao titulo="1. Quem é responsável pelos dados">
            <p>
              O Prospecta é operado por <b>{CONTROLADOR.nome}</b>, CNPJ {CONTROLADOR.cnpj}, {CONTROLADOR.cidade},
              que atua como controladora dos dados pessoais tratados na plataforma, nos termos da Lei nº 13.709/2018
              (LGPD). Contato do encarregado: <a className="text-brand-600 underline" href={`mailto:${CONTROLADOR.emailPrivacidade}`}>{CONTROLADOR.emailPrivacidade}</a>.
            </p>
          </Secao>

          <Secao titulo="2. Que dados tratamos">
            <p><b>Dados de empresas e de seus sócios, vindos de fontes públicas.</b> A base vem dos Dados Abertos do
              CNPJ, publicados pela Receita Federal: razão social, nome fantasia, CNAE, endereço e contatos cadastrais
              da empresa, e o nome e a qualificação dos sócios e administradores (o CPF não é exibido). Também podemos
              exibir informações que a própria empresa publica em seu site ou páginas públicas.</p>
            <p><b>Dados que os usuários cadastram.</b> Empresas e contatos que um usuário importa ou digita ficam
              visíveis apenas para a conta dele.</p>
            <p><b>Dados de quem usa o Prospecta.</b> Nome, e-mail e senha (guardada só como hash criptográfico); se o
              acesso for pelo Google, nome, e-mail e foto da conta Google; os leads, listas e anotações da conta;
              registros de segurança (IP e tentativas de login, mantidos por até 1 dia); e métricas de uso pelo Google
              Analytics.</p>
          </Secao>

          <Secao titulo="3. Para que usamos">
            <ul className="list-disc space-y-1 pl-5">
              <li>Permitir a prospecção comercial entre empresas (B2B): identificar empresas e quem responde por elas.</li>
              <li>Operar a conta do usuário: login, leads, listas e CRM.</li>
              <li>Proteger a plataforma contra fraude e acesso indevido.</li>
              <li>Entender o uso do produto para melhorá-lo.</li>
            </ul>
          </Secao>

          <Secao titulo="4. Bases legais">
            <p>Dados de sócios e administradores tornados públicos pela Receita Federal são tratados com base no
              <b> legítimo interesse</b> (art. 7º, IX), limitados ao contexto empresarial em que foram publicados e
              considerando a finalidade e o interesse público que justificaram sua divulgação (art. 7º, §§ 3º e 4º).
              Os dados de usuários são tratados para a <b>execução do contrato</b> de uso da plataforma (art. 7º, V) e
              para o cumprimento de obrigações legais (art. 7º, II).</p>
          </Secao>

          <Secao titulo="5. Compartilhamento">
            <p>Não vendemos dados pessoais. Usamos prestadores que tratam dados em nosso nome: hospedagem (Vercel),
              banco de dados (Neon) e Google (login e Google Analytics). Esses serviços podem manter servidores fora do
              Brasil; a transferência segue o art. 33 da LGPD.</p>
          </Secao>

          <Secao titulo="6. Por quanto tempo">
            <p>Dados de conta ficam enquanto a conta existir. Dados da base pública são atualizados a partir das
              publicações da Receita Federal. Registros de tentativas de login são apagados em até 1 dia.</p>
          </Secao>

          <Secao titulo="7. Seus direitos">
            <p>Pelo art. 18 da LGPD, você pode pedir confirmação e acesso aos seus dados, correção, eliminação,
              oposição ao tratamento e informações sobre compartilhamento.</p>
            <p>
              <b>Se você é sócio ou administrador de uma empresa e não quer aparecer no Prospecta</b>, use o{" "}
              <Link className="text-brand-600 underline" href="/privacidade/remover">formulário de remoção</Link>.
              Conferimos que o pedido é do próprio titular e respondemos em até 15 dias pelo e-mail informado. Você também pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD).
            </p>
          </Secao>

          <Secao titulo="8. Segurança">
            <p>Conexões criptografadas (HTTPS e TLS no banco), senhas guardadas apenas como hash, sessão assinada e
              limite de tentativas de login.</p>
          </Secao>
        </div>

        <p className="text-center text-sm">
          <Link href="/privacidade/remover" className="btn-brand">Pedir remoção ou acesso aos meus dados</Link>
        </p>
      </main>
    </div>
  );
}
