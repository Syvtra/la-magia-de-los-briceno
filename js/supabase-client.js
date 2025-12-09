let supabase = null;

function initSupabase() {
    if (typeof CONFIG === 'undefined') {
        console.error('CONFIG not defined');
        return null;
    }
    
    if (CONFIG.SUPABASE_URL === 'TU_SUPABASE_URL') {
        console.warn('Configura las credenciales de Supabase en js/config.js');
        return null;
    }
    
    // Verificar que la librería de Supabase esté cargada
    if (typeof window.supabase === 'undefined') {
        console.error('Supabase library not loaded');
        return null;
    }
    
    try {
        supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
            auth: {
                autoRefreshToken: true,
                persistSession: true,
                storage: window.localStorage
            }
        });
        console.log('Supabase initialized successfully');
        return supabase;
    } catch (error) {
        console.error('Error initializing Supabase:', error);
        return null;
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
    
    // Mensajes de admin a usuarios
    async sendAdminMessage(userId, message, fromNickname) {
        const { error } = await supabase
            .from('users')
            .update({
                admin_message: message,
                admin_message_from: fromNickname
            })
            .eq('id', userId);
        
        if (error) throw error;
        return true;
    },
    
    async clearAdminMessage(userId) {
        const { error } = await supabase
            .from('users')
            .update({
                admin_message: null,
                admin_message_from: null
            })
            .eq('id', userId);
        
        if (error) throw error;
        return true;
    }
};
