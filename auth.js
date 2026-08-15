/**
 * SONY STORE - Customer Authentication & Dynamic Navbar UI Engine
 * Features:
 * 1. Checks supabase.auth.getSession() on page load and onAuthStateChange.
 * 2. Dynamically switches navbar #nav-auth-btn to "PROFILE" (profile.html) when logged in, or "LOGIN" (login.html) when logged out.
 * 3. Auto-redirects to /profile.html on Google OAuth callback return while cleaning #access_token from URL.
 * 4. Hydrates profile.html with Google user name, email, avatar picture, and working Sign Out handler.
 * 5. Route Protection: Redirects unauthenticated users away from profile.html to index.html.
 */

// Local memory helpers for instant zero-FOUC state rendering
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

function cleanUrlHash() {
    if (window.location.hash || window.location.search.includes('code=')) {
        if (window.history && window.history.replaceState) {
            window.history.replaceState(null, '', window.location.pathname);
        }
    }
}

// MAIN DYNAMIC NAVBAR SWITCH & ROUTE MANAGER
async function syncNavbarAndRoute() {
    try {
        const hasHashToken = window.location.hash.includes('access_token') || window.location.hash.includes('refresh_token');
        const hasCodeParam = window.location.search.includes('code=');
        const isOAuthCallback = hasHashToken || hasCodeParam;

        let client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : (typeof supabase !== 'undefined' ? supabase : window.supabaseClient);

        let session = null;
        if (client && client.auth) {
            try {
                const { data: { session: fetchedSession }, error } = await client.auth.getSession();
                if (error) console.error("[AUTH] getSession error:", error);
                session = fetchedSession || null;
            } catch (e) {
                console.error("[AUTH] getSession exception:", e);
            }
        }

        const cachedUser = getCachedUser();
        const currentUser = session?.user || cachedUser;
        const authBtn = document.getElementById('nav-auth-btn') || document.getElementById('nav-login-link');

        const currentPath = window.location.pathname.toLowerCase();
        const isProfilePage = currentPath.includes('profile');
        const isIndexOrLoginPage = currentPath === '/' || currentPath.endsWith('/index.html') || currentPath.endsWith('/index') || currentPath.endsWith('/login.html') || currentPath.endsWith('/login') || currentPath === '';

        if (session || currentUser) {
            // USER IS LOGGED IN
            if (authBtn) {
                authBtn.innerText = 'PROFILE';
                authBtn.href = 'profile.html';
                authBtn.style.visibility = 'visible';
                authBtn.title = `Logged in as ${currentUser?.user_metadata?.full_name || currentUser?.name || currentUser?.email || 'User'}`;
            }

            // AUTO REDIRECT TO PROFILE ON OAUTH CALLBACK
            if (isOAuthCallback && isIndexOrLoginPage) {
                cleanUrlHash();
                window.location.href = 'profile.html';
                return;
            }

            if (isProfilePage) {
                if (isOAuthCallback) cleanUrlHash();
                hydrateProfilePage(currentUser);
            }
        } else {
            // USER IS NOT LOGGED IN
            if (authBtn) {
                authBtn.innerText = 'LOGIN';
                authBtn.href = 'login.html';
                authBtn.style.visibility = 'visible';
                authBtn.removeAttribute('title');
            }

            // ROUTE GUARD: Redirect unauthenticated user away from profile page
            if (isProfilePage && !isOAuthCallback) {
                window.location.href = 'index.html';
                return;
            }
        }

        if (isOAuthCallback) {
            cleanUrlHash();
        }
    } catch (err) {
        console.error("[AUTH] syncNavbarAndRoute exception:", err);
    }
}

// HYDRATE PROFILE PAGE USER DATA
function hydrateProfilePage(user) {
    if (!user) return;

    const fullName = user.user_metadata?.full_name || user.user_metadata?.name || user.name || (user.email ? user.email.split('@')[0] : 'Valued Client');
    const email = user.email || user.user_metadata?.email || '';
    const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || user.avatar || '';

    // 1. Full Name
    const nameEl = document.getElementById('user-name') || document.getElementById('userNameHeading') || document.getElementById('userName');
    if (nameEl) nameEl.textContent = fullName;

    // 2. Email Address
    const emailEl = document.getElementById('user-email') || document.getElementById('userEmailPara') || document.getElementById('userEmail');
    if (emailEl) emailEl.textContent = email ? `✉️ ${email}` : '';

    // 3. Avatar Image
    const avatarImg = document.getElementById('user-avatar') || document.getElementById('userAvatarImg');
    const avatarFallback = document.getElementById('avatarFallback');
    const avatarBox = document.getElementById('avatarBox');

    if (avatarImg) {
        if (avatarUrl) {
            avatarImg.src = avatarUrl;
            avatarImg.alt = fullName;
            avatarImg.style.display = 'block';
            if (avatarFallback) avatarFallback.style.display = 'none';
        } else {
            avatarImg.style.display = 'none';
            if (avatarFallback) avatarFallback.style.display = 'inline-block';
        }
    } else if (avatarBox) {
        if (avatarUrl) {
            avatarBox.innerHTML = `<img src="${avatarUrl}" alt="${fullName}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
        } else {
            avatarBox.innerHTML = `<span>👤</span>`;
        }
    }

    // 4. Functional Sign Out Listener
    const logoutBtn = document.getElementById('logout-btn') || document.getElementById('signOutBtn');
    if (logoutBtn && !logoutBtn.dataset.logoutBound) {
        logoutBtn.dataset.logoutBound = "true";
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await logoutUser();
        });
    }
}

// SIGN OUT / LOGOUT HANDLER
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

    await syncNavbarAndRoute();
    window.location.href = 'index.html';
}

// GOOGLE OAUTH INITIATOR
async function signInWithGoogle() {
    console.log('[AUTH] Initiating Google Sign-In...');
    let client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : (typeof supabase !== 'undefined' ? supabase : window.supabaseClient);

    if (!client || !client.auth) {
        alert('Supabase client is not initialized.');
        return;
    }

    const redirectTarget = window.location.origin + '/profile.html';
    try {
        const { data, error } = await client.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: redirectTarget }
        });

        if (error) throw error;
        if (data && data.url) {
            window.location.href = data.url;
        }
    } catch (err) {
        console.error('[AUTH] Google OAuth error:', err);
    }
}

// Global Export Aliases
window.syncNavbarAndRoute = syncNavbarAndRoute;
window.syncNavbarState = syncNavbarAndRoute;
window.checkUserSession = syncNavbarAndRoute;
window.updateAuthUI = syncNavbarAndRoute;
window.logoutUser = logoutUser;
const renderAuthState = syncNavbarAndRoute;

// DOM LOAD LISTENER
document.addEventListener('DOMContentLoaded', () => {
    syncNavbarAndRoute();

    // Attach Google OAuth Click Listeners
    const googleBtns = document.querySelectorAll('#google-login-btn, #googleAuthBtn, .btn-google-auth');
    googleBtns.forEach(btn => {
        if (!btn.dataset.authBound) {
            btn.dataset.authBound = "true";
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                await signInWithGoogle();
            });
        }
    });
});

// AUTH STATE CHANGE LISTENER
let client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : (typeof supabase !== 'undefined' ? supabase : window.supabaseClient);
if (client && client.auth) {
    client.auth.onAuthStateChange((event, session) => {
        console.log('[AUTH] onAuthStateChange event:', event);

        if (session?.user) {
            setCachedUser(session.user);
        } else if (event === 'SIGNED_OUT') {
            setCachedUser(null);
        }

        syncNavbarAndRoute();
    });
}
