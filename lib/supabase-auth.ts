import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);

export async function signUp(email: string, password: string, fullName: string) {
  // First, sign up the user
  const { data, error } = await supabaseAuth.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  // If signup successful and we have a user, create workspace manually
  if (data.user && !error) {
    try {
      // Create workspace
      const { data: workspace, error: workspaceError } = await supabaseAuth
        .from('workspaces')
        .insert({ name: `${fullName}'s Workspace` })
        .select()
        .single();

      if (workspace && !workspaceError) {
        // Add user to workspace
        await supabaseAuth
          .from('user_workspaces')
          .insert({
            user_id: data.user.id,
            workspace_id: workspace.id,
            role: 'owner',
          });
      }
    } catch (err) {
      console.error('Error creating workspace:', err);
      // Don't fail signup if workspace creation fails
    }
  }

  return { data, error };
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabaseAuth.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
}

export async function signOut() {
  const { error } = await supabaseAuth.auth.signOut();
  return { error };
}

export async function getCurrentUser() {
  const { data: { user } } = await supabaseAuth.auth.getUser();
  return user;
}

export async function getSession() {
  const { data: { session } } = await supabaseAuth.auth.getSession();
  return session;
}
