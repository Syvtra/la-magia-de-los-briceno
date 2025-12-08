// =====================================================
// EDGE FUNCTION: send-notification
// =====================================================
// Para crear esta función en Supabase:
// 1. Instala Supabase CLI: npm install -g supabase
// 2. supabase login
// 3. supabase link --project-ref kkunaeyytwrrvhgnjkme
// 4. supabase functions new send-notification
// 5. Copia este código en supabase/functions/send-notification/index.ts
// 6. supabase functions deploy send-notification
// 7. Configura los secrets (ver abajo)
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Función para enviar Web Push
async function sendWebPush(subscription: any, payload: string, vapidKeys: any) {
  const endpoint = subscription.endpoint
  const p256dh = subscription.keys.p256dh
  const auth = subscription.keys.auth

  // Para Web Push real necesitas usar la librería web-push
  // Aquí usamos fetch directo al endpoint (simplificado)
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'TTL': '86400',
      },
      body: payload
    })
    return response.ok
  } catch (e) {
    console.error('Push failed:', e)
    return false
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')

    const supabase = createClient(supabaseUrl, supabaseKey)

    const { title, body } = await req.json()

    // Obtener usuarios con suscripción push
    const { data: users, error } = await supabase
      .from('users')
      .select('id, push_subscription')
      .not('push_subscription', 'is', null)

    if (error) throw error

    const payload = JSON.stringify({
      title: title || 'Navidad Certera',
      body: body || 'Tienes una nueva notificación',
      icon: '/assets/icon-192.png',
      badge: '/assets/badge.png'
    })

    let sent = 0
    let failed = 0

    for (const user of users || []) {
      if (!user.push_subscription) continue

      try {
        const subscription = JSON.parse(user.push_subscription)
        
        // Enviar notificación
        const success = await sendWebPush(subscription, payload, {
          publicKey: vapidPublicKey,
          privateKey: vapidPrivateKey
        })

        if (success) sent++
        else failed++

      } catch (e) {
        console.error(`Error sending to user ${user.id}:`, e)
        failed++
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent, 
        failed,
        total: users?.length || 0 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

// =====================================================
// CONFIGURAR SECRETS EN SUPABASE:
// =====================================================
// Después de deployar, configura los secrets:
//
// supabase secrets set VAPID_PUBLIC_KEY=tu_public_key
// supabase secrets set VAPID_PRIVATE_KEY=tu_private_key
//
// O desde el Dashboard:
// Project Settings > Edge Functions > send-notification > Secrets
// =====================================================
