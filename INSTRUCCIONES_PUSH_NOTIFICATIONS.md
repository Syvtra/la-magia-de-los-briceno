# 🔔 Configurar Push Notifications - Navidad Certera

## Paso 1: Generar claves VAPID

1. Ve a **https://vapidkeys.com/**
2. Haz clic en **"Generate"**
3. Guarda las dos claves:
   - **Public Key** (la usarás en config.js y en Supabase)
   - **Private Key** (solo en Supabase, NUNCA en el frontend)

## Paso 2: Actualizar config.js

Abre `js/config.js` y reemplaza:

```javascript
VAPID_PUBLIC_KEY: 'TU_VAPID_PUBLIC_KEY_AQUI',
```

Con tu Public Key real, ejemplo:
```javascript
VAPID_PUBLIC_KEY: 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U',
```

## Paso 3: Instalar Supabase CLI

Abre una terminal y ejecuta:

```bash
npm install -g supabase
```

## Paso 4: Iniciar sesión en Supabase

```bash
supabase login
```

Se abrirá el navegador para autenticarte.

## Paso 5: Vincular tu proyecto

```bash
cd "c:\Users\Usuario\Desktop\Navidad Certera"
supabase link --project-ref kkunaeyytwrrvhgnjkme
```

Te pedirá la contraseña de la base de datos (la que pusiste al crear el proyecto).

## Paso 6: Deployar la Edge Function

```bash
supabase functions deploy send-notification
```

## Paso 7: Configurar los Secrets (MUY IMPORTANTE)

```bash
supabase secrets set VAPID_PUBLIC_KEY="tu_public_key_aqui"
supabase secrets set VAPID_PRIVATE_KEY="tu_private_key_aqui"
```

Reemplaza con tus claves reales de vapidkeys.com

## Paso 8: Verificar en Supabase Dashboard

1. Ve a tu proyecto en **supabase.com**
2. Ve a **Edge Functions**
3. Deberías ver **send-notification** listada
4. Haz clic en ella y verifica que los secrets estén configurados

## Paso 9: Probar

1. Abre tu app en el navegador
2. Ve a **Perfil** y activa **Notificaciones**
3. Acepta el permiso del navegador
4. Como admin, ve al **Panel Admin**
5. Escribe un título y mensaje
6. Haz clic en **Enviar a todos**

## ⚠️ Importante

- Las notificaciones push **solo funcionan en HTTPS** (o localhost)
- El usuario debe **aceptar el permiso** de notificaciones
- La app debe estar **instalada como PWA** o el navegador debe estar abierto en segundo plano
- En iOS/Safari las push notifications tienen limitaciones

## 🔧 Troubleshooting

### "Error al enviar notificación"
- Verifica que los secrets estén configurados correctamente
- Revisa los logs en Supabase > Edge Functions > send-notification > Logs

### "Permiso denegado"
- El usuario rechazó las notificaciones
- Debe ir a configuración del navegador para habilitarlas

### No llegan las notificaciones
- Verifica que el Service Worker esté registrado (F12 > Application > Service Workers)
- Asegúrate de que la suscripción se guardó en la base de datos (tabla users, columna push_subscription)

## 📱 Para que funcione en móvil

1. La app debe servirse por **HTTPS**
2. Sube la app a un hosting (Netlify, Vercel, etc.)
3. Los usuarios deben **"Agregar a pantalla de inicio"**
4. Luego activar notificaciones desde la app
