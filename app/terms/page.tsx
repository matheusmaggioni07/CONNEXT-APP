import { ConnextLogo } from "@/components/ui/connext-logo"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export const metadata = {
  title: "Termos de Uso - Connext",
  description: "Termos de Uso da plataforma Connext",
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <ConnextLogo size="md" />
        </div>

        <h1 className="text-3xl font-bold text-foreground mb-8">Termos de Uso</h1>

        <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
          <p className="text-lg">Última atualização: {new Date().toLocaleDateString("pt-BR")}</p>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">1. Aceitação dos Termos</h2>
            <p>
              Ao acessar e usar o Connext, você concorda em cumprir e estar vinculado a estes Termos de Uso. Se você não
              concordar com qualquer parte destes termos, não poderá usar nossos serviços.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">2. Requisitos de Idade</h2>
            <p className="text-primary font-medium">
              Você deve ter pelo menos 18 (dezoito) anos de idade para criar uma conta e usar o Connext.
            </p>
            <p>
              Ao criar uma conta, você declara e garante que possui idade igual ou superior a 18 anos. Reservamo-nos o
              direito de solicitar comprovação de idade a qualquer momento e de encerrar contas de usuários que não
              atendam a este requisito.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">3. Uso da Plataforma</h2>
            <p>O Connext é uma plataforma de networking profissional via videochamada. Você concorda em:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Usar a plataforma exclusivamente para fins profissionais e legítimos de networking</li>
              <li>Fornecer informações verdadeiras, precisas e atualizadas sobre sua identidade e carreira</li>
              <li>Manter a confidencialidade de suas credenciais de acesso</li>
              <li>Tratar outros usuários com respeito, cordialidade e profissionalismo</li>
              <li>Não utilizar a plataforma para fins ilegais, fraudulentos ou prejudiciais</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">4. Conduta nas Videochamadas</h2>
            <p>Durante as videochamadas, você deve:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Manter comportamento profissional e respeitoso</li>
              <li>Não exibir conteúdo impróprio, ofensivo, ilegal ou de natureza sexual</li>
              <li>Não gravar ou capturar as chamadas sem o consentimento do outro participante</li>
              <li>Não compartilhar informações confidenciais de terceiros</li>
              <li>Reportar qualquer comportamento inadequado através dos canais apropriados</li>
            </ul>
            <p className="mt-4 text-destructive font-medium">
              Qualquer violação destas regras resultará em suspensão ou banimento permanente da plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">5. Conteúdo do Usuário</h2>
            <p>
              Você é responsável por todo o conteúdo que compartilha na plataforma, incluindo fotos de perfil,
              informações profissionais e mensagens. O Connext reserva-se o direito de remover qualquer conteúdo que
              viole estes termos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">6. Privacidade e Dados</h2>
            <p>
              Suas informações pessoais são tratadas conforme nossa Política de Privacidade. Coletamos e processamos
              seus dados apenas para fornecer e melhorar nossos serviços.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">7. Limitação de Responsabilidade</h2>
            <p>O Connext não se responsabiliza por:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Interações entre usuários fora da plataforma</li>
              <li>Informações falsas ou enganosas fornecidas por outros usuários</li>
              <li>Perdas ou danos resultantes do uso da plataforma</li>
              <li>Interrupções temporárias do serviço</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">8. Modificações</h2>
            <p>
              Reservamo-nos o direito de modificar estes termos a qualquer momento. Alterações significativas serão
              comunicadas aos usuários por email ou através da plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">9. Contato</h2>
            <p>
              Para dúvidas sobre estes Termos de Uso, entre em contato através do email:
              <a href="mailto:contato@connextapp.com.br" className="text-primary hover:underline ml-1">
                contato@connextapp.com.br
              </a>
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-border">
          <Link href="/">
            <Button className="gradient-bg text-primary-foreground">Voltar para Home</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
