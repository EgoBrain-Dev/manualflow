// PWA functionality
window.deferredPrompt = null;

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
  window.deferredPrompt = e;
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
  const header = document.querySelector('header');
  if (!header || document.getElementById('installButtonContainer')) {
    return;
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

  const headerContent = header.querySelector('.flex.justify-between') || header;
  headerContent.appendChild(installContainer);

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
  hideInstallButton();

  if (window.deferredPrompt) {
    window.deferredPrompt.prompt();
    window.deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      window.deferredPrompt = null;
    });
  } else {
    alert('Instalação PWA indisponível. Use o menu do navegador para adicionar à tela inicial.');
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

// Theme toggle functionality is now handled globally by js/theme.js

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

window.addEventListener('error', (event) => {
  console.error('Runtime error detected:', event.error || event.message);
  alert(`Erro de aplicação: ${event.message || event.error?.message || 'Ver console para detalhes.'}`);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  alert(`Erro assíncrono: ${event.reason?.message || event.reason || 'Ver console para detalhes.'}`);
});

// Initialize PWA features
document.addEventListener('DOMContentLoaded', () => {
  // Add any specific PWA initialization here
});

// Initial check
updateOnlineStatus();