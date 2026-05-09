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

// Show install button (you can add this to your UI)
function showInstallButton() {
  // Create or show an install button
  const installButton = document.createElement('button');
  installButton.id = 'installButton';
  installButton.innerHTML = '<i class="fas fa-download mr-2"></i>Instalar App';
  installButton.className = 'fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-blue-700 transition-colors z-50';
  installButton.addEventListener('click', installPWA);
  document.body.appendChild(installButton);
}

function hideInstallButton() {
  const installButton = document.getElementById('installButton');
  if (installButton) {
    installButton.remove();
  }
}

function installPWA() {
  // Hide the app provided install promotion
  hideInstallButton();
  // Show the install prompt
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

// Check if app is running in standalone mode
function isPWA() {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true;
}

// Add PWA-specific styling if running as PWA
if (isPWA()) {
  document.documentElement.classList.add('pwa-mode');
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

// Initial check
updateOnlineStatus();