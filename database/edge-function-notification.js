// Edge Function para enviar notificaciones push
// Crear en Supabase: Dashboard > Edge Functions > New Function
// Nombre: send-notification

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { title, body } = await req.json()

        // Obtener todos los usuarios con suscripción push
        const { data: users, error } = await supabaseClient
            .from('users')
            .select('push_subscription')
            .not('push_subscription', 'is', null)

        if (error) throw error

        const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')
        const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')

        const notifications = users.map(async (user) => {
            if (!user.push_subscription) return

            try {
                const subscription = JSON.parse(user.push_subscription)
                
                // Aquí iría la lógica de web-push
                // Para implementación completa, usar librería web-push
                console.log('Sending notification to:', subscription.endpoint)
                
            } catch (e) {
                console.error('Error sending to user:', e)
            }
        })

        await Promise.all(notifications)

        return new Response(
            JSON.stringify({ success: true, message: 'Notifications sent' }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        )
    }
})
