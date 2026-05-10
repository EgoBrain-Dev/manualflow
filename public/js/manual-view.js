// Manual View functionality - Visualização e gerenciamento de manual individual
import { 
    auth,
    onAuthStateChanged,
    db,
    doc,
    getDoc,
    collection,
    query,
    where,
    getDocs,
    updateDoc,
    deleteDoc,
    serverTimestamp
} from './firebase-config.js';

// DOM Elements
const messageDiv = document.getElementById('message');
const userInitial = document.getElementById('userInitial');
const userName = document.getElementById('userName');

// Manual details
const manualTitle = document.getElementById('manualTitle');
const manualDescription = document.getElementById('manualDescription');
const manualAuthor = document.getElementById('manualAuthor');
const manualVersion = document.getElementById('manualVersion');
const manualCreatedAt = document.getElementById('manualCreatedAt');
const manualCategory = document.getElementById('manualCategory');
const manualTags = document.getElementById('manualTags');
const statusBadge = document.getElementById('statusBadge');

// File info
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');

// Action buttons
const downloadBtn = document.getElementById('downloadBtn');
const editBtn = document.getElementById('editBtn');
const reviewBtn = document.getElementById('reviewBtn');
const deleteBtn = document.getElementById('deleteBtn');
const previewBtn = document.getElementById('previewBtn');

// Modal elements
const previewModal = document.getElementById('previewModal');
const closePreviewBtn = document.getElementById('closePreviewBtn');
const pdfViewer = document.getElementById('pdfViewer');
const htmlViewer = document.getElementById('htmlViewer');
const confirmModal = document.getElementById('confirmModal');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

// Compare Modal
const compareModal = document.getElementById('compareModal');
const closeCompareBtn = document.getElementById('closeCompareBtn');
const compareBaseVersion = document.getElementById('compareBaseVersion');
const compareNewVersion = document.getElementById('compareNewVersion');
const compareBaseContent = document.getElementById('compareBaseContent');
const compareNewContent = document.getElementById('compareNewContent');

// Versions and reviews
const versionsHistory = document.getElementById('versionsHistory');
const reviewsSection = document.getElementById('reviewsSection');
const reviewsList = document.getElementById('reviewsList');

// State
let currentUser = null;
let currentManual = null;
let currentManualId = null;
let isOwner = false;
let allVersions = [];

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
        }, 5000);
    }
}

function showPage() {
    document.body.style.visibility = 'visible';
}

// Formatar data
function formatDate(timestamp) {
    if (!timestamp) return '-';
    
    try {
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('pt-PT');
    } catch (error) {
        return '-';
    }
}

// Formatar tamanho do arquivo
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Obter status badge
function getStatusBadge(status) {
    const badges = {
        'draft': 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
        'review': 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
        'approved': 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
        'rejected': 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
        'published': 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
    };

    const labels = {
        'draft': 'Rascunho',
        'review': 'Em Revisão',
        'approved': 'Aprovado',
        'rejected': 'Rejeitado',
        'published': 'Publicado'
    };

    return {
        class: badges[status] || badges['draft'],
        label: labels[status] || status
    };
}

// Carregar manual
async function loadManual() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        currentManualId = urlParams.get('id');

        if (!currentManualId) {
            throw new Error('Manual não especificado.');
        }

        const manualDoc = await getDoc(doc(db, 'manuals', currentManualId));
        if (!manualDoc.exists()) {
            throw new Error('Manual não encontrado.');
        }

        currentManual = manualDoc.data();
        currentManual.id = manualDoc.id;
        isOwner = currentManual.author === currentUser.uid;

        // Preencher dados
        manualTitle.textContent = currentManual.title || '-';
        manualDescription.textContent = currentManual.description || '-';
        manualAuthor.textContent = currentManual.authorName || 'Desconhecido';
        manualVersion.textContent = currentManual.version || '-';
        manualCreatedAt.textContent = formatDate(currentManual.createdAt);
        manualCategory.textContent = currentManual.category || '-';

        // Tags
        if (currentManual.tags && currentManual.tags.length > 0) {
            manualTags.innerHTML = currentManual.tags
                .map(tag => `<span class="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm">${tag}</span>`)
                .join('');
        }

        // Status badge
        const badge = getStatusBadge(currentManual.status);
        statusBadge.className = badge.class + ' px-3 py-1 rounded-full text-sm font-medium';
        statusBadge.textContent = badge.label;

        // Arquivo
        fileName.textContent = currentManual.fileName || 'Ficheiro';
        fileSize.textContent = formatFileSize(currentManual.fileSize || 0);

        // Botões de ação
        if (isOwner) {
            if (currentManual.status === 'draft' || currentManual.status === 'rejected') {
                editBtn.style.display = 'flex';
            }
            deleteBtn.style.display = 'flex';
        }

        if (currentManual.status === 'draft' && isOwner) {
            reviewBtn.style.display = 'flex';
        }

        // Carregar versões
        await loadVersions();

        // Se estiver em revisão, mostrar seção de revisões
        if (currentManual.status === 'review') {
            reviewsSection.style.display = 'block';
            await loadReviews();
        }

        showPage();
    } catch (error) {
        console.error('Erro ao carregar manual:', error);
        showMessage(error.message || 'Erro ao carregar manual.');
        setTimeout(() => window.location.href = 'index.html', 2000);
    }
}

// Carregar versões do manual
async function loadVersions() {
    try {
        const versionsQuery = query(
            collection(db, 'versions'),
            where('manualId', '==', currentManualId)
        );
        const versionsSnap = await getDocs(versionsQuery);

        if (versionsSnap.empty) {
            versionsHistory.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center py-4">Nenhuma versão registrada</p>';
            return;
        }

        // Armazenar e ordenar versões por data decrescente
        allVersions = versionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        allVersions.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());

        versionsHistory.innerHTML = allVersions.map((version, index) => {
            const hasPrevious = index < allVersions.length - 1;
            const prevVersionId = hasPrevious ? allVersions[index + 1].id : null;
            
            return `
                <div class="flex items-center justify-between p-4 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <div class="flex-1">
                        <div class="flex items-center gap-2">
                            <p class="font-medium text-gray-900 dark:text-white">v${version.versionNumber}</p>
                            ${index === 0 ? '<span class="text-xs bg-green-100 text-green-800 px-2 rounded-full">Atual</span>' : ''}
                        </div>
                        <p class="text-sm font-semibold mt-1">"${version.commitMessage || 'Upload de nova versão'}"</p>
                        <p class="text-sm text-gray-600 dark:text-gray-400">por ${version.createdByName || 'Desconhecido'}</p>
                        <p class="text-xs text-gray-500 dark:text-gray-500 mt-1">${formatDate(version.createdAt)}</p>
                    </div>
                    <div class="flex gap-2">
                        ${hasPrevious ? `
                        <button onclick="window.handleCompare('${prevVersionId}', '${version.id}')" class="inline-flex items-center px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 rounded text-sm font-medium">
                            <i class="fas fa-columns mr-1"></i> Comparar
                        </button>` : ''}
                        <a href="${version.fileUrl}" target="_blank" class="inline-flex items-center px-3 py-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded text-sm font-medium">
                            <i class="fas fa-download mr-1"></i> Descarregar
                        </a>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Erro ao carregar versões:', error);
        versionsHistory.innerHTML = '<p class="text-red-500 dark:text-red-400 text-center py-4">Erro ao carregar versões</p>';
    }
}

// Carregar revisões
async function loadReviews() {
    try {
        // Placeholder para revisões
        reviewsList.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center py-4">Nenhuma revisão ainda</p>';
    } catch (error) {
        console.error('Erro ao carregar revisões:', error);
    }
}

// Download do manual
function handleDownload() {
    if (!currentManual || !currentManual.fileUrl) {
        showMessage('URL do ficheiro não disponível.');
        return;
    }

    const link = document.createElement('a');
    link.href = currentManual.fileUrl;
    link.download = currentManual.fileName || 'manual.pdf';
    link.target = '_blank';
    link.click();
}

// Pré-visualizar
window.handlePreview = function() {
    if (!currentManual || !currentManual.fileUrl) {
        showMessage('URL do ficheiro não disponível.');
        return;
    }

    previewModal.classList.remove('hidden');
    
    // Obter o ID da versão atual para pegar o HTML, se houver
    const currentVersion = allVersions.find(v => v.id === currentManual.currentVersionId);
    
    if (currentVersion && currentVersion.inputType === 'editor' && currentVersion.contentHtml) {
        pdfViewer.classList.add('hidden');
        htmlViewer.classList.remove('hidden');
        htmlViewer.innerHTML = currentVersion.contentHtml;
    } else {
        htmlViewer.classList.add('hidden');
        pdfViewer.classList.remove('hidden');
        
        if (currentManual.fileUrl) {
            // Usa o visualizador do Google Docs para garantir que PDFs e Docs são renderizados na página sem forçar download
            pdfViewer.src = `https://docs.google.com/gview?url=${encodeURIComponent(currentManual.fileUrl)}&embedded=true`;
        } else {
            pdfViewer.src = '';
        }
    }
}

window.closePreview = function() {
    previewModal.classList.add('hidden');
    pdfViewer.src = '';
    htmlViewer.innerHTML = '';
}

window.handleCompare = function(baseVersionId, newVersionId) {
    const baseV = allVersions.find(v => v.id === baseVersionId);
    const newV = allVersions.find(v => v.id === newVersionId);
    
    if (!baseV || !newV) return;

    compareBaseVersion.textContent = 'v' + baseV.versionNumber;
    compareNewVersion.textContent = 'v' + newV.versionNumber;

    if (baseV.inputType === 'editor' && newV.inputType === 'editor') {
        compareBaseContent.innerHTML = baseV.contentHtml || 'Sem conteúdo';
        compareNewContent.innerHTML = newV.contentHtml || 'Sem conteúdo';
    } else {
        compareBaseContent.innerHTML = `<p class="text-center mt-10 text-gray-500">Visualização lado a lado de ficheiros (PDF/Doc) ainda não suportada nativamente.<br><br><a href="${baseV.fileUrl}" target="_blank" class="text-blue-500 hover:underline">Baixar versão Base</a></p>`;
        compareNewContent.innerHTML = `<p class="text-center mt-10 text-gray-500">Visualização lado a lado de ficheiros (PDF/Doc) ainda não suportada nativamente.<br><br><a href="${newV.fileUrl}" target="_blank" class="text-blue-500 hover:underline">Baixar versão Nova</a></p>`;
    }

    compareModal.classList.remove('hidden');
}

window.closeCompare = function() {
    compareModal.classList.add('hidden');
}

// Editar manual
function handleEdit() {
    if (isOwner && currentManualId) {
        window.location.href = `upload.html?manualId=${currentManualId}`;
    }
}

// Enviar para revisão
function handleReview() {
    if (isOwner && currentManualId) {
        window.location.href = `manual-review.html?id=${currentManualId}`;
    }
}

// Eliminar manual
function handleDeleteClick() {
    confirmModal.classList.remove('hidden');
}

function closeDeleteConfirm() {
    confirmModal.classList.add('hidden');
}

async function confirmDelete() {
    try {
        if (!isOwner || !currentManualId) {
            throw new Error('Sem permissão para eliminar este manual.');
        }

        closeDeleteConfirm();
        showMessage('Eliminando manual...', 'info');

        // Eliminar manual
        await deleteDoc(doc(db, 'manuals', currentManualId));

        // Eliminar versões associadas
        const versionsQuery = query(
            collection(db, 'versions'),
            where('manualId', '==', currentManualId)
        );
        const versionsSnap = await getDocs(versionsQuery);
        for (const versionDoc of versionsSnap.docs) {
            await deleteDoc(versionDoc.ref);
        }

        showMessage('Manual eliminado com sucesso!', 'success');
        setTimeout(() => window.location.href = 'index.html', 1500);
    } catch (error) {
        console.error('Erro ao eliminar manual:', error);
        showMessage(error.message || 'Erro ao eliminar manual.');
    }
}

// Update user info
function updateUserInfo(user) {
    if (user) {
        const firstLetter = (user.displayName || user.email).charAt(0).toUpperCase();
        userInitial.textContent = firstLetter;
        userName.textContent = user.displayName || user.email.split('@')[0];
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            updateUserInfo(user);
            await loadManual();
        } else {
            window.location.href = 'login.html';
        }
    });

    // Event listeners
    downloadBtn.addEventListener('click', handleDownload);
    previewBtn.addEventListener('click', window.handlePreview);
    closePreviewBtn.addEventListener('click', window.closePreview);
    if(closeCompareBtn) closeCompareBtn.addEventListener('click', window.closeCompare);
    editBtn.addEventListener('click', handleEdit);
    reviewBtn.addEventListener('click', handleReview);
    deleteBtn.addEventListener('click', handleDeleteClick);
    cancelDeleteBtn.addEventListener('click', closeDeleteConfirm);
    confirmDeleteBtn.addEventListener('click', confirmDelete);
});
