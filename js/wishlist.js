const Wishlist = {
    items: [],
    noWishItems: [],
    
    async loadData() {
        if (!Auth.currentUser) return;
        
        try {
            this.items = await db.getWishlist(Auth.currentUser.id);
            this.noWishItems = await db.getNoWishList(Auth.currentUser.id);
            
            this.render();
            this.renderNoWish();
        } catch (error) {
            console.error('Error loading wishlist:', error);
            showToast('Error al cargar la lista de deseos', 'error');
        }
    },
    
    render() {
        const container = Utils.$('#wishlist-items');
        if (!container) return;
        
        if (this.items.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>Tu lista está vacía</p>
                    <p>Agrega deseos para ayudar a tu amigo secreto</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.items.map(item => `
            <div class="wish-item animate-slide-up" data-wish-id="${item.id}">
                <div class="wish-item-header">
                    <div class="wish-item-image">🎁</div>
                    <div class="wish-item-info">
                        <h4>${Utils.sanitizeHTML(item.item)}</h4>
                    </div>
                    <div class="wish-item-actions">
                        <button class="btn-edit-wish" data-wish-id="${item.id}">✏️</button>
                        <button class="btn-delete-wish" data-wish-id="${item.id}">🗑️</button>
                    </div>
                </div>
            </div>
        `).join('');
    },
    
    renderNoWish() {
        const container = Utils.$('#no-wish-list');
        if (!container) return;
        
        if (this.noWishItems.length === 0) {
            container.innerHTML = '<p class="empty-state" style="padding: 8px 0;">Sin exclusiones</p>';
            return;
        }
        
        container.innerHTML = this.noWishItems.map(item => `
            <div class="no-wish-item" data-nowish-id="${item.id}">
                <span>${Utils.sanitizeHTML(item.item)}</span>
                <button class="btn-delete-nowish">×</button>
            </div>
        `).join('');
    },
    
    showAddModal() {
        const content = `
            <h2 style="margin-bottom: 16px; color: var(--text-primary);">Agregar Deseo</h2>
            <form id="add-wish-form">
                <div class="input-group">
                    <label for="wish-item">¿Qué te gustaría recibir?</label>
                    <input type="text" id="wish-item" placeholder="Ej: Audífonos, Perfume, Libro..." required>
                </div>
                <button type="submit" class="btn btn-primary btn-block">
                    Agregar a mi lista
                </button>
            </form>
        `;
        
        showModal(content);
        
        const form = Utils.$('#add-wish-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.addWish();
        });
    },
    
    showEditModal(wishId) {
        const wish = this.items.find(w => w.id === wishId);
        if (!wish) return;
        
        const content = `
            <h2 style="margin-bottom: 16px; color: var(--text-primary);">Editar Deseo</h2>
            <form id="edit-wish-form" data-wish-id="${wishId}">
                <div class="input-group">
                    <label for="edit-wish-item">¿Qué te gustaría recibir?</label>
                    <input type="text" id="edit-wish-item" value="${Utils.sanitizeHTML(wish.item)}" required>
                </div>
                <button type="submit" class="btn btn-primary btn-block">
                    Guardar cambios
                </button>
            </form>
        `;
        
        showModal(content);
        
        const form = Utils.$('#edit-wish-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.updateWish(wishId);
        });
    },
    
    async addWish() {
        const item = Utils.$('#wish-item').value.trim();
        
        if (!item) {
            showToast('Escribe qué te gustaría recibir', 'error');
            return;
        }
        
        try {
            const newWish = await db.addWish({
                user_id: Auth.currentUser.id,
                item
            });
            
            this.items.unshift(newWish);
            this.render();
            hideModal();
            
            Spirit.addPoints('addWish');
            Effects.playSound('success');
            showToast('Deseo agregado', 'success');
            
        } catch (error) {
            console.error('Error adding wish:', error);
            showToast('Error al agregar deseo', 'error');
        }
    },
    
    async updateWish(wishId) {
        const item = Utils.$('#edit-wish-item').value.trim();
        
        if (!item) {
            showToast('Escribe qué te gustaría recibir', 'error');
            return;
        }
        
        try {
            const updated = await db.updateWish(wishId, { item });
            
            const index = this.items.findIndex(w => w.id === wishId);
            if (index !== -1) {
                this.items[index] = updated;
            }
            
            this.render();
            hideModal();
            
            Effects.playSound('success');
            showToast('Deseo actualizado', 'success');
            
        } catch (error) {
            console.error('Error updating wish:', error);
            showToast('Error al actualizar deseo', 'error');
        }
    },
    
    async deleteWish(wishId) {
        if (!confirm('¿Eliminar este deseo?')) return;
        
        try {
            await db.deleteWish(wishId);
            this.items = this.items.filter(w => w.id !== wishId);
            this.render();
            
            showToast('Deseo eliminado', 'info');
            
        } catch (error) {
            console.error('Error deleting wish:', error);
            showToast('Error al eliminar deseo', 'error');
        }
    },
    
    showAddNoWishModal() {
        const content = `
            <h2 style="margin-bottom: 16px; color: var(--text-primary);">Agregar Exclusión</h2>
            <p style="margin-bottom: 16px; color: var(--text-secondary); font-size: 0.9rem;">
                Indica algo que NO te gustaría recibir
            </p>
            <form id="add-nowish-form">
                <div class="input-group">
                    <label for="nowish-item">No quiero recibir...</label>
                    <input type="text" id="nowish-item" placeholder="Ej: Ropa, perfumes..." required>
                </div>
                <button type="submit" class="btn btn-primary btn-block">
                    Agregar exclusión
                </button>
            </form>
        `;
        
        showModal(content);
        
        const form = Utils.$('#add-nowish-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.addNoWish();
        });
    },
    
    async addNoWish() {
        const item = Utils.$('#nowish-item').value.trim();
        
        if (!item) {
            showToast('Escribe qué no quieres recibir', 'error');
            return;
        }
        
        try {
            const newItem = await db.addNoWish({
                user_id: Auth.currentUser.id,
                item
            });
            
            this.noWishItems.push(newItem);
            this.renderNoWish();
            hideModal();
            
            showToast('Exclusión agregada', 'success');
            
        } catch (error) {
            console.error('Error adding no-wish:', error);
            showToast('Error al agregar exclusión', 'error');
        }
    },
    
    async deleteNoWish(itemId) {
        try {
            await db.deleteNoWish(itemId);
            this.noWishItems = this.noWishItems.filter(w => w.id !== itemId);
            this.renderNoWish();
            
        } catch (error) {
            console.error('Error deleting no-wish:', error);
            showToast('Error al eliminar exclusión', 'error');
        }
    }
};

function initWishlistEvents() {
    const addWishBtn = Utils.$('#btn-add-wish');
    const addNoWishBtn = Utils.$('#btn-add-no-wish');
    const wishlistContainer = Utils.$('#wishlist-items');
    const noWishContainer = Utils.$('#no-wish-list');
    
    if (addWishBtn) {
        addWishBtn.addEventListener('click', () => {
            Wishlist.showAddModal();
        });
    }
    
    if (addNoWishBtn) {
        addNoWishBtn.addEventListener('click', () => {
            Wishlist.showAddNoWishModal();
        });
    }
    
    if (wishlistContainer) {
        wishlistContainer.addEventListener('click', (e) => {
            const editBtn = e.target.closest('.btn-edit-wish');
            const deleteBtn = e.target.closest('.btn-delete-wish');
            
            if (editBtn) {
                Wishlist.showEditModal(editBtn.dataset.wishId);
            }
            
            if (deleteBtn) {
                Wishlist.deleteWish(deleteBtn.dataset.wishId);
            }
        });
    }
    
    if (noWishContainer) {
        noWishContainer.addEventListener('click', (e) => {
            const deleteBtn = e.target.closest('.btn-delete-nowish');
            if (deleteBtn) {
                const item = deleteBtn.closest('.no-wish-item');
                if (item) {
                    Wishlist.deleteNoWish(item.dataset.nowishId);
                }
            }
        });
    }
}
