# Guia de Deploy — Sistema Infra na Digital Ocean

Passo a passo para colocar o sistema **online de verdade**, com **PostgreSQL gerenciado** (backup automático) para **não perder dados**.

Tempo estimado: 40–60 minutos  
Custo aproximado: **US$ 12–24/mês**

---

## O que vamos montar

| Peça | Função |
|------|--------|
| **Droplet** (servidor Ubuntu) | Roda o site + API Node |
| **Managed PostgreSQL** | Banco permanente (pedidos, finalizados, usuários) |
| **Nginx** | Domínio + HTTPS (opcional, recomendado) |
| **PM2** | Mantém o app sempre ligado |

### Por que PostgreSQL Managed?

- Dados **fora** do Droplet → se o servidor reiniciar ou for recriado, o banco continua
- **Backup diário automático** da Digital Ocean
- Ideal para Penha, Argentina ou qualquer lugar: todos usam o **mesmo banco**

---

## Checklist antes de começar

- [ ] Conta na [Digital Ocean](https://cloud.digitalocean.com)
- [ ] Cartão cadastrado
- [ ] Repositório no GitHub: `joaoschnitzspahn-dev/demojr`
- [ ] (Opcional) Domínio próprio apontando para a DO

---

## PASSO 1 — Criar o banco PostgreSQL (Managed Database)

1. No painel Digital Ocean → **Databases** → **Create Database**
2. Escolha:
   - Engine: **PostgreSQL 16** (ou 15)
   - Plano: **Basic** (menor) já serve para começar
   - Região: a **mesma** do Droplet (ex.: São Paulo / NYC)
3. Clique em **Create Database Cluster**
4. Aguarde ficar **Online** (pode levar alguns minutos)
5. Em **Users & Databases**, anote:
   - User: normalmente `doadmin`
   - Password
   - Host
   - Port: normalmente `25060`
   - Database: `defaultdb`
6. Em **Connection Details** → copie a **Connection string** (URI)

Exemplo:

```text
postgresql://doadmin:SENHA@db-xxxxx-do-user-xxxxx-0.g.db.ondigitalocean.com:25060/defaultdb?sslmode=require
```

7. Em **Trusted Sources**, depois de criar o Droplet, adicione o Droplet (ou temporariamente “Allow all” só para testar — depois restrinja).

> Guarde essa connection string: ela vai no arquivo `.env` do servidor.

---

## PASSO 2 — Criar o Droplet (servidor)

1. **Create** → **Droplets**
2. Configuração sugerida:
   - Image: **Ubuntu 24.04 LTS**
   - Plan: **Basic → Regular → $6/mês** (1 GB) ou **$12** (2 GB, mais folgado)
   - Datacenter: **mesma região do banco**
   - Authentication: **SSH Key** (recomendado) ou senha
3. Hostname: `sistema-infra`
4. Create Droplet
5. Anote o **IP público** (ex.: `167.99.xx.xx`)

---

## PASSO 3 — Conectar no servidor

No PowerShell (Windows):

```bash
ssh root@SEU_IP_AQUI
```

---

## PASSO 4 — Instalar Node.js, Nginx e PM2

Cole no servidor (tudo de uma vez):

```bash
apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs nginx git
npm install -g pm2
node -v
npm -v
```

---

## PASSO 5 — Clonar o projeto

```bash
mkdir -p /var/www
cd /var/www
git clone https://github.com/joaoschnitzspahn-dev/demojr.git sistema-infra
cd sistema-infra
npm install
```

---

## PASSO 6 — Configurar o banco (`.env`)

```bash
nano /var/www/sistema-infra/.env
```

Cole (troque pelos seus dados):

```env
PORT=3001
NODE_ENV=production
ADMIN_LOGIN=adm
ADMIN_PASSWORD=adm123
DATABASE_URL=postgresql://doadmin:SENHA@HOST:25060/defaultdb?sslmode=require
PGSSL=true
```

Salve: `Ctrl+O` → Enter → `Ctrl+X`

> Se o banco Managed exigir SSL (Digital Ocean exige), mantenha `sslmode=require` e `PGSSL=true`.

No painel do Database → **Trusted Sources** → adicione o Droplet.

---

## PASSO 7 — Build e subir a aplicação

```bash
cd /var/www/sistema-infra
npm run build
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

Teste a API:

```bash
curl http://127.0.0.1:3001/api/health
```

Você deve ver algo como:

```json
{
  "ok": true,
  "database": { "mode": "postgres", "connected": true }
}
```

Se `connected: true` → banco OK.  
Se der erro, confira `DATABASE_URL` e Trusted Sources.

---

## PASSO 8 — Nginx (site público)

```bash
nano /etc/nginx/sites-available/sistema-infra
```

Cole:

```nginx
server {
    listen 80;
    server_name SEU_DOMINIO_OU_IP;

    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Ative:

```bash
ln -s /etc/nginx/sites-available/sistema-infra /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
```

Abra no navegador: `http://SEU_IP`

Login:
- Admin: `adm` / `adm123`
- Operador: `infra` / `infra123`

---

## PASSO 9 — HTTPS (recomendado, se tiver domínio)

1. No registro do domínio, crie um **A record**:
   - Host: `@` (ou `app`)
   - Value: IP do Droplet
2. No servidor:

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d seudominio.com
```

Siga o assistente. Renovação automática já fica configurada.

---

## PASSO 10 — Atualizar o sistema no futuro

Sempre que subir alteração no GitHub:

```bash
cd /var/www/sistema-infra
git pull origin main
npm install
npm run build
pm2 restart sistema-infra
```

---

## O que fica salvo no PostgreSQL (não perde)

| Tabela | Conteúdo |
|--------|----------|
| `orders` | **Todos** os pedidos (em andamento + finalizados) |
| `finished_orders` | Arquivo de finalizados |
| `users` | Admin, infra e operadores criados |

Assim:
- Penha e Argentina veem os **mesmos dados**
- Reiniciar Droplet **não apaga** o banco
- Managed Database tem **backup diário** da Digital Ocean

---

## Firewall (segurança básica)

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
ufw status
```

---

## Problemas comuns

### `database.connected: false`
- `DATABASE_URL` errada
- Droplet não está em Trusted Sources do banco
- Senha com caracteres especiais: use a URI copiada do painel

### Site não abre
- Nginx: `systemctl status nginx`
- App: `pm2 logs sistema-infra`
- Porta 80 liberada no firewall

### Login de operador não funciona
- Confirme login em minúsculas (`infra`)
- Rode `curl http://127.0.0.1:3001/api/users` e veja se o usuário está no banco

### Depois do deploy, pedidos antigos do navegador
- Na primeira sincronização, o sistema envia o que está no navegador para o PostgreSQL
- Prefira começar “zerado” em produção e criar pedidos novos já no servidor online

---

## Custos estimados (USD/mês)

| Item | Plano | ~Custo |
|------|-------|--------|
| Droplet | Basic 1GB | $6 |
| Managed PostgreSQL | Basic | $15 |
| Domínio | opcional | variável |
| **Total** | | **~$21** |

Dá para começar só com Droplet + PostgreSQL instalado no próprio Droplet (mais barato, ~$6–12), mas **Managed Database** é o que garante “não perde nunca” com backup oficial.

---

## Contatos de acesso após o ar

Envie ao cliente:

- URL do sistema  
- Admin: `adm` / `adm123` *(troque a senha depois)*  
- Operador: `infra` / `infra123`  
- Manual PDF: `docs/Manual-Sistema-Infra.pdf`

---

## Resumo rápido (cola mental)

1. Criar **Managed PostgreSQL**  
2. Criar **Droplet Ubuntu**  
3. Instalar Node + Nginx + PM2  
4. Clonar repo + `.env` com `DATABASE_URL`  
5. `npm run build` + `pm2 start`  
6. Nginx apontando para porta 3001  
7. (Opcional) Certbot HTTPS  

Quando estiver com o Droplet e o banco criados, me manda o IP (sem senhas) que eu te ajudo a validar o `curl /api/health` juntos.
