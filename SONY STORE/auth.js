/**
 * SONY STORE - Customer Authentication Engine
 * Supports Supabase Auth (Google OAuth, Email/Password, Phone OTP)
 * Uses existing Supabase client from supabase.js.
 * Automatically synchronizes Supabase sessions & OAuth profiles with local customer portal state.
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
    const btn = document.getElementById('googleAuthBtn');
    const btnText = document.getElementById('googleAuthBtnText') || (btn ? btn.querySelector('span') : null);
    const originalText = 'Continue with Google';

    // Show loading indicator
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
            throw new Error('Supabase client is not available. Check supabase.js initialization.');
        }

        // Determine exact production vs local redirect URL destination
        let redirectTarget = 'https://sonywatchstore.netlify.app/';
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            redirectTarget = `${window.location.origin}/`;
        } else if (window.location.origin) {
            redirectTarget = `${window.location.origin}/`;
        }

        console.log('Initiating Supabase Google OAuth with redirectTo:', redirectTarget);

        const { data, error } = await client.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: redirectTarget
            }
        });

        console.log('Supabase OAuth Response Data:', data);

        if (error) {
            console.error('Supabase signInWithOAuth Error:', error);
            throw error;
        }

        // Explicitly trigger browser redirect if OAuth URL is returned
        if (data && data.url) {
            console.log('Redirecting browser to Google login URL:', data.url);
            window.location.href = data.url;
        } else {
            // Safety fallback timeout reset if browser doesn't immediately navigate
            setTimeout(() => {
                if (btn) {
                    btn.disabled = false;
                    btn.style.opacity = '1';
                    btn.style.cursor = 'pointer';
                }
                if (btnText) {
                    btnText.textContent = originalText;
                }
            }, 4000);
        }

    } catch (err) {
        console.error('Google Auth Failure:', err);

        // Stop loading state on error
        if (btn) {
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
        }
        if (btnText) {
            btnText.textContent = originalText;
        }

        const errMessage = err ? (err.message || String(err)) : 'Unable to connect to Google Auth';
        if (typeof showToast === 'function') {
            showToast(`Google Auth Error: ${errMessage}`, '❌');
        } else {
            alert(`Google Auth Error: ${errMessage}`);
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
                setLoggedInUser({
                    id: data.user.id,
                    email: data.user.email,
                    phone: data.user.user_metadata?.phone || '+977 9800000000',
                    name: data.user.user_metadata?.full_name || 'Valued Client'
                });
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
            authLink.textContent = 'Account';
            if (window.location.pathname.endsWith('account.html') || window.location.pathname.endsWith('orders.html')) {
                authLink.classList.add('active');
            } else {
                authLink.classList.remove('active');
            }
        } else {
            authLink.href = 'login.html';
            authLink.textContent = 'Login';
            if (window.location.pathname.endsWith('login.html')) {
                authLink.classList.add('active');
            } else {
                authLink.classList.remove('active');
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    updateAuthUI();

    // Attach Google OAuth button listener
    const googleBtn = document.getElementById('googleAuthBtn');
    if (googleBtn) {
        googleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            signInWithGoogle();
        });
    }

    // Listen for Supabase session changes & Google OAuth callbacks
    if (typeof isSupabaseAvailable === 'function' && isSupabaseAvailable()) {
        try {
            const client = getSupabaseClient();
            if (client && client.auth) {
                client.auth.onAuthStateChange(async (event, session) => {
                    console.log('Supabase Auth Event:', event, session);

                    if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') && session && session.user) {
                        const user = session.user;
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

                        // Create / Update user profile in Supabase profiles table
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

                        // Auto redirect customer to account page if returning from OAuth callback
                        if (window.location.pathname.endsWith('login.html') || window.location.hash.includes('access_token')) {
                            const redirectParam = new URLSearchParams(window.location.search).get('redirect');
                            const targetPage = redirectParam ? decodeURIComponent(redirectParam) : 'account.html';
                            
                            // Clean hash from location bar
                            if (window.history && window.history.replaceState) {
                                window.history.replaceState(null, null, window.location.pathname);
                            }
                            
                            window.location.href = targetPage;
                        }
                    }
                });
            }
        } catch (e) {
            console.warn('Auth state change error:', e);
        }
    }
});
