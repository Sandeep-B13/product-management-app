import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import axios from 'axios';

// --- Constants ---
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

// --- Contexts ---
const AuthContext = createContext(null);

// --- Utility Functions ---
const fetcher = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor to add Authorization header for all authenticated requests
fetcher.interceptors.request.use(
    config => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    error => {
        return Promise.reject(error);
    }
);

// --- Auth Provider Component ---
function AuthProvider({ children }) {
    const [user, setUser] = useState(null); // Stores { token, username, timezone, email }
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const username = localStorage.getItem('username');
        const timezone = localStorage.getItem('timezone');
        const email = localStorage.getItem('email'); // Store email as well for convenience

        if (token && username && email) {
            setUser({ token, username, timezone, email });
        }
        setLoading(false);
    }, []);

    const login = async (email, password) => {
        try {
            const response = await fetcher.post('/login', { email, password });
            const { token, username, timezone } = response.data;
            localStorage.setItem('token', token);
            localStorage.setItem('username', username);
            localStorage.setItem('timezone', timezone);
            localStorage.setItem('email', email); // Save email on login
            setUser({ token, username, timezone, email });
            return { success: true };
        } catch (error) {
            console.error('Login failed:', error.response?.data || error.message);
            return { success: false, message: error.response?.data?.message || 'Login failed' };
        }
    };

    const signup = async (email, password, username) => {
        try {
            const response = await fetcher.post('/signup', { email, password, username });
            return { success: true, message: response.data.message };
        } catch (error) {
            console.error('Signup failed:', error.response?.data || error.message);
            return { success: false, message: error.response?.data?.message || 'Signup failed' };
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        localStorage.removeItem('timezone');
        localStorage.removeItem('email');
        setUser(null);
    };

    const updateProfile = async (newUsername, newTimezone) => {
        try {
            const response = await fetcher.put('/user/profile', {
                username: newUsername,
                timezone: newTimezone,
            });
            const updatedUser = response.data.user;
            localStorage.setItem('username', updatedUser.username);
            localStorage.setItem('timezone', updatedUser.timezone);
            setUser(prev => ({ ...prev, username: updatedUser.username, timezone: updatedUser.timezone }));
            return { success: true, message: response.data.message };
        } catch (error) {
            console.error('Profile update failed:', error.response?.data || error.message);
            return { success: false, message: error.response?.data?.message || 'Failed to update profile' };
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, signup, logout, loading, updateProfile }}>
            {children}
        </AuthContext.Provider>
    );
}

// --- App Component (Main Router) ---
function App() {
    const { user, loading } = useContext(AuthContext);
    const [currentPage, setCurrentPage] = useState('login'); // 'login', 'signup', 'dashboard', 'productDetail', 'profile'
    const [selectedProductId, setSelectedProductId] = useState(null);

    useEffect(() => {
        if (!loading) {
            if (user) {
                setCurrentPage('dashboard');
            } else {
                setCurrentPage('login');
            }
        }
    }, [user, loading]);

    const navigateTo = (page, productId = null) => {
        setCurrentPage(page);
        setSelectedProductId(productId);
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: '600', color: '#4b5563' }}>Loading application...</div>
            </div>
        );
    }

    let content;
    switch (currentPage) {
        case 'login':
            content = <LoginPage navigateTo={navigateTo} />;
            break;
        case 'signup':
            content = <SignupPage navigateTo={navigateTo} />;
            break;
        case 'dashboard':
            content = <DashboardPage navigateTo={navigateTo} />;
            break;
        case 'productDetail':
            content = <ProductDetailView productId={selectedProductId} navigateTo={navigateTo} />;
            break;
        case 'profile':
            content = <ProfilePage navigateTo={navigateTo} />;
            break;
        default:
            content = <LoginPage navigateTo={navigateTo} />;
    }

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', fontFamily: 'Inter, sans-serif', WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale' }}>
            {user && <Navbar navigateTo={navigateTo} username={user.username} />}
            <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem' }}>
                {content}
            </main>
        </div>
    );
}

// --- Navbar Component ---
function Navbar({ navigateTo, username }) {
    const { logout } = useContext(AuthContext);
    return (
        <nav style={{ background: 'linear-gradient(to right, #8b5cf6, #6366f1)', padding: '1rem', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 style={{ color: 'white', fontSize: '1.5rem', fontWeight: 'bold', cursor: 'pointer' }} onClick={() => navigateTo('dashboard')}>
                    Auto Product Manager
                </h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ color: 'white', fontSize: '1.125rem' }}>Hello, {username}!</span>
                    <button
                        onClick={() => navigateTo('profile')}
                        style={{ backgroundColor: 'white', color: '#7c3aed', padding: '0.5rem 1rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', transition: 'all 0.3s ease-in-out', transform: 'scale(1)', border: 'none', cursor: 'pointer' }}
                        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        Profile
                    </button>
                    <button
                        onClick={logout}
                        style={{ backgroundColor: '#ef4444', color: 'white', padding: '0.5rem 1rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', transition: 'all 0.3s ease-in-out', transform: 'scale(1)', border: 'none', cursor: 'pointer' }}
                        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        Logout
                    </button>
                </div>
            </div>
        </nav>
    );
}

// --- Login Page Component ---
function LoginPage({ navigateTo }) {
    const { login } = useContext(AuthContext);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        const result = await login(email, password);
        if (result.success) {
            navigateTo('dashboard');
        } else {
            setMessage(result.message);
        }
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 80px)' }}>
            <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '0.5rem', boxShadow: '0 10px 15px rgba(0, 0, 0, 0.1)', width: '100%', maxWidth: '448px' }}>
                <h2 style={{ fontSize: '1.875rem', fontWeight: 'bold', textAlign: 'center', color: '#1f2937', marginBottom: '1.5rem' }}>Login</h2>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', color: '#374151', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }} htmlFor="email">
                            Email
                        </label>
                        <input
                            type="email"
                            id="email"
                            style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid #d1d5db', borderRadius: '0.5rem', width: '100%', padding: '0.75rem 1rem', color: '#374151', outline: 'none', transition: 'box-shadow 0.2s, border-color 0.2s', WebkitAppearance: 'none' }}
                            onFocus={(e) => { e.target.style.borderColor = '#8b5cf6'; e.target.style.boxShadow = '0 0 0 2px rgba(139, 92, 246, 0.5)'; }}
                            onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'; }}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', color: '#374151', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }} htmlFor="password">
                            Password
                        </label>
                        <input
                            type="password"
                            id="password"
                            style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid #d1d5db', borderRadius: '0.5rem', width: '100%', padding: '0.75rem 1rem', color: '#374151', outline: 'none', transition: 'box-shadow 0.2s, border-color 0.2s', WebkitAppearance: 'none' }}
                            onFocus={(e) => { e.target.style.borderColor = '#8b5cf6'; e.target.style.boxShadow = '0 0 0 2px rgba(139, 92, 246, 0.5)'; }}
                            onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'; }}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        style={{ width: '100%', backgroundColor: '#8b5cf6', color: 'white', fontWeight: 'bold', padding: '0.75rem 1rem', borderRadius: '0.5rem', outline: 'none', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', transition: 'all 0.3s ease-in-out', transform: 'scale(1)', border: 'none', cursor: 'pointer' }}
                        onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#7c3aed'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#8b5cf6'; e.currentTarget.style.transform = 'scale(1)'; }}
                    >
                        Login
                    </button>
                </form>
                {message && <p style={{ marginTop: '1rem', textAlign: 'center', color: '#ef4444' }}>{message}</p>}
                <p style={{ marginTop: '1.5rem', textAlign: 'center', color: '#4b5563' }}>
                    Don't have an account?{' '}
                    <button
                        onClick={() => navigateTo('signup')}
                        style={{ color: '#8b5cf6', textDecoration: 'underline', fontWeight: 'bold', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                        Sign Up
                    </button>
                </p>
            </div>
        </div>
    );
}

// --- Signup Page Component ---
function SignupPage({ navigateTo }) {
    const { signup } = useContext(AuthContext);
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        const result = await signup(email, password, username);
        setMessage(result.message);
        if (result.success) {
            setEmail('');
            setUsername('');
            setPassword('');
            setTimeout(() => navigateTo('login'), 3000); // Redirect after 3 seconds
        }
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 80px)' }}>
            <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '0.5rem', boxShadow: '0 10px 15px rgba(0, 0, 0, 0.1)', width: '100%', maxWidth: '448px' }}>
                <h2 style={{ fontSize: '1.875rem', fontWeight: 'bold', textAlign: 'center', color: '#1f2937', marginBottom: '1.5rem' }}>Sign Up</h2>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', color: '#374151', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }} htmlFor="email">
                            Email
                        </label>
                        <input
                            type="email"
                            id="email"
                            style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid #d1d5db', borderRadius: '0.5rem', width: '100%', padding: '0.75rem 1rem', color: '#374151', outline: 'none', transition: 'box-shadow 0.2s, border-color 0.2s', WebkitAppearance: 'none' }}
                            onFocus={(e) => { e.target.style.borderColor = '#8b5cf6'; e.target.style.boxShadow = '0 0 0 2px rgba(139, 92, 246, 0.5)'; }}
                            onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'; }}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', color: '#374151', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }} htmlFor="username">
                            Username
                        </label>
                        <input
                            type="text"
                            id="username"
                            style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid #d1d5db', borderRadius: '0.5rem', width: '100%', padding: '0.75rem 1rem', color: '#374151', outline: 'none', transition: 'box-shadow 0.2s, border-color 0.2s', WebkitAppearance: 'none' }}
                            onFocus={(e) => { e.target.style.borderColor = '#8b5cf6'; e.target.style.boxShadow = '0 0 0 2px rgba(139, 92, 246, 0.5)'; }}
                            onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'; }}
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', color: '#374151', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }} htmlFor="password">
                            Password
                        </label>
                        <input
                            type="password"
                            id="password"
                            style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid #d1d5db', borderRadius: '0.5rem', width: '100%', padding: '0.75rem 1rem', color: '#374151', outline: 'none', transition: 'box-shadow 0.2s, border-color 0.2s', WebkitAppearance: 'none' }}
                            onFocus={(e) => { e.target.style.borderColor = '#8b5cf6'; e.target.style.boxShadow = '0 0 0 2px rgba(139, 92, 246, 0.5)'; }}
                            onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'; }}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        style={{ width: '100%', backgroundColor: '#8b5cf6', color: 'white', fontWeight: 'bold', padding: '0.75rem 1rem', borderRadius: '0.5rem', outline: 'none', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', transition: 'all 0.3s ease-in-out', transform: 'scale(1)', border: 'none', cursor: 'pointer' }}
                        onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#7c3aed'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#8b5cf6'; e.currentTarget.style.transform = 'scale(1)'; }}
                    >
                        Sign Up
                    </button>
                </form>
                {message && <p style={{ marginTop: '1rem', textAlign: 'center', color: '#10b981' }}>{message}</p>}
                <p style={{ marginTop: '1.5rem', textAlign: 'center', color: '#4b5563' }}>
                    Already have an account?{' '}
                    <button
                        onClick={() => navigateTo('login')}
                        style={{ color: '#8b5cf6', textDecoration: 'underline', fontWeight: 'bold', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                        Login
                    </button>
                </p>
            </div>
        </div>
    );
}

// --- Profile Page Component ---
function ProfilePage({ navigateTo }) {
    const { user, updateProfile } = useContext(AuthContext);
    const [username, setUsername] = useState(user?.username || '');
    const [timezone, setTimezone] = useState(user?.timezone || 'UTC+05:30 (Chennai)');
    const [message, setMessage] = useState('');

    const handleUpdate = async (e) => {
        e.preventDefault();
        setMessage('');
        const result = await updateProfile(username, timezone);
        setMessage(result.message);
        if (result.success) {
            setTimeout(() => setMessage(''), 3000); // Clear message after 3 seconds
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 80px)' }}>
            <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '0.5rem', boxShadow: '0 10px 15px rgba(0, 0, 0, 0.1)', width: '100%', maxWidth: '448px' }}>
                <h2 style={{ fontSize: '1.875rem', fontWeight: 'bold', textAlign: 'center', color: '#1f2937', marginBottom: '1.5rem' }}>User Profile</h2>
                <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', color: '#374151', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }} htmlFor="email">
                            Email (Read-only)
                        </label>
                        <input
                            type="email"
                            id="email"
                            style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid #d1d5db', borderRadius: '0.5rem', width: '100%', padding: '0.75rem 1rem', color: '#374151', backgroundColor: '#e5e7eb', cursor: 'not-allowed' }}
                            value={user?.email || ''}
                            disabled
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', color: '#374151', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }} htmlFor="username">
                            Username
                        </label>
                        <input
                            type="text"
                            id="username"
                            style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid #d1d5db', borderRadius: '0.5rem', width: '100%', padding: '0.75rem 1rem', color: '#374151', outline: 'none', transition: 'box-shadow 0.2s, border-color 0.2s', WebkitAppearance: 'none' }}
                            onFocus={(e) => { e.target.style.borderColor = '#8b5cf6'; e.target.style.boxShadow = '0 0 0 2px rgba(139, 92, 246, 0.5)'; }}
                            onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'; }}
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', color: '#374151', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }} htmlFor="timezone">
                            Timezone
                        </label>
                        <input
                            type="text"
                            id="timezone"
                            style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid #d1d5db', borderRadius: '0.5rem', width: '100%', padding: '0.75rem 1rem', color: '#374151', outline: 'none', transition: 'box-shadow 0.2s, border-color 0.2s', WebkitAppearance: 'none' }}
                            onFocus={(e) => { e.target.style.borderColor = '#8b5cf6'; e.target.style.boxShadow = '0 0 0 2px rgba(139, 92, 246, 0.5)'; }}
                            onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'; }}
                            value={timezone}
                            onChange={(e) => setTimezone(e.target.value)}
                        />
                    </div>
                    <button
                        type="submit"
                        style={{ width: '100%', backgroundColor: '#8b5cf6', color: 'white', fontWeight: 'bold', padding: '0.75rem 1rem', borderRadius: '0.5rem', outline: 'none', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', transition: 'all 0.3s ease-in-out', transform: 'scale(1)', border: 'none', cursor: 'pointer' }}
                        onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#7c3aed'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#8b5cf6'; e.currentTarget.style.transform = 'scale(1)'; }}
                    >
                        Update Profile
                    </button>
                </form>
                {message && (
                    <p style={{ marginTop: '1rem', textAlign: 'center', color: message.includes('success') ? '#10b981' : '#ef4444' }}>
                        {message}
                    </p>
                )}
                <button
                    onClick={() => navigateTo('dashboard')}
                    style={{ marginTop: '1.5rem', width: '100%', backgroundColor: '#d1d5db', color: '#374151', fontWeight: 'bold', padding: '0.75rem 1rem', borderRadius: '0.5rem', outline: 'none', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', transition: 'all 0.3s ease-in-out', transform: 'scale(1)', border: 'none', cursor: 'pointer' }}
                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#9ca3af'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#d1d5db'; e.currentTarget.style.transform = 'scale(1)'; }}
                >
                    Back to Dashboard
                </button>
            </div>
        </div>
    );
}


// --- Dashboard Page Component ---
function DashboardPage({ navigateTo }) {
    const { user } = useContext(AuthContext);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newProductName, setNewProductName] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const fetchProducts = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetcher.get('/products');
            setProducts(response.data);
        } catch (err) {
            console.error('Error fetching products:', err);
            setError('Failed to fetch products. Please try again.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (user) {
            fetchProducts();
        }
    }, [user, fetchProducts]);

    const handleCreateProduct = async (e) => {
        e.preventDefault();
        try {
            await fetcher.post('/products', { name: newProductName });
            setNewProductName('');
            setShowCreateModal(false);
            fetchProducts(); // Refresh the list
        } catch (err) {
            console.error('Error creating product:', err);
            setError('Failed to create product. Please try again.');
        }
    };

    const handleDeleteProduct = async (productId) => {
        if (window.confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
            try {
                await fetcher.delete(`/products/${productId}`);
                fetchProducts(); // Refresh the list
            } catch (err) {
                console.error('Error deleting product:', err);
                setError('Failed to delete product. Please try again.');
            }
        }
    };

    const filteredProducts = products.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) return <div style={{ textAlign: 'center', marginTop: '2rem' }}>Loading products...</div>;
    if (error) return <div style={{ textAlign: 'center', marginTop: '2rem', color: '#ef4444' }}>{error}</div>;

    return (
        <div style={{ marginTop: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#1f2937' }}>My Products</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <input
                        type="text"
                        placeholder="Search products..."
                        style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid #d1d5db', borderRadius: '0.5rem', padding: '0.5rem 0.75rem', color: '#374151', outline: 'none', transition: 'box-shadow 0.2s, border-color 0.2s', WebkitAppearance: 'none' }}
                        onFocus={(e) => { e.target.style.borderColor = '#8b5cf6'; e.target.style.boxShadow = '0 0 0 2px rgba(139, 92, 246, 0.5)'; }}
                        onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'; }}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <button
                        onClick={() => setShowCreateModal(true)}
                        style={{ backgroundColor: '#22c55e', color: 'white', fontWeight: 'bold', padding: '0.5rem 1rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', transition: 'all 0.3s ease-in-out', transform: 'scale(1)', border: 'none', cursor: 'pointer' }}
                        onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#16a34a'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#22c55e'; e.currentTarget.style.transform = 'scale(1)'; }}
                    >
                        + Create New Product
                    </button>
                </div>
            </div>

            {filteredProducts.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#4b5563', fontSize: '1.125rem' }}>No products found. Start by creating one!</p>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    {filteredProducts.map((product) => (
                        <div key={product.id} style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)', transition: 'box-shadow 0.3s', cursor: 'pointer' }}
                            onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 10px 15px rgba(0, 0, 0, 0.1)'}
                            onMouseOut={(e) => e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)'}
                        >
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 'semibold', color: '#111827', marginBottom: '0.5rem' }}>{product.name}</h3>
                            <p style={{ color: '#4b5563', fontSize: '0.875rem', marginBottom: '1rem' }}>Status: <span style={{ fontWeight: 'medium', color: product.status === 'Active' ? '#10b981' : '#d97706' }}>{product.status}</span></p>
                            <div style={{ width: '100%', backgroundColor: '#e5e7eb', borderRadius: '9999px', height: '0.625rem', marginBottom: '1rem' }}>
                                <div style={{ backgroundColor: '#8b5cf6', height: '0.625rem', borderRadius: '9999px', width: `${product.progress}%` }}></div>
                            </div>
                            <p style={{ color: '#4b5563', fontSize: '0.875rem', marginBottom: '1rem' }}>Progress: {product.progress}%</p>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                <button
                                    onClick={() => navigateTo('productDetail', product.id)}
                                    style={{ backgroundColor: '#3b82f6', color: 'white', fontSize: '0.875rem', padding: '0.25rem 0.75rem', borderRadius: '0.5rem', transition: 'all 0.3s ease-in-out', transform: 'scale(1)', border: 'none', cursor: 'pointer' }}
                                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#2563eb'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#3b82f6'; e.currentTarget.style.transform = 'scale(1)'; }}
                                >
                                    View Details
                                </button>
                                <button
                                    onClick={() => handleDeleteProduct(product.id)}
                                    style={{ backgroundColor: '#ef4444', color: 'white', fontSize: '0.875rem', padding: '0.25rem 0.75rem', borderRadius: '0.5rem', transition: 'all 0.3s ease-in-out', transform: 'scale(1)', border: 'none', cursor: 'pointer' }}
                                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#dc2626'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#ef4444'; e.currentTarget.style.transform = 'scale(1)'; }}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showCreateModal && (
                <div style={{ position: 'fixed', inset: '0', backgroundColor: 'rgba(107, 114, 128, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: '50' }}>
                    <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '0.5rem', boxShadow: '0 10px 15px rgba(0, 0, 0, 0.1)', width: '100%', maxWidth: '448px' }}>
                        <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '1rem' }}>Create New Product</h3>
                        <form onSubmit={handleCreateProduct} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', color: '#374151', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }} htmlFor="productName">
                                    Product Name
                                </label>
                                <input
                                    type="text"
                                    id="productName"
                                    style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid #d1d5db', borderRadius: '0.5rem', width: '100%', padding: '0.75rem 1rem', color: '#374151', outline: 'none', transition: 'box-shadow 0.2s, border-color 0.2s', WebkitAppearance: 'none' }}
                                    onFocus={(e) => { e.target.style.borderColor = '#8b5cf6'; e.target.style.boxShadow = '0 0 0 2px rgba(139, 92, 246, 0.5)'; }}
                                    onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'; }}
                                    value={newProductName}
                                    onChange={(e) => setNewProductName(e.target.value)}
                                    required
                                />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    style={{ backgroundColor: '#d1d5db', color: '#374151', fontWeight: 'bold', padding: '0.5rem 1rem', borderRadius: '0.5rem', transition: 'all 0.3s ease-in-out', border: 'none', cursor: 'pointer' }}
                                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#9ca3af'}
                                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#d1d5db'}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    style={{ backgroundColor: '#8b5cf6', color: 'white', fontWeight: 'bold', padding: '0.5rem 1rem', borderRadius: '0.5rem', transition: 'all 0.3s ease-in-out', border: 'none', cursor: 'pointer' }}
                                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#7c3aed'}
                                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#8b5cf6'}
                                >
                                    Create Product
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

// --- ProductDetailView Component ---
function ProductDetailView({ productId, navigateTo }) {
    const { user } = useContext(AuthContext);
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'research', 'prd', 'design', 'development', 'tech_doc', 'launch_training', 'important_notes', 'interviews', 'templates', 'tasks', 'collaboration'
    const [editMode, setEditMode] = useState(false);
    const [editedProduct, setEditedProduct] = useState(null);

    const fetchProduct = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetcher.get(`/products/${productId}`);
            setProduct(response.data);
            setEditedProduct(response.data); // Initialize editedProduct with fetched data
        } catch (err) {
            console.error('Error fetching product details:', err);
            setError('Failed to fetch product details.');
        } finally {
            setLoading(false);
        }
    }, [productId]);

    useEffect(() => {
        if (user && productId) {
            fetchProduct();
        }
    }, [user, productId, fetchProduct]);

    const handleUpdateProduct = async (e) => {
        e.preventDefault();
        try {
            const response = await fetcher.put(`/products/${productId}`, editedProduct);
            setProduct(response.data);
            setEditMode(false);
            alert('Product updated successfully!');
        } catch (err) {
            console.error('Error updating product:', err);
            setError('Failed to update product.');
            alert('Failed to update product. Check console for details.');
        }
    };

    const handleStatusChange = (newStatus) => {
        setEditedProduct(prev => ({ ...prev, status: newStatus }));
    };

    const handleTabStatusChange = (tabName, newStatus) => {
        setEditedProduct(prev => ({ ...prev, [`${tabName}_status`]: newStatus }));
    };

    const handleContentChange = (tabName, content) => {
        setEditedProduct(prev => ({ ...prev, [`${tabName}_json`]: content }));
    };

    // Determine if the current user is the owner of the product
    const isProductOwner = product && user && product.user_id === user.id;
    // Determine if the current user has editor role (owner implicitly has editor)
    const isEditor = isProductOwner || (product && product.product_accesses && product.product_accesses.some(pa => pa.user_email === user.email && (pa.role === 'editor' || pa.role === 'owner')));


    if (loading) return <div style={{ textAlign: 'center', marginTop: '2rem' }}>Loading product details...</div>;
    if (error) return <div style={{ textAlign: 'center', marginTop: '2rem', color: '#ef4444' }}>{error}</div>;
    if (!product) return <div style={{ textAlign: 'center', marginTop: '2rem' }}>Product not found.</div>;

    return (
        <div style={{ marginTop: '2rem', backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 10px 15px rgba(0, 0, 0, 0.1)' }}>
            <button
                onClick={() => navigateTo('dashboard')}
                style={{ marginBottom: '1rem', backgroundColor: '#d1d5db', color: '#374151', fontWeight: 'bold', padding: '0.5rem 1rem', borderRadius: '0.5rem', transition: 'all 0.3s ease-in-out', transform: 'scale(1)', border: 'none', cursor: 'pointer' }}
                onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#9ca3af'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#d1d5db'; e.currentTarget.style.transform = 'scale(1)'; }}
            >
                &larr; Back to Dashboard
            </button>

            <h2 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '1rem' }}>{product.name}</h2>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ color: '#374151', fontSize: '1.125rem' }}>Status:</span>
                    {editMode && isEditor ? ( // Only allow edit if user is editor
                        <select
                            value={editedProduct.status}
                            onChange={(e) => handleStatusChange(e.target.value)}
                            style={{ border: '1px solid #d1d5db', borderRadius: '0.5rem', padding: '0.5rem 0.75rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', outline: 'none', transition: 'box-shadow 0.2s, border-color 0.2s' }}
                            onFocus={(e) => { e.target.style.borderColor = '#8b5cf6'; e.target.style.boxShadow = '0 0 0 2px rgba(139, 92, 246, 0.5)'; }}
                            onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'; }}
                        >
                            {['Active', 'Completed', 'Cancelled', 'On-Hold'].map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    ) : (
                        <span style={{ fontWeight: 'semibold', fontSize: '1.125rem', color: product.status === 'Active' ? '#10b981' : '#d97706' }}>
                            {product.status}
                        </span>
                    )}
                </div>
                <div>
                    {isEditor && ( // Only show edit button if user is editor
                        editMode ? (
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                    onClick={handleUpdateProduct}
                                    style={{ backgroundColor: '#22c55e', color: 'white', fontWeight: 'bold', padding: '0.5rem 1rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', transition: 'all 0.3s ease-in-out', transform: 'scale(1)', border: 'none', cursor: 'pointer' }}
                                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#16a34a'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#22c55e'; e.currentTarget.style.transform = 'scale(1)'; }}
                                >
                                    Save Changes
                                </button>
                                <button
                                    onClick={() => { setEditMode(false); setEditedProduct(product); }} // Revert changes
                                    style={{ backgroundColor: '#9ca3af', color: 'white', fontWeight: 'bold', padding: '0.5rem 1rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', transition: 'all 0.3s ease-in-out', transform: 'scale(1)', border: 'none', cursor: 'pointer' }}
                                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#6b7280'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#9ca3af'; e.currentTarget.style.transform = 'scale(1)'; }}
                                >
                                    Cancel
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setEditMode(true)}
                                style={{ backgroundColor: '#8b5cf6', color: 'white', fontWeight: 'bold', padding: '0.5rem 1rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', transition: 'all 0.3s ease-in-out', transform: 'scale(1)', border: 'none', cursor: 'pointer' }}
                                onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#7c3aed'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                                onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#8b5cf6'; e.currentTarget.style.transform = 'scale(1)'; }}
                            >
                                Edit Product
                            </button>
                        )
                    )}
                </div>
            </div>

            {/* Tabs Navigation */}
            <div style={{ borderBottom: '1px solid #e5e7eb', marginBottom: '1.5rem' }}>
                <nav style={{ display: 'flex', gap: '2rem' }} aria-label="Tabs">
                    {['overview', 'research', 'prd', 'design', 'development', 'tech_doc', 'launch_training', 'important_notes', 'interviews', 'templates', 'tasks', 'collaboration'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            style={{
                                whiteSpace: 'nowrap',
                                padding: '0.75rem 0.25rem',
                                borderBottom: '2px solid transparent',
                                fontWeight: 'medium',
                                fontSize: '0.875rem',
                                transition: 'all 0.2s',
                                background: 'none',
                                borderTop: 'none',
                                borderLeft: 'none',
                                borderRight: 'none',
                                cursor: 'pointer',
                                borderColor: activeTab === tab ? '#8b5cf6' : 'transparent',
                                color: activeTab === tab ? '#7c3aed' : '#6b7280',
                            }}
                            onMouseOver={(e) => {
                                if (activeTab !== tab) {
                                    e.currentTarget.style.color = '#4b5563';
                                    e.currentTarget.style.borderColor = '#d1d5db';
                                }
                            }}
                            onMouseOut={(e) => {
                                if (activeTab !== tab) {
                                    e.currentTarget.style.color = '#6b7280';
                                    e.currentTarget.style.borderColor = 'transparent';
                                }
                            }}
                        >
                            {tab.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab Content */}
            <div className="tab-content">
                {activeTab === 'overview' && (
                    <OverviewTab product={product} />
                )}
                {activeTab === 'research' && (
                    <ResearchTab
                        product={product}
                        editMode={editMode && isEditor} // Pass editMode only if user is editor
                        onContentChange={(content) => handleContentChange('research_document', content)}
                        onStatusChange={(status) => handleTabStatusChange('research', status)}
                    />
                )}
                {activeTab === 'prd' && (
                    <PRDTab
                        product={product}
                        editMode={editMode && isEditor}
                        onContentChange={(content) => handleContentChange('prd_document', content)}
                        onStatusChange={(status) => handleTabStatusChange('prd', status)}
                    />
                )}
                {activeTab === 'design' && (
                    <GenericContentTab
                        title="Design Notes"
                        product={product}
                        contentKey="design_notes_json"
                        statusKey="design_status"
                        editMode={editMode && isEditor}
                        onContentChange={(content) => handleContentChange('design_notes', content)}
                        onStatusChange={(status) => handleTabStatusChange('design', status)}
                    />
                )}
                {activeTab === 'development' && (
                    <GenericContentTab
                        title="Development Specifications"
                        product={product}
                        contentKey="dev_specs_json"
                        statusKey="development_status"
                        editMode={editMode && isEditor}
                        onContentChange={(content) => handleContentChange('dev_specs', content)}
                        onStatusChange={(status) => handleTabStatusChange('development', status)}
                    />
                )}
                {activeTab === 'tech_doc' && (
                    <GenericContentTab
                        title="Technical Documentation"
                        product={product}
                        contentKey="tech_doc_json"
                        statusKey="tech_doc_status"
                        editMode={editMode && isEditor}
                        onContentChange={(content) => handleContentChange('tech_doc', content)}
                        onStatusChange={(status) => handleTabStatusChange('tech_doc', status)}
                    />
                )}
                {activeTab === 'launch_training' && (
                    <GenericContentTab
                        title="Launch & Training"
                        product={product}
                        contentKey="launch_training_json"
                        statusKey="launch_training_status"
                        editMode={editMode && isEditor}
                        onContentChange={(content) => handleContentChange('launch_training', content)}
                        onStatusChange={(status) => handleTabStatusChange('launch_training', status)}
                    />
                )}
                 {activeTab === 'important_notes' && (
                    <GenericContentTab
                        title="Important Notes"
                        product={product}
                        contentKey="important_notes_json"
                        statusKey="important_notes_status" // Note: This status key doesn't exist in backend, but keeping for consistency if added later
                        editMode={editMode && isEditor}
                        onContentChange={(content) => handleContentChange('important_notes', content)}
                        onStatusChange={(status) => handleTabStatusChange('important_notes', status)}
                    />
                )}
                {activeTab === 'interviews' && (
                    <CustomerInterviewTab productId={productId} isEditor={isEditor} />
                )}
                {activeTab === 'templates' && (
                    <InterviewTemplateTab />
                )}
                {activeTab === 'tasks' && (
                    <TaskTab productId={productId} isEditor={isEditor} />
                )}
                {activeTab === 'collaboration' && (
                    <CollaborationTab productId={productId} isOwner={isProductOwner} />
                )}
            </div>
        </div>
    );
}

// --- Overview Tab Component ---
function OverviewTab({ product }) {
    // Helper to format date
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 'semibold', color: '#1f2937', marginBottom: '1rem' }}>Product Overview</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                <p style={{ color: '#374151' }}><strong>Product Name:</strong> {product.name}</p>
                <p style={{ color: '#374151' }}><strong>Status:</strong> <span style={{ fontWeight: 'medium', color: product.status === 'Active' ? '#10b981' : '#d97706' }}>{product.status}</span></p>
                <p style={{ color: '#374151' }}><strong>Archived:</strong> {product.is_archived ? 'Yes' : 'No'}</p>
                <p style={{ color: '#374151' }}><strong>Overall Progress:</strong> {product.progress}%</p>
                <p style={{ color: '#374151' }}><strong>Created At:</strong> {formatDate(product.created_at)}</p>
                <p style={{ color: '#374151' }}><strong>Last Updated:</strong> {formatDate(product.updated_at)}</p>
            </div>

            <h4 style={{ fontSize: '1.25rem', fontWeight: 'semibold', color: '#1f2937', marginTop: '1.5rem', marginBottom: '0.75rem' }}>Section Progress</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                {['research', 'prd', 'design', 'development', 'tech_doc', 'launch_training'].map(section => (
                    <div key={section} style={{ backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)' }}>
                        <p style={{ fontWeight: 'medium', color: '#1f2937' }}>{section.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}:</p>
                        <span style={{ fontSize: '0.875rem', fontWeight: 'semibold', color: product[`${section}_status`] === 'Completed' ? '#10b981' : product[`${section}_status`] === 'In Progress' ? '#3b82f6' : '#6b7280' }}>
                            {product[`${section}_status`]}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}


// --- Generic Content Tab Component (for Design, Dev, Tech Doc, Launch, Important Notes) ---
function GenericContentTab({ title, product, contentKey, statusKey, editMode, onContentChange, onStatusChange }) {
    const [content, setContent] = useState(product[contentKey] || '');
    const [status, setStatus] = useState(product[statusKey] || 'Not Started');

    useEffect(() => {
        setContent(product[contentKey] || '');
        setStatus(product[statusKey] || 'Not Started');
    }, [product, contentKey, statusKey]);

    const handleContentUpdate = (e) => {
        const newContent = e.target.value;
        setContent(newContent);
        onContentChange(newContent);
    };

    const handleStatusUpdate = (e) => {
        const newStatus = e.target.value;
        setStatus(newStatus);
        onStatusChange(newStatus);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 'semibold', color: '#1f2937', marginBottom: '1rem' }}>{title}</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <span style={{ color: '#374151', fontSize: '1.125rem' }}>Status:</span>
                {editMode ? (
                    <select
                        value={status}
                        onChange={handleStatusUpdate}
                        style={{ border: '1px solid #d1d5db', borderRadius: '0.5rem', padding: '0.5rem 0.75rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', outline: 'none', transition: 'box-shadow 0.2s, border-color 0.2s' }}
                        onFocus={(e) => { e.target.style.borderColor = '#8b5cf6'; e.target.style.boxShadow = '0 0 0 2px rgba(139, 92, 246, 0.5)'; }}
                        onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'; }}
                    >
                        {['Not Started', 'In Progress', 'Completed', 'Skipped'].map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                ) : (
                    <span style={{ fontWeight: 'semibold', fontSize: '1.125rem', color: status === 'Completed' ? '#10b981' : '#4b5563' }}>
                        {status}
                    </span>
                )}
            </div>
            {editMode ? (
                <textarea
                    style={{ width: '100%', padding: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', outline: 'none', transition: 'box-shadow 0.2s, border-color 0.2s', minHeight: '300px' }}
                    onFocus={(e) => { e.target.style.borderColor = '#8b5cf6'; e.target.style.boxShadow = '0 0 0 2px rgba(139, 92, 246, 0.5)'; }}
                    onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'; }}
                    value={content}
                    onChange={handleContentUpdate}
                    placeholder={`Enter ${title} here...`}
                />
            ) : (
                <div style={{ backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '0.5rem', boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.05)', lineHeight: '1.6', color: '#374151' }} dangerouslySetInnerHTML={{ __html: content ? content.replace(/\n/g, '<br/>') : '<p style="color: #6b7280;">No content available.</p>' }} />
            )}
        </div>
    );
}

// --- Research Tab Component ---
function ResearchTab({ product, editMode, onContentChange, onStatusChange }) {
    const [prompt, setPrompt] = useState('');
    const [loadingAI, setLoadingAI] = useState(false);
    const [aiError, setAiError] = useState(null);

    const handleGenerateResearch = async () => {
        if (!prompt) {
            setAiError('Please enter a prompt for research generation.');
            return;
        }
        setLoadingAI(true);
        setAiError(null);
        try {
            const response = await fetcher.post('/generate-research-document', {
                product_id: product.id,
                prompt_text: prompt,
                // scraped_data: "Example scraped data from Octoparse/ScrapingBee..." // Integrate this in future
            });
            onContentChange(response.data.research_document);
            onStatusChange('Completed');
            alert('Research document generated and saved!');
        } catch (err) {
            console.error('Error generating research document:', err.response?.data || err.message);
            setAiError(err.response?.data?.error || 'Failed to generate research document.');
        } finally {
            setLoadingAI(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 'semibold', color: '#1f2937', marginBottom: '1rem' }}>Market Research</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <span style={{ color: '#374151', fontSize: '1.125rem' }}>Status:</span>
                {editMode ? (
                    <select
                        value={product.research_status}
                        onChange={(e) => onStatusChange(e.target.value)}
                        style={{ border: '1px solid #d1d5db', borderRadius: '0.5rem', padding: '0.5rem 0.75rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', outline: 'none', transition: 'box-shadow 0.2s, border-color 0.2s' }}
                        onFocus={(e) => { e.target.style.borderColor = '#8b5cf6'; e.target.style.boxShadow = '0 0 0 2px rgba(139, 92, 246, 0.5)'; }}
                        onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'; }}
                    >
                        {['Not Started', 'In Progress', 'Completed', 'Skipped'].map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                ) : (
                    <span style={{ fontWeight: 'semibold', fontSize: '1.125rem', color: product.research_status === 'Completed' ? '#10b981' : '#4b5563' }}>
                        {product.research_status}
                    </span>
                )}
            </div>

            <div style={{ backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)', marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '1.25rem', fontWeight: 'semibold', color: '#1f2937', marginBottom: '0.75rem' }}>AI Research Assistant</h4>
                <textarea
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', outline: 'none', transition: 'box-shadow 0.2s, border-color 0.2s', minHeight: '100px', marginBottom: '1rem' }}
                    onFocus={(e) => { e.target.style.borderColor = '#8b5cf6'; e.target.style.boxShadow = '0 0 0 2px rgba(139, 92, 246, 0.5)'; }}
                    onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'; }}
                    placeholder="Enter product idea or research prompt for AI (e.g., 'A mobile app for tracking personal finance with budgeting features')."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    disabled={loadingAI || !editMode}
                />
                <button
                    onClick={handleGenerateResearch}
                    disabled={loadingAI || !editMode}
                    style={{
                        padding: '0.5rem 1.5rem',
                        borderRadius: '0.5rem',
                        fontWeight: 'bold',
                        color: 'white',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        transition: 'all 0.3s ease-in-out',
                        transform: 'scale(1)',
                        border: 'none',
                        cursor: loadingAI || !editMode ? 'not-allowed' : 'pointer',
                        backgroundColor: loadingAI || !editMode ? '#9ca3af' : '#8b5cf6',
                    }}
                    onMouseOver={(e) => {
                        if (!loadingAI && editMode) {
                            e.currentTarget.style.backgroundColor = '#7c3aed';
                            e.currentTarget.style.transform = 'scale(1.05)';
                        }
                    }}
                    onMouseOut={(e) => {
                        if (!loadingAI && editMode) {
                            e.currentTarget.style.backgroundColor = '#8b5cf6';
                            e.currentTarget.style.transform = 'scale(1)';
                        }
                    }}
                >
                    {loadingAI ? 'Generating...' : 'Generate Research Document'}
                </button>
                {aiError && <p style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '0.5rem' }}>{aiError}</p>}
            </div>

            <h4 style={{ fontSize: '1.25rem', fontWeight: 'semibold', color: '#1f2937', marginBottom: '0.75rem' }}>Research Document Content</h4>
            {editMode ? (
                <textarea
                    style={{ width: '100%', padding: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', outline: 'none', transition: 'box-shadow 0.2s, border-color 0.2s', minHeight: '400px' }}
                    onFocus={(e) => { e.target.style.borderColor = '#8b5cf6'; e.target.style.boxShadow = '0 0 0 2px rgba(139, 92, 246, 0.5)'; }}
                    onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'; }}
                    value={product.research_document_json || ''}
                    onChange={(e) => onContentChange(e.target.value)}
                    placeholder="AI-generated or manually entered research content will appear here."
                />
            ) : (
                <div style={{ backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '0.5rem', boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.05)', lineHeight: '1.6', color: '#374151' }} dangerouslySetInnerHTML={{ __html: product.research_document_json ? product.research_document_json.replace(/\n/g, '<br/>') : '<p style="color: #6b7280;">No research document available.</p>' }} />
            )}
        </div>
    );
}

// --- PRD Tab Component ---
function PRDTab({ product, editMode, onContentChange, onStatusChange }) {
    const [userRequirements, setUserRequirements] = useState('');
    const [prdStructureConfirmation, setPrdStructureConfirmation] = useState('Standard PRD structure (Problem, Goals, Audience, Features, NFRs, Metrics, Future)');
    const [loadingAI, setLoadingAI] = useState(false);
    const [aiError, setAiError] = useState(null);

    const handleGeneratePRD = async () => {
        if (!product.research_document_json) {
            setAiError('Please generate or provide a Research Document first.');
            return;
        }
        if (!userRequirements) {
            setAiError('Please provide user-specific requirements for the PRD.');
            return;
        }
        setLoadingAI(true);
        setAiError(null);
        try {
            const response = await fetcher.post('/generate-prd-document', {
                product_id: product.id,
                research_data: product.research_document_json,
                user_requirements: userRequirements,
                prd_structure_confirmation: prdStructureConfirmation,
            });
            onContentChange(response.data.prd_document);
            onStatusChange('Completed');
            alert('PRD generated and saved!');
        } catch (err) {
            console.error('Error generating PRD:', err.response?.data || err.message);
            setAiError(err.response?.data?.error || 'Failed to generate PRD.');
        } finally {
            setLoadingAI(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 'semibold', color: '#1f2937', marginBottom: '1rem' }}>Product Requirements Document (PRD)</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <span style={{ color: '#374151', fontSize: '1.125rem' }}>Status:</span>
                {editMode ? (
                    <select
                        value={product.prd_status}
                        onChange={(e) => onStatusChange(e.target.value)}
                        style={{ border: '1px solid #d1d5db', borderRadius: '0.5rem', padding: '0.5rem 0.75rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', outline: 'none', transition: 'box-shadow 0.2s, border-color 0.2s' }}
                        onFocus={(e) => { e.target.style.borderColor = '#8b5cf6'; e.target.style.boxShadow = '0 0 0 2px rgba(139, 92, 246, 0.5)'; }}
                        onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'; }}
                    >
                        {['Not Started', 'In Progress', 'Completed', 'Skipped'].map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                ) : (
                    <span style={{ fontWeight: 'semibold', fontSize: '1.125rem', color: product.prd_status === 'Completed' ? '#10b981' : '#4b5563' }}>
                        {product.prd_status}
                    </span>
                )}
            </div>

            <div style={{ backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)', marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '1.25rem', fontWeight: 'semibold', color: '#1f2937', marginBottom: '0.75rem' }}>AI PRD Generator</h4>
                <p style={{ color: '#4b5563', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                    *Note: A Research Document is highly recommended before generating a PRD for best results.
                </p>
                <textarea
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', outline: 'none', transition: 'box-shadow 0.2s, border-color 0.2s', minHeight: '100px', marginBottom: '1rem' }}
                    onFocus={(e) => { e.target.style.borderColor = '#8b5cf6'; e.target.style.boxShadow = '0 0 0 2px rgba(139, 92, 246, 0.5)'; }}
                    onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'; }}
                    placeholder="Enter user-specific requirements or additional details for the PRD (e.g., 'Focus on mobile-first design, integrate with Stripe for payments')."
                    value={userRequirements}
                    onChange={(e) => setUserRequirements(e.target.value)}
                    disabled={loadingAI || !editMode}
                />
                <textarea
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', outline: 'none', transition: 'box-shadow 0.2s, border-color 0.2s', minHeight: '80px', marginBottom: '1rem' }}
                    onFocus={(e) => { e.target.style.borderColor = '#8b5cf6'; e.target.style.boxShadow = '0 0 0 2px rgba(139, 92, 246, 0.5)'; }}
                    onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'; }}
                    placeholder="Confirm or suggest a PRD structure (e.g., 'Standard PRD structure' or 'Include detailed user stories')."
                    value={prdStructureConfirmation}
                    onChange={(e) => setPrdStructureConfirmation(e.target.value)}
                    disabled={loadingAI || !editMode}
                />
                <button
                    onClick={handleGeneratePRD}
                    disabled={loadingAI || !editMode}
                    style={{
                        padding: '0.5rem 1.5rem',
                        borderRadius: '0.5rem',
                        fontWeight: 'bold',
                        color: 'white',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        transition: 'all 0.3s ease-in-out',
                        transform: 'scale(1)',
                        border: 'none',
                        cursor: loadingAI || !editMode ? 'not-allowed' : 'pointer',
                        backgroundColor: loadingAI || !editMode ? '#9ca3af' : '#8b5cf6',
                    }}
                    onMouseOver={(e) => {
                        if (!loadingAI && editMode) {
                            e.currentTarget.style.backgroundColor = '#7c3aed';
                            e.currentTarget.style.transform = 'scale(1.05)';
                        }
                    }}
                    onMouseOut={(e) => {
                        if (!loadingAI && editMode) {
                            e.currentTarget.style.backgroundColor = '#8b5cf6';
                            e.currentTarget.style.transform = 'scale(1)';
                        }
                    }}
                >
                    {loadingAI ? 'Generating...' : 'Generate PRD'}
                </button>
                {aiError && <p style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '0.5rem' }}>{aiError}</p>}
            </div>

            <h4 style={{ fontSize: '1.25rem', fontWeight: 'semibold', color: '#1f2937', marginBottom: '0.75rem' }}>PRD Content</h4>
            {editMode ? (
                <textarea
                    style={{ width: '100%', padding: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', outline: 'none', transition: 'box-shadow 0.2s, border-color 0.2s', minHeight: '400px' }}
                    onFocus={(e) => { e.target.style.borderColor = '#8b5cf6'; e.target.style.boxShadow = '0 0 0 2px rgba(139, 92, 246, 0.5)'; }}
                    onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'; }}
                    value={product.prd_document_json || ''}
                    onChange={(e) => onContentChange(e.target.value)}
                    placeholder="AI-generated or manually entered PRD content will appear here."
                />
            ) : (
                <div style={{ backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '0.5rem', boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.05)', lineHeight: '1.6', color: '#374151' }} dangerouslySetInnerHTML={{ __html: product.prd_document_json ? product.prd_document_json.replace(/\n/g, '<br/>') : '<p style="color: #6b7280;">No PRD available.</p>' }} />
            )}
        </div>
    );
}

// --- Customer Interview Tab Component ---
function CustomerInterviewTab({ productId, isEditor }) {
    const { user } = useContext(AuthContext);
    const [interviews, setInterviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newInterviewData, setNewInterviewData] = useState({
        customer_name: '',
        customer_email: '',
        interview_date: new Date().toISOString().slice(0, 16), //YYYY-MM-DDTHH:MM
        interview_notes_json: '',
    });
    const [selectedInterview, setSelectedInterview] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
    const [aiSummaryError, setAiSummaryError] = useState(null);

    const fetchInterviews = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetcher.get(`/customer_interviews/product/${productId}`);
            setInterviews(response.data);
        } catch (err) {
            console.error('Error fetching interviews:', err.response?.data || err.message);
            setError('Failed to fetch interviews.');
        } finally {
            setLoading(false);
        }
    }, [productId]);

    useEffect(() => {
        if (user && productId) {
            fetchInterviews();
        }
    }, [user, productId, fetchInterviews]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewInterviewData(prev => ({ ...prev, [name]: value }));
    };

    const handleAddInterview = async (e) => {
        e.preventDefault();
        setError(null);
        try {
            await fetcher.post('/customer_interviews', {
                ...newInterviewData,
                product_id: productId,
            });
            setNewInterviewData({
                customer_name: '',
                customer_email: '',
                interview_date: new Date().toISOString().slice(0, 16),
                interview_notes_json: '',
            });
            setShowAddModal(false);
            fetchInterviews();
        } catch (err) {
            console.error('Error adding interview:', err.response?.data || err.message);
            setError(err.response?.data?.error || 'Failed to add interview.');
        }
    };

    const handleViewDetails = (interview) => {
        setSelectedInterview(interview);
        setShowDetailModal(true);
    };

    const handleUpdateInterview = async (updatedData) => {
        setError(null);
        try {
            await fetcher.put(`/customer_interviews/${updatedData.id}`, updatedData);
            fetchInterviews(); // Refresh list
            setSelectedInterview(updatedData); // Update the selected interview in modal
            alert('Interview updated successfully!');
        } catch (err) {
            console.error('Error updating interview:', err.response?.data || err.message);
            setError(err.response?.data?.error || 'Failed to update interview.');
            alert('Failed to update interview. Check console for details.');
        }
    };

    const handleDeleteInterview = async (interviewId) => {
        if (window.confirm('Are you sure you want to delete this interview?')) {
            setError(null);
            try {
                await fetcher.delete(`/customer_interviews/${interviewId}`);
                fetchInterviews();
                setShowDetailModal(false); // Close modal if deleted
            } catch (err) {
                console.error('Error deleting interview:', err.response?.data || err.message);
                setError(err.response?.data?.error || 'Failed to delete interview.');
            }
        }
    };

    const handleGenerateSummary = async (interviewId, notesContent) => {
        setAiSummaryLoading(true);
        setAiSummaryError(null);
        try {
            const response = await fetcher.post('/customer_interviews/generate_summary', {
                interview_id: interviewId,
                notes_content: notesContent,
            });
            const updatedInterview = { ...selectedInterview, ai_summary_json: response.data.ai_summary };
            setSelectedInterview(updatedInterview); // Update in modal
            // Also update in the main interviews list
            setInterviews(prev => prev.map(int => int.id === interviewId ? updatedInterview : int));
            alert('AI Summary generated and saved!');
        } catch (err) {
            console.error('Error generating AI summary:', err.response?.data || err.message);
            setAiSummaryError(err.response?.data?.error || 'Failed to generate AI summary.');
        } finally {
            setAiSummaryLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    if (loading) return <div style={{ textAlign: 'center', marginTop: '2rem' }}>Loading customer interviews...</div>;
    if (error) return <div style={{ textAlign: 'center', marginTop: '2rem', color: '#ef4444' }}>{error}</div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 'semibold', color: '#1f2937' }}>Customer Interviews</h3>
                {isEditor && (
                    <button
                        onClick={() => setShowAddModal(true)}
                        style={{ backgroundColor: '#8b5cf6', color: 'white', fontWeight: 'bold', padding: '0.5rem 1rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', transition: 'all 0.3s ease-in-out', transform: 'scale(1)', border: 'none', cursor: 'pointer' }}
                        onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#7c3aed'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#8b5cf6'; e.currentTarget.style.transform = 'scale(1)'; }}
                    >
                        + Add New Interview
                    </button>
                )}
            </div>

            {interviews.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#4b5563', fontSize: '1.125rem' }}>No interviews recorded yet.</p>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                    {interviews.map(interview => (
                        <div key={interview.id} style={{ backgroundColor: '#f9fafb', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)' }}>
                            <h4 style={{ fontSize: '1.125rem', fontWeight: 'semibold', color: '#111827', marginBottom: '0.5rem' }}>{interview.customer_name}</h4>
                            <p style={{ color: '#4b5563', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Email: {interview.customer_email || 'N/A'}</p>
                            <p style={{ color: '#4b5563', fontSize: '0.875rem', marginBottom: '1rem' }}>Date: {formatDate(interview.interview_date)}</p>
                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <button
                                    onClick={() => handleViewDetails(interview)}
                                    style={{ backgroundColor: '#3b82f6', color: 'white', fontSize: '0.875rem', padding: '0.25rem 0.75rem', borderRadius: '0.5rem', transition: 'all 0.3s ease-in-out', transform: 'scale(1)', border: 'none', cursor: 'pointer' }}
                                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#2563eb'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#3b82f6'; e.currentTarget.style.transform = 'scale(1)'; }}
                                >
                                    View Details
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showAddModal && (
                <Modal title="Add New Customer Interview" onClose={() => setShowAddModal(false)}>
                    <form onSubmit={handleAddInterview} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', color: '#374151', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Customer Name</label>
                            <input
                                type="text"
                                name="customer_name"
                                value={newInterviewData.customer_name}
                                onChange={handleInputChange}
                                style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid #d1d5db', borderRadius: '0.5rem', width: '100%', padding: '0.5rem 0.75rem', color: '#374151', outline: 'none', transition: 'box-shadow 0.2s, border-color 0.2s', WebkitAppearance: 'none' }}
                                onFocus={(e) => { e.target.style.borderColor = '#8b5cf6'; e.target.style.boxShadow = '0 0 0 2px rgba(139, 92, 246, 0.5)'; }}
                                onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'; }}
                                required
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', color: '#374151', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Customer Email</label>
                            <input
                                type="email"
                                name="customer_email"
                                value={newInterviewData.customer_email}
                                onChange={handleInputChange}
                                style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid #d1d5db', borderRadius: '0.5rem', width: '100%', padding: '0.5rem 0.75rem', color: '#374151', outline: 'none', transition: 'box-shadow 0.2s, border-color 0.2s', WebkitAppearance: 'none' }}
                                onFocus={(e) => { e.target.style.borderColor = '#8b5cf6'; e.target.style.boxShadow = '0 0 0 2px rgba(139, 92, 246, 0.5)'; }}
                                onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'; }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', color: '#374151', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Interview Date & Time</label>
                            <input
                                type="datetime-local"
                                name="interview_date"
                                value={newInterviewData.interview_date}
                                onChange={handleInputChange}
                                style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid #d1d5db', borderRadius: '0.5rem', width: '100%', padding: '0.5rem 0.75rem', color: '#374151', outline: 'none', transition: 'box-shadow 0.2s, border-color 0.2s', WebkitAppearance: 'none' }}
                                onFocus={(e) => { e.target.style.borderColor = '#8b5cf6'; e.target.style.boxShadow = '0 0 0 2px rgba(139, 92, 246, 0.5)'; }}
                                onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'; }}
                                required
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', color: '#374151', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Interview Notes</label>
                            <textarea
                                name="interview_notes_json"
                                value={newInterviewData.interview_notes_json}
                                onChange={handleInputChange}
                                style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid #d1d5db', borderRadius: '0.5rem', width: '100%', padding: '0.5rem 0.75rem', color: '#374151', outline: 'none', transition: 'box-shadow 0.2s, border-color 0.2s', minHeight: '150px' }}
                                onFocus={(e) => { e.target.style.borderColor = '#8b5cf6'; e.target.style.boxShadow = '0 0 0 2px rgba(139, 92, 246, 0.5)'; }}
                                onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'; }}
                                placeholder="Enter interview notes here..."
                            />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                            <button
                                type="button"
                                onClick={() => setShowAddModal(false)}
                                style={{ backgroundColor: '#d1d5db', color: '#374151', fontWeight: 'bold', padding: '0.5rem 1rem', borderRadius: '0.5rem', transition: 'all 0.3s ease-in-out', border: 'none', cursor: 'pointer' }}
                                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#9ca3af'}
                                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#d1d5db'}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                style={{ backgroundColor: '#8b5cf6', color: 'white', fontWeight: 'bold', padding: '0.5rem 1rem', borderRadius: '0.5rem', transition: 'all 0.3s ease-in-out', border: 'none', cursor: 'pointer' }}
                                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#7c3aed'}
                                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#8b5cf6'}
                            >
                                Add Interview
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {showDetailModal && selectedInterview && (
                <InterviewDetailModal
                    interview={selectedInterview}
                    onClose={() => setShowDetailModal(false)}
                    onUpdate={handleUpdateInterview}
                    onDelete={handleDeleteInterview}
                    onGenerateSummary={handleGenerateSummary}
                    aiSummaryLoading={aiSummaryLoading}
                    aiSummaryError={aiSummaryError}
                    isEditor={isEditor}
                />
            )}
        </div>
    );
}

// --- Interview Detail Modal Component ---
function InterviewDetailModal({ interview, onClose, onUpdate, onDelete, onGenerateSummary, aiSummaryLoading, aiSummaryError, isEditor }) {
    const [editMode, setEditMode] = useState(false);
    const [editedInterview, setEditedInterview] = useState(interview);

    useEffect(() => {
        setEditedInterview(interview); // Ensure modal updates if parent interview prop changes
    }, [interview]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setEditedInterview(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        await onUpdate(editedInterview);
        setEditMode(false);
    };

    const handleGenerateClick = () => {
        if (editedInterview.interview_notes_json) {
            onGenerateSummary(editedInterview.id, editedInterview.interview_notes_json);
        } else {
            alert('Please add interview notes before generating a summary.');
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    return (
        <Modal title={`Interview with ${interview.customer_name}`} onClose={onClose}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                    <label style={{ display: 'block', color: '#374151', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Customer Name</label>
                    {editMode && isEditor ? (
                        <input
                            type="text"
                            name="customer_name"
                            value={editedInterview.customer_name}
                            onChange={handleInputChange}
                            style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid #d1d5db', borderRadius: '0.5rem', width: '100%', padding: '0.5rem 0.75rem', color: '#374151', outline: 'none', transition: 'box-shadow 0.2s, border-color 0.2s', WebkitAppearance: 'none' }}
                            onFocus={(e) => { e.target.style.borderColor = '#8b5cf6'; e.target.style.boxShadow = '0 0 0 2px rgba(139, 92, 246, 0.5)'; }}
                            onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'; }}
                        />
                    ) : (
                        <p style={{ color: '#111827' }}>{interview.customer_name}</p>
                    )}
                </div>
                <div>
                    <label style={{ display: 'block', color: '#374151', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Customer Email</label>
                    {editMode && isEditor ? (
                        <input
                            type="email"
                            name="customer_email"
                            value={editedInterview.customer_email || ''}
                            onChange={handleInputChange}
                            style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid #d1d5db', borderRadius: '0.5rem', width: '100%', padding: '0.5rem 0.75rem', color: '#374151', outline: 'none', transition: 'box-shadow 0.2s, border-color 0.2s', WebkitAppearance: 'none' }}
                            onFocus={(e) => { e.target.style.borderColor = '#8b5cf6'; e.target.style.boxShadow = '0 0 0 2px rgba(139, 92, 246, 0.5)'; }}
                            onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'; }}
                        />
                    ) : (
                        <p style={{ color: '#111827' }}>{interview.customer_email || 'N/A'}</p>
                    )}
                </div>
                <div>
                    <label style={{ display: 'block', color: '#374151', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Interview Date & Time</label>
                    {editMode && isEditor ? (
                        <input
                            type="datetime-local"
                            name="interview_date"
                            value={editedInterview.interview_date ? editedInterview.interview_date.slice(0, 16) : ''}
                            onChange={handleInputChange}
                            style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid #d1d5db', borderRadius: '0.5rem', width: '100%', padding: '0.5rem 0.75rem', color: '#374151', outline: 'none', transition: 'box-shadow 0.2s, border-color 0.2s', WebkitAppearance: 'none' }}
                            onFocus={(e) => { e.target.style.borderColor = '#8b5cf6'; e.target.style.boxShadow = '0 0 0 2px rgba(139, 92, 246, 0.5)'; }}
                            onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'; }}
                        />
                    ) : (
                        <p style={{ color: '#111827' }}>{formatDate(interview.interview_date)}</p>
                    )}
                </div>
                <div>
                    <label style={{ display: 'block', color: '#374151', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Interview Notes</label>
                    {editMode && isEditor ? (
                        <textarea
                            name="interview_notes_json"
                            value={editedInterview.interview_notes_json || ''}
                            onChange={handleInputChange}
                            style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid #d1d5db', borderRadius: '0.5rem', width: '100%', padding: '0.5rem 0.75rem', color: '#374151', outline: 'none', transition: 'box-shadow 0.2s, border-color 0.2s', minHeight: '150px' }}
                            onFocus={(e) => { e.target.style.borderColor = '#8b5cf6'; e.target.style.boxShadow = '0 0 0 2px rgba(139, 92, 246, 0.5)'; }}
                            onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'; }}
                            placeholder="Enter interview notes here..."
                        />
                    ) : (
                        <div style={{ backgroundColor: '#e5e7eb', padding: '0.75rem', borderRadius: '0.5rem', lineHeight: '1.6', color: '#374151' }} dangerouslySetInnerHTML={{ __html: interview.interview_notes_json ? interview.interview_notes_json.replace(/\n/g, '<br/>') : '<p style="color: #6b7280;">No notes available.</p>' }} />
                    )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                    <h4 style={{ fontSize: '1.125rem', fontWeight: 'semibold', color: '#1f2937' }}>AI Summary</h4>
                    {isEditor && (
                        <button
                            onClick={handleGenerateClick}
                            disabled={aiSummaryLoading || !editedInterview.interview_notes_json}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '0.5rem',
                                fontWeight: 'bold',
                                color: 'white',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                transition: 'all 0.3s ease-in-out',
                                transform: 'scale(1)',
                                border: 'none',
                                cursor: aiSummaryLoading || !editedInterview.interview_notes_json ? 'not-allowed' : 'pointer',
                                backgroundColor: aiSummaryLoading || !editedInterview.interview_notes_json ? '#9ca3af' : '#3b82f6',
                            }}
                            onMouseOver={(e) => {
                                if (!aiSummaryLoading && editedInterview.interview_notes_json) {
                                    e.currentTarget.style.backgroundColor = '#2563eb';
                                    e.currentTarget.style.transform = 'scale(1.05)';
                                }
                            }}
                            onMouseOut={(e) => {
                                if (!aiSummaryLoading && editedInterview.interview_notes_json) {
                                    e.currentTarget.style.backgroundColor = '#3b82f6';
                                    e.currentTarget.style.transform = 'scale(1)';
                                }
                            }}
                        >
                            {aiSummaryLoading ? 'Generating...' : 'Generate AI Summary'}
                        </button>
                    )}
                </div>
                {aiSummaryError && <p style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '0.5rem' }}>{aiSummaryError}</p>}
                <div style={{ backgroundColor: '#e5e7eb', padding: '0.75rem', borderRadius: '0.5rem', lineHeight: '1.6', color: '#374151' }}>
                    {editedInterview.ai_summary_json ? (
                        <div dangerouslySetInnerHTML={{ __html: editedInterview.ai_summary_json.replace(/\n/g, '<br/>') }} />
                    ) : (
                        <p style={{ color: '#6b7280' }}>No AI summary available.</p>
                    )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                    {isEditor && (
                        <>
                            {editMode ? (
                                <button
                                    onClick={handleSave}
                                    style={{ backgroundColor: '#22c55e', color: 'white', fontWeight: 'bold', padding: '0.5rem 1rem', borderRadius: '0.5rem', transition: 'all 0.3s ease-in-out', border: 'none', cursor: 'pointer' }}
                                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#16a34a'}
                                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#22c55e'}
                                >
                                    Save Changes
                                </button>
                            ) : (
                                <button
                                    onClick={() => setEditMode(true)}
                                    style={{ backgroundColor: '#8b5cf6', color: 'white', fontWeight: 'bold', padding: '0.5rem 1rem', borderRadius: '0.5rem', transition: 'all 0.3s ease-in-out', border: 'none', cursor: 'pointer' }}
                                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#7c3aed'}
                                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#8b5cf6'}
                                >
                                    Edit
                                </button>
                            )}
                            <button
                                onClick={() => onDelete(interview.id)}
                                style={{ backgroundColor: '#ef4444', color: 'white', fontWeight: 'bold', padding: '0.5rem 1rem', borderRadius: '0.5rem', transition: 'all 0.3s ease-in-out', border: 'none', cursor: 'pointer' }}
                                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ef4444'}
                            >
                                Delete
                            </button>
                        </>
                    )}
                    <button
                        onClick={onClose}
                        style={{ backgroundColor: '#d1d5db', color: '#374151', fontWeight: 'bold', padding: '0.5rem 1rem', borderRadius: '0.5rem', transition: 'all 0.3s ease-in-out', border: 'none', cursor: 'pointer' }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#9ca3af'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#d1d5db'}
                    >
                        Close
                    </button>
                </div>
            </div>
        </Modal>
    );
}


// --- Interview Template Tab Component ---
function InterviewTemplateTab() {
    const { user } = useContext(AuthContext);
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newTemplateData, setNewTemplateData] = useState({
        template_name: '',
        template_questions_json: '',
    });
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [aiQuestionsLoading, setAiQuestionsLoading] = useState(false);
    const [aiQuestionsError, setAiQuestionsError] = useState(null);
    const [featureIdeaForAI, setFeatureIdeaForAI] = useState('');

    const fetchTemplates = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetcher.get('/interview_templates');
            setTemplates(response.data);
        } catch (err) {
            console.error('Error fetching templates:', err.response?.data || err.message);
            setError('Failed to fetch interview templates.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (user) {
            fetchTemplates();
        }
    }, [user, fetchTemplates]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewTemplateData(prev => ({ ...prev, [name]: value }));
    };

    const handleAddTemplate = async (e) => {
        e.preventDefault();
        setError(null);
        try {
            await fetcher.post('/interview_templates', newTemplateData);
            setNewTemplateData({
                template_name: '',
                template_questions_json: '',
            });
            setShowAddModal(false);
            fetchTemplates();
        } catch (err) {
            console.error('Error adding template:', err.response?.data || err.message);
            setError(err.response?.data?.error || 'Failed to add template.');
        }
    };

    const handleViewDetails = (template) => {
        setSelectedTemplate(template);
        setShowDetailModal(true);
    };

    const handleUpdateTemplate = async (updatedData) => {
        setError(null);
        try {
            await fetcher.put(`/interview_templates/${updatedData.id}`, updatedData);
            fetchTemplates();
            setSelectedTemplate(updatedData);
            alert('Template updated successfully!');
        } catch (err) {
            console.error('Error updating template:', err.response?.data || err.message);
            setError(err.response?.data?.error || 'Failed to update template.');
            alert('Failed to update template. Check console for details.');
        }
    };

    const handleDeleteTemplate = async (templateId) => {
        if (window.confirm('Are you sure you want to delete this template?')) {
            setError(null);
            try {
                await fetcher.delete(`/interview_templates/${templateId}`);
                fetchTemplates();
                setShowDetailModal(false);
            } catch (err) {
                console.error('Error deleting template:', err.response?.data || err.message);
                setError(err.response?.data?.error || 'Failed to delete template.');
            }
        }
    };

    const handleGenerateQuestions = async (templateId, existingQuestions) => {
        if (!featureIdeaForAI) {
            setAiQuestionsError('Please enter a feature idea to generate questions.');
            return;
        }
        setAiQuestionsLoading(true);
        setAiQuestionsError(null);
        try {
            const response = await fetcher.post('/interview_templates/generate_questions', {
                feature_idea: featureIdeaForAI,
                existing_questions: existingQuestions,
            });
            const generatedContent = response.data.generated_questions;
            
            // Update the selected template's questions in the modal
            const updatedTemplate = { ...selectedTemplate, template_questions_json: generatedContent };
            setSelectedTemplate(updatedTemplate);
            
            // Update the template in the main list
            setTemplates(prev => prev.map(t => t.id === templateId ? updatedTemplate : t));
            
            alert('AI Questions generated and saved!');
        } catch (err) {
            console.error('Error generating AI questions:', err.response?.data || err.message);
            setAiQuestionsError(err.response?.data?.error || 'Failed to generate AI questions.');
        } finally {
            setAiQuestionsLoading(false);
        }
    };

    if (loading) return <div style={{ textAlign: 'center', marginTop: '2rem' }}>Loading interview templates...</div>;
    if (error) return <div style={{ textAlign: 'center', marginTop: '2rem', color: '#ef4444' }}>{error}</div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 'semibold', color: '#1f2937' }}>Interview Templates</h3>
                <button
                    onClick={() => setShowAddModal(true)}
                    style={{ backgroundColor: '#8b5cf6', color: 'white', fontWeight: 'bold', padding: '0.5rem 1rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', transition: 'all 0.3s ease-in-out', transform: 'scale(1)', border: 'none', cursor: 'pointer' }}
                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#7c3aed'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#8b5cf6'; e.currentTarget.style.transform = 'scale(1)'; }}
                >
                    + Create New Template
                </button>
            </div>

            {templates.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#4b5563', fontSize: '1.125rem' }}>No templates created yet.</p>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                    {templates.map(template => (
                        <div key={template.id} style={{ backgroundColor: '#f9fafb', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)' }}>
                            <h4 style={{ fontSize: '1.125rem', fontWeight: 'semibold', color: '#111827', marginBottom: '0.5rem' }}>{template.template_name}</h4>
                            <p style={{ color: '#4b5563', fontSize: '0.875rem', marginBottom: '1rem' }}>Created: {new Date(template.created_at).toLocaleDateString()}</p>
                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <button
                                    onClick={() => handleViewDetails(template)}
                                    style={{ backgroundColor: '#3b82f6', color: 'white', fontSize: '0.875rem', padding: '0.25rem 0.75rem', borderRadius: '0.5rem', transition: 'all 0.3s ease-in-out', transform: 'scale(1)', border: 'none', cursor: 'pointer' }}
                                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#2563eb'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#3b82f6'; e.currentTarget.style.transform = 'scale(1)'; }}
                                >
                                    View Details
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showAddModal && (
                <Modal title="Create New Interview Template" onClose={() => setShowAddModal(false)}>
                    <form onSubmit={handleAddTemplate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', color: '#374151', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Template Name</label>
                            <input
                                type="text"
                                name="template_name"
                                value={newTemplateData.template_name}
                                onChange={handleInputChange}
                                style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid #d1d5db', borderRadius: '0.5rem', width: '100%', padding: '0.5rem 0.75rem', color: '#374151', outline: 'none', transition: 'box-shadow 0.2s, border-color 0.2s', WebkitAppearance: 'none' }}
                                onFocus={(e) => { e.target.style.borderColor = '#8b5cf6'; e.target.style.boxShadow = '0 0 0 2px rgba(139, 92, 246, 0.5)'; }}
                                onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'; }}
                                required
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', color: '#374151', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Template Questions (Editor.js JSON)</label>
                            <textarea
                                name="template_questions_json"
                                value={newTemplateData.template_questions_json}
                                onChange={handleInputChange}
                                style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid #d1d5db', borderRadius: '0.5rem', width: '100%', padding: '0.5rem 0.75rem', color: '#374151', outline: 'none', transition: 'box-shadow 0.2s, border-color 0.2s', minHeight: '150px' }}
                                onFocus={(e) => { e.target.style.borderColor = '#8b5cf6'; e.target.style.boxShadow = '0 0 0 2px rgba(139, 92, 246, 0.5)'; }}
                                onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'; }}
                                placeholder="Enter template questions here (e.g., 'What problem are you trying to solve?')."
                            />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                            <button
                                type="button"
                                onClick={() => setShowAddModal(false)}
                                style={{ backgroundColor: '#d1d5db', color: '#374151', fontWeight: 'bold', padding: '0.5rem 1rem', borderRadius: '0.5rem', transition: 'all 0.3s ease-in-out', border: 'none', cursor: 'pointer' }}
                                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#9ca3af'}
                                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#d1d5db'}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                style={{ backgroundColor: '#8b5cf6', color: 'white', fontWeight: 'bold', padding: '0.5rem 1rem', borderRadius: '0.5rem', transition: 'all 0.3s ease-in-out', border: 'none', cursor: 'pointer' }}
                                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#7c3aed'}
                                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#8b5cf6'}
                            >
                                Create Template
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {showDetailModal && selectedTemplate && (
                <TemplateDetailModal
                    template={selectedTemplate}
                    onClose={() => setShowDetailModal(false)}
                    onUpdate={handleUpdateTemplate}
                    onDelete={handleDeleteTemplate}
                    onGenerateQuestions={handleGenerateQuestions}
                    aiQuestionsLoading={aiQuestionsLoading}
                    aiQuestionsError={aiQuestionsError}
                    featureIdeaForAI={featureIdeaForAI}
                    setFeatureIdeaForAI={setFeatureIdeaForAI}
                />
            )}
        </div>
    );
}

// --- Template Detail Modal Component ---
function TemplateDetailModal({ template, onClose, onUpdate, onDelete, onGenerateQuestions, aiQuestionsLoading, aiQuestionsError, featureIdeaForAI, setFeatureIdeaForAI }) {
    const [editMode, setEditMode] = useState(false);
    const [editedTemplate, setEditedTemplate] = useState(template);

    useEffect(() => {
        setEditedTemplate(template);
    }, [template]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setEditedTemplate(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        await onUpdate(editedTemplate);
        setEditMode(false);
    };

    const handleGenerateClick = () => {
        onGenerateQuestions(editedTemplate.id, editedTemplate.template_questions_json);
    };

    return (
        <Modal title={`Template: ${template.template_name}`} onClose={onClose}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                    <label style={{ display: 'block', color: '#374151', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Template Name</label>
                    {editMode ? (
                        <input
                            type="text"
                            name="template_name"
                            value={editedTemplate.template_name}
                            onChange={handleInputChange}
                            style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid #d1d5db', borderRadius: '0.5rem', width: '100%', padding: '0.5rem 0.75rem', color: '#374151', outline: 'none', transition: 'box-shadow 0.2s, border-color 0.2s', WebkitAppearance: 'none' }}
                            onFocus={(e) => { e.target.style.borderColor = '#8b5cf6'; e.target.style.boxShadow = '0 0 0 2px rgba(139, 92, 246, 0.5)'; }}
                            onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'; }}
                        />
                    ) : (
                        <p style={{ color: '#111827' }}>{template.template_name}</p>
                    )}
                </div>
                <div>
                    <label style={{ display: 'block', color: '#374151', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Template Questions</label>
                    {editMode ? (
                        <textarea
                            name="template_questions_json"
                            value={editedTemplate.template_questions_json || ''}
                            onChange={handleInputChange}
                            style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid #d1d5db', borderRadius: '0.5rem', width: '100%', padding: '0.5rem 0.75rem', color: '#374151', outline: 'none', transition: 'box-shadow 0.2s, border-color 0.2s', minHeight: '150px' }}
                            onFocus={(e) => { e.target.style.borderColor = '#8b5cf6'; e.target.style.boxShadow = '0 0 0 2px rgba(139, 92, 246, 0.5)'; }}
                            onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'; }}
                            placeholder="Enter template questions here..."
                        />
                    ) : (
                        <div style={{ backgroundColor: '#e5e7eb', padding: '0.75rem', borderRadius: '0.5rem', lineHeight: '1.6', color: '#374151' }} dangerouslySetInnerHTML={{ __html: template.template_questions_json ? template.template_questions_json.replace(/\n/g, '<br/>') : '<p style="color: #6b7280;">No questions available.</p>' }} />
                    )}
                </div>

                <div style={{ backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)', marginTop: '1rem' }}>
                    <h4 style={{ fontSize: '1.25rem', fontWeight: 'semibold', color: '#1f2937', marginBottom: '0.75rem' }}>AI Question Generator</h4>
                    <textarea
                        style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', outline: 'none', transition: 'box-shadow 0.2s, border-color 0.2s', minHeight: '80px', marginBottom: '1rem' }}
                        onFocus={(e) => { e.target.style.borderColor = '#8b5cf6'; e.target.style.boxShadow = '0 0 0 2px rgba(139, 92, 246, 0.5)'; }}
                        onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'; }}
                        placeholder="Enter a feature idea to generate interview questions (e.g., 'A new social media feature for sharing short videos')."
                        value={featureIdeaForAI}
                        onChange={(e) => setFeatureIdeaForAI(e.target.value)}
                        disabled={aiQuestionsLoading}
                    />
                    <button
                        onClick={handleGenerateClick}
                        disabled={aiQuestionsLoading || !featureIdeaForAI}
                        style={{
                            padding: '0.5rem 1.5rem',
                            borderRadius: '0.5rem',
                            fontWeight: 'bold',
                            color: 'white',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                            transition: 'all 0.3s ease-in-out',
                            transform: 'scale(1)',
                            border: 'none',
                            cursor: aiQuestionsLoading || !featureIdeaForAI ? 'not-allowed' : 'pointer',
                            backgroundColor: aiQuestionsLoading || !featureIdeaForAI ? '#9ca3af' : '#3b82f6',
                        }}
                        onMouseOver={(e) => {
                            if (!aiQuestionsLoading && featureIdeaForAI) {
                                e.currentTarget.style.backgroundColor = '#2563eb';
                                e.currentTarget.style.transform = 'scale(1.05)';
                            }
                        }}
                        onMouseOut={(e) => {
                            if (!aiQuestionsLoading && featureIdeaForAI) {
                                e.currentTarget.style.backgroundColor = '#3b82f6';
                                e.currentTarget.style.transform = 'scale(1)';
                            }
                        }}
                    >
                        {aiQuestionsLoading ? 'Generating...' : 'Generate Questions'}
                    </button>
                    {aiQuestionsError && <p style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '0.5rem' }}>{aiQuestionsError}</p>}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                    {editMode ? (
                        <button
                            onClick={handleSave}
                            style={{ backgroundColor: '#22c55e', color: 'white', fontWeight: 'bold', padding: '0.5rem 1rem', borderRadius: '0.5rem', transition: 'all 0.3s ease-in-out', border: 'none', cursor: 'pointer' }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#16a34a'}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#22c55e'}
                        >
                            Save Changes
                        </button>
                    ) : (
                        <button
                            onClick={() => setEditMode(true)}
                            style={{ backgroundColor: '#8b5cf6', color: 'white', fontWeight: 'bold', padding: '0.5rem 1rem', borderRadius: '0.5rem', transition: 'all 0.3s ease-in-out', border: 'none', cursor: 'pointer' }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#7c3aed'}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#8b5cf6'}
                        >
                            Edit
                        </button>
                    )}
                    <button
                        onClick={() => onDelete(template.id)}
                        style={{ backgroundColor: '#ef4444', color: 'white', fontWeight: 'bold', padding: '0.5rem 1rem', borderRadius: '0.5rem', transition: 'all 0.3s ease-in-out', border: 'none', cursor: 'pointer' }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ef4444'}
                    >
                        Delete
                    </button>
                    <button
                        onClick={onClose}
                        style={{ backgroundColor: '#d1d5db', color: '#374151', fontWeight: 'bold', padding: '0.5rem 1rem', borderRadius: '0.5rem', transition: 'all 0.3s ease-in-out', border: 'none', cursor: 'pointer' }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#9ca3af'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#d1d5db'}
                    >
                        Close
                    </button>
                </div>
            </div>
        </Modal>
    );
}

// --- Reusable Modal Component ---
function Modal({ title, onClose, children }) {
    return (
        <div style={{ position: 'fixed', inset: '0', backgroundColor: 'rgba(107, 114, 128, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: '50', padding: '1rem' }}>
            <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '0.5rem', boxShadow: '0 10px 15px rgba(0, 0, 0, 0.1)', width: '100%', maxWidth: '672px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '1rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem' }}>{title}</h3>
                <button
                    onClick={onClose}
                    style={{ position: 'absolute', top: '1rem', right: '1rem', color: '#6b7280', fontSize: '1.5rem', fontWeight: 'bold', background: 'none', border: 'none', cursor: 'pointer' }}
                    onMouseOver={(e) => e.currentTarget.style.color = '#374151'}
                    onMouseOut={(e) => e.currentTarget.style.color = '#6b7280'}
                >
                    &times;
                </button>
                {children}
            </div>
        </div>
    );
}

// --- Task Tab Component (NEW for Phase 2) ---
function TaskTab({ productId, isEditor }) {
    const { user } = useContext(AuthContext);
    const [tasks, setTasks] = useState([]);
    const [allUsers, setAllUsers] = useState([]); // For assigning tasks
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAddTaskModal, setShowAddTaskModal] = useState(false);
    const [newTaskData, setNewTaskData] = useState({
        title: '',
        description: '',
        assigned_to_user_id: '',
        status: 'To Do',
        priority: 'Medium',
        due_date: '',
    });
    const [showEditTaskModal, setShowEditTaskModal] = useState(false);
    const [editingTask, setEditingTask] = useState(null);

    const fetchTasks = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetcher.get(`/products/${productId}/tasks`);
            setTasks(response.data);
        } catch (err) {
            console.error('Error fetching tasks:', err.response?.data || err.message);
            setError('Failed to fetch tasks.');
        } finally {
            setLoading(false);
        }
    }, [productId]);

    const fetchAllUsers = useCallback(async () => {
        try {
            const response = await fetcher.get('/users');
            setAllUsers(response.data);
        } catch (err) {
            console.error('Error fetching users:', err.response?.data || err.message);
            // Don't block if users fail, just log error
        }
    }, []);

    useEffect(() => {
        if (user && productId) {
            fetchTasks();
            fetchAllUsers();
        }
    }, [user, productId, fetchTasks, fetchAllUsers]);

    const handleNewTaskInputChange = (e) => {
        const { name, value } = e.target;
        setNewTaskData(prev => ({ ...prev, [name]: value }));
    };

    const handleCreateTask = async (e) => {
        e.preventDefault();
        setError(null);
        try {
            const payload = {
                ...newTaskData,
                assigned_to_user_id: newTaskData.assigned_to_user_id === '' ? null : parseInt(newTaskData.assigned_to_user_id),
                due_date: newTaskData.due_date || null,
            };
            await fetcher.post(`/products/${productId}/tasks`, payload);
            setNewTaskData({
                title: '',
                description: '',
                assigned_to_user_id: '',
                status: 'To Do',
                priority: 'Medium',
                due_date: '',
            });
            setShowAddTaskModal(false);
            fetchTasks();
        } catch (err) {
            console.error('Error creating task:', err.response?.data || err.message);
            setError(err.response?.data?.error || 'Failed to create task.');
        }
    };

    const handleEditTaskClick = (task) => {
        setEditingTask({
            ...task,
            due_date: task.due_date ? task.due_date.slice(0, 16) : '', // Format for datetime-local input
            assigned_to_user_id: task.assigned_to_user_id || '',
        });
        setShowEditTaskModal(true);
    };

    const handleEditTaskInputChange = (e) => {
        const { name, value } = e.target;
        setEditingTask(prev => ({ ...prev, [name]: value }));
    };

    const handleUpdateTask = async (e) => {
        e.preventDefault();
        setError(null);
        try {
            const payload = {
                ...editingTask,
                assigned_to_user_id: editingTask.assigned_to_user_id === '' ? null : parseInt(editingTask.assigned_to_user_id),
                due_date: editingTask.due_date || null,
            };
            await fetcher.put(`/tasks/${editingTask.id}`, payload);
            setShowEditTaskModal(false);
            setEditingTask(null);
            fetchTasks();
        } catch (err) {
            console.error('Error updating task:', err.response?.data || err.message);
            setError(err.response?.data?.error || 'Failed to update task.');
        }
    };

    const handleDeleteTask = async (taskId) => {
        if (window.confirm('Are you sure you want to delete this task?')) {
            setError(null);
            try {
                await fetcher.delete(`/tasks/${taskId}`);
                fetchTasks();
            } catch (err) {
                console.error('Error deleting task:', err.response?.data || err.message);
                setError(err.response?.data?.error || 'Failed to delete task.');
            }
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    if (loading) return <div style={{ textAlign: 'center', marginTop: '2rem' }}>Loading tasks...</div>;
    if (error) return <div style={{ textAlign: 'center', marginTop: '2rem', color: '#ef4444' }}>{error}</div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 'semibold', color: '#1f2937' }}>Tasks</h3>
                {isEditor && (
                    <button
                        onClick={() => setShowAddTaskModal(true)}
                        style={{ backgroundColor: '#8b5cf6', color: 'white', fontWeight: 'bold', padding: '0.5rem 1rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', transition: 'all 0.3s ease-in-out', transform: 'scale(1)', border: 'none', cursor: 'pointer' }}
                        onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#7c3aed'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#8b5cf6'; e.currentTarget.style.transform = 'scale(1)'; }}
                    >
                        + Add New Task
                    </button>
                )}
            </div>

            {tasks.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#4b5563', fontSize: '1.125rem' }}>No tasks for this product yet.</p>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                    {tasks.map(task => (
                        <div key={task.id} style={{ backgroundColor: '#f9fafb', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)' }}>
                            <h4 style={{ fontSize: '1.125rem', fontWeight: 'semibold', color: '#111827', marginBottom: '0.5rem' }}>{task.title}</h4>
                            <p style={{ color: '#4b5563', fontSize: '0.875rem', marginBottom: '0.25rem' }}>{task.description}</p>
                            <p style={{ color: '#4b5563', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Status: <span style={{ fontWeight: 'medium' }}>{task.status}</span></p>
                            <p style={{ color: '#4b5563', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Priority: <span style={{ fontWeight: 'medium' }}>{task.priority}</span></p>
                            <p style={{ color: '#4b5563', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Assigned To: <span style={{ fontWeight: 'medium' }}>{task.assigned_to_username || 'Unassigned'}</span></p>
                            <p style={{ color: '#4b5563', fontSize: '0.875rem', marginBottom: '1rem' }}>Due Date: <span style={{ fontWeight: 'medium' }}>{formatDate(task.due_date)}</span></p>
                            {isEditor && (
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                    <button
                                        onClick={() => handleEditTaskClick(task)}
                                        style={{ backgroundColor: '#3b82f6', color: 'white', fontSize: '0.875rem', padding: '0.25rem 0.75rem', borderRadius: '0.5rem', transition: 'all 0.3s ease-in-out', transform: 'scale(1)', border: 'none', cursor: 'pointer' }}
                                        onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#2563eb'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                                        onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#3b82f6'; e.currentTarget.style.transform = 'scale(1)'; }}
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDeleteTask(task.id)}
                                        style={{ backgroundColor: '#ef4444', color: 'white', fontSize: '0.875rem', padding: '0.25rem 0.75rem', borderRadius: '0.5rem', transition: 'all 0.3s ease-in-out', transform: 'scale(1)', border: 'none', cursor: 'pointer' }}
                                        onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#dc2626'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                                        onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#ef4444'; e.currentTarget.style.transform = 'scale(1)'; }}
                                    >
                                        Delete
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {showAddTaskModal && (
                <Modal title="Add New Task" onClose={() => setShowAddTaskModal(false)}>
                    <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', color: '#374151', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Title</label>
                            <input
                                type="text"
                                name="title"
                                value={newTaskData.title}
                                onChange={handleNewTaskInputChange}
                                style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid #d1d5db', borderRadius: '0.5rem', width: '100%', padding: '0.5rem 0.75rem', color: '#374151', outline: 'none', transition: 'box-shadow 0.2s, border-color 0.2s', WebkitAppearance: 'none' }}
                                onFocus={(e) => { e.target.style.borderColor = '#8b5cf6'; e.target.style.boxShadow = '0 0 0 2px rgba(139, 92, 246, 0.5)'; }}
                                onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'; }}
                                required
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', color: '#374151', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Description</label>
                            <textarea
                                name="description"
                                value={newTaskData.description}
                                onChange={handleNewTaskInputChange}
                                style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid #d1d5db', borderRadius: '0.5rem', width: '100%', padding: '0.5rem 0.75rem', color: '#374151', outline: 'none', transition: 'box-shadow 0.2s, border-color 0.2s', minHeight: '100px' }}
                                onFocus={(e) => { e.target.style.borderColor = '#8b5cf6'; e.target.style.boxShadow = '0 0 0 2px rgba(139, 92, 246, 0.5)'; }}
                                onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'; }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', color: '#374151', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Assigned To</label>
                            <select
                                name="assigned_to_user_id"
                                value={newTaskData.assigned_to_user_id}
                                onChange={handleNewTaskInputChange}
                                style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid #d1d5db', borderRadius: '0.5rem', width: '100%', padding: '0.5rem 0.75rem', color: '#374151', outline: 'none', transition: 'box-shadow 0.2s, border-color 0.2s', WebkitAppearance: 'none' }}
                                onFocus={(e) => { e.target.style.borderColor = '#8b5cf6'; e.target.style.boxShadow = '0 0 0 2px rgba(139, 92, 246, 0.5)'; }}
                                onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'; }}
                            >
                                <option value="">Unassigned</option>
                                {allUsers.map(u => (
                                    <option key={u.id} value={u.id}>{u.username} ({u.email})</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', color: '#374151', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Status</label>
                            <select
                                name="status"
                                value={newTaskData.status}
                                onChange={handleNewTaskInputChange}
                                style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid #d1d5db', borderRadius: '0.5rem', width: '100%', padding: '0.5rem 0.75rem', color: '#374151', outline: 'none', transition: 'box-shadow 0.2s, border-color 0.2s', WebkitAppearance: 'none' }}
                                onFocus={(e) => { e.target.style.borderColor = '#8b5cf6'; e.target.style.boxShadow = '0 0 0 2px rgba(139, 92, 246, 0.5)'; }}
                                onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'; }}
                            >
                                {['To Do', 'In Progress', 'Done', 'Blocked', 'Archived'].map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', color: '#374151', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Priority</label>
                            <select
                                name="priority"
                                value={newTaskData.priority}
                                onChange={handleNewTaskInputChange}
                                style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid #d1d5db', borderRadius: '0.5rem', width: '100%', padding: '0.5rem 0.75rem', color: '#374151', outline: 'none', transition: 'box-shadow 0.2s, border-color 0.2s', WebkitAppearance: 'none' }}
                                onFocus={(e) => { e.target.style.borderColor = '#8b5cf6'; e.target.style.boxShadow = '0 0 0 2px rgba(139, 92, 246, 0.5)'; }}
                                onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'; }}
                            >
                                {['Low', 'Medium', 'High', 'Critical'].map(p => (
                                    <option key={p} value={p}>{p}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', color: '#374151', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Due Date</label>
                            <input
                                type="datetime-local"
                                name="due_date"
                                value={newTaskData.due_date}
                                onChange={handleNewTaskInputChange}
                                style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid #d1d5db', borderRadius: '0.5rem', width: '100%', padding: '0.5rem 0.75rem', color: '#374151', outline: 'none', transition: 'box-shadow 0.2s, border-color 0.2s', WebkitAppearance: 'none' }}
                                onFocus={(e) => { e.target.style.borderColor = '#8b5cf6'; e.target.style.boxShadow = '0 0 0 2px rgba(139, 92, 246, 0.5)'; }}
                                onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'; }}
                            />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                            <button
                                type="button"
                                onClick={() => setShowAddTaskModal(false)}
                                style={{ backgroundColor: '#d1d5db', color: '#374151', fontWeight: 'bold', padding: '0.5rem 1rem', borderRadius: '0.5rem', transition: 'all 0.3s ease-in-out', border: 'none', cursor: 'pointer' }}
                                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#9ca3af'}
                                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#d1d5db'}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                style={{ backgroundColor: '#8b5cf6', color: 'white', fontWeight: 'bold', padding: '0.5rem 1rem', borderRadius: '0.5rem', transition: 'all 0.3s ease-in-out', border: 'none', cursor: 'pointer' }}
                                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#7c3aed'}
                                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#8b5cf6'}
                            >
                                Add Task
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {showEditTaskModal && editingTask && (
                <Modal title="Edit Task" onClose={() => setShowEditTaskModal(false)}>
                    <form onSubmit={handleUpdateTask} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', color: '#374151', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Title</label>
                            <input
                                type="text"
                                name="title"
                                value={editingTask.title}
                                onChange={handleEditTaskInputChange}
                                style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid #d1d5db', borderRadius: '0.5rem', width: '100%', padding: '0.5rem 0.75rem', color: '#374151', outline: 'none', transition: 'box-shadow 0.2s, border-color 0.2s', WebkitAppearance: 'none' }}
                                onFocus={(e) => { e.target.style.borderColor = '#8b5cf6'; e.target.style.boxShadow = '0 0 0 2px rgba(139, 92, 246, 0.5)'; }}
                                onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'; }}
                                required
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', color: '#374151', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Description</label>
                            <textarea
                                name="description"
                                value={editingTask.description || ''}
                                onChange={handleEditTaskInputChange}
                                style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid #d1d5db', borderRadius: '0.5rem', width: '100%', padding: '0.5rem 0.75rem', color: '#374151', outline: 'none', transition: 'box-shadow 0.2s, border-color 0.2s', minHeight: '100px' }}
                                onFocus={(e) => { e.target.style.borderColor = '#8b5cf6'; e.target.style.boxShadow = '0 0 0 2px rgba(139, 92, 246, 0.5)'; }}
                                onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'; }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', color: '#374151', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Assigned To</label>
                            <select
                                name="assigned_to_user_id"
                                value={editingTask.assigned_to_user_id}
                                onChange={handleEditTaskInputChange}
                                style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid #d1d5db', borderRadius: '0.5rem', width: '100%', padding: '0.5rem 0.75rem', color: '#374151', outline: 'none', transition: 'box-shadow 0.2s, border-color 0.2s', WebkitAppearance: 'none' }}
                                onFocus={(e) => { e.target.style.borderColor = '#8b5cf6'; e.target.style.boxShadow = '0 0 0 2px rgba(139, 92, 246, 0.5)'; }}
                                onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'; }}
                            >
                                <option value="">Unassigned</option>
                                {allUsers.map(u => (
                                    <option key={u.id} value={u.id}>{u.username} ({u.email})</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', color: '#374151', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Status</label>
                            <select
                                name="status"
                                value={editingTask.status}
                                onChange={handleEditTaskInputChange}
                                style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid #d1d5db', borderRadius: '0.5rem', width: '100%', padding: '0.5rem 0.75rem', color: '#374151', outline: 'none', transition: 'box-shadow 0.2s, border-color 0.2s', WebkitAppearance: 'none' }}
                                onFocus={(e) => { e.target.style.borderColor = '#8b5cf6'; e.target.style.boxShadow = '0 0 0 2px rgba(139, 92, 246, 0.5)'; }}
                                onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'; }}
                            >
                                {['To Do', 'In Progress', 'Done', 'Blocked', 'Archived'].map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', color: '#374151', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Priority</label>
                            <select
                                name="priority"
                                value={editingTask.priority}
                                onChange={handleEditTaskInputChange}
                                style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid #d1d5db', borderRadius: '0.5rem', width: '100%', padding: '0.5rem 0.75rem', color: '#374151', outline: 'none', transition: 'box-shadow 0.2s, border-color 0.2s', WebkitAppearance: 'none' }}
                                onFocus={(e) => { e.target.style.borderColor = '#8b5cf6'; e.target.style.boxShadow = '0 0 0 2px rgba(139, 92, 246, 0.5)'; }}
                                onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'; }}
                            >
                                {['Low', 'Medium', 'High', 'Critical'].map(p => (
                                    <option key={p} value={p}>{p}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', color: '#374151', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Due Date</label>
                            <input
                                type="datetime-local"
                                name="due_date"
                                value={editingTask.due_date}
                                onChange={handleEditTaskInputChange}
                                style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid #d1d5db', borderRadius: '0.5rem', width: '100%', padding: '0.5rem 0.75rem', color: '#374151', outline: 'none', transition: 'box-shadow 0.2s, border-color 0.2s', WebkitAppearance: 'none' }}
                                onFocus={(e) => { e.target.style.borderColor = '#8b5cf6'; e.target.style.boxShadow = '0 0 0 2px rgba(139, 92, 246, 0.5)'; }}
                                onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'; }}
                            />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                            <button
                                type="button"
                                onClick={() => setShowEditTaskModal(false)}
                                style={{ backgroundColor: '#d1d5db', color: '#374151', fontWeight: 'bold', padding: '0.5rem 1rem', borderRadius: '0.5rem', transition: 'all 0.3s ease-in-out', border: 'none', cursor: 'pointer' }}
                                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#9ca3af'}
                                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#d1d5db'}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                style={{ backgroundColor: '#8b5cf6', color: 'white', fontWeight: 'bold', padding: '0.5rem 1rem', borderRadius: '0.5rem', transition: 'all 0.3s ease-in-out', border: 'none', cursor: 'pointer' }}
                                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#7c3aed'}
                                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#8b5cf6'}
                            >
                                Update Task
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}

// --- Collaboration Tab Component (NEW for Phase 2) ---
function CollaborationTab({ productId, isOwner }) {
    const { user } = useContext(AuthContext);
    const [accesses, setAccesses] = useState([]);
    const [allUsers, setAllUsers] = useState([]); // For inviting users
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState('viewer');
    const [inviteMessage, setInviteMessage] = useState('');

    const fetchAccesses = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetcher.get(`/products/${productId}/access`);
            setAccesses(response.data);
        } catch (err) {
            console.error('Error fetching product accesses:', err.response?.data || err.message);
            setError('Failed to fetch collaboration details.');
        } finally {
            setLoading(false);
        }
    }, [productId]);

    const fetchAllUsers = useCallback(async () => {
        try {
            const response = await fetcher.get('/users');
            setAllUsers(response.data);
        } catch (err) {
            console.error('Error fetching all users:', err.response?.data || err.message);
            // Log error but don't block UI
        }
    }, []);

    useEffect(() => {
        if (user && productId) {
            fetchAccesses();
            if (isOwner) { // Only fetch all users if current user is owner for inviting
                fetchAllUsers();
            }
        }
    }, [user, productId, isOwner, fetchAccesses, fetchAllUsers]);

    const handleInviteUser = async (e) => {
        e.preventDefault();
        setInviteMessage('');
        setError(null);
        try {
            await fetcher.post(`/products/${productId}/access`, {
                user_email: inviteEmail,
                role: inviteRole,
            });
            setInviteEmail('');
            setInviteRole('viewer');
            setShowInviteModal(false);
            setInviteMessage('User invited successfully!');
            fetchAccesses(); // Refresh the access list
        } catch (err) {
            console.error('Error inviting user:', err.response?.data || err.message);
            setInviteMessage(err.response?.data?.error || 'Failed to invite user.');
            setError(err.response?.data?.error || 'Failed to invite user.');
        }
    };

    const handleUpdateRole = async (accessId, userId, newRole) => {
        setError(null);
        try {
            await fetcher.put(`/products/${productId}/access/${userId}`, { role: newRole });
            fetchAccesses(); // Refresh the access list
        } catch (err) {
            console.error('Error updating user role:', err.response?.data || err.message);
            setError(err.response?.data?.error || 'Failed to update user role.');
        }
    };

    const handleRemoveAccess = async (userIdToRemove) => {
        if (window.confirm('Are you sure you want to remove this user\'s access?')) {
            setError(null);
            try {
                await fetcher.delete(`/products/${productId}/access/${userIdToRemove}`);
                fetchAccesses(); // Refresh the access list
            } catch (err) {
                console.error('Error removing user access:', err.response?.data || err.message);
                setError(err.response?.data?.error || 'Failed to remove user access.');
            }
        }
    };

    if (loading) return <div style={{ textAlign: 'center', marginTop: '2rem' }}>Loading collaboration details...</div>;
    if (error) return <div style={{ textAlign: 'center', marginTop: '2rem', color: '#ef4444' }}>{error}</div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 'semibold', color: '#1f2937' }}>Product Collaboration</h3>
                {isOwner && (
                    <button
                        onClick={() => setShowInviteModal(true)}
                        style={{ backgroundColor: '#8b5cf6', color: 'white', fontWeight: 'bold', padding: '0.5rem 1rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', transition: 'all 0.3s ease-in-out', transform: 'scale(1)', border: 'none', cursor: 'pointer' }}
                        onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#7c3aed'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#8b5cf6'; e.currentTarget.style.transform = 'scale(1)'; }}
                    >
                        + Invite User
                    </button>
                )}
            </div>

            {accesses.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#4b5563', fontSize: '1.125rem' }}>No collaborators for this product yet.</p>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ minWidth: '100%', backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '0.5rem', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)', borderCollapse: 'collapse' }}>
                        <thead style={{ backgroundColor: '#f3f4f6' }}>
                            <tr>
                                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 'semibold', color: '#4b5563', borderBottom: '1px solid #e5e7eb' }}>User</th>
                                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 'semibold', color: '#4b5563', borderBottom: '1px solid #e5e7eb' }}>Email</th>
                                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 'semibold', color: '#4b5563', borderBottom: '1px solid #e5e7eb' }}>Role</th>
                                {isOwner && <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 'semibold', color: '#4b5563', borderBottom: '1px solid #e5e7eb' }}>Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {accesses.map(access => (
                                <tr key={access.id} style={{ borderTop: '1px solid #e5e7eb', transition: 'background-color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'white'}>
                                    <td style={{ padding: '0.75rem 1rem', color: '#1f2937' }}>{access.user_username || 'N/A'}</td>
                                    <td style={{ padding: '0.75rem 1rem', color: '#1f2937' }}>{access.user_email}</td>
                                    <td style={{ padding: '0.75rem 1rem', color: '#1f2937' }}>
                                        {isOwner && access.user_id !== user.id ? ( // Owner can change others' roles
                                            <select
                                                value={access.role}
                                                onChange={(e) => handleUpdateRole(access.id, access.user_id, e.target.value)}
                                                style={{ border: '1px solid #d1d5db', borderRadius: '0.5rem', padding: '0.25rem 0.5rem', color: '#374151', outline: 'none', transition: 'box-shadow 0.2s, border-color 0.2s', WebkitAppearance: 'none' }}
                                                onFocus={(e) => { e.target.style.borderColor = '#8b5cf6'; e.target.style.boxShadow = '0 0 0 2px rgba(139, 92, 246, 0.5)'; }}
                                                onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'; }}
                                            >
                                                <option value="owner">Owner</option>
                                                <option value="editor">Editor</option>
                                                <option value="viewer">Viewer</option>
                                            </select>
                                        ) : (
                                            <span style={{ fontWeight: 'medium', textTransform: 'capitalize' }}>{access.role}</span>
                                        )}
                                    </td>
                                    {isOwner && (
                                        <td style={{ padding: '0.75rem 1rem' }}>
                                            {access.user_id !== user.id && ( // Cannot remove self as owner
                                                <button
                                                    onClick={() => handleRemoveAccess(access.user_id)}
                                                    style={{ backgroundColor: '#ef4444', color: 'white', fontSize: '0.875rem', padding: '0.25rem 0.75rem', borderRadius: '0.5rem', transition: 'all 0.3s ease-in-out', transform: 'scale(1)', border: 'none', cursor: 'pointer' }}
                                                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#dc2626'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                                                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#ef4444'; e.currentTarget.style.transform = 'scale(1)'; }}
                                                >
                                                    Remove
                                                </button>
                                            )}
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {showInviteModal && (
                <Modal title="Invite User to Product" onClose={() => setShowInviteModal(false)}>
                    <form onSubmit={handleInviteUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', color: '#374151', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>User Email</label>
                            <input
                                type="email"
                                name="user_email"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid #d1d5db', borderRadius: '0.5rem', width: '100%', padding: '0.5rem 0.75rem', color: '#374151', outline: 'none', transition: 'box-shadow 0.2s, border-color 0.2s', WebkitAppearance: 'none' }}
                                onFocus={(e) => { e.target.style.borderColor = '#8b5cf6'; e.target.style.boxShadow = '0 0 0 2px rgba(139, 92, 246, 0.5)'; }}
                                onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'; }}
                                required
                            />
                            <p style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                                User must be registered in the system.
                            </p>
                        </div>
                        <div>
                            <label style={{ display: 'block', color: '#374151', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Role</label>
                            <select
                                name="role"
                                value={inviteRole}
                                onChange={(e) => setInviteRole(e.target.value)}
                                style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid #d1d5db', borderRadius: '0.5rem', width: '100%', padding: '0.5rem 0.75rem', color: '#374151', outline: 'none', transition: 'box-shadow 0.2s, border-color 0.2s', WebkitAppearance: 'none' }}
                                onFocus={(e) => { e.target.style.borderColor = '#8b5cf6'; e.target.style.boxShadow = '0 0 0 2px rgba(139, 92, 246, 0.5)'; }}
                                onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'; }}
                            >
                                <option value="viewer">Viewer</option>
                                <option value="editor">Editor</option>
                            </select>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                            <button
                                type="button"
                                onClick={() => setShowInviteModal(false)}
                                style={{ backgroundColor: '#d1d5db', color: '#374151', fontWeight: 'bold', padding: '0.5rem 1rem', borderRadius: '0.5rem', transition: 'all 0.3s ease-in-out', border: 'none', cursor: 'pointer' }}
                                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#9ca3af'}
                                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#d1d5db'}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                style={{ backgroundColor: '#8b5cf6', color: 'white', fontWeight: 'bold', padding: '0.5rem 1rem', borderRadius: '0.5rem', transition: 'all 0.3s ease-in-out', border: 'none', cursor: 'pointer' }}
                                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#7c3aed'}
                                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#8b5cf6'}
                            >
                                Send Invite
                            </button>
                        </div>
                    </form>
                    {inviteMessage && (
                        <p style={{ marginTop: '1rem', textAlign: 'center', color: inviteMessage.includes('success') ? '#10b981' : '#ef4444' }}>
                            {inviteMessage}
                        </p>
                    )}
                </Modal>
            )}
        </div>
    );
}


// --- Main App Wrapper ---
export default function MainApp() {
    return (
        <AuthProvider>
            <App />
        </AuthProvider>
    );
}