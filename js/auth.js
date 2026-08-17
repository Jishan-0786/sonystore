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
    const { error } = await supabase.from('profiles').upsert({
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
  if (window.location.hash.includes('access_token')) {
    window.history.replaceState(null, '', window.location.pathname);
  }

  const createProfileView = document.getElementById('create-profile-view');
  const userDashboardView = document.getElementById('user-dashboard-view');
  const googleLoginBtnProfile = document.getElementById('google-login-btn-profile');

  // Initial Session Check
  const { data: { session } } = await supabase.auth.getSession();

  function updateUI(currentSession) {
      if (currentSession && currentSession.user) {
          if (isProfilePage && createProfileView && userDashboardView) {
              createProfileView.style.display = 'none';
              userDashboardView.style.display = 'block';
              renderUserProfile(currentSession.user);
          }
      } else {
          if (isProfilePage && createProfileView && userDashboardView) {
              createProfileView.style.display = 'block';
              userDashboardView.style.display = 'none';
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
  supabase.auth.onAuthStateChange((event, currentSession) => {
      updateUI(currentSession);
      if (event === 'SIGNED_IN' && currentSession && currentSession.user) {
          upsertUserProfile(currentSession.user);
      }
  });

  // Google OAuth Login
  if (googleLoginBtnProfile) {
      googleLoginBtnProfile.addEventListener('click', async (e) => {
          e.preventDefault();
          await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.origin + '/profile.html' }
          });
      });
  }

  // Handle Logout
  const logoutBtns = document.querySelectorAll('#logout-btn, .btn-logout');
  logoutBtns.forEach(btn => {
      btn.addEventListener('click', async () => {
        await supabase.auth.signOut();
        // UI is cleared and updated by onAuthStateChange automatically!
      });
  });
});