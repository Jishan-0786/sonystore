/**
 * SONY STORE - Customer Authentication & Dynamic Navbar UI Engine
 * Features:
 * 1. Global updateAuthUI() function checking Supabase session & local cache.
 * 2. Dynamically switches navbar link text to "PROFILE" (/profile.html) when authenticated, and "LOGIN" (/login.html) when unauthenticated.
 * 3. Prevents FOUC & race conditions by executing on DOMContentLoaded and onAuthStateChange.
 * 4. OAuth Callback Redirect: On index.html/login.html, if session is detected after OAuth callback, automatically redirects to /profile.html.
 * 5. Route Protection: Redirects unauthenticated users away from profile.html to index.html.
 * 6. Cleans up #access_token from URL address bar via window.history.replaceState.
 */

// Route helpers
function isIndexPage() {
    const p = window.location.pathname.toLowerCase();
    return p === '/' || p.endsWith('/index.html') || p.endsWith('/index') || p === '';
}

function isLoginPageCheck() {
    const p = window.location.pathname.toLowerCase();
    return p.endsWith('/login') || p.endsWith('/login.html') || p === '/login';
}

function isProfilePage() {
    const p = window.location.pathname.toLowerCase();
    return p.endsWith('/profile.html') || p.endsWith('/profile') || p.endsWith('/account.html') || p.endsWith('/account');
}

// Local cache for zero-flicker instant navbar render
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
            window.history.replaceState(null, document.title, window.location.pathname);
        }
    }
}

// GLOBAL DYNAMIC NAVBAR SWITCH FUNCTION
async function updateAuthUI() {
    let client = null;
    if (typeof getSupabaseClient === 'function') {
        client = getSupabaseClient();
    }
    if (!client && typeof supabase !== 'undefined' && supabase.auth) {
        client = supabase;
    }
    if (!client && window.supabaseClient) {
        client = window.supabaseClient;
    }

    let session = null;
    if (client && client.auth) {
        try {
            const res = await client.auth.getSession();
            session = res.data?.session || null;
        } catch (e) {
            console.warn('[AUTH] getSession notice in updateAuthUI:', e);
        }
    }

    const cachedUser = getCachedUser();
    const currentUser = session?.user || cachedUser;
    const authBtn = document.getElementById('nav-auth-btn');

    if (authBtn) {
        if (session || currentUser) {
            // USER IS LOGGED IN
            authBtn.innerText = 'PROFILE';
            authBtn.href = 'profile.html';
            authBtn.style.visibility = 'visible';
            authBtn.title = `Logged in as ${currentUser?.user_metadata?.full_name || currentUser?.name || currentUser?.email || 'User'}`;
            authBtn.classList.add('active-auth');
        } else {
            // USER IS NOT LOGGED IN
            authBtn.innerText = 'LOGIN';
            authBtn.href = 'login.html';
            authBtn.style.visibility = 'visible';
            authBtn.removeAttribute('title');
            authBtn.classList.remove('active-auth');
        }
    }

    const isIndex = isIndexPage();
    const isLoginPage = isLoginPageCheck();
    const isProfile = isProfilePage();
    const isAuthPending = window.location.hash.includes('access_token') || window.location.search.includes('code=');

    // 1. ROUTE REDIRECT: If on index.html / login.html right after OAuth callback, redirect to profile.html
    if ((session || currentUser) && (isIndex || isLoginPage) && isAuthPending) {
        cleanUrlHash();
        window.location.href = 'profile.html';
        return;
    }

    // 2. ROUTE GUARD: If unauthenticated user opens profile.html, redirect to index.html
    if (isProfile) {
        if (!session && !currentUser && !isAuthPending) {
            window.location.href = 'index.html';
            return;
        }

        if (currentUser) {
            hydrateProfilePage(currentUser);
        }
    }

    // 3. CLEANUP URL HASH
    if (isAuthPending) {
        cleanUrlHash();
    }
}

// Global Aliases
window.updateAuthUI = updateAuthUI;
const renderAuthState = updateAuthUI;
const updateNavbarAuthUI = updateAuthUI;

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

    let client = null;
    if (typeof getSupabaseClient === 'function') client = getSupabaseClient();
    if (!client && typeof supabase !== 'undefined' && supabase.auth) client = supabase;
    if (!client && window.supabaseClient) client = window.supabaseClient;

    if (client && client.auth) {
        try {
            await client.auth.signOut();
        } catch (err) {
            console.error('[AUTH] signOut error:', err);
        }
    }

    await updateAuthUI();
    window.location.href = 'index.html';
}

// Google OAuth Initiator
async function signInWithGoogle() {
    console.log('[AUTH] Starting Google Sign-In...');
    let client = null;
    if (typeof getSupabaseClient === 'function') client = getSupabaseClient();
    if (!client && typeof supabase !== 'undefined' && supabase.auth) client = supabase;
    if (!client && window.supabaseClient) client = window.supabaseClient;

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

// System Initializer
async function initAuthSystem() {
    // 1. Run updateAuthUI on initialization
    await updateAuthUI();

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

    // 3. Listen for Auth State Changes
    let client = null;
    if (typeof getSupabaseClient === 'function') client = getSupabaseClient();
    if (!client && typeof supabase !== 'undefined' && supabase.auth) client = supabase;
    if (!client && window.supabaseClient) client = window.supabaseClient;

    if (client && client.auth) {
        client.auth.onAuthStateChange(async (event, session) => {
            console.log('[AUTH] onAuthStateChange event:', event);

            if (session?.user) {
                setCachedUser(session.user);
            } else if (event === 'SIGNED_OUT') {
                setCachedUser(null);
            }

            await updateAuthUI();
        });
    }
}

// Bind initialization on DOM Content Loaded
document.addEventListener('DOMContentLoaded', () => {
    initAuthSystem();
});
