declare const Deno: any;

import { createClient } from "@supabase/supabase-js"
import { JWT } from "google-auth-library"

interface WebhookPayload {
  record: {
    receiver_id: string;
    sender_id: string;
    text?: string;
  };
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload: WebhookPayload = await req.json()
    const { record } = payload
    
    if (!record?.receiver_id) {
      throw new Error('Missing receiver_id in payload')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabaseClient = createClient(supabaseUrl, supabaseKey)

    const [receiverRes, senderRes] = await Promise.all([
      supabaseClient.from('profiles').select('fcm_token').eq('id', record.receiver_id).single(),
      supabaseClient.from('profiles').select('display_name').eq('id', record.sender_id).single()
    ])

    const receiver = receiverRes.data
    const sender = senderRes.data

    if (!receiver?.fcm_token) {
      return new Response(JSON.stringify({ message: 'No token found' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      })
    }

    const fbRaw = Deno.env.get('FIREBASE_SERVICE_ACCOUNT') ?? '{}'
    const serviceAccount = JSON.parse(fbRaw)
    
    const client = new JWT({
      email: serviceAccount.client_email,
      key: serviceAccount.private_key,
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    })

    const accessToken = await client.getAccessToken()
    const bearerToken = accessToken.token

    if (!bearerToken) {
      throw new Error('Failed to get Firebase access token')
    }
    const message = {
      message: {
        token: receiver.fcm_token,
        notification: {
          title: sender?.display_name || 'MatchTrack',
          body: record.text || 'Новое сообщение', 
        },
        data: {
          type: 'chat',
          friendId: String(record.sender_id),
          friendName: sender?.display_name || 'Пользователь',
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

    const fcmResponse = await fetch(
      `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${bearerToken}`,
        },
        body: JSON.stringify(message),
      }
    )

    const result = await fcmResponse.json()
    
    if (!fcmResponse.ok) {
      throw new Error(`FCM error: ${JSON.stringify(result)}`)
    }

    return new Response(JSON.stringify(result), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200 
    })

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return new Response(JSON.stringify({ error: msg }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400 
    })
  }
})
