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
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4 font-inter antialiased">
            <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-200 w-full max-w-md text-center">
                <h1 className="text-4xl font-extrabold text-gray-900 mb-2">
                    Auto Product Manager
                </h1>
                <p className="text-lg text-gray-600 mb-8">
                    Your Product Manager on <span className="text-purple-600 font-semibold">Autopilot Mode</span>
                </p>

                <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b-2 pb-3 border-purple-200">
                    {isLoginMode ? 'Login' : 'Sign Up'}
                </h2>

                <form onSubmit={handleAuthSubmit} className="space-y-5">
                    <div>
                        <input
                            type="email"
                            placeholder="Email"
                            className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500 text-lg"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <input
                            type="password"
                            placeholder="Password"
                            className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500 text-lg"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50"
                        disabled={loading}
                    >
                        {loading ? 'Processing...' : (isLoginMode ? 'Login' : 'Sign Up')}
                    </button>
                </form>

                {authError && (
                    <p className="text-red-500 text-center mt-4">{authError}</p>
                )}

                <p className="mt-6 text-gray-600">
                    {isLoginMode ? (
                        <>
                            Don't have an account?{' '}
                            <button
                                onClick={() => { setIsLoginMode(false); setAuthError(null); }}
                                className="text-purple-600 hover:underline font-medium"
                            >
                                Sign Up
                            </button>
                        </>
                    ) : (
                        <>
                            Already have an account?{' '}
                            <button
                                onClick={() => { setIsLoginMode(true); setAuthError(null); }}
                                className="text-purple-600 hover:underline font-medium"
                            >
                                Login
                            </button>
                        </>
                    )}
                </p>
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
        <div className="min-h-screen bg-gray-100 p-8 font-inter antialiased">
            <header className="text-center mb-10">
                <h1 className="text-5xl font-extrabold text-gray-900 leading-tight">
                    Auto Product Manager
                </h1>
                <p className="mt-4 text-xl text-gray-600">
                    Your Product Manager on <span className="text-purple-600 font-semibold">Autopilot Mode</span>
                </p>
                <button
                    onClick={handleLogout}
                    className="mt-4 px-4 py-2 bg-gray-300 text-gray-800 font-semibold rounded-lg shadow-md hover:bg-gray-400 transition duration-300 ease-in-out"
                >
                    Logout
                </button>
                {authMessage && (
                    <p className="text-green-600 text-center mt-4 text-lg">{authMessage}</p>
                )}
            </header>

            {/* Main Content Area */}
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* Left Column: Product List */}
                <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-200">
                    <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b-2 pb-3 border-purple-200">Product/Feature List</h2>

                    {/* Add New Product Input */}
                    <div className="flex items-center mb-6 space-x-3">
                        <input
                            type="text"
                            placeholder="New product/feature name"
                            className="flex-grow p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500 text-lg"
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
                            className="px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50"
                            disabled={loading}
                        >
                            {loading ? 'Adding...' : 'Add Product'}
                        </button>
                    </div>

                    {/* Display Loading/Error State */}
                    {loading && <p className="text-purple-500 text-center my-4">Loading...</p>}
                    {error && <p className="text-red-500 text-center my-4">{error}</p>}

                    {/* Product List Display */}
                    <div className="max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                        {products.length === 0 && !loading && !error ? (
                            <p className="text-gray-500 text-center py-8">No products added yet. Start by adding one!</p>
                        ) : (
                            <ul className="space-y-4">
                                {products.map(product => (
                                    <li
                                        key={product.id}
                                        className={`flex justify-between items-center p-4 rounded-xl shadow-md cursor-pointer transition duration-200 ease-in-out transform hover:scale-[1.02]
                                            ${selectedProduct && selectedProduct.id === product.id ? 'bg-purple-100 border-purple-500 border-2' : 'bg-gray-50 border border-gray-200'}`}
                                        onClick={() => handleSelectProduct(product)}
                                    >
                                        <span className="text-lg font-medium text-gray-700 flex-grow">
                                            {product.name}
                                        </span>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteProduct(product.id);
                                            }}
                                            className="ml-4 px-4 py-2 bg-red-500 text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-red-600 transition duration-300 ease-in-out transform hover:scale-105"
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
                <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-200">
                    <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b-2 pb-3 border-purple-200">AI Discovery Assistant</h2>

                    {selectedProduct ? (
                        <div>
                            <h3 className="text-xl font-semibold text-gray-700 mb-4">
                                Currently Selected: <span className="text-purple-600">{selectedProduct.name}</span>
                            </h3>

                            {/* Input for AI */}
                            <div className="mb-6">
                                <label htmlFor="discoveryInput" className="block text-gray-700 text-sm font-bold mb-2">
                                    Details for Discovery Document:
                                </label>
                                <textarea
                                    id="discoveryInput"
                                    placeholder="e.g., Target audience, pain points, desired outcomes, core functionality..."
                                    rows="8"
                                    className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500 text-base"
                                    value={discoveryInput}
                                    onChange={(e) => setDiscoveryInput(e.target.value)}
                                    disabled={loading}
                                ></textarea>
                                <button
                                    onClick={handleGenerateDocument}
                                    className="mt-4 w-full px-6 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50"
                                    disabled={loading}
                                >
                                    {loading ? 'Generating...' : 'Generate Discovery Document'}
                                </button>
                            </div>

                            {/* Display Generated Document */}
                            {generatedDocument && (
                                <div className="mt-8">
                                    <h3 className="text-xl font-semibold text-gray-700 mb-4 border-t-2 pt-4 border-purple-200">
                                        Generated Document for {selectedProduct.name}:
                                    </h3>
                                    <div className="bg-gray-50 p-6 rounded-lg shadow-inner border border-gray-200 whitespace-pre-wrap text-gray-800 leading-relaxed text-base">
                                        {generatedDocument}
                                    </div>
                                </div>
                            )}
                             {selectedProduct.discovery_document && !generatedDocument && (
                                <div className="mt-8">
                                    <h3 className="text-xl font-semibold text-gray-700 mb-4 border-t-2 pt-4 border-purple-200">
                                        Saved Document for {selectedProduct.name}:
                                    </h3>
                                    <div className="bg-gray-50 p-6 rounded-lg shadow-inner border border-gray-200 whitespace-pre-wrap text-gray-800 leading-relaxed text-base">
                                        {selectedProduct.discovery_document}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <p className="text-gray-500 text-center py-8">Select a product/feature from the left to generate a discovery document.</p>
                    )}
                </div>
            </div>
        </div>
    );
}

export default App;