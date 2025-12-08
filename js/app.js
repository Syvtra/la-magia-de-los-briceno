document.addEventListener('DOMContentLoaded', async () => {
    await initApp();
});

async function initApp() {
    showSplash();
    
    initSupabase();
    
    initModalEvents();
    initAuthForms();
    initWishlistEvents();
    initChatEvents();
    initAdminEvents();
    initPreferencesForm();
    initEffectControls();
    initNotificationToggle();
    
    Navigation.init();
    
    Effects.init();
    
    await loadGlobalSettings();
    
    const isLoggedIn = await Auth.init();
    
    setTimeout(() => {
        if (isLoggedIn) {
            Navigation.showScreen('home');
            subscribeToRealtimeUpdates();
            
            // Inicializar tutorial y botón de ayuda
            Tutorial.init();
            addHelpButton();
            
            // Suscribirse a notificaciones de mensajes
            subscribeToMessageNotifications();
        } else {
            Navigation.showScreen('login');
        }
    }, 2000);
    
    Notifications.init();
    
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
    Chat.cleanup();
});

if ('serviceWorker' in navigator) {
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
