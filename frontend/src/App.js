import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Define the API URL for your backend.
// In development, it will default to http://localhost:5000.
// In production (on Vercel), it will use the REACT_APP_API_URL environment variable.
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// --- AuthPage Component ---
// This component will handle both login and signup forms
function AuthPage({ setIsLoggedIn, setAuthMessage }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoginMode, setIsLoginMode] = useState(true); // true for login, false for signup
    const [loading, setLoading] = useState(false);
    const [authError, setAuthError] = useState(null);
    const [rememberMe, setRememberMe] = useState(false); // New state for "Remember me"

    const handleAuthSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setAuthError(null);
        setAuthMessage(''); // Clear global auth message

        try {
            let response;
            if (isLoginMode) {
                // Login API call
                response = await axios.post(`${API_URL}/api/login`, { email, password });
                localStorage.setItem('token', response.data.token); // Store JWT token
                setIsLoggedIn(true); // Update parent state to show main app
            } else {
                // Signup API call
                response = await axios.post(`${API_URL}/api/signup`, { email, password });
                // For signup, we just show the message and stay on auth page
                setAuthMessage(response.data.message); // Set global auth message for approval pending
                setIsLoginMode(true); // Switch to login mode after successful signup attempt
            }
            // For successful login, message is handled by setIsLoggedIn.
            // For successful signup, message is handled by setAuthMessage.
        } catch (err) {
            console.error("Authentication error:", err);
            if (err.response && err.response.data && err.response.data.message) {
                setAuthError(err.response.data.message); // Display specific backend error message
            } else {
                setAuthError("An unexpected error occurred. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 font-inter antialiased">
            <div className="flex w-full max-w-5xl bg-white rounded-xl shadow-2xl overflow-hidden">
                {/* Left Column - Dark Background */}
                <div className="w-1/2 bg-gray-900 text-white p-12 flex flex-col justify-center items-start">
                    <h1 className="text-6xl font-extrabold mb-4 leading-tight">
                        Auto Product Manager
                    </h1>
                    <p className="text-2xl font-light leading-relaxed">
                        Your Product Manager on <span className="text-purple-400 font-semibold">Autopilot Mode</span>
                    </p>
                    <p className="mt-8 text-lg text-gray-400">
                        Streamline your product discovery with AI-powered insights and seamless management.
                    </p>
                </div>

                {/* Right Column - Login/Signup Form */}
                <div className="w-1/2 p-12 flex flex-col justify-center">
                    <h2 className="text-4xl font-bold text-gray-900 mb-2 text-left">
                        {isLoginMode ? 'Login to your account' : 'Create your account'}
                    </h2>
                    <p className="text-gray-600 mb-8 text-left">
                        {isLoginMode ? (
                            <>
                                Don't have an account?{' '}
                                <button
                                    onClick={() => { setIsLoginMode(false); setAuthError(null); }}
                                    className="text-purple-600 hover:underline font-semibold"
                                >
                                    Sign Up
                                </button>
                            </>
                        ) : (
                            <>
                                Already have an account?{' '}
                                <button
                                    onClick={() => { setIsLoginMode(true); setAuthError(null); }}
                                    className="text-purple-600 hover:underline font-semibold"
                                >
                                    Login
                                </button>
                            </>
                        )}
                    </p>

                    {/* Social Login Buttons (Placeholders) */}
                    <div className="space-y-4 mb-6">
                        <button className="w-full flex items-center justify-center px-6 py-3 border border-gray-300 rounded-lg shadow-sm text-lg font-medium text-gray-700 hover:bg-gray-50 transition duration-200">
                            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12.24 10.29v2.45h6.64c-.26 1.43-1.04 2.87-2.3 3.86l2.19 1.7c1.37-1.28 2.17-3.1 2.17-5.51 0-1.8-.32-3.2-.9-4.39H12.24z" fill="#4285F4"/>
                                <path d="M12.24 20.48c-3.23 0-5.96-1.72-7.46-4.25l2.25-1.75c1.1 1.9 2.94 3.19 5.21 3.19 2.93 0 4.96-1.92 4.96-4.75 0-.39-.04-.77-.11-1.14H12.24v-3.08h7.97c.1.53.16 1.09.16 1.69 0 3.8-2.6 6.8-7.97 6.8z" fill="#34A853"/>
                                <path d="M4.78 14.23c-.2-.6-.32-1.23-.32-1.88 0-.65.12-1.28.32-1.88L2.53 8.7C1.86 10.15 1.5 12.01 1.5 14c0 1.99.36 3.85 1.03 5.3L4.78 14.23z" fill="#FBBC05"/>
                                <path d="M12.24 3.52c1.43 0 2.7.5 3.7 1.46l2.11-2.06c-1.44-1.35-3.3-2.12-5.81-2.12-3.23 0-5.96 1.72-7.46 4.25l2.25 1.75c1.1-1.9 2.94-3.19 5.21-3.19z" fill="#EA4335"/>
                            </svg>
                            Sign in with Google
                        </button>
                        <button className="w-full flex items-center justify-center px-6 py-3 border border-gray-300 rounded-lg shadow-sm text-lg font-medium text-gray-700 hover:bg-gray-50 transition duration-200">
                            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M22.675 0H1.325C.593 0 0 .593 0 1.325v21.35C0 23.407.593 24 1.325 24h11.397V14.77h-3.04V11.16h3.04V8.56c0-3.02 1.83-4.66 4.52-4.66 1.303 0 2.427.097 2.744.14v3.17h-1.87c-1.47 0-1.75.7-1.75 1.72v2.24h3.55l-.54 3.61h-3.01V24h6.07c.732 0 1.325-.593 1.325-1.325V1.325C24 .593 23.407 0 22.675 0z" fill="#1877F2"/>
                            </svg>
                            Sign in with Facebook
                        </button>
                    </div>

                    <div className="relative flex py-5 items-center">
                        <div className="flex-grow border-t border-gray-300"></div>
                        <span className="flex-shrink mx-4 text-gray-500">OR</span>
                        <div className="flex-grow border-t border-gray-300"></div>
                    </div>

                    <form onSubmit={handleAuthSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="email" className="sr-only">Email address</label>
                            <input
                                id="email"
                                type="email"
                                placeholder="Email address"
                                className="w-full p-4 border border-gray-300 rounded-lg shadow-sm text-lg focus:ring-purple-500 focus:border-purple-500 transition duration-200 ease-in-out"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="sr-only">Password</label>
                            <input
                                id="password"
                                type="password"
                                placeholder="Password"
                                className="w-full p-4 border border-gray-300 rounded-lg shadow-sm text-lg focus:ring-purple-500 focus:border-purple-500 transition duration-200 ease-in-out"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            {isLoginMode && (
                                <div className="text-right mt-2">
                                    <a href="#" className="text-sm text-purple-600 hover:underline font-medium">Forgot Password?</a>
                                </div>
                            )}
                        </div>
                        {isLoginMode && (
                            <div className="flex items-center">
                                <input
                                    id="remember-me"
                                    name="remember-me"
                                    type="checkbox"
                                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                />
                                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                                    Remember me
                                </label>
                            </div>
                        )}
                        <button
                            type="submit"
                            className="w-full px-6 py-4 bg-gray-900 text-white font-bold rounded-lg shadow-lg hover:bg-gray-700 transition duration-300 ease-in-out transform hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={loading}
                        >
                            {loading ? 'Processing...' : (isLoginMode ? 'Login' : 'Sign Up')}
                        </button>
                    </form>

                    {authError && (
                        <p className="text-red-600 text-center mt-6 text-base font-medium">{authError}</p>
                    )}
                </div>
            </div>
        </div>
    );
}

// --- Main App Component (Your existing Product Manager App) ---
function App() {
    // State variables for managing product data and UI
    const [products, setProducts] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [newProductName, setNewProductName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [generatedDocument, setGeneratedDocument] = useState('');
    const [discoveryInput, setDiscoveryInput] = useState('');

    // Authentication state
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [authMessage, setAuthMessage] = useState(''); // For messages like "awaiting approval"

    // Check for existing token on app load
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            // In a real app, you'd verify the token with the backend here.
            // For now, presence of token means logged in.
            setIsLoggedIn(true);
        }
    }, []);

    // --- useEffect Hook to Fetch Products on Component Mount (only if logged in) ---
    useEffect(() => {
        const fetchProducts = async () => {
            if (!isLoggedIn) return; // Only fetch if logged in

            setLoading(true);
            setError(null);
            try {
                const token = localStorage.getItem('token');
                const response = await axios.get(`${API_URL}/api/products`, {
                    headers: {
                        Authorization: `Bearer ${token}` // Send token with requests
                    }
                });
                setProducts(response.data);
            } catch (err) {
                console.error("Error fetching products:", err);
                setError("Failed to load products. Please check the backend server or your login status.");
                // If token is invalid or expired, log out
                if (err.response && (err.response.status === 401 || err.response.status === 403)) {
                    handleLogout();
                }
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, [isLoggedIn]); // Re-run when login status changes

    // --- Handlers for Product Management ---

    const handleAddProduct = async () => {
        if (!newProductName.trim()) {
            alert("Product name cannot be empty.");
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(`${API_URL}/api/products`, {
                name: newProductName
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            setProducts([response.data, ...products]);
            setNewProductName('');
        } catch (err) {
            console.error("Error creating product:", err);
            setError("Failed to add product. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleSelectProduct = (product) => {
        setSelectedProduct(product);
        setGeneratedDocument(product.discovery_document || '');
        setDiscoveryInput('');
    };

    const handleDeleteProduct = async (productId) => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_URL}/api/products/${productId}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            setProducts(products.filter(p => p.id !== productId));
            if (selectedProduct && selectedProduct.id === productId) {
                setSelectedProduct(null);
                setGeneratedDocument('');
                setDiscoveryInput('');
            }
        } catch (err) {
            console.error("Error deleting product:", err);
            setError("Failed to delete product. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // --- Handler for AI Document Generation ---
    const handleGenerateDocument = async () => {
        if (!selectedProduct) {
            alert("Please select a product/feature first.");
            return;
        }
        if (!discoveryInput.trim()) {
            alert("Please enter details for the AI Discovery Assistant.");
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(`${API_URL}/api/generate-discovery-document`, {
                product_name: selectedProduct.name,
                details: discoveryInput
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            const doc = response.data.discovery_document;
            setGeneratedDocument(doc);

            await axios.put(`${API_URL}/api/products/${selectedProduct.id}`, {
                discovery_document: doc
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            setProducts(products.map(p =>
                p.id === selectedProduct.id ? { ...p, discovery_document: doc } : p
            ));
            setSelectedProduct(prev => ({ ...prev, discovery_document: doc }));

        } catch (err) {
            console.error("Error generating document:", err);
            setError("Failed to generate document. Make sure your Gemini API key is set correctly in the backend or there's a network issue!");
        } finally {
            setLoading(false);
        }
    };

    // --- Logout Handler ---
    const handleLogout = () => {
        localStorage.removeItem('token'); // Remove JWT from local storage
        setIsLoggedIn(false); // Update state to show login page
        setProducts([]); // Clear product data
        setSelectedProduct(null); // Clear selected product
        setGeneratedDocument(''); // Clear generated document
        setDiscoveryInput(''); // Clear AI input
        setAuthMessage('You have been logged out.'); // Optional: show a logout message
    };

    // --- Conditional Rendering: Show AuthPage or Main App ---
    if (!isLoggedIn) {
        return <AuthPage setIsLoggedIn={setIsLoggedIn} setAuthMessage={setAuthMessage} />;
    }

    // --- Main App UI (only rendered if isLoggedIn is true) ---
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 p-8 font-inter antialiased">
            <header className="text-center mb-12 py-6 bg-white shadow-lg rounded-b-3xl">
                <h1 className="text-6xl font-extrabold text-gray-900 leading-tight tracking-tight">
                    Auto Product Manager
                </h1>
                <p className="mt-4 text-2xl text-gray-600">
                    Your Product Manager on <span className="text-purple-700 font-bold">Autopilot Mode</span>
                </p>
                <button
                    onClick={handleLogout}
                    className="mt-6 px-6 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg shadow-md hover:bg-gray-300 transition duration-300 ease-in-out transform hover:scale-105"
                >
                    Logout
                </button>
                {authMessage && (
                    <p className="text-green-600 text-center mt-4 text-lg font-semibold">{authMessage}</p>
                )}
            </header>

            {/* Main Content Area */}
            <div className="max-w-screen-xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Left Column: Product List */}
                <div className="bg-white p-10 rounded-3xl shadow-xl border border-gray-100">
                    <h2 className="text-3xl font-bold text-gray-800 mb-8 border-b-2 pb-4 border-purple-300">Product/Feature List</h2>

                    {/* Add New Product Input */}
                    <div className="flex items-center mb-8 space-x-4">
                        <input
                            type="text"
                            placeholder="Enter new product/feature name"
                            className="flex-grow p-4 border border-gray-300 rounded-xl shadow-sm text-lg focus:ring-purple-500 focus:border-purple-500 transition duration-200 ease-in-out"
                            value={newProductName}
                            onChange={(e) => setNewProductName(e.target.value)}
                            onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                    handleAddProduct();
                                }
                            }}
                        />
                        <button
                            onClick={handleAddProduct}
                            className="px-8 py-4 bg-purple-600 text-white font-bold rounded-xl shadow-lg hover:bg-purple-700 transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={loading}
                        >
                            {loading ? 'Adding...' : 'Add Product'}
                        </button>
                    </div>

                    {/* Display Loading/Error State */}
                    {loading && <p className="text-purple-500 text-center my-6 text-lg font-medium">Loading...</p>}
                    {error && <p className="text-red-600 text-center my-6 text-lg font-medium">{error}</p>}

                    {/* Product List Display */}
                    <div className="max-h-[60vh] overflow-y-auto pr-3 custom-scrollbar">
                        {products.length === 0 && !loading && !error ? (
                            <p className="text-gray-500 text-center py-12 text-lg">No products added yet. Start by adding one!</p>
                        ) : (
                            <ul className="space-y-5">
                                {products.map(product => (
                                    <li
                                        key={product.id}
                                        className={`flex justify-between items-center p-5 rounded-2xl shadow-md cursor-pointer transition duration-200 ease-in-out transform hover:scale-[1.01] hover:shadow-lg
                                            ${selectedProduct && selectedProduct.id === product.id ? 'bg-purple-50 border-purple-500 border-2' : 'bg-white border border-gray-200'}`}
                                        onClick={() => handleSelectProduct(product)}
                                    >
                                        <span className="text-xl font-medium text-gray-800 flex-grow">
                                            {product.name}
                                        </span>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation(); // Prevent selecting product when deleting
                                                handleDeleteProduct(product.id);
                                            }}
                                            className="ml-6 px-5 py-2 bg-red-500 text-white text-base font-semibold rounded-lg shadow-sm hover:bg-red-600 transition duration-300 ease-in-out transform hover:scale-105"
                                            disabled={loading}
                                        >
                                            Delete
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                {/* Right Column: AI Discovery Assistant */}
                <div className="bg-white p-10 rounded-3xl shadow-xl border border-gray-100">
                    <h2 className="text-3xl font-bold text-gray-800 mb-8 border-b-2 pb-4 border-purple-300">AI Discovery Assistant</h2>

                    {selectedProduct ? (
                        <div>
                            <h3 className="text-2xl font-semibold text-gray-700 mb-5">
                                Currently Selected: <span className="text-purple-600">{selectedProduct.name}</span>
                            </h3>

                            {/* Input for AI */}
                            <div className="mb-8">
                                <label htmlFor="discoveryInput" className="block text-gray-700 text-base font-bold mb-3">
                                    Details for Discovery Document:
                                </label>
                                <textarea
                                    id="discoveryInput"
                                    placeholder="e.g., Target audience, pain points, desired outcomes, core functionality, competitive analysis..."
                                    rows="10"
                                    className="w-full p-4 border border-gray-300 rounded-xl shadow-sm text-base focus:ring-purple-500 focus:border-purple-500 transition duration-200 ease-in-out"
                                    value={discoveryInput}
                                    onChange={(e) => setDiscoveryInput(e.target.value)}
                                    disabled={loading}
                                ></textarea>
                                <button
                                    onClick={handleGenerateDocument}
                                    className="mt-6 w-full px-8 py-4 bg-green-600 text-white font-bold rounded-xl shadow-lg hover:bg-green-700 transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={loading}
                                >
                                    {loading ? 'Generating...' : 'Generate Discovery Document'}
                                </button>
                            </div>

                            {/* Display Generated Document */}
                            {(generatedDocument || selectedProduct.discovery_document) && (
                                <div className="mt-10">
                                    <h3 className="text-2xl font-semibold text-gray-700 mb-5 border-t-2 pt-6 border-purple-300">
                                        {generatedDocument ? 'Generated Document' : 'Saved Document'} for {selectedProduct.name}:
                                    </h3>
                                    <div className="bg-gray-50 p-8 rounded-xl shadow-inner border border-gray-200 whitespace-pre-wrap text-gray-800 leading-relaxed text-base">
                                        {generatedDocument || selectedProduct.discovery_document}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <p className="text-gray-500 text-center py-12 text-lg">Select a product/feature from the left to generate a discovery document.</p>
                    )}
                </div>
            </div>
        </div>
    );
}

export default App;
