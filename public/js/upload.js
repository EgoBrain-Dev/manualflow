// Upload functionality - Sistema completo de carregamento de manuais
import { 
    auth,
    onAuthStateChanged,
    db,
    collection,
    addDoc,
    serverTimestamp,
    storage,
    ref,
    uploadBytesResumable,
    getDownloadURL
} from './firebase-config.js';

// DOM Elements
const uploadForm = document.getElementById('uploadForm');
const messageDiv = document.getElementById('message');
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const removeFile = document.getElementById('removeFile');
const isPublicCheckbox = document.getElementById('isPublic');
const privateSettings = document.getElementById('privateSettings');
const userInitial = document.getElementById('userInitial');
const userName = document.getElementById('userName');

// State
let currentUser = null;
let selectedFile = null;
let uploadTask = null;

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

// Função para mostrar loading
function setLoading(isLoading) {
    const submitBtn = uploadForm.querySelector('button[type="submit"]');
    
    if (isLoading) {
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Carregando...';
    } else {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-upload mr-2"></i>Carregar Manual';
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

// Validar arquivo
function validateFile(file) {
    const allowedTypes = ['application/pdf', 'application/msword', 
                         'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
                         'text/plain'];
    const maxSize = 50 * 1024 * 1024; // 50MB

    if (!allowedTypes.includes(file.type)) {
        showMessage('Tipo de arquivo não suportado. Use PDF, DOC, DOCX ou TXT.');
        return false;
    }

    if (file.size > maxSize) {
        showMessage('Arquivo muito grande. O tamanho máximo é 50MB.');
        return false;
    }

    return true;
}

// Manipular seleção de arquivo
function handleFileSelect(file) {
    if (!validateFile(file)) return;

    selectedFile = file;
    
    // Atualizar UI
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);
    fileInfo.classList.remove('hidden');
    dropzone.classList.add('hidden');
}

// Upload para Firebase Storage
async function uploadToStorage(file, manualId) {
    return new Promise((resolve, reject) => {
        const storageRef = ref(storage, `manuals/${manualId}/${file.name}`);
        
        uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on('state_changed',
            (snapshot) => {
                // Progresso do upload (opcional - podemos adicionar uma barra de progresso)
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                console.log('Upload progress: ' + progress + '%');
            },
            (error) => {
                reject(error);
            },
            async () => {
                // Upload completo
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                resolve(downloadURL);
            }
        );
    });
}

// Salvar dados no Firestore
async function saveToFirestore(manualData, fileUrl) {
    const manualDoc = {
        ...manualData,
        fileUrl: fileUrl,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        fileType: selectedFile.type,
        updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'manuals'), manualDoc);
    return docRef.id;
}

// Registrar atividade
async function logActivity(manualId, manualTitle) {
    try {
        const activityData = {
            userId: currentUser.uid,
            userName: currentUser.displayName || currentUser.email.split('@')[0],
            action: 'upload',
            target: manualTitle,
            targetId: manualId,
            targetType: 'manual',
            timestamp: serverTimestamp(),
            details: {
                version: document.getElementById('version').value,
                fileType: selectedFile.type
            }
        };

        await addDoc(collection(db, 'activities'), activityData);
    } catch (error) {
        console.error('Erro ao registrar atividade:', error);
    }
}

// Processar formulário de upload
async function handleUpload(e) {
    e.preventDefault();

    if (!selectedFile) {
        showMessage('Por favor, selecione um arquivo.');
        return;
    }

    if (!currentUser) {
        showMessage('Sessão expirada. Por favor, faça login novamente.');
        window.location.href = 'login.html';
        return;
    }

    setLoading(true);

    try {
        // Preparar dados do manual
        const manualData = {
            title: document.getElementById('title').value.trim(),
            description: document.getElementById('description').value.trim(),
            version: document.getElementById('version').value.trim(),
            category: document.getElementById('category').value,
            tags: document.getElementById('tags').value
                .split(',')
                .map(tag => tag.trim())
                .filter(tag => tag.length > 0),
            author: currentUser.uid,
            authorName: currentUser.displayName || currentUser.email.split('@')[0],
            status: 'draft',
            isPublic: document.getElementById('isPublic').checked,
            allowedUsers: document.getElementById('isPublic').checked ? 
                [] : document.getElementById('allowedUsers').value
                    .split(',')
                    .map(email => email.trim())
                    .filter(email => email.length > 0),
            reviewers: [],
            currentReviewer: '',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        // Validar dados obrigatórios
        if (!manualData.title) {
            throw new Error('O título é obrigatório.');
        }

        if (!manualData.version) {
            throw new Error('A versão é obrigatória.');
        }

        // Criar documento no Firestore primeiro para obter ID
        const tempManualRef = await addDoc(collection(db, 'manuals'), {
            ...manualData,
            fileUrl: 'pending', // Placeholder
            fileName: selectedFile.name,
            fileSize: selectedFile.size,
            fileType: selectedFile.type
        });

        // Fazer upload do arquivo
        const fileUrl = await uploadToStorage(selectedFile, tempManualRef.id);

        // Atualizar documento com URL real
        await saveToFirestore(manualData, fileUrl);

        // Registrar atividade
        await logActivity(tempManualRef.id, manualData.title);

        showMessage('✅ Manual carregado com sucesso!', 'success');

        // Redirecionar para dashboard após sucesso
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);

    } catch (error) {
        console.error('Erro no upload:', error);
        
        let errorMessage = 'Erro ao carregar manual. Tente novamente.';
        
        switch (error.code) {
            case 'storage/unauthorized':
                errorMessage = 'Sem permissão para fazer upload.';
                break;
            case 'storage/canceled':
                errorMessage = 'Upload cancelado.';
                break;
            case 'storage/unknown':
                errorMessage = 'Erro desconhecido no upload.';
                break;
            case 'permission-denied':
                errorMessage = 'Permissão negada. Contacte o administrador.';
                break;
            default:
                if (error.message) {
                    errorMessage = error.message;
                }
        }
        
        showMessage(errorMessage);
    } finally {
        setLoading(false);
    }
}

// Event Listeners
function setupEventListeners() {
    // Form submission
    uploadForm.addEventListener('submit', handleUpload);

    // File input change
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
        }
    });

    // Dropzone click
    dropzone.addEventListener('click', () => {
        fileInput.click();
    });

    // Drag and drop
    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        
        if (e.dataTransfer.files.length > 0) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    });

    // Remove file
    removeFile.addEventListener('click', () => {
        selectedFile = null;
        fileInfo.classList.add('hidden');
        dropzone.classList.remove('hidden');
        fileInput.value = '';
    });

    // Public/private toggle
    isPublicCheckbox.addEventListener('change', () => {
        if (isPublicCheckbox.checked) {
            privateSettings.classList.add('hidden');
        } else {
            privateSettings.classList.remove('hidden');
        }
    });
}

// Initialize upload page
function initUpload() {
    // Check authentication
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            updateUserInterface(user);
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
document.addEventListener('DOMContentLoaded', initUpload);

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        handleFileSelect,
        validateFile,
        formatFileSize,
        handleUpload
    };
}