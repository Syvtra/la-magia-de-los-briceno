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
            this.loadGameStatus();
            
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
            
            return `
                <div class="admin-user-item" data-user-id="${user.id}">
                    <div class="admin-user-avatar">${avatar}</div>
                    <div class="admin-user-info">
                        <h4>${Utils.sanitizeHTML(user.name)}</h4>
                        <p>@${Utils.sanitizeHTML(user.nickname)}</p>
                    </div>
                    ${user.is_admin ? '<span class="admin-user-badge">Admin</span>' : ''}
                </div>
            `;
        }).join('');
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
    },

    // =====================================================
    // FUNCIONES PARA JUEGO DE ADIVINANZAS (Admin)
    // =====================================================

    async loadGameStatus() {
        const container = Utils.$('#admin-game-status');
        if (!container) return;

        try {
            const gameState = await db.getGameState();
            
            if (!gameState) {
                container.innerHTML = '<p class="game-status-text">⚪ Juego no inicializado</p>';
            } else if (gameState.is_active) {
                const currentIndex = gameState.current_turn_index + 1;
                const total = gameState.turn_order?.length || 0;
                container.innerHTML = `<p class="game-status-text">🟢 Juego activo - Turno ${currentIndex} de ${total}</p>`;
            } else if (gameState.finished_at) {
                container.innerHTML = '<p class="game-status-text">✅ Juego completado</p>';
            } else {
                container.innerHTML = '<p class="game-status-text">⚪ Juego no iniciado</p>';
            }
        } catch (error) {
            console.error('Error loading game status:', error);
            container.innerHTML = '<p class="game-status-text">❌ Error al cargar estado</p>';
        }
    },

    async startGuessingGame() {
        if (!confirm('¿Iniciar el juego de adivinanzas? Esto permitirá que todos los usuarios vean el juego activo.')) {
            return;
        }

        const btn = Utils.$('#btn-admin-start-game');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '🎄 Iniciando...';
        }

        try {
            // Obtener usuarios con asignaciones
            const assignments = await db.getAllAssignments();
            if (!assignments || assignments.length === 0) {
                showToast('No hay participantes en el sorteo', 'error');
                return;
            }

            // Crear orden aleatorio de turnos
            const participantIds = assignments.map(a => a.giver_id);
            const shuffledOrder = Utils.shuffleArray([...participantIds]);

            // Iniciar juego
            await db.startGame(shuffledOrder);
            
            showToast('🎄 ¡Juego de adivinanzas iniciado!', 'success');
            Effects.playSound('reveal');
            
            // Actualizar estado
            await this.loadGameStatus();

            // Enviar notificación a todos
            if (typeof Notifications !== 'undefined') {
                Notifications.sendToAll(
                    '🎄 ¡Juego de Adivinanzas!',
                    'El juego ha comenzado. ¡Entra a ver quién está de turno!'
                );
            }

        } catch (error) {
            console.error('Error starting game:', error);
            showToast('Error al iniciar el juego', 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '🎄 Iniciar Juego Ahora';
            }
        }
    },

    async resetGuessingGame() {
        if (!confirm('¿Reiniciar el juego de adivinanzas? Esto eliminará todos los turnos completados.')) {
            return;
        }

        try {
            await db.resetGame();
            showToast('Juego reiniciado', 'info');
            await this.loadGameStatus();

            // Actualizar UI del juego si está visible
            if (typeof GuessingGame !== 'undefined') {
                await GuessingGame.loadGameState();
                GuessingGame.updateUI();
            }

        } catch (error) {
            console.error('Error resetting game:', error);
            showToast('Error al reiniciar el juego', 'error');
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

    // Botones del juego de adivinanzas
    const startGameBtn = Utils.$('#btn-admin-start-game');
    const resetGameBtn = Utils.$('#btn-admin-reset-game');
    
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

    // Event listeners para juego de adivinanzas
    if (startGameBtn) {
        startGameBtn.addEventListener('click', () => {
            Admin.startGuessingGame();
        });
    }

    if (resetGameBtn) {
        resetGameBtn.addEventListener('click', () => {
            Admin.resetGuessingGame();
        });
    }
}
