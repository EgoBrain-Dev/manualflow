// Funcionalidade moderna da página de registro
import { 
    auth,
    createUserWithEmailAndPassword,
    updateProfile,
    sendEmailVerification,
    GoogleAuthProvider,
    signInWithPopup,
    db,
    doc,
    getDoc,
    setDoc,
    serverTimestamp
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
const googleSignInBtn = document.getElementById('googleSignIn');

// Elementos do indicador de força
const passwordStrengthBar = document.getElementById('passwordStrengthBar');
const passwordStrengthText = document.getElementById('passwordStrengthText');
const passwordRequirements = document.getElementById('passwordRequirements');
const passwordMatch = document.getElementById('passwordMatch');

// Provider do Google
const googleProvider = new GoogleAuthProvider();

// Função para mostrar mensagens fixas no topo
function showMessage(text, type = 'error') {
    messageDiv.textContent = text;
    messageDiv.className = `message-fixed ${
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

// Função para verificar força da password
function checkPasswordStrength(password) {
    let strength = 0;
    const requirements = {
        length: password.length >= 6,
        lowercase: /[a-z]/.test(password),
        uppercase: /[A-Z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[^A-Za-z0-9]/.test(password)
    };

    // Atualizar indicadores visuais
    Object.keys(requirements).forEach(req => {
        const element = passwordRequirements.querySelector(`[data-requirement="${req}"]`);
        if (element) {
            const icon = element.querySelector('i');
            const text = element.querySelector('span');
            
            if (requirements[req]) {
                icon.className = 'fas fa-check text-green-500 mr-1 text-xs';
                element.classList.add('requirement-valid');
                element.classList.remove('requirement-invalid');
                strength++;
            } else {
                icon.className = 'fas fa-times text-red-400 mr-1 text-xs';
                element.classList.remove('requirement-valid');
                element.classList.add('requirement-invalid');
            }
        }
    });

    // Determinar nível de força
    let strengthLevel = 'weak';
    let strengthClass = 'strength-weak';
    
    if (strength >= 4) {
        strengthLevel = 'strong';
        strengthClass = 'strength-strong';
    } else if (strength >= 3) {
        strengthLevel = 'good';
        strengthClass = 'strength-good';
    } else if (strength >= 2) {
        strengthLevel = 'fair';
        strengthClass = 'strength-fair';
    }

    // Atualizar barra e texto
    passwordStrengthBar.className = `h-2 rounded-full transition-all duration-300 ${strengthClass}`;
    
    const strengthTexts = {
        weak: 'Fraca',
        fair: 'Razoável', 
        good: 'Boa',
        strong: 'Forte'
    };
    
    passwordStrengthText.textContent = strengthTexts[strengthLevel];
    passwordStrengthText.className = `text-xs font-medium ${
        strengthLevel === 'weak' ? 'text-red-600' :
        strengthLevel === 'fair' ? 'text-yellow-600' :
        strengthLevel === 'good' ? 'text-green-600' :
        'text-green-700'
    }`;

    return strength >= 3; // Mínimo de 3 requisitos para password aceitável
}

// Função de validação de email
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
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

    if (password.length < 6) {
        showMessage('A password deve ter pelo menos 6 caracteres.');
        return false;
    }

    if (!checkPasswordStrength(password)) {
        showMessage('A password é muito fraca. Use letras maiúsculas, minúsculas e números.');
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

        // Criar documento de usuário no Firestore
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (!userDocSnap.exists()) {
            await setDoc(userDocRef, {
                uid: user.uid,
                name: name,
                email: user.email,
                role: 'editor',
                status: 'Ativa',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
        }

        // Enviar email de verificação
        await sendEmailVerification(user);

        showMessage('🎉 Conta criada com sucesso! Verifique seu email para confirmar a conta.', 'success');
        
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
            default:
                errorMessage = `Erro: ${error.message}`;
        }
        
        showMessage(errorMessage);
    } finally {
        setLoading(false);
    }
});

// Login com Google
googleSignInBtn.addEventListener('click', async () => {
    try {
        googleSignInBtn.classList.add('social-loading');
        googleSignInBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Conectando...';
        
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        
        showMessage(`🎉 Bem-vindo(a), ${user.displayName || 'Utilizador'}!`, 'success');
        
        // Redirecionar para dashboard
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        
    } catch (error) {
        console.error('Erro no login com Google:', error);
        
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
        googleSignInBtn.classList.remove('social-loading');
        googleSignInBtn.innerHTML = '<i class="fab fa-google text-red-500 mr-2"></i>Continuar com Google';
    }
});

// Validação em tempo real da password
passwordInput.addEventListener('input', () => {
    const password = passwordInput.value;
    
    if (password.length > 0) {
        passwordRequirements.classList.remove('hidden');
        checkPasswordStrength(password);
    } else {
        passwordRequirements.classList.add('hidden');
        passwordStrengthBar.className = 'h-2 rounded-full transition-all duration-300 strength-weak';
        passwordStrengthText.textContent = 'Fraca';
    }
    
    // Validar confirmação
    const confirmPassword = confirmPasswordInput.value;
    if (confirmPassword.length > 0) {
        if (password === confirmPassword) {
            passwordMatch.classList.remove('hidden');
            passwordMatch.innerHTML = '<i class="fas fa-check text-green-500 mr-1"></i><span class="text-green-600">Passwords coincidem</span>';
            confirmPasswordInput.classList.remove('border-red-300');
            confirmPasswordInput.classList.add('border-green-300');
        } else {
            passwordMatch.classList.remove('hidden');
            passwordMatch.innerHTML = '<i class="fas fa-times text-red-500 mr-1"></i><span class="text-red-600">Passwords não coincidem</span>';
            confirmPasswordInput.classList.add('border-red-300');
            confirmPasswordInput.classList.remove('border-green-300');
        }
    } else {
        passwordMatch.classList.add('hidden');
        confirmPasswordInput.classList.remove('border-red-300', 'border-green-300');
    }
});

// Validação em tempo real da confirmação de password
confirmPasswordInput.addEventListener('input', () => {
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    
    if (confirmPassword.length > 0) {
        if (password === confirmPassword) {
            passwordMatch.classList.remove('hidden');
            passwordMatch.innerHTML = '<i class="fas fa-check text-green-500 mr-1"></i><span class="text-green-600">Passwords coincidem</span>';
            confirmPasswordInput.classList.remove('border-red-300');
            confirmPasswordInput.classList.add('border-green-300');
        } else {
            passwordMatch.classList.remove('hidden');
            passwordMatch.innerHTML = '<i class="fas fa-times text-red-500 mr-1"></i><span class="text-red-600">Passwords não coincidem</span>';
            confirmPasswordInput.classList.add('border-red-300');
            confirmPasswordInput.classList.remove('border-green-300');
        }
    } else {
        passwordMatch.classList.add('hidden');
        confirmPasswordInput.classList.remove('border-red-300', 'border-green-300');
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