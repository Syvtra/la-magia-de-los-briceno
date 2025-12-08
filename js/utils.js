const Utils = {
    $(selector) {
        return document.querySelector(selector);
    },
    
    $$(selector) {
        return document.querySelectorAll(selector);
    },
    
    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'Ahora';
        if (diff < 3600000) return `Hace ${Math.floor(diff / 60000)} min`;
        if (diff < 86400000) return `Hace ${Math.floor(diff / 3600000)} h`;
        
        return date.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short'
        });
    },
    
    formatTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit'
        });
    },
    
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    generateId() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },
    
    sanitizeHTML(str) {
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    },
    
    getAvatarEmoji(avatarKey) {
        return CONFIG.AVATARS[avatarKey] || '🧝';
    },
    
    getPriceRangeLabel(key) {
        return CONFIG.PRICE_RANGES[key] || key;
    },
    
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    },
    
    storage: {
        get(key) {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : null;
            } catch {
                return null;
            }
        },
        
        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
            } catch (e) {
                console.error('Error saving to localStorage:', e);
            }
        },
        
        remove(key) {
            localStorage.removeItem(key);
        }
    }
};

function showToast(message, type = 'info') {
    const container = Utils.$('#toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: '✓',
        error: '✕',
        info: 'ℹ'
    };
    
    toast.innerHTML = `
        <span class="toast-icon">${icons[type]}</span>
        <span class="toast-message">${Utils.sanitizeHTML(message)}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'toast-out 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function showModal(content, options = {}) {
    const overlay = Utils.$('#modal-overlay');
    const modalContent = Utils.$('#modal-content');
    
    modalContent.innerHTML = content;
    overlay.classList.remove('hidden');
    overlay.classList.add('active');
    
    if (options.onClose) {
        overlay.dataset.onClose = 'true';
        overlay._onClose = options.onClose;
    }
}

function hideModal() {
    const overlay = Utils.$('#modal-overlay');
    overlay.classList.remove('active');
    
    setTimeout(() => {
        overlay.classList.add('hidden');
        Utils.$('#modal-content').innerHTML = '';
        
        if (overlay._onClose) {
            overlay._onClose();
            delete overlay._onClose;
        }
    }, 300);
}

function initModalEvents() {
    const overlay = Utils.$('#modal-overlay');
    const closeBtn = Utils.$('#modal-close');
    
    closeBtn.addEventListener('click', hideModal);
    
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            hideModal();
        }
    });
}
