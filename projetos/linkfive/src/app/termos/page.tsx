import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

export const metadata = {
  title: "Termos de Uso — LINKFIVE",
  description: "As regras de uso da plataforma LINKFIVE.",
};

/**
 * Termos de uso.
 *
 * RASCUNHO ESCRITO POR IA, NÃO REVISADO POR ADVOGADO. Cobre o essencial e usa
 * linguagem que o cliente entende, mas antes de cobrar de verdade isso precisa
 * de leitura profissional — principalmente as partes de responsabilidade,
 * reembolso e rescisão.
 */
export default function Termos() {
  const atualizado = "7 de setembro de 2026";

  return (
    <div className="bg-white">
      <header className="border-b border-ink-100">
        <div className="mx-auto flex max-w-[760px] items-center justify-between px-5 py-3.5">
          <Link href="/">
            <Logo />
          </Link>
          <Link href="/privacidade" className="text-sm text-ink-500 hover:text-ink-900">
            Privacidade
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[760px] px-5 py-12">
        <h1 className="display text-[36px] text-ink-900">Termos de Uso</h1>
        <p className="mt-2 text-sm text-ink-400">Atualizado em {atualizado}</p>

        <div className="mt-8 space-y-7 text-[15px] leading-relaxed text-ink-700">
          <section>
            <h2 className="mb-2 text-lg font-semibold text-ink-900">1. Do que se trata</h2>
            <p>
              O LINKFIVE é um serviço que permite criar uma página pública com seus canais de
              contato e gerar links curtos que levam direto ao WhatsApp ou a qualquer endereço da
              internet. Ao criar uma conta, você concorda com estas regras.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-ink-900">2. Sua conta</h2>
            <p>
              Você é responsável pelo que acontece na sua conta e por manter a senha em segurança.
              É preciso ter 18 anos ou mais, ou autorização de um responsável. Um e-mail por conta.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-ink-900">3. O que você não pode fazer</h2>
            <p>Sua página e seus links não podem ser usados para:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Enganar pessoas, se passar por outra pessoa ou empresa, ou aplicar golpes</li>
              <li>Distribuir vírus, programas maliciosos ou conteúdo ilegal</li>
              <li>Vender o que a lei brasileira proíbe</li>
              <li>Conteúdo que incite violência, ódio ou discriminação</li>
              <li>Violar direito autoral ou marca de terceiros</li>
              <li>Enviar mensagem em massa não solicitada usando os links gerados aqui</li>
            </ul>
            <p className="mt-2">
              Páginas que violem estas regras são suspensas, com ou sem aviso prévio, conforme a
              gravidade. Nada é apagado de imediato: seus dados continuam disponíveis caso a
              suspensão seja revista.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-ink-900">4. Conteúdo é seu</h2>
            <p>
              Tudo que você publica — textos, imagens, links e os contatos que receber pelo
              formulário — continua sendo seu. Nós apenas hospedamos e exibimos, e usamos os dados
              estritamente para operar o serviço. Não vendemos nem compartilhamos seus dados com
              terceiros para fins comerciais.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-ink-900">5. Planos e pagamento</h2>
            <p>
              Existe um plano gratuito, com limites. Os planos pagos são mensais e cobrados pela
              plataforma de pagamento parceira, que processa a transação — o LINKFIVE não armazena
              dados do seu cartão.
            </p>
            <p className="mt-2">
              Você pode cancelar quando quiser. O acesso continua até o fim do período já pago e
              depois a conta volta ao plano gratuito. Nada é apagado no cancelamento: se você
              voltar, encontra sua página como deixou, respeitados os limites do plano gratuito.
            </p>
            <p className="mt-2">
              Direito de arrependimento: nos 7 dias seguintes à contratação, você pode desistir e
              receber o valor de volta, conforme o Código de Defesa do Consumidor.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-ink-900">6. Disponibilidade</h2>
            <p>
              Trabalhamos para manter o serviço no ar, mas não garantimos funcionamento
              ininterrupto. Pode haver manutenção, instabilidade ou falha de fornecedores dos quais
              dependemos. Avisaremos com antecedência sempre que for possível.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-ink-900">7. Limite de responsabilidade</h2>
            <p>
              O LINKFIVE não se responsabiliza por lucros cessantes, negócios perdidos ou danos
              indiretos decorrentes do uso ou da indisponibilidade do serviço. Nossa
              responsabilidade fica limitada ao valor pago por você nos últimos 12 meses.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-ink-900">8. Encerramento</h2>
            <p>
              Você pode encerrar sua conta quando quiser. Podemos encerrar contas que violem estes
              termos. Em qualquer caso, você pode solicitar seus dados antes da exclusão definitiva.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-ink-900">9. Mudanças nestes termos</h2>
            <p>
              Podemos atualizar estes termos. Mudanças relevantes serão avisadas por e-mail ou no
              painel, com antecedência razoável. Continuar usando o serviço depois disso significa
              concordar com a versão nova.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-ink-900">10. Foro e contato</h2>
            <p>
              Estes termos seguem a lei brasileira. Dúvidas e solicitações podem ser enviadas pelo
              e-mail de contato divulgado no site.
            </p>
          </section>
        </div>

        <div className="mt-10 rounded-[14px] border border-accent-300 bg-accent-100 p-4 text-sm text-ink-800">
          <strong>Aviso ao responsável pelo LINKFIVE:</strong> este texto é um rascunho gerado
          automaticamente e ainda não foi revisado por advogado. Antes de cobrar do primeiro
          cliente, leve as seções 5, 7 e 8 para revisão profissional, e preencha razão social, CNPJ
          e e-mail de contato.
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
