-- =====================================================
-- ESQUEMA PARA NOTIFICACIONES DEL ADMIN
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- Tabla para guardar las notificaciones enviadas por el admin
CREATE TABLE IF NOT EXISTS admin_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla para registrar qué usuarios han leído cada notificación
CREATE TABLE IF NOT EXISTS notification_reads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    notification_id UUID NOT NULL REFERENCES admin_notifications(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(notification_id, user_id)
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_notification_reads_user ON notification_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_reads_notification ON notification_reads(notification_id);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created ON admin_notifications(created_at DESC);

-- Habilitar RLS
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_reads ENABLE ROW LEVEL SECURITY;

-- Políticas para admin_notifications
-- Todos pueden leer las notificaciones
CREATE POLICY "Todos pueden ver notificaciones" ON admin_notifications
    FOR SELECT USING (true);

-- Solo admins pueden crear notificaciones (verificar por email)
CREATE POLICY "Admins pueden crear notificaciones" ON admin_notifications
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.is_admin = true
        )
    );

-- Políticas para notification_reads
-- Usuarios pueden ver sus propios registros de lectura
CREATE POLICY "Usuarios ven sus lecturas" ON notification_reads
    FOR SELECT USING (auth.uid() = user_id);

-- Usuarios pueden marcar como leída
CREATE POLICY "Usuarios pueden marcar como leida" ON notification_reads
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Habilitar realtime para notificaciones
ALTER PUBLICATION supabase_realtime ADD TABLE admin_notifications;
