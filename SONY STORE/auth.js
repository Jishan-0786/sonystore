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
    console.log('[DEBUG] Google button clicked');

    const btn = document.getElementById('googleAuthBtn');
    const btnText = document.getElementById('googleAuthBtnText') || (btn ? btn.querySelector('span') : null);
    const errorBox = document.getElementById('googleAuthErrorBox');
    const originalText = 'Continue with Google';

    // Clear previous error box
    if (errorBox) {
        errorBox.style.display = 'none';
        errorBox.textContent = '';
    }

    // Set loading state on button
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

        console.log('[DEBUG] Supabase client exists:', Boolean(client));

        if (!client || !client.auth) {
            throw new Error('Supabase client is not available on window or getSupabaseClient(). Ensure supabase.js is loaded.');
        }

        // Production redirect URL as specified in requirements
        const redirectTarget = (window.location.hostname === 'sonywatchstore.netlify.app' || window.location.hostname.endsWith('netlify.app'))
            ? 'https://sonywatchstore.netlify.app/login.html'
            : `${window.location.origin}/login.html`;

        console.log('[DEBUG] signInWithOAuth started with redirectTo:', redirectTarget);

        const { data, error } = await client.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: redirectTarget
            }
        });

        console.log('[DEBUG] returned data:', data);
        console.log('[DEBUG] returned error:', error);

        if (error) {
            throw error;
        }

        // If URL returned in data, navigate immediately
        if (data && data.url) {
            console.log('[DEBUG] Redirecting browser to OAuth URL:', data.url);
            window.location.href = data.url;
        } else {
            // Safety timeout reset if browser navigation is handled internally
            setTimeout(() => {
                if (btn) {
                    btn.disabled = false;
                    btn.style.opacity = '1';
                    btn.style.cursor = 'pointer';
                }
                if (btnText) {
                    btnText.textContent = originalText;
                }
            }, 3000);
        }

    } catch (err) {
        console.error('[DEBUG] signInWithOAuth exception caught:', err);

        // Reset button state
        if (btn) {
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
        }
        if (btnText) {
            btnText.textContent = originalText;
        }

        const errMessage = err ? (err.message || String(err)) : 'Unable to connect to Google OAuth';

        // Display error message directly on login page
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
                    console.log('[DEBUG] Supabase Auth Event:', event, session);

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

                        // Auto redirect customer to target account page upon successful SIGNED_IN
                        if (event === 'SIGNED_IN' || window.location.hash.includes('access_token') || window.location.pathname.endsWith('login.html')) {
                            const redirectParam = new URLSearchParams(window.location.search).get('redirect');
                            const targetPage = redirectParam ? decodeURIComponent(redirectParam) : 'account.html';
                            
                            // Clean hash from location bar
                            if (window.history && window.history.replaceState) {
                                window.history.replaceState(null, null, window.location.pathname);
                            }
                            
                            console.log('[DEBUG] Redirecting authenticated customer to:', targetPage);
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
