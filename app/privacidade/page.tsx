export default function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-primary to-[#ff6b35] bg-clip-text text-transparent">
          Política de Privacidade
        </h1>
        <p className="text-muted-foreground mb-6">Última atualização: 30 de novembro de 2025</p>

        <div className="prose prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">1. Introdução</h2>
            <p className="text-muted-foreground leading-relaxed">
              O Connext App ("nós", "nosso" ou "Connext") está comprometido em proteger sua privacidade. Esta Política
              de Privacidade explica como coletamos, usamos, divulgamos e protegemos suas informações pessoais em
              conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">2. Informações que Coletamos</h2>
            <h3 className="text-xl font-medium text-foreground mb-2">2.1 Informações fornecidas por você:</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Nome completo</li>
              <li>Endereço de email</li>
              <li>Número de telefone/WhatsApp</li>
              <li>Foto de perfil</li>
              <li>Informações profissionais (empresa, cargo, indústria)</li>
              <li>Interesses e áreas de atuação</li>
              <li>Cidade/localização</li>
            </ul>

            <h3 className="text-xl font-medium text-foreground mb-2 mt-4">
              2.2 Informações coletadas automaticamente:
            </h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Endereço IP</li>
              <li>Tipo de navegador e dispositivo</li>
              <li>Páginas visitadas e tempo de permanência</li>
              <li>Data e hora de acesso</li>
              <li>Dados de uso do aplicativo</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">3. Como Usamos suas Informações</h2>
            <p className="text-muted-foreground leading-relaxed">Utilizamos suas informações para:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-2">
              <li>Criar e gerenciar sua conta</li>
              <li>Conectá-lo com outros profissionais compatíveis</li>
              <li>Facilitar videochamadas e networking</li>
              <li>Enviar notificações sobre matches e atividades</li>
              <li>Melhorar nossos serviços e experiência do usuário</li>
              <li>Cumprir obrigações legais</li>
              <li>Prevenir fraudes e abusos</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">4. Compartilhamento de Dados</h2>
            <p className="text-muted-foreground leading-relaxed">Suas informações podem ser compartilhadas com:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-2">
              <li>
                <strong>Outros usuários:</strong> Informações do perfil visíveis para matches
              </li>
              <li>
                <strong>Prestadores de serviço:</strong> Empresas que nos ajudam a operar o serviço (hospedagem,
                analytics)
              </li>
              <li>
                <strong>Autoridades legais:</strong> Quando exigido por lei ou ordem judicial
              </li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              <strong>Nunca vendemos suas informações pessoais a terceiros.</strong>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">5. Seus Direitos (LGPD)</h2>
            <p className="text-muted-foreground leading-relaxed">De acordo com a LGPD, você tem direito a:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-2">
              <li>
                <strong>Confirmação:</strong> Saber se tratamos seus dados
              </li>
              <li>
                <strong>Acesso:</strong> Obter cópia dos seus dados
              </li>
              <li>
                <strong>Correção:</strong> Corrigir dados incompletos ou incorretos
              </li>
              <li>
                <strong>Anonimização:</strong> Solicitar anonimização de dados desnecessários
              </li>
              <li>
                <strong>Portabilidade:</strong> Transferir seus dados para outro serviço
              </li>
              <li>
                <strong>Eliminação:</strong> Solicitar exclusão dos seus dados
              </li>
              <li>
                <strong>Revogação:</strong> Revogar o consentimento a qualquer momento
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">6. Segurança dos Dados</h2>
            <p className="text-muted-foreground leading-relaxed">
              Implementamos medidas de segurança técnicas e organizacionais para proteger seus dados, incluindo:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-2">
              <li>Criptografia de dados em trânsito (HTTPS/TLS)</li>
              <li>Criptografia de dados em repouso</li>
              <li>Controle de acesso restrito</li>
              <li>Monitoramento de segurança contínuo</li>
              <li>Backups regulares</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">7. Retenção de Dados</h2>
            <p className="text-muted-foreground leading-relaxed">
              Mantemos seus dados enquanto sua conta estiver ativa ou conforme necessário para fornecer nossos serviços.
              Após a exclusão da conta, seus dados serão removidos em até 30 dias, exceto quando a retenção for
              necessária para cumprir obrigações legais.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">8. Transferência Internacional</h2>
            <p className="text-muted-foreground leading-relaxed">
              Seus dados podem ser processados em servidores localizados fora do Brasil. Quando isso ocorrer, garantimos
              que as transferências sejam realizadas em conformidade com a LGPD, utilizando salvaguardas apropriadas.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">9. Menores de Idade</h2>
            <p className="text-muted-foreground leading-relaxed">
              O Connext App não é destinado a menores de 18 anos. Não coletamos intencionalmente informações de menores.
              Se tomarmos conhecimento de que coletamos dados de um menor, excluiremos essas informações imediatamente.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">10. Alterações nesta Política</h2>
            <p className="text-muted-foreground leading-relaxed">
              Podemos atualizar esta Política periodicamente. Notificaremos sobre alterações significativas por email ou
              através do aplicativo. Recomendamos revisar esta página regularmente.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">11. Contato do Encarregado (DPO)</h2>
            <p className="text-muted-foreground leading-relaxed">
              Para exercer seus direitos ou esclarecer dúvidas sobre privacidade, entre em contato:
              <br />
              Email: privacidade@connextapp.com.br
              <br />
              Desenvolvido por: Matheus Maggioni
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
