// Dashboard functionality - VERSÃO COM DADOS REAIS
import { 
    auth, 
    signOut,
    onAuthStateChanged,
    db,
    collection,
    getDocs,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp
} from './firebase-config.js';

// DOM Elements
const userMenu = document.getElementById('userMenu');
const dropdownMenu = document.getElementById('dropdownMenu');
const logoutBtn = document.getElementById('logoutBtn');
const userInitial = document.getElementById('userInitial');
const userName = document.getElementById('userName');
const dropdownUserName = document.getElementById('dropdownUserName');
const dropdownUserEmail = document.getElementById('dropdownUserEmail');

// Stats Elements
const totalManuals = document.getElementById('totalManuals');
const inReview = document.getElementById('inReview');
const approved = document.getElementById('approved');
const rejected = document.getElementById('rejected');

// Status Elements
const statusDraft = document.getElementById('statusDraft');
const statusReview = document.getElementById('statusReview');
const statusApproved = document.getElementById('statusApproved');
const statusRejected = document.getElementById('statusRejected');
const statusPublished = document.getElementById('statusPublished');

// Content Elements
const recentManuals = document.getElementById('recentManuals');
const loadingManuals = document.getElementById('loadingManuals');
const emptyManuals = document.getElementById('emptyManuals');
const activityFeed = document.getElementById('activityFeed');
const loadingActivity = document.getElementById('loadingActivity');
const emptyActivity = document.getElementById('emptyActivity');

// Current user data
let currentUser = null;

// Initialize dashboard
function initDashboard() {
    console.log('🚀 Inicializando dashboard...');
    
    // Check authentication
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            updateUserInterface(user);
            loadDashboardData();
        } else {
            // Redirect to login if not authenticated
            window.location.href = 'login.html';
        }
    });

    setupEventListeners();
}

// Update user interface with user data
function updateUserInterface(user) {
    const displayName = user.displayName || user.email.split('@')[0];
    const initial = displayName.charAt(0).toUpperCase();
    
    userInitial.textContent = initial;
    userName.textContent = displayName;
    dropdownUserName.textContent = displayName;
    dropdownUserEmail.textContent = user.email;
}

// Setup event listeners
function setupEventListeners() {
    // User menu toggle
    userMenu.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownMenu.classList.toggle('hidden');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
        dropdownMenu.classList.add('hidden');
    });

    // Logout functionality
    logoutBtn.addEventListener('click', async () => {
        try {
            await signOut(auth);
            window.location.href = 'login.html';
        } catch (error) {
            console.error('Erro ao terminar sessão:', error);
            showError('Erro ao terminar sessão. Tente novamente.');
        }
    });

    // Prevent dropdown close when clicking inside
    dropdownMenu.addEventListener('click', (e) => {
        e.stopPropagation();
    });
}

// Load dashboard data
async function loadDashboardData() {
    try {
        await Promise.all([
            loadStats(),
            loadRecentManuals(),
            loadActivityFeed()
        ]);
    } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error);
        showError('Erro ao carregar dados. Tente recarregar a página.');
    }
}

// Load statistics from Firestore
async function loadStats() {
    try {
        if (!currentUser) return;

        // Query para buscar manuais do usuário atual
        const manualsQuery = query(
            collection(db, 'manuals'),
            where('author', '==', currentUser.uid)
        );

        const querySnapshot = await getDocs(manualsQuery);
        
        // Calcular estatísticas
        let stats = {
            total: 0,
            draft: 0,
            review: 0,
            approved: 0,
            rejected: 0,
            published: 0
        };

        querySnapshot.forEach((doc) => {
            const manual = doc.data();
            stats.total++;
            
            switch (manual.status) {
                case 'draft':
                    stats.draft++;
                    break;
                case 'review':
                    stats.review++;
                    break;
                case 'approved':
                    stats.approved++;
                    break;
                case 'rejected':
                    stats.rejected++;
                    break;
                case 'published':
                    stats.published++;
                    break;
            }
        });

        // Update DOM with real stats
        totalManuals.textContent = stats.total;
        inReview.textContent = stats.review;
        approved.textContent = stats.approved;
        rejected.textContent = stats.rejected;
        
        statusDraft.textContent = stats.draft;
        statusReview.textContent = stats.review;
        statusApproved.textContent = stats.approved;
        statusRejected.textContent = stats.rejected;
        statusPublished.textContent = stats.published;

    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
        // Fallback para dados mock se Firestore falhar
        loadMockStats();
    }
}

// Fallback para dados mock
function loadMockStats() {
    const stats = {
        total: 0,
        inReview: 0,
        approved: 0,
        rejected: 0,
        draft: 0,
        published: 0
    };

    totalManuals.textContent = stats.total;
    inReview.textContent = stats.inReview;
    approved.textContent = stats.approved;
    rejected.textContent = stats.rejected;
    
    statusDraft.textContent = stats.draft;
    statusReview.textContent = stats.inReview;
    statusApproved.textContent = stats.approved;
    statusRejected.textContent = stats.rejected;
    statusPublished.textContent = stats.published;
}

// Load recent manuals from Firestore
async function loadRecentManuals() {
    try {
        if (!currentUser) {
            loadingManuals.classList.add('hidden');
            emptyManuals.classList.remove('hidden');
            return;
        }

        // Query para buscar manuais recentes do usuário
        const manualsQuery = query(
            collection(db, 'manuals'),
            where('author', '==', currentUser.uid),
            orderBy('updatedAt', 'desc'),
            limit(5)
        );

        const querySnapshot = await getDocs(manualsQuery);
        
        loadingManuals.classList.add('hidden');

        if (querySnapshot.empty) {
            emptyManuals.classList.remove('hidden');
            return;
        }

        const manuals = [];
        querySnapshot.forEach((doc) => {
            const manualData = doc.data();
            manuals.push({
                id: doc.id,
                ...manualData
            });
        });

        renderRecentManuals(manuals);

    } catch (error) {
        console.error('Erro ao carregar manuais recentes:', error);
        loadingManuals.classList.add('hidden');
        emptyManuals.classList.remove('hidden');
        // Fallback para dados mock
        loadMockManuals();
    }
}

// Fallback para manuais mock
function loadMockManuals() {
    setTimeout(() => {
        loadingManuals.classList.add('hidden');
        emptyManuals.classList.remove('hidden');
    }, 1000);
}

// Render recent manuals
function renderRecentManuals(manuals) {
    recentManuals.innerHTML = ''; // Limpar conteúdo anterior

    const manualItems = manuals.map(manual => `
        <div class="manual-item p-4 rounded-lg slide-in">
            <div class="flex justify-between items-start">
                <div class="flex-1">
                    <h3 class="font-medium text-gray-900 text-sm mb-1">${manual.title || 'Sem título'}</h3>
                    <div class="flex items-center space-x-4 text-xs text-gray-500">
                        <span>${formatDate(manual.updatedAt)}</span>
                        <span>${manual.version || 'v1.0'}</span>
                    </div>
                </div>
                <span class="status-badge status-${manual.status} ml-4">
                    ${getStatusText(manual.status)}
                </span>
            </div>
        </div>
    `).join('');

    recentManuals.insertAdjacentHTML('beforeend', manualItems);
}

// Load activity feed from Firestore
async function loadActivityFeed() {
    try {
        if (!currentUser) {
            loadingActivity.classList.add('hidden');
            emptyActivity.classList.remove('hidden');
            return;
        }

        // Query para buscar atividades recentes
        const activityQuery = query(
            collection(db, 'activities'),
            where('userId', '==', currentUser.uid),
            orderBy('timestamp', 'desc'),
            limit(5)
        );

        const querySnapshot = await getDocs(activityQuery);
        
        loadingActivity.classList.add('hidden');

        if (querySnapshot.empty) {
            emptyActivity.classList.remove('hidden');
            return;
        }

        const activities = [];
        querySnapshot.forEach((doc) => {
            const activityData = doc.data();
            activities.push({
                id: doc.id,
                ...activityData
            });
        });

        renderActivityFeed(activities);

    } catch (error) {
        console.error('Erro ao carregar feed de atividade:', error);
        loadingActivity.classList.add('hidden');
        emptyActivity.classList.remove('hidden');
        // Fallback para dados mock
        loadMockActivity();
    }
}

// Fallback para atividade mock
function loadMockActivity() {
    setTimeout(() => {
        loadingActivity.classList.add('hidden');
        emptyActivity.classList.remove('hidden');
    }, 1500);
}

// Render activity feed
function renderActivityFeed(activities) {
    activityFeed.innerHTML = ''; // Limpar conteúdo anterior

    const activityItems = activities.map(activity => `
        <div class="activity-item slide-in">
            <div class="text-sm">
                <span class="font-medium text-gray-900">${activity.userName || 'Utilizador'}</span>
                <span class="text-gray-600">${getActionText(activity.action)}</span>
                <span class="font-medium text-gray-900">${activity.target}</span>
            </div>
            <div class="text-xs text-gray-400 mt-1">${formatTimestamp(activity.timestamp)}</div>
        </div>
    `).join('');

    activityFeed.insertAdjacentHTML('beforeend', activityItems);
}

// Helper function to get status text
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

// Helper function to get action text
function getActionText(action) {
    const actionMap = {
        'upload': 'carregou ',
        'review': 'reviu ',
        'approve': 'aprovou ',
        'reject': 'rejeitou ',
        'comment': 'comentou em ',
        'update': 'atualizou ',
        'create': 'criou '
    };
    return actionMap[action] || action;
}

// Format date for display
function formatDate(timestamp) {
    if (!timestamp) return 'Data desconhecida';
    
    try {
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('pt-PT');
    } catch (error) {
        return 'Data inválida';
    }
}

// Format timestamp for display
function formatTimestamp(timestamp) {
    if (!timestamp) return 'Há algum tempo';
    
    try {
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Agora mesmo';
        if (diffMins < 60) return `há ${diffMins} min`;
        if (diffHours < 24) return `há ${diffHours} h`;
        if (diffDays === 1) return 'há 1 dia';
        if (diffDays < 7) return `há ${diffDays} dias`;
        
        return date.toLocaleDateString('pt-PT');
    } catch (error) {
        return 'Há algum tempo';
    }
}

// Show error message
function showError(message) {
    // Podemos implementar um sistema de notificação toast aqui
    console.error('Erro:', message);
    
    // Mostrar alerta simples por enquanto
    const errorDiv = document.createElement('div');
    errorDiv.className = 'message-fixed message-error';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', initDashboard);

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initDashboard,
        loadStats,
        loadRecentManuals,
        loadActivityFeed,
        getStatusText,
        getActionText,
        formatDate,
        formatTimestamp
    };
}