const Admin = {
    users: [],
    pairs: [],
    
    async loadData() {
        if (!Auth.isAdmin()) {
            Navigation.showScreen('home');
            showToast('Acceso denegado', 'error');
            return;
        }
        
        try {
            this.users = await db.getAllUsers();
            this.pairs = await db.getPairs();
            
            this.renderUsers();
            this.renderPairs();
            this.loadThemeSettings();
            
        } catch (error) {
            console.error('Error loading admin data:', error);
            showToast('Error al cargar datos', 'error');
        }
    },
    
    renderUsers() {
        const container = Utils.$('#admin-users-list');
        if (!container) return;
        
        container.innerHTML = this.users.map(user => {
            const avatar = Utils.getAvatarEmoji(user.avatar_url);
            const hasPendingMsg = user.admin_message ? '💬' : '';
            
            return `
                <div class="admin-user-item" data-user-id="${user.id}">
                    <div class="admin-user-avatar">${avatar}</div>
                    <div class="admin-user-info">
                        <h4>${Utils.sanitizeHTML(user.name)} ${hasPendingMsg}</h4>
                        <p>@${Utils.sanitizeHTML(user.nickname)}</p>
                    </div>
                    ${user.is_admin ? '<span class="admin-user-badge">Admin</span>' : ''}
                </div>
            `;
        }).join('');
        
        // Poblar select de mensaje directo
        this.populateUserSelect();
    },
    
    populateUserSelect() {
        const select = Utils.$('#dm-user');
        if (!select) return;
        
        const options = this.users
            .filter(u => !u.is_admin) // No mostrar admins
            .map(u => `<option value="${u.id}">${Utils.sanitizeHTML(u.name)} (@${u.nickname})</option>`)
            .join('');
        
        select.innerHTML = '<option value="">Seleccionar usuario...</option>' + options;
    },
    
    async sendDirectMessage(userId, message) {
        if (!userId || !message) {
            showToast('Selecciona un usuario y escribe un mensaje', 'error');
            return;
        }
        
        try {
            const adminNickname = Auth.userProfile?.nickname || 'Admin';
            console.log('Sending message to:', userId, 'Message:', message, 'From:', adminNickname);
            
            await db.sendAdminMessage(userId, message, adminNickname);
            console.log('Message sent successfully');
            
            // Recargar usuarios para mostrar el indicador
            this.users = await db.getAllUsers();
            console.log('Users reloaded, checking for admin_message:', this.users.find(u => u.id === userId));
            this.renderUsers();
            
            showToast('Mensaje enviado', 'success');
            
            // Limpiar formulario
            Utils.$('#dm-user').value = '';
            Utils.$('#dm-message').value = '';
            
        } catch (error) {
            console.error('Error sending direct message:', error);
            showToast('Error al enviar mensaje', 'error');
        }
    },
    
    renderPairs() {
        const container = Utils.$('#pairs-list');
        if (!container) return;
        
        if (this.pairs.length === 0) {
            container.innerHTML = '<p class="empty-state">No hay parejas configuradas</p>';
            return;
        }
        
        container.innerHTML = this.pairs.map(pair => {
            const user1Name = pair.user1?.name || 'Usuario';
            const user2Name = pair.user2?.name || 'Usuario';
            
            return `
                <div class="pair-item" data-pair-id="${pair.id}">
                    <div class="pair-users">
                        <span>${Utils.sanitizeHTML(user1Name)}</span>
                        <span class="pair-heart">❤️</span>
                        <span>${Utils.sanitizeHTML(user2Name)}</span>
                    </div>
                    <button class="btn-delete-pair" data-pair-id="${pair.id}">🗑️</button>
                </div>
            `;
        }).join('');
    },
    
    showAddPairModal() {
        const userOptions = this.users.map(u => 
            `<option value="${u.id}">${Utils.sanitizeHTML(u.name)}</option>`
        ).join('');
        
        const content = `
            <h2 style="margin-bottom: 16px; color: var(--text-primary);">Crear Pareja</h2>
            <p style="margin-bottom: 16px; color: var(--text-secondary); font-size: 0.9rem;">
                Las parejas no podrán tocarse en el sorteo
            </p>
            <form id="add-pair-form">
                <div class="input-group">
                    <label for="pair-user1">Persona 1</label>
                    <select id="pair-user1" required>
                        <option value="">Seleccionar...</option>
                        ${userOptions}
                    </select>
                </div>
                <div class="input-group">
                    <label for="pair-user2">Persona 2</label>
                    <select id="pair-user2" required>
                        <option value="">Seleccionar...</option>
                        ${userOptions}
                    </select>
                </div>
                <button type="submit" class="btn btn-primary btn-block">
                    Crear pareja
                </button>
            </form>
        `;
        
        showModal(content);
        
        const form = Utils.$('#add-pair-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.addPair();
        });
    },
    
    async addPair() {
        const user1Id = Utils.$('#pair-user1').value;
        const user2Id = Utils.$('#pair-user2').value;
        
        if (!user1Id || !user2Id) {
            showToast('Selecciona ambas personas', 'error');
            return;
        }
        
        if (user1Id === user2Id) {
            showToast('Selecciona personas diferentes', 'error');
            return;
        }
        
        try {
            await db.addPair(user1Id, user2Id);
            this.pairs = await db.getPairs();
            this.renderPairs();
            hideModal();
            
            showToast('Pareja creada', 'success');
            
        } catch (error) {
            console.error('Error adding pair:', error);
            showToast('Error al crear pareja', 'error');
        }
    },
    
    async deletePair(pairId) {
        if (!confirm('¿Eliminar esta pareja?')) return;
        
        try {
            await db.deletePair(pairId);
            this.pairs = this.pairs.filter(p => p.id !== pairId);
            this.renderPairs();
            
            showToast('Pareja eliminada', 'info');
            
        } catch (error) {
            console.error('Error deleting pair:', error);
            showToast('Error al eliminar pareja', 'error');
        }
    },
    
    async runSorteo() {
        if (!confirm('¿Realizar el sorteo? Esto asignará un amigo secreto a cada participante.')) {
            return;
        }
        
        const btn = Utils.$('#btn-run-sorteo');
        btn.disabled = true;
        btn.innerHTML = '🎄 Sorteando...';
        
        try {
            await SorteoAlgorithm.runSorteo();
            
            Effects.playSound('reveal');
            showToast('¡Sorteo realizado exitosamente!', 'success');
            
            await Notifications.sendToAll(
                '🎄 ¡Sorteo realizado!',
                'Ya puedes ver quién es tu amigo secreto'
            );
            
        } catch (error) {
            console.error('Error running sorteo:', error);
            showToast(error.message || 'Error al realizar el sorteo', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '🎄 Realizar Sorteo';
        }
    },
    
    async resetSorteo() {
        if (!confirm('¿Reiniciar el sorteo? Esto eliminará todas las asignaciones actuales.')) {
            return;
        }
        
        try {
            await db.deleteAllAssignments();
            showToast('Sorteo reiniciado', 'info');
            
        } catch (error) {
            console.error('Error resetting sorteo:', error);
            showToast('Error al reiniciar sorteo', 'error');
        }
    },
    
    async loadThemeSettings() {
        try {
            const settings = await db.getSettings();
            
            if (settings) {
                Utils.$('#admin-snow').checked = settings.snow_enabled !== false;
                Utils.$('#admin-lights').checked = settings.lights_enabled !== false;
                Utils.$('#admin-sounds').checked = settings.sounds_enabled !== false;
            }
        } catch (error) {
            console.error('Error loading theme settings:', error);
        }
    },
    
    async updateThemeSetting(setting, value) {
        try {
            const updates = {};
            updates[setting] = value;
            
            await db.updateSettings(updates);
            showToast('Configuración actualizada', 'success');
            
        } catch (error) {
            console.error('Error updating theme setting:', error);
            showToast('Error al actualizar configuración', 'error');
        }
    },
    
    async sendNotification(title, message) {
        if (!title || !message) {
            showToast('Completa el título y mensaje', 'error');
            return;
        }
        
        try {
            await Notifications.sendToAll(title, message);
            showToast('Notificación enviada', 'success');
            
            Utils.$('#notif-title').value = '';
            Utils.$('#notif-message').value = '';
            
        } catch (error) {
            console.error('Error sending notification:', error);
            showToast('Error al enviar notificación', 'error');
        }
    }
};

function initAdminEvents() {
    const addPairBtn = Utils.$('#btn-add-pair');
    const runSorteoBtn = Utils.$('#btn-run-sorteo');
    const resetSorteoBtn = Utils.$('#btn-reset-sorteo');
    const pairsList = Utils.$('#pairs-list');
    const notificationForm = Utils.$('#notification-form');
    
    const adminSnow = Utils.$('#admin-snow');
    const adminLights = Utils.$('#admin-lights');
    const adminSounds = Utils.$('#admin-sounds');
    
    if (addPairBtn) {
        addPairBtn.addEventListener('click', () => {
            Admin.showAddPairModal();
        });
    }
    
    if (runSorteoBtn) {
        runSorteoBtn.addEventListener('click', () => {
            Admin.runSorteo();
        });
    }
    
    if (resetSorteoBtn) {
        resetSorteoBtn.addEventListener('click', () => {
            Admin.resetSorteo();
        });
    }
    
    if (pairsList) {
        pairsList.addEventListener('click', (e) => {
            const deleteBtn = e.target.closest('.btn-delete-pair');
            if (deleteBtn) {
                Admin.deletePair(deleteBtn.dataset.pairId);
            }
        });
    }
    
    if (notificationForm) {
        notificationForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = Utils.$('#notif-title').value;
            const message = Utils.$('#notif-message').value;
            await Admin.sendNotification(title, message);
        });
    }
    
    // Formulario de mensaje directo
    const dmForm = Utils.$('#direct-message-form');
    if (dmForm) {
        dmForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const userId = Utils.$('#dm-user').value;
            const message = Utils.$('#dm-message').value;
            await Admin.sendDirectMessage(userId, message);
        });
    }
    
    if (adminSnow) {
        adminSnow.addEventListener('change', (e) => {
            Admin.updateThemeSetting('snow_enabled', e.target.checked);
        });
    }
    
    if (adminLights) {
        adminLights.addEventListener('change', (e) => {
            Admin.updateThemeSetting('lights_enabled', e.target.checked);
        });
    }
    
    if (adminSounds) {
        adminSounds.addEventListener('change', (e) => {
            Admin.updateThemeSetting('sounds_enabled', e.target.checked);
        });
    }
}
