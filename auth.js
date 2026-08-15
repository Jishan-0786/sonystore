/**
 * SONY STORE - Customer Authentication & PROFILE Navbar Engine
 * 
 * Fixes OAuth hash parsing race condition:
 * 1. Listens to onAuthStateChange (INITIAL_SESSION, SIGNED_IN) before redirecting or kicking out.
 * 2. Prevents kicking user out of profile.html while window.location.hash.includes('access_token').
 * 3. #nav-auth-btn click handler opens profile.html if logged in, or triggers Google OAuth if logged out.
 * 4. Sign Out handler calls supabase.auth.signOut(), clears local cache, and redirects to index.html.
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

// Hydrate Profile Page DOM
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

// Bind Navbar Profile Click Handler
function bindNavAuthButton() {
    const authBtn = document.getElementById('nav-auth-btn') || document.getElementById('nav-login-link');
    if (authBtn && !authBtn.dataset.clickBound) {
        authBtn.dataset.clickBound = "true";
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
                console.log('[AUTH] User not logged in. Initiating Google OAuth...');
                if (client && client.auth) {
                    const { error } = await client.auth.signInWithOAuth({
                        provider: 'google',
                        options: { redirectTo: window.location.origin + '/profile.html' }
                    });
                    if (error) alert("Login Error: " + (error.message || error));
                }
            } else {
                if (!window.location.pathname.toLowerCase().includes('profile.html')) {
                    window.location.href = 'profile.html';
                }
            }
        });
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
window.logoutUser = logoutUser;

// DOM Content Loaded Handler
document.addEventListener('DOMContentLoaded', async () => {
    bindNavAuthButton();

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
            if (client && client.auth) {
                const { error } = await client.auth.signInWithOAuth({
                    provider: 'google',
                    options: { redirectTo: window.location.origin + '/profile.html' }
                });
                if (error) alert("Login Error: " + (error.message || error));
            }
        });
    });

    // Initial session check
    let client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : (typeof supabase !== 'undefined' ? supabase : window.supabaseClient);
    if (client && client.auth) {
        try {
            const { data: { session } } = await client.auth.getSession();
            const authBtn = document.getElementById('nav-auth-btn') || document.getElementById('nav-login-link');
            if (authBtn) authBtn.innerText = 'PROFILE';

            if (session?.user) {
                setCachedUser(session.user);
                if (window.location.pathname.includes('profile.html')) {
                    hydrateProfilePage(session.user);
                }
            } else if (!window.location.hash.includes('access_token')) {
                const cachedUser = getCachedUser();
                if (!cachedUser && window.location.pathname.includes('profile.html')) {
                    window.location.href = 'index.html';
                } else if (cachedUser && window.location.pathname.includes('profile.html')) {
                    hydrateProfilePage(cachedUser);
                }
            }
        } catch (e) {}
    }
});

// ON AUTH STATE CHANGE LISTENER (Handles OAuth Hash Parsing & Redirects)
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

            // If returning from Google Auth on index.html, move to profile.html
            if (window.location.hash.includes('access_token') && !window.location.pathname.includes('profile.html')) {
                window.location.href = 'profile.html';
                return;
            }

            if (window.location.pathname.includes('profile.html')) {
                hydrateProfilePage(session.user);
            }
        } else {
            if (authBtn) {
                authBtn.innerText = 'PROFILE';
            }

            const cachedUser = getCachedUser();
            if (!cachedUser) {
                // Only kick out if explicitly signed out and on profile page AND not parsing access_token hash
                if (window.location.pathname.includes('profile.html') && !window.location.hash.includes('access_token')) {
                    window.location.href = 'index.html';
                }
            } else if (window.location.pathname.includes('profile.html')) {
                hydrateProfilePage(cachedUser);
            }
        }
    });
}
