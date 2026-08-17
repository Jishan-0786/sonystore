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
  const authBtn = document.getElementById('nav-auth-btn');

  if (window.location.hash.includes('access_token')) {
    window.history.replaceState(null, '', window.location.pathname);
  }

  const { data: { session } } = await supabase.auth.getSession();

  if (session && session.user) {
    if (authBtn) authBtn.innerText = 'PROFILE';
    if (isProfilePage) {
      renderUserProfile(session.user);
    }
  } else {
    if (authBtn) authBtn.innerText = 'PROFILE';
    if (isProfilePage) {
      window.location.href = '/index.html';
      return;
    }
  }

  if (authBtn) {
    authBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      const { data: { session: activeSession } } = await supabase.auth.getSession();
      if (!activeSession) {
        await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: 'https://sonystore.pages.dev/auth/profile.html' }
        });
      } else {
        if (!isProfilePage) {
          window.location.href = '/auth/profile.html';
        }
      }
    });
  }

  document.getElementById('logout-btn')?.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = '/index.html';
  });
});