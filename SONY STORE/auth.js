/**
 * SONY STORE - Customer Authentication Engine
 * Single Source of Truth Session Management for Supabase Auth & Google OAuth.
 * Detailed diagnostic logging for Google sign-in start, OAuth callback, getSession, auth state change, and profile loading.
 */

// Global active user state
let currentAuthUser = null;

function getLoggedInUser() {
    if (currentAuthUser && currentAuthUser.loggedIn) {
        return currentAuthUser;
    }
    try {
        const stored = JSON.parse(localStorage.getItem('sony_store_user'));
        if (stored && stored.loggedIn) {
            currentAuthUser = stored;
            return stored;
        }
    } catch (e) {}
    return null;
}

function setLoggedInUser(user) {
    const userData = {
        id: user.id || null,
        phone: user.phone || '+977 9800000000',
        name: user.name || user.full_name || 'Valued Customer',
        email: user.email || '',
        avatar: user.avatar || user.avatar_url || '',
        provider: user.provider || 'google',
        loggedIn: true,
        loginTime: new Date().toISOString()
    };
    currentAuthUser = userData;
    localStorage.setItem('sony_store_user', JSON.stringify(userData));
    updateAuthUI();
}

function resetGoogleButtonState() {
    const btn = document.getElementById('googleAuthBtn');
    const btnText = document.getElementById('googleAuthBtnText') || (btn ? btn.querySelector('span') : null);
    if (btn) {
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
    }
    if (btnText) {
        btnText.textContent = 'Continue with Google';
    }
}

function cleanUrlHash() {
    if (window.location.hash || window.location.search.includes('code=')) {
        if (window.history && window.history.replaceState) {
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }
}

async function logoutUser() {
    currentAuthUser = null;
    localStorage.removeItem('sony_store_user');
    
    if (typeof isSupabaseAvailable === 'function' && isSupabaseAvailable()) {
        try {
            await getSupabaseClient().auth.signOut();
        } catch (e) {}
    }
    
    updateAuthUI();
    if (typeof showToast === 'function') showToast('Logged out successfully', '👋');
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 600);
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
    console.error('[DEBUG LOG] Google sign-in start', { origin: window.location.origin });

    const existingUser = getLoggedInUser();
    if (existingUser) {
        console.error('[DEBUG LOG] User is already logged in. Navigating to account.');
        window.location.href = 'account.html';
        return;
    }

    const btn = document.getElementById('googleAuthBtn');
    const btnText = document.getElementById('googleAuthBtnText') || (btn ? btn.querySelector('span') : null);
    const errorBox = document.getElementById('googleAuthErrorBox');

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
            const noClientErr = new Error('Supabase client is not initialized. Ensure supabase.js is loaded.');
            console.error('[DEBUG LOG] Google sign-in start error:', noClientErr);
            throw noClientErr;
        }

        const redirectTarget = window.location.origin + '/login.html';
        console.error('[DEBUG LOG] Calling signInWithOAuth with redirectTo:', redirectTarget);

        const { data, error } = await client.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: redirectTarget
            }
        });

        console.error('[DEBUG LOG] signInWithOAuth result:', { hasUrl: Boolean(data?.url), error });

        if (error) {
            console.error('[DEBUG LOG] signInWithOAuth returned error:', error);
            throw error;
        }

        if (data && data.url) {
            console.error('[DEBUG LOG] Navigating browser to OAuth authorization URL:', data.url);
            window.location.href = data.url;
        }

    } catch (err) {
        console.error('[DEBUG LOG] Google sign-in start exception caught:', err);
        resetGoogleButtonState();

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
                await syncSupabaseSessionUser(data.user);
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

// Synchronize Supabase User Object & Create Profile if Missing
async function syncSupabaseSessionUser(user) {
    if (!user) return;

    const userName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || '';
    const userPhone = user.user_metadata?.phone || '+977 9800000000';
    const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || '';

    console.error('[DEBUG LOG] Profile loading:', { userId: user.id, email: user.email, name: userName });

    setLoggedInUser({
        id: user.id,
        email: user.email,
        phone: userPhone,
        name: userName,
        avatar: avatarUrl,
        provider: user.app_metadata?.provider || 'google'
    });

    // 1. Check if user profile row exists in Supabase profiles table
    const client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : (window.supabaseClient || null);
    if (client) {
        try {
            const { data: existingProfile, error: fetchErr } = await client
                .from('profiles')
                .select('id')
                .eq('id', user.id)
                .maybeSingle();

            if (fetchErr) {
                console.error('[DEBUG LOG] Error checking existing profile:', fetchErr.message || fetchErr);
            }

            // 2. If profile DOES NOT exist, automatically insert new profile row
            if (!existingProfile) {
                console.error('[DEBUG LOG] Creating new profile for user ID:', user.id);
                const { data: insertedProfile, error: insertErr } = await client
                    .from('profiles')
                    .insert([{
                        id: user.id,
                        email: user.email,
                        full_name: userName,
                        avatar_url: avatarUrl,
                        phone: userPhone,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    }]);

                if (insertErr) {
                    console.error('[DEBUG LOG] Error inserting new profile:', insertErr.message || insertErr);
                } else {
                    console.error('[DEBUG LOG] Profile created successfully:', insertedProfile);
                }
            } else {
                console.error('[DEBUG LOG] Profile already exists for user ID:', user.id);
            }
        } catch (e) {
            console.error('[DEBUG LOG] Exception during profile check/creation:', e.message || e);
        }
    }

    updateAuthUI();
}

// Update Header Navigation Authentication Link (LOGIN vs PROFILE)
function updateAuthUI() {
    const user = getLoggedInUser();
    const navs = document.querySelectorAll('#mainNav, .main-nav');
    
    navs.forEach(nav => {
        let authLink = nav.querySelector('.nav-link-auth') || nav.querySelector('a[href="login.html"]') || nav.querySelector('a[href="account.html"]');
        if (!authLink) {
            authLink = document.createElement('a');
            authLink.className = 'nav-link nav-link-auth';
            nav.appendChild(authLink);
        } else {
            authLink.classList.add('nav-link-auth');
        }

        if (user && user.loggedIn) {
            authLink.href = 'account.html';
            authLink.style.display = 'inline-flex';
            authLink.style.alignItems = 'center';
            authLink.style.gap = '6px';

            if (user.avatar) {
                authLink.innerHTML = `<img src="${user.avatar}" alt="${user.name}" style="width: 20px; height: 20px; border-radius: 50%; object-fit: cover; border: 1px solid var(--gold-light); vertical-align: middle;"> <span>${user.name || 'Account'}</span>`;
            } else {
                authLink.innerHTML = `👤 <span>${user.name || 'Account'}</span>`;
            }

            if (window.location.pathname.endsWith('account.html') || window.location.pathname.endsWith('orders.html')) {
                authLink.classList.add('active');
            } else {
                authLink.classList.remove('active');
            }
        } else {
            authLink.href = 'login.html';
            authLink.innerHTML = 'Login';
            authLink.style.display = 'inline-block';
            if (window.location.pathname.endsWith('login.html')) {
                authLink.classList.add('active');
            } else {
                authLink.classList.remove('active');
            }
        }
    });
}

// Immediate Page Load & OAuth Return Handler
async function initAuthSystem() {
    // Render immediate local state
    updateAuthUI();

    // Attach Google OAuth button listener if present on page
    const googleBtn = document.getElementById('googleAuthBtn');
    if (googleBtn) {
        googleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const existingUser = getLoggedInUser();
            if (existingUser) {
                window.location.href = 'account.html';
                return;
            }
            signInWithGoogle();
        });
    }

    if (typeof isSupabaseAvailable === 'function' && isSupabaseAvailable()) {
        try {
            const client = getSupabaseClient();
            if (client && client.auth) {
                const urlParams = new URLSearchParams(window.location.search);
                const authCode = urlParams.get('code');
                const hasHashToken = window.location.hash.includes('access_token');

                if (authCode || hasHashToken) {
                    console.error('[DEBUG LOG] OAuth callback detected:', { codePresent: Boolean(authCode), hashPresent: hasHashToken });
                }

                if (authCode && typeof client.auth.exchangeCodeForSession === 'function') {
                    console.error('[DEBUG LOG] Exchanging OAuth code...');
                    try {
                        const { data: exchangeData, error: exchangeErr } = await client.auth.exchangeCodeForSession(authCode);
                        console.error('[DEBUG LOG] exchangeCodeForSession result:', { success: Boolean(exchangeData), error: exchangeErr });
                        if (exchangeErr) {
                            console.error('[DEBUG LOG] exchangeCodeForSession error:', exchangeErr.message || exchangeErr);
                        }
                    } catch (codeErr) {
                        console.error('[DEBUG LOG] exchangeCodeForSession exception:', codeErr);
                    }
                }

                // getSession check
                const { data: { session }, error: sessionErr } = await client.auth.getSession();
                console.error('[DEBUG LOG] getSession result:', { hasSession: Boolean(session), userId: session?.user?.id || null, error: sessionErr });

                if (session && session.user) {
                    console.error('[DEBUG LOG] Session restored, user ID exists:', session.user.id);
                    await syncSupabaseSessionUser(session.user);
                    cleanUrlHash();

                    if (window.location.pathname.endsWith('login.html')) {
                        const redirectParam = new URLSearchParams(window.location.search).get('redirect');
                        const targetPage = redirectParam ? decodeURIComponent(redirectParam) : 'index.html';
                        window.location.href = targetPage;
                        return;
                    }
                } else {
                    resetGoogleButtonState();
                }

                // Auth state change listener
                client.auth.onAuthStateChange(async (event, session) => {
                    console.error('[DEBUG LOG] Auth state change event:', { event, hasSession: Boolean(session), userId: session?.user?.id || null });

                    if (event === 'SIGNED_IN' || (session && session.user && event === 'INITIAL_SESSION')) {
                        console.error('[DEBUG LOG] Session restored via auth state change:', session.user.id);
                        await syncSupabaseSessionUser(session.user);
                        cleanUrlHash();

                        if (window.location.pathname.endsWith('login.html')) {
                            const redirectParam = new URLSearchParams(window.location.search).get('redirect');
                            const targetPage = redirectParam ? decodeURIComponent(redirectParam) : 'index.html';
                            window.location.href = targetPage;
                        }
                    } else if (event === 'SIGNED_OUT') {
                        currentAuthUser = null;
                        localStorage.removeItem('sony_store_user');
                        updateAuthUI();
                        resetGoogleButtonState();
                    }
                });
            }
        } catch (e) {
            console.error('[DEBUG LOG] Auth system init error:', e);
            resetGoogleButtonState();
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initAuthSystem();
});
