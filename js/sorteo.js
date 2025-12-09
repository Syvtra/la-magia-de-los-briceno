const Sorteo = {
    assignment: null,
    participants: [],
    
    async loadData() {
        if (!Auth.currentUser) return;
        
        try {
            this.participants = await db.getAllUsers();
            this.renderParticipants();
            
            this.assignment = await db.getAssignment(Auth.currentUser.id);
            this.updateStatus();
            
        } catch (error) {
            console.error('Error loading sorteo data:', error);
        }
    },
    
    renderParticipants() {
        const container = Utils.$('#participants-grid');
        if (!container) return;
        
        container.innerHTML = this.participants.map(user => {
            const avatar = Utils.getAvatarEmoji(user.avatar_url);
            const shortName = Utils.getShortName(user.name);
            
            return `
                <div class="participant-item">
                    <div class="participant-avatar">${avatar}</div>
                    <div class="participant-name">${Utils.sanitizeHTML(shortName)}</div>
                </div>
            `;
        }).join('');
    },
    
    updateStatus() {
        const statusEl = Utils.$('#sorteo-status');
        const revealEl = Utils.$('#assignment-reveal');
        
        if (this.assignment) {
            statusEl.classList.add('hidden');
            revealEl.classList.remove('hidden');
            
            if (this.assignment.receiver) {
                this.showAssignment(this.assignment.receiver);
            }
        } else {
            statusEl.classList.remove('hidden');
            revealEl.classList.add('hidden');
        }
    },
    
    showAssignment(receiver) {
        const avatarEl = Utils.$('#reveal-avatar');
        const nameEl = Utils.$('#reveal-name');
        const nicknameEl = Utils.$('#reveal-nickname');
        
        if (avatarEl) avatarEl.textContent = Utils.getAvatarEmoji(receiver.avatar_url);
        if (nameEl) nameEl.textContent = receiver.name;
        if (nicknameEl) nicknameEl.textContent = `@${receiver.nickname}`;
    },
    
    async revealAssignment() {
        if (!this.assignment) {
            await this.loadData();
        }
        
        if (this.assignment?.receiver) {
            Spirit.addPoints('viewAssignment');
            Effects.playSound('reveal');
            
            const revealCard = Utils.$('.reveal-card');
            if (revealCard) {
                revealCard.classList.add('animate-bounce-in');
            }
        }
    },
    
    async showFriendWishlist() {
        if (!this.assignment?.receiver) {
            showToast('No tienes un amigo asignado aún', 'error');
            return;
        }
        
        const receiver = this.assignment.receiver;
        
        try {
            const wishlist = await db.getWishlist(receiver.id);
            const noWishList = await db.getNoWishList(receiver.id);
            
            const avatarEl = Utils.$('#friend-avatar');
            const nameEl = Utils.$('#friend-name');
            const nicknameEl = Utils.$('#friend-nickname');
            const wishlistEl = Utils.$('#friend-wishlist');
            const noWishEl = Utils.$('#friend-no-wish-list');
            
            if (avatarEl) avatarEl.textContent = Utils.getAvatarEmoji(receiver.avatar_url);
            if (nameEl) nameEl.textContent = receiver.name;
            if (nicknameEl) nicknameEl.textContent = `@${receiver.nickname}`;
            
            if (wishlistEl) {
                if (wishlist.length === 0) {
                    wishlistEl.innerHTML = '<p class="empty-state">No ha agregado deseos aún</p>';
                } else {
                    wishlistEl.innerHTML = wishlist.map(item => `
                        <div class="wish-item">
                            <div class="wish-item-header">
                                <div class="wish-item-image">🎁</div>
                                <div class="wish-item-info">
                                    <h4>${Utils.sanitizeHTML(item.item)}</h4>
                                </div>
                            </div>
                        </div>
                    `).join('');
                }
            }
            
            if (noWishEl) {
                if (noWishList.length === 0) {
                    noWishEl.innerHTML = '<p style="color: var(--text-secondary); font-size: 0.9rem;">Sin exclusiones</p>';
                } else {
                    noWishEl.innerHTML = noWishList.map(item => `
                        <div class="no-wish-item" style="background: rgba(220,53,69,0.1);">
                            <span>${Utils.sanitizeHTML(item.item)}</span>
                        </div>
                    `).join('');
                }
            }
            
            Navigation.showScreen('friend-wishlist');
            
        } catch (error) {
            console.error('Error loading friend wishlist:', error);
            showToast('Error al cargar la lista de deseos', 'error');
        }
    }
};

const SorteoAlgorithm = {
    async runSorteo() {
        try {
            const users = await db.getAllUsers();
            const pairs = await db.getPairs();
            
            if (users.length < 2) {
                throw new Error('Se necesitan al menos 2 participantes');
            }
            
            const pairMap = this.buildPairMap(pairs);
            const assignments = this.generateAssignments(users, pairMap);
            
            if (!assignments) {
                throw new Error('No fue posible generar un sorteo válido. Intenta ajustar las parejas.');
            }
            
            await db.deleteAllAssignments();
            await db.createAssignments(assignments);
            
            return assignments;
            
        } catch (error) {
            console.error('Error running sorteo:', error);
            throw error;
        }
    },
    
    buildPairMap(pairs) {
        const map = new Map();
        
        pairs.forEach(pair => {
            if (!map.has(pair.user1)) map.set(pair.user1, new Set());
            if (!map.has(pair.user2)) map.set(pair.user2, new Set());
            
            map.get(pair.user1).add(pair.user2);
            map.get(pair.user2).add(pair.user1);
        });
        
        return map;
    },
    
    generateAssignments(users, pairMap, maxAttempts = 100) {
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const result = this.tryGenerateAssignments(users, pairMap);
            if (result) return result;
        }
        return null;
    },
    
    tryGenerateAssignments(users, pairMap) {
        const givers = [...users];
        const receivers = Utils.shuffleArray([...users]);
        const assignments = [];
        
        for (let i = 0; i < givers.length; i++) {
            const giver = givers[i];
            let receiverIndex = -1;
            
            for (let j = 0; j < receivers.length; j++) {
                const receiver = receivers[j];
                
                if (giver.id === receiver.id) continue;
                
                const giverPairs = pairMap.get(giver.id);
                if (giverPairs && giverPairs.has(receiver.id)) continue;
                
                receiverIndex = j;
                break;
            }
            
            if (receiverIndex === -1) {
                return null;
            }
            
            const receiver = receivers.splice(receiverIndex, 1)[0];
            
            assignments.push({
                giver_id: giver.id,
                receiver_id: receiver.id
            });
        }
        
        return assignments;
    }
};
