/**
 * SONY STORE - Auth State & Profile Rendering
 * Single source of truth for authentication UI.
 * Relies on Supabase PKCE flow (default) — session is in localStorage, not URL hash.
 */

function renderUserProfile(user) {
  if (!user) return;
  const meta = user.user_metadata || {};
  const nameEl = document.getElementById('user-name');
  const emailEl = document.getElementById('user-email');
  const avatarEl = document.getElementById('user-avatar');

  if (nameEl) nameEl.innerText = meta.full_name || meta.name || user.email || 'User';
  if (emailEl) emailEl.innerText = user.email || '';
  if (avatarEl) avatarEl.src = meta.avatar_url || meta.picture || 'https://via.placeholder.com/150';
}

async function upsertUserProfile(user) {
  try {
    const meta = user.user_metadata || {};
    const { error } = await supabaseClient.from('profiles').upsert({
      id: user.id,
      full_name: meta.full_name || meta.name || user.email || 'User',
      email: user.email || '',
      avatar_url: meta.avatar_url || meta.picture || '',
      updated_at: new Date()
    });
    if (error) console.error('[AUTH TRACE] profile upsert error:', error.message);
  } catch (e) {
    console.error('[AUTH TRACE] profile upsert exception:', e.message);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname.toLowerCase();
  const isProfilePage = path.includes('profile');
  const isLoginPage = path.includes('login');

  const createProfileView = document.getElementById('create-profile-view');
  const userDashboardView = document.getElementById('user-dashboard-view');
  const authBtn = document.getElementById('nav-auth-btn');

  console.log('[AUTH TRACE] URL:', window.location.href);

  if (typeof supabaseClient === 'undefined' || !supabaseClient || !supabaseClient.auth) {
    console.warn('[AUTH TRACE] supabaseClient not available yet.');
    return;
  }

  console.log('[AUTH TRACE] client initialized');

  // --- UI update: called whenever auth state is definitively known ---
  function showProfile(user) {
    console.log('[AUTH TRACE] showProfile');
    if (authBtn) { authBtn.innerText = 'PROFILE'; authBtn.href = 'profile.html'; }
    if (isProfilePage && createProfileView && userDashboardView) {
      createProfileView.style.display = 'none';
      userDashboardView.style.display = 'block';
      renderUserProfile(user);
    }
  }

  function showLogin() {
    console.log('[AUTH TRACE] showLogin');
    if (authBtn) { authBtn.innerText = 'LOGIN'; authBtn.href = 'login.html'; }
    if (isProfilePage && createProfileView && userDashboardView) {
      userDashboardView.style.display = 'none';
      createProfileView.style.display = 'block';
    }
  }

  // --- Single auth state listener ---
  supabaseClient.auth.onAuthStateChange((event, session) => {
    console.log('[AUTH TRACE] event:', event);
    console.log('[AUTH TRACE] session exists:', !!session);
    if (session && session.user) {
      console.log('[AUTH TRACE] user:', session.user.email);
    }

    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
      if (session && session.user) {
        showProfile(session.user);
        upsertUserProfile(session.user);
        // Redirect from login page to profile after successful sign-in
        if (isLoginPage) {
          console.log('[AUTH TRACE] redirect (login → profile)');
          window.location.href = '/profile';
        }
      }
    } else if (event === 'INITIAL_SESSION') {
      if (session && session.user) {
        showProfile(session.user);
        upsertUserProfile(session.user);
        if (isLoginPage) {
          console.log('[AUTH TRACE] redirect (login → profile)');
          window.location.href = '/profile';
        }
      } else {
        // No session after init — redirect profile page to login
        showLogin();
        if (isProfilePage) {
          console.log('[AUTH TRACE] redirect (no session → login)');
          window.location.href = '/login';
        }
      }
    } else if (event === 'SIGNED_OUT') {
      showLogin();
      if (isProfilePage) {
        console.log('[AUTH TRACE] redirect (signed out → login)');
        window.location.href = '/login';
      }
    }
  });

  // --- Google OAuth button ---
  const googleLoginBtn = document.getElementById('google-login-btn') || document.getElementById('google-login-btn-profile');
  if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      console.log('[AUTH TRACE] Google sign-in clicked');
      try {
        const { error } = await supabaseClient.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: window.location.origin + '/profile' }
        });
        if (error) alert('Login error: ' + error.message);
      } catch (err) {
        console.error('[AUTH TRACE] Google sign-in exception:', err.message);
        alert('Login exception: ' + err.message);
      }
    });
  }

  // --- Logout buttons ---
  document.querySelectorAll('#logout-btn, .btn-logout').forEach(btn => {
    btn.addEventListener('click', async () => {
      console.log('[AUTH TRACE] Sign out clicked');
      await supabaseClient.auth.signOut();
    });
  });
});

// Exposed for login.html inline script
window.loginWithSupabaseEmail = async function(email, password) {
  if (typeof supabaseClient !== 'undefined' && supabaseClient && supabaseClient.auth) {
    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data && data.user) return { success: true, user: data.user };
    } catch (e) {
      return { success: false, error: e };
    }
  }
  return { success: false, error: new Error('Supabase client not initialized.') };
};
