import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import axios from 'axios';

// --- Constants ---
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

// --- Contexts ---
const AuthContext = createContext(null);
const ProductContext = createContext(null);

// --- Utility Functions ---
const fetcher = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor to add Authorization header
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
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const username = localStorage.getItem('username');
        const timezone = localStorage.getItem('timezone');
        if (token && username) {
            setUser({ token, username, timezone });
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
            setUser({ token, username, timezone });
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

// --- App Component ---
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
        return <div className="flex items-center justify-center min-h-screen bg-gray-100">Loading...</div>;
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
        <div className="min-h-screen bg-gray-100 font-inter">
            {user && <Navbar navigateTo={navigateTo} username={user.username} />}
            <main className="container mx-auto p-4">
                {content}
            </main>
        </div>
    );
}

// --- Navbar Component ---
function Navbar({ navigateTo, username }) {
    const { logout } = useContext(AuthContext);
    return (
        <nav className="bg-gradient-to-r from-purple-600 to-indigo-700 p-4 shadow-lg">
            <div className="container mx-auto flex justify-between items-center">
                <h1 className="text-white text-2xl font-bold cursor-pointer" onClick={() => navigateTo('dashboard')}>
                    Auto Product Manager
                </h1>
                <div className="flex items-center space-x-4">
                    <span className="text-white text-lg">Hello, {username}!</span>
                    <button
                        onClick={() => navigateTo('profile')}
                        className="bg-white text-purple-700 px-4 py-2 rounded-lg shadow hover:bg-gray-100 transition duration-300 ease-in-out transform hover:scale-105"
                    >
                        Profile
                    </button>
                    <button
                        onClick={logout}
                        className="bg-red-500 text-white px-4 py-2 rounded-lg shadow hover:bg-red-600 transition duration-300 ease-in-out transform hover:scale-105"
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
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
            <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
                <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">Login</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
                            Email
                        </label>
                        <input
                            type="email"
                            id="email"
                            className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-purple-500"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
                            Password
                        </label>
                        <input
                            type="password"
                            id="password"
                            className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-purple-500"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline transition duration-300 ease-in-out transform hover:scale-105"
                    >
                        Login
                    </button>
                </form>
                {message && <p className="mt-4 text-center text-red-500">{message}</p>}
                <p className="mt-6 text-center text-gray-600">
                    Don't have an account?{' '}
                    <button
                        onClick={() => navigateTo('signup')}
                        className="text-purple-600 hover:underline font-bold"
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
            // Optionally navigate to login or show success message only
            setEmail('');
            setUsername('');
            setPassword('');
            setTimeout(() => navigateTo('login'), 3000); // Redirect after 3 seconds
        }
    };

    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
            <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
                <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">Sign Up</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
                            Email
                        </label>
                        <input
                            type="email"
                            id="email"
                            className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-purple-500"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="username">
                            Username
                        </label>
                        <input
                            type="text"
                            id="username"
                            className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-purple-500"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
                            Password
                        </label>
                        <input
                            type="password"
                            id="password"
                            className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-purple-500"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline transition duration-300 ease-in-out transform hover:scale-105"
                    >
                        Sign Up
                    </button>
                </form>
                {message && <p className="mt-4 text-center text-green-500">{message}</p>}
                <p className="mt-6 text-center text-gray-600">
                    Already have an account?{' '}
                    <button
                        onClick={() => navigateTo('login')}
                        className="text-purple-600 hover:underline font-bold"
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
            // Optionally, clear message after a few seconds
            setTimeout(() => setMessage(''), 3000);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)]">
            <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
                <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">User Profile</h2>
                <form onSubmit={handleUpdate} className="space-y-4">
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
                            Email (Read-only)
                        </label>
                        <input
                            type="email"
                            id="email"
                            className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight bg-gray-100 cursor-not-allowed"
                            value={user?.email || ''}
                            disabled
                        />
                    </div>
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="username">
                            Username
                        </label>
                        <input
                            type="text"
                            id="username"
                            className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-purple-500"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="timezone">
                            Timezone
                        </label>
                        <input
                            type="text"
                            id="timezone"
                            className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-purple-500"
                            value={timezone}
                            onChange={(e) => setTimezone(e.target.value)}
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline transition duration-300 ease-in-out transform hover:scale-105"
                    >
                        Update Profile
                    </button>
                </form>
                {message && (
                    <p className={`mt-4 text-center ${message.includes('success') ? 'text-green-500' : 'text-red-500'}`}>
                        {message}
                    </p>
                )}
                <button
                    onClick={() => navigateTo('dashboard')}
                    className="mt-6 w-full bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline transition duration-300 ease-in-out transform hover:scale-105"
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

    if (loading) return <div className="text-center mt-8">Loading products...</div>;
    if (error) return <div className="text-center mt-8 text-red-500">{error}</div>;

    return (
        <div className="mt-8">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-gray-800">My Products</h2>
                <div className="flex items-center space-x-4">
                    <input
                        type="text"
                        placeholder="Search products..."
                        className="shadow appearance-none border rounded-lg py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-purple-500"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg shadow transition duration-300 ease-in-out transform hover:scale-105"
                    >
                        + Create New Product
                    </button>
                </div>
            </div>

            {filteredProducts.length === 0 ? (
                <p className="text-center text-gray-600 text-lg">No products found. Start by creating one!</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProducts.map((product) => (
                        <div key={product.id} className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">{product.name}</h3>
                            <p className="text-gray-600 text-sm mb-4">Status: <span className={`font-medium ${product.status === 'Active' ? 'text-green-600' : 'text-yellow-600'}`}>{product.status}</span></p>
                            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                                <div className="bg-purple-600 h-2.5 rounded-full" style={{ width: `${product.progress}%` }}></div>
                            </div>
                            <p className="text-gray-600 text-sm mb-4">Progress: {product.progress}%</p>
                            <div className="flex justify-end space-x-2">
                                <button
                                    onClick={() => navigateTo('productDetail', product.id)}
                                    className="bg-blue-500 hover:bg-blue-600 text-white text-sm px-3 py-1 rounded-lg transition duration-300 ease-in-out transform hover:scale-105"
                                >
                                    View Details
                                </button>
                                <button
                                    onClick={() => handleDeleteProduct(product.id)}
                                    className="bg-red-500 hover:bg-red-600 text-white text-sm px-3 py-1 rounded-lg transition duration-300 ease-in-out transform hover:scale-105"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showCreateModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
                        <h3 className="text-2xl font-bold text-gray-800 mb-4">Create New Product</h3>
                        <form onSubmit={handleCreateProduct} className="space-y-4">
                            <div>
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="productName">
                                    Product Name
                                </label>
                                <input
                                    type="text"
                                    id="productName"
                                    className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    value={newProductName}
                                    onChange={(e) => setNewProductName(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="flex justify-end space-x-4">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg transition duration-300 ease-in-out"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300 ease-in-out"
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

    if (loading) return <div className="text-center mt-8">Loading product details...</div>;
    if (error) return <div className="text-center mt-8 text-red-500">{error}</div>;
    if (!product) return <div className="text-center mt-8">Product not found.</div>;

    return (
        <div className="mt-8 bg-white p-6 rounded-lg shadow-xl">
            <button
                onClick={() => navigateTo('dashboard')}
                className="mb-4 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg transition duration-300 ease-in-out transform hover:scale-105"
            >
                &larr; Back to Dashboard
            </button>

            <h2 className="text-3xl font-bold text-gray-800 mb-4">{product.name}</h2>

            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center space-x-4">
                    <span className="text-gray-700 text-lg">Status:</span>
                    {editMode ? (
                        <select
                            value={editedProduct.status}
                            onChange={(e) => handleStatusChange(e.target.value)}
                            className="border rounded-lg py-2 px-3 shadow focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                            {['Active', 'Completed', 'Cancelled', 'On-Hold'].map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    ) : (
                        <span className={`font-semibold text-lg ${product.status === 'Active' ? 'text-green-600' : 'text-yellow-600'}`}>
                            {product.status}
                        </span>
                    )}
                </div>
                <div>
                    {editMode ? (
                        <div className="space-x-2">
                            <button
                                onClick={handleUpdateProduct}
                                className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg shadow transition duration-300 ease-in-out transform hover:scale-105"
                            >
                                Save Changes
                            </button>
                            <button
                                onClick={() => { setEditMode(false); setEditedProduct(product); }} // Revert changes
                                className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg shadow transition duration-300 ease-in-out transform hover:scale-105"
                            >
                                Cancel
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setEditMode(true)}
                            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg shadow transition duration-300 ease-in-out transform hover:scale-105"
                        >
                            Edit Product
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    {['overview', 'research', 'prd', 'design', 'development', 'tech_doc', 'launch_training', 'important_notes', 'interviews', 'templates', 'tasks', 'collaboration'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`${
                                activeTab === tab
                                    ? 'border-purple-500 text-purple-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors duration-200`}
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
                        editMode={editMode}
                        onContentChange={(content) => handleContentChange('research_document', content)}
                        onStatusChange={(status) => handleTabStatusChange('research', status)}
                    />
                )}
                {activeTab === 'prd' && (
                    <PRDTab
                        product={product}
                        editMode={editMode}
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
                        editMode={editMode}
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
                        editMode={editMode}
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
                        editMode={editMode}
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
                        editMode={editMode}
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
                        editMode={editMode}
                        onContentChange={(content) => handleContentChange('important_notes', content)}
                        onStatusChange={(status) => handleTabStatusChange('important_notes', status)}
                    />
                )}
                {activeTab === 'interviews' && (
                    <CustomerInterviewTab productId={productId} isEditor={isProductOwner || (product && product.product_accesses.some(pa => pa.user_id === user.id && pa.role === 'editor'))} />
                )}
                {activeTab === 'templates' && (
                    <InterviewTemplateTab />
                )}
                {activeTab === 'tasks' && (
                    <TaskTab productId={productId} isEditor={isProductOwner || (product && product.product_accesses.some(pa => pa.user_id === user.id && pa.role === 'editor'))} />
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
        <div className="space-y-4">
            <h3 className="text-2xl font-semibold text-gray-800 mb-4">Product Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <p className="text-gray-700"><strong>Product Name:</strong> {product.name}</p>
                <p className="text-gray-700"><strong>Status:</strong> <span className={`font-medium ${product.status === 'Active' ? 'text-green-600' : 'text-yellow-600'}`}>{product.status}</span></p>
                <p className="text-gray-700"><strong>Archived:</strong> {product.is_archived ? 'Yes' : 'No'}</p>
                <p className="text-gray-700"><strong>Overall Progress:</strong> {product.progress}%</p>
                <p className="text-gray-700"><strong>Created At:</strong> {formatDate(product.created_at)}</p>
                <p className="text-gray-700"><strong>Last Updated:</strong> {formatDate(product.updated_at)}</p>
            </div>

            <h4 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Section Progress</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {['research', 'prd', 'design', 'development', 'tech_doc', 'launch_training'].map(section => (
                    <div key={section} className="bg-gray-50 p-4 rounded-lg shadow-sm">
                        <p className="font-medium text-gray-800">{section.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}:</p>
                        <span className={`text-sm font-semibold ${
                            product[`${section}_status`] === 'Completed' ? 'text-green-600' :
                            product[`${section}_status`] === 'In Progress' ? 'text-blue-600' :
                            'text-gray-500'
                        }`}>
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
        <div className="space-y-4">
            <h3 className="text-2xl font-semibold text-gray-800 mb-4">{title}</h3>
            <div className="flex items-center space-x-4 mb-4">
                <span className="text-gray-700 text-lg">Status:</span>
                {editMode ? (
                    <select
                        value={status}
                        onChange={handleStatusUpdate}
                        className="border rounded-lg py-2 px-3 shadow focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                        {['Not Started', 'In Progress', 'Completed', 'Skipped'].map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                ) : (
                    <span className={`font-semibold text-lg ${status === 'Completed' ? 'text-green-600' : 'text-gray-600'}`}>
                        {status}
                    </span>
                )}
            </div>
            {editMode ? (
                <textarea
                    className="w-full p-4 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[300px]"
                    value={content}
                    onChange={handleContentUpdate}
                    placeholder={`Enter ${title} here...`}
                />
            ) : (
                <div className="bg-gray-50 p-4 rounded-lg shadow-inner prose max-w-none" dangerouslySetInnerHTML={{ __html: content ? content.replace(/\n/g, '<br/>') : '<p class="text-gray-500">No content available.</p>' }} />
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
        <div className="space-y-4">
            <h3 className="text-2xl font-semibold text-gray-800 mb-4">Market Research</h3>
            <div className="flex items-center space-x-4 mb-4">
                <span className="text-gray-700 text-lg">Status:</span>
                {editMode ? (
                    <select
                        value={product.research_status}
                        onChange={(e) => onStatusChange(e.target.value)}
                        className="border rounded-lg py-2 px-3 shadow focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                        {['Not Started', 'In Progress', 'Completed', 'Skipped'].map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                ) : (
                    <span className={`font-semibold text-lg ${product.research_status === 'Completed' ? 'text-green-600' : 'text-gray-600'}`}>
                        {product.research_status}
                    </span>
                )}
            </div>

            <div className="bg-gray-50 p-4 rounded-lg shadow-sm mb-6">
                <h4 className="text-xl font-semibold text-gray-800 mb-3">AI Research Assistant</h4>
                <textarea
                    className="w-full p-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[100px] mb-4"
                    placeholder="Enter product idea or research prompt for AI (e.g., 'A mobile app for tracking personal finance with budgeting features')."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    disabled={loadingAI || !editMode}
                />
                <button
                    onClick={handleGenerateResearch}
                    disabled={loadingAI || !editMode}
                    className={`px-6 py-2 rounded-lg font-bold text-white shadow transition duration-300 ease-in-out ${
                        loadingAI ? 'bg-gray-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700 transform hover:scale-105'
                    }`}
                >
                    {loadingAI ? 'Generating...' : 'Generate Research Document'}
                </button>
                {aiError && <p className="text-red-500 text-sm mt-2">{aiError}</p>}
            </div>

            <h4 className="text-xl font-semibold text-gray-800 mb-3">Research Document Content</h4>
            {editMode ? (
                <textarea
                    className="w-full p-4 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[400px]"
                    value={product.research_document_json || ''}
                    onChange={(e) => onContentChange(e.target.value)}
                    placeholder="AI-generated or manually entered research content will appear here."
                />
            ) : (
                <div className="bg-gray-50 p-4 rounded-lg shadow-inner prose max-w-none" dangerouslySetInnerHTML={{ __html: product.research_document_json ? product.research_document_json.replace(/\n/g, '<br/>') : '<p class="text-gray-500">No research document available.</p>' }} />
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
        <div className="space-y-4">
            <h3 className="text-2xl font-semibold text-gray-800 mb-4">Product Requirements Document (PRD)</h3>
            <div className="flex items-center space-x-4 mb-4">
                <span className="text-gray-700 text-lg">Status:</span>
                {editMode ? (
                    <select
                        value={product.prd_status}
                        onChange={(e) => onStatusChange(e.target.value)}
                        className="border rounded-lg py-2 px-3 shadow focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                        {['Not Started', 'In Progress', 'Completed', 'Skipped'].map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                ) : (
                    <span className={`font-semibold text-lg ${product.prd_status === 'Completed' ? 'text-green-600' : 'text-gray-600'}`}>
                        {product.prd_status}
                    </span>
                )}
            </div>

            <div className="bg-gray-50 p-4 rounded-lg shadow-sm mb-6">
                <h4 className="text-xl font-semibold text-gray-800 mb-3">AI PRD Generator</h4>
                <p className="text-gray-700 text-sm mb-2">
                    *Note: A Research Document is highly recommended before generating a PRD for best results.
                </p>
                <textarea
                    className="w-full p-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[100px] mb-4"
                    placeholder="Enter user-specific requirements or additional details for the PRD (e.g., 'Focus on mobile-first design, integrate with Stripe for payments')."
                    value={userRequirements}
                    onChange={(e) => setUserRequirements(e.target.value)}
                    disabled={loadingAI || !editMode}
                />
                <textarea
                    className="w-full p-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[80px] mb-4"
                    placeholder="Confirm or suggest a PRD structure (e.g., 'Standard PRD structure' or 'Include detailed user stories')."
                    value={prdStructureConfirmation}
                    onChange={(e) => setPrdStructureConfirmation(e.target.value)}
                    disabled={loadingAI || !editMode}
                />
                <button
                    onClick={handleGeneratePRD}
                    disabled={loadingAI || !editMode}
                    className={`px-6 py-2 rounded-lg font-bold text-white shadow transition duration-300 ease-in-out ${
                        loadingAI ? 'bg-gray-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700 transform hover:scale-105'
                    }`}
                >
                    {loadingAI ? 'Generating...' : 'Generate PRD'}
                </button>
                {aiError && <p className="text-red-500 text-sm mt-2">{aiError}</p>}
            </div>

            <h4 className="text-xl font-semibold text-gray-800 mb-3">PRD Content</h4>
            {editMode ? (
                <textarea
                    className="w-full p-4 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[400px]"
                    value={product.prd_document_json || ''}
                    onChange={(e) => onContentChange(e.target.value)}
                    placeholder="AI-generated or manually entered PRD content will appear here."
                />
            ) : (
                <div className="bg-gray-50 p-4 rounded-lg shadow-inner prose max-w-none" dangerouslySetInnerHTML={{ __html: product.prd_document_json ? product.prd_document_json.replace(/\n/g, '<br/>') : '<p class="text-gray-500">No PRD available.</p>' }} />
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
        interview_date: new Date().toISOString().slice(0, 16), // YYYY-MM-DDTHH:MM
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

    if (loading) return <div className="text-center mt-8">Loading customer interviews...</div>;
    if (error) return <div className="text-center mt-8 text-red-500">{error}</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-2xl font-semibold text-gray-800">Customer Interviews</h3>
                {isEditor && (
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg shadow transition duration-300 ease-in-out transform hover:scale-105"
                    >
                        + Add New Interview
                    </button>
                )}
            </div>

            {interviews.length === 0 ? (
                <p className="text-center text-gray-600 text-lg">No interviews recorded yet.</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {interviews.map(interview => (
                        <div key={interview.id} className="bg-gray-50 p-6 rounded-lg shadow-md">
                            <h4 className="text-xl font-semibold text-gray-900 mb-2">{interview.customer_name}</h4>
                            <p className="text-gray-600 text-sm mb-1">Email: {interview.customer_email || 'N/A'}</p>
                            <p className="text-gray-600 text-sm mb-4">Date: {formatDate(interview.interview_date)}</p>
                            <div className="flex justify-end">
                                <button
                                    onClick={() => handleViewDetails(interview)}
                                    className="bg-blue-500 hover:bg-blue-600 text-white text-sm px-3 py-1 rounded-lg transition duration-300 ease-in-out transform hover:scale-105"
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
                    <form onSubmit={handleAddInterview} className="space-y-4">
                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2">Customer Name</label>
                            <input
                                type="text"
                                name="customer_name"
                                value={newInterviewData.customer_name}
                                onChange={handleInputChange}
                                className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2">Customer Email</label>
                            <input
                                type="email"
                                name="customer_email"
                                value={newInterviewData.customer_email}
                                onChange={handleInputChange}
                                className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2">Interview Date & Time</label>
                            <input
                                type="datetime-local"
                                name="interview_date"
                                value={newInterviewData.interview_date}
                                onChange={handleInputChange}
                                className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2">Interview Notes</label>
                            <textarea
                                name="interview_notes_json"
                                value={newInterviewData.interview_notes_json}
                                onChange={handleInputChange}
                                className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 min-h-[150px]"
                                placeholder="Enter interview notes here..."
                            />
                        </div>
                        <div className="flex justify-end space-x-4">
                            <button
                                type="button"
                                onClick={() => setShowAddModal(false)}
                                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg"
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
            <div className="space-y-4">
                <div>
                    <label className="block text-gray-700 text-sm font-bold mb-1">Customer Name</label>
                    {editMode && isEditor ? (
                        <input
                            type="text"
                            name="customer_name"
                            value={editedInterview.customer_name}
                            onChange={handleInputChange}
                            className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700"
                        />
                    ) : (
                        <p className="text-gray-900">{interview.customer_name}</p>
                    )}
                </div>
                <div>
                    <label className="block text-gray-700 text-sm font-bold mb-1">Customer Email</label>
                    {editMode && isEditor ? (
                        <input
                            type="email"
                            name="customer_email"
                            value={editedInterview.customer_email || ''}
                            onChange={handleInputChange}
                            className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700"
                        />
                    ) : (
                        <p className="text-gray-900">{interview.customer_email || 'N/A'}</p>
                    )}
                </div>
                <div>
                    <label className="block text-gray-700 text-sm font-bold mb-1">Interview Date & Time</label>
                    {editMode && isEditor ? (
                        <input
                            type="datetime-local"
                            name="interview_date"
                            value={editedInterview.interview_date ? editedInterview.interview_date.slice(0, 16) : ''}
                            onChange={handleInputChange}
                            className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700"
                        />
                    ) : (
                        <p className="text-gray-900">{formatDate(interview.interview_date)}</p>
                    )}
                </div>
                <div>
                    <label className="block text-gray-700 text-sm font-bold mb-1">Interview Notes</label>
                    {editMode && isEditor ? (
                        <textarea
                            name="interview_notes_json"
                            value={editedInterview.interview_notes_json || ''}
                            onChange={handleInputChange}
                            className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 min-h-[150px]"
                            placeholder="Enter interview notes here..."
                        />
                    ) : (
                        <div className="bg-gray-100 p-3 rounded-lg prose max-w-none" dangerouslySetInnerHTML={{ __html: interview.interview_notes_json ? interview.interview_notes_json.replace(/\n/g, '<br/>') : '<p class="text-gray-500">No notes available.</p>' }} />
                    )}
                </div>

                <div className="flex justify-between items-center mt-4">
                    <h4 className="text-lg font-semibold text-gray-800">AI Summary</h4>
                    {isEditor && (
                        <button
                            onClick={handleGenerateClick}
                            disabled={aiSummaryLoading || !editedInterview.interview_notes_json}
                            className={`px-4 py-2 rounded-lg font-bold text-white shadow transition duration-300 ease-in-out ${
                                aiSummaryLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'
                            }`}
                        >
                            {aiSummaryLoading ? 'Generating...' : 'Generate AI Summary'}
                        </button>
                    )}
                </div>
                {aiSummaryError && <p className="text-red-500 text-sm mt-2">{aiSummaryError}</p>}
                <div className="bg-gray-100 p-3 rounded-lg prose max-w-none">
                    {editedInterview.ai_summary_json ? (
                        <div dangerouslySetInnerHTML={{ __html: editedInterview.ai_summary_json.replace(/\n/g, '<br/>') }} />
                    ) : (
                        <p className="text-gray-500">No AI summary available.</p>
                    )}
                </div>

                <div className="flex justify-end space-x-4 mt-6">
                    {isEditor && (
                        <>
                            {editMode ? (
                                <button
                                    onClick={handleSave}
                                    className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg"
                                >
                                    Save Changes
                                </button>
                            ) : (
                                <button
                                    onClick={() => setEditMode(true)}
                                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg"
                                >
                                    Edit
                                </button>
                            )}
                            <button
                                onClick={() => onDelete(interview.id)}
                                className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg"
                            >
                                Delete
                            </button>
                        </>
                    )}
                    <button
                        onClick={onClose}
                        className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg"
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

    if (loading) return <div className="text-center mt-8">Loading interview templates...</div>;
    if (error) return <div className="text-center mt-8 text-red-500">{error}</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-2xl font-semibold text-gray-800">Interview Templates</h3>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg shadow transition duration-300 ease-in-out transform hover:scale-105"
                >
                    + Create New Template
                </button>
            </div>

            {templates.length === 0 ? (
                <p className="text-center text-gray-600 text-lg">No templates created yet.</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {templates.map(template => (
                        <div key={template.id} className="bg-gray-50 p-6 rounded-lg shadow-md">
                            <h4 className="text-xl font-semibold text-gray-900 mb-2">{template.template_name}</h4>
                            <p className="text-gray-600 text-sm mb-4">Created: {new Date(template.created_at).toLocaleDateString()}</p>
                            <div className="flex justify-end">
                                <button
                                    onClick={() => handleViewDetails(template)}
                                    className="bg-blue-500 hover:bg-blue-600 text-white text-sm px-3 py-1 rounded-lg transition duration-300 ease-in-out transform hover:scale-105"
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
                    <form onSubmit={handleAddTemplate} className="space-y-4">
                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2">Template Name</label>
                            <input
                                type="text"
                                name="template_name"
                                value={newTemplateData.template_name}
                                onChange={handleInputChange}
                                className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2">Template Questions (Editor.js JSON)</label>
                            <textarea
                                name="template_questions_json"
                                value={newTemplateData.template_questions_json}
                                onChange={handleInputChange}
                                className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 min-h-[150px]"
                                placeholder="Enter template questions here (e.g., 'What problem are you trying to solve?')."
                            />
                        </div>
                        <div className="flex justify-end space-x-4">
                            <button
                                type="button"
                                onClick={() => setShowAddModal(false)}
                                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg"
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
            <div className="space-y-4">
                <div>
                    <label className="block text-gray-700 text-sm font-bold mb-1">Template Name</label>
                    {editMode ? (
                        <input
                            type="text"
                            name="template_name"
                            value={editedTemplate.template_name}
                            onChange={handleInputChange}
                            className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700"
                        />
                    ) : (
                        <p className="text-gray-900">{template.template_name}</p>
                    )}
                </div>
                <div>
                    <label className="block text-gray-700 text-sm font-bold mb-1">Template Questions</label>
                    {editMode ? (
                        <textarea
                            name="template_questions_json"
                            value={editedTemplate.template_questions_json || ''}
                            onChange={handleInputChange}
                            className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 min-h-[150px]"
                            placeholder="Enter template questions here..."
                        />
                    ) : (
                        <div className="bg-gray-100 p-3 rounded-lg prose max-w-none" dangerouslySetInnerHTML={{ __html: template.template_questions_json ? template.template_questions_json.replace(/\n/g, '<br/>') : '<p class="text-gray-500">No questions available.</p>' }} />
                    )}
                </div>

                <div className="bg-gray-50 p-4 rounded-lg shadow-sm mt-4">
                    <h4 className="text-xl font-semibold text-gray-800 mb-3">AI Question Generator</h4>
                    <textarea
                        className="w-full p-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[80px] mb-4"
                        placeholder="Enter a feature idea to generate interview questions (e.g., 'A new social media feature for sharing short videos')."
                        value={featureIdeaForAI}
                        onChange={(e) => setFeatureIdeaForAI(e.target.value)}
                        disabled={aiQuestionsLoading}
                    />
                    <button
                        onClick={handleGenerateClick}
                        disabled={aiQuestionsLoading || !featureIdeaForAI}
                        className={`px-6 py-2 rounded-lg font-bold text-white shadow transition duration-300 ease-in-out ${
                            aiQuestionsLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'
                        }`}
                    >
                        {aiQuestionsLoading ? 'Generating...' : 'Generate Questions'}
                    </button>
                    {aiQuestionsError && <p className="text-red-500 text-sm mt-2">{aiQuestionsError}</p>}
                </div>

                <div className="flex justify-end space-x-4 mt-6">
                    {editMode ? (
                        <button
                            onClick={handleSave}
                            className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg"
                        >
                            Save Changes
                        </button>
                    ) : (
                        <button
                            onClick={() => setEditMode(true)}
                            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg"
                        >
                            Edit
                        </button>
                    )}
                    <button
                        onClick={() => onDelete(template.id)}
                        className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg"
                    >
                        Delete
                    </button>
                    <button
                        onClick={onClose}
                        className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg"
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
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative">
                <h3 className="text-2xl font-bold text-gray-800 mb-4 border-b pb-2">{title}</h3>
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl font-bold"
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

    if (loading) return <div className="text-center mt-8">Loading tasks...</div>;
    if (error) return <div className="text-center mt-8 text-red-500">{error}</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-2xl font-semibold text-gray-800">Tasks</h3>
                {isEditor && (
                    <button
                        onClick={() => setShowAddTaskModal(true)}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg shadow transition duration-300 ease-in-out transform hover:scale-105"
                    >
                        + Add New Task
                    </button>
                )}
            </div>

            {tasks.length === 0 ? (
                <p className="text-center text-gray-600 text-lg">No tasks for this product yet.</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tasks.map(task => (
                        <div key={task.id} className="bg-gray-50 p-6 rounded-lg shadow-md">
                            <h4 className="text-xl font-semibold text-gray-900 mb-2">{task.title}</h4>
                            <p className="text-gray-700 text-sm mb-1">{task.description}</p>
                            <p className="text-gray-600 text-sm mb-1">Status: <span className="font-medium">{task.status}</span></p>
                            <p className="text-gray-600 text-sm mb-1">Priority: <span className="font-medium">{task.priority}</span></p>
                            <p className="text-gray-600 text-sm mb-1">Assigned To: <span className="font-medium">{task.assigned_to_username || 'Unassigned'}</span></p>
                            <p className="text-gray-600 text-sm mb-4">Due Date: <span className="font-medium">{formatDate(task.due_date)}</span></p>
                            {isEditor && (
                                <div className="flex justify-end space-x-2">
                                    <button
                                        onClick={() => handleEditTaskClick(task)}
                                        className="bg-blue-500 hover:bg-blue-600 text-white text-sm px-3 py-1 rounded-lg transition duration-300 ease-in-out transform hover:scale-105"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDeleteTask(task.id)}
                                        className="bg-red-500 hover:bg-red-600 text-white text-sm px-3 py-1 rounded-lg transition duration-300 ease-in-out transform hover:scale-105"
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
                    <form onSubmit={handleCreateTask} className="space-y-4">
                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2">Title</label>
                            <input
                                type="text"
                                name="title"
                                value={newTaskData.title}
                                onChange={handleNewTaskInputChange}
                                className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2">Description</label>
                            <textarea
                                name="description"
                                value={newTaskData.description}
                                onChange={handleNewTaskInputChange}
                                className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 min-h-[100px]"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2">Assigned To</label>
                            <select
                                name="assigned_to_user_id"
                                value={newTaskData.assigned_to_user_id}
                                onChange={handleNewTaskInputChange}
                                className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700"
                            >
                                <option value="">Unassigned</option>
                                {allUsers.map(u => (
                                    <option key={u.id} value={u.id}>{u.username} ({u.email})</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2">Status</label>
                            <select
                                name="status"
                                value={newTaskData.status}
                                onChange={handleNewTaskInputChange}
                                className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700"
                            >
                                {['To Do', 'In Progress', 'Done', 'Blocked', 'Archived'].map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2">Priority</label>
                            <select
                                name="priority"
                                value={newTaskData.priority}
                                onChange={handleNewTaskInputChange}
                                className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700"
                            >
                                {['Low', 'Medium', 'High', 'Critical'].map(p => (
                                    <option key={p} value={p}>{p}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2">Due Date</label>
                            <input
                                type="datetime-local"
                                name="due_date"
                                value={newTaskData.due_date}
                                onChange={handleNewTaskInputChange}
                                className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700"
                            />
                        </div>
                        <div className="flex justify-end space-x-4">
                            <button
                                type="button"
                                onClick={() => setShowAddTaskModal(false)}
                                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg"
                            >
                                Add Task
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {showEditTaskModal && editingTask && (
                <Modal title="Edit Task" onClose={() => setShowEditTaskModal(false)}>
                    <form onSubmit={handleUpdateTask} className="space-y-4">
                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2">Title</label>
                            <input
                                type="text"
                                name="title"
                                value={editingTask.title}
                                onChange={handleEditTaskInputChange}
                                className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2">Description</label>
                            <textarea
                                name="description"
                                value={editingTask.description || ''}
                                onChange={handleEditTaskInputChange}
                                className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 min-h-[100px]"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2">Assigned To</label>
                            <select
                                name="assigned_to_user_id"
                                value={editingTask.assigned_to_user_id}
                                onChange={handleEditTaskInputChange}
                                className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700"
                            >
                                <option value="">Unassigned</option>
                                {allUsers.map(u => (
                                    <option key={u.id} value={u.id}>{u.username} ({u.email})</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2">Status</label>
                            <select
                                name="status"
                                value={editingTask.status}
                                onChange={handleEditTaskInputChange}
                                className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700"
                            >
                                {['To Do', 'In Progress', 'Done', 'Blocked', 'Archived'].map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2">Priority</label>
                            <select
                                name="priority"
                                value={editingTask.priority}
                                onChange={handleEditTaskInputChange}
                                className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700"
                            >
                                {['Low', 'Medium', 'High', 'Critical'].map(p => (
                                    <option key={p} value={p}>{p}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2">Due Date</label>
                            <input
                                type="datetime-local"
                                name="due_date"
                                value={editingTask.due_date}
                                onChange={handleEditTaskInputChange}
                                className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700"
                            />
                        </div>
                        <div className="flex justify-end space-x-4">
                            <button
                                type="button"
                                onClick={() => setShowEditTaskModal(false)}
                                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg"
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

    if (loading) return <div className="text-center mt-8">Loading collaboration details...</div>;
    if (error) return <div className="text-center mt-8 text-red-500">{error}</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-2xl font-semibold text-gray-800">Product Collaboration</h3>
                {isOwner && (
                    <button
                        onClick={() => setShowInviteModal(true)}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg shadow transition duration-300 ease-in-out transform hover:scale-105"
                    >
                        + Invite User
                    </button>
                )}
            </div>

            {accesses.length === 0 ? (
                <p className="text-center text-gray-600 text-lg">No collaborators for this product yet.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-md">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">User</th>
                                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">Email</th>
                                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">Role</th>
                                {isOwner && <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {accesses.map(access => (
                                <tr key={access.id} className="border-t border-gray-200 hover:bg-gray-50">
                                    <td className="py-3 px-4 text-gray-800">{access.user_username || 'N/A'}</td>
                                    <td className="py-3 px-4 text-gray-800">{access.user_email}</td>
                                    <td className="py-3 px-4 text-gray-800">
                                        {isOwner && access.user_id !== user.id ? ( // Owner can change others' roles
                                            <select
                                                value={access.role}
                                                onChange={(e) => handleUpdateRole(access.id, access.user_id, e.target.value)}
                                                className="border rounded-lg py-1 px-2 text-gray-700"
                                            >
                                                <option value="owner">Owner</option>
                                                <option value="editor">Editor</option>
                                                <option value="viewer">Viewer</option>
                                            </select>
                                        ) : (
                                            <span className="font-medium capitalize">{access.role}</span>
                                        )}
                                    </td>
                                    {isOwner && (
                                        <td className="py-3 px-4">
                                            {access.user_id !== user.id && ( // Cannot remove self as owner
                                                <button
                                                    onClick={() => handleRemoveAccess(access.user_id)}
                                                    className="bg-red-500 hover:bg-red-600 text-white text-sm px-3 py-1 rounded-lg transition duration-300 ease-in-out transform hover:scale-105"
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
                    <form onSubmit={handleInviteUser} className="space-y-4">
                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2">User Email</label>
                            <input
                                type="email"
                                name="user_email"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700"
                                required
                            />
                            <p className="text-gray-500 text-xs mt-1">
                                User must be registered in the system.
                            </p>
                        </div>
                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2">Role</label>
                            <select
                                name="role"
                                value={inviteRole}
                                onChange={(e) => setInviteRole(e.target.value)}
                                className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700"
                            >
                                <option value="viewer">Viewer</option>
                                <option value="editor">Editor</option>
                            </select>
                        </div>
                        <div className="flex justify-end space-x-4">
                            <button
                                type="button"
                                onClick={() => setShowInviteModal(false)}
                                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg"
                            >
                                Send Invite
                            </button>
                        </div>
                    </form>
                    {inviteMessage && (
                        <p className={`mt-4 text-center ${inviteMessage.includes('success') ? 'text-green-500' : 'text-red-500'}`}>
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