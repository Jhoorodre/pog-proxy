# facaccimo-cors-proxy

Proxy CORS em Node.js para uso com `isomorphic-git` no app facaccimo.

## Requisitos
- Node.js 20+
- npm

## Variáveis de ambiente
Copie o `.env.example` e ajuste se necessário.

- `PORT`: porta HTTP do serviço (padrão `3000`)
- `ALLOW_ORIGIN`: origem autorizada para CORS (padrão `https://jhoorodre.github.io`)

## Rodando local
```bash
npm install
npm run dev
```

## Testes rápidos
### Healthcheck
```bash
curl -i http://localhost:3000/healthz
```

Resposta esperada: status `200` com `{"ok":true}`.

### Proxy para GitHub
```bash
curl -i http://localhost:3000/https://github.com/
```

Resposta esperada: status `200` (ou redirect HTTP do destino), sem erro de CORS quando usado pela origem permitida.

## Deploy

### Heroku (recomendado)
1. Crie o app:
   ```bash
   heroku create SEU_APP
   ```
2. Configure variáveis:
   ```bash
   heroku config:set ALLOW_ORIGIN=https://jhoorodre.github.io
   ```
3. Faça deploy:
   ```bash
   git push heroku main
   ```
4. Verifique:
   ```bash
   heroku open
   curl -i https://SEU_APP.herokuapp.com/healthz
   ```

> Este repositório inclui `Procfile` pronto para Heroku.

### Netlify
Netlify Functions **não é o cenário ideal** para proxy HTTP contínuo (streaming, timeouts e cold start podem impactar Git operations). Para produção, prefira runtime Node contínuo em:
- Render
- Railway
- Fly.io

## Integração com facaccimo
No app, configure o proxy assim:

- via query param:
  - `https://jhoorodre.github.io/facaccimo/?proxy=https://SEU_PROXY`
- ou no popup “Configurar proxy”.

### Como validar
1. Abra o app com o `?proxy=` apontando para seu deploy.
2. Execute uma ação de Git no facaccimo.
3. Confirme que não aparece `Failed to fetch`.
4. Confira logs do proxy para requests retornando 2xx/3xx.
