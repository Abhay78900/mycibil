import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Create client with user's token to get their ID
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    })
    
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { businessName, phone, franchiseId } = await req.json()

    if (!businessName || !franchiseId) {
      return new Response(JSON.stringify({ error: 'Business name and franchise ID are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Use service role client to bypass RLS
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Check if user already has a partner account
    const { data: existingPartner } = await supabaseAdmin
      .from('partners')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle()

    if (existingPartner) {
      return new Response(JSON.stringify({ error: 'Partner account already exists' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Insert partner record
    const { data: partner, error: partnerError } = await supabaseAdmin
      .from('partners')
      .insert({
        owner_id: user.id,
        name: businessName,
        franchise_id: franchiseId,
        commission_rate: 10,
        wallet_balance: 0,
        status: 'active'
      })
      .select()
      .single()

    if (partnerError) {
      console.error('Partner insert error:', partnerError)
      return new Response(JSON.stringify({ error: 'Failed to create partner account' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Update user role to partner
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .update({ role: 'partner' })
      .eq('user_id', user.id)

    if (roleError) {
      console.error('Role update error:', roleError)
    }

    // Update profile phone if provided
    if (phone) {
      await supabaseAdmin
        .from('profiles')
        .update({ phone })
        .eq('id', user.id)
    }

    return new Response(JSON.stringify({ success: true, partner }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
