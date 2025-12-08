-- =====================================================
-- NAVIDAD CERTERA - ESQUEMA DE BASE DE DATOS
-- Ejecutar este script en el SQL Editor de Supabase
-- =====================================================

-- Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLA: users
-- Almacena información de los usuarios
-- =====================================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    nickname TEXT NOT NULL,
    avatar_url TEXT DEFAULT 'elf',
    is_admin BOOLEAN DEFAULT FALSE,
    spirit_points INTEGER DEFAULT 0,
    price_range TEXT,
    interests TEXT,
    push_subscription TEXT,
    last_active TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para users
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON public.users(is_admin);

-- =====================================================
-- TABLA: pairs
-- Almacena parejas que no pueden tocarse en el sorteo
-- =====================================================
CREATE TABLE IF NOT EXISTS public.pairs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user1 UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    user2 UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT pairs_different_users CHECK (user1 != user2),
    CONSTRAINT pairs_unique UNIQUE (user1, user2)
);

-- Índices para pairs
CREATE INDEX IF NOT EXISTS idx_pairs_user1 ON public.pairs(user1);
CREATE INDEX IF NOT EXISTS idx_pairs_user2 ON public.pairs(user2);

-- =====================================================
-- TABLA: wishlist
-- Lista de deseos de cada usuario
-- =====================================================
CREATE TABLE IF NOT EXISTS public.wishlist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    item TEXT NOT NULL,
    description TEXT,
    price_range TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para wishlist
CREATE INDEX IF NOT EXISTS idx_wishlist_user_id ON public.wishlist(user_id);

-- =====================================================
-- TABLA: no_wish
-- Cosas que el usuario NO quiere recibir
-- =====================================================
CREATE TABLE IF NOT EXISTS public.no_wish (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    item TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para no_wish
CREATE INDEX IF NOT EXISTS idx_no_wish_user_id ON public.no_wish(user_id);

-- =====================================================
-- TABLA: assignments
-- Resultado del sorteo (quién regala a quién)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    giver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT assignments_different_users CHECK (giver_id != receiver_id),
    CONSTRAINT assignments_unique_giver UNIQUE (giver_id)
);

-- Índices para assignments
CREATE INDEX IF NOT EXISTS idx_assignments_giver ON public.assignments(giver_id);
CREATE INDEX IF NOT EXISTS idx_assignments_receiver ON public.assignments(receiver_id);

-- =====================================================
-- TABLA: chat
-- Mensajes del chat secreto
-- =====================================================
CREATE TABLE IF NOT EXISTS public.chat (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para chat
CREATE INDEX IF NOT EXISTS idx_chat_sender ON public.chat(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_receiver ON public.chat(receiver_id);
CREATE INDEX IF NOT EXISTS idx_chat_created ON public.chat(created_at);

-- =====================================================
-- TABLA: app_settings
-- Configuración global de la aplicación
-- =====================================================
CREATE TABLE IF NOT EXISTS public.app_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    snow_enabled BOOLEAN DEFAULT TRUE,
    lights_enabled BOOLEAN DEFAULT TRUE,
    sounds_enabled BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar configuración por defecto
INSERT INTO public.app_settings (snow_enabled, lights_enabled, sounds_enabled)
VALUES (TRUE, TRUE, TRUE)
ON CONFLICT DO NOTHING;

-- =====================================================
-- POLÍTICAS DE SEGURIDAD (RLS)
-- =====================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.no_wish ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Políticas para users
CREATE POLICY "Users can view all users" ON public.users
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Políticas para pairs (solo admin puede modificar)
CREATE POLICY "Anyone can view pairs" ON public.pairs
    FOR SELECT USING (true);

CREATE POLICY "Admin can insert pairs" ON public.pairs
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
    );

CREATE POLICY "Admin can delete pairs" ON public.pairs
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
    );

-- Políticas para wishlist
CREATE POLICY "Anyone can view wishlist" ON public.wishlist
    FOR SELECT USING (true);

CREATE POLICY "Users can manage own wishlist" ON public.wishlist
    FOR ALL USING (auth.uid() = user_id);

-- Políticas para no_wish
CREATE POLICY "Anyone can view no_wish" ON public.no_wish
    FOR SELECT USING (true);

CREATE POLICY "Users can manage own no_wish" ON public.no_wish
    FOR ALL USING (auth.uid() = user_id);

-- Políticas para assignments
CREATE POLICY "Users can view own assignment" ON public.assignments
    FOR SELECT USING (auth.uid() = giver_id);

CREATE POLICY "Admin can manage assignments" ON public.assignments
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
    );

-- Políticas para chat
CREATE POLICY "Users can view own messages" ON public.chat
    FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages" ON public.chat
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Políticas para app_settings
CREATE POLICY "Anyone can view settings" ON public.app_settings
    FOR SELECT USING (true);

CREATE POLICY "Admin can update settings" ON public.app_settings
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
    );

CREATE POLICY "Admin can insert settings" ON public.app_settings
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
    );

-- =====================================================
-- HABILITAR REALTIME
-- =====================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat;
ALTER PUBLICATION supabase_realtime ADD TABLE public.assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_settings;

-- =====================================================
-- FUNCIÓN: Crear primer admin
-- Ejecutar después de que el primer usuario se registre
-- Reemplaza 'EMAIL_DEL_ADMIN' con el email del admin
-- =====================================================
-- UPDATE public.users SET is_admin = true WHERE email = 'EMAIL_DEL_ADMIN';
