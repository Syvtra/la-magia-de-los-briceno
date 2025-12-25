const Effects = {
    settings: {
        snow: true,
        lights: true,
        sounds: true
    },
    
    snowflakes: [],
    snowInterval: null,
    audioContext: null,
    
    init() {
        this.loadSettings();
        this.createLights();
        
        if (this.settings.snow) {
            this.startSnow();
        }
    },
    
    loadSettings() {
        const saved = Utils.storage.get('effectSettings');
        if (saved) {
            this.settings = { ...this.settings, ...saved };
        }
    },
    
    saveSettings() {
        Utils.storage.set('effectSettings', this.settings);
    },
    
    toggleSnow(enabled) {
        this.settings.snow = enabled;
        this.saveSettings();
        
        if (enabled) {
            this.startSnow();
        } else {
            this.stopSnow();
        }
    },
    
    toggleLights(enabled) {
        this.settings.lights = enabled;
        this.saveSettings();
        
        const container = Utils.$('#lights-container');
        container.style.display = enabled ? 'flex' : 'none';
    },
    
    toggleSounds(enabled) {
        this.settings.sounds = enabled;
        this.saveSettings();
    },
    
    startSnow() {
        if (this.snowInterval) return;
        
        const container = Utils.$('#snow-container');
        container.innerHTML = '';
        
        this.snowInterval = setInterval(() => {
            if (this.snowflakes.length < 50) {
                this.createSnowflake();
            }
        }, 200);
    },
    
    stopSnow() {
        if (this.snowInterval) {
            clearInterval(this.snowInterval);
            this.snowInterval = null;
        }
        
        const container = Utils.$('#snow-container');
        container.innerHTML = '';
        this.snowflakes = [];
    },
    
    createSnowflake() {
        const container = Utils.$('#snow-container');
        const snowflake = document.createElement('div');
        snowflake.className = 'snowflake';
        
        const flakes = ['❄', '❅', '❆', '•'];
        snowflake.textContent = flakes[Math.floor(Math.random() * flakes.length)];
        
        const size = Math.random() * 0.8 + 0.5;
        const startX = Math.random() * 100;
        const duration = Math.random() * 5 + 8;
        const swayDuration = Math.random() * 3 + 2;
        
        snowflake.style.cssText = `
            left: ${startX}%;
            font-size: ${size}rem;
            opacity: ${Math.random() * 0.5 + 0.3};
            animation-duration: ${duration}s, ${swayDuration}s;
            animation-delay: 0s, ${Math.random() * 2}s;
        `;
        
        container.appendChild(snowflake);
        this.snowflakes.push(snowflake);
        
        setTimeout(() => {
            snowflake.remove();
            const index = this.snowflakes.indexOf(snowflake);
            if (index > -1) {
                this.snowflakes.splice(index, 1);
            }
        }, duration * 1000);
    },
    
    createLights() {
        const container = Utils.$('#lights-container');
        container.innerHTML = '<div class="wire"></div>';
        
        const colors = ['red', 'green', 'gold', 'blue'];
        const numLights = Math.floor(window.innerWidth / 30);
        
        for (let i = 0; i < numLights; i++) {
            const light = document.createElement('div');
            light.className = `christmas-light ${colors[i % colors.length]}`;
            light.style.animationDelay = `${Math.random() * 2}s`;
            container.appendChild(light);
        }
    },
    
    lastSoundTime: 0,
    
    playSound(soundName) {
        if (!this.settings.sounds) return;
        
        // Evitar sonidos repetidos muy rápido (debounce 100ms)
        const now = Date.now();
        if (now - this.lastSoundTime < 100) return;
        this.lastSoundTime = now;
        
        try {
            // Crear contexto de audio si no existe
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            
            const ctx = this.audioContext;
            const time = ctx.currentTime;
            
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);
            oscillator.type = 'sine';
            
            switch(soundName) {
                case 'click':
                    // Campanita muy suave
                    oscillator.frequency.setValueAtTime(1200, time);
                    gainNode.gain.setValueAtTime(0.04, time);
                    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.06);
                    oscillator.start(time);
                    oscillator.stop(time + 0.06);
                    break;
                    
                case 'success':
                    oscillator.frequency.setValueAtTime(800, time);
                    oscillator.frequency.setValueAtTime(1000, time + 0.08);
                    gainNode.gain.setValueAtTime(0.05, time);
                    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
                    oscillator.start(time);
                    oscillator.stop(time + 0.2);
                    break;
                    
                case 'notification':
                    oscillator.frequency.setValueAtTime(900, time);
                    gainNode.gain.setValueAtTime(0.05, time);
                    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
                    oscillator.start(time);
                    oscillator.stop(time + 0.1);
                    break;
                    
                case 'reveal':
                    oscillator.frequency.setValueAtTime(600, time);
                    oscillator.frequency.setValueAtTime(800, time + 0.1);
                    oscillator.frequency.setValueAtTime(1000, time + 0.2);
                    gainNode.gain.setValueAtTime(0.06, time);
                    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.35);
                    oscillator.start(time);
                    oscillator.stop(time + 0.35);
                    break;
                    
                default:
                    oscillator.frequency.setValueAtTime(1000, time);
                    gainNode.gain.setValueAtTime(0.03, time);
                    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
                    oscillator.start(time);
                    oscillator.stop(time + 0.05);
            }
        } catch (e) {
            // Silenciar errores
        }
    },
    
    applyGlobalSettings(settings) {
        if (settings) {
            if (typeof settings.snow_enabled !== 'undefined') {
                this.toggleSnow(settings.snow_enabled);
                Utils.$('#setting-snow').checked = settings.snow_enabled;
            }
            if (typeof settings.lights_enabled !== 'undefined') {
                this.toggleLights(settings.lights_enabled);
                Utils.$('#setting-lights').checked = settings.lights_enabled;
            }
            if (typeof settings.sounds_enabled !== 'undefined') {
                this.toggleSounds(settings.sounds_enabled);
                Utils.$('#setting-sounds').checked = settings.sounds_enabled;
            }
        }
    }
};

function initEffectControls() {
    const snowToggle = Utils.$('#setting-snow');
    const lightsToggle = Utils.$('#setting-lights');
    const soundsToggle = Utils.$('#setting-sounds');
    
    if (snowToggle) {
        snowToggle.checked = Effects.settings.snow;
        snowToggle.addEventListener('change', (e) => {
            Effects.toggleSnow(e.target.checked);
        });
    }
    
    if (lightsToggle) {
        lightsToggle.checked = Effects.settings.lights;
        lightsToggle.addEventListener('change', (e) => {
            Effects.toggleLights(e.target.checked);
        });
    }
    
    if (soundsToggle) {
        soundsToggle.checked = Effects.settings.sounds;
        soundsToggle.addEventListener('change', (e) => {
            Effects.toggleSounds(e.target.checked);
        });
    }
}

// =====================================================
// CHRISTMAS COUNTDOWN - Contador para Navidad
// =====================================================

const ChristmasCountdown = {
    intervalId: null,
    
    // Inicializar el contador
    init() {
        this.update();
        // Actualizar cada segundo
        this.intervalId = setInterval(() => this.update(), 1000);
    },
    
    // Detener el contador
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    },
    
    // Obtener la fecha de Navidad en zona horaria de Chile
    getChristmasDate() {
        const now = new Date();
        // Obtener el año actual en Chile
        const chileTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Santiago' }));
        let year = chileTime.getFullYear();
        
        // Si ya pasó Navidad este año, usar el próximo año
        const christmas = new Date(year, 11, 25, 0, 0, 0); // 25 de diciembre a las 00:00
        if (chileTime > christmas) {
            year++;
        }
        
        return new Date(year, 11, 25, 0, 0, 0);
    },
    
    // Obtener el inicio de diciembre para calcular el progreso
    getDecemberStart() {
        const now = new Date();
        const chileTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Santiago' }));
        let year = chileTime.getFullYear();
        
        // Si estamos después del 25 de diciembre, usar el próximo año
        const christmas = new Date(year, 11, 25, 0, 0, 0);
        if (chileTime > christmas) {
            year++;
        }
        
        return new Date(year, 11, 1, 0, 0, 0); // 1 de diciembre a las 00:00
    },
    
    // Calcular el tiempo restante
    getTimeRemaining() {
        const now = new Date();
        // Convertir a hora de Chile
        const chileNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Santiago' }));
        const christmas = this.getChristmasDate();
        
        const diff = christmas - chileNow;
        
        if (diff <= 0) {
            return { days: 0, hours: 0, minutes: 0, seconds: 0, arrived: true };
        }
        
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        return { days, hours, minutes, seconds, arrived: false };
    },
    
    // Calcular el progreso del trineo (0% a 100%)
    getProgress() {
        const now = new Date();
        const chileNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Santiago' }));
        const decemberStart = this.getDecemberStart();
        const christmas = this.getChristmasDate();
        
        // Si es antes de diciembre, progreso es 0
        if (chileNow < decemberStart) {
            return 0;
        }
        
        // Si ya es Navidad, progreso es 100
        if (chileNow >= christmas) {
            return 100;
        }
        
        // Calcular progreso entre 1 y 25 de diciembre
        const totalTime = christmas - decemberStart;
        const elapsedTime = chileNow - decemberStart;
        
        return Math.min(100, Math.max(0, (elapsedTime / totalTime) * 100));
    },
    
    // Actualizar la UI
    update() {
        const countdownText = Utils.$('#countdown-text');
        const sleighContainer = Utils.$('#sleigh-container');
        const trackProgress = Utils.$('#track-progress');
        const arrivedMessage = Utils.$('#countdown-arrived');
        
        if (!countdownText) return;
        
        const time = this.getTimeRemaining();
        const progress = this.getProgress();
        
        if (time.arrived) {
            // ¡Ya llegó Navidad!
            countdownText.textContent = '¡Feliz Navidad!';
            if (arrivedMessage) {
                arrivedMessage.classList.remove('hidden');
            }
            if (sleighContainer) {
                sleighContainer.style.setProperty('--sleigh-position', '85%');
            }
            if (trackProgress) {
                trackProgress.style.setProperty('--progress', '100%');
            }
        } else {
            // Mostrar cuenta regresiva
            let text = 'Faltan ';
            
            if (time.days > 0) {
                text += `${time.days} día${time.days !== 1 ? 's' : ''}, `;
            }
            text += `${time.hours}h ${time.minutes}m ${time.seconds}s`;
            text += ' para Navidad';
            
            countdownText.textContent = text;
            
            if (arrivedMessage) {
                arrivedMessage.classList.add('hidden');
            }
            
            // Actualizar posición del trineo (5% a 85% del contenedor)
            const sleighPosition = 5 + (progress * 0.8);
            if (sleighContainer) {
                sleighContainer.style.setProperty('--sleigh-position', `${sleighPosition}%`);
            }
            
            // Actualizar barra de progreso
            if (trackProgress) {
                trackProgress.style.setProperty('--progress', `${progress}%`);
            }
        }
    }
};
