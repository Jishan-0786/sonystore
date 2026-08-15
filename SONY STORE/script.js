/**
 * SONY STORE - Customer Authentication Engine & Page Route Controller
 * Dynamic Google OAuth Redirects to window.location.origin + '/profile.html'
 * Robust Hash/Code Session Parsing & Route Guard Control.
 */

// Global active user state & original DOM template cache
let currentAuthUser = null;
let originalLoginCardHtml = null;

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
    console.log('[AUTH] Logging out user...');
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

    if (isProfilePage() || isLoginPage()) {
        window.location.href = 'index.html';
        return;
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

// 1. DYNAMIC REDIRECT ON LOGIN BUTTON CLICK
async function signInWithGoogle() {
    console.log('[AUTH] Google sign-in start', { origin: window.location.origin });

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
            throw new Error('Supabase client is not initialized.');
        }

        const redirectTarget = window.location.origin + '/profile.html';
        console.log('[AUTH] Calling signInWithOAuth with redirectTo:', redirectTarget);

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
        console.error('[AUTH] Google sign-in exception:', err);
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

// Synchronize Supabase User Object & Upsert Data into Supabase 'profiles' Table
async function syncSupabaseSessionUser(user) {
    if (!user) return;

    const userName = user.user_metadata?.full_name || user.user_metadata?.name || user.name || user.email?.split('@')[0] || '';
    const userEmail = user.email || user.user_metadata?.email || '';
    const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || user.avatar || '';
    const userPhone = user.user_metadata?.phone || user.phone || '+977 9800000000';

    setLoggedInUser({
        id: user.id,
        email: userEmail,
        phone: userPhone,
        name: userName,
        avatar: avatarUrl,
        provider: user.app_metadata?.provider || 'google'
    });

    const client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : (window.supabaseClient || null);
    if (client) {
        try {
            console.log('[AUTH] Upserting user profile into profiles table:', user.id);
            const { data: upsertedProfile, error: upsertErr } = await client
                .from('profiles')
                .upsert({
                    id: user.id,
                    email: userEmail,
                    full_name: userName,
                    avatar_url: avatarUrl,
                    phone: userPhone,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'id' });

            if (upsertErr) {
                console.error('[AUTH] Error upserting profile:', upsertErr.message || upsertErr);
            } else {
                console.log('[AUTH] Profile data upserted successfully:', upsertedProfile);
            }
        } catch (e) {
            console.error('[AUTH] Exception during profile upsert:', e.message || e);
        }
    }
}

// showLogin: Displays the existing login UI in the same container
function showLogin() {
    console.log('[AUTH] showLogin CALLED');
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

// showProfile: Displays Profile UI in the container
function showProfile(user) {
    console.log('[AUTH] showProfile CALLED for user:', user?.id || null);

    const card = document.querySelector('.auth-card') || document.querySelector('.glass-panel');
    if (!card) return;

    const userName = user.user_metadata?.full_name || user.user_metadata?.name || user.name || user.email?.split('@')[0] || 'Valued Client';
    const userEmail = user.email || user.user_metadata?.email || '';
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
                        🚪 Sign Out
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

// Update Navbar Authentication State Links Across Header
function updateNavbarAuthState(session) {
    const user = session ? session.user : null;
    const navs = document.querySelectorAll('#mainNav, .main-nav');

    navs.forEach(nav => {
        let authLink = nav.querySelector('.nav-link-auth') || 
                       nav.querySelector('a[href="profile.html"]') || 
                       nav.querySelector('a[href="profile"]') || 
                       nav.querySelector('a[href="login.html"]') || 
                       nav.querySelector('a[href="login"]') || 
                       nav.querySelector('a[href="account.html"]');

        if (!authLink) {
            authLink = document.createElement('a');
            authLink.className = 'nav-link nav-link-auth';
            nav.appendChild(authLink);
        } else {
            authLink.classList.add('nav-link-auth');
        }

        if (user) {
            const userName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'PROFILE';
            const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || '';

            authLink.href = 'profile.html';
            authLink.style.display = 'inline-flex';
            authLink.style.alignItems = 'center';
            authLink.style.gap = '6px';
            authLink.title = `${userName} (${user.email || ''})`;

            if (avatarUrl) {
                authLink.innerHTML = `<img src="${avatarUrl}" alt="${userName}" style="width: 20px; height: 20px; border-radius: 50%; object-fit: cover; border: 1px solid var(--gold-light); vertical-align: middle;"> <span>PROFILE</span>`;
            } else {
                authLink.innerHTML = `👤 <span>PROFILE</span>`;
            }

            if (isProfilePage()) {
                authLink.classList.add('active');
            } else {
                authLink.classList.remove('active');
            }
        } else {
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
}

// Immediate Page Load & OAuth Return Handler with Route Redirect Control
async function initAuthSystem() {
    const card = document.querySelector('.auth-card') || document.querySelector('.glass-panel');
    if (card && isLoginPage() && !originalLoginCardHtml) {
        originalLoginCardHtml = card.innerHTML;
    }

    const googleBtn = document.getElementById('googleAuthBtn');
    if (googleBtn) {
        googleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            signInWithGoogle();
        });
    }

    if (typeof isSupabaseAvailable === 'function' && isSupabaseAvailable()) {
        try {
            const client = getSupabaseClient();
            if (client && client.auth) {
                const hasHashToken = window.location.hash.includes('access_token') || window.location.hash.includes('refresh_token');
                const hasAuthCode = window.location.search.includes('code=');
                const isAuthCallbackPending = hasHashToken || hasAuthCode;

                if (hasAuthCode && typeof client.auth.exchangeCodeForSession === 'function') {
                    try {
                        const code = new URLSearchParams(window.location.search).get('code');
                        if (code) {
                            console.log('[AUTH] Exchanging auth code for session...');
                            await client.auth.exchangeCodeForSession(code);
                        }
                    } catch (codeErr) {
                        console.error('[AUTH] exchangeCodeForSession error:', codeErr);
                    }
                }

                // 1. Check session on page load
                const { data: { session }, error: sessionErr } = await client.auth.getSession();
                console.log('[SUPABASE] getSession result:', session ? session : null);

                if (session?.user) {
                    currentAuthUser = session.user;
                    await syncSupabaseSessionUser(session.user);
                    cleanUrlHash();
                    updateNavbarAuthState(session);

                    if (isProfilePage() && typeof renderProfilePage === 'function') {
                        renderProfilePage(session.user);
                    }
                    if (isIndexPage() || isLoginPage()) {
                        console.log('[AUTH] Session active on index/login -> Redirecting to profile.html');
                        window.location.href = 'profile.html';
                        return;
                    }
                } else {
                    updateNavbarAuthState(null);
                    // Only redirect away from profile.html if NO OAuth callback is currently being processed
                    if (isProfilePage() && !isAuthCallbackPending) {
                        console.log('[AUTH] No session on profile page & no callback pending -> Redirecting to index.html');
                        window.location.href = 'index.html';
                        return;
                    }
                    if (isLoginPage()) {
                        showLogin();
                    }
                    resetGoogleButtonState();
                }

                // 2. Listen for auth state changes
                client.auth.onAuthStateChange(async (event, session) => {
                    console.log('[SUPABASE] onAuthStateChange event:', event, session ? session.user?.email : null);

                    if (session?.user) {
                        currentAuthUser = session.user;
                        await syncSupabaseSessionUser(session.user);
                        cleanUrlHash();
                        updateNavbarAuthState(session);

                        if (isProfilePage() && typeof renderProfilePage === 'function') {
                            renderProfilePage(session.user);
                        }
                        if (event === 'SIGNED_IN' || isAuthCallbackPending) {
                            if (isIndexPage() || isLoginPage()) {
                                window.location.href = 'profile.html';
                                return;
                            }
                        }
                    } else {
                        if (event === 'SIGNED_OUT') {
                            currentAuthUser = null;
                            localStorage.removeItem('sony_store_user');
                            updateNavbarAuthState(null);

                            if (isProfilePage()) {
                                window.location.href = 'index.html';
                                return;
                            }
                            if (isLoginPage()) {
                                showLogin();
                            }
                            resetGoogleButtonState();
                        }
                    }
                });
            }
        } catch (e) {
            console.error('[AUTH] Auth system init error:', e);
            updateNavbarAuthState(null);
            resetGoogleButtonState();
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initAuthSystem();
});
