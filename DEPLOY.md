# NF-e System - Guia de Deploy

## 1. Rodando Localmente (Desenvolvimento)

### Pré-requisitos
- Node.js 20+
- PostgreSQL (local ou remoto)

### Passos
```bash
# Instalar dependências
npm install

# Configurar variável de ambiente do banco
export DATABASE_URL="postgresql://usuario:senha@localhost:5432/nfe_db"

# Criar as tabelas no banco
npm run db:push

# Rodar em modo desenvolvimento
npm run dev
```
O app estará disponível em `http://localhost:5000`

---

## 2. Conectando ao Supabase

### Passo 1 - Criar projeto no Supabase
1. Acesse [supabase.com](https://supabase.com) e crie um projeto
2. Vá em **Settings > Database**
3. Copie a **Connection string** (URI) no formato:
   ```
   postgresql://postgres.[ref]:[senha]@aws-0-[regiao].pooler.supabase.com:6543/postgres
   ```

### Passo 2 - Configurar DATABASE_URL
No Replit, Render, ou localmente, defina a variável:
```bash
export DATABASE_URL="sua_connection_string_do_supabase"
```

### Passo 3 - Criar as tabelas
```bash
npm run db:push
```
Isso criará todas as tabelas no seu banco Supabase automaticamente.

### Observações sobre Supabase
- Sempre defina `DATABASE_SSL=true` ao usar Supabase ou qualquer banco gerenciado na nuvem
- O plano gratuito do Supabase oferece 500MB de armazenamento
- Use a connection string do **Transaction Pooler** (porta 6543) para melhor performance
- A porta padrão do Render é fornecida automaticamente pela variável PORT

---

## 3. Deploy no Render

### Passo 1 - Preparar repositório
Suba o código para um repositório Git (GitHub, GitLab, etc.)

### Passo 2 - Criar Web Service no Render
1. Acesse [render.com](https://render.com) e crie uma conta
2. Clique em **New > Web Service**
3. Conecte seu repositório Git
4. O Render detectará automaticamente o `render.yaml` com as configurações

### Passo 3 - Configurar variáveis de ambiente
No painel do Render, adicione:

| Variável | Valor |
|---|---|
| `DATABASE_URL` | Sua connection string do Supabase |
| `DATABASE_SSL` | `true` |
| `SESSION_SECRET` | (gerado automaticamente) |

### Passo 4 - Deploy
O Render executará automaticamente:
```bash
npm install && npm run build   # Build
npm run start                  # Start (produção)
```

### Plano Gratuito do Render
- O plano gratuito suspende o serviço após 15 min de inatividade
- O primeiro acesso após suspensão leva ~30s para iniciar
- Para manter ativo, considere o plano Starter ($7/mês)

---

## 4. Deploy no Replit

A forma mais simples - clique em **Publish** no Replit e o app estará online com domínio `.replit.app`.

---

## Resumo das Variáveis de Ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | Sim | Connection string PostgreSQL |
| `DATABASE_SSL` | Não | Definir "true" ao usar Supabase, Render ou qualquer banco na nuvem |
| `SESSION_SECRET` | Sim | Chave para sessões (qualquer string aleatória) |
| `PORT` | Não | Porta do servidor (padrão: 5000) |
| `NODE_ENV` | Não | "development" ou "production" |
