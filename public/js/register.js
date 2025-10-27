// Funcionalidade da página de registro
import { 
    auth,
    createUserWithEmailAndPassword,
    updateProfile,
    sendEmailVerification
} from './firebase-config.js';

// Elementos DOM
const registerForm = document.getElementById('registerForm');
const messageDiv = document.getElementById('message');
const nameInput = document.getElementById('name');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirmPassword');
const acceptTerms = document.getElementById('acceptTerms');
const acceptConfidentiality = document.getElementById('acceptConfidentiality');

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

// Função para mostrar loading
function setLoading(isLoading) {
    const submitBtn = registerForm.querySelector('button[type="submit"]');
    
    if (isLoading) {
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Criando conta...';
    } else {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-user-plus mr-2"></i>Criar Conta';
    }
}

// Função de validação de email
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Função de validação de password
function validatePassword(password) {
    return password.length >= 6;
}

// Função para validar o formulário
function validateForm(name, email, password, confirmPassword, termsAccepted, confidentialityAccepted) {
    if (!name || !email || !password || !confirmPassword) {
        showMessage('Por favor, preencha todos os campos.');
        return false;
    }

    if (!validateEmail(email)) {
        showMessage('Por favor, insira um email válido.');
        return false;
    }

    if (!validatePassword(password)) {
        showMessage('A password deve ter pelo menos 6 caracteres.');
        return false;
    }

    if (password !== confirmPassword) {
        showMessage('As passwords não coincidem.');
        return false;
    }

    if (!termsAccepted) {
        showMessage('Deve aceitar os Termos de Utilização e Política de Privacidade.');
        return false;
    }

    if (!confidentialityAccepted) {
        showMessage('Deve aceitar a responsabilidade pela confidencialidade dos documentos.');
        return false;
    }

    return true;
}

// Event Listener para o formulário de registro
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    const termsAccepted = acceptTerms.checked;
    const confidentialityAccepted = acceptConfidentiality.checked;

    // Validação do formulário
    if (!validateForm(name, email, password, confirmPassword, termsAccepted, confidentialityAccepted)) {
        return;
    }

    setLoading(true);

    try {
        // Criar usuário no Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Atualizar perfil com o nome
        await updateProfile(user, {
            displayName: name
        });

        // Enviar email de verificação
        await sendEmailVerification(user);

        showMessage('Conta criada com sucesso! Verifique seu email para confirmar a conta.', 'success');
        
        // Redirecionar para login após sucesso
        setTimeout(() => {
            window.location.href = 'login.html?message=' + encodeURIComponent('Conta criada com sucesso! Verifique seu email.') + '&type=success';
        }, 3000);

    } catch (error) {
        console.error('Erro no registro:', error);
        
        let errorMessage = 'Erro ao criar conta. Tente novamente.';
        
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage = 'Este email já está em uso.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Email inválido.';
                break;
            case 'auth/operation-not-allowed':
                errorMessage = 'Operação não permitida. Contacte o suporte.';
                break;
            case 'auth/weak-password':
                errorMessage = 'Password muito fraca. Use pelo menos 6 caracteres.';
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

// Validação em tempo real da password
passwordInput.addEventListener('input', () => {
    const password = passwordInput.value;
    
    if (password.length > 0 && password.length < 6) {
        passwordInput.classList.add('border-red-300');
        passwordInput.classList.remove('border-gray-300');
    } else {
        passwordInput.classList.remove('border-red-300');
        passwordInput.classList.add('border-gray-300');
    }
});

// Validação em tempo real da confirmação de password
confirmPasswordInput.addEventListener('input', () => {
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    
    if (confirmPassword.length > 0 && password !== confirmPassword) {
        confirmPasswordInput.classList.add('border-red-300');
        confirmPasswordInput.classList.remove('border-gray-300');
    } else {
        confirmPasswordInput.classList.remove('border-red-300');
        confirmPasswordInput.classList.add('border-gray-300');
    }
});

// Focar no campo de nome ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    nameInput.focus();
});

// Verificar se já está autenticado (redirecionar se sim)
auth.onAuthStateChanged((user) => {
    if (user && window.location.pathname.includes('register.html')) {
        // Já está logado, redirecionar para dashboard
        window.location.href = 'index.html';
    }
});