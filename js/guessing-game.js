// =====================================================
// JUEGO DE ADIVINANZAS - Amigo Secreto
// =====================================================

const GuessingGame = {
    gameState: null,
    currentClues: null,
    users: [],
    completedTurns: [],
    isChristmasDay: false,

    // Verificar si es 25 de diciembre en Chile
    checkChristmasDay() {
        const now = new Date();
        // Convertir a hora de Chile (America/Santiago)
        const chileTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Santiago' }));
        const day = chileTime.getDate();
        const month = chileTime.getMonth(); // 0-indexed, December = 11
        
        this.isChristmasDay = (month === 11 && day === 25);
        return this.isChristmasDay;
    },

    // Inicializar el módulo
    async init() {
        this.checkChristmasDay();
        await this.loadGameState();
        this.setupRealtimeSubscriptions();
        this.updateUI();
    },

    // Cargar estado del juego
    async loadGameState() {
        try {
            this.gameState = await db.getGameState();
            this.completedTurns = await db.getCompletedTurns();
            this.users = await db.getAllUsers();
            
            if (this.gameState?.is_active) {
                this.currentClues = await db.getCluesForCurrentTurn();
            }
        } catch (error) {
            console.error('Error loading game state:', error);
        }
    },

    // Configurar suscripciones en tiempo real
    setupRealtimeSubscriptions() {
        db.subscribeToGameState(async (payload) => {
            console.log('Realtime: game state changed', payload.eventType);
            await this.loadGameState();
            this.updateUI();
            
            // Si el juego se activó, mostrar pantalla del juego
            if (payload.new?.is_active && !payload.old?.is_active) {
                Effects.playSound('reveal');
                showToast('🎄 ¡El juego de adivinanzas ha comenzado!', 'success');
            }
            
            // Si el juego terminó
            if (!payload.new?.is_active && payload.old?.is_active && payload.new?.finished_at) {
                this.showGameFinished();
            }
        });

        db.subscribeToGameTurns(async (payload) => {
            console.log('Realtime: game turns changed', payload.eventType);
            await this.loadGameState();
            this.updateUI();
            
            if (payload.eventType === 'INSERT') {
                Effects.playSound('success');
            }
        });
    },

    // Actualizar toda la UI relacionada con el juego
    updateUI() {
        this.updateStartGameButton();
        this.updateGameScreen();
    },

    // Mostrar/ocultar botón de iniciar juego (solo admin, solo 25 dic)
    updateStartGameButton() {
        const container = Utils.$('#game-start-container');
        if (!container) return;

        // Verificar condiciones: es admin, es 25 de diciembre, juego no activo
        const canStartGame = Auth.isAdmin() && this.checkChristmasDay() && !this.gameState?.is_active;
        const gameIsActive = this.gameState?.is_active;
        const gameFinished = this.gameState?.finished_at && !this.gameState?.is_active;

        if (canStartGame) {
            container.innerHTML = `
                <button class="btn btn-christmas btn-block" id="btn-start-guessing-game">
                    🎄 Iniciar juego de adivinanzas
                </button>
            `;
            const btn = Utils.$('#btn-start-guessing-game');
            if (btn) {
                btn.addEventListener('click', () => this.startGame());
            }
        } else if (gameIsActive) {
            container.innerHTML = `
                <button class="btn btn-primary btn-block" id="btn-go-to-game">
                    🎮 Ir al juego de adivinanzas
                </button>
            `;
            const btn = Utils.$('#btn-go-to-game');
            if (btn) {
                btn.addEventListener('click', () => Navigation.showScreen('guessing-game'));
            }
        } else if (gameFinished) {
            container.innerHTML = `
                <div class="game-finished-badge">
                    <span>🎄</span> Juego completado
                </div>
            `;
        } else {
            container.innerHTML = '';
        }
    },

    // Iniciar el juego (solo admin)
    async startGame() {
        if (!Auth.isAdmin()) {
            showToast('Solo el administrador puede iniciar el juego', 'error');
            return;
        }

        if (!confirm('¿Iniciar el juego de adivinanzas? Todos los participantes serán notificados.')) {
            return;
        }

        try {
            // Obtener usuarios con asignaciones (participantes del sorteo)
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
            
            showToast('🎄 ¡Juego iniciado!', 'success');
            Effects.playSound('reveal');
            
            // Navegar a la pantalla del juego
            Navigation.showScreen('guessing-game');

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
        }
    },

    // Actualizar pantalla del juego
    updateGameScreen() {
        const screen = Utils.$('#screen-guessing-game');
        if (!screen) return;

        const contentContainer = Utils.$('#guessing-game-content');
        if (!contentContainer) return;

        // Si el juego no está activo
        if (!this.gameState?.is_active) {
            if (this.gameState?.finished_at) {
                this.renderGameFinished(contentContainer);
            } else {
                this.renderGameNotStarted(contentContainer);
            }
            return;
        }

        // Juego activo - mostrar turno actual
        this.renderActiveTurn(contentContainer);
    },

    // Renderizar cuando el juego no ha empezado
    renderGameNotStarted(container) {
        container.innerHTML = `
            <div class="game-waiting">
                <div class="waiting-icon">⏳</div>
                <h2>Esperando...</h2>
                <p>El juego de adivinanzas aún no ha comenzado</p>
                <p class="waiting-hint">El administrador iniciará el juego el 25 de diciembre</p>
            </div>
        `;
    },

    // Renderizar juego terminado
    renderGameFinished(container) {
        container.innerHTML = `
            <div class="game-finished">
                <div class="finished-decoration">
                    <span class="sparkle">✨</span>
                    <span class="tree">🎄</span>
                    <span class="sparkle">✨</span>
                </div>
                <h2>¡Feliz Navidad!</h2>
                <p class="finished-message">Gracias por jugar en familia</p>
                <div class="finished-hearts">❤️ 🎁 ❤️</div>
                
                <div class="completed-turns-summary">
                    <h3>Resumen del juego</h3>
                    <div class="turns-list">
                        ${this.completedTurns.map((turn, index) => `
                            <div class="turn-summary-item">
                                <span class="turn-number">${index + 1}</span>
                                <span class="turn-user">${Utils.sanitizeHTML(turn.user?.name || 'Usuario')}</span>
                                <span class="turn-arrow">→</span>
                                <span class="turn-revealed">${Utils.sanitizeHTML(turn.revealed_name || '???')}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    },

    // Renderizar turno activo
    async renderActiveTurn(container) {
        const currentUserId = this.gameState.current_turn_user_id;
        const currentUser = this.users.find(u => u.id === currentUserId);
        const isMyTurn = Auth.currentUser?.id === currentUserId;
        const turnNumber = this.gameState.current_turn_index + 1;
        const totalTurns = this.gameState.turn_order?.length || 0;

        // Obtener las pistas del turno actual
        let clues = null;
        try {
            clues = await db.getCluesForCurrentTurn();
        } catch (e) {
            console.log('Could not load clues for current turn');
        }

        const userName = currentUser?.name || 'Usuario';
        const userAvatar = Utils.getAvatarEmoji(currentUser?.avatar_url);

        container.innerHTML = `
            <div class="game-active">
                <div class="turn-header">
                    <div class="turn-progress">
                        <span>Turno ${turnNumber} de ${totalTurns}</span>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${(turnNumber / totalTurns) * 100}%"></div>
                        </div>
                    </div>
                </div>

                <div class="current-turn-card ${isMyTurn ? 'my-turn' : ''}">
                    <div class="turn-avatar">${userAvatar}</div>
                    <h2 class="turn-title">Turno de ${Utils.sanitizeHTML(userName)}</h2>
                    <p class="turn-description">
                        ${isMyTurn 
                            ? '¡Es tu turno! Lee las pistas en voz alta' 
                            : `${Utils.sanitizeHTML(userName)} describe a la persona que le tocó`}
                    </p>
                </div>

                ${clues ? this.renderClues(clues, isMyTurn) : `
                    <div class="no-clues-warning">
                        <span>⚠️</span>
                        <p>Este participante no ha registrado sus pistas</p>
                    </div>
                `}

                ${isMyTurn ? `
                    <div class="turn-actions">
                        <button class="btn btn-christmas btn-block" id="btn-complete-turn">
                            ✅ Completar turno y revelar nombre
                        </button>
                    </div>
                ` : ''}

                <div class="completed-turns">
                    <h3>Turnos completados</h3>
                    ${this.completedTurns.length === 0 ? `
                        <p class="no-turns">Aún no hay turnos completados</p>
                    ` : `
                        <div class="turns-list">
                            ${this.completedTurns.map((turn, index) => `
                                <div class="completed-turn-item">
                                    <span class="turn-check">✓</span>
                                    <span class="turn-user">${Utils.sanitizeHTML(turn.user?.name || 'Usuario')}</span>
                                    <span class="turn-arrow">→</span>
                                    <span class="turn-revealed">${Utils.sanitizeHTML(turn.revealed_name || '???')}</span>
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>
            </div>
        `;

        // Agregar evento al botón de completar turno
        if (isMyTurn) {
            const completeBtn = Utils.$('#btn-complete-turn');
            if (completeBtn) {
                completeBtn.addEventListener('click', () => this.completeTurn());
            }
        }
    },

    // Renderizar las pistas
    renderClues(clues, isMyTurn) {
        const cluesList = [
            { icon: '😂', label: 'Cualidad graciosa', value: clues.clue_funny },
            { icon: '🤔', label: 'Cualidad curiosa', value: clues.clue_curiosity },
            { icon: '🔍', label: 'Difícil de adivinar', value: clues.clue_hard },
            { icon: '⭐', label: 'Algo típico', value: clues.clue_typical },
            { icon: '💡', label: 'Pista libre', value: clues.clue_free }
        ];

        return `
            <div class="clues-display">
                <h3>${isMyTurn ? '📢 Lee estas pistas en voz alta:' : '📋 Pistas:'}</h3>
                <div class="clues-list">
                    ${cluesList.map(clue => `
                        <div class="clue-item">
                            <span class="clue-icon">${clue.icon}</span>
                            <div class="clue-content">
                                <span class="clue-label">${clue.label}</span>
                                <span class="clue-value">${Utils.sanitizeHTML(clue.value)}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    // Completar turno actual
    async completeTurn() {
        if (!Auth.currentUser || Auth.currentUser.id !== this.gameState?.current_turn_user_id) {
            showToast('No es tu turno', 'error');
            return;
        }

        // Obtener el nombre del amigo secreto para revelar
        let revealedName = '???';
        try {
            const clues = await db.getCluesForCurrentTurn();
            if (clues?.receiver) {
                revealedName = clues.receiver.name;
            }
        } catch (e) {
            console.log('Could not get receiver name');
        }

        // Confirmar revelación
        if (!confirm(`¿Revelar que tu amigo secreto es ${revealedName}?`)) {
            return;
        }

        try {
            // Registrar turno completado
            await db.completeTurn(
                Auth.currentUser.id,
                this.gameState.current_turn_index + 1,
                revealedName
            );

            // Avanzar al siguiente turno
            await db.advanceToNextTurn();

            Effects.playSound('reveal');
            showToast(`🎉 ¡Revelado! Tu amigo secreto era ${revealedName}`, 'success');

            // Recargar estado
            await this.loadGameState();
            this.updateUI();

        } catch (error) {
            console.error('Error completing turn:', error);
            showToast('Error al completar el turno', 'error');
        }
    },

    // Mostrar pantalla de juego terminado
    showGameFinished() {
        Effects.playSound('reveal');
        
        const alertHTML = `
            <div id="game-finished-alert" class="game-finished-alert">
                <div class="game-finished-alert-content">
                    <div class="finished-decoration">
                        <span class="sparkle">✨</span>
                        <span class="tree">🎄</span>
                        <span class="sparkle">✨</span>
                    </div>
                    <h2>¡Feliz Navidad!</h2>
                    <p>Gracias por jugar en familia</p>
                    <div class="finished-hearts">❤️ 🎁 ❤️</div>
                    <button class="btn btn-primary" id="btn-close-finished">
                        <span>Cerrar</span>
                    </button>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', alertHTML);

        const alert = document.getElementById('game-finished-alert');
        const btnClose = document.getElementById('btn-close-finished');

        setTimeout(() => {
            alert.classList.add('active');
        }, 100);

        const closeAlert = () => {
            alert.classList.remove('active');
            setTimeout(() => alert.remove(), 300);
        };

        btnClose.addEventListener('click', closeAlert);
        alert.addEventListener('click', (e) => {
            if (e.target === alert) closeAlert();
        });
    }
};

// Función para inicializar eventos del juego
function initGuessingGameEvents() {
    // El juego se inicializa cuando el usuario está autenticado
    // Ver app.js para la integración
}
