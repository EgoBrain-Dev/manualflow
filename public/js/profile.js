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
const displayNameInput = document.getElementById('displayName');
const displayEmailInput = document.getElementById('displayEmail');
const updateProfileBtn = document.getElementById('updateProfileBtn');
const sendPasswordResetBtn = document.getElementById('sendPasswordResetBtn');
let currentUser = null;
let currentUserDoc = null;

function showMessage(text, type = 'info') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message-fixed ${
        type === 'error' ? 'message-error' :
        type === 'success' ? 'message-success' : 'message-info'
    }`;
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

    profileRole.textContent = currentUserDoc?.role ? currentUserDoc.role.charAt(0).toUpperCase() + currentUserDoc.role.slice(1) : 'Editor';
    profileSince.textContent = currentUserDoc?.createdAt ? new Date(currentUserDoc.createdAt.seconds * 1000).toLocaleDateString('pt-PT') : '-';
    profileStatus.textContent = currentUserDoc?.status || 'Ativa';
    document.body.style.visibility = 'visible';
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

function registerListeners() {
    updateProfileBtn.addEventListener('click', handleUpdateProfile);
    sendPasswordResetBtn.addEventListener('click', handleSendPasswordReset);
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

document.addEventListener('DOMContentLoaded', initProfile);
