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

        loadingManuals.classList.remove('hidden');
        emptyManuals.classList.add('hidden');
        manualsList.classList.add('hidden');

        const manualsQuery = query(
            collection(db, 'manuals'),
            where('author', '==', currentUser.uid),
            orderBy('updatedAt', 'desc')
        );

        const querySnapshot = await getDocs(manualsQuery);
        
        manuals = [];
        querySnapshot.forEach((doc) => {
            const manualData = doc.data();
            manuals.push({
                id: doc.id,
                ...manualData
            });
        });

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
                    <button onclick="viewManual('${manual.id}')" 
                            class="action-btn view" title="Visualizar">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button onclick="editManual('${manual.id}')" 
                            class="action-btn edit" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    ${manual.status === 'draft' ? `
                    <button onclick="sendForReview('${manual.id}')" 
                            class="action-btn review" title="Enviar para Revisão">
                        <i class="fas fa-paper-plane"></i>
                    </button>
                    ` : ''}
                    <button onclick="confirmDelete('${manual.id}', '${manual.title}')" 
                            class="action-btn delete" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
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
    // TODO: Implementar visualização do manual
    showMessage('Funcionalidade de visualização em desenvolvimento.', 'info');
}

function editManual(manualId) {
    // TODO: Implementar edição do manual
    showMessage('Funcionalidade de edição em desenvolvimento.', 'info');
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
window.confirmDelete = confirmDelete;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initManualList);