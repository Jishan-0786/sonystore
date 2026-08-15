/**
 * SONY STORE - Master Auth Guard & Profile Hydration Engine
 * 
 * Fixes 1-second redirect loop:
 * 1. Uses onAuthStateChange to wait for initial session resolution before making route decisions.
 * 2. ONLY redirects away from profile.html if event === 'SIGNED_OUT' or session resolves to null without cached user.
 * 3. populateUserProfile(user) populates Google user-name, user-email, user-avatar.
 * 4. Nav button click triggers Google OAuth when logged out, or opens profile.html when logged in.
 * 5. Logout button calls supabase.auth.signOut() and redirects to index.html.
 */

// Local memory helpers
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

    const fullName = user.user_metadata?.full_name || user.user_metadata?.name || 'User';
    const email = user.email || user.user_metadata?.email || '';
    const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || '';

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

// Master Auth Guard
document.addEventListener('DOMContentLoaded', async () => {
    // Clean hash token from URL address bar
    if (window.location.hash.includes('access_token') || window.location.hash.includes('refresh_token') || window.location.search.includes('code=')) {
        if (window.history && window.history.replaceState) {
            window.history.replaceState(null, '', window.location.pathname);
        }
    }

    const currentPath = window.location.pathname.toLowerCase();
    const isProfilePage = currentPath.includes('profile.html') || currentPath.endsWith('/profile');
    const authBtn = document.getElementById('nav-auth-btn') || document.getElementById('nav-login-link');

    let client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : (typeof supabase !== 'undefined' ? supabase : window.supabaseClient);

    // Initial local cache check to prevent FOUC / flicker
    const cachedUser = getCachedUser();
    if (cachedUser) {
        if (authBtn) {
            authBtn.innerText = 'PROFILE';
            authBtn.style.visibility = 'visible';
        }
        if (isProfilePage) {
            populateUserProfile(cachedUser);
        }
    }

    // Listen to Auth State Changes (Handles OAuth redirect & Hash automatically)
    if (client && client.auth) {
        client.auth.onAuthStateChange(async (event, session) => {
            console.log('[AUTH] onAuthStateChange event:', event, 'session:', session?.user?.email);

            if (session && session.user) {
                setCachedUser(session.user);

                // LOGGED IN
                if (authBtn) {
                    authBtn.innerText = 'PROFILE';
                    authBtn.style.visibility = 'visible';
                }

                if (isProfilePage) {
                    populateUserProfile(session.user);
                }
            } else {
                // LOGGED OUT
                if (authBtn) {
                    authBtn.innerText = 'PROFILE';
                    authBtn.style.visibility = 'visible';
                }

                const currentCache = getCachedUser();

                // ONLY redirect if on profile.html AND initial session check is complete / explicit SIGNED_OUT
                if (isProfilePage && (event === 'SIGNED_OUT' || !currentCache)) {
                    setCachedUser(null);
                    window.location.href = 'index.html';
                }
            }
        });

        // Perform initial session check
        try {
            const { data: { session } } = await client.auth.getSession();
            if (session?.user) {
                setCachedUser(session.user);
                if (authBtn) authBtn.innerText = 'PROFILE';
                if (isProfilePage) populateUserProfile(session.user);
            } else if (!cachedUser && isProfilePage && !window.location.hash.includes('access_token')) {
                window.location.href = 'index.html';
            }
        } catch (err) {}
    }

    // Nav Button Click Event
    if (authBtn) {
        authBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            let currentClient = typeof getSupabaseClient === 'function' ? getSupabaseClient() : (typeof supabase !== 'undefined' ? supabase : window.supabaseClient);

            let session = null;
            if (currentClient && currentClient.auth) {
                try {
                    const { data } = await currentClient.auth.getSession();
                    session = data?.session || null;
                } catch (e) {}
            }

            const activeUser = session?.user || getCachedUser();

            if (!session && !activeUser) {
                if (currentClient && currentClient.auth) {
                    await currentClient.auth.signInWithOAuth({
                        provider: 'google',
                        options: { redirectTo: window.location.origin + '/profile.html' }
                    });
                }
            } else {
                if (!isProfilePage) {
                    window.location.href = 'profile.html';
                }
            }
        });
    }

    // Logout Button Event Listener
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
