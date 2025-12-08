-- =====================================================
-- SOLUCIÓN RECOMENDADA: TRIGGER AUTOMÁTICO
-- Ejecuta esto en SQL Editor de Supabase
-- =====================================================

-- Este trigger crea automáticamente el perfil del usuario
-- cuando se registra en auth.users

-- 1. Crear la función que maneja el trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, name, nickname, avatar_url, is_admin, spirit_points)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', 'Usuario'),
        COALESCE(NEW.raw_user_meta_data->>'nickname', 'usuario'),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', 'elf'),
        FALSE,
        0
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Eliminar trigger existente si lo hay
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 3. Crear el trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- AHORA ACTUALIZA LAS POLÍTICAS DE USERS
-- =====================================================

-- Eliminar todas las políticas existentes
DROP POLICY IF EXISTS "users_select_all" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "users_insert_own" ON public.users;
DROP POLICY IF EXISTS "Users can view all users" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "users_insert_public" ON public.users;

-- Crear políticas limpias
CREATE POLICY "users_select" ON public.users
    FOR SELECT USING (true);

CREATE POLICY "users_update" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- No necesitamos política de INSERT porque el trigger lo hace con SECURITY DEFINER

-- =====================================================
-- VERIFICAR
-- =====================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
