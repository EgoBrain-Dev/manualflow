import {
    auth,
    onAuthStateChanged,
    db,
    updateProfile,
    sendPasswordResetEmail,
    collection,
    getDoc,
    doc,
    setDoc,
    serverTimestamp
} from './firebase-config.js';

const profileName = document.getElementById('profileName');
const profileEmail = document.getElementById('profileEmail');
const profileRole = document.getElementById('profileRole');
const profileSince = document.getElementById('profileSince');
const profileStatus = document.getElementById('profileStatus');
const profileInitials = document.getElementById('profileInitials');
const displayNameInput = document.getElementById('displayName');
const displayEmailInput = document.getElementById('displayEmail');
const updateProfileBtn = document.getElementById('updateProfileBtn');
const sendPasswordResetBtn = document.getElementById('sendPasswordResetBtn');
const adminPanelLink = document.getElementById('adminPanelLink');
const installPwaBtn = document.getElementById('installPwaBtn');
const pwaStatusText = document.getElementById('pwaStatusText');

let currentUser = null;
let currentUserDoc = null;

function showMessage(text, type = 'info') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message-fixed ${
        type === 'error' ? 'message-error' :
        type === 'success' ? 'message-success' : 'message-info'
    } slide-in`;
    messageDiv.innerText = text;
    document.body.appendChild(messageDiv);
    setTimeout(() => {
        messageDiv.remove();
    }, 4000);
}

async function loadUserProfile(uid) {
    try {
        const userDocRef = doc(db, 'users', uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
            currentUserDoc = userDocSnap.data();
        } else {
            currentUserDoc = {
                role: 'editor',
                createdAt: null,
                status: 'Ativa'
            };
        }
    } catch (error) {
        console.error('Erro ao carregar perfil:', error);
    }
}

async function updateUI(user) {
    const displayName = user.displayName || user.email.split('@')[0];
    profileName.textContent = displayName;
    profileEmail.textContent = user.email;
    displayNameInput.value = displayName;
    displayEmailInput.value = user.email;
    
    if(profileInitials) profileInitials.textContent = displayName.charAt(0).toUpperCase();

    profileRole.textContent = currentUserDoc?.role ? currentUserDoc.role.charAt(0).toUpperCase() + currentUserDoc.role.slice(1) : 'Editor';
    profileSince.textContent = currentUserDoc?.createdAt ? new Date(currentUserDoc.createdAt.seconds * 1000).toLocaleDateString('pt-PT') : '-';
    profileStatus.textContent = currentUserDoc?.status || 'Ativa';
    
    if (currentUserDoc?.role === 'admin' && adminPanelLink) {
        adminPanelLink.classList.remove('hidden');
    }
    
    loadNotificationSettings();
    document.body.style.visibility = 'visible';
    checkPWAStatus();
}

async function ensureUserDocument(user) {
    try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists()) {
            await setDoc(userDocRef, {
                uid: user.uid,
                name: user.displayName || user.email.split('@')[0],
                email: user.email,
                role: 'editor',
                status: 'Ativa',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
        }
    } catch (error) {
        console.error('Erro ao garantir documento de usuário:', error);
    }
}

async function handleUpdateProfile() {
    try {
        const newName = displayNameInput.value.trim();

        if (!newName) {
            showMessage('O nome não pode ser vazio.', 'error');
            return;
        }
        
        updateProfileBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Atualizando...';
        updateProfileBtn.disabled = true;

        await updateProfile(currentUser, { displayName: newName });
        await setDoc(doc(db, 'users', currentUser.uid), {
            ...currentUserDoc,
            name: newName,
            updatedAt: serverTimestamp()
        }, { merge: true });

        await loadUserProfile(currentUser.uid);
        updateUI(currentUser);

        showMessage('Perfil atualizado com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao atualizar perfil:', error);
        showMessage('Erro ao atualizar perfil. Tente novamente.', 'error');
    } finally {
        updateProfileBtn.innerHTML = '<i class="fas fa-save mr-2"></i> Atualizar Perfil';
        updateProfileBtn.disabled = false;
    }
}

async function handleSendPasswordReset() {
    try {
        await sendPasswordResetEmail(auth, currentUser.email);
        showMessage('Um email de redefinição de password foi enviado.', 'success');
    } catch (error) {
        console.error('Erro no reset de password:', error);
        showMessage('Não foi possível enviar o email. Tente novamente.', 'error');
    }
}

function loadNotificationSettings() {
    const savedSettings = localStorage.getItem('manualflow_notifications');
    const notificationsToggle = document.getElementById('notificationsToggle');
    if (notificationsToggle) {
        notificationsToggle.checked = savedSettings !== 'false';
    }
}

function saveNotificationSettings(enabled) {
    localStorage.setItem('manualflow_notifications', enabled ? 'true' : 'false');
}

function handleNotificationToggle(event) {
    saveNotificationSettings(event.target.checked);
    showMessage(`Notificações ${event.target.checked ? 'ativadas' : 'desativadas'}.`, 'success');
}

function checkPWAStatus() {
    if(window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
        installPwaBtn.classList.add('hidden');
        pwaStatusText.classList.remove('hidden');
        pwaStatusText.textContent = "A aplicação já está instalada neste dispositivo.";
    } else if(!window.deferredPrompt) {
        installPwaBtn.disabled = true;
        installPwaBtn.classList.add('opacity-50', 'cursor-not-allowed');
        pwaStatusText.classList.remove('hidden');
    }
}

function registerListeners() {
    updateProfileBtn.addEventListener('click', handleUpdateProfile);
    sendPasswordResetBtn.addEventListener('click', handleSendPasswordReset);

    const notificationsToggle = document.getElementById('notificationsToggle');
    if (notificationsToggle) {
        notificationsToggle.addEventListener('change', handleNotificationToggle);
    }

    if (installPwaBtn) {
        installPwaBtn.addEventListener('click', () => {
            if (typeof window.installPWA === 'function') {
                window.installPWA();
            } else if(window.deferredPrompt) {
                window.deferredPrompt.prompt();
            } else {
                showMessage('A instalação já ocorreu ou não é suportada por este navegador.', 'error');
            }
        });
    }
}

function initProfile() {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            await ensureUserDocument(user);
            await loadUserProfile(user.uid);
            updateUI(user);
        } else {
            window.location.href = 'login.html';
        }
    });

    registerListeners();
}

// Verifica o PWA assim que possível
window.addEventListener('beforeinstallprompt', () => {
    if(installPwaBtn) {
        installPwaBtn.disabled = false;
        installPwaBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        pwaStatusText.classList.add('hidden');
    }
});

document.addEventListener('DOMContentLoaded', initProfile);
