// Upload functionality - Cloudinary + Firestore
import { 
    auth,
    onAuthStateChanged,
    db,
    collection,
    addDoc,
    updateDoc,
    doc,
    getDoc,
    setDoc,
    serverTimestamp
} from './firebase-config.js';

// Cloudinary Config
const CLOUDINARY_CLOUD_NAME = 'dgdxox5ty';
const CLOUDINARY_UPLOAD_PRESET = 'dgdxox5ty';


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
const uploadPageTitle = document.getElementById('uploadPageTitle');
const uploadPageSubtitle = document.getElementById('uploadPageSubtitle');
const reviewersInput = document.getElementById('reviewers');

let editingManualId = null;

// State
let currentUser = null;
let selectedFile = null;
let uploadTask = null;
let currentManualReviewers = [];
let quillEditor = null;

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

// Função para gerar descrição com IA
async function generateDescriptionWithAI() {
    const title = document.getElementById('title').value.trim();
    const category = document.getElementById('category').value;
    
    if (!title) {
        showMessage('Por favor, insira um título primeiro.');
        return;
    }

    const generateBtn = document.getElementById('generateDescriptionBtn');
    const originalText = generateBtn.innerHTML;
    generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>Gerando...';
    generateBtn.disabled = true;

    try {
        // Using a simple prompt for OpenAI (you'll need to set up your API key)
        const prompt = `Gere uma descrição concisa e profissional para um manual com o título "${title}" na categoria "${category}". A descrição deve ter no máximo 150 caracteres e destacar os principais benefícios ou conteúdo esperado.`;

        // For demo purposes, using a mock response. In production, integrate with OpenAI API
        const mockResponse = await mockOpenAIRequest(prompt);
        
        document.getElementById('description').value = mockResponse;
        showMessage('Descrição gerada com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao gerar descrição:', error);
        showMessage('Erro ao gerar descrição. Tente novamente.');
    } finally {
        generateBtn.innerHTML = originalText;
        generateBtn.disabled = false;
    }
}

// Mock OpenAI request (replace with real API call)
async function mockOpenAIRequest(prompt) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mock responses based on category
    const responses = {
        'operacional': 'Manual abrangente com procedimentos operacionais padronizados, fluxos de trabalho otimizados e melhores práticas para eficiência organizacional.',
        'tecnologia': 'Guia técnico detalhado com configurações, troubleshooting e implementação de soluções tecnológicas para usuários e administradores.',
        'rh': 'Documento essencial contendo políticas de recursos humanos, direitos trabalhistas, benefícios e procedimentos administrativos.',
        'qualidade': 'Manual de controle de qualidade com padrões, auditorias, métricas e processos para garantia da excelência operacional.',
        'seguranca': 'Protocolos de segurança abrangentes incluindo prevenção de riscos, procedimentos de emergência e conformidade regulamentar.',
        'outro': 'Manual informativo com orientações detalhadas, melhores práticas e procedimentos específicos para o tema abordado.'
    };
    
    return responses[document.getElementById('category').value] || responses['outro'];
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

// Upload para Cloudinary com barra de progresso
function uploadToCloudinary(file, manualId, onProgress) {
    return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        formData.append('folder', `manualflow/${manualId}`);
        formData.append('public_id', `${manualId}_${Date.now()}`);

        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable && onProgress) {
                const percent = Math.round((e.loaded / e.total) * 100);
                onProgress(percent);
            }
        });

        xhr.addEventListener('load', () => {
            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);
                resolve(response.secure_url);
            } else {
                const errorData = JSON.parse(xhr.responseText);
                reject(new Error('Erro Cloudinary: ' + (errorData.error?.message || xhr.status)));
            }
        });

        xhr.addEventListener('error', () => reject(new Error('Erro de rede no upload.')));
        xhr.addEventListener('abort', () => reject(new Error('Upload cancelado.')));

        xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/raw/upload`);
        xhr.send(formData);
    });
}

// Mostrar progresso na UI
function updateProgressUI(percent) {
    const submitBtn = uploadForm.querySelector('button[type="submit"]');
    submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i>A carregar... ${percent}%`;
}

// Registrar atividade
async function logActivity(manualId, manualTitle, versionNumber = '') {
    try {
        const activityData = {
            userId: currentUser.uid,
            userName: currentUser.displayName || currentUser.email.split('@')[0],
            action: editingManualId ? 'version_update' : 'upload',
            target: manualTitle,
            targetId: manualId,
            targetType: 'manual',
            timestamp: serverTimestamp(),
            details: {
                version: versionNumber || document.getElementById('version').value,
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

    const inputType = document.getElementById('inputType').value;
    const commitMessage = document.getElementById('commitMessage').value.trim();

    if (inputType === 'file' && !selectedFile) {
        showMessage('Por favor, selecione um arquivo.');
        return;
    }

    if (inputType === 'editor') {
        if (!quillEditor || quillEditor.getText().trim().length === 0) {
            showMessage('O conteúdo do editor não pode estar vazio.');
            return;
        }
    }

    if (!commitMessage) {
        showMessage('A mensagem de commit é obrigatória.');
        return;
    }

    if (!currentUser) {
        showMessage('Sessão expirada. Por favor, faça login novamente.');
        window.location.href = 'login.html';
        return;
    }

    setLoading(true);

    try {
        const reviewers = (document.getElementById('reviewers')?.value || '')
            .split(',')
            .map(item => item.trim().toLowerCase())
            .filter(item => item.length > 0);

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
            status: editingManualId ? 'review' : reviewers.length > 0 ? 'review' : 'draft',
            isPublic: document.getElementById('isPublic').checked,
            allowedUsers: document.getElementById('isPublic').checked ? 
                [] : document.getElementById('allowedUsers').value
                    .split(',')
                    .map(email => email.trim().toLowerCase())
                    .filter(email => email.length > 0),
            reviewers,
            currentReviewer: reviewers.length > 0 ? reviewers[0] : currentUser.uid,
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

        let fileUrl = '';
        let fileName = '';
        let fileSize = 0;
        let fileType = '';
        let contentHtml = '';

        if (inputType === 'file') {
            fileUrl = await uploadToCloudinary(
                selectedFile,
                editingManualId || 'new-manual',
                updateProgressUI
            );
            fileName = selectedFile.name;
            fileSize = selectedFile.size;
            fileType = selectedFile.type;
        } else {
            // É conteúdo do editor
            contentHtml = quillEditor.root.innerHTML;
            fileName = manualData.title + '.html';
            fileType = 'text/html';
            // Criar um Blob com o conteúdo HTML e fazer upload para o Cloudinary para manter a consistência, ou apenas usar o contentHtml
            const blob = new Blob([contentHtml], { type: 'text/html' });
            fileUrl = await uploadToCloudinary(
                blob,
                editingManualId || 'new-manual',
                updateProgressUI
            );
            fileSize = blob.size;
        }

        let manualRef;
        let manualDocId = editingManualId;

        if (editingManualId) {
            manualRef = doc(db, 'manuals', editingManualId);
            await updateDoc(manualRef, {
                status: 'review',
                version: manualData.version,
                fileUrl,
                fileName,
                fileSize,
                fileType,
                reviewers: manualData.reviewers,
                currentReviewer: manualData.currentReviewer,
                updatedAt: serverTimestamp()
            });
        } else {
            const tempManualRef = await addDoc(collection(db, 'manuals'), {
                ...manualData,
                fileUrl,
                fileName,
                fileSize,
                fileType
            });

            manualRef = tempManualRef;
            manualDocId = tempManualRef.id;
        }

        const versionRef = await addDoc(collection(db, 'versions'), {
            manualId: manualDocId,
            fileUrl,
            fileName,
            fileSize,
            fileType,
            contentHtml, // Se for do editor, salvamos o HTML aqui para fácil acesso a diff
            versionNumber: manualData.version,
            commitMessage,
            inputType,
            createdBy: currentUser.uid,
            createdByName: currentUser.displayName || currentUser.email.split('@')[0],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });

        await updateDoc(doc(db, 'manuals', manualDocId), {
            currentVersionId: versionRef.id,
            updatedAt: serverTimestamp()
        });

        await logActivity(manualDocId, manualData.title, manualData.version);

        // Notificar o revisor atual, se existir e for diferente do autor
        try {
            if (manualData.currentReviewer && manualData.currentReviewer !== currentUser.uid) {
                // Assumimos que currentReviewer pode ser o UID do revisor. 
                // Se for email, o ideal seria buscar o UID correspondente.
                await addDoc(collection(db, 'notifications'), {
                    userId: manualData.currentReviewer,
                    message: `Foi-lhe atribuído o manual "${manualData.title}" para revisão.`,
                    type: 'review_request',
                    targetId: manualDocId,
                    read: false,
                    createdAt: serverTimestamp()
                });
            }
        } catch(e) { console.warn('Erro ao criar notificação:', e); }

        showMessage('✅ Manual carregado com sucesso!', 'success');

        setTimeout(() => {
            window.location.href = `manual-view.html?id=${manualDocId}`;
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

    // Generate description with AI
    document.getElementById('generateDescriptionBtn').addEventListener('click', generateDescriptionWithAI);

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

    // Tabs functionality
    const tabUpload = document.getElementById('tab-upload');
    const tabEditor = document.getElementById('tab-editor');
    const uploadSection = document.getElementById('upload-section');
    const editorSection = document.getElementById('editor-section');
    const inputType = document.getElementById('inputType');

    if (tabUpload && tabEditor) {
        tabUpload.addEventListener('click', () => {
            uploadSection.classList.remove('hidden');
            editorSection.classList.add('hidden');
            inputType.value = 'file';
            
            tabUpload.classList.add('text-blue-600', 'border-blue-600', 'active');
            tabUpload.classList.remove('border-transparent', 'hover:text-gray-600', 'hover:border-gray-300');
            
            tabEditor.classList.remove('text-blue-600', 'border-blue-600', 'active');
            tabEditor.classList.add('border-transparent', 'hover:text-gray-600', 'hover:border-gray-300');
        });

        tabEditor.addEventListener('click', () => {
            uploadSection.classList.add('hidden');
            editorSection.classList.remove('hidden');
            inputType.value = 'editor';
            
            tabEditor.classList.add('text-blue-600', 'border-blue-600', 'active');
            tabEditor.classList.remove('border-transparent', 'hover:text-gray-600', 'hover:border-gray-300');
            
            tabUpload.classList.remove('text-blue-600', 'border-blue-600', 'active');
            tabUpload.classList.add('border-transparent', 'hover:text-gray-600', 'hover:border-gray-300');
        });
    }
}

// Load manual data for editing a version
async function loadManualForEdit(manualId) {
    try {
        const manualDoc = await getDoc(doc(db, 'manuals', manualId));
        if (!manualDoc.exists()) {
            throw new Error('Manual não encontrado para atualização.');
        }

        const manualData = manualDoc.data();
        editingManualId = manualId;
        currentManualReviewers = manualData.reviewers || [];
        uploadPageTitle.textContent = 'Atualizar Versão do Manual';
        uploadPageSubtitle.textContent = `Novo upload para ${manualData.title || 'manual existente'}`;
        document.getElementById('title').value = manualData.title || '';
        document.getElementById('description').value = manualData.description || '';
        document.getElementById('version').value = manualData.version || 'v1.0';
        document.getElementById('category').value = manualData.category || 'outro';
        document.getElementById('tags').value = (manualData.tags || []).join(', ');
        isPublicCheckbox.checked = manualData.isPublic === true;
        if (manualData.isPublic) {
            privateSettings.classList.add('hidden');
        } else {
            privateSettings.classList.remove('hidden');
            document.getElementById('allowedUsers').value = (manualData.allowedUsers || []).join(', ');
        }
        document.getElementById('reviewers').value = (manualData.reviewers || []).join(', ');
    } catch (error) {
        console.error('Erro ao carregar manual para edição:', error);
        showMessage('Não foi possível carregar os dados do manual. Redirecionando ao upload normal.');
        editingManualId = null;
        uploadPageTitle.textContent = 'Carregar Manual';
        uploadPageSubtitle.textContent = 'Adicione um novo manual à plataforma';
    }
}

function showPage() {
    document.body.style.visibility = 'visible';
}

// Initialize Quill Editor
function initQuillEditor() {
    if (document.getElementById('editor-container') && typeof Quill !== 'undefined') {
        quillEditor = new Quill('#editor-container', {
            theme: 'snow',
            placeholder: 'Escreva o conteúdo do manual aqui...',
            modules: {
                toolbar: [
                    [{ 'header': [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    ['blockquote', 'code-block'],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    [{ 'color': [] }, { 'background': [] }],
                    ['link', 'image'],
                    ['clean']
                ]
            }
        });
    }
}

// Initialize upload page
function initUpload() {
    initQuillEditor();
    
    // Check authentication
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            updateUserInterface(user);

            const urlParams = new URLSearchParams(window.location.search);
            const manualId = urlParams.get('manualId');
            if (manualId) {
                await loadManualForEdit(manualId);
            }

            showPage();
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