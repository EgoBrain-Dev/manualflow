// Manual Review functionality - Sistema completo de revisão
import { 
    auth,
    onAuthStateChanged,
    db,
    collection,
    getDocs,
    getDoc,
    doc,
    updateDoc,
    addDoc,
    serverTimestamp,
    query,
    where,
    orderBy,
    storage,
    ref,
    getDownloadURL
} from './firebase-config.js';

// DOM Elements
const messageDiv = document.getElementById('message');
const userInitial = document.getElementById('userInitial');
const userName = document.getElementById('userName');
const loadingManual = document.getElementById('loadingManual');
const reviewContent = document.getElementById('reviewContent');
const errorState = document.getElementById('errorState');

// Manual Info Elements
const manualTitle = document.getElementById('manualTitle');
const authorName = document.getElementById('authorName');
const manualVersion = document.getElementById('manualVersion');
const manualCategory = document.getElementById('manualCategory');
const manualDescription = document.getElementById('manualDescription');
const manualTags = document.getElementById('manualTags');
const tagsContainer = document.getElementById('tagsContainer');
const downloadManual = document.getElementById('downloadManual');

// Review Elements
const reviewForm = document.getElementById('reviewForm');
const reviewProgress = document.getElementById('reviewProgress');
const progressBar = document.getElementById('progressBar');
const reviewTime = document.getElementById('reviewTime');
const commentsCount = document.getElementById('commentsCount');
const previousComments = document.getElementById('previousComments');
const reviewHistory = document.getElementById('reviewHistory');

// File Preview
const filePreview = document.getElementById('filePreview');
const pdfViewer = document.getElementById('pdfViewer');
const pdfFrame = document.getElementById('pdfFrame');
const fileInfo = document.getElementById('fileInfo');

// Modal Elements
const confirmModal = document.getElementById('confirmModal');
const confirmMessage = document.getElementById('confirmMessage');
const confirmCancel = document.getElementById('confirmCancel');
const confirmSubmit = document.getElementById('confirmSubmit');

// State
let currentUser = null;
let currentManual = null;
let currentReview = null;
let reviewStartTime = null;
let reviewTimer = null;

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

// Formatar data
function formatDate(timestamp) {
    if (!timestamp) return '-';
    
    try {
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('pt-PT', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        return '-';
    }
}

// Formatar tempo decorrido
function formatElapsedTime(startTime) {
    const now = new Date();
    const diffMs = now - startTime;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    
    if (diffMins < 60) {
        return `${diffMins} min`;
    } else {
        return `${diffHours}h ${diffMins % 60}min`;
    }
}

// Iniciar timer de revisão
function startReviewTimer() {
    reviewStartTime = new Date();
    reviewTimer = setInterval(() => {
        reviewTime.textContent = formatElapsedTime(reviewStartTime);
    }, 60000); // Atualizar a cada minuto
}

// Parar timer de revisão
function stopReviewTimer() {
    if (reviewTimer) {
        clearInterval(reviewTimer);
        reviewTimer = null;
    }
}

// Carregar manual do Firestore
async function loadManual(manualId) {
    try {
        if (!currentUser) return;

        // Buscar manual
        const manualDoc = await getDoc(doc(db, 'manuals', manualId));
        
        if (!manualDoc.exists()) {
            throw new Error('Manual não encontrado');
        }

        currentManual = {
            id: manualDoc.id,
            ...manualDoc.data()
        };

        // Verificar se o usuário é revisor deste manual
        if (!currentManual.reviewers?.includes(currentUser.uid)) {
            throw new Error('Não tem permissão para rever este manual');
        }

        // Buscar revisão existente ou criar nova
        await loadOrCreateReview(manualId);
        
        // Atualizar UI
        updateManualUI();
        await loadFilePreview();
        await loadPreviousReviews();
        await loadReviewHistory();

        // Iniciar timer se for uma nova revisão
        if (!currentReview.submittedAt) {
            startReviewTimer();
        }

        loadingManual.classList.add('hidden');
        reviewContent.classList.remove('hidden');

    } catch (error) {
        console.error('Erro ao carregar manual:', error);
        loadingManual.classList.add('hidden');
        errorState.classList.remove('hidden');
        showMessage('Erro ao carregar manual: ' + error.message);
    }
}

// Carregar ou criar revisão
async function loadOrCreateReview(manualId) {
    const reviewsQuery = query(
        collection(db, 'reviews'),
        where('manualId', '==', manualId),
        where('reviewerId', '==', currentUser.uid)
    );

    const querySnapshot = await getDocs(reviewsQuery);
    
    if (!querySnapshot.empty) {
        // Revisão existente
        const reviewDoc = querySnapshot.docs[0];
        currentReview = {
            id: reviewDoc.id,
            ...reviewDoc.data()
        };
    } else {
        // Nova revisão
        const reviewData = {
            manualId: manualId,
            manualTitle: currentManual.title,
            reviewerId: currentUser.uid,
            reviewerName: currentUser.displayName || currentUser.email.split('@')[0],
            status: 'in_progress',
            feedback: '',
            actionPoints: '',
            assessment: '',
            comments: [],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            timeSpent: 0
        };

        const docRef = await addDoc(collection(db, 'reviews'), reviewData);
        currentReview = {
            id: docRef.id,
            ...reviewData
        };
    }
}

// Atualizar UI do manual
function updateManualUI() {
    manualTitle.textContent = currentManual.title;
    authorName.textContent = currentManual.authorName;
    manualVersion.textContent = currentManual.version || 'v1.0';
    manualCategory.textContent = currentManual.category ? 
        currentManual.category.charAt(0).toUpperCase() + currentManual.category.slice(1) : '-';
    manualDescription.textContent = currentManual.description || 'Sem descrição';

    // Tags
    if (currentManual.tags && currentManual.tags.length > 0) {
        manualTags.innerHTML = currentManual.tags.map(tag => 
            `<span class="tag">${tag}</span>`
        ).join('');
    } else {
        tagsContainer.classList.add('hidden');
    }

    // Link de download
    if (currentManual.fileUrl && currentManual.fileUrl !== 'pending') {
        downloadManual.href = currentManual.fileUrl;
        downloadManual.classList.remove('hidden');
    }
}

// Carregar pré-visualização do arquivo
async function loadFilePreview() {
    if (currentManual.fileUrl && currentManual.fileUrl !== 'pending') {
        fileInfo.textContent = `${currentManual.fileName} • ${formatFileSize(currentManual.fileSize)}`;
        
        // Se for PDF, mostrar no iframe
        if (currentManual.fileType === 'application/pdf') {
            filePreview.classList.add('hidden');
            pdfViewer.classList.remove('hidden');
            pdfFrame.src = currentManual.fileUrl;
        } else {
            // Para outros tipos, mostrar informação do arquivo
            filePreview.innerHTML = `
                <i class="fas fa-file-${getFileIcon(currentManual.fileType)} text-gray-400 text-4xl mb-4"></i>
                <p class="text-gray-500">${currentManual.fileName}</p>
                <p class="text-sm text-gray-400 mt-2">${formatFileSize(currentManual.fileSize)} • ${getFileTypeName(currentManual.fileType)}</p>
                <a href="${currentManual.fileUrl}" target="_blank" class="btn-secondary mt-4 inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                    <i class="fas fa-external-link-alt mr-2"></i>
                    Abrir em nova janela
                </a>
            `;
        }
    }
}

// Utilitários de arquivo
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFileIcon(fileType) {
    const iconMap = {
        'application/pdf': 'pdf',
        'application/msword': 'word',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'word',
        'text/plain': 'alt'
    };
    return iconMap[fileType] || 'file';
}

function getFileTypeName(fileType) {
    const typeMap = {
        'application/pdf': 'PDF',
        'application/msword': 'Documento Word',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Documento Word',
        'text/plain': 'Texto'
    };
    return typeMap[fileType] || 'Documento';
}

// Carregar revisões anteriores
async function loadPreviousReviews() {
    try {
        const reviewsQuery = query(
            collection(db, 'reviews'),
            where('manualId', '==', currentManual.id),
            where('status', 'in', ['approved', 'rejected']),
            orderBy('updatedAt', 'desc')
        );

        const querySnapshot = await getDocs(reviewsQuery);
        
        if (querySnapshot.empty) {
            return;
        }

        previousComments.innerHTML = '';
        
        querySnapshot.forEach(doc => {
            const review = doc.data();
            const reviewItem = document.createElement('div');
            reviewItem.className = `comment-item ${review.reviewerId === currentUser.uid ? 'reviewer' : ''} mb-4 p-4 rounded-lg`;
            reviewItem.innerHTML = `
                <div class="flex justify-between items-start mb-2">
                    <div class="font-medium text-gray-900">${review.reviewerName}</div>
                    <div class="text-sm text-gray-500">${formatDate(review.updatedAt)}</div>
                </div>
                <div class="text-sm text-gray-700 mb-2">
                    <span class="status-badge status-${review.status}">
                        ${review.status === 'approved' ? 'Aprovado' : 'Rejeitado'}
                    </span>
                </div>
                <div class="text-gray-600">${review.feedback}</div>
                ${review.actionPoints ? `
                <div class="mt-3 p-3 bg-yellow-50 rounded-lg">
                    <div class="font-medium text-yellow-800 text-sm mb-1">Pontos de Ação:</div>
                    <div class="text-yellow-700 text-sm">${review.actionPoints}</div>
                </div>
                ` : ''}
            `;
            previousComments.appendChild(reviewItem);
        });

    } catch (error) {
        console.error('Erro ao carregar revisões anteriores:', error);
    }
}

// Carregar histórico de revisões
async function loadReviewHistory() {
    try {
        const reviewsQuery = query(
            collection(db, 'reviews'),
            where('manualId', '==', currentManual.id),
            orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(reviewsQuery);
        
        if (querySnapshot.empty) {
            return;
        }

        reviewHistory.innerHTML = '';
        
        querySnapshot.forEach(doc => {
            const review = doc.data();
            const historyItem = document.createElement('div');
            historyItem.className = `review-history-item ${review.status} mb-3`;
            historyItem.innerHTML = `
                <div class="flex justify-between">
                    <div class="font-medium text-gray-900 text-sm">${review.reviewerName}</div>
                    <div class="text-xs text-gray-500">${formatDate(review.updatedAt)}</div>
                </div>
                <div class="text-sm text-gray-600 mt-1">
                    ${review.status === 'approved' ? 'Aprovou o manual' : 
                      review.status === 'rejected' ? 'Rejeitou o manual' : 
                      'Revisão em progresso'}
                </div>
            `;
            reviewHistory.appendChild(historyItem);
        });

    } catch (error) {
        console.error('Erro ao carregar histórico:', error);
    }
}

// Atualizar progresso da revisão
function updateReviewProgress() {
    let progress = 0;
    
    // Avaliação selecionada: 50%
    const assessmentSelected = document.querySelector('input[name="assessment"]:checked');
    if (assessmentSelected) progress += 50;
    
    // Feedback preenchido: 50%
    const feedback = document.getElementById('feedback').value.trim();
    if (feedback.length > 50) progress += 50;
    
    reviewProgress.textContent = `${progress}%`;
    progressBar.style.width = `${progress}%`;
    
    // Atualizar contador de comentários
    const wordCount = feedback.split(/\s+/).filter(word => word.length > 0).length;
    commentsCount.textContent = wordCount;
}

// Submeter revisão
async function submitReview(assessment, feedback, actionPoints) {
    try {
        // Atualizar revisão
        const reviewData = {
            status: assessment,
            feedback: feedback,
            actionPoints: actionPoints,
            assessment: assessment,
            submittedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            timeSpent: Math.floor((new Date() - reviewStartTime) / 60000) // minutos
        };

        await updateDoc(doc(db, 'reviews', currentReview.id), reviewData);

        // Atualizar status do manual
        const manualData = {
            status: assessment === 'approved' ? 'approved' : 'rejected',
            updatedAt: serverTimestamp()
        };

        await updateDoc(doc(db, 'manuals', currentManual.id), manualData);

        // Registrar atividade
        await logActivity(assessment);

        // Parar timer
        stopReviewTimer();

        showMessage(`Revisão ${assessment === 'approved' ? 'aprovada' : 'rejeitada'} com sucesso!`, 'success');

        // Redirecionar após sucesso
        setTimeout(() => {
            window.location.href = 'review-dashboard.html';
        }, 2000);

    } catch (error) {
        console.error('Erro ao submeter revisão:', error);
        throw new Error('Erro ao submeter revisão: ' + error.message);
    }
}

// Registrar atividade
async function logActivity(assessment) {
    try {
        const activityData = {
            userId: currentUser.uid,
            userName: currentUser.displayName || currentUser.email.split('@')[0],
            action: assessment === 'approved' ? 'approve' : 'reject',
            target: currentManual.title,
            targetId: currentManual.id,
            targetType: 'manual',
            timestamp: serverTimestamp(),
            details: {
                manualAuthor: currentManual.authorName,
                assessment: assessment
            }
        };

        await addDoc(collection(db, 'activities'), activityData);
    } catch (error) {
        console.error('Erro ao registrar atividade:', error);
    }
}

// Event Listeners
function setupEventListeners() {
    // Atualizar progresso em tempo real
    document.getElementById('feedback').addEventListener('input', updateReviewProgress);
    
    document.querySelectorAll('input[name="assessment"]').forEach(radio => {
        radio.addEventListener('change', updateReviewProgress);
    });

    // Submissão do formulário
    reviewForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const assessment = document.querySelector('input[name="assessment"]:checked');
        const feedback = document.getElementById('feedback').value.trim();
        const actionPoints = document.getElementById('actionPoints').value.trim();

        if (!assessment) {
            showMessage('Por favor, selecione uma avaliação (Aprovar ou Rejeitar).');
            return;
        }

        if (!feedback || feedback.length < 50) {
            showMessage('Por favor, forneça feedback detalhado (mínimo 50 caracteres).');
            return;
        }

        // Mostrar modal de confirmação
        confirmMessage.textContent = `Tem a certeza que deseja ${assessment.value === 'approved' ? 'aprovar' : 'rejeitar'} este manual?`;
        confirmModal.classList.remove('hidden');
        
        // Configurar ação de confirmação
        confirmSubmit.onclick = async () => {
            confirmSubmit.disabled = true;
            confirmSubmit.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Submetendo...';
            
            try {
                await submitReview(assessment.value, feedback, actionPoints);
            } catch (error) {
                showMessage(error.message);
                confirmSubmit.disabled = false;
                confirmSubmit.textContent = 'Submeter';
            }
        };
    });

    // Guardar rascunho
    document.getElementById('saveDraft').addEventListener('click', async () => {
        const feedback = document.getElementById('feedback').value.trim();
        const actionPoints = document.getElementById('actionPoints').value.trim();
        const assessment = document.querySelector('input[name="assessment"]:checked');

        try {
            const reviewData = {
                feedback: feedback,
                actionPoints: actionPoints,
                assessment: assessment?.value || '',
                updatedAt: serverTimestamp()
            };

            await updateDoc(doc(db, 'reviews', currentReview.id), reviewData);
            showMessage('Rascunho guardado com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao guardar rascunho:', error);
            showMessage('Erro ao guardar rascunho.');
        }
    });

    // Modal
    confirmCancel.addEventListener('click', () => {
        confirmModal.classList.add('hidden');
        confirmSubmit.disabled = false;
        confirmSubmit.textContent = 'Submeter';
    });

    confirmModal.addEventListener('click', (e) => {
        if (e.target === confirmModal) {
            confirmModal.classList.add('hidden');
            confirmSubmit.disabled = false;
            confirmSubmit.textContent = 'Submeter';
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !confirmModal.classList.contains('hidden')) {
            confirmModal.classList.add('hidden');
            confirmSubmit.disabled = false;
            confirmSubmit.textContent = 'Submeter';
        }
    });
}

// Initialize review page
function initReview() {
    // Get manual ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const manualId = urlParams.get('id');

    if (!manualId) {
        showMessage('ID do manual não especificado.');
        errorState.classList.remove('hidden');
        loadingManual.classList.add('hidden');
        return;
    }

    // Check authentication
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            updateUserInterface(user);
            loadManual(manualId);
        } else {
            window.location.href = 'login.html';
        }
    });

    setupEventListeners();
}

// Update user interface
function updateUserInterface(user) {
    const displayName = user.displayName || user.email.split('@')[0];
    const initial = displayName.charAt(0).toUpperCase();
    
    userInitial.textContent = initial;
    userName.textContent = displayName;
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initReview);