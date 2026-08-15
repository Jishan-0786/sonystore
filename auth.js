/**
 * SONY STORE - Customer Authentication & Session Lock Engine
 * 
 * Requirements:
 * 1. Checks active session before triggering Google OAuth.
 * 2. If logged in: Clicking #nav-auth-btn directly navigates to /profile.html without re-triggering Google OAuth.
 * 3. If not logged in: Clicking #nav-auth-btn triggers Supabase Google OAuth.
 * 4. Sign Out clears session via supabase.auth.signOut(), removes local cache, and redirects to /index.html.
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

// DYNAMIC PROFILE HYDRATION LOGIC
function loadUserProfile(user) {
    if (!user) return;

    const avatarEl = document.getElementById('user-avatar');
    const nameEl = document.getElementById('user-name');
    const emailEl = document.getElementById('user-email');
    const avatarFallback = document.getElementById('avatarFallback');

    // Extract Google User Metadata
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

    // Secondary fallback IDs for maximum compatibility
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

// SIGN OUT HANDLER
async function logoutUser() {
    console.log('[AUTH] Logging out user...');
    setCachedUser(null);

    let client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : (typeof supabase !== 'undefined' ? supabase : window.supabaseClient);

    if (client && client.auth) {
        try {
            await client.auth.signOut();
        } catch (err) {
            console.error('[AUTH] signOut error:', err);
        }
    }

    window.location.href = 'index.html';
}

// Global Aliases
window.loadUserProfile = loadUserProfile;
window.hydrateProfilePage = loadUserProfile;
window.logoutUser = logoutUser;

// DOM CONTENT LOADED EVENT LISTENER
document.addEventListener('DOMContentLoaded', async () => {
    const authBtn = document.getElementById('nav-auth-btn') || document.getElementById('nav-login-link');
    if (authBtn) {
        authBtn.addEventListener('click', async (e) => {
            e.preventDefault();

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

            if (session || currentUser) {
                // Already logged in -> Lock session and open profile directly
                if (!window.location.pathname.toLowerCase().includes('profile.html')) {
                    window.location.href = 'profile.html';
                }
            } else {
                // Not logged in -> Trigger Google OAuth
                if (client && client.auth) {
                    const { error } = await client.auth.signInWithOAuth({
                        provider: 'google',
                        options: { redirectTo: window.location.origin + '/profile.html' }
                    });
                    if (error) alert("Login Error: " + (error.message || error));
                }
            }
        });
    }

    // Sign Out Button Event Listener
    const logoutBtn = document.getElementById('logout-btn') || document.getElementById('signOutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await logoutUser();
        });
    }

    // Attach extra Google login buttons
    const googleBtns = document.querySelectorAll('#google-login-btn, #googleAuthBtn, .btn-google-auth');
    googleBtns.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            let client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : (typeof supabase !== 'undefined' ? supabase : window.supabaseClient);

            let session = null;
            if (client && client.auth) {
                try {
                    const { data } = await client.auth.getSession();
                    session = data?.session || null;
                } catch (err) {}
            }

            const cachedUser = getCachedUser();
            if (session || cachedUser) {
                window.location.href = 'profile.html';
            } else if (client && client.auth) {
                const { error } = await client.auth.signInWithOAuth({
                    provider: 'google',
                    options: { redirectTo: window.location.origin + '/profile.html' }
                });
                if (error) alert("Login Error: " + (error.message || error));
            }
        });
    });

    // Initial Session & Route Check
    let client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : (typeof supabase !== 'undefined' ? supabase : window.supabaseClient);
    if (client && client.auth) {
        try {
            const { data: { session } } = await client.auth.getSession();
            const authBtn = document.getElementById('nav-auth-btn') || document.getElementById('nav-login-link');
            if (authBtn) authBtn.innerText = 'PROFILE';

            if (session?.user) {
                setCachedUser(session.user);
                if (window.location.pathname.toLowerCase().includes('profile')) {
                    loadUserProfile(session.user);
                }
            } else if (!window.location.hash.includes('access_token')) {
                const cachedUser = getCachedUser();
                if (!cachedUser && window.location.pathname.toLowerCase().includes('profile')) {
                    window.location.href = 'index.html';
                } else if (cachedUser && window.location.pathname.toLowerCase().includes('profile')) {
                    loadUserProfile(cachedUser);
                }
            }
        } catch (e) {}
    }
});

// ON AUTH STATE CHANGE LISTENER
let client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : (typeof supabase !== 'undefined' ? supabase : window.supabaseClient);

if (client && client.auth) {
    client.auth.onAuthStateChange(async (event, session) => {
        console.log('[AUTH] onAuthStateChange event:', event, 'session:', session?.user?.email);

        const authBtn = document.getElementById('nav-auth-btn') || document.getElementById('nav-login-link');

        if (session && session.user) {
            setCachedUser(session.user);

            if (authBtn) {
                authBtn.innerText = 'PROFILE';
            }

            if (window.location.pathname.toLowerCase().includes('profile')) {
                loadUserProfile(session.user);
            }

            if (window.location.hash.includes('access_token') && !window.location.pathname.toLowerCase().includes('profile')) {
                window.location.href = 'profile.html';
                return;
            }
        } else {
            if (authBtn) {
                authBtn.innerText = 'PROFILE';
            }

            const cachedUser = getCachedUser();
            if (!cachedUser) {
                if (window.location.pathname.toLowerCase().includes('profile') && !window.location.hash.includes('access_token')) {
                    window.location.href = 'index.html';
                }
            } else if (window.location.pathname.toLowerCase().includes('profile')) {
                loadUserProfile(cachedUser);
            }
        }
    });
}
