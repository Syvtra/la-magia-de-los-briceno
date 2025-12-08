-- =====================================================
-- NAVIDAD CERTERA - SQL COMPLETO PARA SUPABASE
-- =====================================================
-- INSTRUCCIONES:
-- 1. Ve a tu proyecto en Supabase (supabase.com)
-- 2. Ve a SQL Editor
-- 3. Copia y pega TODO este script
-- 4. Ejecuta el script
-- 5. Ve a Authentication > Providers > Email y desactiva "Confirm email"
-- =====================================================

-- =====================================================
-- PASO 1: EXTENSIONES
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- PASO 2: ELIMINAR TABLAS EXISTENTES (si las hay)
-- =====================================================
DROP TABLE IF EXISTS public.chat CASCADE;
DROP TABLE IF EXISTS public.assignments CASCADE;
DROP TABLE IF EXISTS public.no_wish CASCADE;
DROP TABLE IF EXISTS public.wishlist CASCADE;
DROP TABLE IF EXISTS public.pairs CASCADE;
DROP TABLE IF EXISTS public.app_settings CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- =====================================================
-- PASO 3: CREAR TABLAS
-- =====================================================

-- TABLA: users
CREATE TABLE public.users (
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

-- TABLA: pairs (parejas que no pueden tocarse en sorteo)
CREATE TABLE public.pairs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user1 UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    user2 UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT pairs_different_users CHECK (user1 != user2),
    CONSTRAINT pairs_unique UNIQUE (user1, user2)
);

-- TABLA: wishlist (lista de deseos)
CREATE TABLE public.wishlist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    item TEXT NOT NULL,
    description TEXT,
    price_range TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABLA: no_wish (cosas que NO quiere recibir)
CREATE TABLE public.no_wish (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    item TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABLA: assignments (resultado del sorteo)
CREATE TABLE public.assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    giver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT assignments_different_users CHECK (giver_id != receiver_id),
    CONSTRAINT assignments_unique_giver UNIQUE (giver_id)
);

-- TABLA: chat (mensajes secretos)
CREATE TABLE public.chat (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABLA: app_settings (configuración global)
CREATE TABLE public.app_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    snow_enabled BOOLEAN DEFAULT TRUE,
    lights_enabled BOOLEAN DEFAULT TRUE,
    sounds_enabled BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- PASO 4: CREAR ÍNDICES
-- =====================================================
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_is_admin ON public.users(is_admin);
CREATE INDEX idx_pairs_user1 ON public.pairs(user1);
CREATE INDEX idx_pairs_user2 ON public.pairs(user2);
CREATE INDEX idx_wishlist_user_id ON public.wishlist(user_id);
CREATE INDEX idx_no_wish_user_id ON public.no_wish(user_id);
CREATE INDEX idx_assignments_giver ON public.assignments(giver_id);
CREATE INDEX idx_assignments_receiver ON public.assignments(receiver_id);
CREATE INDEX idx_chat_sender ON public.chat(sender_id);
CREATE INDEX idx_chat_receiver ON public.chat(receiver_id);
CREATE INDEX idx_chat_created ON public.chat(created_at);

-- =====================================================
-- PASO 5: INSERTAR CONFIGURACIÓN POR DEFECTO
-- =====================================================
INSERT INTO public.app_settings (snow_enabled, lights_enabled, sounds_enabled)
VALUES (TRUE, TRUE, TRUE);

-- =====================================================
-- PASO 6: HABILITAR ROW LEVEL SECURITY (RLS)
-- =====================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.no_wish ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PASO 7: POLÍTICAS DE SEGURIDAD - USERS
-- =====================================================

-- Todos pueden ver usuarios
CREATE POLICY "users_select_all" ON public.users
    FOR SELECT
    TO authenticated
    USING (true);

-- Usuario puede actualizar su propio perfil
CREATE POLICY "users_update_own" ON public.users
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Usuario puede insertar su propio perfil
CREATE POLICY "users_insert_own" ON public.users
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

-- =====================================================
-- PASO 8: POLÍTICAS DE SEGURIDAD - PAIRS
-- =====================================================

-- Todos pueden ver parejas
CREATE POLICY "pairs_select_all" ON public.pairs
    FOR SELECT
    TO authenticated
    USING (true);

-- Solo admin puede crear parejas
CREATE POLICY "pairs_insert_admin" ON public.pairs
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
    );

-- Solo admin puede eliminar parejas
CREATE POLICY "pairs_delete_admin" ON public.pairs
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
    );

-- =====================================================
-- PASO 9: POLÍTICAS DE SEGURIDAD - WISHLIST
-- =====================================================

-- Todos pueden ver wishlists
CREATE POLICY "wishlist_select_all" ON public.wishlist
    FOR SELECT
    TO authenticated
    USING (true);

-- Usuario puede insertar en su wishlist
CREATE POLICY "wishlist_insert_own" ON public.wishlist
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Usuario puede actualizar su wishlist
CREATE POLICY "wishlist_update_own" ON public.wishlist
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Usuario puede eliminar de su wishlist
CREATE POLICY "wishlist_delete_own" ON public.wishlist
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- =====================================================
-- PASO 10: POLÍTICAS DE SEGURIDAD - NO_WISH
-- =====================================================

-- Todos pueden ver no_wish
CREATE POLICY "no_wish_select_all" ON public.no_wish
    FOR SELECT
    TO authenticated
    USING (true);

-- Usuario puede insertar en su no_wish
CREATE POLICY "no_wish_insert_own" ON public.no_wish
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Usuario puede eliminar de su no_wish
CREATE POLICY "no_wish_delete_own" ON public.no_wish
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- =====================================================
-- PASO 11: POLÍTICAS DE SEGURIDAD - ASSIGNMENTS
-- =====================================================

-- Usuario solo puede ver su propia asignación
CREATE POLICY "assignments_select_own" ON public.assignments
    FOR SELECT
    TO authenticated
    USING (auth.uid() = giver_id);

-- Solo admin puede crear asignaciones
CREATE POLICY "assignments_insert_admin" ON public.assignments
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
    );

-- Solo admin puede eliminar asignaciones
CREATE POLICY "assignments_delete_admin" ON public.assignments
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
    );

-- =====================================================
-- PASO 12: POLÍTICAS DE SEGURIDAD - CHAT
-- =====================================================

-- Usuario puede ver mensajes donde es sender o receiver
CREATE POLICY "chat_select_own" ON public.chat
    FOR SELECT
    TO authenticated
    USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Usuario puede enviar mensajes (como sender)
CREATE POLICY "chat_insert_own" ON public.chat
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = sender_id);

-- =====================================================
-- PASO 13: POLÍTICAS DE SEGURIDAD - APP_SETTINGS
-- =====================================================

-- Todos pueden ver configuración
CREATE POLICY "settings_select_all" ON public.app_settings
    FOR SELECT
    TO authenticated
    USING (true);

-- Solo admin puede actualizar configuración
CREATE POLICY "settings_update_admin" ON public.app_settings
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
    );

-- =====================================================
-- PASO 14: HABILITAR REALTIME
-- =====================================================

-- Primero removemos si ya existen
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.chat;
    ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.assignments;
    ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.app_settings;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- Agregamos las tablas a realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat;
ALTER PUBLICATION supabase_realtime ADD TABLE public.assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_settings;

-- =====================================================
-- PASO 15: FUNCIÓN PARA HACER ADMIN AL PRIMER USUARIO
-- =====================================================

-- Ejecuta esto DESPUÉS de registrar tu primer usuario
-- Reemplaza 'tu_email@ejemplo.com' con tu email real

-- UPDATE public.users SET is_admin = true WHERE email = 'tu_email@ejemplo.com';

-- =====================================================
-- VERIFICACIÓN FINAL
-- =====================================================

-- Para verificar que todo se creó correctamente:
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- =====================================================
-- ¡LISTO! 
-- Ahora ve a Authentication > Providers > Email
-- y desactiva "Confirm email" para que el registro
-- funcione sin verificación de correo.
-- =====================================================
