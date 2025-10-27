// Configuração e funcionalidade da página de login - VERSÃO CORRIGIDA
import { 
    auth, 
    signInWithEmailAndPassword, 
    setPersistence, 
    browserLocalPersistence,
    browserSessionPersistence,
    sendPasswordResetEmail,
    GoogleAuthProvider,
    signInWithPopup
} from './firebase-config.js';

// Elementos DOM
const loginForm = document.getElementById('loginForm');
const messageDiv = document.getElementById('message');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const rememberCheckbox = document.getElementById('remember');
const forgotPasswordBtn = document.getElementById('forgotPassword');
const googleSignInBtn = document.getElementById('googleSignIn');

// Elementos do Modal de Recuperação
const recoveryModal = document.getElementById('recoveryModal');
const closeRecoveryModal = document.getElementById('closeRecoveryModal');
const cancelRecovery = document.getElementById('cancelRecovery');
const recoveryForm = document.getElementById('recoveryForm');
const recoveryEmail = document.getElementById('recoveryEmail');
const recoveryMessage = document.getElementById('recoveryMessage');

// Provider do Google
const googleProvider = new GoogleAuthProvider();

// Função para mostrar mensagens
function showMessage(text, type = 'error') {
    messageDiv.textContent = text;
    messageDiv.className = `message-fixed ${
        type === 'error' ? 'message-error' : 
        type === 'success' ? 'message-success' : 'message-info'
    }`;
    messageDiv.classList.remove('hidden');
    
    if (type === 'success' || type === 'info') {
        setTimeout(() => {
            messageDiv.classList.add('hidden');
        }, 3000);
    }
}

// Função para mostrar loading
function setLoading(isLoading) {
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    
    if (isLoading) {
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Entrando...';
    } else {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-sign-in-alt mr-2"></i>Entrar';
    }
}

// Função para mostrar loading no modal
function setRecoveryLoading(isLoading) {
    const submitBtn = recoveryForm.querySelector('button[type="submit"]');
    
    if (isLoading) {
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Enviando...';
    } else {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane mr-2"></i>Enviar Instruções';
    }
}

// Funções do Modal
function openRecoveryModal() {
    if (emailInput.value) {
        recoveryEmail.value = emailInput.value;
    }
    recoveryModal.classList.remove('hidden');
    recoveryMessage.classList.add('hidden');
    recoveryEmail.focus();
}

function closeRecoveryModalFunc() {
    recoveryModal.classList.add('hidden');
    recoveryForm.reset();
    recoveryMessage.classList.add('hidden');
}

// Validação de email
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// LOGIN COM EMAIL/PASSWORD
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const rememberMe = rememberCheckbox.checked;

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
        // Configurar persistência
        const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;
        await setPersistence(auth, persistence);

        // Fazer login
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        showMessage('✅ Login bem-sucedido! Redirecionando...', 'success');
        
        // REDIRECIONAMENTO IMEDIATO - SEM DELAY
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 500);

    } catch (error) {
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
            default:
                errorMessage = `Erro: ${error.message}`;
        }
        
        showMessage(errorMessage);
        setLoading(false);
    }
});

// LOGIN COM GOOGLE
googleSignInBtn.addEventListener('click', async () => {
    try {
        googleSignInBtn.classList.add('loading');
        googleSignInBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Conectando...';
        
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        
        showMessage(`✅ Bem-vindo(a), ${user.displayName || 'Utilizador'}!`, 'success');
        
        // REDIRECIONAMENTO IMEDIATO
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 500);
        
    } catch (error) {
        let errorMessage = 'Erro ao conectar com Google. Tente novamente.';
        
        switch (error.code) {
            case 'auth/popup-closed-by-user':
                errorMessage = 'Login cancelado.';
                break;
            case 'auth/popup-blocked':
                errorMessage = 'Popup bloqueado. Permita popups para este site.';
                break;
            case 'auth/network-request-failed':
                errorMessage = 'Erro de conexão. Verifique sua internet.';
                break;
        }
        
        showMessage(errorMessage);
        googleSignInBtn.classList.remove('loading');
        googleSignInBtn.innerHTML = '<i class="fab fa-google mr-2"></i>Continuar com Google';
    }
});

// RECUPERAÇÃO DE PASSWORD
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
        showRecoveryMessage('📧 Email de recuperação enviado! Verifique sua caixa de entrada.', 'success');
        
        setTimeout(() => {
            closeRecoveryModalFunc();
        }, 3000);

    } catch (error) {
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

// Função para mostrar mensagem no modal
function showRecoveryMessage(text, type = 'error') {
    recoveryMessage.textContent = text;
    recoveryMessage.className = `p-3 rounded-lg text-sm ${
        type === 'error' ? 'message-error' : 
        type === 'success' ? 'message-success' : 'message-info'
    }`;
    recoveryMessage.classList.remove('hidden');
}

// EVENT LISTENERS
forgotPasswordBtn.addEventListener('click', openRecoveryModal);
closeRecoveryModal.addEventListener('click', closeRecoveryModalFunc);
cancelRecovery.addEventListener('click', closeRecoveryModalFunc);

recoveryModal.addEventListener('click', (e) => {
    if (e.target === recoveryModal) {
        closeRecoveryModalFunc();
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !recoveryModal.classList.contains('hidden')) {
        closeRecoveryModalFunc();
    }
});

// INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', () => {
    emailInput.focus();
    
    // Verificar parâmetros de URL
    const urlParams = new URLSearchParams(window.location.search);
    const message = urlParams.get('message');
    const messageType = urlParams.get('type');
    
    if (message) {
        showMessage(decodeURIComponent(message), messageType || 'info');
    }
});
