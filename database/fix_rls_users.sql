-- =====================================================
-- FIX: POLÍTICAS RLS PARA TABLA USERS
-- Ejecuta esto en SQL Editor de Supabase
-- =====================================================

-- Eliminar políticas existentes de users
DROP POLICY IF EXISTS "users_select_all" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "users_insert_own" ON public.users;
DROP POLICY IF EXISTS "Users can view all users" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;

-- Crear nuevas políticas corregidas

-- Todos los usuarios autenticados pueden ver todos los usuarios
CREATE POLICY "users_select_all" ON public.users
    FOR SELECT
    USING (true);

-- Usuario puede actualizar su propio perfil
CREATE POLICY "users_update_own" ON public.users
    FOR UPDATE
    USING (auth.uid() = id);

-- Usuario puede insertar su propio perfil (IMPORTANTE: sin restricción TO authenticated)
CREATE POLICY "users_insert_own" ON public.users
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- =====================================================
-- VERIFICAR QUE RLS ESTÁ HABILITADO
-- =====================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- ALTERNATIVA: Si sigue fallando, ejecuta esto para 
-- permitir inserciones públicas temporalmente
-- =====================================================

-- DROP POLICY IF EXISTS "users_insert_own" ON public.users;
-- CREATE POLICY "users_insert_public" ON public.users
--     FOR INSERT
--     WITH CHECK (true);
