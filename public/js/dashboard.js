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
const notificationDot = document.getElementById('notificationDot');
const notificationButton = document.getElementById('notificationButton');
const notificationDropdown = document.getElementById('notificationDropdown');
const notificationsList = document.getElementById('notificationsList');
const markAllReadBtn = document.getElementById('markAllReadBtn');

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
            showPage();
        } else {
            window.location.href = 'login.html';
        }
    });

    setupEventListeners();
}

function showPage() {
    document.body.style.visibility = 'visible';
}

function hidePage() {
    document.body.style.visibility = 'hidden';
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

    // Notification button toggle
    if (notificationButton && notificationDropdown) {
        notificationButton.addEventListener('click', (e) => {
            e.stopPropagation();
            notificationDropdown.classList.toggle('hidden');
            dropdownMenu.classList.add('hidden'); // fechar o outro menu
        });

        notificationDropdown.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        if (markAllReadBtn) {
            markAllReadBtn.addEventListener('click', async () => {
                try {
                    const unreadQuery = query(
                        collection(db, 'notifications'),
                        where('userId', '==', currentUser.uid),
                        where('read', '==', false)
                    );
                    const unreadSnap = await getDocs(unreadQuery);
                    
                    const updatePromises = unreadSnap.docs.map(docSnap => 
                        updateDoc(doc(db, 'notifications', docSnap.id), { read: true })
                    );
                    
                    await Promise.all(updatePromises);
                    
                    // Update UI immediately
                    if (notificationDot) notificationDot.classList.add('hidden');
                    const unreadItems = notificationsList.querySelectorAll('.bg-blue-50');
                    unreadItems.forEach(item => item.classList.remove('bg-blue-50'));
                    
                    showMessage('Notificações marcadas como lidas.', 'success');
                } catch (error) {
                    console.error('Erro ao marcar notificações:', error);
                }
            });
        }
    }

    // Close dropdowns when clicking outside
    document.addEventListener('click', () => {
        dropdownMenu.classList.add('hidden');
        if (notificationDropdown) notificationDropdown.classList.add('hidden');
    });

    // Logout functionality
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await signOut(auth);
                window.location.href = 'login.html';
            } catch (error) {
                console.error('Erro ao terminar sessão:', error);
                showError('Erro ao terminar sessão. Tente novamente.');
            }
        });
    }

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
            loadActivityFeed(),
            loadNotifications()
        ]);
    } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error);
        showError('Erro ao carregar dados. Tente recarregar a página.');
    }
}

// Load unread notifications
async function loadNotifications() {
    try {
        if (!currentUser || !notificationDot || !notificationsList) return;

        const notificationsQuery = query(
            collection(db, 'notifications'),
            where('userId', '==', currentUser.uid),
            orderBy('createdAt', 'desc'),
            limit(10)
        );

        const snapshot = await getDocs(notificationsQuery);
        
        let hasUnread = false;
        
        if (snapshot.empty) {
            notificationsList.innerHTML = '<p class="text-xs text-gray-500 text-center py-4">Sem notificações no momento</p>';
            notificationDot.classList.add('hidden');
            return;
        }

        notificationsList.innerHTML = snapshot.docs.map(docSnap => {
            const notif = docSnap.data();
            if (!notif.read) hasUnread = true;
            
            return `
                <a href="${notif.targetId ? `manual-view.html?id=${notif.targetId}` : '#'}" 
                   class="block p-3 rounded-lg text-sm transition-colors ${notif.read ? 'hover:bg-gray-100' : 'bg-blue-50 hover:bg-blue-100'}">
                    <div class="flex items-start">
                        <i class="${getNotifIcon(notif.type)} mt-1 mr-2 ${notif.read ? 'text-gray-400' : 'text-blue-500'}"></i>
                        <div>
                            <p class="${notif.read ? 'text-gray-600' : 'text-gray-900 font-medium'}">${notif.message}</p>
                            <p class="text-xs text-gray-400 mt-1">${formatTimestamp(notif.createdAt)}</p>
                        </div>
                    </div>
                </a>
            `;
        }).join('');

        if (hasUnread) {
            notificationDot.classList.remove('hidden');
        } else {
            notificationDot.classList.add('hidden');
        }
    } catch (error) {
        console.error('Erro ao carregar notificações:', error);
        if (notificationDot) {
            notificationDot.classList.add('hidden');
        }
    }
}

function getNotifIcon(type) {
    const map = {
        'review_request': 'fas fa-eye',
        'review_completed': 'fas fa-check-circle',
        'update': 'fas fa-bell'
    };
    return map[type] || 'fas fa-info-circle';
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

        // Gamification Chart
        renderGamificationChart(stats);

    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
        // Show error message instead of fallback
        showError('Erro ao carregar estatísticas. Tente recarregar a página.');
    }
}

// Render Gamification Chart
let gamificationChartInstance = null;

function renderGamificationChart(stats) {
    const ctx = document.getElementById('gamificationChart');
    if (!ctx) return;

    if (gamificationChartInstance) {
        gamificationChartInstance.destroy();
    }

    const data = {
        labels: ['Rascunho', 'Em Revisão', 'Aprovado', 'Rejeitado', 'Publicado'],
        datasets: [{
            label: 'Manuais',
            data: [stats.draft, stats.review, stats.approved, stats.rejected, stats.published],
            backgroundColor: [
                'rgba(156, 163, 175, 0.6)', // Gray (Draft)
                'rgba(234, 179, 8, 0.6)',   // Yellow (Review)
                'rgba(34, 197, 94, 0.6)',   // Green (Approved)
                'rgba(239, 68, 68, 0.6)',   // Red (Rejected)
                'rgba(168, 85, 247, 0.6)'   // Purple (Published)
            ],
            borderColor: [
                'rgb(156, 163, 175)',
                'rgb(234, 179, 8)',
                'rgb(34, 197, 94)',
                'rgb(239, 68, 68)',
                'rgb(168, 85, 247)'
            ],
            borderWidth: 1
        }]
    };

    const config = {
        type: 'doughnut',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: document.documentElement.classList.contains('dark') ? '#e5e7eb' : '#374151'
                    }
                }
            }
        }
    };

    gamificationChartInstance = new Chart(ctx, config);
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
        showError('Erro ao carregar manuais recentes.');
    }
}



// Render recent manuals
function renderRecentManuals(manuals) {
    recentManuals.innerHTML = ''; // Limpar conteúdo anterior

    const manualItems = manuals.map(manual => `
        <a href="manual-view.html?id=${manual.id}" class="manual-item p-4 rounded-lg slide-in block hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <div class="flex justify-between items-start">
                <div class="flex-1">
                    <h3 class="font-medium text-gray-900 dark:text-white text-sm mb-1">${manual.title || 'Sem título'}</h3>
                    <div class="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                        <span>${formatDate(manual.updatedAt)}</span>
                        <span>${manual.version || 'v1.0'}</span>
                    </div>
                </div>
                <span class="status-badge status-${manual.status} ml-4">
                    ${getStatusText(manual.status)}
                </span>
            </div>
        </a>
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
        showError('Erro ao carregar atividade recente.');
    }
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