/**
 * SONY STORE - Customer Authentication Engine
 * Supports Supabase Auth (Google OAuth, Email/Password, Phone OTP)
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

// Google OAuth Integration
async function signInWithGoogle() {
    if (typeof isSupabaseAvailable === 'function' && isSupabaseAvailable()) {
        try {
            const redirectUrl = `${window.location.origin}/account.html`;
            const { data, error } = await getSupabaseClient().auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: redirectUrl
                }
            });
            if (error) throw error;
        } catch (err) {
            console.error('Google Auth Error:', err.message);
            alert('Google Auth Error: ' + err.message + '\n\nPlease ensure Google Provider is enabled in your Supabase Project Dashboard under Authentication -> Providers.');
        }
    } else {
        // Fallback demo Google sign-in when Supabase OAuth client is offline
        setLoggedInUser({
            id: 'demo-google-user-101',
            email: 'vip.client@gmail.com',
            name: 'VIP Google Client',
            phone: '+977 9811112222',
            provider: 'google'
        });
        if (typeof showToast === 'function') showToast('Signed in with Google (Demo)', '🔑');
        setTimeout(() => {
            window.location.href = 'account.html';
        }, 500);
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

    // Listen for Supabase session changes & Google OAuth callbacks
    if (typeof isSupabaseAvailable === 'function' && isSupabaseAvailable()) {
        try {
            getSupabaseClient().auth.onAuthStateChange(async (event, session) => {
                if (session && session.user) {
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
                    if (window.supabaseClient) {
                        try {
                            await window.supabaseClient.from('profiles').upsert([{
                                id: user.id,
                                email: user.email,
                                full_name: userName,
                                phone: userPhone,
                                avatar_url: avatarUrl,
                                updated_at: new Date().toISOString()
                            }], { onConflict: 'id' });
                        } catch (e) {
                            console.warn('Profile sync exception:', e.message);
                        }
                    }

                    // Auto redirect to account.html if user is currently on login.html
                    if (window.location.pathname.endsWith('login.html')) {
                        window.location.href = 'account.html';
                    }
                }
            });
        } catch (e) {}
    }
});
