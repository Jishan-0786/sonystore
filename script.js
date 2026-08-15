/**
 * SONY STORE - Customer Authentication & PROFILE Navbar Engine
 * 
 * Navbar Button: <a href="javascript:void(0);" id="nav-auth-btn">PROFILE</a>
 * 
 * Behavior:
 * 1. href="javascript:void(0);" prevents browser native navigation competition.
 * 2. Unauthenticated user clicking "PROFILE" -> Triggers Supabase Google OAuth (signInWithOAuth).
 * 3. Authenticated user clicking "PROFILE" -> Navigates to /profile.html.
 * 4. Route Guard & Hash Cleanup -> Cleans up #access_token from URL; redirects unauthorized visits to /profile.html back to /index.html.
 * 5. Sign Out -> Clears session via supabase.auth.signOut(), removes local cache, and redirects to /index.html.
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

// Check session on load for route guard & URL hash cleanup
async function checkProfileRouteGuard() {
    const hasHashToken = window.location.hash.includes('access_token') || window.location.hash.includes('refresh_token');
    const hasCodeParam = window.location.search.includes('code=');
    const isOAuthCallback = hasHashToken || hasCodeParam;

    // Clean access_token from URL hash
    if (isOAuthCallback) {
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
    const currentPath = window.location.pathname.toLowerCase();
    const isProfilePage = currentPath.includes('profile.html') || currentPath.endsWith('/profile');
    const isIndexPage = currentPath === '/' || currentPath.endsWith('/index.html') || currentPath.endsWith('/index') || currentPath === '';

    // Auto-redirect to profile page if returning from Google OAuth
    if ((session || currentUser) && isOAuthCallback && isIndexPage) {
        window.location.href = 'profile.html';
        return;
    }

    // Protection: Kick unauthorized user out of profile.html
    if (!session && !currentUser && !isOAuthCallback && isProfilePage) {
        window.location.href = 'index.html';
        return;
    }

    if ((session || currentUser) && isProfilePage) {
        hydrateProfilePage(currentUser);
    }
}

// Hydrate Profile Page
function hydrateProfilePage(user) {
    if (!user) return;

    const fullName = user.user_metadata?.full_name || user.user_metadata?.name || user.name || (user.email ? user.email.split('@')[0] : 'Valued Client');
    const email = user.email || user.user_metadata?.email || '';
    const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || user.avatar || '';

    const nameEl = document.getElementById('user-name') || document.getElementById('userNameHeading') || document.getElementById('userName');
    if (nameEl) nameEl.textContent = fullName;

    const emailEl = document.getElementById('user-email') || document.getElementById('userEmailPara') || document.getElementById('userEmail');
    if (emailEl) emailEl.textContent = email ? `✉️ ${email}` : '';

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
}

// Sign Out Handler
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
window.checkProfileRouteGuard = checkProfileRouteGuard;
window.logoutUser = logoutUser;

// Attach click listeners on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
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

            if (!session && !currentUser) {
                // USER NOT LOGGED IN -> Trigger Google OAuth
                console.log('[AUTH] User not logged in. Initiating Google OAuth...');
                if (client && client.auth) {
                    const { error } = await client.auth.signInWithOAuth({
                        provider: 'google',
                        options: { redirectTo: window.location.origin + '/profile.html' }
                    });
                    if (error) alert("Login Error: " + (error.message || error));
                }
            } else {
                // USER LOGGED IN -> Open Profile Page
                if (!window.location.pathname.toLowerCase().includes('profile.html')) {
                    window.location.href = 'profile.html';
                }
            }
        });
    }

    // Attach Logout Button Listener
    const logoutBtn = document.getElementById('logout-btn') || document.getElementById('signOutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await logoutUser();
        });
    }

    // Attach extra Google Login buttons on the page
    const googleBtns = document.querySelectorAll('#google-login-btn, #googleAuthBtn, .btn-google-auth');
    googleBtns.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            let client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : (typeof supabase !== 'undefined' ? supabase : window.supabaseClient);
            if (client && client.auth) {
                const { error } = await client.auth.signInWithOAuth({
                    provider: 'google',
                    options: { redirectTo: window.location.origin + '/profile.html' }
                });
                if (error) alert("Login Error: " + (error.message || error));
            }
        });
    });

    // Check session on load for route guard
    checkProfileRouteGuard();
});

// Auth State Change Listener
let client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : (typeof supabase !== 'undefined' ? supabase : window.supabaseClient);
if (client && client.auth) {
    client.auth.onAuthStateChange((event, session) => {
        if (session?.user) {
            setCachedUser(session.user);
        } else if (event === 'SIGNED_OUT') {
            setCachedUser(null);
        }
        checkProfileRouteGuard();
    });
}