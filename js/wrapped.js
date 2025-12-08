/* =====================================================
   CHRISTMAS FAMILY WRAPPED 2025
   Experiencia tipo Spotify Wrapped para la familia
   ===================================================== */

const Wrapped = {
    currentSlide: 0,
    totalSlides: 8,
    container: null,
    isActive: false,
    touchStartX: 0,
    touchEndX: 0,
    
    // Datos del Wrapped (algunos estáticos, otros de Supabase)
    data: {
        familyName: 'Briceño',
        year: 2025,
        // Datos que vendrán de Supabase
        moments: [],
        words: [],
        bestPhoto: null,
        spiritPercentage: 0,
        stats: {},
        topGift: null
    },
    
    async init() {
        this.container = document.getElementById('wrapped-container');
        if (!this.container) return;
        
        await this.loadData();
        this.render();
        this.setupEvents();
    },
    
    async loadData() {
        try {
            // Cargar datos de usuarios
            const users = await db.getAllUsers();
            
            // Calcular espíritu navideño promedio
            const totalSpirit = users.reduce((sum, u) => sum + (u.spirit_points || 0), 0);
            this.data.spiritPercentage = Math.round(totalSpirit / Math.max(users.length, 1));
            
            // Cargar listas de deseos para encontrar el regalo más pedido
            const wishlists = await this.loadAllWishlists(users);
            this.data.topGift = this.findTopGift(wishlists);
            
            // Estadísticas
            this.data.stats = {
                totalUsers: users.length,
                mostActiveUser: this.findMostActive(users),
                totalWishes: wishlists.length,
                daysUntilChristmas: this.getDaysUntilChristmas()
            };
            
            // Palabras del año (datos de ejemplo - puedes agregar campo en users)
            this.data.words = this.generateWords(users);
            
            // Momentos del año (datos de ejemplo - puedes crear tabla en Supabase)
            this.data.moments = this.generateMoments();
            
        } catch (error) {
            console.error('Error loading wrapped data:', error);
            this.loadFallbackData();
        }
    },
    
    async loadAllWishlists(users) {
        const allWishes = [];
        for (const user of users) {
            try {
                const wishes = await db.getWishlist(user.id);
                if (wishes) allWishes.push(...wishes);
            } catch (e) {}
        }
        return allWishes;
    },
    
    findTopGift(wishlists) {
        if (wishlists.length === 0) {
            return { name: 'Amor y felicidad', count: '∞', icon: '❤️' };
        }
        
        const giftCount = {};
        wishlists.forEach(wish => {
            const name = wish.name?.toLowerCase() || 'regalo';
            giftCount[name] = (giftCount[name] || 0) + 1;
        });
        
        const topGift = Object.entries(giftCount)
            .sort((a, b) => b[1] - a[1])[0];
        
        return {
            name: topGift ? topGift[0] : 'Sorpresas',
            count: topGift ? topGift[1] : 0,
            icon: '🎁'
        };
    },
    
    findMostActive(users) {
        const sorted = [...users].sort((a, b) => 
            (b.spirit_points || 0) - (a.spirit_points || 0)
        );
        return sorted[0]?.name || 'La familia';
    },
    
    getDaysUntilChristmas() {
        const today = new Date();
        const christmas = new Date(today.getFullYear(), 11, 25);
        if (today > christmas) {
            christmas.setFullYear(christmas.getFullYear() + 1);
        }
        const diff = christmas - today;
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    },
    
    generateWords(users) {
        // Palabras basadas en intereses de usuarios o valores por defecto
        const defaultWords = ['Familia', 'Amor', 'Alegría', 'Unión', 'Tradición', 'Esperanza'];
        const userWords = users
            .filter(u => u.interests)
            .map(u => u.interests.split(',')[0]?.trim())
            .filter(Boolean);
        
        return userWords.length > 0 ? userWords.slice(0, 6) : defaultWords;
    },
    
    generateMoments() {
        // Momentos de ejemplo - puedes crear tabla en Supabase
        return [
            { icon: '🎂', title: 'Cumpleaños celebrados', text: 'Cada celebración nos unió más como familia' },
            { icon: '🏖️', title: 'Vacaciones juntos', text: 'Momentos de descanso y risas compartidas' },
            { icon: '🎄', title: 'Preparando la Navidad', text: 'Decorando y creando nuevas tradiciones' }
        ];
    },
    
    loadFallbackData() {
        this.data = {
            familyName: 'Briceño',
            year: 2025,
            moments: this.generateMoments(),
            words: ['Familia', 'Amor', 'Alegría', 'Unión', 'Tradición', 'Esperanza'],
            bestPhoto: null,
            spiritPercentage: 75,
            stats: {
                totalUsers: 8,
                mostActiveUser: 'La familia',
                totalWishes: 24,
                daysUntilChristmas: this.getDaysUntilChristmas()
            },
            topGift: { name: 'Amor y felicidad', count: '∞', icon: '❤️' }
        };
    },
    
    render() {
        const slides = [
            this.renderWelcome(),
            this.renderMoments(),
            this.renderWords(),
            this.renderBestPhoto(),
            this.renderSpirit(),
            this.renderStats(),
            this.renderTopGift(),
            this.renderFinal()
        ];
        
        this.container.innerHTML = `
            ${this.renderSnow()}
            ${this.renderLights()}
            ${slides.map((slide, i) => `
                <div class="wrapped-slide ${i === 0 ? 'active' : ''}" data-slide="${i}">
                    <div class="wrapped-content">
                        ${slide}
                    </div>
                </div>
            `).join('')}
        `;
        
        this.updateProgress();
        this.renderDots();
    },
    
    renderSnow() {
        const flakes = [];
        for (let i = 0; i < 30; i++) {
            const left = Math.random() * 100;
            const delay = Math.random() * 5;
            const duration = 5 + Math.random() * 5;
            const size = 0.5 + Math.random() * 0.8;
            flakes.push(`
                <div class="wrapped-snowflake" style="
                    left: ${left}%;
                    animation-delay: ${delay}s;
                    animation-duration: ${duration}s;
                    font-size: ${size}rem;
                ">❄</div>
            `);
        }
        return `<div class="wrapped-snow">${flakes.join('')}</div>`;
    },
    
    renderLights() {
        const lights = [];
        for (let i = 0; i < 15; i++) {
            lights.push('<div class="wrapped-light"></div>');
        }
        return `<div class="wrapped-lights">${lights.join('')}</div>`;
    },
    
    renderWelcome() {
        return `
            <div class="wrapped-icon-row">
                <span>🎄</span>
                <span>⭐</span>
                <span>🎄</span>
            </div>
            <h1 class="wrapped-main-title">Christmas Family<br>Wrapped</h1>
            <div class="wrapped-year">${this.data.year}</div>
            <p class="wrapped-subtitle">El resumen navideño de la familia ${this.data.familyName}</p>
            <p style="color: rgba(255,255,255,0.5); font-size: 0.9rem; margin-top: 20px;">
                Desliza para continuar →
            </p>
        `;
    },
    
    renderMoments() {
        return `
            <div class="wrapped-icon">📸</div>
            <h2 class="wrapped-section-title">Momentos del Año</h2>
            <p class="wrapped-section-subtitle">Los recuerdos que nos unieron</p>
            <div class="wrapped-moments">
                ${this.data.moments.map(m => `
                    <div class="wrapped-moment">
                        <div class="wrapped-moment-icon">${m.icon}</div>
                        <div class="wrapped-moment-text">
                            <h4>${m.title}</h4>
                            <p>${m.text}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },
    
    renderWords() {
        return `
            <div class="wrapped-icon">💬</div>
            <h2 class="wrapped-section-title">Palabras del Año</h2>
            <p class="wrapped-section-subtitle">Lo que nos define como familia</p>
            <div class="wrapped-word-cloud">
                ${this.data.words.map(word => `
                    <span class="wrapped-word">${word}</span>
                `).join('')}
            </div>
        `;
    },
    
    renderBestPhoto() {
        return `
            <div class="wrapped-icon">📷</div>
            <h2 class="wrapped-section-title">Mejor Foto del Año</h2>
            <p class="wrapped-section-subtitle">El momento más especial</p>
            <div class="wrapped-photo-frame">
                ${this.data.bestPhoto 
                    ? `<img src="${this.data.bestPhoto}" alt="Mejor foto">`
                    : `<div class="wrapped-photo-placeholder">👨‍👩‍👧‍👦</div>`
                }
            </div>
            <p style="color: rgba(255,255,255,0.7); font-size: 0.9rem;">
                La familia ${this.data.familyName} unida
            </p>
        `;
    },
    
    renderSpirit() {
        const circumference = 2 * Math.PI * 90;
        const offset = circumference - (this.data.spiritPercentage / 100) * circumference;
        
        return `
            <div class="wrapped-icon">✨</div>
            <h2 class="wrapped-section-title">Espíritu Navideño</h2>
            <p class="wrapped-section-subtitle">El nivel de magia familiar</p>
            <div class="wrapped-spirit-ring">
                <svg viewBox="0 0 200 200">
                    <defs>
                        <linearGradient id="spiritGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" style="stop-color:#ff6b6b"/>
                            <stop offset="50%" style="stop-color:#ffd700"/>
                            <stop offset="100%" style="stop-color:#44ff44"/>
                        </linearGradient>
                    </defs>
                    <circle class="wrapped-spirit-bg" cx="100" cy="100" r="90"/>
                    <circle class="wrapped-spirit-fill" cx="100" cy="100" r="90" 
                        style="--spirit-offset: ${offset}"/>
                </svg>
                <div class="wrapped-spirit-value">${this.data.spiritPercentage}%</div>
            </div>
            <p style="color: rgba(255,255,255,0.7);">
                ${this.data.spiritPercentage >= 80 ? '¡Increíble espíritu navideño!' :
                  this.data.spiritPercentage >= 50 ? '¡Muy buen espíritu!' : 
                  '¡Sigamos sumando magia!'}
            </p>
        `;
    },
    
    renderStats() {
        const stats = this.data.stats;
        return `
            <div class="wrapped-icon">📊</div>
            <h2 class="wrapped-section-title">Datos Curiosos</h2>
            <p class="wrapped-section-subtitle">Números que cuentan nuestra historia</p>
            <div class="wrapped-stats">
                <div class="wrapped-stat-item">
                    <div class="wrapped-stat-icon">👥</div>
                    <div class="wrapped-stat-info">
                        <div class="wrapped-stat-label">Miembros de la familia</div>
                        <div class="wrapped-stat-value"><span class="wrapped-stat-highlight">${stats.totalUsers}</span> personas</div>
                    </div>
                </div>
                <div class="wrapped-stat-item">
                    <div class="wrapped-stat-icon">🏆</div>
                    <div class="wrapped-stat-info">
                        <div class="wrapped-stat-label">Más activo en la app</div>
                        <div class="wrapped-stat-value"><span class="wrapped-stat-highlight">${stats.mostActiveUser}</span></div>
                    </div>
                </div>
                <div class="wrapped-stat-item">
                    <div class="wrapped-stat-icon">🎁</div>
                    <div class="wrapped-stat-info">
                        <div class="wrapped-stat-label">Deseos pedidos</div>
                        <div class="wrapped-stat-value"><span class="wrapped-stat-highlight">${stats.totalWishes}</span> regalos</div>
                    </div>
                </div>
                <div class="wrapped-stat-item">
                    <div class="wrapped-stat-icon">🎄</div>
                    <div class="wrapped-stat-info">
                        <div class="wrapped-stat-label">Días para Navidad</div>
                        <div class="wrapped-stat-value"><span class="wrapped-stat-highlight">${stats.daysUntilChristmas}</span> días</div>
                    </div>
                </div>
            </div>
        `;
    },
    
    renderTopGift() {
        const gift = this.data.topGift;
        return `
            <div class="wrapped-icon">🎁</div>
            <h2 class="wrapped-section-title">El Regalo Más Deseado</h2>
            <p class="wrapped-section-subtitle">Lo que más pidió la familia</p>
            <div class="wrapped-gift-card">
                <div class="wrapped-gift-icon">${gift.icon}</div>
                <h3 class="wrapped-gift-name">${gift.name}</h3>
                <p class="wrapped-gift-count">Pedido ${gift.count} ${gift.count === 1 ? 'vez' : 'veces'}</p>
            </div>
        `;
    },
    
    renderFinal() {
        return `
            <div class="wrapped-icon-row">
                <span>🎄</span>
                <span>❤️</span>
                <span>🎄</span>
            </div>
            <h2 class="wrapped-section-title">¡Feliz Navidad!</h2>
            <p class="wrapped-final-message">
                "Que esta Navidad traiga paz, amor y alegría a cada rincón de nuestro hogar. 
                Juntos somos más fuertes."
            </p>
            <p class="wrapped-final-signature">— Familia ${this.data.familyName} 🎄</p>
            <button class="wrapped-share-btn" onclick="Wrapped.share()">
                <span>📤</span>
                <span>Compartir Wrapped</span>
            </button>
        `;
    },
    
    renderDots() {
        const dotsContainer = document.getElementById('wrapped-dots');
        if (!dotsContainer) return;
        
        dotsContainer.innerHTML = Array.from({ length: this.totalSlides }, (_, i) => `
            <div class="wrapped-dot ${i === this.currentSlide ? 'active' : ''}" data-slide="${i}"></div>
        `).join('');
    },
    
    updateProgress() {
        const progressBar = document.getElementById('wrapped-progress-bar');
        if (progressBar) {
            const progress = ((this.currentSlide + 1) / this.totalSlides) * 100;
            progressBar.style.width = `${progress}%`;
        }
    },
    
    setupEvents() {
        // Cerrar
        const closeBtn = document.getElementById('wrapped-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }
        
        // Dots
        const dotsContainer = document.getElementById('wrapped-dots');
        if (dotsContainer) {
            dotsContainer.addEventListener('click', (e) => {
                const dot = e.target.closest('.wrapped-dot');
                if (dot) {
                    this.goToSlide(parseInt(dot.dataset.slide));
                }
            });
        }
        
        // Touch/Swipe
        this.container.addEventListener('touchstart', (e) => {
            this.touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });
        
        this.container.addEventListener('touchend', (e) => {
            this.touchEndX = e.changedTouches[0].screenX;
            this.handleSwipe();
        }, { passive: true });
        
        // Click para avanzar
        this.container.addEventListener('click', (e) => {
            if (e.target.closest('.wrapped-share-btn') || 
                e.target.closest('.wrapped-dot') ||
                e.target.closest('.wrapped-close')) return;
            
            const rect = this.container.getBoundingClientRect();
            const x = e.clientX - rect.left;
            
            if (x > rect.width / 2) {
                this.next();
            } else {
                this.prev();
            }
        });
        
        // Teclado
        document.addEventListener('keydown', (e) => {
            if (!this.isActive) return;
            if (e.key === 'ArrowRight') this.next();
            if (e.key === 'ArrowLeft') this.prev();
            if (e.key === 'Escape') this.close();
        });
    },
    
    handleSwipe() {
        const diff = this.touchStartX - this.touchEndX;
        const threshold = 50;
        
        if (Math.abs(diff) > threshold) {
            if (diff > 0) {
                this.next();
            } else {
                this.prev();
            }
        }
    },
    
    next() {
        if (this.currentSlide < this.totalSlides - 1) {
            this.goToSlide(this.currentSlide + 1);
        }
    },
    
    prev() {
        if (this.currentSlide > 0) {
            this.goToSlide(this.currentSlide - 1);
        }
    },
    
    goToSlide(index) {
        const slides = this.container.querySelectorAll('.wrapped-slide');
        
        slides.forEach((slide, i) => {
            slide.classList.remove('active', 'prev');
            if (i < index) {
                slide.classList.add('prev');
            } else if (i === index) {
                slide.classList.add('active');
            }
        });
        
        this.currentSlide = index;
        this.updateProgress();
        this.renderDots();
        
        try { Effects.playSound('click'); } catch(e) {}
    },
    
    async open() {
        this.isActive = true;
        this.currentSlide = 0;
        
        await this.init();
        
        Navigation.showScreen('wrapped');
        
        try { Effects.playSound('reveal'); } catch(e) {}
    },
    
    close() {
        this.isActive = false;
        Navigation.showScreen('home');
    },
    
    async share() {
        const shareData = {
            title: 'Christmas Family Wrapped 2025',
            text: `🎄 ¡Mira el resumen navideño de la familia ${this.data.familyName}! Espíritu navideño: ${this.data.spiritPercentage}% ✨`,
            url: window.location.href
        };
        
        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(shareData.text + ' ' + shareData.url);
                showToast('¡Enlace copiado!', 'success');
            }
        } catch (error) {
            console.log('Share cancelled or failed');
        }
    }
};

// Función para inicializar eventos del Wrapped
function initWrappedEvents() {
    // El evento se maneja desde navigation.js
}
