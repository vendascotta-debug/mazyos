import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

export const metadata = {
  title: "Política de Privacidade — LINKFIVE",
  description: "Como o LINKFIVE trata os dados de quem usa a plataforma e de quem visita as páginas.",
};

/**
 * Política de privacidade.
 *
 * RASCUNHO ESCRITO POR IA, NÃO REVISADO POR ADVOGADO.
 *
 * O ponto mais delicado do LINKFIVE está aqui: o sistema guarda dados de
 * TERCEIROS (os leads dos nossos clientes). Na LGPD, o cliente é o controlador
 * desses dados e nós somos o operador — e essa distinção precisa estar escrita,
 * porque define de quem é a obrigação quando alguém pedir exclusão.
 */
export default function Privacidade() {
  const atualizado = "7 de setembro de 2026";

  return (
    <div className="bg-white">
      <header className="border-b border-ink-100">
        <div className="mx-auto flex max-w-[760px] items-center justify-between px-5 py-3.5">
          <Link href="/">
            <Logo />
          </Link>
          <Link href="/termos" className="text-sm text-ink-500 hover:text-ink-900">
            Termos de uso
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[760px] px-5 py-12">
        <h1 className="display text-[36px] text-ink-900">Política de Privacidade</h1>
        <p className="mt-2 text-sm text-ink-400">Atualizado em {atualizado}</p>

        <div className="mt-8 space-y-7 text-[15px] leading-relaxed text-ink-700">
          <section>
            <h2 className="mb-2 text-lg font-semibold text-ink-900">Em uma frase</h2>
            <p>
              Coletamos o mínimo necessário para o serviço funcionar, não vendemos dado de ninguém,
              e você pode pedir para apagar tudo a qualquer momento.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-ink-900">1. Quem é responsável</h2>
            <p>
              Há dois tipos de dado aqui, e o responsável muda conforme o caso:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <strong>Seus dados de conta</strong> (nome, e-mail, senha): o LINKFIVE é o
                controlador.
              </li>
              <li>
                <strong>Os contatos que você recebe</strong> pelo formulário da sua página: quem
                controla é <strong>você</strong>. O LINKFIVE apenas opera — armazena e mostra para
                você. Se alguém pedir para ser excluído dessa lista, a obrigação de atender é sua,
                e nós damos a ferramenta para isso.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-ink-900">2. O que coletamos de você</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Nome e e-mail, no cadastro</li>
              <li>Senha, guardada apenas como código embaralhado (scrypt) — nunca em texto</li>
              <li>O conteúdo que você publica: nome da página, descrição, links, imagens</li>
              <li>Dados de uso do painel, para manter sua sessão ativa</li>
            </ul>
            <p className="mt-2">
              Não pedimos CPF, endereço nem dados de cartão. O pagamento é processado pela
              plataforma parceira, que tem a própria política.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-ink-900">
              3. O que registramos de quem visita uma página
            </h2>
            <p>
              Quando alguém abre uma página LINKFIVE ou clica num link, registramos a data e a hora,
              o tipo de dispositivo (celular, tablet ou computador) e de onde a visita veio, quando
              essa informação está disponível.
            </p>
            <p className="mt-2">
              <strong>Não</strong> guardamos endereço IP completo, não usamos cookies de
              rastreamento, não montamos perfil de visitante e não compartilhamos nada disso com
              redes de anúncio. O objetivo é só um: mostrar ao dono da página quantas pessoas
              chegaram e o que foi clicado.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-ink-900">4. Formulário de contato</h2>
            <p>
              Quando um visitante preenche o formulário de uma página, os dados vão apenas para o
              dono daquela página. Nós não usamos esses contatos para nada, não enviamos e-mail
              para eles e não os compartilhamos com ninguém.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-ink-900">5. Cookies</h2>
            <p>
              Usamos um único cookie, para manter você conectado ao painel. Ele é assinado, dura 30
              dias e não serve para rastrear seu comportamento fora do LINKFIVE. Não há cookie de
              publicidade nem de análise de terceiros.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-ink-900">6. Onde os dados ficam</h2>
            <p>
              Em servidores da Vercel e do Neon, com transmissão criptografada. Parte da
              infraestrutura fica fora do Brasil, o que a LGPD permite mediante garantias de
              proteção equivalentes.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-ink-900">7. Por quanto tempo</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Dados de conta: enquanto a conta existir</li>
              <li>Eventos detalhados de visita e clique: 90 dias</li>
              <li>Totais por dia (sem identificar ninguém): mantidos para o histórico</li>
              <li>Contatos recebidos pelo formulário: até você apagá-los</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-ink-900">8. Seus direitos</h2>
            <p>
              Pela LGPD, você pode pedir a qualquer momento: confirmação de que tratamos seus
              dados, acesso a eles, correção, exclusão, portabilidade e informação sobre com quem
              compartilhamos. Basta escrever para o e-mail de contato do site — respondemos em até
              15 dias.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-ink-900">9. Menores de idade</h2>
            <p>
              O serviço não é destinado a menores de 18 anos sem autorização de um responsável.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-ink-900">10. Mudanças</h2>
            <p>
              Se esta política mudar de forma relevante, avisamos por e-mail ou no painel antes de a
              mudança valer.
            </p>
          </section>
        </div>

        <div className="mt-10 rounded-[14px] border border-accent-300 bg-accent-100 p-4 text-sm text-ink-800">
          <strong>Aviso ao responsável pelo LINKFIVE:</strong> rascunho gerado automaticamente, sem
          revisão jurídica. Antes de aceitar cadastro em escala, preencha razão social, CNPJ,
          e-mail do encarregado de dados (DPO) e confirme com um advogado a seção 1 — é ela que
          define de quem é a obrigação quando um lead pedir exclusão.
        </div>

        <p className="mt-8 text-sm">
          <Link href="/" className="text-brand-600 hover:underline">
            ← Voltar para o início
          </Link>
        </p>
      </main>
    </div>
  );
}
