/**
 * SONY STORE - Customer Authentication Engine
 * Single Source of Truth Session Management for Supabase Auth & Google OAuth.
 * In-Place UI Transformation on /login (showLogin vs showProfile).
 */

// Global active user state & original DOM template cache
let currentAuthUser = null;
let originalLoginCardHtml = null;

function isLoginPage() {
    const p = window.location.pathname.toLowerCase();
    return p.endsWith('/login') || p.endsWith('/login.html') || p === '/login';
}

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
    console.error('[AUTH] Logging out user...');
    currentAuthUser = null;
    localStorage.removeItem('sony_store_user');
    
    if (typeof isSupabaseAvailable === 'function' && isSupabaseAvailable()) {
        try {
            await getSupabaseClient().auth.signOut();
        } catch (e) {
            console.error('[AUTH] signOut error:', e);
        }
    }
    
    updateNavbarAuthState(null);
    if (isLoginPage()) {
        showLogin();
    }
    if (typeof showToast === 'function') showToast('Logged out successfully', '👋');
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
    console.error('[AUTH] Google sign-in start', { origin: window.location.origin });

    const existingUser = getLoggedInUser();
    if (existingUser) {
        console.error('[AUTH] User is already logged in. Showing profile.');
        if (isLoginPage()) {
            showProfile(existingUser);
        } else {
            window.location.href = 'account.html';
        }
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
            console.error('[AUTH] Google sign-in start error:', noClientErr);
            throw noClientErr;
        }

        const redirectTarget = window.location.origin + '/login';
        console.error('[AUTH] Calling signInWithOAuth with redirectTo:', redirectTarget);

        const { data, error } = await client.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: redirectTarget
            }
        });

        console.error('[AUTH] signInWithOAuth result:', { hasUrl: Boolean(data?.url), error });

        if (error) {
            console.error('[AUTH] signInWithOAuth returned error:', error);
            throw error;
        }

        if (data && data.url) {
            console.error('[AUTH] Navigating browser to OAuth authorization URL:', data.url);
            window.location.href = data.url;
        }

    } catch (err) {
        console.error('[AUTH] Google sign-in start exception caught:', err);
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

    console.error('[AUTH] Syncing user profile:', { userId: user.id, email: user.email, name: userName });

    setLoggedInUser({
        id: user.id,
        email: user.email,
        phone: userPhone,
        name: userName,
        avatar: avatarUrl,
        provider: user.app_metadata?.provider || 'google'
    });

    const client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : (window.supabaseClient || null);
    if (client) {
        try {
            const { data: existingProfile, error: fetchErr } = await client
                .from('profiles')
                .select('id')
                .eq('id', user.id)
                .maybeSingle();

            if (fetchErr) {
                console.error('[AUTH] Error checking existing profile:', fetchErr.message || fetchErr);
            }

            if (!existingProfile) {
                console.error('[AUTH] Creating new profile for user ID:', user.id);
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
                    console.error('[AUTH] Error inserting new profile:', insertErr.message || insertErr);
                } else {
                    console.error('[AUTH] Profile created successfully:', insertedProfile);
                }
            } else {
                console.error('[AUTH] Profile already exists for user ID:', user.id);
            }
        } catch (e) {
            console.error('[AUTH] Exception during profile check/creation:', e.message || e);
        }
    }
}

// showLogin: Displays the existing login UI in the same container
function showLogin() {
    console.error('[AUTH] Running showLogin()');
    const card = document.querySelector('.auth-card') || document.querySelector('.glass-panel');
    if (!card) return;

    if (originalLoginCardHtml) {
        card.style.maxWidth = '';
        card.style.margin = '';
        card.style.padding = '';
        card.innerHTML = originalLoginCardHtml;
        
        // Re-attach Google button event listener
        const googleBtn = document.getElementById('googleAuthBtn');
        if (googleBtn) {
            googleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                signInWithGoogle();
            });
        }
        resetGoogleButtonState();
    }
}

// showProfile: Hides login UI and creates/displays Profile UI in the same container
function showProfile(user) {
    console.log("AUTHENTICATED USER:", user);

    const card = document.querySelector('.auth-card') || document.querySelector('.glass-panel');
    if (!card) return;

    const userName = user.user_metadata?.full_name || user.user_metadata?.name || user.name || user.email?.split('@')[0] || 'Valued Client';
    const userEmail = user.email || '';
    const userAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture || user.avatar || '';
    const userPhone = user.user_metadata?.phone || user.phone || '+977 VIP Client';

    card.style.maxWidth = '900px';
    card.style.margin = '0 auto';
    card.style.padding = '40px 30px';

    card.innerHTML = `
        <div class="profile-dashboard-view" style="text-align: left;">
            <!-- PROFILE HEADER -->
            <div style="display: flex; align-items: center; gap: 24px; padding-bottom: 28px; border-bottom: 1px solid var(--border-subtle); flex-wrap: wrap;">
                <div style="width: 84px; height: 84px; border-radius: 50%; background: var(--gold-gradient); color: #000; font-size: 2.5rem; font-weight: 800; display: flex; align-items: center; justify-content: center; overflow: hidden; border: 2px solid var(--gold-light); flex-shrink: 0; box-shadow: 0 0 15px var(--gold-glow);">
                    ${userAvatar ? `<img src="${userAvatar}" alt="${userName}" style="width:100%;height:100%;object-fit:cover;">` : '👤'}
                </div>
                <div style="flex-grow: 1;">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px; flex-wrap: wrap;">
                        <h2 style="font-family: var(--font-heading); color: var(--gold-light); font-size: 1.6rem; margin: 0;">${userName}</h2>
                        <span class="stock-badge in-stock" style="font-size: 0.75rem;">VIP VERIFIED MEMBER</span>
                    </div>
                    <p style="color: var(--text-muted); font-size: 0.95rem; margin: 0 0 4px 0;">✉️ ${userEmail}</p>
                    <p style="color: var(--text-muted); font-size: 0.85rem; margin: 0;">📞 ${userPhone} | <strong style="color: var(--success);">Account Status: Logged In</strong></p>
                </div>
                <div>
                    <button onclick="logoutUser()" class="account-nav-btn" style="color: #ef4444; border-color: rgba(239, 68, 68, 0.4); padding: 10px 20px; font-weight: 700; margin: 0;">
                        🚪 Logout
                    </button>
                </div>
            </div>

            <!-- PROFILE DASHBOARD GRID -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; margin-top: 28px;">
                
                <!-- MY ORDERS -->
                <div style="background: rgba(0,0,0,0.4); padding: 24px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); display: flex; flex-direction: column; justify-content: space-between;">
                    <div>
                        <div style="font-size: 1.8rem; margin-bottom: 8px;">📦</div>
                        <h4 style="font-family: var(--font-heading); color: var(--gold-light); font-size: 1.1rem; margin-bottom: 6px;">My Orders</h4>
                        <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 16px;">View order history & track deliveries.</p>
                    </div>
                    <a href="orders.html" class="btn-primary" style="padding: 10px; text-align: center; text-decoration: none; font-size: 0.85rem;">View Orders →</a>
                </div>

                <!-- WISHLIST -->
                <div style="background: rgba(0,0,0,0.4); padding: 24px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); display: flex; flex-direction: column; justify-content: space-between;">
                    <div>
                        <div style="font-size: 1.8rem; margin-bottom: 8px;">♥</div>
                        <h4 style="font-family: var(--font-heading); color: var(--gold-light); font-size: 1.1rem; margin-bottom: 6px;">Wishlist</h4>
                        <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 16px;">Access saved luxury timepieces.</p>
                    </div>
                    <a href="wishlist.html" class="btn-primary" style="padding: 10px; text-align: center; text-decoration: none; font-size: 0.85rem;">Saved Items →</a>
                </div>

                <!-- ACCOUNT SETTINGS -->
                <div style="background: rgba(0,0,0,0.4); padding: 24px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); display: flex; flex-direction: column; justify-content: space-between;">
                    <div>
                        <div style="font-size: 1.8rem; margin-bottom: 8px;">⚙️</div>
                        <h4 style="font-family: var(--font-heading); color: var(--gold-light); font-size: 1.1rem; margin-bottom: 6px;">Account Settings</h4>
                        <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 16px;">Security & profile preferences.</p>
                    </div>
                    <button onclick="showToast('Security settings active', '🔒')" class="account-nav-btn" style="padding: 10px; width: 100%; text-align: center; font-size: 0.85rem; margin: 0;">Settings Overview</button>
                </div>

            </div>
        </div>
    `;
}

// Aliases for compatibility
const showLoginPage = showLogin;
const showProfilePage = showProfile;

// Single Reusable Function to Update Navbar Authentication State
function updateNavbarAuthState(session) {
    const user = session ? session.user : null;
    console.error('[AUTH] Updating navbar:', { sessionPresent: Boolean(session), user: user ? (user.email || user.id) : null });
    console.error('[AUTH] User:', user);

    const navs = document.querySelectorAll('#mainNav, .main-nav');

    navs.forEach(nav => {
        let authLink = nav.querySelector('.nav-link-auth') || 
                       nav.querySelector('a[href="login.html"]') || 
                       nav.querySelector('a[href="login"]') || 
                       nav.querySelector('a[href="/login"]') || 
                       nav.querySelector('a[href="account.html"]');

        if (!authLink) {
            authLink = document.createElement('a');
            authLink.className = 'nav-link nav-link-auth';
            nav.appendChild(authLink);
        } else {
            authLink.classList.add('nav-link-auth');
        }

        if (user) {
            // User is authenticated via Supabase session -> Show PROFILE
            const userName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'PROFILE';
            const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || '';

            authLink.href = 'account.html';
            authLink.style.display = 'inline-flex';
            authLink.style.alignItems = 'center';
            authLink.style.gap = '6px';
            authLink.title = `${userName} (${user.email || ''})`;

            if (avatarUrl) {
                authLink.innerHTML = `<img src="${avatarUrl}" alt="${userName}" style="width: 20px; height: 20px; border-radius: 50%; object-fit: cover; border: 1px solid var(--gold-light); vertical-align: middle;"> <span>PROFILE</span>`;
            } else {
                authLink.innerHTML = `👤 <span>PROFILE</span>`;
            }

            if (window.location.pathname.endsWith('account.html') || window.location.pathname.endsWith('orders.html')) {
                authLink.classList.add('active');
            } else {
                authLink.classList.remove('active');
            }
        } else {
            // User is NOT authenticated -> Show LOGIN
            authLink.href = 'login.html';
            authLink.innerHTML = 'LOGIN';
            authLink.style.display = 'inline-block';
            authLink.removeAttribute('title');

            if (isLoginPage()) {
                authLink.classList.add('active');
            } else {
                authLink.classList.remove('active');
            }
        }
    });

    if (isLoginPage()) {
        if (user) {
            showProfile(user);
        } else {
            showLogin();
        }
    }
}

// Fallback compatibility wrapper
function updateAuthUI() {
    const user = getLoggedInUser();
    const mockSession = user && user.loggedIn ? { user: { id: user.id, email: user.email, user_metadata: { full_name: user.name, avatar_url: user.avatar } } } : null;
    updateNavbarAuthState(mockSession);
}

// Immediate Page Load & OAuth Return Handler
async function initAuthSystem() {
    // Cache original login form markup if on login page
    const card = document.querySelector('.auth-card') || document.querySelector('.glass-panel');
    if (card && isLoginPage() && !originalLoginCardHtml) {
        originalLoginCardHtml = card.innerHTML;
    }

    // Attach Google OAuth button listener if present on page
    const googleBtn = document.getElementById('googleAuthBtn');
    if (googleBtn) {
        googleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const existingUser = getLoggedInUser();
            if (existingUser) {
                if (isLoginPage()) {
                    showProfile(existingUser);
                } else {
                    window.location.href = 'account.html';
                }
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

                if (authCode && typeof client.auth.exchangeCodeForSession === 'function') {
                    try {
                        await client.auth.exchangeCodeForSession(authCode);
                    } catch (codeErr) {
                        console.error('[AUTH] exchangeCodeForSession exception:', codeErr);
                    }
                }

                // 1. On page load, fetch session
                const { data: { session }, error: sessionErr } = await client.auth.getSession();
                console.log("AUTHENTICATED USER:", session?.user);

                if (sessionErr) {
                    console.error('[AUTH] getSession error:', sessionErr);
                }

                if (session?.user) {
                    await syncSupabaseSessionUser(session.user);
                    cleanUrlHash();
                    updateNavbarAuthState(session);
                    if (isLoginPage()) {
                        showProfile(session.user);
                    }
                } else {
                    updateNavbarAuthState(null);
                    if (isLoginPage()) {
                        showLogin();
                    }
                    resetGoogleButtonState();
                }

                // 2. Listen for authentication changes (onAuthStateChange)
                client.auth.onAuthStateChange(async (event, session) => {
                    console.log("AUTHENTICATED USER:", session?.user);

                    if (session?.user) {
                        await syncSupabaseSessionUser(session.user);
                        cleanUrlHash();
                        updateNavbarAuthState(session);
                        if (isLoginPage()) {
                            showProfile(session.user);
                        }
                    } else {
                        currentAuthUser = null;
                        localStorage.removeItem('sony_store_user');
                        updateNavbarAuthState(null);
                        if (isLoginPage()) {
                            showLogin();
                        }
                        resetGoogleButtonState();
                    }
                });
            }
        } catch (e) {
            console.error('[AUTH] Auth system init error:', e);
            updateNavbarAuthState(null);
            if (isLoginPage()) {
                showLogin();
            }
            resetGoogleButtonState();
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initAuthSystem();
});
