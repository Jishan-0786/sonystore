/**
 * SONY STORE - Customer Authentication & Dynamic Navbar UI Engine
 * Prevents FOUC (Flash of Unauthenticated Content) on navbar load.
 * 
 * Features:
 * 1. Checks supabase.auth.getSession() & onAuthStateChange.
 * 2. If authenticated: renders PROFILE button/link pointing to profile.html with avatar/name.
 * 3. If unauthenticated: renders LOGIN button pointing to login.html.
 * 4. Route protection: If unauthenticated on profile.html, redirects to index.html.
 * 5. Auto-saves/upserts profile (id, email, full_name, avatar_url) into Supabase profiles table.
 * 6. Cleans up #access_token from URL hash using window.history.replaceState.
 * 7. Functional logoutUser() calling supabase.auth.signOut() and redirecting to index.html.
 */

// Helper functions for page route checking
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

// Local caching for instant navbar render (zero FOUC)
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
        phone: user.user_metadata?.phone || user.phone || '+977 VIP Client',
        loggedIn: true,
        loginTime: new Date().toISOString()
    };
    localStorage.setItem('sony_store_user', JSON.stringify(userData));
}

// Clean up #access_token / #refresh_token / OAuth params from URL history
function cleanUrlHash() {
    if (window.location.hash || window.location.search.includes('code=')) {
        if (window.history && window.history.replaceState) {
            window.history.replaceState(null, document.title, window.location.pathname);
        }
    }
}

// Auto-Save User Profile into Supabase Database `profiles` Table
async function saveProfileToSupabase(user) {
    if (!user) return;
    const client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : (window.supabaseClient || null);
    if (!client) return;

    const id = user.id;
    const email = user.email || user.user_metadata?.email || '';
    const full_name = user.user_metadata?.full_name || user.user_metadata?.name || user.name || (email ? email.split('@')[0] : '');
    const avatar_url = user.user_metadata?.avatar_url || user.user_metadata?.picture || user.avatar || '';

    try {
        console.log('[AUTH] Upserting profile into Supabase profiles table for user:', id);
        const { error } = await client
            .from('profiles')
            .upsert({
                id,
                email,
                full_name,
                avatar_url,
                updated_at: new Date().toISOString()
            }, { onConflict: 'id' });

        if (error) {
            console.error('[AUTH] Supabase profiles upsert error:', error.message || error);
        } else {
            console.log('[AUTH] Profile successfully saved to Supabase profiles table.');
        }
    } catch (err) {
        console.error('[AUTH] Exception saving profile to Supabase:', err);
    }
}

// Render logged-in user profile details on profile.html
function renderProfileData(user) {
    if (!user) return;

    const fullName = user.user_metadata?.full_name || user.user_metadata?.name || user.name || (user.email ? user.email.split('@')[0] : 'Valued Client');
    const email = user.email || user.user_metadata?.email || '';
    const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || user.avatar || '';

    // Update Avatar Image & Fallback
    const avatarImg = document.getElementById('userAvatarImg');
    const avatarBox = document.getElementById('avatarBox');
    const avatarFallback = document.getElementById('avatarFallback');

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

    // Update Name & Email Elements
    const nameEl = document.getElementById('userNameHeading') || document.getElementById('userName');
    if (nameEl) nameEl.textContent = fullName;

    const emailEl = document.getElementById('userEmailPara') || document.getElementById('userEmail');
    if (emailEl) emailEl.textContent = email ? `✉️ ${email}` : '';
}

// Dynamic Navbar State Updater (Prevents FOUC / Flickering)
async function updateNavbarAuthUI(sessionParam) {
    let session = sessionParam;

    if (typeof session === 'undefined') {
        const client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : (window.supabaseClient || null);
        if (client && client.auth) {
            try {
                const res = await client.auth.getSession();
                session = res.data?.session || null;
            } catch (e) {
                console.warn('[AUTH] getSession error in updateNavbarAuthUI:', e);
            }
        }
    }

    let user = session ? session.user : null;
    if (!user) {
        user = getCachedUser();
    }

    const navs = document.querySelectorAll('#mainNav, .main-nav');
    navs.forEach(nav => {
        let authBtn = nav.querySelector('#nav-auth-btn') || 
                      nav.querySelector('.nav-link-auth') || 
                      Array.from(nav.querySelectorAll('a')).find(a => {
                          const t = (a.textContent || '').trim().toUpperCase();
                          const h = (a.getAttribute('href') || '').toLowerCase();
                          return t === 'LOGIN' || t.includes('PROFILE') || t.includes('MY ACCOUNT') ||
                                 h.includes('login') || h.includes('profile') || h.includes('account');
                      });

        if (!authBtn) {
            authBtn = document.createElement('a');
            nav.appendChild(authBtn);
        }

        authBtn.id = 'nav-auth-btn';
        authBtn.className = 'nav-link nav-link-auth';

        if (user && (user.email || user.id)) {
            const userName = user.user_metadata?.full_name || user.user_metadata?.name || user.name || (user.email ? user.email.split('@')[0] : 'PROFILE');
            const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || user.avatar || '';

            authBtn.href = 'profile.html';
            authBtn.title = `Logged in as ${userName} (${user.email || ''})`;
            authBtn.style.display = 'inline-flex';
            authBtn.style.alignItems = 'center';
            authBtn.style.gap = '6px';

            if (avatarUrl) {
                authBtn.innerHTML = `<img src="${avatarUrl}" alt="${userName}" style="width:20px;height:20px;border-radius:50%;object-fit:cover;border:1px solid var(--gold-light);vertical-align:middle;"> <span>PROFILE</span>`;
            } else {
                authBtn.innerHTML = `👤 <span>PROFILE</span>`;
            }

            if (isProfilePage()) {
                authBtn.classList.add('active');
            } else {
                authBtn.classList.remove('active');
            }
        } else {
            authBtn.href = 'login.html';
            authBtn.title = 'Sign In to Your Account';
            authBtn.innerHTML = 'LOGIN';
            authBtn.style.display = 'inline-block';
            authBtn.removeAttribute('title');

            if (isLoginPage()) {
                authBtn.classList.add('active');
            } else {
                authBtn.classList.remove('active');
            }
        }

        // FOUC FIX: Reveal navbar button once authentication state is determined
        authBtn.style.visibility = 'visible';
    });
}

// Backwards compatibility alias
const updateNavbarAuthState = updateNavbarAuthUI;

// Sign Out / Logout function
async function logoutUser() {
    console.log('[AUTH] Sign Out requested...');
    setCachedUser(null);

    const client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : (window.supabaseClient || null);
    if (client && client.auth) {
        try {
            await client.auth.signOut();
        } catch (err) {
            console.error('[AUTH] Supabase signOut error:', err);
        }
    }

    await updateNavbarAuthUI(null);
    window.location.href = 'index.html';
}

// Google OAuth Initiator
async function signInWithGoogle() {
    console.log('[AUTH] Starting Google Sign-In...');
    const client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : (window.supabaseClient || null);
    if (!client || !client.auth) {
        alert('Supabase auth client is not initialized.');
        return;
    }

    const redirectTarget = window.location.origin + '/profile.html';
    try {
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
        console.error('[AUTH] Google OAuth Exception:', err);
        if (typeof showToast === 'function') {
            showToast(`Google Auth Error: ${err.message || err}`, '❌');
        }
    }
}

// Fast Session Checker & Auth Controller Initializer
async function initAuthSystem() {
    // 0. Instant Cache Check to eliminate navbar rendering delay / flickering
    const cachedUser = getCachedUser();
    if (cachedUser) {
        updateNavbarAuthUI({ user: cachedUser });
    }

    const client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : (window.supabaseClient || null);

    if (client && client.auth) {
        try {
            const hasHashToken = window.location.hash.includes('access_token') || window.location.hash.includes('refresh_token');
            const hasCodeParam = window.location.search.includes('code=');
            const isAuthCallbackPending = hasHashToken || hasCodeParam;

            // Fetch session directly from Supabase
            const { data: { session } } = await client.auth.getSession();

            if (session && session.user) {
                console.log('[AUTH] Active session found:', session.user.email);
                setCachedUser(session.user);
                await saveProfileToSupabase(session.user);
                cleanUrlHash();

                await updateNavbarAuthUI(session);

                if (isProfilePage()) {
                    renderProfileData(session.user);
                } else if (isLoginPage()) {
                    window.location.href = 'profile.html';
                    return;
                }
            } else {
                console.log('[AUTH] No active session found from getSession.');

                // Route Protection: Unauthenticated access to profile.html redirects immediately to index.html
                if (isProfilePage() && !isAuthCallbackPending) {
                    setCachedUser(null);
                    await updateNavbarAuthUI(null);
                    window.location.href = 'index.html';
                    return;
                }

                if (!cachedUser) {
                    await updateNavbarAuthUI(null);
                }
            }

            // Listen for Auth State Changes (OAuth Redirects, SIGNED_IN, SIGNED_OUT)
            client.auth.onAuthStateChange(async (event, session) => {
                console.log('[AUTH] onAuthStateChange event:', event);

                if (session && session.user) {
                    setCachedUser(session.user);

                    if (event === 'SIGNED_IN' || isAuthCallbackPending) {
                        await saveProfileToSupabase(session.user);
                        cleanUrlHash();
                        await updateNavbarAuthUI(session);

                        if (isProfilePage()) {
                            renderProfileData(session.user);
                        } else if (isLoginPage() || isIndexPage()) {
                            window.location.href = 'profile.html';
                            return;
                        }
                    } else {
                        await updateNavbarAuthUI(session);
                        if (isProfilePage()) {
                            renderProfileData(session.user);
                        }
                    }
                } else if (event === 'SIGNED_OUT') {
                    setCachedUser(null);
                    await updateNavbarAuthUI(null);
                    if (isProfilePage()) {
                        window.location.href = 'index.html';
                        return;
                    }
                }
            });

        } catch (e) {
            console.error('[AUTH] Auth system init exception:', e);
            if (isProfilePage()) {
                window.location.href = 'index.html';
            }
        }
    } else {
        if (isProfilePage() && !getCachedUser()) {
            window.location.href = 'index.html';
        }
    }
}

// Bind initialization on DOM Content Loaded
document.addEventListener('DOMContentLoaded', () => {
    initAuthSystem();
});
