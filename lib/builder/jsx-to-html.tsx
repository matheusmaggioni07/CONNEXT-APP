/**
 * Converts JSX/React code to valid HTML string for iframe rendering
 * Handles className to class conversion and removes React-specific syntax
 */
export function jsxToHTML(jsxCode: string): string {
  if (!jsxCode || typeof jsxCode !== "string") {
    return getErrorHTML("Código inválido")
  }

  try {
    // Extract the JSX content from the return statement
    const returnMatch = jsxCode.match(/return\s*$$\s?([\s\S]*?)\s?$$;?\s*}\s*$|return\s+([\s\S]*?)\s*}\s*$/m)

    if (!returnMatch) {
      return getErrorHTML("Código JSX não encontrado no componente")
    }

    let jsxContent = (returnMatch[1] || returnMatch[2] || "").trim()

    // Remove outer parentheses if present
    if (jsxContent.startsWith("(") && jsxContent.endsWith(")")) {
      jsxContent = jsxContent.slice(1, -1).trim()
    }

    // Safety: Remove JavaScript expressions and event handlers
    jsxContent = jsxContent
      .replace(/onClick\s*=\s*{[^}]*}/g, "") // Remove onClick handlers
      .replace(/onChange\s*=\s*{[^}]*}/g, "") // Remove onChange handlers
      .replace(/onSubmit\s*=\s*{[^}]*}/g, "") // Remove onSubmit handlers
      .replace(/\{[^}]*\}/g, (match) => {
        // Keep simple expressions like {icon}, but remove complex logic
        if (match.match(/^\{[a-zA-Z0-9_]+\}$/)) {
          return "" // Remove component/icon references
        }
        return match
      })

    // Convert React/JSX syntax to HTML
    let html = jsxContent
      .replace(/className=/g, "class=")
      .replace(/htmlFor=/g, "for=")
      .replace(/self-closing\s+/g, "")
      .replace(/<Fragment>|<>/g, "")
      .replace(/<\/Fragment>|<\/>/g, "")

    // Remove empty style attributes
    html = html.replace(/style=""/g, "").replace(/style=''/g, "")

    // Create valid HTML document with CSS isolation
    const finalHTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    html, body {
      width: 100%;
      height: 100%;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.5;
      background: #0a0e27;
      color: #ffffff;
    }
    #root {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      width: 100%;
    }
    img { max-width: 100%; height: auto; }
    button, a { cursor: pointer; }
    button:hover { opacity: 0.9; }
    input, textarea, select {
      font-family: inherit;
      font-size: inherit;
    }
    @supports (backdrop-filter: blur(1px)) {
      .backdrop-blur-xl { backdrop-filter: blur(1.25rem); }
    }
  </style>
</head>
<body>
  <div id="root">
    ${html}
  </div>
  <script>
    // Prevent external navigation for security
    document.querySelectorAll('a[href*="://"]').forEach(a => {
      a.target = '_blank'
      a.rel = 'noopener noreferrer'
    })
    
    // Handle form submissions
    document.querySelectorAll('form').forEach(form => {
      form.addEventListener('submit', function(e) {
        e.preventDefault()
        const inputs = this.querySelectorAll('input, textarea')
        inputs.forEach(input => input.value = '')
        alert('Formulário enviado com sucesso!')
      })
    })
    
    // Handle button clicks
    document.querySelectorAll('button').forEach(btn => {
      if (!btn.onclick) {
        btn.addEventListener('click', function(e) {
          if (this.type === 'submit') return
          e.preventDefault()
          this.style.opacity = '0.8'
          setTimeout(() => this.style.opacity = '1', 100)
        })
      }
    })
  </script>
</body>
</html>`

    return finalHTML
  } catch (error) {
    console.error("[JSX to HTML]", error)
    return getErrorHTML("Erro ao processar código JSX")
  }
}

function getErrorHTML(message: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      margin: 0;
      padding: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      font-family: system-ui, sans-serif;
      color: white;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .error {
      background: rgba(0,0,0,0.3);
      padding: 40px;
      border-radius: 16px;
      text-align: center;
      backdrop-filter: blur(10px);
    }
    h2 { margin: 0 0 10px 0; }
  </style>
</head>
<body>
  <div class="error">
    <h2>Preview</h2>
    <p>${message}</p>
  </div>
</body>
</html>`
}
