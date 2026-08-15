/**
 * SONY STORE - Customer Authentication & Async-Protected Auth Guard Engine
 * 
 * Features:
 * 1. Awaits getSession() FIRST on DOMContentLoaded before running any route guard.
 * 2. Hydrates profile user data (name, email, avatar) on profile.html smoothly without flashing/kickback.
 * 3. Registers onAuthStateChange ONLY for SIGNED_OUT or active profile updates.
 * 4. Nav button click: triggers Google OAuth if logged out, or opens profile.html if logged in.
 * 5. Logout button calls supabase.auth.signOut() and redirects to index.html.
 */

// Local memory state helpers
function getCachedUser() {
    try {
        const stored = JSON.parse(localStorage.getItem('sony_store_user'));
        if (stored && stored.loggedIn) return stored;
    } catch (e) {}
    return null;
}

function setCachedUser(user) {
    if (!user) {
        localStorage.removeItem('sony_store_user');
        return;
    }
    const userData = {
        id: user.id || null,
        name: user.user_metadata?.full_name || user.user_metadata?.name || user.name || (user.email ? user.email.split('@')[0] : 'Valued Client'),
        email: user.email || user.user_metadata?.email || '',
        avatar: user.user_metadata?.avatar_url || user.user_metadata?.picture || user.avatar || '',
        loggedIn: true,
        loginTime: new Date().toISOString()
    };
    localStorage.setItem('sony_store_user', JSON.stringify(userData));
}

// Global function to update UI elements with Google User Data
function populateUserProfile(user) {
    if (!user) return;
    const nameEl = document.getElementById('user-name');
    const emailEl = document.getElementById('user-email');
    const avatarEl = document.getElementById('user-avatar');
    const avatarFallback = document.getElementById('avatarFallback');

    const fullName = user.user_metadata?.full_name || user.user_metadata?.name || user.name || 'User';
    const email = user.email || user.user_metadata?.email || '';
    const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || user.avatar || '';

    if (nameEl) nameEl.innerText = fullName;
    if (emailEl) emailEl.innerText = email;
    if (avatarEl) {
        if (avatarUrl) {
            avatarEl.src = avatarUrl;
            avatarEl.style.display = 'block';
            if (avatarFallback) avatarFallback.style.display = 'none';
        }
    }

    // Secondary fallback DOM elements for backwards compatibility
    const userNameHeading = document.getElementById('userNameHeading');
    const userEmailPara = document.getElementById('userEmailPara');
    const userAvatarImg = document.getElementById('userAvatarImg');

    if (userNameHeading) userNameHeading.innerText = fullName;
    if (userEmailPara) userEmailPara.innerText = email;
    if (userAvatarImg && avatarUrl) {
        userAvatarImg.src = avatarUrl;
        userAvatarImg.style.display = 'block';
    }
}

// Global Aliases
window.populateUserProfile = populateUserProfile;
window.loadUserProfile = populateUserProfile;
window.populateProfileData = populateUserProfile;

// Async-Protected Auth Guard
document.addEventListener('DOMContentLoaded', async () => {
    // Clean hash token from URL bar if returning from OAuth
    if (window.location.hash.includes('access_token') || window.location.hash.includes('refresh_token') || window.location.search.includes('code=')) {
        if (window.history && window.history.replaceState) {
            window.history.replaceState(null, '', window.location.pathname);
        }
    }

    const currentPath = window.location.pathname.toLowerCase();
    const isProfilePage = currentPath.includes('profile.html') || currentPath.endsWith('/profile');
    const authBtn = document.getElementById('nav-auth-btn') || document.getElementById('nav-login-link');

    let client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : (typeof supabase !== 'undefined' ? supabase : window.supabaseClient);

    // Initial instant cache check to prevent FOUC / flicker
    const cachedUser = getCachedUser();
    if (cachedUser) {
        if (authBtn) authBtn.innerText = 'PROFILE';
        if (isProfilePage) populateUserProfile(cachedUser);
    }

    // Wait for initial session fetch before doing any redirect guard
    let session = null;
    if (client && client.auth) {
        try {
            const { data } = await client.auth.getSession();
            session = data?.session || null;
        } catch (e) {}
    }

    const activeUser = session?.user || cachedUser;

    if (activeUser) {
        // Authenticated User
        setCachedUser(activeUser);
        if (authBtn) authBtn.innerText = 'PROFILE';
        if (isProfilePage) {
            populateUserProfile(activeUser);
        }
    } else {
        // Unauthenticated User
        if (authBtn) authBtn.innerText = 'PROFILE';
        if (isProfilePage) {
            setCachedUser(null);
            window.location.href = 'index.html';
            return;
        }
    }

    // Listen for Auth Changes (Sign In / Sign Out)
    if (client && client.auth) {
        client.auth.onAuthStateChange((event, currentSession) => {
            console.log('[AUTH] onAuthStateChange event:', event);
            if (event === 'SIGNED_OUT' && isProfilePage) {
                setCachedUser(null);
                window.location.href = 'index.html';
            } else if (currentSession && currentSession.user) {
                setCachedUser(currentSession.user);
                if (authBtn) authBtn.innerText = 'PROFILE';
                if (isProfilePage) {
                    populateUserProfile(currentSession.user);
                }
            }
        });
    }

    // Nav Profile Button Click Guard
    if (authBtn) {
        authBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            let currentClient = typeof getSupabaseClient === 'function' ? getSupabaseClient() : (typeof supabase !== 'undefined' ? supabase : window.supabaseClient);

            let activeSession = null;
            if (currentClient && currentClient.auth) {
                try {
                    const { data } = await currentClient.auth.getSession();
                    activeSession = data?.session || null;
                } catch (e) {}
            }

            const currentUser = activeSession?.user || getCachedUser();

            if (!activeSession && !currentUser) {
                if (currentClient && currentClient.auth) {
                    await currentClient.auth.signInWithOAuth({
                        provider: 'google',
                        options: { redirectTo: window.location.origin + '/profile.html' }
                    });
                }
            } else if (!isProfilePage) {
                window.location.href = 'profile.html';
            }
        });
    }

    // Logout Button
    const logoutBtn = document.getElementById('logout-btn') || document.getElementById('signOutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            console.log('[AUTH] Logging out user...');
            setCachedUser(null);

            let currentClient = typeof getSupabaseClient === 'function' ? getSupabaseClient() : (typeof supabase !== 'undefined' ? supabase : window.supabaseClient);
            if (currentClient && currentClient.auth) {
                try {
                    await currentClient.auth.signOut();
                } catch (err) {}
            }

            window.location.href = 'index.html';
        });
    }
});
