import { serve } from "std/http/server"
import { createClient } from "supabase"
import { JWT } from "google-auth-library"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Обработка CORS (для тестов из браузера/Postman)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = await req.json()
    const { record } = payload
    
    console.log('--- Incoming Webhook ---')
    console.log('Payload:', JSON.stringify(payload, null, 2))

    if (!record || !record.receiver_id) {
      throw new Error('Missing receiver_id in payload')
    }

    // 1. Инициализируем Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 2. Достаем данные получателя и отправителя
    const [{ data: receiver }, { data: sender }] = await Promise.all([
      supabase.from('profiles').select('fcm_token').eq('id', record.receiver_id).single(),
      supabase.from('profiles').select('full_name').eq('id', record.sender_id).single()
    ])

    if (!receiver?.fcm_token) {
      console.log(`[Skip] Receiver ${record.receiver_id} has no FCM token`)
      return new Response(JSON.stringify({ message: 'No token found' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      })
    }

    // 3. Авторизация в Firebase через Service Account
    const serviceAccount = JSON.parse(Deno.env.get('FIREBASE_SERVICE_ACCOUNT') ?? '{}')
    
    const client = new JWT({
      email: serviceAccount.client_email,
      key: serviceAccount.private_key,
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    })

    const jwtToken = await client.getAccessToken()

    // 4. Отправка уведомления через Firebase HTTP v1 API
    const message = {
      message: {
        token: receiver.fcm_token,
        notification: {
          title: sender?.full_name || 'MatchTrack Notification',
          body: record.text || 'New message!',
        },
        data: {
          type: 'chat',
          friendId: String(record.sender_id),
          friendName: sender?.full_name || '',
          content: record.text || '',
        },
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channel_id: 'messages',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
            },
          },
        },
      },
    }

    console.log(`Sending push to ${record.receiver_id}...`)

    const fcmResponse = await fetch(
      `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwtToken.token}`,
        },
        body: JSON.stringify(message),
      }
    )

    const result = await fcmResponse.json()
    
    if (!fcmResponse.ok) {
      console.error('FCM Error:', result)
      throw new Error(`FCM error: ${result.error?.message || 'Unknown error'}`)
    }

    console.log('Success! Push ID:', result.name)

    return new Response(JSON.stringify(result), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200 
    })

  } catch (error) {
    console.error('Function Error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400 
    })
  }
})
