const CONFIG = {
    SUPABASE_URL: 'https://kkunaeyytwrrvhgnjkme.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrdW5hZXl5dHdycnZoZ25qa21lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2ODc1OTYsImV4cCI6MjA3ODI2MzU5Nn0.LNxUFT9cPTurhF1CY47QPPy_QnOgZW9eH0Z9DXo2mEY',
    
    // URL de producción - IMPORTANTE: Cambia esto por tu URL de GitHub Pages o dominio
    // Ejemplo: 'https://tuusuario.github.io/tu-repo'
    PRODUCTION_URL: 'https://syvtra.github.io/la-magia-de-los-briceno/',
    
    // Genera tus claves en: https://vapidkeys.com/
    // Reemplaza con tu Public Key
    VAPID_PUBLIC_KEY: 'BH0GKWKjDWp4Z5CILITamSrLbA8RDqfzDelaP0Fbhth0Eo2IFCySnCBHZRilggwCS9WK6pKGopKmDIPe6NXMfZc',
    
    AVATARS: {
        'elf': '🧝',
        'santa': '🎅',
        'mrs-claus': '🤶',
        'snowman': '⛄',
        'reindeer': '🦌',
        'angel': '👼',
        'gingerbread': '🍪',
        'tree': '🎄'
    },
    
    PRICE_RANGES: {
        'bajo': 'Hasta $500',
        'medio': '$500 - $1,500',
        'alto': '$1,500 - $3,000',
        'premium': 'Más de $3,000'
    },
    
    GIFT_SUGGESTIONS: [
        { icon: '📚', name: 'Libros', category: 'lectura' },
        { icon: '🎧', name: 'Audífonos', category: 'tecnología' },
        { icon: '🧣', name: 'Bufanda', category: 'ropa' },
        { icon: '🕯️', name: 'Velas aromáticas', category: 'hogar' },
        { icon: '🎮', name: 'Videojuegos', category: 'tecnología' },
        { icon: '☕', name: 'Set de café', category: 'hogar' },
        { icon: '🧴', name: 'Kit de skincare', category: 'belleza' },
        { icon: '🎨', name: 'Material de arte', category: 'arte' },
        { icon: '🍫', name: 'Chocolates gourmet', category: 'comida' },
        { icon: '🌱', name: 'Plantas', category: 'hogar' },
        { icon: '💍', name: 'Joyería', category: 'accesorios' },
        { icon: '🎒', name: 'Mochila', category: 'accesorios' }
    ],
    
    SOUNDS: {
        click: './assets/sounds/click.mp3',
        success: './assets/sounds/success.mp3',
        notification: './assets/sounds/notification.mp3',
        reveal: './assets/sounds/reveal.mp3'
    },
    
    SPIRIT_ACTIONS: {
        login: 5,
        addWish: 10,
        sendMessage: 5,
        updateProfile: 10,
        viewAssignment: 15
    }
};
