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
    
    // Mostrar modal con la notificación
    async showNotificationModal(notification) {
        return new Promise((resolve) => {
            const content = `
                <div class="admin-notification-modal">
                    <div class="notif-icon">📢</div>
                    <h2>${Utils.sanitizeHTML(notification.title)}</h2>
                    <p class="notif-message">${Utils.sanitizeHTML(notification.message)}</p>
                    <p class="notif-date">${this.formatDate(notification.created_at)}</p>
                    <button class="btn btn-primary btn-block" id="btn-mark-read">
                        Entendido
                    </button>
                </div>
            `;
            
            showModal(content);
            
            // Reproducir sonido
            try { Effects.playSound('notification'); } catch(e) {}
            
            const btn = Utils.$('#btn-mark-read');
            if (btn) {
                btn.addEventListener('click', async () => {
                    try {
                        await db.markNotificationAsRead(notification.id, Auth.currentUser.id);
                    } catch (e) {
                        console.log('Error marking as read:', e);
                    }
                    hideModal();
                    resolve();
                });
            }
            
            // También cerrar con el botón X del modal
            const closeBtn = Utils.$('#modal-close');
            if (closeBtn) {
                const originalHandler = closeBtn.onclick;
                closeBtn.onclick = async () => {
                    try {
                        await db.markNotificationAsRead(notification.id, Auth.currentUser.id);
                    } catch (e) {}
                    if (originalHandler) originalHandler();
                    resolve();
                };
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
