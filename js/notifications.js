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
        // Mostrar notificación local a usuarios con la app abierta
        this.showLocalNotification(title, body);
        
        // Por ahora solo notificaciones locales
        // Las push notifications requieren Edge Function
        console.log('Notificación enviada:', title, body);
        
        return true;
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
