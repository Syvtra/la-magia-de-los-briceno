import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

// Función para crear el JWT para VAPID
function base64UrlEncode(data: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...data));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

async function generateVapidAuth(
  endpoint: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  subject: string
): Promise<{ authorization: string; cryptoKey: string }> {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;

  const header = { typ: "JWT", alg: "ES256" };
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    sub: subject,
  };

  const headerB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));

  const privateKeyData = Uint8Array.from(atob(vapidPrivateKey.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    "raw",
    privateKeyData,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(`${headerB64}.${payloadB64}`)
  );

  const signatureB64 = base64UrlEncode(new Uint8Array(signature));
  const jwt = `${headerB64}.${payloadB64}.${signatureB64}`;

  return {
    authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
    cryptoKey: `p256ecdsa=${vapidPublicKey}`,
  };
}

async function sendPushNotification(
  subscription: PushSubscription,
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<boolean> {
  try {
    const vapidAuth = await generateVapidAuth(
      subscription.endpoint,
      vapidPublicKey,
      vapidPrivateKey,
      "mailto:admin@navidadcertera.com"
    );

    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Encoding": "aes128gcm",
        TTL: "86400",
        Authorization: vapidAuth.authorization,
        "Crypto-Key": vapidAuth.cryptoKey,
      },
      body: payload,
    });

    return response.ok || response.status === 201;
  } catch (error) {
    console.error("Error sending push:", error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { title, body } = await req.json();

    // Obtener usuarios con suscripción
    const { data: users, error } = await supabase
      .from("users")
      .select("id, push_subscription")
      .not("push_subscription", "is", null);

    if (error) throw error;

    const payload = JSON.stringify({
      title: title || "Navidad Certera 🎄",
      body: body || "Tienes una nueva notificación",
      icon: "/assets/icon-192.png",
      badge: "/assets/badge.png",
    });

    let sent = 0;
    let failed = 0;

    for (const user of users || []) {
      if (!user.push_subscription) continue;

      try {
        const subscription: PushSubscription = JSON.parse(user.push_subscription);
        const success = await sendPushNotification(
          subscription,
          payload,
          vapidPublicKey,
          vapidPrivateKey
        );

        if (success) sent++;
        else failed++;
      } catch (e) {
        console.error(`Error for user ${user.id}:`, e);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent, failed, total: users?.length || 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
