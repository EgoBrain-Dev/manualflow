// Configuração e funcionalidade da página de login
import { 
    auth, 
    signInWithEmailAndPassword, 
    setPersistence, 
    browserLocalPersistence,
    browserSessionPersistence,
    sendPasswordResetEmail 
} from './firebase-config.js';

// Elementos DOM
const loginForm = document.getElementById('loginForm');
const messageDiv = document.getElementById('message');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const rememberCheckbox = document.getElementById('remember');
const forgotPasswordBtn = document.getElementById('forgotPassword');

// Elementos do Modal de Recuperação
const recoveryModal = document.getElementById('recoveryModal');
const closeRecoveryModal = document.getElementById('closeRecoveryModal');
const cancelRecovery = document.getElementById('cancelRecovery');
const recoveryForm = document.getElementById('recoveryForm');
const recoveryEmail = document.getElementById('recoveryEmail');
const recoveryMessage = document.getElementById('recoveryMessage');

// Função para mostrar mensagens
function showMessage(text, type = 'error') {
    messageDiv.textContent = text;
    messageDiv.className = `fade-in p-4 rounded-lg text-sm text-center ${
        type === 'error' ? 'message-error' : 
        type === 'success' ? 'message-success' : 'message-info'
    }`;
    messageDiv.classList.remove('hidden');
    
    // Auto-esconder mensagens de sucesso/info
    if (type === 'success' || type === 'info') {
        setTimeout(() => {
            messageDiv.classList.add('hidden');
        }, 5000);
    }
}

// Função para mostrar mensagem no modal
function showRecoveryMessage(text, type = 'error') {
    recoveryMessage.textContent = text;
    recoveryMessage.className = `fade-in p-3 rounded-lg text-sm ${
        type === 'error' ? 'message-error' : 
        type === 'success' ? 'message-success' : 'message-info'
    }`;
    recoveryMessage.classList.remove('hidden');
}

// Função para mostrar loading no login
function setLoading(isLoading) {
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    
    if (isLoading) {
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner animate-spin mr-2"></i>Entrando...';
    } else {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-sign-in-alt mr-2"></i>Entrar';
    }
}

// Função para mostrar loading no modal de recuperação
function setRecoveryLoading(isLoading) {
    const submitBtn = recoveryForm.querySelector('button[type="submit"]');
    
    if (isLoading) {
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner animate-spin mr-2"></i>Enviando...';
    } else {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane mr-2"></i>Enviar Instruções';
    }
}

// Função para abrir modal de recuperação
function openRecoveryModal() {
    // Preencher com email do login se existir
    if (emailInput.value) {
        recoveryEmail.value = emailInput.value;
    }
    
    recoveryModal.classList.remove('hidden');
    recoveryMessage.classList.add('hidden');
    recoveryEmail.focus();
}

// Função para fechar modal de recuperação
function closeRecoveryModalFunc() {
    recoveryModal.classList.add('hidden');
    recoveryForm.reset();
    recoveryMessage.classList.add('hidden');
}

// Função de validação de email
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Event Listener para o formulário de login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const rememberMe = rememberCheckbox.checked;

    // Validação básica
    if (!email || !password) {
        showMessage('Por favor, preencha todos os campos.');
        return;
    }

    if (!validateEmail(email)) {
        showMessage('Por favor, insira um email válido.');
        return;
    }

    setLoading(true);

    try {
        // Configurar persistência de autenticação
        const persistence = rememberMe ? 
            browserLocalPersistence :  // Mantém logado entre sessões
            browserSessionPersistence; // Apenas para esta sessão
        
        await setPersistence(auth, persistence);

        // Tentar login
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        showMessage('Login bem-sucedido! Redirecionando...', 'success');
        
        // Redirecionar após login bem-sucedido
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);

    } catch (error) {
        console.error('Erro no login:', error);
        
        let errorMessage = 'Erro ao fazer login. Tente novamente.';
        
        switch (error.code) {
            case 'auth/invalid-email':
                errorMessage = 'Email inválido.';
                break;
            case 'auth/user-disabled':
                errorMessage = 'Esta conta foi desativada.';
                break;
            case 'auth/user-not-found':
                errorMessage = 'Não existe uma conta com este email.';
                break;
            case 'auth/wrong-password':
                errorMessage = 'Password incorreta.';
                break;
            case 'auth/too-many-requests':
                errorMessage = 'Muitas tentativas falhadas. Tente novamente mais tarde.';
                break;
            case 'auth/network-request-failed':
                errorMessage = 'Erro de conexão. Verifique sua internet.';
                break;
        }
        
        showMessage(errorMessage);
    } finally {
        setLoading(false);
    }
});

// Event Listener para o formulário de recuperação
recoveryForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = recoveryEmail.value.trim();

    if (!email) {
        showRecoveryMessage('Por favor, insira o seu email.');
        return;
    }

    if (!validateEmail(email)) {
        showRecoveryMessage('Por favor, insira um email válido.');
        return;
    }

    setRecoveryLoading(true);

    try {
        await sendPasswordResetEmail(auth, email);
        showRecoveryMessage('Email de recuperação enviado! Verifique sua caixa de entrada.', 'success');
        
        // Fechar modal após sucesso
        setTimeout(() => {
            closeRecoveryModalFunc();
        }, 3000);

    } catch (error) {
        console.error('Erro ao enviar email de recuperação:', error);
        
        let errorMessage = 'Erro ao enviar email de recuperação. Tente novamente.';
        
        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage = 'Não existe uma conta com este email.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Email inválido.';
                break;
            case 'auth/too-many-requests':
                errorMessage = 'Muitas tentativas. Tente novamente mais tarde.';
                break;
            case 'auth/network-request-failed':
                errorMessage = 'Erro de conexão. Verifique sua internet.';
                break;
        }
        
        showRecoveryMessage(errorMessage);
    } finally {
        setRecoveryLoading(false);
    }
});

// Event Listeners para o modal
forgotPasswordBtn.addEventListener('click', openRecoveryModal);
closeRecoveryModal.addEventListener('click', closeRecoveryModalFunc);
cancelRecovery.addEventListener('click', closeRecoveryModalFunc);

// Fechar modal ao clicar fora
recoveryModal.addEventListener('click', (e) => {
    if (e.target === recoveryModal) {
        closeRecoveryModalFunc();
    }
});

// Fechar modal com ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !recoveryModal.classList.contains('hidden')) {
        closeRecoveryModalFunc();
    }
});

// Verificar se já está autenticado (redirecionar se sim)
auth.onAuthStateChanged((user) => {
    if (user && window.location.pathname.includes('login.html')) {
        // Já está logado, redirecionar para dashboard
        window.location.href = 'index.html';
    }
});

// Focar no campo de email ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    emailInput.focus();
    
    // Verificar se há parâmetros de URL para mensagens
    const urlParams = new URLSearchParams(window.location.search);
    const message = urlParams.get('message');
    const messageType = urlParams.get('type');
    
    if (message) {
        showMessage(decodeURIComponent(message), messageType || 'info');
    }
});