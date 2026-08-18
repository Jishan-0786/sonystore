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
    if (error) {
        console.error("Error upserting profile:", error);
    }
  } catch (e) {
    console.error("Exception during profile upsert:", e);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const isProfilePage = window.location.pathname.toLowerCase().includes('profile');
  const createProfileView = document.getElementById('create-profile-view');
  const userDashboardView = document.getElementById('user-dashboard-view');
  const authBtn = document.getElementById('nav-auth-btn');

  console.log('[AUTH TRACE] URL:', window.location.href);
  console.log('[AUTH TRACE] client initialized');

  if (typeof supabaseClient === 'undefined' || !supabaseClient.auth) {
      console.warn("[AUTH TRACE] Supabase client not found.");
      return;
  }

  function updateUI(currentSession) {
      if (currentSession && currentSession.user) {
          if (authBtn) {
              authBtn.innerText = "PROFILE";
              authBtn.href = "profile.html";
          }
          if (isProfilePage && createProfileView && userDashboardView) {
              console.log("[AUTH TRACE] showProfile");
              createProfileView.style.display = 'none';
              userDashboardView.style.display = 'block';
              renderUserProfile(currentSession.user);
          }
      } else {
          if (authBtn) {
              authBtn.innerText = "LOGIN";
              authBtn.href = "login.html";
          }
          if (isProfilePage && createProfileView && userDashboardView) {
              console.log("[AUTH TRACE] showLogin (hiding dashboard)");
              userDashboardView.style.display = 'none';
              createProfileView.style.display = 'block';
          }
      }
  }

  let authInitialized = false;
  let hasAuthenticated = false;

  supabaseClient.auth.onAuthStateChange(async (event, currentSession) => {
      console.log(`[AUTH TRACE] event: ${event}`);
      
      let sessionToUse = currentSession;
      
      if (event === 'INITIAL_SESSION') {
          authInitialized = true;
          try {
              const { data: { session }, error } = await supabaseClient.auth.getSession();
              console.log("[AUTH TRACE] getSession");
              if (error) console.error("[AUTH TRACE] getSession error:", error);
              if (session) {
                  sessionToUse = session;
              }
          } catch (e) {
              console.error("[AUTH TRACE] getSession exception:", e);
          }
      }
      
      const sessionExists = !!(sessionToUse && sessionToUse.user);
      console.log(`[AUTH TRACE] session exists: ${sessionExists}`);

      if (sessionExists) {
          hasAuthenticated = true;
          updateUI(sessionToUse);
          upsertUserProfile(sessionToUse.user);
          
          if (window.location.pathname.toLowerCase().includes('login')) {
              console.log("[AUTH TRACE] redirect (from login to profile)");
              window.location.href = '/profile';
          }
          
          if (window.location.hash.includes('access_token')) {
              window.history.replaceState(null, '', window.location.pathname + window.location.search);
          }
      } else {
          // No session
          if (event === 'SIGNED_OUT') {
              hasAuthenticated = false;
              if (isProfilePage) {
                  console.log("[AUTH TRACE] redirect (signed out)");
                  window.location.href = '/login';
              } else {
                  updateUI(null);
              }
          } else if (event === 'INITIAL_SESSION' && !hasAuthenticated) {
              // Wait if there's an oauth token in the URL being processed
              if (window.location.hash.includes('access_token')) {
                  console.log("[AUTH TRACE] Waiting for OAuth parsing...");
              } else if (isProfilePage) {
                  console.log("[AUTH TRACE] redirect (no session on init)");
                  window.location.href = '/login';
              } else {
                  updateUI(null);
              }
          } else if (!hasAuthenticated) {
               updateUI(null);
          }
      }
  });

  // Google OAuth Login
  const googleLoginBtn = document.getElementById('google-login-btn') || document.getElementById('google-login-btn-profile');
  if (googleLoginBtn) {
      googleLoginBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          console.log("GOOGLE SIGN IN CLICKED");
          try {
              const { data, error } = await supabaseClient.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: window.location.origin + '/profile' }
              });
              if (error) {
                  alert("Login error: " + error.message);
              }
          } catch (err) {
              console.error(err);
              alert("Login exception: " + err.message);
          }
      });
  }

  // Handle Logout
  const logoutBtns = document.querySelectorAll('#logout-btn, .btn-logout');
  logoutBtns.forEach(btn => {
      btn.addEventListener('click', async () => {
        await supabaseClient.auth.signOut();
      });
  });
});

window.loginWithSupabaseEmail = async function(email, password) {
    if (typeof supabaseClient !== 'undefined' && supabaseClient.auth) {
        try {
            const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
            if (error) throw error;
            if (data && data.user) {
                return { success: true, user: data.user };
            }
        } catch (e) {
            return { success: false, error: e };
        }
    }
    return { success: false, error: new Error('Supabase client not initialized.') };
}
