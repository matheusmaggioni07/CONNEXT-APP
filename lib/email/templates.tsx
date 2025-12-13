// Connext Email Templates - Templates de email personalizados

const CONNEXT_LOGO = "https://www.connextapp.com.br/logo.png"
const CONNEXT_URL = "https://www.connextapp.com.br"

// Estilos base compartilhados
const baseStyles = `
  body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0a0a0a; }
  .container { max-width: 600px; margin: 0 auto; background: linear-gradient(180deg, #1a1a2e 0%, #0a0a0a 100%); }
  .header { padding: 40px 20px; text-align: center; background: linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%); }
  .logo { font-size: 32px; font-weight: bold; color: white; text-decoration: none; }
  .logo span { color: #fbbf24; }
  .content { padding: 40px 30px; color: #e5e5e5; }
  .title { font-size: 28px; font-weight: bold; color: white; margin-bottom: 20px; text-align: center; }
  .text { font-size: 16px; line-height: 1.6; color: #a1a1aa; margin-bottom: 20px; }
  .button { display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); color: white !important; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 16px; margin: 20px 0; }
  .button:hover { opacity: 0.9; }
  .footer { padding: 30px; text-align: center; border-top: 1px solid #27272a; color: #71717a; font-size: 12px; }
  .social-links { margin: 20px 0; }
  .social-links a { color: #a855f7; text-decoration: none; margin: 0 10px; }
  .highlight { color: #a855f7; font-weight: bold; }
  .card { background: #1f1f23; border-radius: 16px; padding: 24px; margin: 20px 0; border: 1px solid #27272a; }
  .profile-img { width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 3px solid #a855f7; }
  .match-animation { text-align: center; padding: 20px; }
  .hearts { font-size: 48px; margin: 20px 0; }
`

// Template de Confirmação de Email
export function getConfirmationEmailTemplate(params: {
  userName: string
  confirmationUrl: string
}): string {
  const { userName, confirmationUrl } = params

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirme seu email - Connext</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <a href="${CONNEXT_URL}" class="logo">Conn<span>ext</span></a>
      <p style="color: rgba(255,255,255,0.9); margin-top: 10px; font-size: 14px;">
        Conexões Profissionais Inteligentes
      </p>
    </div>
    
    <div class="content">
      <h1 class="title">Bem-vindo ao Connext! 🎉</h1>
      
      <p class="text">
        Olá <span class="highlight">${userName || "profissional"}</span>,
      </p>
      
      <p class="text">
        Estamos muito felizes em ter você conosco! O Connext é a plataforma que conecta 
        profissionais de forma inteligente, ajudando você a encontrar parceiros de negócios, 
        mentores e oportunidades únicas.
      </p>
      
      <div class="card">
        <h3 style="color: white; margin-top: 0;">🚀 O que você pode fazer no Connext:</h3>
        <ul style="color: #a1a1aa; line-height: 2;">
          <li>Descobrir profissionais compatíveis com seu perfil</li>
          <li>Fazer networking através de videochamadas</li>
          <li>Criar sites profissionais com IA</li>
          <li>Expandir sua rede de contatos</li>
        </ul>
      </div>
      
      <p class="text" style="text-align: center;">
        Para começar, confirme seu email clicando no botão abaixo:
      </p>
      
      <div style="text-align: center;">
        <a href="${confirmationUrl}" class="button">
          ✨ Confirmar meu Email
        </a>
      </div>
      
      <p class="text" style="font-size: 14px; color: #71717a; text-align: center; margin-top: 30px;">
        Se o botão não funcionar, copie e cole este link no seu navegador:<br>
        <a href="${confirmationUrl}" style="color: #a855f7; word-break: break-all;">${confirmationUrl}</a>
      </p>
    </div>
    
    <div class="footer">
      <div class="social-links">
        <a href="https://instagram.com/connextapp">Instagram</a>
        <a href="https://linkedin.com/company/connextapp">LinkedIn</a>
        <a href="https://twitter.com/connextapp">Twitter</a>
      </div>
      <p>© ${new Date().getFullYear()} Connext. Todos os direitos reservados.</p>
      <p>Porto Alegre, RS - Brasil</p>
      <p style="margin-top: 15px;">
        <a href="${CONNEXT_URL}/unsubscribe" style="color: #71717a;">Cancelar inscrição</a>
      </p>
    </div>
  </div>
</body>
</html>
`
}

// Template de Novo Match
export function getNewMatchEmailTemplate(params: {
  userName: string
  matchName: string
  matchRole?: string
  matchCompany?: string
  matchAvatar?: string
  matchUrl: string
}): string {
  const { userName, matchName, matchRole, matchCompany, matchAvatar, matchUrl } = params

  const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(matchName)}&background=a855f7&color=fff&size=160`

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Novo Match! - Connext</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <a href="${CONNEXT_URL}" class="logo">Conn<span>ext</span></a>
    </div>
    
    <div class="content">
      <div class="match-animation">
        <div class="hearts">💜✨💜</div>
        <h1 class="title" style="background: linear-gradient(135deg, #a855f7, #ec4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 36px;">
          É um Match!
        </h1>
      </div>
      
      <p class="text" style="text-align: center; font-size: 18px;">
        Parabéns <span class="highlight">${userName}</span>! 🎉
      </p>
      
      <p class="text" style="text-align: center;">
        Você e <span class="highlight">${matchName}</span> se curtiram mutuamente!<br>
        Agora vocês podem iniciar uma conversa e fazer networking.
      </p>
      
      <div class="card" style="text-align: center;">
        <img 
          src="${matchAvatar || defaultAvatar}" 
          alt="${matchName}" 
          class="profile-img"
          style="margin-bottom: 15px;"
        />
        <h3 style="color: white; margin: 10px 0 5px;">${matchName}</h3>
        ${matchRole ? `<p style="color: #a855f7; margin: 5px 0;">${matchRole}</p>` : ""}
        ${matchCompany ? `<p style="color: #71717a; margin: 5px 0;">📍 ${matchCompany}</p>` : ""}
      </div>
      
      <div class="card" style="background: linear-gradient(135deg, rgba(99,102,241,0.1), rgba(168,85,247,0.1)); border-color: #a855f7;">
        <h3 style="color: white; margin-top: 0; text-align: center;">💡 Dicas para iniciar a conversa:</h3>
        <ul style="color: #a1a1aa; line-height: 2;">
          <li>Mencione algo em comum entre vocês</li>
          <li>Pergunte sobre projetos atuais</li>
          <li>Proponha uma videochamada rápida</li>
          <li>Compartilhe uma oportunidade relevante</li>
        </ul>
      </div>
      
      <div style="text-align: center;">
        <a href="${matchUrl}" class="button">
          💬 Ver Match e Conversar
        </a>
      </div>
      
      <p class="text" style="text-align: center; font-size: 14px; color: #71717a; margin-top: 30px;">
        Não perca tempo! As melhores conexões acontecem quando agimos rápido.
      </p>
    </div>
    
    <div class="footer">
      <div class="social-links">
        <a href="https://instagram.com/connextapp">Instagram</a>
        <a href="https://linkedin.com/company/connextapp">LinkedIn</a>
      </div>
      <p>© ${new Date().getFullYear()} Connext. Todos os direitos reservados.</p>
      <p>
        <a href="${CONNEXT_URL}/settings/notifications" style="color: #71717a;">Gerenciar notificações</a>
      </p>
    </div>
  </div>
</body>
</html>
`
}

// Template de Alguém Curtiu Você
export function getSomeoneLikedYouEmailTemplate(params: {
  userName: string
  likerName: string
  likerRole?: string
  likerAvatar?: string
  discoverUrl: string
}): string {
  const { userName, likerName, likerRole, likerAvatar, discoverUrl } = params

  const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(likerName)}&background=ec4899&color=fff&size=160`

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Alguém curtiu você! - Connext</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <a href="${CONNEXT_URL}" class="logo">Conn<span>ext</span></a>
    </div>
    
    <div class="content">
      <h1 class="title">Alguém curtiu você! 💜</h1>
      
      <p class="text" style="text-align: center;">
        Olá <span class="highlight">${userName}</span>!
      </p>
      
      <p class="text" style="text-align: center; font-size: 18px;">
        <span class="highlight">${likerName}</span> demonstrou interesse no seu perfil!
      </p>
      
      <div class="card" style="text-align: center;">
        <img 
          src="${likerAvatar || defaultAvatar}" 
          alt="${likerName}" 
          class="profile-img"
          style="margin-bottom: 15px; filter: blur(8px);"
        />
        <h3 style="color: white; margin: 10px 0 5px;">${likerName}</h3>
        ${likerRole ? `<p style="color: #ec4899; margin: 5px 0;">${likerRole}</p>` : ""}
        <p style="color: #71717a; font-size: 14px; margin-top: 15px;">
          Curta de volta para fazer um match e ver o perfil completo!
        </p>
      </div>
      
      <div style="text-align: center;">
        <a href="${discoverUrl}" class="button" style="background: linear-gradient(135deg, #ec4899 0%, #f43f5e 100%);">
          💜 Ver quem me curtiu
        </a>
      </div>
      
      <p class="text" style="text-align: center; font-size: 14px; color: #71717a; margin-top: 20px;">
        Se vocês se curtirem mutuamente, será um match!
      </p>
    </div>
    
    <div class="footer">
      <p>© ${new Date().getFullYear()} Connext. Todos os direitos reservados.</p>
      <p>
        <a href="${CONNEXT_URL}/settings/notifications" style="color: #71717a;">Cancelar estas notificações</a>
      </p>
    </div>
  </div>
</body>
</html>
`
}

// Template de Boas-vindas (após confirmar email)
export function getWelcomeEmailTemplate(params: {
  userName: string
}): string {
  const { userName } = params

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bem-vindo ao Connext!</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <a href="${CONNEXT_URL}" class="logo">Conn<span>ext</span></a>
      <p style="color: rgba(255,255,255,0.9); margin-top: 10px; font-size: 14px;">
        Sua jornada começa agora! 🚀
      </p>
    </div>
    
    <div class="content">
      <h1 class="title">Email confirmado com sucesso! ✅</h1>
      
      <p class="text" style="text-align: center; font-size: 18px;">
        Olá <span class="highlight">${userName}</span>, seja muito bem-vindo(a)!
      </p>
      
      <p class="text" style="text-align: center;">
        Seu email foi confirmado e sua conta está pronta para uso.
        Agora você tem acesso a todas as funcionalidades do Connext!
      </p>
      
      <div class="card">
        <h3 style="color: white; margin-top: 0; text-align: center;">🎯 Próximos passos:</h3>
        <div style="display: grid; gap: 15px; margin-top: 20px;">
          <div style="display: flex; align-items: center; gap: 15px;">
            <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #6366f1, #a855f7); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">1</div>
            <div>
              <p style="color: white; margin: 0; font-weight: 500;">Complete seu perfil</p>
              <p style="color: #71717a; margin: 5px 0 0; font-size: 14px;">Adicione foto, bio e experiências</p>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 15px;">
            <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #a855f7, #ec4899); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">2</div>
            <div>
              <p style="color: white; margin: 0; font-weight: 500;">Explore profissionais</p>
              <p style="color: #71717a; margin: 5px 0 0; font-size: 14px;">Descubra conexões compatíveis</p>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 15px;">
            <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #ec4899, #f43f5e); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">3</div>
            <div>
              <p style="color: white; margin: 0; font-weight: 500;">Faça conexões</p>
              <p style="color: #71717a; margin: 5px 0 0; font-size: 14px;">Curta perfis e inicie conversas</p>
            </div>
          </div>
        </div>
      </div>
      
      <div style="text-align: center;">
        <a href="${CONNEXT_URL}/dashboard" class="button">
          🚀 Começar a explorar
        </a>
      </div>
    </div>
    
    <div class="footer">
      <div class="social-links">
        <a href="https://instagram.com/connextapp">Instagram</a>
        <a href="https://linkedin.com/company/connextapp">LinkedIn</a>
        <a href="https://twitter.com/connextapp">Twitter</a>
      </div>
      <p>© ${new Date().getFullYear()} Connext. Todos os direitos reservados.</p>
      <p>Porto Alegre, RS - Brasil</p>
    </div>
  </div>
</body>
</html>
`
}

// Template de Reset de Senha
export function getPasswordResetEmailTemplate(params: {
  userName: string
  resetUrl: string
}): string {
  const { userName, resetUrl } = params

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Redefinir senha - Connext</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <a href="${CONNEXT_URL}" class="logo">Conn<span>ext</span></a>
    </div>
    
    <div class="content">
      <h1 class="title">Redefinir sua senha 🔐</h1>
      
      <p class="text">
        Olá <span class="highlight">${userName || "usuário"}</span>,
      </p>
      
      <p class="text">
        Recebemos uma solicitação para redefinir a senha da sua conta no Connext.
        Se você não fez essa solicitação, pode ignorar este email.
      </p>
      
      <div class="card" style="text-align: center; border-color: #f59e0b;">
        <p style="color: #f59e0b; margin: 0;">⚠️ Este link expira em 1 hora</p>
      </div>
      
      <div style="text-align: center;">
        <a href="${resetUrl}" class="button">
          🔐 Redefinir minha senha
        </a>
      </div>
      
      <p class="text" style="font-size: 14px; color: #71717a; text-align: center; margin-top: 30px;">
        Se o botão não funcionar, copie e cole este link no seu navegador:<br>
        <a href="${resetUrl}" style="color: #a855f7; word-break: break-all;">${resetUrl}</a>
      </p>
      
      <div class="card" style="background: rgba(239,68,68,0.1); border-color: #ef4444;">
        <p style="color: #ef4444; margin: 0; font-size: 14px;">
          🛡️ <strong>Dica de segurança:</strong> O Connext nunca pedirá sua senha por email. 
          Se você não solicitou esta redefinição, sua conta pode estar em risco.
        </p>
      </div>
    </div>
    
    <div class="footer">
      <p>© ${new Date().getFullYear()} Connext. Todos os direitos reservados.</p>
      <p>
        Precisa de ajuda? <a href="${CONNEXT_URL}/support" style="color: #a855f7;">Entre em contato</a>
      </p>
    </div>
  </div>
</body>
</html>
`
}
