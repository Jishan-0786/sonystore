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

document.addEventListener('DOMContentLoaded', async () => {
  const isProfilePage = window.location.pathname.includes('auth/profile.html');
  const isIndexPage = window.location.pathname === '/' || window.location.pathname.includes('index.html');
  const authBtn = document.getElementById('nav-auth-btn');

  const loggedInView = document.getElementById('auth-logged-in');
  const loggedOutView = document.getElementById('auth-logged-out');
  const googleLoginBtnProfile = document.getElementById('google-login-btn-profile');

  // Handle URL Hash clean-up
  if (window.location.hash.includes('access_token')) {
    window.history.replaceState(null, '', window.location.pathname);
  }

  const { data: { session } } = await supabase.auth.getSession();

  if (session && session.user) {
    if (authBtn) authBtn.innerText = 'PROFILE';
    if (isProfilePage) {
      renderUserProfile(session.user);
    }
    
    // In-page profile section toggling for index.html
    if (loggedInView && loggedOutView) {
      loggedInView.style.display = 'block';
      loggedOutView.style.display = 'none';
      renderUserProfile(session.user);
    }
  } else {
    if (authBtn) authBtn.innerText = 'PROFILE';
    if (isProfilePage) {
      window.location.href = '/index.html';
      return;
    }

    // In-page profile section toggling for index.html
    if (loggedInView && loggedOutView) {
      loggedInView.style.display = 'none';
      loggedOutView.style.display = 'block';
    }
  }

  // Auth Nav Click
  if (authBtn) {
    authBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      const { data: { session: activeSession } } = await supabase.auth.getSession();
      if (!activeSession) {
        await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: 'https://sonystore.pages.dev/index.html' }
        });
      } else {
        // If they click PROFILE on nav and are already logged in, scroll to profile section if on index, else go to index
        if (isIndexPage) {
            const profileSection = document.getElementById('profile-section');
            if (profileSection) profileSection.scrollIntoView({ behavior: 'smooth' });
        } else {
            window.location.href = '/index.html#profile-section';
        }
      }
    });
  }

  // Google Login Button inside Profile Section
  if (googleLoginBtnProfile) {
      googleLoginBtnProfile.addEventListener('click', async (e) => {
          e.preventDefault();
          await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: 'https://sonystore.pages.dev/index.html' }
          });
      });
  }

  // Logout Event (handles both in-page and auth/profile.html buttons)
  const logoutBtns = document.querySelectorAll('#logout-btn, .btn-logout');
  logoutBtns.forEach(btn => {
      btn.addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.href = '/index.html';
      });
  });
});