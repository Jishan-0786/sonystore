function renderUserData(user) {
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
  const isProfilePage = window.location.pathname.includes('profile.html');
  const authBtn = document.getElementById('nav-auth-btn');

  // Smooth fade-in guard to prevent 1-second flicker
  if (isProfilePage) {
    document.body.style.transition = 'opacity 0.2s ease-in-out';
    document.body.style.opacity = '0';
  }

  // Clean access_token hash from URL without reloading page
  if (window.location.hash.includes('access_token')) {
    window.history.replaceState(null, '', window.location.pathname);
  }

  // Retrieve authenticated session
  const { data: { session } } = await window.supabase.auth.getSession();

  if (session && session.user) {
    // --- USER IS LOGGED IN ---
    if (authBtn) authBtn.innerText = 'PROFILE';

    if (isProfilePage) {
      renderUserData(session.user);
      document.body.style.opacity = '1';
    }
  } else {
    // --- USER IS NOT LOGGED IN ---
    if (authBtn) authBtn.innerText = 'LOGIN';

    if (isProfilePage) {
      // Redirect ONLY if genuinely unauthenticated
      window.location.href = '/index.html';
      return;
    }
  }

  // Handle Auth Button Clicks
  if (authBtn) {
    authBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      const { data: { session: currentSession } } = await window.supabase.auth.getSession();

      if (!currentSession) {
        // Not logged in -> OAuth Trigger
        await window.supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: 'https://sonystore.pages.dev/profile.html' }
        });
      } else {
        // Already logged in -> Direct to Profile
        if (!isProfilePage) {
          window.location.href = '/profile.html';
        }
      }
    });
  }

  // Handle Sign Out Button
  document.getElementById('logout-btn')?.addEventListener('click', async () => {
    await window.supabase.auth.signOut();
    window.location.href = '/index.html';
  });
});