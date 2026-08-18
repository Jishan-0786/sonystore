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

  console.log('[PROFILE] Supabase initializing');

  if (typeof supabaseClient === 'undefined' || !supabaseClient.auth) {
      console.warn("Supabase client not found.");
      return;
  }

  function updateUI(currentSession) {
      if (currentSession && currentSession.user) {
          if (isProfilePage && createProfileView && userDashboardView) {
              console.log("[PROFILE] rendering profile");
              createProfileView.style.display = 'none';
              userDashboardView.style.display = 'block';
              renderUserProfile(currentSession.user);
          }
      }
  }

  let authInitialized = false;

  supabaseClient.auth.onAuthStateChange(async (event, currentSession) => {
      console.log("[AUTH EVENT]", event);
      
      // We will rely on currentSession or a freshly fetched one.
      let sessionToUse = currentSession;
      
      if (event === 'INITIAL_SESSION') {
          authInitialized = true;
          console.log('[PROFILE] Auth initialization complete');
          
          // Call getSession() to get the most up-to-date session
          const { data: { session } } = await supabaseClient.auth.getSession();
          if (session) {
              sessionToUse = session;
          }
      }
      
      console.log("[AUTH SESSION]", !!sessionToUse);

      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          if (sessionToUse && sessionToUse.user) {
              console.log("[PROFILE] SHOW");
              updateUI(sessionToUse);
              upsertUserProfile(sessionToUse.user);
              
              if (window.location.pathname.includes('login')) {
                  window.location.href = '/profile';
              }
              
              // Clean URL hash without reloading the page if it contains access_token
              if (window.location.hash.includes('access_token')) {
                  window.history.replaceState(null, '', window.location.pathname + window.location.search);
              }
          } else if (event === 'INITIAL_SESSION') {
              // If session is null during INITIAL_SESSION, we only redirect if there's NO access_token in the URL.
              // If there is an access_token, we must wait for the SIGNED_IN event.
              if (isProfilePage && !window.location.hash.includes('access_token')) {
                  console.log("[PROFILE] HIDE/REDIRECT");
                  console.log('[PROFILE AUTH] redirecting to login (no session & no oauth hash)');
                  window.location.href = '/login';
              } else if (isProfilePage && window.location.hash.includes('access_token')) {
                  console.log("[PROFILE] Waiting for OAuth SIGNED_IN event...");
              }
          }
      } else if (event === 'SIGNED_OUT') {
          if (isProfilePage) {
              console.log("[PROFILE] HIDE/REDIRECT");
              console.log('[PROFILE AUTH] redirecting to login due to SIGNED_OUT');
              window.location.href = '/login';
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
