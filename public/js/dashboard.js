// Dashboard functionality
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
            alert('Erro ao terminar sessão. Tente novamente.');
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

// Load statistics
async function loadStats() {
    try {
        // In a real app, you would query Firestore for these stats
        // For now, we'll use mock data
        const stats = {
            total: 12,
            inReview: 3,
            approved: 7,
            rejected: 2,
            draft: 2,
            published: 5
        };

        // Update DOM with stats
        totalManuals.textContent = stats.total;
        inReview.textContent = stats.inReview;
        approved.textContent = stats.approved;
        rejected.textContent = stats.rejected;
        
        statusDraft.textContent = stats.draft;
        statusReview.textContent = stats.inReview;
        statusApproved.textContent = stats.approved;
        statusRejected.textContent = stats.rejected;
        statusPublished.textContent = stats.published;

    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
    }
}

// Load recent manuals
async function loadRecentManuals() {
    try {
        // Hide loading after a delay (simulate API call)
        setTimeout(() => {
            loadingManuals.classList.add('hidden');
            
            // Mock data - replace with actual Firestore query
            const manuals = [
                {
                    id: 1,
                    title: 'Manual de Procedimentos Operacionais',
                    status: 'review',
                    author: 'João Silva',
                    updatedAt: '2024-01-15',
                    version: 'v2.1'
                },
                {
                    id: 2,
                    title: 'Guia de Utilização do Sistema',
                    status: 'approved',
                    author: 'Maria Santos',
                    updatedAt: '2024-01-14',
                    version: 'v1.3'
                },
                {
                    id: 3,
                    title: 'Protocolo de Segurança',
                    status: 'draft',
                    author: 'Pedro Costa',
                    updatedAt: '2024-01-13',
                    version: 'v0.8'
                }
            ];

            if (manuals.length === 0) {
                emptyManuals.classList.remove('hidden');
                return;
            }

            renderRecentManuals(manuals);

        }, 1000);

    } catch (error) {
        console.error('Erro ao carregar manuais recentes:', error);
        loadingManuals.classList.add('hidden');
        emptyManuals.classList.remove('hidden');
    }
}

// Render recent manuals
function renderRecentManuals(manuals) {
    const manualItems = manuals.map(manual => `
        <div class="manual-item p-4 rounded-lg slide-in">
            <div class="flex justify-between items-start">
                <div class="flex-1">
                    <h3 class="font-medium text-gray-900 text-sm mb-1">${manual.title}</h3>
                    <div class="flex items-center space-x-4 text-xs text-gray-500">
                        <span>${manual.author}</span>
                        <span>${manual.updatedAt}</span>
                        <span>${manual.version}</span>
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

// Load activity feed
async function loadActivityFeed() {
    try {
        // Hide loading after a delay
        setTimeout(() => {
            loadingActivity.classList.add('hidden');
            
            // Mock data - replace with actual Firestore query
            const activities = [
                {
                    id: 1,
                    action: 'upload',
                    user: 'João Silva',
                    target: 'Manual de Procedimentos',
                    timestamp: 'há 2 horas'
                },
                {
                    id: 2,
                    action: 'review',
                    user: 'Maria Santos',
                    target: 'Guia de Utilização',
                    timestamp: 'há 4 horas'
                },
                {
                    id: 3,
                    action: 'approve',
                    user: 'Admin Sistema',
                    target: 'Protocolo de Segurança',
                    timestamp: 'há 1 dia'
                },
                {
                    id: 4,
                    action: 'comment',
                    user: 'Pedro Costa',
                    target: 'Manual Técnico',
                    timestamp: 'há 2 dias'
                }
            ];

            if (activities.length === 0) {
                emptyActivity.classList.remove('hidden');
                return;
            }

            renderActivityFeed(activities);

        }, 1500);

    } catch (error) {
        console.error('Erro ao carregar feed de atividade:', error);
        loadingActivity.classList.add('hidden');
        emptyActivity.classList.remove('hidden');
    }
}

// Render activity feed
function renderActivityFeed(activities) {
    const activityItems = activities.map(activity => `
        <div class="activity-item slide-in">
            <div class="text-sm">
                <span class="font-medium text-gray-900">${activity.user}</span>
                <span class="text-gray-600">${getActionText(activity.action)}</span>
                <span class="font-medium text-gray-900">${activity.target}</span>
            </div>
            <div class="text-xs text-gray-400 mt-1">${activity.timestamp}</div>
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
        'update': 'atualizou '
    };
    return actionMap[action] || action;
}

// Show error message
function showError(message) {
    // You could implement a toast notification system here
    console.error('Erro:', message);
    alert(message); // Simple alert for now
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
        getActionText
    };
}