let supabase = null;

function initSupabase() {
    if (typeof CONFIG === 'undefined') {
        console.error('CONFIG not defined');
        throw new Error('CONFIG not defined');
    }
    
    if (CONFIG.SUPABASE_URL === 'TU_SUPABASE_URL') {
        console.error('Configura las credenciales de Supabase en js/config.js');
        throw new Error('Supabase credentials not configured');
    }
    
    if (typeof window.supabase === 'undefined') {
        console.error('Supabase library not loaded - check CDN connection');
        throw new Error('Supabase library not loaded');
    }
    
    try {
        supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
            auth: {
                autoRefreshToken: true,
                persistSession: true,
                storage: window.localStorage
            }
        });
        
        if (!supabase || !supabase.auth) {
            throw new Error('Supabase client creation failed');
        }
        
        console.log('✅ Supabase initialized successfully');
        return supabase;
    } catch (error) {
        console.error('❌ Error initializing Supabase:', error);
        throw error;
    }
}

const db = {
    async getUser(userId) {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();
        
        if (error) throw error;
        return data;
    },
    
    async updateUser(userId, updates) {
        const { data, error } = await supabase
            .from('users')
            .update(updates)
            .eq('id', userId)
            .select()
            .single();
        
        if (error) throw error;
        return data;
    },
    
    async getAllUsers() {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: true });
        
        if (error) throw error;
        return data;
    },
    
    async getWishlist(userId) {
        const { data, error } = await supabase
            .from('wishlist')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data;
    },
    
    async addWish(wish) {
        const { data, error } = await supabase
            .from('wishlist')
            .insert(wish)
            .select()
            .single();
        
        if (error) throw error;
        return data;
    },
    
    async updateWish(wishId, updates) {
        const { data, error } = await supabase
            .from('wishlist')
            .update(updates)
            .eq('id', wishId)
            .select()
            .single();
        
        if (error) throw error;
        return data;
    },
    
    async deleteWish(wishId) {
        const { error } = await supabase
            .from('wishlist')
            .delete()
            .eq('id', wishId);
        
        if (error) throw error;
    },
    
    async getNoWishList(userId) {
        const { data, error } = await supabase
            .from('no_wish')
            .select('*')
            .eq('user_id', userId);
        
        if (error) throw error;
        return data;
    },
    
    async addNoWish(item) {
        const { data, error } = await supabase
            .from('no_wish')
            .insert(item)
            .select()
            .single();
        
        if (error) throw error;
        return data;
    },
    
    async deleteNoWish(itemId) {
        const { error } = await supabase
            .from('no_wish')
            .delete()
            .eq('id', itemId);
        
        if (error) throw error;
    },
    
    async getPairs() {
        const { data, error } = await supabase
            .from('pairs')
            .select(`
                *,
                user1:users!pairs_user1_fkey(id, name, nickname, avatar_url),
                user2:users!pairs_user2_fkey(id, name, nickname, avatar_url)
            `);
        
        if (error) throw error;
        return data;
    },
    
    async addPair(user1Id, user2Id) {
        const { data, error } = await supabase
            .from('pairs')
            .insert({ user1: user1Id, user2: user2Id })
            .select()
            .single();
        
        if (error) throw error;
        return data;
    },
    
    async deletePair(pairId) {
        const { error } = await supabase
            .from('pairs')
            .delete()
            .eq('id', pairId);
        
        if (error) throw error;
    },
    
    async getAssignment(giverId) {
        const { data, error } = await supabase
            .from('assignments')
            .select(`
                *,
                receiver:users!assignments_receiver_id_fkey(*)
            `)
            .eq('giver_id', giverId)
            .single();
        
        if (error && error.code !== 'PGRST116') throw error;
        return data;
    },
    
    async getAllAssignments() {
        const { data, error } = await supabase
            .from('assignments')
            .select('*');
        
        if (error) throw error;
        return data;
    },
    
    async createAssignments(assignments) {
        const { data, error } = await supabase
            .from('assignments')
            .insert(assignments)
            .select();
        
        if (error) throw error;
        return data;
    },
    
    async deleteAllAssignments() {
        const { error } = await supabase
            .from('assignments')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');
        
        if (error) throw error;
    },
    
    async getSettings() {
        const { data, error } = await supabase
            .from('app_settings')
            .select('*')
            .single();
        
        if (error && error.code !== 'PGRST116') throw error;
        return data;
    },
    
    async updateSettings(settings) {
        const { data: existing } = await supabase
            .from('app_settings')
            .select('id')
            .single();
        
        if (existing) {
            const { data, error } = await supabase
                .from('app_settings')
                .update(settings)
                .eq('id', existing.id)
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } else {
            const { data, error } = await supabase
                .from('app_settings')
                .insert(settings)
                .select()
                .single();
            
            if (error) throw error;
            return data;
        }
    },
    
    subscribeToAssignments(callback) {
        return supabase
            .channel('assignment-changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'assignments'
            }, callback)
            .subscribe();
    },
    
    subscribeToSettings(callback) {
        return supabase
            .channel('settings-changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'app_settings'
            }, callback)
            .subscribe();
    },
    
    subscribeToUsers(callback) {
        return supabase
            .channel('users-changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'users'
            }, callback)
            .subscribe();
    },
    
    subscribeToWishlists(callback) {
        return supabase
            .channel('wishlist-changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'wishlists'
            }, callback)
            .subscribe();
    },
    
    subscribeToPairs(callback) {
        return supabase
            .channel('pairs-changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'pairs'
            }, callback)
            .subscribe();
    },

    // =====================================================
    // FUNCIONES PARA JUEGO DE ADIVINANZAS
    // =====================================================

    // Secret Clues
    async getMyClues(userId) {
        const { data, error } = await supabase
            .from('secret_clues')
            .select('*')
            .eq('giver_user_id', userId)
            .single();
        
        if (error && error.code !== 'PGRST116') throw error;
        return data;
    },

    async saveClues(clues) {
        const { data, error } = await supabase
            .from('secret_clues')
            .insert(clues)
            .select()
            .single();
        
        if (error) throw error;
        return data;
    },

    async getCluesForCurrentTurn() {
        const gameState = await this.getGameState();
        if (!gameState || !gameState.is_active || !gameState.current_turn_user_id) {
            return null;
        }

        const { data, error } = await supabase
            .from('secret_clues')
            .select(`
                *,
                receiver:users!secret_clues_receiver_user_id_fkey(id, name, nickname, avatar_url)
            `)
            .eq('giver_user_id', gameState.current_turn_user_id)
            .single();
        
        if (error && error.code !== 'PGRST116') throw error;
        return data;
    },

    // Game State
    async getGameState() {
        const { data, error } = await supabase
            .from('game_state')
            .select('*')
            .single();
        
        if (error && error.code !== 'PGRST116') throw error;
        return data;
    },

    async startGame(turnOrder) {
        // Primero eliminar turnos anteriores
        await supabase.from('game_turns').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        
        // Obtener o crear el estado del juego
        const { data: existing } = await supabase
            .from('game_state')
            .select('id')
            .single();

        const gameData = {
            is_active: true,
            current_turn_index: 0,
            current_turn_user_id: turnOrder[0],
            turn_order: turnOrder,
            started_at: new Date().toISOString(),
            finished_at: null,
            updated_at: new Date().toISOString()
        };

        if (existing) {
            const { data, error } = await supabase
                .from('game_state')
                .update(gameData)
                .eq('id', existing.id)
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } else {
            const { data, error } = await supabase
                .from('game_state')
                .insert(gameData)
                .select()
                .single();
            
            if (error) throw error;
            return data;
        }
    },

    async advanceToNextTurn() {
        const gameState = await this.getGameState();
        if (!gameState || !gameState.is_active) return null;

        const nextIndex = gameState.current_turn_index + 1;
        
        if (nextIndex >= gameState.turn_order.length) {
            // Juego terminado
            const { data, error } = await supabase
                .from('game_state')
                .update({
                    is_active: false,
                    finished_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', gameState.id)
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } else {
            // Siguiente turno
            const { data, error } = await supabase
                .from('game_state')
                .update({
                    current_turn_index: nextIndex,
                    current_turn_user_id: gameState.turn_order[nextIndex],
                    updated_at: new Date().toISOString()
                })
                .eq('id', gameState.id)
                .select()
                .single();
            
            if (error) throw error;
            return data;
        }
    },

    async resetGame() {
        // Eliminar turnos
        await supabase.from('game_turns').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        
        // Resetear estado
        const { data: existing } = await supabase
            .from('game_state')
            .select('id')
            .single();

        if (existing) {
            const { data, error } = await supabase
                .from('game_state')
                .update({
                    is_active: false,
                    current_turn_index: 0,
                    current_turn_user_id: null,
                    turn_order: [],
                    started_at: null,
                    finished_at: null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existing.id)
                .select()
                .single();
            
            if (error) throw error;
            return data;
        }
        return null;
    },

    // Game Turns
    async getCompletedTurns() {
        const { data, error } = await supabase
            .from('game_turns')
            .select(`
                *,
                user:users!game_turns_user_id_fkey(id, name, nickname, avatar_url)
            `)
            .order('turn_number', { ascending: true });
        
        if (error) throw error;
        return data || [];
    },

    async completeTurn(userId, turnNumber, revealedName) {
        const { data, error } = await supabase
            .from('game_turns')
            .insert({
                user_id: userId,
                turn_number: turnNumber,
                revealed_name: revealedName,
                completed_at: new Date().toISOString()
            })
            .select()
            .single();
        
        if (error) throw error;
        return data;
    },

    async hasCompletedTurn(userId) {
        const { data, error } = await supabase
            .from('game_turns')
            .select('id')
            .eq('user_id', userId)
            .single();
        
        if (error && error.code !== 'PGRST116') throw error;
        return !!data;
    },

    // Realtime subscriptions for game
    subscribeToGameState(callback) {
        return supabase
            .channel('game-state-changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'game_state'
            }, callback)
            .subscribe();
    },

    subscribeToGameTurns(callback) {
        return supabase
            .channel('game-turns-changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'game_turns'
            }, callback)
            .subscribe();
    },

    subscribeToSecretClues(callback) {
        return supabase
            .channel('secret-clues-changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'secret_clues'
            }, callback)
            .subscribe();
    },

    // =====================================================
    // FUNCIONES PARA NOTIFICACIONES DEL ADMIN
    // =====================================================

    async createAdminNotification(title, message) {
        const { data, error } = await supabase
            .from('admin_notifications')
            .insert({
                title,
                message,
                created_at: new Date().toISOString()
            })
            .select()
            .single();
        
        if (error) throw error;
        return data;
    },

    async getUnreadNotifications(userId) {
        const { data, error } = await supabase
            .from('admin_notifications')
            .select(`
                *,
                read_status:notification_reads!left(user_id)
            `)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        // Filtrar las que el usuario no ha leído
        return (data || []).filter(notif => {
            const reads = notif.read_status || [];
            return !reads.some(r => r.user_id === userId);
        });
    },

    async markNotificationAsRead(notificationId, userId) {
        const { data, error } = await supabase
            .from('notification_reads')
            .insert({
                notification_id: notificationId,
                user_id: userId,
                read_at: new Date().toISOString()
            })
            .select()
            .single();
        
        if (error && error.code !== '23505') throw error; // Ignorar duplicados
        return data;
    },

    async getAllAdminNotifications() {
        const { data, error } = await supabase
            .from('admin_notifications')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20);
        
        if (error) throw error;
        return data || [];
    }
};
