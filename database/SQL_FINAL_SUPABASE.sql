-- =====================================================
-- NAVIDAD CERTERA - SQL FINAL PARA SUPABASE
-- =====================================================
-- ANTES DE EJECUTAR:
-- 1. Ve a Table Editor en Supabase
-- 2. Elimina TODAS las tablas existentes (si las hay)
-- 3. Luego ejecuta este script completo
-- =====================================================

-- PASO 1: Limpiar todo
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP TABLE IF EXISTS public.chat CASCADE;
DROP TABLE IF EXISTS public.assignments CASCADE;
DROP TABLE IF EXISTS public.no_wish CASCADE;
DROP TABLE IF EXISTS public.wishlist CASCADE;
DROP TABLE IF EXISTS public.pairs CASCADE;
DROP TABLE IF EXISTS public.app_settings CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- PASO 2: Crear tabla users
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL DEFAULT 'Usuario',
    nickname TEXT NOT NULL DEFAULT 'usuario',
    avatar_url TEXT DEFAULT 'elf',
    is_admin BOOLEAN DEFAULT FALSE,
    spirit_points INTEGER DEFAULT 0,
    price_range TEXT,
    interests TEXT,
    push_subscription TEXT,
    last_active TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PASO 3: Crear tabla pairs
CREATE TABLE public.pairs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user1 UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    user2 UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT pairs_different CHECK (user1 != user2)
);

-- PASO 4: Crear tabla wishlist
CREATE TABLE public.wishlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    item TEXT NOT NULL,
    description TEXT,
    price_range TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PASO 5: Crear tabla no_wish
CREATE TABLE public.no_wish (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    item TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PASO 6: Crear tabla assignments
CREATE TABLE public.assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    giver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT assignments_different CHECK (giver_id != receiver_id),
    CONSTRAINT assignments_unique_giver UNIQUE (giver_id)
);

-- PASO 7: Crear tabla chat
CREATE TABLE public.chat (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PASO 8: Crear tabla app_settings
CREATE TABLE public.app_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snow_enabled BOOLEAN DEFAULT TRUE,
    lights_enabled BOOLEAN DEFAULT TRUE,
    sounds_enabled BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PASO 9: Insertar configuración por defecto
INSERT INTO public.app_settings (snow_enabled, lights_enabled, sounds_enabled)
VALUES (TRUE, TRUE, TRUE);

-- =====================================================
-- PASO 10: TRIGGER - Crear usuario automáticamente
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.users (id, email, name, nickname, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', 'Usuario'),
        COALESCE(NEW.raw_user_meta_data->>'nickname', 'usuario'),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', 'elf')
    );
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- PASO 11: HABILITAR RLS
-- =====================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.no_wish ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PASO 12: POLÍTICAS PARA USERS
-- =====================================================
CREATE POLICY "Todos pueden ver usuarios"
    ON public.users FOR SELECT
    USING (true);

CREATE POLICY "Usuario edita su perfil"
    ON public.users FOR UPDATE
    USING (auth.uid() = id);

-- =====================================================
-- PASO 13: POLÍTICAS PARA PAIRS
-- =====================================================
CREATE POLICY "Todos pueden ver parejas"
    ON public.pairs FOR SELECT
    USING (true);

CREATE POLICY "Admin crea parejas"
    ON public.pairs FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true
    ));

CREATE POLICY "Admin elimina parejas"
    ON public.pairs FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true
    ));

-- =====================================================
-- PASO 14: POLÍTICAS PARA WISHLIST
-- =====================================================
CREATE POLICY "Todos pueden ver wishlist"
    ON public.wishlist FOR SELECT
    USING (true);

CREATE POLICY "Usuario crea en su wishlist"
    ON public.wishlist FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuario edita su wishlist"
    ON public.wishlist FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Usuario elimina de su wishlist"
    ON public.wishlist FOR DELETE
    USING (auth.uid() = user_id);

-- =====================================================
-- PASO 15: POLÍTICAS PARA NO_WISH
-- =====================================================
CREATE POLICY "Todos pueden ver no_wish"
    ON public.no_wish FOR SELECT
    USING (true);

CREATE POLICY "Usuario crea en su no_wish"
    ON public.no_wish FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuario elimina de su no_wish"
    ON public.no_wish FOR DELETE
    USING (auth.uid() = user_id);

-- =====================================================
-- PASO 16: POLÍTICAS PARA ASSIGNMENTS
-- =====================================================
CREATE POLICY "Usuario ve su asignacion"
    ON public.assignments FOR SELECT
    USING (auth.uid() = giver_id);

CREATE POLICY "Admin crea asignaciones"
    ON public.assignments FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true
    ));

CREATE POLICY "Admin elimina asignaciones"
    ON public.assignments FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true
    ));

-- =====================================================
-- PASO 17: POLÍTICAS PARA CHAT
-- =====================================================
CREATE POLICY "Usuario ve sus mensajes"
    ON public.chat FOR SELECT
    USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Usuario envia mensajes"
    ON public.chat FOR INSERT
    WITH CHECK (auth.uid() = sender_id);

-- =====================================================
-- PASO 18: POLÍTICAS PARA APP_SETTINGS
-- =====================================================
CREATE POLICY "Todos pueden ver settings"
    ON public.app_settings FOR SELECT
    USING (true);

CREATE POLICY "Admin edita settings"
    ON public.app_settings FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true
    ));

-- =====================================================
-- PASO 19: HABILITAR REALTIME
-- =====================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat;
ALTER PUBLICATION supabase_realtime ADD TABLE public.assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_settings;

-- =====================================================
-- LISTO!
-- =====================================================
-- Ahora ve a Authentication > Providers > Email
-- y DESACTIVA "Confirm email"
--
-- Después de registrar tu primer usuario, hazlo admin:
-- UPDATE public.users SET is_admin = true WHERE email = 'TU_EMAIL';
-- =====================================================
