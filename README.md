# ManualFlow - Plataforma de Gestão de Manuais

Uma plataforma web progressiva (PWA) para gestão colaborativa e versionamento de manuais, desenvolvida com Firebase e tecnologias modernas.

## 🚀 Funcionalidades

### ✅ Totalmente Funcional
- **Autenticação completa** com Firebase Auth (Email/Senha e Google)
- **Upload de manuais** com Cloudinary para armazenamento
- **Dashboard interativo** com estatísticas em tempo real
- **Sistema de revisão** e aprovação de manuais
- **Controle de permissões** (público/privado)
- **Feed de atividades** para rastreamento de ações
- **Perfil de usuário** com gerenciamento de conta

### 📱 Mobile First
- Design responsivo otimizado para dispositivos móveis
- Interface touch-friendly
- Navegação intuitiva em telas pequenas
- Performance otimizada para conexões móveis

### 🏠 PWA (Progressive Web App)
- Instalável como aplicativo nativo
- Funciona offline com cache inteligente
- Notificações push (preparado para implementação)
- Service Worker avançado com estratégia de cache

### 🤖 Integração com IA
- **Geração automática de descrições** usando IA
- Sugestões inteligentes baseadas no conteúdo
- Análise automática de manuais (preparado para expansão)

## 🛠️ Tecnologias Utilizadas

- **Frontend:** HTML5, CSS3 (Tailwind CSS), JavaScript (ES6+)
- **Backend:** Firebase (Firestore, Auth, Storage)
- **Armazenamento de Arquivos:** Cloudinary
- **PWA:** Service Worker, Web App Manifest
- **IA:** Preparado para integração com OpenAI API
- **Ícones:** Font Awesome

## 📁 Estrutura do Projeto

```
public/
├── index.html              # Dashboard principal
├── login.html              # Página de login
├── register.html           # Página de registro
├── upload.html             # Upload de manuais
├── profile.html            # Perfil do usuário
├── manual-detail.html      # Visualização de manual
├── manual-review.html      # Revisão de manuais
├── sobre.html              # Sobre o projeto
├── contactos.html          # Contactos
├── manifest.json           # PWA Manifest
├── sw.js                   # Service Worker
├── assets/
│   └── images/             # Imagens e ícones
├── css/                    # Estilos CSS
├── js/                     # Scripts JavaScript
├── componentes/            # Componentes HTML reutilizáveis
└── legal/                  # Páginas legais
```

## 🚀 Como Executar

### Pré-requisitos
- Navegador moderno com suporte a ES6+
- Conexão com internet para funcionalidades Firebase/Cloudinary

### Instalação e Execução

1. **Clone o repositório:**
   ```bash
   git clone <url-do-repositorio>
   cd manualflow
   ```

2. **Configure o Firebase:**
   - Crie um projeto no [Firebase Console](https://console.firebase.google.com/)
   - Ative Authentication, Firestore e Storage
   - Configure as regras de segurança
   - Atualize as chaves em `js/firebase-env.js`

3. **Configure o Cloudinary:**
   - Crie uma conta no [Cloudinary](https://cloudinary.com/)
   - Obtenha suas credenciais
   - Atualize em `js/upload.js`

4. **Execute localmente:**
   ```bash
   # Usando Python
   python -m http.server 8000

   # Ou usando Node.js
   npx serve public

   # Ou qualquer servidor web
   ```

5. **Acesse:** `http://localhost:8000`

## 📱 Instalação como PWA

1. Abra o site em um navegador compatível (Chrome, Edge, Safari)
2. Clique no botão "Instalar App" ou no ícone de instalação na barra de endereço
3. Siga as instruções para instalar

## 🤖 Integração com IA

### Geração de Descrições
- Na página de upload, clique em "Gerar com IA" ao lado do campo descrição
- A IA gera uma descrição profissional baseada no título e categoria

### Expansão Futura
- Análise automática de conteúdo de manuais
- Sugestões de melhorias
- Tradução automática
- Resumos inteligentes

Para implementar IA real, integre com:
- OpenAI API
- Google Gemini
- Claude AI
- Ou outros provedores

## 🔧 Configurações

### Firebase Security Rules

**Firestore Rules:**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Regras de segurança aqui
  }
}
```

**Storage Rules:**
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Regras de armazenamento aqui
  }
}
```

### Variáveis de Ambiente

Atualize `js/firebase-env.js`:
```javascript
window.FIREBASE_API_KEY = "your-api-key";
```

## 📊 Melhorias Implementadas

### Remoção de Simulações
- ❌ Dados mock removidos
- ✅ Integração real com Firebase
- ✅ Upload real para Cloudinary
- ✅ Autenticação real

### Mobile First
- ✅ Design responsivo com Tailwind CSS
- ✅ Navegação otimizada para mobile
- ✅ Toques e gestos suportados

### PWA Avançado
- ✅ Service Worker inteligente
- ✅ Cache offline
- ✅ Instalação como app
- ✅ Notificações preparadas

### IA Integration
- ✅ Geração de descrições com IA
- ✅ Interface preparada para expansão

## 🎯 Roadmap

- [ ] Sistema de comentários em manuais
- [ ] Notificações push
- [ ] Busca avançada com IA
- [ ] Análise de engajamento
- [ ] Integração com Google Drive/OneDrive
- [ ] Exportação para PDF
- [ ] Versionamento automático
- [ ] API REST para integrações

## 📞 Suporte

**Desenvolvido por:** EgoBrain-Dev
- **WhatsApp:** 84 361 7130
- **Email:** egobrain.mz@gmail.com
- **Website:** [egobrain-dev.web.app](https://egobrain-dev.web.app)

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

---

**ManualFlow v2.0** - Plataforma completa para gestão inteligente de manuais.