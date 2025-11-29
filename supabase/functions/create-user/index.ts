// Supabase Edge Function: Create User
// Purpose: Admin-only function to create new users with full profile data
// Requires: Service role key (set in Supabase Dashboard)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateUserRequest {
  email: string;
  password: string;
  full_name: string;
  phone_number?: string;
  twilio_phone_number?: string;
  designation?: string;
  role: 'admin' | 'user';
  receive_sms_notifications: boolean;
  is_active: boolean;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get request body
    const requestData: CreateUserRequest = await req.json();

    // Validate required fields
    if (!requestData.email || !requestData.password || !requestData.full_name) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, password, full_name' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Create Supabase admin client with service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // 1. Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: requestData.email,
      password: requestData.password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: requestData.full_name,
      },
    });

    if (authError) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: authError.message }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!authData.user) {
      return new Response(
        JSON.stringify({ error: 'Failed to create user' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const userId = authData.user.id;

    // 2. Update users table with additional profile data
    const { error: profileError } = await supabaseAdmin
      .from('users')
      .update({
        full_name: requestData.full_name,
        phone_number: requestData.phone_number || null,
        twilio_phone_number: requestData.twilio_phone_number || null,
        designation: requestData.designation || null,
        receive_sms_notifications: requestData.receive_sms_notifications ?? true,
        is_active: requestData.is_active ?? true,
      })
      .eq('id', userId);

    if (profileError) {
      console.error('Profile update error:', profileError);
      // Attempt to clean up auth user if profile update fails
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({ error: `Failed to update profile: ${profileError.message}` }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // 3. Set user role
    // Note: The database trigger already creates a 'user' role
    // We need to handle the case where the role already exists OR we want a different role

    // If requesting 'user' role, it's already created by the trigger - skip
    if (requestData.role === 'user') {
      console.log('User role already created by database trigger, skipping...');
    } else {
      // For non-user roles (e.g., 'admin'), we need to either:
      // 1. Update existing user_roles entry, or
      // 2. Delete 'user' role and insert 'admin' role

      // Delete default 'user' role created by trigger
      await supabaseAdmin
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', 'user');

      // Insert the requested role (admin, etc.)
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: userId,
          role: requestData.role,
        });

      if (roleError) {
        console.error('Role assignment error:', roleError);
        // Attempt to clean up if role assignment fails
        await supabaseAdmin.auth.admin.deleteUser(userId);
        return new Response(
          JSON.stringify({ error: `Failed to assign role: ${roleError.message}` }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }

    // 4. Send welcome email (optional - Supabase sends confirmation by default)
    // You can customize this by disabling auto-confirm and using a custom email template

    // Success response
    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: userId,
          email: authData.user.email,
          full_name: requestData.full_name,
          role: requestData.role,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
