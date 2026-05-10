// Manual List functionality - Gestão completa de manuais
import { 
    auth,
    onAuthStateChanged,
    db,
    collection,
    getDocs,
    query,
    where,
    orderBy,
    deleteDoc,
    doc,
    updateDoc,
    serverTimestamp
} from './firebase-config.js';

// DOM Elements
const messageDiv = document.getElementById('message');
const userInitial = document.getElementById('userInitial');
const userName = document.getElementById('userName');
const searchInput = document.getElementById('search');
const statusFilter = document.getElementById('statusFilter');
const categoryFilter = document.getElementById('categoryFilter');
const activeFilters = document.getElementById('activeFilters');
const sortBy = document.getElementById('sortBy');
const loadingManuals = document.getElementById('loadingManuals');
const pageHeading = document.getElementById('pageHeading');
const pageDescription = document.getElementById('pageDescription');
const emptyManuals = document.getElementById('emptyManuals');
const manualsList = document.getElementById('manualsList');
const manualsTableBody = document.getElementById('manualsTableBody');
const pagination = document.getElementById('pagination');
const prevPage = document.getElementById('prevPage');
const nextPage = document.getElementById('nextPage');
const showingFrom = document.getElementById('showingFrom');
const showingTo = document.getElementById('showingTo');
const totalItems = document.getElementById('totalItems');

// Stats Elements
const totalCount = document.getElementById('totalCount');
const draftCount = document.getElementById('draftCount');
const reviewCount = document.getElementById('reviewCount');
const approvedCount = document.getElementById('approvedCount');
const rejectedCount = document.getElementById('rejectedCount');

// Modal Elements
const confirmModal = document.getElementById('confirmModal');
const confirmTitle = document.getElementById('confirmTitle');
const confirmMessage = document.getElementById('confirmMessage');
const confirmCancel = document.getElementById('confirmCancel');
const confirmAction = document.getElementById('confirmAction');

// State
let currentUser = null;
let manuals = [];
let filteredManuals = [];
let currentPage = 1;
const itemsPerPage = 10;
let currentMode = 'own';
let currentUserEmail = '';
let currentFilters = {
    search: '',
    status: 'all',
    category: 'all'
};
let pendingAction = null;

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
        return date.toLocaleDateString('pt-PT');
    } catch (error) {
        return '-';
    }
}

// Formatar timestamp relativo
function formatRelativeTime(timestamp) {
    if (!timestamp) return '-';
    
    try {
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Agora';
        if (diffMins < 60) return `há ${diffMins}m`;
        if (diffHours < 24) return `há ${diffHours}h`;
        if (diffDays === 1) return 'há 1 dia';
        if (diffDays < 7) return `há ${diffDays}d`;
        
        return date.toLocaleDateString('pt-PT');
    } catch (error) {
        return '-';
    }
}

function includesNormalized(array, value) {
    if (!Array.isArray(array) || value == null) return false;
    const normalizedValue = value.toString().toLowerCase();
    return array.some(item => item != null && item.toString().toLowerCase() === normalizedValue);
}

// Obter texto do status
function getStatusText(status) {
    const statusMap = {
        'draft': 'Rascunho',
        'review': 'Em Revisão',
        'approved': 'Aprovado',
        'rejected': 'Rejeitado',
        'published': 'Publicado'
    };
    return statusMap[status] || status;
}

// Obter ícone do status
function getStatusIcon(status) {
    const iconMap = {
        'draft': 'fas fa-edit',
        'review': 'fas fa-clock',
        'approved': 'fas fa-check-circle',
        'rejected': 'fas fa-times-circle',
        'published': 'fas fa-globe'
    };
    return iconMap[status] || 'fas fa-file';
}

// Carregar manuais do Firestore
async function loadManuals() {
    try {
        if (!currentUser) return;

        const urlParams = new URLSearchParams(window.location.search);
        currentMode = urlParams.get('mode') === 'review' ? 'review' : 'own';
        const originalEmail = currentUser.email || '';
        currentUserEmail = originalEmail.toLowerCase();

        if (pageHeading) {
            pageHeading.textContent = currentMode === 'review' ? 'Manuais para Revisão' : 'Meus Manuais';
        }
        if (pageDescription) {
            pageDescription.textContent = currentMode === 'review' ? 'Reveja os manuais atribuídos a si e conclua as revisões pendentes.' : 'Gerir e visualizar todos os seus manuais';
        }

        loadingManuals.classList.remove('hidden');
        emptyManuals.classList.add('hidden');
        manualsList.classList.add('hidden');

        let manualDocs = [];

        if (currentMode === 'review') {
            const reviewerQueries = [
                query(
                    collection(db, 'manuals'),
                    where('reviewers', 'array-contains', currentUser.uid)
                )
            ];

            if (currentUserEmail) {
                reviewerQueries.push(
                    query(
                        collection(db, 'manuals'),
                        where('reviewers', 'array-contains', currentUserEmail)
                    )
                );
            }
            if (originalEmail && originalEmail !== currentUserEmail) {
                reviewerQueries.push(
                    query(
                        collection(db, 'manuals'),
                        where('reviewers', 'array-contains', originalEmail)
                    )
                );
            }

            const snapshots = await Promise.all(reviewerQueries.map(q => getDocs(q)));
            snapshots.forEach((snapshot) => {
                snapshot.forEach((doc) => {
                    manualDocs.push({ id: doc.id, ...doc.data() });
                });
            });

            // Include manuals authored by the current user as well
            const authoredQuery = query(
                collection(db, 'manuals'),
                where('author', '==', currentUser.uid),
                orderBy('updatedAt', 'desc')
            );
            const authoredSnapshot = await getDocs(authoredQuery);
            authoredSnapshot.forEach((doc) => {
                manualDocs.push({ id: doc.id, ...doc.data() });
            });

            // Remover duplicados e ordenar por atualização mais recente
            const uniqueManuals = {};
            manuals = manualDocs
                .filter(manual => {
                    if (uniqueManuals[manual.id]) return false;
                    uniqueManuals[manual.id] = true;
                    return true;
                })
                .sort((a, b) => {
                    const aTime = a.updatedAt?.toDate ? a.updatedAt.toDate().getTime() : new Date(a.updatedAt).getTime();
                    const bTime = b.updatedAt?.toDate ? b.updatedAt.toDate().getTime() : new Date(b.updatedAt).getTime();
                    return bTime - aTime;
                });
        } else {
            const manualsQuery = query(
                collection(db, 'manuals'),
                where('author', '==', currentUser.uid),
                orderBy('updatedAt', 'desc')
            );

            const querySnapshot = await getDocs(manualsQuery);
            manuals = [];
            querySnapshot.forEach((doc) => {
                manuals.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
        }

        updateStats(manuals);
        applyFilters();

    } catch (error) {
        console.error('Erro ao carregar manuais:', error);
        showMessage('Erro ao carregar manuais. Tente recarregar a página.');
        loadingManuals.classList.add('hidden');
        emptyManuals.classList.remove('hidden');
    }
}

// Atualizar estatísticas
function updateStats(manualsList) {
    const stats = {
        total: manualsList.length,
        draft: 0,
        review: 0,
        approved: 0,
        rejected: 0
    };

    manualsList.forEach(manual => {
        switch (manual.status) {
            case 'draft': stats.draft++; break;
            case 'review': stats.review++; break;
            case 'approved': stats.approved++; break;
            case 'rejected': stats.rejected++; break;
        }
    });

    totalCount.textContent = stats.total;
    draftCount.textContent = stats.draft;
    reviewCount.textContent = stats.review;
    approvedCount.textContent = stats.approved;
    rejectedCount.textContent = stats.rejected;
}

// Aplicar filtros
function applyFilters() {
    filteredManuals = manuals.filter(manual => {
        // Filtro de busca
        const searchTerm = currentFilters.search.toLowerCase();
        const matchesSearch = !searchTerm || 
            manual.title.toLowerCase().includes(searchTerm) ||
            (manual.tags && manual.tags.some(tag => tag.toLowerCase().includes(searchTerm))) ||
            (manual.description && manual.description.toLowerCase().includes(searchTerm));

        // Filtro de status
        const matchesStatus = currentFilters.status === 'all' || manual.status === currentFilters.status;

        // Filtro de categoria
        const matchesCategory = currentFilters.category === 'all' || manual.category === currentFilters.category;

        return matchesSearch && matchesStatus && matchesCategory;
    });

    // Aplicar ordenação
    applySorting();
    updateActiveFilters();
    renderManuals();
    updatePagination();
}

// Aplicar ordenação
function applySorting() {
    const [field, direction] = sortBy.value.split('-');
    
    filteredManuals.sort((a, b) => {
        let aValue = a[field];
        let bValue = b[field];

        // Para datas, converter para timestamp
        if (field === 'updatedAt' || field === 'createdAt') {
            aValue = aValue?.toDate ? aValue.toDate().getTime() : new Date(aValue).getTime();
            bValue = bValue?.toDate ? bValue.toDate().getTime() : new Date(bValue).getTime();
        }

        // Para strings, converter para minúsculas
        if (typeof aValue === 'string') {
            aValue = aValue.toLowerCase();
            bValue = bValue.toLowerCase();
        }

        if (direction === 'asc') {
            return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        } else {
            return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
        }
    });
}

// Atualizar filtros ativos
function updateActiveFilters() {
    activeFilters.innerHTML = '';
    
    const filters = [];
    
    if (currentFilters.search) {
        filters.push({
            type: 'search',
            label: `Busca: "${currentFilters.search}"`,
            value: currentFilters.search
        });
    }
    
    if (currentFilters.status !== 'all') {
        filters.push({
            type: 'status',
            label: `Estado: ${getStatusText(currentFilters.status)}`,
            value: currentFilters.status
        });
    }
    
    if (currentFilters.category !== 'all') {
        filters.push({
            type: 'category',
            label: `Categoria: ${currentFilters.category}`,
            value: currentFilters.category
        });
    }

    if (filters.length > 0) {
        activeFilters.classList.remove('hidden');
        
        filters.forEach(filter => {
            const filterTag = document.createElement('div');
            filterTag.className = 'filter-tag';
            filterTag.innerHTML = `
                <span>${filter.label}</span>
                <button type="button" onclick="removeFilter('${filter.type}')" class="text-sm">
                    <i class="fas fa-times"></i>
                </button>
            `;
            activeFilters.appendChild(filterTag);
        });
    } else {
        activeFilters.classList.add('hidden');
    }
}

// Remover filtro
function removeFilter(filterType) {
    switch (filterType) {
        case 'search':
            currentFilters.search = '';
            searchInput.value = '';
            break;
        case 'status':
            currentFilters.status = 'all';
            statusFilter.value = 'all';
            break;
        case 'category':
            currentFilters.category = 'all';
            categoryFilter.value = 'all';
            break;
    }
    applyFilters();
}

// Renderizar manuais
function renderManuals() {
    manualsTableBody.innerHTML = '';

    if (filteredManuals.length === 0) {
        loadingManuals.classList.add('hidden');
        emptyManuals.classList.remove('hidden');
        manualsList.classList.add('hidden');
        return;
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const manualsToShow = filteredManuals.slice(startIndex, endIndex);

    manualsToShow.forEach(manual => {
            const isOwner = manual.author === currentUser.uid;
            const isReviewer = includesNormalized(manual.reviewers, currentUser.uid) || includesNormalized(manual.reviewers, currentUserEmail);
            const actions = [];

            actions.push(`
                <button onclick="viewManual('${manual.id}')" 
                        class="action-btn view" title="Visualizar">
                    <i class="fas fa-eye"></i>
                </button>
            `);

            if (isOwner) {
                actions.push(`
                    <button onclick="editManual('${manual.id}')" 
                            class="action-btn edit" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                `);
            }

            if (isOwner && manual.status === 'draft') {
                actions.push(`
                    <button onclick="sendForReview('${manual.id}')" 
                            class="action-btn review" title="Enviar para Revisão">
                        <i class="fas fa-paper-plane"></i>
                    </button>
                `);
            }

            if (manual.status === 'review' && (isOwner || isReviewer)) {
                actions.push(`
                    <button onclick="reviewManual('${manual.id}')" 
                            class="action-btn review" title="Rever Manual">
                        <i class="fas fa-check"></i>
                    </button>
                `);
            }

            if (isOwner) {
                const safeTitle = (manual.title || 'manual').replace(/'/g, "\\'");
                actions.push(`
                    <button onclick="confirmDelete('${manual.id}', '${safeTitle}')" 
                            class="action-btn delete" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                `);
            }

            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50 transition-colors';
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                        <div class="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <i class="fas fa-file text-blue-600"></i>
                        </div>
                        <div class="ml-4">
                            <div class="text-sm font-medium text-gray-900">${manual.title || 'Sem título'}</div>
                            <div class="text-sm text-gray-500">${manual.description || 'Sem descrição'}</div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${manual.version || 'v1.0'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="status-badge status-${manual.status}">
                        <i class="${getStatusIcon(manual.status)}"></i>
                        ${getStatusText(manual.status)}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                    ${manual.category || '-'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${formatRelativeTime(manual.updatedAt)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div class="flex justify-end space-x-2 action-buttons">
                        ${actions.join('')}
                    </div>
                </td>
            `;
            manualsTableBody.appendChild(row);
        });
    loadingManuals.classList.add('hidden');
    emptyManuals.classList.add('hidden');
    manualsList.classList.remove('hidden');
}

// Atualizar paginação
function updatePagination() {
    const totalPages = Math.ceil(filteredManuals.length / itemsPerPage);
    
    if (totalPages <= 1) {
        pagination.classList.add('hidden');
        return;
    }

    pagination.classList.remove('hidden');
    
    const startIndex = (currentPage - 1) * itemsPerPage + 1;
    const endIndex = Math.min(currentPage * itemsPerPage, filteredManuals.length);
    
    showingFrom.textContent = startIndex;
    showingTo.textContent = endIndex;
    totalItems.textContent = filteredManuals.length;
    
    prevPage.disabled = currentPage === 1;
    nextPage.disabled = currentPage === totalPages;
}

// Modal de confirmação
function showConfirmModal(title, message, action) {
    confirmTitle.textContent = title;
    confirmMessage.textContent = message;
    pendingAction = action;
    confirmModal.classList.remove('hidden');
}

function hideConfirmModal() {
    confirmModal.classList.add('hidden');
    pendingAction = null;
}

// Ações dos manuais
function viewManual(manualId) {
    const manual = manuals.find(m => m.id === manualId);
    if (manual && manual.fileUrl && manual.fileUrl !== 'pending') {
        window.open(manual.fileUrl, '_blank');
    } else {
        showMessage('Este manual ainda não tem um ficheiro associado ou está pendente.', 'error');
    }
}

function editManual(manualId) {
    const manual = manuals.find(m => m.id === manualId);
    if (!manual) return;
    
    // Verificar se o modal já existe
    let editModal = document.getElementById('editManualModal');
    
    if (!editModal) {
        // Criar o HTML do modal dinamicamente com Design Profissional (Tailwind)
        const modalHTML = `
        <div id="editManualModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div class="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 slide-up">
                <div class="flex justify-between items-center mb-4 border-b pb-3">
                    <h3 class="text-xl font-semibold text-gray-900 flex items-center">
                        <i class="fas fa-edit text-blue-600 mr-2"></i> Editar Detalhes
                    </h3>
                    <button onclick="closeEditModal()" class="text-gray-400 hover:text-gray-600 focus-visible transition-colors">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>
                
                <form id="editManualForm" class="space-y-4">
                    <input type="hidden" id="editManualId">
                    
                    <div>
                        <label for="editTitle" class="block text-sm font-medium text-gray-700 mb-1">Título do Manual *</label>
                        <input type="text" id="editTitle" required 
                               class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gray-50 hover:bg-white"
                               placeholder="Digite o título do manual">
                    </div>
                    
                    <div>
                        <label for="editDescription" class="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                        <textarea id="editDescription" rows="3" 
                                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gray-50 hover:bg-white"
                                  placeholder="Descreva brevemente o manual"></textarea>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label for="editCategory" class="block text-sm font-medium text-gray-700 mb-1">Categoria *</label>
                            <select id="editCategory" required 
                                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gray-50 hover:bg-white">
                                <option value="rh">Recursos Humanos</option>
                                <option value="it">Tecnologia (IT)</option>
                                <option value="ops">Operações</option>
                                <option value="fin">Finanças</option>
                                <option value="other">Outro</option>
                            </select>
                        </div>
                        <div>
                            <label for="editVersion" class="block text-sm font-medium text-gray-700 mb-1">Versão *</label>
                            <input type="text" id="editVersion" required 
                                   class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gray-50 hover:bg-white"
                                   placeholder="Ex: v1.0">
                        </div>
                    </div>
                    
                    <div class="flex justify-end space-x-3 pt-5 border-t mt-4">
                        <button type="button" onclick="closeEditModal()" class="px-5 py-2.5 text-gray-600 hover:text-gray-800 font-medium rounded-lg hover:bg-gray-100 transition-colors">
                            Cancelar
                        </button>
                        <button type="submit" id="btnSaveEdit" class="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center shadow-sm hover:shadow transition-all">
                            <i class="fas fa-save mr-2"></i>
                            Guardar Alterações
                        </button>
                    </div>
                </form>
            </div>
        </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        document.getElementById('editManualForm').addEventListener('submit', handleEditSubmit);
        editModal = document.getElementById('editManualModal');
    }
    
    // Preencher dados do manual no modal
    document.getElementById('editManualId').value = manual.id;
    document.getElementById('editTitle').value = manual.title || '';
    document.getElementById('editDescription').value = manual.description || '';
    
    const categorySelect = document.getElementById('editCategory');
    const optionExists = Array.from(categorySelect.options).some(opt => opt.value === manual.category);
    categorySelect.value = optionExists ? manual.category : 'other';
    
    document.getElementById('editVersion').value = manual.version || 'v1.0';
    
    // Mostrar modal
    editModal.classList.remove('hidden');
}

window.closeEditModal = function() {
    const editModal = document.getElementById('editManualModal');
    if (editModal) {
        editModal.classList.add('hidden');
    }
};

async function handleEditSubmit(e) {
    e.preventDefault();
    
    const manualId = document.getElementById('editManualId').value;
    const title = document.getElementById('editTitle').value.trim();
    const description = document.getElementById('editDescription').value.trim();
    const category = document.getElementById('editCategory').value;
    const version = document.getElementById('editVersion').value.trim();
    
    const submitBtn = document.getElementById('btnSaveEdit');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>A Guardar...';
    submitBtn.disabled = true;
    
    try {
        const manualRef = doc(db, 'manuals', manualId);
        await updateDoc(manualRef, {
            title,
            description,
            category,
            version,
            updatedAt: serverTimestamp()
        });
        
        showMessage('✅ Detalhes do manual atualizados com sucesso!', 'success');
        closeEditModal();
        await loadManuals(); // Recarregar a lista para ver a alteração
    } catch (error) {
        console.error('Erro ao editar manual:', error);
        showMessage('Erro ao atualizar manual. Verifique a consola.');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

async function sendForReview(manualId) {
    try {
        const manualRef = doc(db, 'manuals', manualId);
        await updateDoc(manualRef, {
            status: 'review',
            updatedAt: serverTimestamp()
        });
        
        showMessage('Manual enviado para revisão com sucesso!', 'success');
        await loadManuals();
    } catch (error) {
        console.error('Erro ao enviar para revisão:', error);
        showMessage('Erro ao enviar manual para revisão.');
    }
}

function confirmDelete(manualId, manualTitle) {
    showConfirmModal(
        'Eliminar Manual',
        `Tem a certeza que deseja eliminar o manual "${manualTitle}"? Esta ação não pode ser desfeita.`,
        () => deleteManual(manualId)
    );
}

function reviewManual(manualId) {
    window.location.href = `manual-review.html?id=${manualId}`;
}

async function deleteManual(manualId) {
    try {
        const manualRef = doc(db, 'manuals', manualId);
        await deleteDoc(manualRef);
        
        showMessage('Manual eliminado com sucesso!', 'success');
        await loadManuals();
    } catch (error) {
        console.error('Erro ao eliminar manual:', error);
        showMessage('Erro ao eliminar manual.');
    }
}

// Event Listeners
function setupEventListeners() {
    // Busca
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            currentFilters.search = e.target.value.trim();
            currentPage = 1;
            applyFilters();
        }, 300);
    });

    // Filtros
    statusFilter.addEventListener('change', (e) => {
        currentFilters.status = e.target.value;
        currentPage = 1;
        applyFilters();
    });

    categoryFilter.addEventListener('change', (e) => {
        currentFilters.category = e.target.value;
        currentPage = 1;
        applyFilters();
    });

    // Ordenação
    sortBy.addEventListener('change', () => {
        applyFilters();
    });

    // Paginação
    prevPage.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderManuals();
            updatePagination();
        }
    });

    nextPage.addEventListener('click', () => {
        const totalPages = Math.ceil(filteredManuals.length / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderManuals();
            updatePagination();
        }
    });

    // Modal
    confirmCancel.addEventListener('click', hideConfirmModal);
    confirmAction.addEventListener('click', () => {
        if (pendingAction) {
            pendingAction();
            hideConfirmModal();
        }
    });

    confirmModal.addEventListener('click', (e) => {
        if (e.target === confirmModal) {
            hideConfirmModal();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !confirmModal.classList.contains('hidden')) {
            hideConfirmModal();
        }
    });
}

// Initialize manual list
function initManualList() {
    // Check authentication
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            updateUserInterface(user);
            loadManuals();
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

// Make functions global for HTML onclick
window.removeFilter = removeFilter;
window.viewManual = viewManual;
window.editManual = editManual;
window.sendForReview = sendForReview;
window.reviewManual = reviewManual;
window.confirmDelete = confirmDelete;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initManualList);