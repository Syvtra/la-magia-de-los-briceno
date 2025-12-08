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
                Effects.playSound('click');
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
                Effects.playSound('click');
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
            Effects.playSound('click');
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
            
            case 'secret-chat':
                this.showScreen('chat');
                Chat.init();
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
        
        Effects.playSound('click');
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
                this.renderSuggestions(assignment.receiver);
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
    
    renderSuggestions(receiver) {
        const container = Utils.$('#suggestions-list');
        if (!container) return;
        
        const interests = receiver.interests?.toLowerCase() || '';
        const suggestions = CONFIG.GIFT_SUGGESTIONS.filter(s => {
            return interests.includes(s.category) || Math.random() > 0.7;
        }).slice(0, 3);
        
        if (suggestions.length === 0) {
            container.innerHTML = '<p class="empty-state">Las sugerencias aparecerán cuando tengas asignado un amigo</p>';
            return;
        }
        
        container.innerHTML = suggestions.map(s => `
            <div class="suggestion-item">
                <span class="suggestion-icon">${s.icon}</span>
                <div class="suggestion-info">
                    <h4>${s.name}</h4>
                    <p>Basado en sus intereses</p>
                </div>
            </div>
        `).join('');
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

function initPreferencesForm() {
    const form = Utils.$('#preferences-form');
    if (!form) return;
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const priceRange = Utils.$('#pref-budget').value;
        const interests = Utils.$('#pref-interests').value;
        
        try {
            await Auth.updateProfile({
                price_range: priceRange,
                interests: interests
            });
            showToast('Preferencias guardadas', 'success');
        } catch (error) {
            showToast('Error al guardar preferencias', 'error');
        }
    });
}

const Village = {
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
                const firstName = user.name?.split(' ')[0] || 'Usuario';
                
                return `
                    <div class="village-house" data-user-id="${user.id}">
                        <div class="house-structure ${isActive ? 'lit' : ''}"></div>
                        <div class="house-elf">${avatar}</div>
                        <div class="house-name">${Utils.sanitizeHTML(firstName)}</div>
                    </div>
                `;
            }).join('');
        } catch (error) {
            console.error('Error rendering village:', error);
        }
    },
    
    isUserActive(user) {
        if (!user.last_active) return false;
        
        const lastActive = new Date(user.last_active);
        const now = new Date();
        const diffHours = (now - lastActive) / (1000 * 60 * 60);
        
        return diffHours < 24;
    }
};
