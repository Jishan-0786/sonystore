/**
 * SONY STORE - Customer Authentication & Master Auth Flow
 * 
 * Functions:
 * 1. populateProfileData(user) populates user-avatar, user-name, user-email.
 * 2. handleAuthFlow() cleans access_token hash, verifies session, updates PROFILE navbar button, and protects profile.html.
 * 3. Nav auth button click handler triggers Google OAuth if logged out, or opens profile.html if logged in.
 * 4. Logout listener calls supabase.auth.signOut(), clears local cache, and redirects to index.html.
 */

// Fetch and update UI with Google Profile Data
function populateProfileData(user) {
    if (!user) return;
    const avatarEl = document.getElementById('user-avatar');
    const nameEl = document.getElementById('user-name');
    const emailEl = document.getElementById('user-email');

    const meta = user.user_metadata || {};
    const fullName = meta.full_name || meta.name || user.email?.split('@')[0] || 'User';
    const email = user.email || meta.email || '';
    const avatar = meta.avatar_url || meta.picture || 'https://via.placeholder.com/150';

    if (nameEl) nameEl.innerText = fullName;
    if (emailEl) emailEl.innerText = email;
    if (avatarEl) {
        avatarEl.src = avatar;
        avatarEl.style.display = 'block';
    }

    // Secondary fallback IDs for backwards compatibility
    const userNameHeading = document.getElementById('userNameHeading');
    const userEmailPara = document.getElementById('userEmailPara');
    const userAvatarImg = document.getElementById('userAvatarImg');

    if (userNameHeading) userNameHeading.innerText = fullName;
    if (userEmailPara) userEmailPara.innerText = email;
    if (userAvatarImg) {
        userAvatarImg.src = avatar;
        userAvatarImg.style.display = 'block';
    }
}

// Master Auth Flow
async function handleAuthFlow() {
    // Clean token hash from URL bar
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

    // Check local memory cache to prevent FOUC
    let cachedUser = null;
    try {
        const stored = JSON.parse(localStorage.getItem('sony_store_user'));
        if (stored && stored.loggedIn) cachedUser = stored;
    } catch (e) {}

    const currentUser = session?.user || cachedUser;
    const isProfilePage = window.location.pathname.toLowerCase().includes('profile.html') || window.location.pathname.toLowerCase().endsWith('/profile');
    const authBtn = document.getElementById('nav-auth-btn') || document.getElementById('nav-login-link');

    if (session || currentUser) {
        // LOGGED IN STATE
        if (currentUser) {
            try {
                localStorage.setItem('sony_store_user', JSON.stringify({
                    id: currentUser.id,
                    name: currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || currentUser.email?.split('@')[0],
                    email: currentUser.email,
                    avatar: currentUser.user_metadata?.avatar_url || currentUser.user_metadata?.picture || '',
                    loggedIn: true
                }));
            } catch (e) {}
        }

        if (authBtn) {
            authBtn.innerText = 'PROFILE';
            authBtn.style.visibility = 'visible';
        }
        if (isProfilePage) {
            populateProfileData(currentUser);
        }
    } else {
        // LOGGED OUT STATE
        if (authBtn) {
            authBtn.innerText = 'PROFILE';
            authBtn.style.visibility = 'visible';
        }
        if (isProfilePage) {
            window.location.href = 'index.html';
        }
    }
}

// Global Aliases
window.populateProfileData = populateProfileData;
window.loadUserProfile = populateProfileData;
window.handleAuthFlow = handleAuthFlow;
window.initAuth = handleAuthFlow;

// Event Listeners Setup
document.addEventListener('DOMContentLoaded', () => {
    handleAuthFlow();

    // Profile Button Click Guard
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
                } catch (e) {}
            }

            let storedUser = null;
            try {
                const stored = JSON.parse(localStorage.getItem('sony_store_user'));
                if (stored && stored.loggedIn) storedUser = stored;
            } catch (err) {}

            const currentUser = session?.user || storedUser;

            if (!session && !currentUser) {
                // NOT LOGGED IN -> Trigger Google OAuth
                console.log('[AUTH] User not logged in. Initiating Google OAuth...');
                if (client && client.auth) {
                    await client.auth.signInWithOAuth({
                        provider: 'google',
                        options: { redirectTo: window.location.origin + '/profile.html' }
                    });
                }
            } else {
                // ALREADY LOGGED IN -> Open Profile Page
                if (!window.location.pathname.toLowerCase().includes('profile.html')) {
                    window.location.href = 'profile.html';
                }
            }
        });
    }

    // Logout Listener
    const logoutBtn = document.getElementById('logout-btn') || document.getElementById('signOutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            console.log('[AUTH] Logging out user...');
            localStorage.removeItem('sony_store_user');

            let client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : (typeof supabase !== 'undefined' ? supabase : window.supabaseClient);
            if (client && client.auth) {
                try {
                    await client.auth.signOut();
                } catch (err) {}
            }
            window.location.href = 'index.html';
        });
    }

    // Attach extra Google login buttons
    const googleBtns = document.querySelectorAll('#google-login-btn, #googleAuthBtn, .btn-google-auth');
    googleBtns.forEach(btn => {
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
    });
});

// Auth State Listener
let client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : (typeof supabase !== 'undefined' ? supabase : window.supabaseClient);

if (client && client.auth) {
    client.auth.onAuthStateChange((event, session) => {
        console.log('[AUTH] onAuthStateChange event:', event);

        if (session?.user) {
            try {
                localStorage.setItem('sony_store_user', JSON.stringify({
                    id: session.user.id,
                    name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0],
                    email: session.user.email,
                    avatar: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || '',
                    loggedIn: true
                }));
            } catch (e) {}
        } else if (event === 'SIGNED_OUT') {
            localStorage.removeItem('sony_store_user');
        }

        handleAuthFlow();
    });
}