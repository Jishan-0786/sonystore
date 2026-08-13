/**
 * SONY STORE - Customer Authentication Engine
 * Supports Supabase Auth (Google OAuth, Email/Password, Phone OTP)
 * Uses Supabase auth session as single source of truth with instant navbar & profile sync.
 */

function getLoggedInUser() {
    try {
        const user = JSON.parse(localStorage.getItem('sony_store_user'));
        return user && user.loggedIn ? user : null;
    } catch (e) {
        return null;
    }
}

function setLoggedInUser(user) {
    const userData = {
        id: user.id || null,
        phone: user.phone || '+977 9800000000',
        name: user.name || user.full_name || 'Valued Customer',
        email: user.email || '',
        avatar: user.avatar || user.avatar_url || '',
        provider: user.provider || 'custom',
        loggedIn: true,
        loginTime: new Date().toISOString()
    };
    localStorage.setItem('sony_store_user', JSON.stringify(userData));
    updateAuthUI();
}

async function logoutUser() {
    if (typeof isSupabaseAvailable === 'function' && isSupabaseAvailable()) {
        try {
            await getSupabaseClient().auth.signOut();
        } catch (e) {}
    }
    localStorage.removeItem('sony_store_user');
    updateAuthUI();
    if (typeof showToast === 'function') showToast('Logged out successfully', '👋');
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 800);
}

function requireCustomerAuth(redirectUrl) {
    const user = getLoggedInUser();
    if (!user) {
        const target = redirectUrl || window.location.href;
        window.location.href = `login.html?redirect=${encodeURIComponent(target)}`;
        return false;
    }
    return true;
}

// Google OAuth Integration using existing Supabase client
async function signInWithGoogle() {
    console.log('[DEBUG] Google button clicked');

    const btn = document.getElementById('googleAuthBtn');
    const btnText = document.getElementById('googleAuthBtnText') || (btn ? btn.querySelector('span') : null);
    const errorBox = document.getElementById('googleAuthErrorBox');
    const originalText = 'Continue with Google';

    if (errorBox) {
        errorBox.style.display = 'none';
        errorBox.textContent = '';
    }

    if (btn) {
        btn.disabled = true;
        btn.style.opacity = '0.7';
        btn.style.cursor = 'wait';
    }
    if (btnText) {
        btnText.textContent = 'Redirecting...';
    }

    try {
        const client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : (window.supabaseClient || null);

        if (!client || !client.auth) {
            throw new Error('Supabase client is not initialized. Ensure supabase.js is loaded.');
        }

        const redirectTarget = 'https://sonywatchstore.netlify.app';
        console.log('[DEBUG] signInWithOAuth started with redirectTo:', redirectTarget);

        const { data, error } = await client.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: redirectTarget
            }
        });

        if (error) throw error;

        if (data && data.url) {
            window.location.href = data.url;
        }

    } catch (err) {
        console.error('[DEBUG] signInWithOAuth exception caught:', err);

        if (btn) {
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
        }
        if (btnText) {
            btnText.textContent = originalText;
        }

        const errMessage = err ? (err.message || String(err)) : 'Unable to connect to Google OAuth';

        if (errorBox) {
            errorBox.textContent = `Google OAuth Error: ${errMessage}`;
            errorBox.style.display = 'block';
        }

        if (typeof showToast === 'function') {
            showToast(`Google Auth Error: ${errMessage}`, '❌');
        }
    }
}

// Supabase Email Login & Signup Helpers
async function loginWithSupabaseEmail(email, password) {
    if (typeof isSupabaseAvailable === 'function' && isSupabaseAvailable()) {
        try {
            const { data, error } = await getSupabaseClient().auth.signInWithPassword({ email, password });
            if (error) throw error;
            if (data && data.user) {
                handleAuthenticatedUserSession(data.user);
                return { success: true, user: data.user };
            }
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
    return { success: false, error: 'Supabase client not initialized.' };
}

async function signUpWithSupabaseEmail(email, password, phone, name) {
    if (typeof isSupabaseAvailable === 'function' && isSupabaseAvailable()) {
        try {
            const { data, error } = await getSupabaseClient().auth.signUp({
                email,
                password,
                options: {
                    data: { phone: phone, full_name: name }
                }
            });
            if (error) throw error;
            return { success: true, user: data.user };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
    return { success: false, error: 'Supabase client not initialized.' };
}

// Handle Authenticated User Session and Profile Upserting
async function handleAuthenticatedUserSession(user) {
    if (!user) return;

    const userName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Valued Client';
    const userPhone = user.user_metadata?.phone || '+977 9800000000';
    const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || '';

    setLoggedInUser({
        id: user.id,
        email: user.email,
        phone: userPhone,
        name: userName,
        avatar: avatarUrl,
        provider: user.app_metadata?.provider || 'google'
    });

    // Create / Update user profile in Supabase profiles table without duplicates
    const client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : (window.supabaseClient || null);
    if (client) {
        try {
            await client.from('profiles').upsert([{
                id: user.id,
                email: user.email,
                full_name: userName,
                phone: userPhone,
                avatar_url: avatarUrl,
                updated_at: new Date().toISOString()
            }], { onConflict: 'id' });
        } catch (e) {
            console.warn('Profile sync notice:', e.message || e);
        }
    }

    updateAuthUI();
}

// Update Header Navigation Authentication Link (LOGIN / ACCOUNT)
function updateAuthUI() {
    const user = getLoggedInUser();
    const navs = document.querySelectorAll('#mainNav');
    
    navs.forEach(nav => {
        let authLink = nav.querySelector('.nav-link-auth');
        if (!authLink) {
            authLink = document.createElement('a');
            authLink.className = 'nav-link nav-link-auth';
            nav.appendChild(authLink);
        }

        if (user) {
            authLink.href = 'account.html';
            authLink.style.display = 'inline-flex';
            authLink.style.alignItems = 'center';
            authLink.style.gap = '6px';

            if (user.avatar) {
                authLink.innerHTML = `<img src="${user.avatar}" alt="${user.name}" style="width: 20px; height: 20px; border-radius: 50%; object-fit: cover; border: 1px solid var(--gold-light); vertical-align: middle;"> <span>Account</span>`;
            } else {
                authLink.innerHTML = `👤 <span>Account</span>`;
            }

            if (window.location.pathname.endsWith('account.html') || window.location.pathname.endsWith('orders.html')) {
                authLink.classList.add('active');
            } else {
                authLink.classList.remove('active');
            }
        } else {
            authLink.href = 'login.html';
            authLink.innerHTML = 'Login';
            if (window.location.pathname.endsWith('login.html')) {
                authLink.classList.add('active');
            } else {
                authLink.classList.remove('active');
            }
        }
    });
}

// Main Page Initialization & Supabase Session Listener
async function initAuthSystem() {
    // 1. Initial UI state update
    updateAuthUI();

    // 2. Attach Google OAuth button listener if present on page
    const googleBtn = document.getElementById('googleAuthBtn');
    if (googleBtn) {
        googleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            signInWithGoogle();
        });
    }

    // 3. Query active Supabase session & register auth change listener
    if (typeof isSupabaseAvailable === 'function' && isSupabaseAvailable()) {
        try {
            const client = getSupabaseClient();
            if (client && client.auth) {

                // Call getSession on page load to detect established session immediately
                const { data: { session }, error } = await client.auth.getSession();
                if (session && session.user) {
                    await handleAuthenticatedUserSession(session.user);
                }

                // Listen for Auth changes (SIGNED_IN, TOKEN_REFRESHED, SIGNED_OUT)
                client.auth.onAuthStateChange(async (event, session) => {
                    console.log('[DEBUG] Supabase Auth Event:', event, session);

                    if (session && session.user && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED')) {
                        await handleAuthenticatedUserSession(session.user);

                        // Clean up URL hash if returning from OAuth redirect with access_token
                        if (window.location.hash.includes('access_token')) {
                            if (window.history && window.history.replaceState) {
                                window.history.replaceState(null, null, window.location.pathname);
                            }
                        }

                        // Auto redirect to account.html if user is on login page
                        if (window.location.pathname.endsWith('login.html')) {
                            const redirectParam = new URLSearchParams(window.location.search).get('redirect');
                            const targetPage = redirectParam ? decodeURIComponent(redirectParam) : 'account.html';
                            window.location.href = targetPage;
                        }
                    } else if (event === 'SIGNED_OUT') {
                        localStorage.removeItem('sony_store_user');
                        updateAuthUI();
                    }
                });
            }
        } catch (e) {
            console.warn('Auth system init notice:', e);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initAuthSystem();
});
