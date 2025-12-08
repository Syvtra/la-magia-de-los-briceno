const Tutorial = {
    steps: [
        {
            id: 'welcome',
            title: '¡Bienvenido a La Magia de los Briceño!',
            description: 'Esta app te ayuda a organizar tu intercambio de regalos navideño de forma divertida y secreta.',
            icon: '🎄',
            highlight: null
        },
        {
            id: 'home',
            title: 'Pantalla de Inicio',
            description: 'Aquí verás un resumen de todo: tu espíritu navideño, accesos rápidos y tu lista de deseos.',
            icon: '🏠',
            highlight: '#screen-home'
        },
        {
            id: 'spirit',
            title: 'Espíritu Navideño',
            description: 'Tu barra de espíritu sube cuando participas: envías mensajes, agregas deseos o visitas la app. ¡Llénala al 100%!',
            icon: '✨',
            highlight: '.spirit-meter'
        },
        {
            id: 'assignment',
            title: 'Mi Amigo Secreto',
            description: 'Cuando el admin haga el sorteo, aquí descubrirás a quién debes regalar. ¡Es secreto, no lo cuentes!',
            icon: '🎁',
            highlight: '[data-action="view-assignment"]'
        },
        {
            id: 'chat',
            title: 'Chat Secreto',
            description: 'Envía mensajes anónimos a tu amigo secreto como "Duende Mensajero". Puedes darle pistas o preguntarle cosas sin revelar tu identidad.',
            icon: '💬',
            highlight: '[data-action="secret-chat"]'
        },
        {
            id: 'wishlist',
            title: 'Lista de Deseos',
            description: 'Agrega los regalos que te gustaría recibir para ayudar a tu amigo secreto. También puedes indicar lo que NO quieres.',
            icon: '📋',
            highlight: '[data-screen="wishlist"]'
        },
        {
            id: 'village',
            title: 'Aldea Navideña',
            description: 'Un mapa visual donde cada participante tiene su casita. Las casas iluminadas indican quién ha estado activo.',
            icon: '🗺️',
            highlight: '.village-preview'
        },
        {
            id: 'profile',
            title: 'Tu Perfil',
            description: 'Personaliza tu avatar, indica tus preferencias de regalo y configura efectos visuales y notificaciones.',
            icon: '👤',
            highlight: '[data-screen="profile"]'
        },
        {
            id: 'notifications',
            title: 'Notificaciones',
            description: 'Activa las notificaciones para recibir alertas cuando te lleguen mensajes secretos o haya novedades importantes.',
            icon: '🔔',
            highlight: '#setting-notifications'
        },
        {
            id: 'ready',
            title: '¡Todo Listo!',
            description: '¡Ya estás preparado para disfrutar de tu intercambio navideño! Recuerda mantener el secreto.',
            icon: '🎉',
            highlight: null
        }
    ],
    
    currentStep: 0,
    isActive: false,
    overlay: null,
    
    init() {
        this.createOverlay();
        this.checkFirstVisit();
    },
    
    createOverlay() {
        if (document.getElementById('tutorial-overlay')) return;
        
        const overlay = document.createElement('div');
        overlay.id = 'tutorial-overlay';
        overlay.className = 'tutorial-overlay hidden';
        overlay.innerHTML = `
            <div class="tutorial-spotlight"></div>
            <div class="tutorial-card">
                <div class="tutorial-progress">
                    <div class="tutorial-progress-bar"></div>
                </div>
                <div class="tutorial-icon"></div>
                <h2 class="tutorial-title"></h2>
                <p class="tutorial-description"></p>
                <div class="tutorial-actions">
                    <button class="btn btn-outline tutorial-skip">Saltar</button>
                    <button class="btn btn-primary tutorial-next">
                        <span>Siguiente</span>
                        <span class="btn-glow"></span>
                    </button>
                </div>
                <div class="tutorial-dots"></div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        this.overlay = overlay;
        
        overlay.querySelector('.tutorial-skip').addEventListener('click', () => this.end());
        overlay.querySelector('.tutorial-next').addEventListener('click', () => this.next());
        
        // Cerrar con ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isActive) {
                this.end();
            }
        });
    },
    
    checkFirstVisit() {
        const hasSeenTutorial = localStorage.getItem('navidad_tutorial_seen');
        if (!hasSeenTutorial && Auth.currentUser) {
            setTimeout(() => this.start(), 1000);
        }
    },
    
    start() {
        this.isActive = true;
        this.currentStep = 0;
        this.overlay.classList.remove('hidden');
        this.overlay.classList.add('active');
        this.renderStep();
        Effects.playSound('notification');
    },
    
    next() {
        if (this.currentStep < this.steps.length - 1) {
            this.currentStep++;
            this.renderStep();
            Effects.playSound('click');
        } else {
            this.end();
        }
    },
    
    previous() {
        if (this.currentStep > 0) {
            this.currentStep--;
            this.renderStep();
        }
    },
    
    goToStep(index) {
        if (index >= 0 && index < this.steps.length) {
            this.currentStep = index;
            this.renderStep();
        }
    },
    
    renderStep() {
        const step = this.steps[this.currentStep];
        const card = this.overlay.querySelector('.tutorial-card');
        const spotlight = this.overlay.querySelector('.tutorial-spotlight');
        
        // Actualizar contenido
        card.querySelector('.tutorial-icon').textContent = step.icon;
        card.querySelector('.tutorial-title').textContent = step.title;
        card.querySelector('.tutorial-description').textContent = step.description;
        
        // Actualizar progreso
        const progress = ((this.currentStep + 1) / this.steps.length) * 100;
        card.querySelector('.tutorial-progress-bar').style.width = `${progress}%`;
        
        // Actualizar botón
        const nextBtn = card.querySelector('.tutorial-next span:first-child');
        nextBtn.textContent = this.currentStep === this.steps.length - 1 ? '¡Empezar!' : 'Siguiente';
        
        // Actualizar dots
        const dotsContainer = card.querySelector('.tutorial-dots');
        dotsContainer.innerHTML = this.steps.map((_, i) => `
            <span class="tutorial-dot ${i === this.currentStep ? 'active' : ''}" data-step="${i}"></span>
        `).join('');
        
        // Click en dots
        dotsContainer.querySelectorAll('.tutorial-dot').forEach(dot => {
            dot.addEventListener('click', () => {
                this.goToStep(parseInt(dot.dataset.step));
            });
        });
        
        // Highlight elemento y posicionar card
        this.highlightElement(step.highlight, card);
        
        // Animación de entrada
        card.classList.remove('tutorial-card-enter');
        void card.offsetWidth; // Trigger reflow
        card.classList.add('tutorial-card-enter');
    },
    
    highlightElement(selector, card) {
        const spotlight = this.overlay.querySelector('.tutorial-spotlight');
        
        // Remover highlight anterior
        document.querySelectorAll('.tutorial-highlighted').forEach(el => {
            el.classList.remove('tutorial-highlighted');
        });
        
        // Reset card position
        card.style.position = '';
        card.style.top = '';
        card.style.bottom = '';
        card.style.left = '';
        card.style.transform = '';
        card.classList.remove('tutorial-card-top', 'tutorial-card-bottom');
        
        if (!selector) {
            spotlight.style.display = 'none';
            return;
        }
        
        const element = document.querySelector(selector);
        if (!element) {
            spotlight.style.display = 'none';
            return;
        }
        
        element.classList.add('tutorial-highlighted');
        
        const rect = element.getBoundingClientRect();
        const padding = 10;
        
        spotlight.style.display = 'block';
        spotlight.style.top = `${rect.top - padding}px`;
        spotlight.style.left = `${rect.left - padding}px`;
        spotlight.style.width = `${rect.width + padding * 2}px`;
        spotlight.style.height = `${rect.height + padding * 2}px`;
        
        // Posicionar el card para que no tape el elemento
        this.positionCard(card, rect);
    },
    
    positionCard(card, elementRect) {
        const windowHeight = window.innerHeight;
        const windowWidth = window.innerWidth;
        const cardHeight = 380; // Altura aproximada del card
        const cardWidth = Math.min(360, windowWidth - 32);
        const margin = 20;
        
        // Calcular espacio disponible arriba y abajo del elemento
        const spaceAbove = elementRect.top;
        const spaceBelow = windowHeight - elementRect.bottom;
        
        card.style.position = 'fixed';
        card.style.left = '50%';
        card.style.transform = 'translateX(-50%)';
        card.style.maxWidth = `${cardWidth}px`;
        
        // Si hay más espacio abajo, poner el card abajo
        if (spaceBelow > cardHeight + margin || spaceBelow > spaceAbove) {
            card.style.top = `${Math.min(elementRect.bottom + margin, windowHeight - cardHeight - margin)}px`;
            card.style.bottom = 'auto';
            card.classList.add('tutorial-card-bottom');
        } else {
            // Si hay más espacio arriba, poner el card arriba
            card.style.top = 'auto';
            card.style.bottom = `${Math.min(windowHeight - elementRect.top + margin, windowHeight - margin)}px`;
            card.classList.add('tutorial-card-top');
        }
        
        // Si el elemento está muy centrado, centrar el card verticalmente
        const elementCenter = elementRect.top + elementRect.height / 2;
        if (elementCenter > windowHeight * 0.35 && elementCenter < windowHeight * 0.65) {
            // Elemento en el centro, poner card arriba o abajo según espacio
            if (spaceAbove > spaceBelow) {
                card.style.top = `${margin}px`;
                card.style.bottom = 'auto';
            } else {
                card.style.top = 'auto';
                card.style.bottom = `${margin}px`;
            }
        }
    },
    
    end() {
        this.isActive = false;
        this.overlay.classList.remove('active');
        
        setTimeout(() => {
            this.overlay.classList.add('hidden');
        }, 300);
        
        localStorage.setItem('navidad_tutorial_seen', 'true');
        
        // Remover highlights
        document.querySelectorAll('.tutorial-highlighted').forEach(el => {
            el.classList.remove('tutorial-highlighted');
        });
        
        Effects.playSound('reveal');
        showToast('¡Tutorial completado! Disfruta la app', 'success');
    },
    
    // Reiniciar tutorial (para botón de ayuda)
    restart() {
        localStorage.removeItem('navidad_tutorial_seen');
        this.start();
    }
};

// Agregar botón de ayuda en el header
function addHelpButton() {
    const headerActions = document.querySelector('.header-actions');
    if (!headerActions || headerActions.querySelector('#btn-help')) return;
    
    const helpBtn = document.createElement('button');
    helpBtn.id = 'btn-help';
    helpBtn.className = 'btn-icon';
    helpBtn.innerHTML = '<span>❓</span>';
    helpBtn.title = 'Ver tutorial';
    helpBtn.addEventListener('click', () => Tutorial.restart());
    
    headerActions.insertBefore(helpBtn, headerActions.firstChild);
}
