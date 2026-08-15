/**
 * SONY STORE - Customer Authentication & Bulletproof Session Guard Engine
 * 
 * Flow:
 * 1. initAuth() runs on DOMContentLoaded and onAuthStateChange.
 * 2. Cleans access_token hash from address bar without infinite re-renders.
 * 3. Sets nav-auth-btn text to "PROFILE".
 * 4. Unauthenticated: Clicking nav-auth-btn initiates Supabase Google OAuth.
 * 5. Authenticated: Clicking nav-auth-btn opens profile.html (if not already on profile.html).
 * 6. loadUserProfile(user) populates user-avatar, user-name, user-email.
 * 7. Logout button clears session and redirects to index.html.
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

// BULLETPROOF SESSION GUARD
async function initAuth() {
    try {
        // Clean access_token from hash bar
        if (window.location.hash.includes('access_token') || window.location.hash.includes('refresh_token') || window.location.search.includes('code=')) {
            if (window.history && window.history.replaceState) {
                window.history.replaceState(null, '', window.location.pathname);
            }
        }

        let client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : (typeof supabase !== 'undefined' ? supabase : window.supabaseClient);

        let session = null;
        if (client && client.auth) {
            try {
                const { data } = await client.auth.getSession();
                session = data?.session || null;
            } catch (e) {}
        }

        const cachedUser = getCachedUser();
        const currentUser = session?.user || cachedUser;
        const isProfilePage = window.location.pathname.toLowerCase().includes('profile.html') || window.location.pathname.toLowerCase().endsWith('/profile');
        const authBtn = document.getElementById('nav-auth-btn') || document.getElementById('nav-login-link');

        if (session || currentUser) {
            setCachedUser(currentUser);
            // USER LOGGED IN
            if (authBtn) {
                authBtn.innerText = 'PROFILE';
                authBtn.href = 'profile.html';
                authBtn.style.visibility = 'visible';
            }
            // Update profile details dynamically if on profile page
            if (isProfilePage) {
                loadUserProfile(currentUser);
            }
        } else {
            // USER NOT LOGGED IN
            if (authBtn) {
                authBtn.innerText = 'PROFILE';
                authBtn.href = 'javascript:void(0);';
                authBtn.style.visibility = 'visible';
            }
            // Redirect away from profile page if unauthenticated
            if (isProfilePage) {
                window.location.href = 'index.html';
            }
        }
    } catch (err) {
        console.error('[AUTH] initAuth error:', err);
    }
}

// DYNAMIC PROFILE HYDRATION LOGIC
function loadUserProfile(user) {
    if (!user) return;

    const avatarEl = document.getElementById('user-avatar');
    const nameEl = document.getElementById('user-name');
    const emailEl = document.getElementById('user-email');
    const avatarFallback = document.getElementById('avatarFallback');

    const fullName = user.user_metadata?.full_name || user.user_metadata?.name || 'User';
    const email = user.email || user.user_metadata?.email || '';
    const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || 'https://via.placeholder.com/150';

    if (nameEl) nameEl.innerText = fullName;
    if (emailEl) emailEl.innerText = email;
    if (avatarEl) {
        avatarEl.src = avatarUrl;
        avatarEl.style.display = 'block';
        if (avatarFallback) avatarFallback.style.display = 'none';
    }

    // Fallbacks
    const userNameHeading = document.getElementById('userNameHeading');
    const userEmailPara = document.getElementById('userEmailPara');
    const userAvatarImg = document.getElementById('userAvatarImg');

    if (userNameHeading) userNameHeading.innerText = fullName;
    if (userEmailPara) userEmailPara.innerText = email;
    if (userAvatarImg) {
        userAvatarImg.src = avatarUrl;
        userAvatarImg.style.display = 'block';
    }
}

// Global Aliases
window.initAuth = initAuth;
window.loadUserProfile = loadUserProfile;
window.syncAuthSystem = initAuth;
window.syncNavbarAndRoute = initAuth;

// CLICK EVENT & INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
    initAuth();

    const authBtn = document.getElementById('nav-auth-btn') || document.getElementById('nav-login-link');
    if (authBtn) {
        authBtn.addEventListener('click', async (e) => {
            let client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : (typeof supabase !== 'undefined' ? supabase : window.supabaseClient);

            let session = null;
            if (client && client.auth) {
                try {
                    const { data } = await client.auth.getSession();
                    session = data?.session || null;
                } catch (err) {}
            }

            const cachedUser = getCachedUser();
            const currentUser = session?.user || cachedUser;

            if (!session && !currentUser) {
                e.preventDefault();
                console.log('[AUTH] Initiating Google OAuth...');
                if (client && client.auth) {
                    await client.auth.signInWithOAuth({
                        provider: 'google',
                        options: { redirectTo: window.location.origin + '/profile.html' }
                    });
                }
            } else {
                if (!window.location.pathname.toLowerCase().includes('profile.html')) {
                    window.location.href = 'profile.html';
                }
            }
        });
    }

    const logoutBtn = document.getElementById('logout-btn') || document.getElementById('signOutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            console.log('[AUTH] Logging out...');
            setCachedUser(null);

            let client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : (typeof supabase !== 'undefined' ? supabase : window.supabaseClient);

            if (client && client.auth) {
                try {
                    await client.auth.signOut();
                } catch (err) {}
            }

            window.location.href = 'index.html';
        });
    }
});

// LISTEN FOR AUTH CHANGES WITHOUT RE-RENDERING LOOPS
let client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : (typeof supabase !== 'undefined' ? supabase : window.supabaseClient);

if (client && client.auth) {
    client.auth.onAuthStateChange((event, session) => {
        console.log('[AUTH] onAuthStateChange event:', event);

        if (session?.user) {
            setCachedUser(session.user);
        } else if (event === 'SIGNED_OUT') {
            setCachedUser(null);
        }

        initAuth();
    });
}
