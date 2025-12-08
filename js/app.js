document.addEventListener('DOMContentLoaded', async () => {
    try {
        await initApp();
    } catch (error) {
        console.error('Error initializing app:', error);
        // Si hay error, al menos mostrar login
        try {
            Navigation.showScreen('login');
        } catch (e) {
            // Fallback: ocultar splash y mostrar login manualmente
            const splash = document.getElementById('screen-splash');
            const login = document.getElementById('screen-login');
            if (splash) splash.classList.remove('active');
            if (login) login.classList.add('active');
        }
    }
});

// Fallback de seguridad: si después de 5 segundos sigue en splash, forzar login
setTimeout(() => {
    const splash = document.getElementById('screen-splash');
    if (splash && splash.classList.contains('active')) {
        console.warn('App stuck on splash, forcing login screen');
        splash.classList.remove('active');
        const login = document.getElementById('screen-login');
        if (login) login.classList.add('active');
        const navbar = document.getElementById('navbar');
        if (navbar) navbar.classList.add('hidden');
    }
}, 5000);

async function initApp() {
    showSplash();
    
    try {
        initSupabase();
    } catch (e) {
        console.error('Supabase init error:', e);
    }
    
    try {
        initModalEvents();
        initAuthForms();
        initWishlistEvents();
        initAdminEvents();
        initPreferencesForm();
        initEffectControls();
        initNotificationToggle();
    } catch (e) {
        console.error('Events init error:', e);
    }
    
    try {
        Navigation.init();
    } catch (e) {
        console.error('Navigation init error:', e);
    }
    
    try {
        Effects.init();
    } catch (e) {
        console.error('Effects init error:', e);
    }
    
    await loadGlobalSettings();
    
    let isLoggedIn = false;
    try {
        isLoggedIn = await Auth.init();
    } catch (e) {
        console.error('Auth init error:', e);
    }
    
    // Mostrar pantalla después del splash
    setTimeout(() => {
        try {
            if (isLoggedIn) {
                Navigation.showScreen('home');
                subscribeToRealtimeUpdates();
                
                // Inicializar tutorial y botón de ayuda
                if (typeof Tutorial !== 'undefined') {
                    Tutorial.init();
                    addHelpButton();
                }
                
            } else {
                Navigation.showScreen('login');
            }
        } catch (e) {
            console.error('Screen show error:', e);
            Navigation.showScreen('login');
        }
    }, 2000);
    
    // Inicializar notificaciones solo si está soportado
    try {
        if (typeof Notifications !== 'undefined') {
            Notifications.init();
        }
    } catch (e) {
        console.error('Notifications init error:', e);
    }
    
    updateLastActive();
}

function showSplash() {
    const splash = Utils.$('#screen-splash');
    if (splash) {
        splash.classList.add('active');
    }
}

async function loadGlobalSettings() {
    try {
        const settings = await db.getSettings();
        if (settings) {
            Effects.applyGlobalSettings(settings);
        }
    } catch (error) {
        console.log('Using default settings');
    }
}

function subscribeToRealtimeUpdates() {
    db.subscribeToAssignments((payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'DELETE') {
            Sorteo.loadData();
            
            if (payload.eventType === 'INSERT') {
                showToast('¡El sorteo se ha realizado!', 'info');
                Effects.playSound('notification');
            }
        }
    });
    
    db.subscribeToSettings((payload) => {
        if (payload.new) {
            Effects.applyGlobalSettings(payload.new);
        }
    });
}

async function updateLastActive() {
    if (!Auth.currentUser) return;
    
    try {
        await db.updateUser(Auth.currentUser.id, {
            last_active: new Date().toISOString()
        });
    } catch (error) {
        console.log('Could not update last active');
    }
    
    setInterval(async () => {
        if (Auth.currentUser) {
            try {
                await db.updateUser(Auth.currentUser.id, {
                    last_active: new Date().toISOString()
                });
            } catch (error) {}
        }
    }, 5 * 60 * 1000);
}

window.addEventListener('beforeunload', () => {
    // Cleanup si es necesario
});

// Service Worker - desactivado para APKs (puede causar problemas)
// Solo registrar en navegadores web normales
function isWebBrowser() {
    // Detectar si estamos en un WebView de APK
    const userAgent = navigator.userAgent.toLowerCase();
    const isWebView = userAgent.includes('wv') || 
                      userAgent.includes('webview') ||
                      (userAgent.includes('android') && userAgent.includes('version/'));
    return !isWebView;
}

if ('serviceWorker' in navigator && isWebBrowser()) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => {
                console.log('SW registered:', registration.scope);
            })
            .catch(error => {
                console.log('SW registration failed:', error);
            });
    });
}
