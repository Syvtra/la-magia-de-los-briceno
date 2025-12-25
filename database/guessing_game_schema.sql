-- =====================================================
-- JUEGO DE ADIVINANZAS - ESQUEMA ADICIONAL
-- Ejecutar este script en el SQL Editor de Supabase
-- DESPUÉS de tener el schema.sql base
-- =====================================================

-- =====================================================
-- TABLA: secret_clues
-- Pistas que cada usuario escribe sobre su amigo secreto
-- =====================================================
CREATE TABLE IF NOT EXISTS public.secret_clues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    giver_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    receiver_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    clue_funny TEXT NOT NULL,           -- Cualidad graciosa
    clue_curiosity TEXT NOT NULL,       -- Cualidad curiosa
    clue_hard TEXT NOT NULL,            -- Cualidad difícil de adivinar
    clue_typical TEXT NOT NULL,         -- Algo típico de esa persona
    clue_free TEXT NOT NULL,            -- Pista libre
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT secret_clues_different_users CHECK (giver_user_id != receiver_user_id),
    CONSTRAINT secret_clues_unique_giver UNIQUE (giver_user_id)
);

-- Índices para secret_clues
CREATE INDEX IF NOT EXISTS idx_secret_clues_giver ON public.secret_clues(giver_user_id);
CREATE INDEX IF NOT EXISTS idx_secret_clues_receiver ON public.secret_clues(receiver_user_id);

-- =====================================================
-- TABLA: game_state
-- Estado global del juego de adivinanzas
-- =====================================================
CREATE TABLE IF NOT EXISTS public.game_state (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    is_active BOOLEAN DEFAULT FALSE,
    current_turn_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    current_turn_index INTEGER DEFAULT 0,
    turn_order UUID[] DEFAULT '{}',     -- Array con el orden de turnos
    started_at TIMESTAMP WITH TIME ZONE,
    finished_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar estado inicial del juego
INSERT INTO public.game_state (is_active, current_turn_index)
VALUES (FALSE, 0)
ON CONFLICT DO NOTHING;

-- =====================================================
-- TABLA: game_turns
-- Registro de turnos completados
-- =====================================================
CREATE TABLE IF NOT EXISTS public.game_turns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    turn_number INTEGER NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    revealed_name TEXT,                 -- Nombre revelado del amigo secreto
    CONSTRAINT game_turns_unique_user UNIQUE (user_id)
);

-- Índices para game_turns
CREATE INDEX IF NOT EXISTS idx_game_turns_user ON public.game_turns(user_id);
CREATE INDEX IF NOT EXISTS idx_game_turns_number ON public.game_turns(turn_number);

-- =====================================================
-- POLÍTICAS DE SEGURIDAD (RLS)
-- =====================================================

-- Habilitar RLS en las nuevas tablas
ALTER TABLE public.secret_clues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_turns ENABLE ROW LEVEL SECURITY;

-- Políticas para secret_clues
CREATE POLICY "Users can view own clues" ON public.secret_clues
    FOR SELECT USING (auth.uid() = giver_user_id);

CREATE POLICY "Users can insert own clues" ON public.secret_clues
    FOR INSERT WITH CHECK (auth.uid() = giver_user_id);

CREATE POLICY "Admin can view all clues" ON public.secret_clues
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
    );

-- Política especial: durante el juego activo, todos pueden ver las pistas del turno actual
CREATE POLICY "Users can view clues during active game" ON public.secret_clues
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.game_state gs 
            WHERE gs.is_active = true 
            AND gs.current_turn_user_id = public.secret_clues.giver_user_id
        )
    );

-- Políticas para game_state
CREATE POLICY "Anyone can view game state" ON public.game_state
    FOR SELECT USING (true);

CREATE POLICY "Admin can manage game state" ON public.game_state
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
    );

-- Política para que el usuario del turno actual pueda actualizar
CREATE POLICY "Current turn user can update game state" ON public.game_state
    FOR UPDATE USING (
        current_turn_user_id = auth.uid()
    );

-- Políticas para game_turns
CREATE POLICY "Anyone can view game turns" ON public.game_turns
    FOR SELECT USING (true);

CREATE POLICY "Users can insert own turn" ON public.game_turns
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin can manage game turns" ON public.game_turns
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
    );

-- =====================================================
-- HABILITAR REALTIME
-- =====================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.secret_clues;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_state;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_turns;

-- =====================================================
-- FUNCIÓN: Avanzar al siguiente turno
-- =====================================================
CREATE OR REPLACE FUNCTION advance_game_turn()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_state RECORD;
    next_index INTEGER;
    next_user_id UUID;
BEGIN
    -- Obtener estado actual
    SELECT * INTO current_state FROM public.game_state LIMIT 1;
    
    IF current_state IS NULL OR NOT current_state.is_active THEN
        RETURN;
    END IF;
    
    -- Calcular siguiente índice
    next_index := current_state.current_turn_index + 1;
    
    -- Verificar si hay más turnos
    IF next_index >= array_length(current_state.turn_order, 1) THEN
        -- Juego terminado
        UPDATE public.game_state 
        SET is_active = false,
            finished_at = NOW(),
            updated_at = NOW()
        WHERE id = current_state.id;
    ELSE
        -- Avanzar al siguiente turno
        next_user_id := current_state.turn_order[next_index + 1]; -- Arrays en PostgreSQL son 1-indexed
        
        UPDATE public.game_state 
        SET current_turn_index = next_index,
            current_turn_user_id = next_user_id,
            updated_at = NOW()
        WHERE id = current_state.id;
    END IF;
END;
$$;
