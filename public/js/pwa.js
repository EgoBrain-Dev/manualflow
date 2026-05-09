// PWA functionality
let deferredPrompt;

// Check if the browser supports service workers
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/sw.js')
      .then(function(registration) {
        console.log('SW registered: ', registration);
      })
      .catch(function(registrationError) {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

// Handle install prompt
window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent the mini-infobar from appearing on mobile
  e.preventDefault();
  // Stash the event so it can be triggered later.
  deferredPrompt = e;
  // Update UI to notify the user they can add to home screen
  showInstallButton();
});

// Handle successful installation
window.addEventListener('appinstalled', (evt) => {
  console.log('PWA was installed successfully');
  hideInstallButton();
});

// Show install button in header
function showInstallButton() {
  // Try to find the user menu area in header
  const userMenu = document.getElementById('userMenu') || document.querySelector('header');
  
  if (!userMenu || document.getElementById('installButtonContainer')) {
    return; // Already shown or no header found
  }

  const installContainer = document.createElement('div');
  installContainer.id = 'installButtonContainer';
  installContainer.className = 'flex items-center space-x-2 ml-4';
  installContainer.innerHTML = `
    <button id="installButton" class="flex items-center px-3 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors text-sm font-medium">
      <i class="fas fa-download mr-2"></i>
      Instalar App
    </button>
  `;

  // Insert before user menu or at the end of header
  const headerContent = document.querySelector('header .flex.justify-between');
  if (headerContent) {
    const userActions = headerContent.querySelector('.flex.items-center.space-x-');
    if (userActions) {
      userActions.insertAdjacentElement('beforebegin', installContainer);
    } else {
      headerContent.appendChild(installContainer);
    }
  }

  const installButton = document.getElementById('installButton');
  if (installButton) {
    installButton.addEventListener('click', installPWA);
  }
}

function hideInstallButton() {
  const installContainer = document.getElementById('installButtonContainer');
  if (installContainer) {
    installContainer.remove();
  }
}

function installPWA() {
  // Hide the app provided install promotion
  hideInstallButton();
  // Show the install prompt
  if (deferredPrompt) {
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      deferredPrompt = null;
    });
  }
}

// Check if app is running in standalone mode
function isPWA() {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true;
}

// Add PWA-specific styling if running as PWA
if (isPWA()) {
  document.documentElement.classList.add('pwa-mode');
}

// Theme toggle functionality
function initThemeToggle() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  setTheme(savedTheme);
  
  // Create theme toggle button
  const userMenu = document.getElementById('userMenu');
  if (userMenu && !document.getElementById('themeToggle')) {
    const themeToggle = document.createElement('button');
    themeToggle.id = 'themeToggle';
    themeToggle.className = 'p-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors';
    themeToggle.title = 'Alternar tema';
    themeToggle.innerHTML = '<i class="fas fa-moon text-lg"></i>';
    themeToggle.addEventListener('click', toggleTheme);
    
    userMenu.parentNode.insertBefore(themeToggle, userMenu);
  }
}

function setTheme(theme) {
  const html = document.documentElement;
  if (theme === 'dark') {
    html.classList.add('dark');
    localStorage.setItem('theme', 'dark');
    updateThemeToggleIcon('dark');
  } else {
    html.classList.remove('dark');
    localStorage.setItem('theme', 'light');
    updateThemeToggleIcon('light');
  }
}

function toggleTheme() {
  const html = document.documentElement;
  const currentTheme = html.classList.contains('dark') ? 'dark' : 'light';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  setTheme(newTheme);
}

function updateThemeToggleIcon(theme) {
  const toggle = document.getElementById('themeToggle');
  if (toggle) {
    toggle.innerHTML = theme === 'dark' 
      ? '<i class="fas fa-sun text-lg"></i>' 
      : '<i class="fas fa-moon text-lg"></i>';
  }
}

// Handle online/offline status
function updateOnlineStatus() {
  const status = navigator.onLine ? 'online' : 'offline';
  console.log('Connection status:', status);

  // You can dispatch custom events or update UI here
  if (!navigator.onLine) {
    showOfflineMessage();
  } else {
    hideOfflineMessage();
  }
}

function showOfflineMessage() {
  const message = document.createElement('div');
  message.id = 'offlineMessage';
  message.className = 'fixed top-0 left-0 right-0 bg-yellow-500 text-white text-center py-2 z-50';
  message.innerHTML = '<i class="fas fa-wifi-slash mr-2"></i>Você está offline. Algumas funcionalidades podem não estar disponíveis.';
  document.body.appendChild(message);
}

function hideOfflineMessage() {
  const message = document.getElementById('offlineMessage');
  if (message) {
    message.remove();
  }
}

window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

// Initialize PWA features
document.addEventListener('DOMContentLoaded', () => {
  initThemeToggle();
});

// Initial check
updateOnlineStatus();