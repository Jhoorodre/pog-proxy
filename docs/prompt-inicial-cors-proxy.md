# Prompt-base para iniciar o projeto `facaccimo-cors-proxy`

Use o texto abaixo em um novo ambiente Codex para gerar o projeto do zero.

## Prompt (copiar/colar)

Quero que você crie um projeto novo chamado **facaccimo-cors-proxy** para servir como **CORS proxy** compatível com **isomorphic-git**.

### Objetivo
Criar um serviço Node.js simples e confiável para uso com:

- `https://jhoorodre.github.io/facaccimo/`
- endpoint proxy no formato: `https://MEU_PROXY/https://github.com/...`

### Requisitos técnicos

#### Stack
- Node.js 20
- pacote `@isomorphic-git/cors-proxy`

#### Serviço HTTP
- rota principal de proxy (`/https://...`)
- rota de saúde `GET /healthz` retornando `200` + JSON `{ ok: true }`

#### Configuração por variáveis de ambiente
- `PORT` (default `3000`)
- `ALLOW_ORIGIN` (default `https://jhoorodre.github.io`)

#### CORS
- permitir apenas `ALLOW_ORIGIN` (não usar `*` em produção)

#### Operação
- logging básico de requests (método, path, status, duração)
- projeto pronto para deploy

### Entregáveis de código
Crie todos os arquivos necessários:

- `package.json`
- `server.js` (ou `src/server.js`)
- `README.md` com instruções de deploy e teste
- `Procfile` (para Heroku)
- `netlify.toml` + função serverless (apenas se realmente viável para proxy contínuo)
- `.env.example`
- `.gitignore`

### Scripts npm
- `npm run dev`
- `npm start`

### Deploy alvo

#### A) Heroku
- preparar para deploy via Git push Heroku
- incluir instruções completas no README

#### B) Netlify
- avaliar viabilidade real para proxy (serverless pode não ser ideal por latência/limites)
- se não for ideal, documentar claramente e sugerir alternativa (`Render`, `Railway` ou `Fly.io`)

### Testes obrigatórios (executar)
1. subir local (`npm install` + `npm run dev`)
2. testar:
   - `GET /healthz`
   - `GET /https://github.com/`
3. mostrar comandos e saídas dos testes
4. só finalizar quando os testes passarem

### Integração com facaccimo
No README final, incluir seção:

- como configurar no app via query param:
  - `https://jhoorodre.github.io/facaccimo/?proxy=https://SEU_PROXY`
- ou usando popup “Configurar proxy”
- como validar que o proxy está funcionando (sem “Failed to fetch”)

### Qualidade
- código enxuto, sem dependências desnecessárias
- comentários curtos em pontos críticos
- README objetivo e em português

### Regra de estabilidade
Se Netlify Functions apresentar limitações (stream, timeout, CORS, cold start), migrar para deploy com processo Node contínuo (Render/Railway/Fly.io), mantendo a API e o comportamento do proxy.
