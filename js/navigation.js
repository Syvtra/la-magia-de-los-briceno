const Navigation = {
    currentScreen: 'splash',
    history: [],
    
    init() {
        this.setupNavbar();
        this.setupNavigationButtons();
        this.setupActionButtons();
    },
    
    showScreen(screenId) {
        const screens = Utils.$$('.screen');
        const targetScreen = Utils.$(`#screen-${screenId}`);
        
        if (!targetScreen) {
            console.error(`Screen not found: ${screenId}`);
            return;
        }
        
        screens.forEach(screen => {
            screen.classList.remove('active');
        });
        
        targetScreen.classList.add('active');
        
        if (this.currentScreen !== screenId) {
            this.history.push(this.currentScreen);
        }
        this.currentScreen = screenId;
        
        this.updateNavbar(screenId);
        this.showNavbar(this.shouldShowNavbar(screenId));
        
        this.onScreenChange(screenId);
        
        window.scrollTo(0, 0);
    },
    
    goBack() {
        if (this.history.length > 0) {
            const previousScreen = this.history.pop();
            this.showScreen(previousScreen);
        }
    },
    
    shouldShowNavbar(screenId) {
        const navbarScreens = ['home', 'sorteo', 'wishlist', 'profile'];
        return navbarScreens.includes(screenId);
    },
    
    showNavbar(show) {
        const navbar = Utils.$('#navbar');
        if (navbar) {
            navbar.classList.toggle('hidden', !show);
        }
    },
    
    updateNavbar(screenId) {
        const navItems = Utils.$$('.nav-item');
        navItems.forEach(item => {
            const itemScreen = item.dataset.screen;
            item.classList.toggle('active', itemScreen === screenId);
        });
    },
    
    setupNavbar() {
        const navbar = Utils.$('#navbar');
        if (!navbar) return;
        
        navbar.addEventListener('click', (e) => {
            const navItem = e.target.closest('.nav-item');
            if (!navItem) return;
            
            const screenId = navItem.dataset.screen;
            if (screenId) {
                this.showScreen(screenId);
            }
        });
    },
    
    setupNavigationButtons() {
        document.addEventListener('click', (e) => {
            const navBtn = e.target.closest('[data-navigate]');
            if (!navBtn) return;
            
            const screenId = navBtn.dataset.navigate;
            if (screenId) {
                this.showScreen(screenId);
            }
        });
        
        document.addEventListener('click', (e) => {
            const backBtn = e.target.closest('.btn-back');
            if (!backBtn) return;
            
            const targetScreen = backBtn.dataset.navigate;
            if (targetScreen) {
                this.showScreen(targetScreen);
            } else {
                this.goBack();
            }
        });
    },
    
    setupActionButtons() {
        document.addEventListener('click', (e) => {
            const actionBtn = e.target.closest('[data-action]');
            if (!actionBtn) return;
            
            const action = actionBtn.dataset.action;
            this.handleAction(action);
        });
    },
    
    handleAction(action) {
        switch (action) {
            case 'view-assignment':
                this.showScreen('sorteo');
                Sorteo.revealAssignment();
                break;
            
            
            case 'view-map':
                this.showScreen('map');
                Village.render();
                break;
            
            case 'view-wishlist-friend':
                Sorteo.showFriendWishlist();
                break;
            
            default:
                console.log('Unknown action:', action);
        }
    },
    
    onScreenChange(screenId) {
        switch (screenId) {
            case 'home':
                this.loadHomeData();
                break;
            
            case 'sorteo':
                Sorteo.loadData();
                break;
            
            case 'wishlist':
                Wishlist.loadData();
                break;
            
            case 'profile':
                this.loadProfileData();
                break;
            
            case 'admin':
                Admin.loadData();
                break;
            
            case 'map':
                Village.render();
                break;
        }
    },
    
    async loadHomeData() {
        if (!Auth.currentUser) return;
        
        try {
            const wishlist = await db.getWishlist(Auth.currentUser.id);
            this.renderWishlistPreview(wishlist);
            
            const assignment = await db.getAssignment(Auth.currentUser.id);
            if (assignment?.receiver) {
                await this.renderFriendWishlist(assignment.receiver);
            }
            
            Village.renderPreview();
            
            const statWishes = Utils.$('#stat-wishes');
            if (statWishes) statWishes.textContent = wishlist.length;
            
        } catch (error) {
            console.error('Error loading home data:', error);
        }
    },
    
    renderWishlistPreview(wishlist) {
        const container = Utils.$('#wishlist-preview');
        if (!container) return;
        
        if (wishlist.length === 0) {
            container.innerHTML = '<p class="empty-state">Aún no has agregado deseos</p>';
            return;
        }
        
        const items = wishlist.slice(0, 3);
        container.innerHTML = items.map(item => `
            <div class="wishlist-preview-item">
                <span class="item-icon">🎁</span>
                <span class="item-name">${Utils.sanitizeHTML(item.item)}</span>
            </div>
        `).join('');
    },
    
    async renderFriendWishlist(receiver) {
        const container = Utils.$('#suggestions-list');
        if (!container) return;
        
        try {
            // Obtener la lista de deseos y exclusiones del amigo secreto
            const wishlist = await db.getWishlist(receiver.id);
            const noWishList = await db.getNoWishList(receiver.id);
            
            const firstName = Utils.sanitizeHTML(receiver.name?.split(' ')[0] || 'Tu amigo');
            
            // Crear HTML con dos columnas
            let html = `<div class="friend-lists-grid">`;
            
            // Columna: Lo que quiere
            html += `<div class="friend-list-column wants">
                <h4 class="column-title">✅ Quiere</h4>`;
            
            if (wishlist.length === 0) {
                html += `<p class="empty-mini">Sin deseos aún</p>`;
            } else {
                const wants = wishlist.slice(0, 3);
                html += wants.map(item => `
                    <div class="friend-list-item want">
                        <span>🎁</span>
                        <span>${Utils.sanitizeHTML(item.item)}</span>
                    </div>
                `).join('');
            }
            html += `</div>`;
            
            // Columna: Lo que NO quiere
            html += `<div class="friend-list-column no-wants">
                <h4 class="column-title">❌ No quiere</h4>`;
            
            if (noWishList.length === 0) {
                html += `<p class="empty-mini">Sin exclusiones</p>`;
            } else {
                const noWants = noWishList.slice(0, 3);
                html += noWants.map(item => `
                    <div class="friend-list-item no-want">
                        <span>🚫</span>
                        <span>${Utils.sanitizeHTML(item.item)}</span>
                    </div>
                `).join('');
            }
            html += `</div>`;
            
            html += `</div>`;
            
            container.innerHTML = html;
            
        } catch (error) {
            console.error('Error loading friend wishlist:', error);
            container.innerHTML = '<p class="empty-state">Error al cargar la lista</p>';
        }
    },
    
    loadProfileData() {
        Auth.updateUI();
        
        const prefBudget = Utils.$('#pref-budget');
        const prefInterests = Utils.$('#pref-interests');
        
        if (Auth.userProfile) {
            if (prefBudget && Auth.userProfile.price_range) {
                prefBudget.value = Auth.userProfile.price_range;
            }
            if (prefInterests && Auth.userProfile.interests) {
                prefInterests.value = Auth.userProfile.interests;
            }
        }
    }
};

function initThemeSelector() {
    const lightBtn = Utils.$('#theme-light');
    const darkBtn = Utils.$('#theme-dark');
    
    if (!lightBtn || !darkBtn) return;
    
    // Cargar tema guardado
    const savedTheme = localStorage.getItem('app_theme') || 'light';
    applyTheme(savedTheme);
    
    lightBtn.addEventListener('click', () => {
        applyTheme('light');
        localStorage.setItem('app_theme', 'light');
        showToast('Tema claro activado', 'success');
    });
    
    darkBtn.addEventListener('click', () => {
        applyTheme('dark');
        localStorage.setItem('app_theme', 'dark');
        showToast('Tema oscuro activado', 'success');
    });
}

function applyTheme(theme) {
    const lightBtn = Utils.$('#theme-light');
    const darkBtn = Utils.$('#theme-dark');
    
    if (theme === 'dark') {
        document.body.classList.add('dark-theme');
        if (lightBtn) lightBtn.classList.remove('active');
        if (darkBtn) darkBtn.classList.add('active');
    } else {
        document.body.classList.remove('dark-theme');
        if (lightBtn) lightBtn.classList.add('active');
        if (darkBtn) darkBtn.classList.remove('active');
    }
}

// Aplicar tema al cargar la página
function loadSavedTheme() {
    const savedTheme = localStorage.getItem('app_theme') || 'light';
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
    }
}

const Village = {
    isDragging: false,
    startX: 0,
    startY: 0,
    scrollLeft: 0,
    scrollTop: 0,
    
    async renderPreview() {
        const container = Utils.$('.village-houses');
        if (!container) return;
        
        try {
            const users = await db.getAllUsers();
            const previewUsers = users.slice(0, 5);
            
            container.innerHTML = previewUsers.map(user => {
                const isActive = this.isUserActive(user);
                return `<div class="mini-house ${isActive ? 'lit' : ''}"></div>`;
            }).join('');
        } catch (error) {
            console.error('Error rendering village preview:', error);
        }
    },
    
    async render() {
        const container = Utils.$('#village-houses-full');
        if (!container) return;
        
        try {
            const users = await db.getAllUsers();
            
            container.innerHTML = users.map(user => {
                const avatar = Utils.getAvatarEmoji(user.avatar_url);
                const isActive = this.isUserActive(user);
                const shortName = Utils.getShortName(user.name);
                
                return `
                    <div class="village-house" data-user-id="${user.id}">
                        <div class="house-structure ${isActive ? 'lit' : ''}"></div>
                        <div class="house-elf">${avatar}</div>
                        <div class="house-name">${Utils.sanitizeHTML(shortName)}</div>
                    </div>
                `;
            }).join('');
            
            // Inicializar drag después de renderizar
            this.initDrag();
        } catch (error) {
            console.error('Error rendering village:', error);
        }
    },
    
    initDrag() {
        const map = Utils.$('#village-map');
        const content = Utils.$('#village-map-content');
        if (!map || !content) return;
        
        // Resetear posición inicial (centrado con el transform base)
        this.scrollLeft = 0;
        this.scrollTop = 0;
        content.style.transform = 'translate(-50%, -50%)';
        
        // Límites de movimiento (margen para no mover demasiado)
        const maxOffset = 100; // píxeles máximos de movimiento
        
        const startDrag = (e) => {
            this.isDragging = true;
            map.style.cursor = 'grabbing';
            
            const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
            const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
            
            this.startX = clientX;
            this.startY = clientY;
        };
        
        const doDrag = (e) => {
            if (!this.isDragging) return;
            e.preventDefault();
            
            const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
            const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
            
            const deltaX = clientX - this.startX;
            const deltaY = clientY - this.startY;
            
            // Calcular nueva posición con límites
            let newX = this.scrollLeft + deltaX;
            let newY = this.scrollTop + deltaY;
            
            // Aplicar límites (margen)
            newX = Math.max(-maxOffset, Math.min(maxOffset, newX));
            newY = Math.max(-maxOffset, Math.min(maxOffset, newY));
            
            content.style.transform = `translate(calc(-50% + ${newX}px), calc(-50% + ${newY}px))`;
        };
        
        const endDrag = (e) => {
            if (!this.isDragging) return;
            this.isDragging = false;
            map.style.cursor = 'grab';
            
            const clientX = e.type.includes('touch') ? 
                (e.changedTouches ? e.changedTouches[0].clientX : this.startX) : e.clientX;
            const clientY = e.type.includes('touch') ? 
                (e.changedTouches ? e.changedTouches[0].clientY : this.startY) : e.clientY;
            
            const deltaX = clientX - this.startX;
            const deltaY = clientY - this.startY;
            
            // Actualizar posición guardada con límites
            this.scrollLeft = Math.max(-maxOffset, Math.min(maxOffset, this.scrollLeft + deltaX));
            this.scrollTop = Math.max(-maxOffset, Math.min(maxOffset, this.scrollTop + deltaY));
        };
        
        // Remover listeners previos si existen
        map.removeEventListener('mousedown', startDrag);
        map.removeEventListener('touchstart', startDrag);
        
        // Mouse events
        map.addEventListener('mousedown', startDrag);
        document.addEventListener('mousemove', doDrag);
        document.addEventListener('mouseup', endDrag);
        
        // Touch events
        map.addEventListener('touchstart', startDrag, { passive: false });
        document.addEventListener('touchmove', doDrag, { passive: false });
        document.addEventListener('touchend', endDrag);
    },
    
    isUserActive(user) {
        if (!user.last_active) return false;
        
        const lastActive = new Date(user.last_active);
        const now = new Date();
        const diffHours = (now - lastActive) / (1000 * 60 * 60);
        
        return diffHours < 24;
    }
};
