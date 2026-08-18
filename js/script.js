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
  
  // Clean hash token
  let justCompletedOAuth = false;
  if (window.location.hash.includes('access_token')) {
    window.history.replaceState(null, '', window.location.pathname);
    justCompletedOAuth = true;
  }

  const createProfileView = document.getElementById('create-profile-view');
  const userDashboardView = document.getElementById('user-dashboard-view');
  const googleLoginBtnProfile = document.getElementById('google-login-btn-profile');

  // Initial Session Check with Timeout Fallback
  let session = null;
  try {
      const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve({ data: { session: null } }), 3000));
      const result = await Promise.race([
          supabaseClient.auth.getSession(),
          timeoutPromise
      ]);
      session = result.data.session;
  } catch (e) {
      console.warn("Supabase auth check failed or timed out. Falling back to logged-out state.", e);
      session = null;
  }

  console.log('[LOGIN] Session:', !!session);
  console.log('[LOGIN] User:', session?.user?.email);

  // Redirect authenticated users away from Login page
  if (window.location.pathname.includes('/login')) {
      if (session?.user) {
          window.location.href = '/profile';
      }
  }

  // Handle OAuth callback redirect
  if (window.location.hash.includes('access_token') || window.location.search.includes('access_token') || justCompletedOAuth) {
      if (session?.user && !isProfilePage) {
          window.location.href = '/profile';
      }
  }

  // Protect Profile page from unauthenticated users
  if (isProfilePage && (!session || !session.user)) {
      window.location.href = '/login';
      return;
  }

  function updateUI(currentSession) {
      if (currentSession && currentSession.user) {
          if (isProfilePage && createProfileView && userDashboardView) {
              createProfileView.style.display = 'none';
              userDashboardView.style.display = 'block';
              renderUserProfile(currentSession.user);
          }
      } else {
          if (isProfilePage) {
              window.location.href = '/login';
          }
      }
  }

  // Initial update
  updateUI(session);

  // If user just logged in, upsert profile
  if (session && session.user) {
      upsertUserProfile(session.user);
  }

  // Listen for auth state changes
  if (typeof supabaseClient !== 'undefined' && supabaseClient.auth) {
      supabaseClient.auth.onAuthStateChange((event, currentSession) => {
          updateUI(currentSession);
          if (event === 'SIGNED_IN' && currentSession && currentSession.user) {
              upsertUserProfile(currentSession.user);
          }
      });
  }

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
              console.log("[GOOGLE AUTH RESULT]", { data, error });
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
        // UI is cleared and updated by onAuthStateChange automatically!
      });
  });
});