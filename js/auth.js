/**
 * SONY STORE - Customer Authentication Engine
 * Supports Supabase Auth (Email / Password / OTP) alongside DEMO Phone verification.
 * Automatically synchronizes Supabase session with local customer portal state.
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

// Supabase Auth Integration Helpers
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

    // Listen for Supabase session changes
    if (typeof isSupabaseAvailable === 'function' && isSupabaseAvailable()) {
        try {
            getSupabaseClient().auth.onAuthStateChange((event, session) => {
                if (session && session.user) {
                    setLoggedInUser({
                        id: session.user.id,
                        email: session.user.email,
                        phone: session.user.user_metadata?.phone || '+977 9800000000',
                        name: session.user.user_metadata?.full_name || 'Valued Client'
                    });
                }
            });
        } catch (e) {}
    }
});
