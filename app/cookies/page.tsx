export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-primary to-pink-500 bg-clip-text text-transparent">
          Política de Cookies
        </h1>
        <p className="text-muted-foreground mb-6">Última atualização: 30 de novembro de 2025</p>

        <div className="prose prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">1. O que são Cookies?</h2>
            <p className="text-muted-foreground leading-relaxed">
              Cookies são pequenos arquivos de texto armazenados no seu dispositivo (computador, tablet ou celular)
              quando você visita um site. Eles são amplamente utilizados para fazer os sites funcionarem de forma mais
              eficiente e fornecer informações aos proprietários do site.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">2. Como Usamos Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">O Connext App utiliza cookies para:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-2">
              <li>Manter você conectado à sua conta</li>
              <li>Lembrar suas preferências</li>
              <li>Entender como você usa nosso serviço</li>
              <li>Melhorar sua experiência de navegação</li>
              <li>Garantir a segurança da sua conta</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">3. Tipos de Cookies que Usamos</h2>

            <h3 className="text-xl font-medium text-foreground mb-2">3.1 Cookies Essenciais</h3>
            <p className="text-muted-foreground leading-relaxed">
              Necessários para o funcionamento do site. Incluem cookies de autenticação e segurança. Sem eles, o site
              não funcionaria corretamente.
            </p>

            <h3 className="text-xl font-medium text-foreground mb-2 mt-4">3.2 Cookies de Desempenho</h3>
            <p className="text-muted-foreground leading-relaxed">
              Coletam informações sobre como você usa o site (páginas visitadas, erros encontrados). Usamos esses dados
              para melhorar o funcionamento do site.
            </p>

            <h3 className="text-xl font-medium text-foreground mb-2 mt-4">3.3 Cookies de Funcionalidade</h3>
            <p className="text-muted-foreground leading-relaxed">
              Permitem que o site lembre suas escolhas (como idioma ou região) e forneça recursos personalizados.
            </p>

            <h3 className="text-xl font-medium text-foreground mb-2 mt-4">3.4 Cookies de Análise</h3>
            <p className="text-muted-foreground leading-relaxed">
              Utilizamos ferramentas de análise para entender como os visitantes interagem com nosso site, ajudando-nos
              a melhorar continuamente.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">4. Cookies de Terceiros</h2>
            <p className="text-muted-foreground leading-relaxed">
              Alguns cookies são colocados por serviços de terceiros que aparecem em nossas páginas:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-2">
              <li>
                <strong>Supabase:</strong> Autenticação e banco de dados
              </li>
              <li>
                <strong>Vercel:</strong> Hospedagem e análise de desempenho
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">5. Gerenciando Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              Você pode controlar e/ou excluir cookies conforme desejar. A maioria dos navegadores permite:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-2">
              <li>Ver quais cookies estão armazenados e excluí-los individualmente</li>
              <li>Bloquear cookies de terceiros</li>
              <li>Bloquear todos os cookies de sites específicos</li>
              <li>Bloquear todos os cookies</li>
              <li>Excluir todos os cookies ao fechar o navegador</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              <strong>Atenção:</strong> Se você bloquear os cookies essenciais, algumas funcionalidades do Connext App
              podem não funcionar corretamente.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">6. Como Gerenciar nos Navegadores</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>
                <strong>Chrome:</strong> Configurações → Privacidade e segurança → Cookies
              </li>
              <li>
                <strong>Firefox:</strong> Opções → Privacidade e Segurança → Cookies
              </li>
              <li>
                <strong>Safari:</strong> Preferências → Privacidade → Cookies
              </li>
              <li>
                <strong>Edge:</strong> Configurações → Cookies e permissões do site
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">7. Atualizações desta Política</h2>
            <p className="text-muted-foreground leading-relaxed">
              Podemos atualizar esta Política de Cookies periodicamente. Quaisquer alterações serão publicadas nesta
              página com a data de atualização revisada.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">8. Contato</h2>
            <p className="text-muted-foreground leading-relaxed">
              Se você tiver dúvidas sobre nossa Política de Cookies, entre em contato:
              <br />
              Email: contato@connextapp.com.br
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-border">
          <a href="/" className="text-primary hover:underline">
            ← Voltar para a página inicial
          </a>
        </div>
      </div>
    </div>
  )
}
