# Sistema Infra

Workflow operacional de pedidos — React + API Node com banco central para pedidos finalizados.

## Login demo

- **Admin:** `adm` / `adm123`

## Desenvolvimento local

Terminal 1 — frontend:

```bash
npm install
npm run dev
```

Terminal 2 — API + banco:

```bash
npm run server
```

Ou os dois juntos:

```bash
npm run dev:all
```

- Frontend: http://localhost:5173
- API: http://localhost:3001/api/health
- Banco: `data/finished-orders.json` (criado automaticamente)

## Pedidos finalizados (banco central)

Pedidos em andamento ficam no navegador (localStorage). Quando o pós-venda é concluído, o pedido é **salvo automaticamente no servidor**.

Assim, ao abrir o sistema de Penha, Argentina ou qualquer lugar apontando para o mesmo servidor Digital Ocean, a lista de **Pedidos Finalizados** será idêntica.

- **Admin** pode excluir pedidos finalizados (remove do banco central)
- Botão **Atualizar do servidor** sincroniza manualmente

## Variáveis de ambiente

Copie `.env.example` para `.env`:

```bash
cp .env.example .env
```

| Variável | Descrição |
|----------|-----------|
| `PORT` | Porta da API (padrão 3001) |
| `ADMIN_LOGIN` | Login do admin para exclusão |
| `ADMIN_PASSWORD` | Senha do admin para exclusão |
| `API_KEY` | Chave opcional para proteger a API |
| `DATABASE_PATH` | Caminho do arquivo JSON do banco |
| `VITE_API_URL` | URL da API no frontend (padrão `/api`) |
| `VITE_API_KEY` | Mesma chave do `API_KEY`, se configurada |

## Build e produção

```bash
npm run build
npm start
```

Em produção, o Node serve o frontend (`dist/`) e a API na mesma porta.

## Deploy na Digital Ocean

1. Crie um **Droplet** (Ubuntu) ou use **App Platform**
2. Instale Node.js 20+
3. Clone o repositório e rode:

```bash
npm install
npm run build
NODE_ENV=production PORT=3001 npm start
```

4. **Importante:** monte um volume persistente em `/app/data` (ou defina `DATABASE_PATH`) para o arquivo do banco não ser perdido ao reiniciar
5. Aponte o domínio para a porta do servidor (Nginx reverse proxy recomendado)
6. (Opcional) Configure `API_KEY` e `VITE_API_KEY` iguais no build

### Nginx (exemplo)

```nginx
server {
    listen 80;
    server_name seu-dominio.com;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Deploy (Vercel — só frontend)

Se usar Vercel apenas para o frontend, configure `VITE_API_URL` apontando para sua API na Digital Ocean. O banco central precisa estar no servidor Node, não na Vercel.
