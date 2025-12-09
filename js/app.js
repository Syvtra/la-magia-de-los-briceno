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
        initThemeSelector();
        initEffectControls();
        initNotificationToggle();
    } catch (e) {
        console.error('Events init error:', e);
    }
    
    // Cargar tema guardado inmediatamente
    loadSavedTheme();
    
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
    setTimeout(async () => {
        try {
            if (isLoggedIn) {
                Navigation.showScreen('home');
                subscribeToRealtimeUpdates();
                
                // Inicializar tutorial y botón de ayuda
                if (typeof Tutorial !== 'undefined') {
                    Tutorial.init();
                    addHelpButton();
                }
                
                // Verificar si hay mensaje de admin pendiente
                await checkAdminMessage();
                
                // Verificar si hay sorteo pendiente de mostrar
                await checkPendingSorteo();
                
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
    // Suscribirse a cambios en asignaciones (sorteo)
    db.subscribeToAssignments(async (payload) => {
        console.log('Realtime: assignments changed', payload.eventType);
        
        // Verificar si es mi asignación
        const isMyAssignment = payload.new && Auth.currentUser && payload.new.giver_id === Auth.currentUser.id;
        
        if (payload.eventType === 'INSERT' && isMyAssignment) {
            // ¡Me tocó! Recargar datos y mostrar alerta especial
            await Sorteo.loadData();
            
            // Reproducir sonido festivo
            Effects.playSound('reveal');
            
            // Mostrar alerta especial
            showSorteoAlert();
            
            // Enviar notificación local
            if (typeof Notifications !== 'undefined') {
                Notifications.showLocalNotification(
                    '🎄 ¡Sorteo realizado!',
                    '¡Ya puedes ver quién es tu amigo secreto!',
                    {
                        tag: 'sorteo-realizado',
                        onClick: () => {
                            Navigation.showScreen('sorteo');
                            Sorteo.revealAssignment();
                        }
                    }
                );
            }
        } else if (payload.eventType === 'INSERT') {
            // Otro usuario recibió asignación, solo recargar
            await Sorteo.loadData();
        } else if (payload.eventType === 'DELETE') {
            await Sorteo.loadData();
            showToast('El sorteo ha sido reiniciado', 'info');
        }
    });
    
    // Suscribirse a cambios en configuración global
    db.subscribeToSettings((payload) => {
        console.log('Realtime: settings changed');
        if (payload.new) {
            Effects.applyGlobalSettings(payload.new);
        }
    });
    
    // Suscribirse a cambios en usuarios (nuevos registros, actualizaciones)
    db.subscribeToUsers(async (payload) => {
        console.log('Realtime: users changed', payload.eventType);
        
        // Si es mi propio perfil, actualizar UI
        if (payload.new && Auth.currentUser && payload.new.id === Auth.currentUser.id) {
            const oldProfile = Auth.userProfile;
            Auth.userProfile = payload.new;
            Auth.updateUI();
            
            // Verificar si hay un mensaje de admin nuevo (que no tenía antes)
            const hadMessage = oldProfile?.admin_message;
            const hasMessage = payload.new.admin_message;
            
            if (!hadMessage && hasMessage) {
                // ¡Nuevo mensaje de admin! Mostrarlo en tiempo real
                showAdminMessageAlert(payload.new.admin_message, payload.new.admin_message_from);
                
                // Limpiar el mensaje de la base de datos
                try {
                    await db.clearAdminMessage(Auth.currentUser.id);
                    Auth.userProfile.admin_message = null;
                    Auth.userProfile.admin_message_from = null;
                } catch (error) {
                    console.error('Error clearing admin message:', error);
                }
            }
        }
        
        // Actualizar aldea si está visible
        if (typeof Village !== 'undefined' && typeof Village.render === 'function') {
            Village.render();
        }
        // Actualizar admin si está visible
        if (Auth.isAdmin() && typeof Admin !== 'undefined') {
            Admin.loadData();
        }
    });
    
    // Suscribirse a cambios en wishlists
    db.subscribeToWishlists((payload) => {
        console.log('Realtime: wishlist changed', payload.eventType);
        
        // Si es mi wishlist, recargar
        if (payload.new && Auth.currentUser && payload.new.user_id === Auth.currentUser.id) {
            Wishlist.loadData();
        }
        // Si cambió la wishlist de mi amigo secreto, notificar
        if (payload.new && Sorteo.assignment && payload.new.user_id === Sorteo.assignment.receiver_id) {
            Sorteo.loadFriendWishlist();
            showToast('Tu amigo secreto actualizó su lista', 'info');
        }
    });
    
    // Suscribirse a cambios en parejas (admin)
    db.subscribeToPairs((payload) => {
        console.log('Realtime: pairs changed', payload.eventType);
        if (Auth.isAdmin() && typeof Admin !== 'undefined') {
            Admin.loadData();
        }
    });
}

// Verificar si hay un sorteo pendiente de mostrar al entrar a la app
async function checkPendingSorteo() {
    if (!Auth.currentUser) return;
    
    try {
        // Cargar datos del sorteo
        await Sorteo.loadData();
        
        // Si hay asignación, verificar si ya la vio
        if (Sorteo.assignment) {
            const sorteoKey = `sorteo_seen_${Auth.currentUser.id}`;
            const lastSeenSorteo = localStorage.getItem(sorteoKey);
            
            // Si no ha visto este sorteo, mostrar alerta
            if (!lastSeenSorteo || lastSeenSorteo !== Sorteo.assignment.id) {
                // Esperar un momento para que la UI se estabilice
                setTimeout(() => {
                    Effects.playSound('reveal');
                    showSorteoAlert();
                }, 500);
            }
        }
    } catch (e) {
        console.log('Error checking pending sorteo:', e);
    }
}

// Alerta especial cuando se realiza el sorteo
function showSorteoAlert() {
    const alertHTML = `
        <div id="sorteo-alert" class="sorteo-alert">
            <div class="sorteo-alert-content">
                <div class="sorteo-alert-icon">🎄</div>
                <h2>¡Sorteo Realizado!</h2>
                <p>Ya tienes asignado tu amigo secreto</p>
                <button class="btn btn-primary" id="btn-ver-amigo">
                    <span>Ver mi amigo secreto</span>
                    <span class="btn-glow"></span>
                </button>
            </div>
        </div>
    `;
    
    // Insertar alerta en el DOM
    document.body.insertAdjacentHTML('beforeend', alertHTML);
    
    const alert = document.getElementById('sorteo-alert');
    const btnVer = document.getElementById('btn-ver-amigo');
    
    // Animar entrada
    setTimeout(() => {
        alert.classList.add('active');
    }, 100);
    
    // Marcar como visto
    function markAsSeen() {
        if (Auth.currentUser && Sorteo.assignment) {
            const sorteoKey = `sorteo_seen_${Auth.currentUser.id}`;
            localStorage.setItem(sorteoKey, Sorteo.assignment.id);
        }
    }
    
    // Click en botón
    btnVer.addEventListener('click', () => {
        markAsSeen();
        alert.classList.remove('active');
        setTimeout(() => {
            alert.remove();
        }, 300);
        Navigation.showScreen('sorteo');
        Sorteo.revealAssignment();
    });
    
    // Click fuera cierra
    alert.addEventListener('click', (e) => {
        if (e.target === alert) {
            markAsSeen();
            alert.classList.remove('active');
            setTimeout(() => {
                alert.remove();
            }, 300);
        }
    });
}

// Verificar si hay mensaje de admin pendiente
async function checkAdminMessage() {
    if (!Auth.currentUser) return;
    
    try {
        // Recargar perfil fresco desde la base de datos
        const freshProfile = await db.getUser(Auth.currentUser.id);
        console.log('Checking admin message, fresh profile:', freshProfile);
        
        const message = freshProfile?.admin_message;
        const fromNickname = freshProfile?.admin_message_from;
        
        if (message) {
            console.log('Admin message found:', message, 'from:', fromNickname);
            // Mostrar el mensaje
            showAdminMessageAlert(message, fromNickname);
            
            // Limpiar el mensaje de la base de datos
            try {
                await db.clearAdminMessage(Auth.currentUser.id);
                Auth.userProfile.admin_message = null;
                Auth.userProfile.admin_message_from = null;
            } catch (error) {
                console.error('Error clearing admin message:', error);
            }
        } else {
            console.log('No admin message pending');
        }
    } catch (error) {
        console.error('Error checking admin message:', error);
    }
}

// Mostrar alerta de mensaje de admin
function showAdminMessageAlert(message, fromNickname) {
    const alertHTML = `
        <div id="admin-message-alert" class="admin-message-alert">
            <div class="admin-message-content">
                <div class="admin-message-icon">💬</div>
                <h2>Mensaje del Admin</h2>
                <p class="admin-message-from">De: @${Utils.sanitizeHTML(fromNickname || 'Admin')}</p>
                <div class="admin-message-text">${Utils.sanitizeHTML(message)}</div>
                <button class="btn btn-primary btn-block" id="btn-close-admin-msg">
                    Entendido
                </button>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', alertHTML);
    
    const alert = document.getElementById('admin-message-alert');
    const btnClose = document.getElementById('btn-close-admin-msg');
    
    // Animar entrada
    setTimeout(() => {
        alert.classList.add('active');
    }, 100);
    
    // Cerrar al hacer click en el botón
    btnClose.addEventListener('click', () => {
        alert.classList.remove('active');
        setTimeout(() => {
            alert.remove();
        }, 300);
    });
    
    // Cerrar al hacer click fuera
    alert.addEventListener('click', (e) => {
        if (e.target === alert) {
            alert.classList.remove('active');
            setTimeout(() => {
                alert.remove();
            }, 300);
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

// Service Worker - compatible con iOS Safari y Android Chrome
function isWebBrowser() {
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
                
                // Verificar actualizaciones cada 60 segundos
                setInterval(() => {
                    registration.update();
                }, 60000);
                
                // Detectar nueva versión disponible
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // Nueva versión disponible
                            if (confirm('Nueva versión disponible. ¿Actualizar ahora?')) {
                                newWorker.postMessage('skipWaiting');
                                window.location.reload();
                            }
                        }
                    });
                });
            })
            .catch(error => {
                console.log('SW registration failed:', error);
            });
    });
    
    // Recargar cuando el SW tome control
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
            refreshing = true;
            window.location.reload();
        }
    });
}
