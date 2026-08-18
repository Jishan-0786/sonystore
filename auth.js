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
  const isProfilePage = window.location.pathname.endsWith('/profile.html') || window.location.pathname.endsWith('/profile');
  const createProfileView = document.getElementById('create-profile-view');
  const userDashboardView = document.getElementById('user-dashboard-view');
  const googleLoginBtnProfile = document.getElementById('google-login-btn-profile');

  console.log('[PROFILE AUTH] initializing');

  if (typeof supabaseClient === 'undefined' || !supabaseClient.auth) {
      console.warn("Supabase client not found.");
      return;
  }

  // Use the existing Supabase client to get the completely resolved session
  const { data: { session }, error } = await supabaseClient.auth.getSession();
  
  console.log('[PROFILE AUTH] session:', !!session);
  console.log('[PROFILE AUTH] user:', session?.user?.email);

  function updateUI(currentSession) {
      if (currentSession && currentSession.user) {
          if (isProfilePage && createProfileView && userDashboardView) {
              createProfileView.style.display = 'none';
              userDashboardView.style.display = 'block';
              renderUserProfile(currentSession.user);
          }
      }
  }

  // Handle the initial state NOW
  if (session && session.user) {
      updateUI(session);
      upsertUserProfile(session.user);
      
      if (window.location.pathname.includes('/login')) {
          window.location.href = '/profile';
      }
  } else {
      if (isProfilePage) {
          console.log('[PROFILE AUTH] redirecting to login');
          window.location.href = '/login';
          return;
      }
  }

  // Setup onAuthStateChange for future dynamic changes
  supabaseClient.auth.onAuthStateChange((event, currentSession) => {
      // Ignore INITIAL_SESSION because we already awaited getSession()
      if (event === 'INITIAL_SESSION') return;
      
      if (event === 'SIGNED_IN' && currentSession && currentSession.user) {
          updateUI(currentSession);
          upsertUserProfile(currentSession.user);
          
          if (window.location.pathname.includes('/login')) {
              window.location.href = '/profile';
          }
      } else if (event === 'SIGNED_OUT') {
          if (isProfilePage) {
              console.log('[PROFILE AUTH] redirecting to login');
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

