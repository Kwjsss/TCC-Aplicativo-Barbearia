# 🗄️ Banco de Dados - O que Acontece em Outro PC

## ❌ Resposta Direta: NÃO, os dados NÃO vêm junto

---

## 📊 O que Acontece?

### **No PC Atual (onde você está agora):**
```
MongoDB Local
├── 📦 Serviços: 3 itens
│   ├── Corte Masculino (R$ 30)
│   ├── Barba (R$ 20)
│   └── Corte + Barba (R$ 50)
│
├── 👥 Profissionais: 7 cadastrados
│   ├── João
│   ├── Carlos
│   ├── João Silva
│   └── ...
│
├── 👤 Clientes: Vários cadastrados
│
└── 📅 Agendamentos: 7 registros
```

### **Em Outro PC (depois de baixar):**
```
MongoDB Local
├── 📦 Serviços: VAZIO → ✅ Será preenchido automaticamente
├── 👥 Profissionais: VAZIO → ✅ Será preenchido automaticamente
├── 👤 Clientes: VAZIO → ❌ Precisa cadastrar novamente
└── 📅 Agendamentos: VAZIO → ❌ Começar do zero
```

---

## ✅ O que É Criado Automaticamente?

Quando você rodar o backend pela primeira vez em outro PC, o sistema **automaticamente cria**:

### 1. **Serviços Padrão** ✅
```javascript
- Corte Masculino (30 min) - R$ 35,00
- Barba (20 min) - R$ 20,00
- Corte + Barba (50 min) - R$ 50,00
```

### 2. **Profissionais Padrão** ✅
```javascript
- João (ID: 1, senha: 123456)
- Carlos (ID: 2, senha: 123456)
```

**Código responsável:** `/app/backend/server.py` (função `initialize_data()`)

---

## ❌ O que NÃO É Criado Automaticamente?

### 1. **Clientes** ❌
- Precisam se cadastrar novamente
- Ou você pode criar manualmente via registro

### 2. **Agendamentos** ❌
- Banco começa vazio
- Precisam ser criados novamente

### 3. **Profissionais Adicionais** ❌
- Além de João e Carlos, os outros não vêm
- Precisam se cadastrar novamente

### 4. **Fotos de Perfil** ❌
- Fotos não são salvas no banco
- Base64 era armazenado, mas não vem no código

---

## 🔄 Como Funciona a Inicialização?

Quando você roda o backend pela primeira vez:

```python
# 1. Backend inicia
python -m uvicorn server:app --reload

# 2. Verifica se banco está vazio
✓ Serviços vazios? → Cria 3 serviços padrão
✓ Profissionais vazios? → Cria João e Carlos

# 3. Pronto para usar!
```

Veja no log do backend:
```
INFO: Services initialized
INFO: Professionals initialized
```

---

## 🎯 Cenários Práticos

### **Cenário 1: Desenvolvimento em Casa**
```
PC Casa (atual)
├── 7 profissionais
├── 10 clientes
└── 15 agendamentos

↓ Git Push

PC Trabalho (novo)
├── 2 profissionais (João, Carlos) ✅ Auto-criado
├── 0 clientes ❌ Precisa cadastrar
└── 0 agendamentos ❌ Começar do zero
```

### **Cenário 2: Passar para um Amigo**
```
Seu PC
├── Dados completos
└── Git Push

PC do Amigo
├── 2 profissionais ✅ Auto-criado
├── 0 clientes ❌ Cadastrar novamente
└── 0 agendamentos ❌ Criar novos
```

---

## 💡 Soluções para Manter os Dados

### **Opção 1: Exportar/Importar Manualmente** 📤📥

**Exportar do PC atual:**
```bash
# Exportar todos os dados
mongodump --db test_database --out ./backup

# Criar arquivo zip
zip -r backup.zip backup/
```

**Importar no PC novo:**
```bash
# Descompactar
unzip backup.zip

# Importar dados
mongorestore --db test_database ./backup/test_database
```

### **Opção 2: Usar MongoDB na Nuvem** ☁️

**MongoDB Atlas (Grátis):**
1. Criar conta em https://www.mongodb.com/cloud/atlas
2. Criar cluster gratuito
3. Obter connection string
4. Alterar `MONGO_URL` no `.env`:
   ```env
   MONGO_URL="mongodb+srv://user:pass@cluster.mongodb.net/test_database"
   ```

**Vantagem:**
- ✅ Mesmos dados em qualquer PC
- ✅ Não precisa instalar MongoDB local
- ✅ Backup automático

### **Opção 3: Scripts de População** 🤖

Criar um script para popular o banco:

```python
# populate_db.py
# Adicionar clientes de teste, agendamentos, etc.
```

---

## 📝 Resumo Final

| Item | Vem no Git? | É Auto-criado? | Precisa Fazer? |
|------|------------|----------------|----------------|
| **Código** | ✅ Sim | - | Apenas baixar |
| **Serviços** | ❌ Não | ✅ Sim | Nada |
| **Profissionais (João/Carlos)** | ❌ Não | ✅ Sim | Nada |
| **Outros Profissionais** | ❌ Não | ❌ Não | Cadastrar novamente |
| **Clientes** | ❌ Não | ❌ Não | Cadastrar novamente |
| **Agendamentos** | ❌ Não | ❌ Não | Criar novos |
| **Dependências** | ✅ Sim (requirements.txt) | ❌ Não | `pip install -r requirements.txt` |

---

## ⚠️ Importante

**O MongoDB armazena dados localmente no disco:**
- **Linux/Mac:** `/var/lib/mongodb/`
- **Windows:** `C:\data\db\`

Esses arquivos **NÃO vão para o Git** e **NÃO são transferidos** quando você baixa o projeto.

---

## 🚀 Primeira Execução em Novo PC

```bash
# 1. Instalar MongoDB
# 2. Clonar repositório
git clone <seu-repo>

# 3. Configurar backend
cd backend
pip install -r requirements.txt
cp .env.example .env
# Editar .env com API key

# 4. Rodar backend
python -m uvicorn server:app --reload

# Você verá:
# ✅ Services initialized
# ✅ Professionals initialized

# 5. Acessar app
http://localhost:3000

# 6. Fazer login com usuário padrão:
# Email: criar novo ou usar profissional padrão
# João (precisa registrar via "Cadastre-se")
```

---

## 🎓 Dica Pro

Se você quer **desenvolver em múltiplos PCs com os mesmos dados**, use **MongoDB Atlas** (nuvem). É gratuito e seus dados estarão sempre sincronizados!

---

## ❓ Dúvidas Comuns

**P: Posso copiar o banco de dados manualmente?**  
R: Sim! Use `mongodump` e `mongorestore` (explicado acima).

**P: Os profissionais João e Carlos têm senha?**  
R: Sim! Senha padrão: `123456` (criada automaticamente)

**P: Posso mudar os serviços padrão?**  
R: Sim! Edite o arquivo `server.py` na função `initialize_data()`.

**P: Os emails funcionarão?**  
R: Sim, desde que você configure a API key do Resend no `.env`.

---

📚 **Leia também:** `README_INSTALACAO.md` para guia completo de instalação.
