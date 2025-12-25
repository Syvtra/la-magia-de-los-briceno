const Notifications = {
    subscription: null,
    
    // Detectar si estamos en un WebView de APK
    isWebView() {
        const userAgent = navigator.userAgent.toLowerCase();
        return userAgent.includes('wv') || 
               userAgent.includes('webview') ||
               (userAgent.includes('android') && userAgent.includes('version/'));
    },
    
    async init() {
        // En WebViews de APK, solo usar notificaciones locales simples
        if (this.isWebView()) {
            console.log('Running in WebView, using simple notifications');
            return;
        }
        
        // Si no hay soporte para notificaciones, salir silenciosamente
        if (!('Notification' in window)) {
            console.log('Notifications not supported');
            return;
        }
        
        // Intentar registrar Service Worker solo si está soportado
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            try {
                const registration = await navigator.serviceWorker.register('./sw.js');
                console.log('Service Worker registered');
                
                const existingSubscription = await registration.pushManager.getSubscription();
                
                if (existingSubscription) {
                    this.subscription = existingSubscription;
                    await this.saveSubscription(existingSubscription);
                }
            } catch (error) {
                // Service Worker falló, pero podemos usar notificaciones locales
                console.log('Service Worker not available, using local notifications only');
            }
        }
    },
    
    async autoRequestPermission() {
        // Solo pedir si no se ha decidido antes
        if (Notification.permission === 'default') {
            // Esperar un poco para no ser intrusivo
            setTimeout(async () => {
                const granted = await this.requestPermission();
                if (granted) {
                    const toggle = Utils.$('#setting-notifications');
                    if (toggle) toggle.checked = true;
                }
            }, 3000);
        }
    },
    
    async requestPermission() {
        if (!('Notification' in window)) {
            showToast('Tu navegador no soporta notificaciones', 'error');
            return false;
        }
        
        const permission = await Notification.requestPermission();
        
        if (permission === 'granted') {
            await this.subscribe();
            return true;
        }
        
        showToast('Permiso de notificaciones denegado', 'info');
        return false;
    },
    
    async subscribe() {
        try {
            const registration = await navigator.serviceWorker.ready;
            
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: this.urlBase64ToUint8Array(CONFIG.VAPID_PUBLIC_KEY)
            });
            
            this.subscription = subscription;
            await this.saveSubscription(subscription);
            
            showToast('Notificaciones activadas', 'success');
            
        } catch (error) {
            console.error('Error subscribing to push:', error);
            showToast('Error al activar notificaciones', 'error');
        }
    },
    
    async saveSubscription(subscription) {
        if (!Auth.currentUser) return;
        
        try {
            await db.updateUser(Auth.currentUser.id, {
                push_subscription: JSON.stringify(subscription)
            });
        } catch (error) {
            console.error('Error saving subscription:', error);
        }
    },
    
    async sendToAll(title, body) {
        try {
            // Guardar notificación en la base de datos para que todos la vean
            await db.createAdminNotification(title, body);
            console.log('Notificación guardada en BD:', title, body);
            
            // También mostrar notificación local a usuarios con la app abierta
            this.showLocalNotification(title, body);
            
            return true;
        } catch (error) {
            console.error('Error guardando notificación:', error);
            throw error;
        }
    },
    
    // Mostrar notificaciones pendientes al usuario
    async showPendingNotifications() {
        if (!Auth.currentUser) return;
        
        try {
            const unread = await db.getUnreadNotifications(Auth.currentUser.id);
            
            if (unread && unread.length > 0) {
                // Mostrar cada notificación no leída
                for (const notif of unread) {
                    await this.showNotificationModal(notif);
                }
            }
        } catch (error) {
            console.error('Error cargando notificaciones:', error);
        }
    },
    
    // Mostrar tarjeta 3D Navideña sin overlay
    async showNotificationModal(notification) {
        return new Promise((resolve) => {
            // Crear contenedor fullscreen para la tarjeta 3D
            const cardOverlay = document.createElement('div');
            cardOverlay.className = 'card-3d-fullscreen';
            cardOverlay.id = 'card-3d-overlay';
            
            cardOverlay.innerHTML = `
                <div class="card-3d-scene">
                    <div class="christmas-card-3d" id="christmas-card">
                        <!-- Frente de la tarjeta -->
                        <div class="card-face-3d card-front-3d">
                            <div class="card-border-glow"></div>
                            <div class="card-inner">
                                <div class="card-snow-effect"></div>
                                <div class="card-header-3d">
                                    <div class="card-ornaments-3d">
                                        <span class="ornament-3d">🎄</span>
                                        <span class="ornament-3d star">⭐</span>
                                        <span class="ornament-3d">🎄</span>
                                    </div>
                                </div>
                                <div class="card-ribbon-3d">
                                    <span>📢 Mensaje Especial</span>
                                </div>
                                <div class="card-body-3d">
                                    <h2 class="card-title-3d">${Utils.sanitizeHTML(notification.title)}</h2>
                                    <div class="card-message-container">
                                        <p class="card-message-3d">${Utils.sanitizeHTML(notification.message)}</p>
                                    </div>
                                    <p class="card-date-3d">🕐 ${this.formatDate(notification.created_at)}</p>
                                </div>
                                <div class="card-footer-3d">
                                    <span>🎁</span><span>❄️</span><span>🎅</span><span>❄️</span><span>🎁</span>
                                </div>
                            </div>
                        </div>
                        <!-- Parte trasera de la tarjeta -->
                        <div class="card-face-3d card-back-3d">
                            <div class="card-border-glow"></div>
                            <div class="card-inner">
                                <div class="card-back-pattern-3d"></div>
                                <div class="back-content-3d">
                                    <div class="back-tree">🎄</div>
                                    <h2 class="back-title-3d">La Magia de los Briceño</h2>
                                    <div class="back-year">Navidad ${new Date().getFullYear()}</div>
                                    <div class="back-santa">
                                        <span>✨</span>
                                        <span class="santa-icon">🎅</span>
                                        <span>✨</span>
                                    </div>
                                    <p class="back-wish">¡Que la magia de la Navidad<br>llene tu hogar de amor y alegría!</p>
                                </div>
                                <div class="back-footer-3d">
                                    <span>❄️</span><span>🦌</span><span>🛷</span><span>🦌</span><span>❄️</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <p class="card-tap-hint">👆 Toca la tarjeta para girarla</p>
                    <button class="btn-accept-3d" id="btn-mark-read-3d">
                        <span>✨</span>
                        <span>¡Entendido!</span>
                        <span>✨</span>
                    </button>
                </div>
            `;
            
            document.body.appendChild(cardOverlay);
            
            // Animar entrada
            requestAnimationFrame(() => {
                cardOverlay.classList.add('active');
            });
            
            // Reproducir sonido
            try { Effects.playSound('notification'); } catch(e) {}
            
            // Evento para girar la tarjeta
            const card = document.getElementById('christmas-card');
            if (card) {
                card.addEventListener('click', () => {
                    card.classList.toggle('flipped');
                });
            }
            
            // Cerrar y marcar como leída
            const closeCard = async () => {
                try {
                    await db.markNotificationAsRead(notification.id, Auth.currentUser.id);
                } catch (e) {
                    console.log('Error marking as read:', e);
                }
                cardOverlay.classList.remove('active');
                setTimeout(() => {
                    cardOverlay.remove();
                    resolve();
                }, 500);
            };
            
            const btn = document.getElementById('btn-mark-read-3d');
            if (btn) {
                btn.addEventListener('click', closeCard);
            }
        });
    },
    
    formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-CL', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    },
    
    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');
        
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        
        return outputArray;
    },
    
    showLocalNotification(title, body, options = {}) {
        if (Notification.permission === 'granted') {
            const notification = new Notification(title, {
                body,
                icon: options.icon || './assets/icon-192.png',
                badge: './assets/badge.png',
                vibrate: [200, 100, 200],
                tag: options.tag || 'navidad-certera',
                renotify: true,
                ...options
            });
            
            // Click en la notificación abre la app
            notification.onclick = () => {
                window.focus();
                if (options.onClick) options.onClick();
                notification.close();
            };
            
            return notification;
        }
        return null;
    },
    
    // Notificación general
    notifyGeneral(title, body) {
        if (document.hasFocus()) return;
        
        this.showLocalNotification(title, body, {
            tag: 'general',
            icon: './assets/icon-192.png'
        });
        
        try { Effects.playSound('notification'); } catch(e) {}
    }
};

function initNotificationToggle() {
    const toggle = Utils.$('#setting-notifications');
    if (!toggle) return;
    
    // Verificar si las notificaciones están soportadas
    if (!('Notification' in window)) {
        toggle.disabled = true;
        toggle.checked = false;
        return;
    }
    
    // Marcar como checked si ya tiene permiso
    toggle.checked = Notification.permission === 'granted';
    
    toggle.addEventListener('change', async (e) => {
        if (e.target.checked) {
            try {
                const granted = await Notifications.requestPermission();
                if (!granted) {
                    e.target.checked = false;
                }
            } catch (error) {
                e.target.checked = false;
                console.log('Error requesting notification permission');
            }
        }
    });
}
