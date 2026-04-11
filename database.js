const SUPABASE_URL = "https://tyfctyhjlvwogfptfcwf.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5ZmN0eWhqbHZ3b2dmcHRmY3dmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0OTYzMDYsImV4cCI6MjA4OTA3MjMwNn0.SjBPscTFLhmjnqJpEQVL1qIY9JnqpyOhX_qPYfgUg78";

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Global auth state
let currentUser = null;
let isAdmin = false;

// Check session on load
async function checkAuth() {
  const { data: { session } } = await db.auth.getSession();
  if (session) {
    currentUser = session.user;
    // Check admin status AFTER getting session, not in onAuthStateChange
    await checkAdminStatus();
  }
  updateUIForAuth();
  return session;
}

// Check if user is admin
async function checkAdminStatus() {
  if (!currentUser) {
    isAdmin = false;
    return;
  }
  
  try {
    const { data, error } = await db
      .from('admin_profiles')
      .select('is_admin')
      .eq('id', currentUser.id)
      .single();
    
    if (error) {
      console.error('Error checking admin status:', error);
      isAdmin = false;
      return;
    }
    
    isAdmin = data?.is_admin || false;
  } catch (err) {
    console.error('Exception in checkAdminStatus:', err);
    isAdmin = false;
  }
}

// Update UI based on auth state
function updateUIForAuth() {
  window.dispatchEvent(new CustomEvent('authStateChanged', { 
    detail: { user: currentUser, isAdmin } 
  }));
}

// Sign in - FIXED: Don't rely on onAuthStateChange to set user
async function signIn(email, password) {
  console.log('signIn called with:', email);
  
  const { data, error } = await db.auth.signInWithPassword({
    email,
    password
  });
  
  console.log('Supabase response:', { data, error });
  
  if (error) throw error;
  
  // Set user immediately instead of waiting for onAuthStateChange
  currentUser = data.user;
  
  // Check admin status after successful login
  await checkAdminStatus();
  updateUIForAuth();
  
  return data;
}

// Sign up - immediately creates admin
async function signUp(email, password) {
  const { data, error } = await db.auth.signUp({
    email,
    password,
    options: {
      data: {
        is_admin: true
      }
    }
  });
  
  if (error) throw error;
  
  // If we got a user, create admin profile
  if (data.user) {
    const { error: profileError } = await db
      .from('admin_profiles')
      .upsert({ 
        id: data.user.id, 
        is_admin: true 
      });
    
    if (profileError) console.error('Profile creation error:', profileError);
  }
  
  return data;
}

// Sign out
async function signOut() {
  await db.auth.signOut();
  currentUser = null;
  isAdmin = false;
  updateUIForAuth();
}

// FIXED: Remove async operations from onAuthStateChange
db.auth.onAuthStateChange((event, session) => {
  console.log('Auth state changed:', event, session);
  
  // Just update the current user reference, don't make async calls here
  if (event === 'SIGNED_IN') {
    currentUser = session?.user || null;
    // Don't call checkAdminStatus() here - it causes the deadlock!
  } else if (event === 'SIGNED_OUT') {
    currentUser = null;
    isAdmin = false;
  } else if (event === 'USER_UPDATED') {
    currentUser = session?.user || null;
  }
  
  // Just dispatch the event, let the UI handle admin check if needed
  updateUIForAuth();
});


async function signIn(email, password) {
  console.log('signIn called with:', email); // DEBUG
  
  const { data, error } = await db.auth.signInWithPassword({
    email,
    password
  });
  
  console.log('Supabase response:', { data, error }); // DEBUG
  
  if (error) {
    console.error('Supabase auth error:', error);
    throw error;
  }
  
  currentUser = data.user;
  console.log('Current user set:', currentUser); // DEBUG
  
  await checkAdminStatus();
  updateUIForAuth();
  return data;
}