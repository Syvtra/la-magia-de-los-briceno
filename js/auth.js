const Auth = {
    currentUser: null,
    userProfile: null,
    
    async init() {
        if (typeof supabase === 'undefined' || !supabase || !supabase.auth) {
            console.error('❌ Supabase not initialized properly');
            showToast('Error: No se pudo conectar con el servidor', 'error');
            return false;
        }
        
        try {
            // IMPORTANTE: Verificar PRIMERO si hay token de recuperación ANTES de verificar sesión
            const hashParams = new URLSearchParams(window.location.hash.substring(1));
            const accessToken = hashParams.get('access_token');
            const type = hashParams.get('type');
            
            if (type === 'recovery' && accessToken) {
                // Usuario llegó desde el enlace de recuperación
                console.log('🔐 Token de recuperación detectado - mostrando pantalla reset');
                
                // Limpiar la URL sin recargar
                window.history.replaceState({}, document.title, window.location.pathname);
                
                // Configurar listener para cambios de auth
                supabase.auth.onAuthStateChange(async (event, session) => {
                    console.log('Auth event:', event);
                    if (event === 'SIGNED_OUT') {
                        this.currentUser = null;
                        this.userProfile = null;
                        Navigation.showScreen('login');
                    }
                });
                
                // Mostrar pantalla de reset y NO continuar con el flujo normal
                setTimeout(() => {
                    Navigation.showScreen('reset-password');
                }, 100);
                
                return false;
            }
            
            const { data: { session } } = await supabase.auth.getSession();
            
            if (session) {
                this.currentUser = session.user;
                await this.loadUserProfile();
                return true;
            }
            
            supabase.auth.onAuthStateChange(async (event, session) => {
                if (event === 'SIGNED_IN' && session) {
                    this.currentUser = session.user;
                    await this.loadUserProfile();
                    Navigation.showScreen('home');
                    this.updateUI();
                } else if (event === 'SIGNED_OUT') {
                    this.currentUser = null;
                    this.userProfile = null;
                    Navigation.showScreen('login');
                } else if (event === 'PASSWORD_RECOVERY') {
                    // Supabase detectó recuperación de contraseña
                    console.log('🔐 PASSWORD_RECOVERY event');
                    Navigation.showScreen('reset-password');
                }
            });
            
            return false;
        } catch (error) {
            console.error('Auth init error:', error);
            return false;
        }
    },
    
    async loadUserProfile() {
        if (!this.currentUser) return;
        
        try {
            this.userProfile = await db.getUser(this.currentUser.id);
            this.updateUI();
        } catch (error) {
            console.error('Error loading profile:', error);
        }
    },
    
    async login(email, password) {
        if (!supabase || !supabase.auth) {
            throw new Error('No se pudo conectar con el servidor');
        }
        
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        
        if (error) throw error;
        
        this.currentUser = data.user;
        await this.loadUserProfile();
        
        Spirit.addPoints('login');
        Effects.playSound('success');
        
        return data;
    },
    
    async register(userData) {
        if (!supabase || !supabase.auth) {
            throw new Error('No se pudo conectar con el servidor');
        }
        
        const { email, password, name, nickname, avatar } = userData;
        
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    name,
                    nickname,
                    avatar_url: avatar
                }
            }
        });
        
        if (authError) throw authError;
        
        this.currentUser = authData.user;
        
        // Esperar un momento para que el trigger cree el perfil
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Crear o actualizar el perfil directamente con upsert
        try {
            const { error } = await supabase.from('users').upsert({
                id: this.currentUser.id,
                name: name,
                nickname: nickname,
                avatar_url: avatar,
                email: email,
                spirit_points: 0,
                is_admin: false
            }, { onConflict: 'id' });
            
            if (error) {
                console.log('Upsert error:', error);
            }
        } catch (e) {
            console.log('Profile create error:', e);
        }
        
        // Forzar recarga del perfil
        await new Promise(resolve => setTimeout(resolve, 500));
        
        await this.loadUserProfile();
        
        Effects.playSound('success');
        
        return authData;
    },
    
    async logout() {
        if (!supabase || !supabase.auth) {
            throw new Error('No se pudo conectar con el servidor');
        }
        
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        this.currentUser = null;
        this.userProfile = null;
    },
    
    async requestPasswordReset(email) {
        if (!supabase || !supabase.auth) {
            throw new Error('No se pudo conectar con el servidor');
        }
        
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin
        });
        
        if (error) throw error;
    },
    
    async updatePassword(newPassword) {
        if (!supabase || !supabase.auth) {
            throw new Error('No se pudo conectar con el servidor');
        }
        
        const { error } = await supabase.auth.updateUser({
            password: newPassword
        });
        
        if (error) throw error;
    },
    
    async updateProfile(updates) {
        if (!this.currentUser) return;
        
        this.userProfile = await db.updateUser(this.currentUser.id, updates);
        this.updateUI();
        
        Spirit.addPoints('updateProfile');
        
        return this.userProfile;
    },
    
    isAdmin() {
        return this.userProfile?.is_admin === true;
    },
    
    updateUI() {
        if (!this.userProfile) return;
        
        const greeting = Utils.$('#user-greeting');
        const headerAvatar = Utils.$('#header-avatar');
        const profileName = Utils.$('#profile-name');
        const profileNickname = Utils.$('#profile-nickname');
        const profileEmail = Utils.$('#profile-email');
        const profileAvatar = Utils.$('#profile-avatar');
        const adminBtn = Utils.$('#btn-admin-panel');
        
        const avatar = Utils.getAvatarEmoji(this.userProfile.avatar_url);
        const firstName = this.userProfile.name?.split(' ')[0] || 'Usuario';
        
        if (greeting) greeting.textContent = `Hola, ${firstName}`;
        if (headerAvatar) headerAvatar.textContent = avatar;
        if (profileName) profileName.textContent = this.userProfile.name;
        if (profileNickname) profileNickname.textContent = `@${this.userProfile.nickname}`;
        if (profileEmail) profileEmail.textContent = this.userProfile.email;
        if (profileAvatar) profileAvatar.textContent = avatar;
        
        if (adminBtn) {
            adminBtn.classList.toggle('hidden', !this.isAdmin());
        }
        
        Spirit.updateDisplay();
    }
};

function initAuthForms() {
    const loginForm = Utils.$('#login-form');
    const registerForm = Utils.$('#register-form');
    const forgotPasswordForm = Utils.$('#forgot-password-form');
    const resetPasswordForm = Utils.$('#reset-password-form');
    const logoutBtn = Utils.$('#btn-logout');
    const avatarGrid = Utils.$('#avatar-grid');
    
    let selectedAvatar = 'elf';
    
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = Utils.$('#login-email').value;
            const password = Utils.$('#login-password').value;
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span>Entrando...</span>';
            
            try {
                await Auth.login(email, password);
                showToast('¡Bienvenido de vuelta!', 'success');
                Navigation.showScreen('home');
            } catch (error) {
                showToast(error.message || 'Error al iniciar sesión', 'error');
                loginForm.classList.add('animate-shake');
                setTimeout(() => loginForm.classList.remove('animate-shake'), 500);
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<span>Entrar</span><span class="btn-glow"></span>';
            }
        });
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const userData = {
                name: Utils.$('#register-name').value,
                nickname: Utils.$('#register-nickname').value,
                email: Utils.$('#register-email').value,
                password: Utils.$('#register-password').value,
                avatar: selectedAvatar
            };
            
            const submitBtn = registerForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span>Creando cuenta...</span>';
            
            try {
                await Auth.register(userData);
                showToast('¡Cuenta creada exitosamente!', 'success');
                Navigation.showScreen('home');
                
                // Mostrar tutorial para usuario nuevo
                if (typeof Tutorial !== 'undefined') {
                    Tutorial.showForNewUser();
                    addHelpButton();
                }
            } catch (error) {
                showToast(error.message || 'Error al crear cuenta', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<span>Crear cuenta</span><span class="btn-glow"></span>';
            }
        });
    }
    
    if (avatarGrid) {
        avatarGrid.addEventListener('click', (e) => {
            const option = e.target.closest('.avatar-option');
            if (!option) return;
            
            Utils.$$('.avatar-option').forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            selectedAvatar = option.dataset.avatar;
            
            Effects.playSound('click');
        });
    }
    
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = Utils.$('#forgot-email').value;
            const submitBtn = forgotPasswordForm.querySelector('button[type="submit"]');
            
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span>Enviando...</span>';
            
            try {
                await Auth.requestPasswordReset(email);
                showToast('¡Enlace enviado! Revisa tu correo', 'success');
                forgotPasswordForm.reset();
                
                // Volver al login después de 2 segundos
                setTimeout(() => {
                    Navigation.showScreen('login');
                }, 2000);
            } catch (error) {
                showToast(error.message || 'Error al enviar enlace', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<span>Enviar enlace</span><span class="btn-glow"></span>';
            }
        });
    }
    
    if (resetPasswordForm) {
        resetPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const newPassword = Utils.$('#new-password').value;
            const confirmPassword = Utils.$('#confirm-password').value;
            const submitBtn = resetPasswordForm.querySelector('button[type="submit"]');
            
            if (newPassword !== confirmPassword) {
                showToast('Las contraseñas no coinciden', 'error');
                return;
            }
            
            if (newPassword.length < 6) {
                showToast('La contraseña debe tener al menos 6 caracteres', 'error');
                return;
            }
            
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span>Actualizando...</span>';
            
            try {
                await Auth.updatePassword(newPassword);
                showToast('¡Contraseña actualizada exitosamente!', 'success');
                resetPasswordForm.reset();
                
                // Cerrar sesión y redirigir al login
                setTimeout(async () => {
                    try {
                        await Auth.logout();
                    } catch (e) {
                        console.log('Logout after password reset:', e);
                    }
                    Navigation.showScreen('login');
                    showToast('Inicia sesión con tu nueva contraseña', 'info');
                }, 1500);
            } catch (error) {
                showToast(error.message || 'Error al actualizar contraseña', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<span>Actualizar contraseña</span><span class="btn-glow"></span>';
            }
        });
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await Auth.logout();
                showToast('Sesión cerrada', 'info');
                Navigation.showScreen('login');
            } catch (error) {
                showToast('Error al cerrar sesión', 'error');
            }
        });
    }
    
    // Avatar change functionality
    initAvatarSelector();
}

function initAvatarSelector() {
    const btnChangeAvatar = Utils.$('#btn-change-avatar');
    const avatarModal = Utils.$('#avatar-selector-modal');
    const avatarGrid = Utils.$('#avatar-grid-profile');
    const btnCancelAvatar = Utils.$('#btn-cancel-avatar');
    
    if (!btnChangeAvatar || !avatarModal || !avatarGrid) return;
    
    // Abrir modal
    btnChangeAvatar.addEventListener('click', () => {
        // Marcar el avatar actual como seleccionado
        const currentAvatar = Auth.userProfile?.avatar_url || 'elf';
        Utils.$$('#avatar-grid-profile .avatar-option').forEach(opt => {
            opt.classList.toggle('selected', opt.dataset.avatar === currentAvatar);
        });
        avatarModal.classList.remove('hidden');
    });
    
    // Cerrar modal
    if (btnCancelAvatar) {
        btnCancelAvatar.addEventListener('click', () => {
            avatarModal.classList.add('hidden');
        });
    }
    
    // Cerrar al hacer click fuera
    avatarModal.addEventListener('click', (e) => {
        if (e.target === avatarModal) {
            avatarModal.classList.add('hidden');
        }
    });
    
    // Seleccionar y guardar avatar
    avatarGrid.addEventListener('click', async (e) => {
        const option = e.target.closest('.avatar-option');
        if (!option) return;
        
        const newAvatar = option.dataset.avatar;
        
        // Actualizar selección visual
        Utils.$$('#avatar-grid-profile .avatar-option').forEach(opt => {
            opt.classList.remove('selected');
        });
        option.classList.add('selected');
        
        // Guardar en la base de datos
        try {
            await db.updateUser(Auth.currentUser.id, { avatar_url: newAvatar });
            Auth.userProfile.avatar_url = newAvatar;
            
            // Actualizar UI en todas partes
            const avatarEmoji = Utils.getAvatarEmoji(newAvatar);
            
            const profileAvatar = Utils.$('#profile-avatar');
            const headerAvatar = Utils.$('#header-avatar');
            
            if (profileAvatar) profileAvatar.textContent = avatarEmoji;
            if (headerAvatar) headerAvatar.textContent = avatarEmoji;
            
            avatarModal.classList.add('hidden');
            showToast('¡Avatar actualizado!', 'success');
            
            // Agregar puntos de espíritu
            if (typeof Spirit !== 'undefined') {
                Spirit.addPoints('updateProfile');
            }
        } catch (error) {
            console.error('Error updating avatar:', error);
            showToast('Error al actualizar avatar', 'error');
        }
    });
}

const Spirit = {
    getPoints() {
        return Auth.userProfile?.spirit_points || 0;
    },
    
    async addPoints(action) {
        if (!Auth.currentUser) return;
        
        const points = CONFIG.SPIRIT_ACTIONS[action] || 0;
        if (points === 0) return;
        
        const currentPoints = this.getPoints();
        const newPoints = Math.min(currentPoints + points, 100);
        
        try {
            await db.updateUser(Auth.currentUser.id, { spirit_points: newPoints });
            Auth.userProfile.spirit_points = newPoints;
            this.updateDisplay();
        } catch (error) {
            console.error('Error updating spirit points:', error);
        }
    },
    
    updateDisplay() {
        const points = this.getPoints();
        const levelEl = Utils.$('#spirit-level');
        const fillEl = Utils.$('#spirit-fill');
        const statEl = Utils.$('#stat-spirit');
        
        if (levelEl) levelEl.textContent = `${points}%`;
        if (fillEl) fillEl.style.width = `${points}%`;
        if (statEl) statEl.textContent = `${points}%`;
    }
};
