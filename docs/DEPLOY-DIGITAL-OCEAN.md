# Guia de Deploy — Sistema Infra na Digital Ocean
## Tudo no mesmo servidor (Droplet + PostgreSQL local)

Passo a passo para colocar o sistema online com **banco PostgreSQL instalado no próprio Droplet** (sem Managed Database).

Tempo estimado: 40–60 minutos  
Custo aproximado: **US$ 6–12/mês** (só o Droplet)

---

## O que vamos montar

| Peça | Função |
|------|--------|
| **Droplet Ubuntu** | Site + API Node + PostgreSQL |
| **PostgreSQL no servidor** | Pedidos, finalizados e usuários |
| **Nginx** | Acesso pelo IP/domínio |
| **PM2** | Mantém o app sempre ligado |
| **Backup diário (pg_dump)** | Evita perder dados |

> Tudo fica **dentro do mesmo servidor**. Mais barato e mais simples de começar.

---

## Checklist

- [ ] Conta na [Digital Ocean](https://cloud.digitalocean.com)
- [ ] Repositório: `joaoschnitzspahn-dev/demojr`
- [ ] (Opcional) Domínio

---

## PASSO 1 — Criar o Droplet

1. **Create** → **Droplets**
2. Configuração sugerida:
   - Image: **Ubuntu 24.04 LTS**
   - Plan: **Basic → $6** (1 GB) ou **$12** (2 GB, melhor)
   - Região: São Paulo / NYC (a que preferir)
   - Auth: SSH Key (recomendado) ou senha
3. Hostname: `sistema-infra`
4. Create Droplet → anote o **IP**

---

## PASSO 2 — Conectar no servidor

No PowerShell:

```bash
ssh root@SEU_IP_AQUI
```

---

## PASSO 3 — Instalar Node, Nginx, PM2 e PostgreSQL

Cole tudo de uma vez:

```bash
apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs nginx git postgresql postgresql-contrib
npm install -g pm2
node -v
psql --version
```

Suba o Postgres:

```bash
systemctl enable postgresql
systemctl start postgresql
systemctl status postgresql --no-pager
```

---

## PASSO 4 — Criar banco e usuário no PostgreSQL

Entre como usuário postgres:

```bash
sudo -u postgres psql
```

Dentro do `psql`, cole (troque a senha se quiser):

```sql
CREATE USER infra WITH PASSWORD 'InfraDb#2026Troque';
CREATE DATABASE sistema_infra OWNER infra;
GRANT ALL PRIVILEGES ON DATABASE sistema_infra TO infra;
\q
```

No PostgreSQL 15+, ainda rode:

```bash
sudo -u postgres psql -d sistema_infra -c "GRANT ALL ON SCHEMA public TO infra;"
```

Connection string local (vai no `.env`):

```text
postgresql://infra:InfraDb#2026Troque@127.0.0.1:5432/sistema_infra
```

> Se a senha tiver `#` ou caracteres especiais, no `.env` use aspas ou troque por uma senha só com letras/números, ex.: `InfraDb2026Segura`.

Senha mais simples (recomendado para evitar dor de cabeça):

```bash
sudo -u postgres psql -c "ALTER USER infra WITH PASSWORD 'InfraDb2026Segura';"
```

URI final:

```text
postgresql://infra:InfraDb2026Segura@127.0.0.1:5432/sistema_infra
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

## PASSO 6 — Arquivo `.env`

```bash
nano /var/www/sistema-infra/.env
```

Cole:

```env
PORT=3001
NODE_ENV=production
ADMIN_LOGIN=adm
ADMIN_PASSWORD=adm123
DATABASE_URL=postgresql://infra:InfraDb2026Segura@127.0.0.1:5432/sistema_infra
PGSSL=false
```

Salve: `Ctrl+O` → Enter → `Ctrl+X`

> `PGSSL=false` porque o banco está **no mesmo servidor** (localhost).

---

## PASSO 7 — Build e subir o app

```bash
cd /var/www/sistema-infra
npm run build
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

Teste:

```bash
curl http://127.0.0.1:3001/api/health
```

Deve aparecer algo como:

```json
{
  "ok": true,
  "database": { "mode": "postgres", "connected": true }
}
```

Se `connected: true` → banco OK.

Ver logs se der erro:

```bash
pm2 logs sistema-infra
```

---

## PASSO 8 — Nginx (liberar na internet)

```bash
nano /etc/nginx/sites-available/sistema-infra
```

Cole (troque `SEU_IP_OU_DOMINIO`):

```nginx
server {
    listen 80;
    server_name SEU_IP_OU_DOMINIO;

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

Firewall:

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
```

Abra no navegador: `http://SEU_IP`

Logins:
- Admin: `adm` / `adm123`
- Operador: `infra` / `infra123`

---

## PASSO 9 — Backup diário (importante)

Como o banco está no Droplet, configure backup automático:

```bash
mkdir -p /var/backups/sistema-infra
nano /usr/local/bin/backup-sistema-infra.sh
```

Cole:

```bash
#!/bin/bash
set -e
DIR=/var/backups/sistema-infra
STAMP=$(date +%Y%m%d-%H%M%S)
FILE="$DIR/sistema_infra-$STAMP.sql.gz"
export PGPASSWORD='InfraDb2026Segura'
pg_dump -U infra -h 127.0.0.1 sistema_infra | gzip > "$FILE"
find "$DIR" -type f -name '*.sql.gz' -mtime +14 -delete
echo "Backup OK: $FILE"
```

Permissão + agendar todo dia às 3h:

```bash
chmod +x /usr/local/bin/backup-sistema-infra.sh
crontab -e
```

Adicione a linha:

```cron
0 3 * * * /usr/local/bin/backup-sistema-infra.sh >> /var/log/backup-sistema-infra.log 2>&1
```

Teste agora:

```bash
/usr/local/bin/backup-sistema-infra.sh
ls -lh /var/backups/sistema-infra
```

> Dica extra: baixe periodicamente esses `.sql.gz` para o seu PC (ou Google Drive).

---

## PASSO 10 — Atualizar o sistema depois

```bash
cd /var/www/sistema-infra
git pull origin main
npm install
npm run build
pm2 restart sistema-infra
```

---

## HTTPS (se tiver domínio)

1. Aponte o domínio (registro A) para o IP do Droplet  
2. No servidor:

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d seudominio.com
```

---

## O que fica salvo no PostgreSQL

| Tabela | Conteúdo |
|--------|----------|
| `orders` | Todos os pedidos (em andamento + finalizados) |
| `finished_orders` | Arquivo de finalizados |
| `users` | Admin, infra e operadores |

Penha e Argentina usam o **mesmo servidor** → mesmos dados.

---

## Problemas comuns

### `connected: false`
```bash
sudo systemctl status postgresql
sudo -u postgres psql -c "\l"
cat /var/www/sistema-infra/.env
pm2 logs sistema-infra --lines 50
```

### Site não abre
```bash
systemctl status nginx
pm2 status
ufw status
```

### Esqueci a senha do banco
```bash
sudo -u postgres psql -c "ALTER USER infra WITH PASSWORD 'NovaSenha123';"
```
Depois atualize o `.env` e rode `pm2 restart sistema-infra`.

---

## Custo

| Item | ~Valor |
|------|--------|
| Droplet 1–2 GB | US$ 6–12/mês |
| Managed Database | **não usa** |
| **Total** | **~US$ 6–12/mês** |

---

## Resumo rápido

1. Criar Droplet Ubuntu  
2. Instalar Node + Nginx + PM2 + PostgreSQL  
3. Criar usuário/banco `sistema_infra`  
4. Clonar repo + `.env` com `DATABASE_URL` localhost  
5. `npm run build` + `pm2 start`  
6. Nginx na porta 80 → 3001  
7. Backup diário com `pg_dump`

Quando tiver o IP do Droplet, me manda que a gente valida o `/api/health` juntos.
