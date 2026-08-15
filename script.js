/**
 * SONY STORE - Customer Authentication & Dynamic Navbar UI Engine
 * Features:
 * 1. Centralized renderAuthState() checking Supabase getSession() and localStorage cache.
 * 2. Dynamically replaces "LOGIN" link with "PROFILE" pointing to profile.html when logged in.
 * 3. Prevents FOUC & race conditions by firing on DOMContentLoaded and onAuthStateChange.
 * 4. Hydrates profile.html with Google avatar, full name, email, and working Sign Out listener.
 * 5. Route Protection: Redirects unauthenticated users away from profile.html to index.html.
 * 6. Cleans up #access_token from URL address bar via window.history.replaceState.
 */

// Helper functions for page route checking
function isIndexPage() {
    const p = window.location.pathname.toLowerCase();
    return p === '/' || p.endsWith('/index.html') || p.endsWith('/index') || p === '';
}

function isLoginPage() {
    const p = window.location.pathname.toLowerCase();
    return p.endsWith('/login') || p.endsWith('/login.html') || p === '/login';
}

function isProfilePage() {
    const p = window.location.pathname.toLowerCase();
    return p.endsWith('/profile.html') || p.endsWith('/profile') || p.endsWith('/account.html') || p.endsWith('/account');
}

// Local caching for instant navbar render (zero FOUC)
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

// CENTRALIZED RENDER AUTH STATE FUNCTION
async function renderAuthState() {
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
            console.warn('[AUTH] getSession error in renderAuthState:', e);
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

    // Dynamic Route Guard & Profile Page Hydration
    const isProfile = isProfilePage();
    const isAuthPending = window.location.hash.includes('access_token') || window.location.search.includes('code=');

    if (isProfile) {
        if (!session && !currentUser && !isAuthPending) {
            // Unauthenticated user -> redirect to index.html
            window.location.href = 'index.html';
            return;
        }

        if (currentUser) {
            hydrateProfilePage(currentUser);
        }
    }

    // URL Token Cleanup
    if (isAuthPending) {
        if (window.history && window.history.replaceState) {
            window.history.replaceState(null, document.title, window.location.pathname);
        }
    }
}

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

    await renderAuthState();
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
    // 1. Centralized renderAuthState call on load
    await renderAuthState();

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

            await renderAuthState();
        });
    }
}

// Bind initialization on DOM Content Loaded
document.addEventListener('DOMContentLoaded', () => {
    initAuthSystem();
});