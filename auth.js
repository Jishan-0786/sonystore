/**
 * SONY STORE - Customer Authentication & Dynamic Navbar UI Engine
 * Features:
 * 1. syncNavbarState() cleans #access_token BEFORE updating UI to prevent race conditions.
 * 2. Checks Supabase getSession() and localStorage memory state to eliminate FOUC.
 * 3. Filters onAuthStateChange to fire ONLY on explicit state changes (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED).
 * 4. Updates id="nav-auth-btn" (and id="nav-login-link") to "PROFILE" (profile.html) or "LOGIN" (login.html).
 * 5. Route Protection: Redirects unauthenticated users away from profile.html to index.html.
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

// MAIN SYNCHRONOUS & ASYNCHRONOUS NAVBAR STATE ENGINE
async function syncNavbarState() {
    // 1. Clean token hash first to prevent initial auth state reset loops
    if (window.location.hash.includes('access_token') || window.location.hash.includes('refresh_token') || window.location.search.includes('code=')) {
        if (window.history && window.history.replaceState) {
            window.history.replaceState(null, '', window.location.pathname);
        }
    }

    let client = null;
    if (typeof getSupabaseClient === 'function') client = getSupabaseClient();
    if (!client && typeof supabase !== 'undefined' && supabase.auth) client = supabase;
    if (!client && window.supabaseClient) client = window.supabaseClient;

    let session = null;
    if (client && client.auth) {
        try {
            const { data } = await client.auth.getSession();
            session = data?.session || null;
        } catch (e) {
            console.warn('[AUTH] getSession notice in syncNavbarState:', e);
        }
    }

    const cachedUser = getCachedUser();
    const currentUser = session?.user || cachedUser;
    const authBtn = document.getElementById('nav-auth-btn') || document.getElementById('nav-login-link');

    if (authBtn) {
        if (session || currentUser) {
            // USER IS LOGGED IN
            authBtn.innerText = 'PROFILE';
            authBtn.href = 'profile.html';
            authBtn.style.visibility = 'visible';
            authBtn.title = `Logged in as ${currentUser?.user_metadata?.full_name || currentUser?.name || currentUser?.email || 'User'}`;
        } else {
            // USER IS NOT LOGGED IN
            authBtn.innerText = 'LOGIN';
            authBtn.href = 'login.html';
            authBtn.style.visibility = 'visible';
            authBtn.removeAttribute('title');
        }
    }

    // Dynamic Route Protection & Profile Hydration
    const isProfile = window.location.pathname.toLowerCase().includes('profile');
    if (isProfile) {
        if (!session && !currentUser) {
            window.location.href = 'index.html';
            return;
        }
        if (currentUser) {
            hydrateProfilePage(currentUser);
        }
    }
}

// Global Aliases for Compatibility
window.syncNavbarState = syncNavbarState;
window.checkUserSession = syncNavbarState;
window.updateAuthUI = syncNavbarState;
const renderAuthState = syncNavbarState;

// Hydrate profile.html DOM elements
function hydrateProfilePage(user) {
    if (!user) return;

    const fullName = user.user_metadata?.full_name || user.user_metadata?.name || user.name || (user.email ? user.email.split('@')[0] : 'Valued Client');
    const email = user.email || user.user_metadata?.email || '';
    const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || user.avatar || '';

    // Populate Name
    const nameEl = document.getElementById('user-name') || document.getElementById('userNameHeading') || document.getElementById('userName');
    if (nameEl) nameEl.textContent = fullName;

    // Populate Email
    const emailEl = document.getElementById('user-email') || document.getElementById('userEmailPara') || document.getElementById('userEmail');
    if (emailEl) emailEl.textContent = email ? `✉️ ${email}` : '';

    // Populate Avatar
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

    // Attach Sign Out Listener
    const logoutBtn = document.getElementById('logout-btn') || document.getElementById('signOutBtn');
    if (logoutBtn && !logoutBtn.dataset.logoutBound) {
        logoutBtn.dataset.logoutBound = "true";
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await logoutUser();
        });
    }
}

// Sign Out / Logout function
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

    await syncNavbarState();
    window.location.href = 'index.html';
}

// Google OAuth Initiator
async function signInWithGoogle() {
    console.log('[AUTH] Starting Google Sign-In...');
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

// Event Listeners & Auth State Binder
document.addEventListener('DOMContentLoaded', () => {
    // 1. Initial execution on DOM load
    syncNavbarState();

    // 2. Attach Google OAuth Click Listeners
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

// 3. Listen for explicit auth state changes (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED)
let client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : (typeof supabase !== 'undefined' ? supabase : window.supabaseClient);
if (client && client.auth) {
    client.auth.onAuthStateChange((event, session) => {
        console.log('[AUTH] onAuthStateChange event:', event);

        if (session?.user) {
            setCachedUser(session.user);
        } else if (event === 'SIGNED_OUT') {
            setCachedUser(null);
        }

        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED' || (session && session.user)) {
            syncNavbarState();
        }
    });
}
