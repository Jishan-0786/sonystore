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
  const isProfilePage = window.location.pathname.includes('profile');
  const createProfileView = document.getElementById('create-profile-view');
  const userDashboardView = document.getElementById('user-dashboard-view');
  const authBtn = document.getElementById('nav-auth-btn');

  console.log('[AUTH DEBUG] URL:', window.location.href);
  console.log('[AUTH DEBUG] Supabase client initialized');

  if (typeof supabaseClient === 'undefined' || !supabaseClient.auth) {
      console.warn("Supabase client not found.");
      return;
  }

  function updateUI(currentSession) {
      if (currentSession && currentSession.user) {
          if (authBtn) {
              authBtn.innerText = "PROFILE";
              authBtn.href = "profile.html";
          }
          if (isProfilePage && createProfileView && userDashboardView) {
              console.log("[PROFILE] SHOW");
              createProfileView.style.display = 'none';
              userDashboardView.style.display = 'block';
              renderUserProfile(currentSession.user);
          }
      } else {
          if (authBtn) {
              authBtn.innerText = "LOGIN";
              authBtn.href = "login.html";
          }
      }
  }

  let authInitialized = false;
  let hasAuthenticated = false; // Prevents race conditions from wiping out an active session

  supabaseClient.auth.onAuthStateChange(async (event, currentSession) => {
      console.log("[AUTH DEBUG] auth event:", event);
      
      let sessionToUse = currentSession;
      
      if (event === 'INITIAL_SESSION') {
          authInitialized = true;
          // Always try to fetch the most up-to-date session to avoid race conditions
          const { data: { session } } = await supabaseClient.auth.getSession();
          if (session) {
              sessionToUse = session;
          }
      }
      
      console.log("[AUTH DEBUG] getSession:", sessionToUse);
      console.log("[AUTH DEBUG] user:", sessionToUse?.user?.email);

      if (sessionToUse && sessionToUse.user) {
          hasAuthenticated = true;
          updateUI(sessionToUse);
          upsertUserProfile(sessionToUse.user);
          
          if (window.location.pathname.includes('login')) {
              window.location.href = '/profile';
          }
          
          // Clean URL hash without reloading the page if it contains access_token
          if (window.location.hash.includes('access_token')) {
              window.history.replaceState(null, '', window.location.pathname + window.location.search);
          }
      } else {
          // If we are definitely logged out
          if (event === 'SIGNED_OUT' || (event === 'INITIAL_SESSION' && !hasAuthenticated && !window.location.hash.includes('access_token'))) {
              if (isProfilePage) {
                  console.log("[PROFILE] HIDE/REDIRECT");
                  window.location.href = '/login';
              } else {
                  updateUI(null);
              }
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
