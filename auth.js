/**
 * SONY STORE - Customer Authentication & Dynamic PROFILE Button Logic
 * 
 * Behavior:
 * 1. LOGGED-IN STATE: Clicking "PROFILE" opens/stays on profile.html page.
 * 2. LOGGED-OUT STATE: Clicking "PROFILE" initiates Supabase Google Login (signInWithOAuth).
 * 3. ROUTE GUARD & CLEANUP: Cleans up #access_token hash on OAuth callback; redirects unauthenticated profile.html access to index.html.
 * 4. SIGN OUT: Calls supabase.auth.signOut(), clears local cache, and redirects to index.html.
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

function cleanUrlHash() {
    if (window.location.hash || window.location.search.includes('code=')) {
        if (window.history && window.history.replaceState) {
            window.history.replaceState(null, '', window.location.pathname);
        }
    }
}

// HANDLE PROFILE BUTTON CLICK DYNAMICALLY
async function handleProfileClick(e) {
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
    const isProfilePage = window.location.pathname.toLowerCase().includes('profile');

    if (!session && !currentUser) {
        // NOT LOGGED IN -> Trigger Google Login directly
        e.preventDefault();
        console.log('[AUTH] User not logged in. Initiating Google OAuth...');
        if (client && client.auth) {
            await client.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: window.location.origin + '/profile.html' }
            });
        }
    } else {
        // LOGGED IN -> Go to profile page
        if (!isProfilePage) {
            e.preventDefault();
            window.location.href = 'profile.html';
        }
    }
}

// MAIN AUTH & ROUTE SYNC CONTROLLER
async function syncAuthSystem() {
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
        const isIndexPage = currentPath === '/' || currentPath.endsWith('/index.html') || currentPath.endsWith('/index') || currentPath === '';

        if (authBtn) {
            authBtn.innerText = 'PROFILE';
            authBtn.href = 'profile.html';
            authBtn.style.visibility = 'visible';
            authBtn.title = currentUser ? `Logged in as ${currentUser?.user_metadata?.full_name || currentUser?.name || currentUser?.email || 'User'}` : 'Sign In with Google';
        }

        if (session || currentUser) {
            // AUTO REDIRECT TO PROFILE ON OAUTH CALLBACK RETURN
            if (isOAuthCallback && isIndexPage) {
                cleanUrlHash();
                window.location.href = 'profile.html';
                return;
            }

            if (isProfilePage) {
                if (isOAuthCallback) cleanUrlHash();
                hydrateProfilePage(currentUser);
            }
        } else {
            // ROUTE GUARD: Redirect unauthenticated user away from profile.html to index.html
            if (isProfilePage && !isOAuthCallback) {
                window.location.href = 'index.html';
                return;
            }
        }

        if (isOAuthCallback) {
            cleanUrlHash();
        }
    } catch (err) {
        console.error("[AUTH] syncAuthSystem exception:", err);
    }
}

// BIND PROFILE CLICK EVENT LISTENER
function bindNavAuthButton() {
    const authBtn = document.getElementById('nav-auth-btn') || document.getElementById('nav-login-link');
    if (authBtn && !authBtn.dataset.clickBound) {
        authBtn.dataset.clickBound = "true";
        authBtn.addEventListener('click', handleProfileClick);
    }
}

// HYDRATE PROFILE PAGE USER DATA
function hydrateProfilePage(user) {
    if (!user) return;

    const fullName = user.user_metadata?.full_name || user.user_metadata?.name || user.name || (user.email ? user.email.split('@')[0] : 'Valued Client');
    const email = user.email || user.user_metadata?.email || '';
    const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || user.avatar || '';

    // Full Name
    const nameEl = document.getElementById('user-name') || document.getElementById('userNameHeading') || document.getElementById('userName');
    if (nameEl) nameEl.textContent = fullName;

    // Email Address
    const emailEl = document.getElementById('user-email') || document.getElementById('userEmailPara') || document.getElementById('userEmail');
    if (emailEl) emailEl.textContent = email ? `✉️ ${email}` : '';

    // Avatar Image
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

    // Sign Out Button
    const logoutBtn = document.getElementById('logout-btn') || document.getElementById('signOutBtn');
    if (logoutBtn && !logoutBtn.dataset.logoutBound) {
        logoutBtn.dataset.logoutBound = "true";
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await logoutUser();
        });
    }
}

// LOGOUT HANDLER
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

    await syncAuthSystem();
    window.location.href = 'index.html';
}

// Global Export Aliases
window.handleProfileClick = handleProfileClick;
window.syncAuthSystem = syncAuthSystem;
window.syncNavbarAndRoute = syncAuthSystem;
window.syncNavbarState = syncAuthSystem;
window.checkUserSession = syncAuthSystem;
window.updateAuthUI = syncAuthSystem;
window.logoutUser = logoutUser;

// DOM LOAD LISTENER
document.addEventListener('DOMContentLoaded', () => {
    syncAuthSystem();
    bindNavAuthButton();

    // Attach any extra Google Login buttons on the page
    const googleBtns = document.querySelectorAll('#google-login-btn, #googleAuthBtn, .btn-google-auth');
    googleBtns.forEach(btn => {
        if (!btn.dataset.authBound) {
            btn.dataset.authBound = "true";
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                let client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : (typeof supabase !== 'undefined' ? supabase : window.supabaseClient);
                if (client && client.auth) {
                    await client.auth.signInWithOAuth({
                        provider: 'google',
                        options: { redirectTo: window.location.origin + '/profile.html' }
                    });
                }
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

        syncAuthSystem();
        bindNavAuthButton();
    });
}
