# 📋 Guia de Instalação - AgendAI

Guia completo para rodar o AgendAI em outro computador.

---

## 📦 Pré-requisitos

Antes de começar, certifique-se de ter instalado:

1. **Python 3.8+** - [Download](https://www.python.org/downloads/)
2. **Node.js 16+** e **Yarn** - [Download Node.js](https://nodejs.org/)
3. **MongoDB** - [Download](https://www.mongodb.com/try/download/community)
   - Ou use MongoDB via Docker: `docker run -d -p 27017:27017 mongo`

---

## 🚀 Instalação Passo a Passo

### 1️⃣ Clone o Repositório

```bash
git clone <seu-repositorio>
cd agendai
```

### 2️⃣ Configure o Backend

#### a) Instale as dependências Python

```bash
cd backend
pip install -r requirements.txt
```

#### b) Configure as variáveis de ambiente

1. Copie o arquivo de exemplo:
   ```bash
   cp .env.example .env
   ```

2. Edite o arquivo `.env` e configure:

```env
# MongoDB (se estiver usando local, mantenha assim)
MONGO_URL="mongodb://localhost:27017"
DB_NAME="test_database"

# CORS
CORS_ORIGINS="*"

# ⚠️ IMPORTANTE: Configure sua API key do Resend
RESEND_API_KEY="re_sua_api_key_aqui"  # ← Substitua aqui!
SENDER_EMAIL="noreply@resend.dev"
```

#### c) Como obter a API Key do Resend (EMAILS)

1. Acesse: **https://resend.com**
2. Crie uma conta gratuita (100 emails/dia grátis)
3. Vá em **"API Keys"** no menu
4. Clique em **"Create API Key"**
5. Dê um nome: "AgendAI"
6. Copie a key (começa com `re_`)
7. Cole no arquivo `.env` em `RESEND_API_KEY`

#### d) Inicie o MongoDB

Se instalou localmente:
```bash
# Windows
net start MongoDB

# Linux/Mac
sudo systemctl start mongod
# ou
mongod --dbpath /caminho/para/dados
```

Se usar Docker:
```bash
docker run -d -p 27017:27017 --name mongodb mongo
```

#### e) Rode o backend

```bash
python -m uvicorn server:app --reload --host 0.0.0.0 --port 8001
```

O backend estará rodando em: **http://localhost:8001**

---

### 3️⃣ Configure o Frontend

#### a) Instale as dependências

```bash
cd ../frontend
yarn install
```

#### b) Configure a URL do backend

Verifique se o arquivo `frontend/.env` está correto:

```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

**IMPORTANTE:** 
- Em desenvolvimento local: `http://localhost:8001`
- Em produção: use a URL real do seu servidor

#### c) Rode o frontend

```bash
yarn start
```

O frontend estará rodando em: **http://localhost:3000**

---

## ✅ Verificação

Se tudo estiver certo, você verá:

1. **Backend**: Console mostrando "Application startup complete" e "Reminder scheduler started"
2. **Frontend**: Navegador abrindo automaticamente em `http://localhost:3000`
3. **Página inicial**: Tela de login do AgendAI

---

## 🧪 Testando o Sistema de Emails

Para testar se os emails estão funcionando:

1. Crie um agendamento para **daqui a 15 minutos**
2. O scheduler verifica a cada 30 minutos (XX:20 e XX:50)
3. Quando faltar ~10 minutos, o email será enviado
4. Verifique os logs do backend para confirmar:
   ```bash
   # Você verá algo como:
   # "Email reminder sent successfully to cliente@email.com"
   ```

---

## 🔧 Solução de Problemas Comuns

### ❌ Erro: "RESEND_API_KEY not set"

**Solução:** Você esqueceu de configurar a API key do Resend no arquivo `.env`

### ❌ Erro: "Connection refused MongoDB"

**Solução:** MongoDB não está rodando. Inicie o serviço:
```bash
# Windows
net start MongoDB

# Linux/Mac  
sudo systemctl start mongod
```

### ❌ Erro: "Port 8001 already in use"

**Solução:** Outro processo está usando a porta. Mate o processo ou mude a porta:
```bash
# Linux/Mac
lsof -ti:8001 | xargs kill -9

# Windows
netstat -ano | findstr :8001
taskkill /PID <pid> /F
```

### ❌ Emails não estão sendo enviados

**Verifique:**
1. API key do Resend está correta no `.env`?
2. O agendamento tem um email válido?
3. O horário do agendamento está correto? (10min antes)
4. Verifique os logs do backend para erros

### ❌ Frontend não conecta ao backend

**Solução:** Verifique se `REACT_APP_BACKEND_URL` em `frontend/.env` aponta para o backend correto.

---

## 📚 Estrutura do Projeto

```
agendai/
├── backend/
│   ├── server.py              # API principal
│   ├── email_service.py       # Serviço de emails
│   ├── reminder_scheduler.py  # Agendador de lembretes
│   ├── requirements.txt       # Dependências Python
│   ├── .env.example          # Exemplo de configuração
│   └── .env                  # Configuração real (não versionar!)
├── frontend/
│   ├── src/
│   │   └── App.js            # Componente principal
│   ├── package.json          # Dependências Node.js
│   └── .env                  # Configuração do frontend
└── README_INSTALACAO.md      # Este arquivo
```

---

## 🆘 Precisa de Ajuda?

Se encontrar problemas:

1. Verifique os logs do backend e frontend
2. Confirme que todas as dependências foram instaladas
3. Verifique se MongoDB está rodando
4. Confirme que as portas 8001 e 3000 estão livres

---

## 🎉 Pronto!

Sua aplicação AgendAI está rodando!

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8001
- **Página pública de agendamento**: http://localhost:3000/book/1

Bom uso! 🚀
