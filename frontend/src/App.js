import React, { useState, useEffect } from 'react';
import axios from 'axios';
// Removed unused lucide-react imports as they are not used in the current UI implementation.
// import { Eye, EyeOff, ArrowRight, Sparkles, Zap, Users, BarChart3 } from 'lucide-react';

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
    const [rememberMe, setRememberMe] = useState(false); // State for "Remember me"
    const [showPassword, setShowPassword] = useState(false); // State for showing/hiding password

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
        <div className="min-h-screen flex items-center justify-center font-inter antialiased" style={{ backgroundColor: '#F8F8F8' }}> {/* Light gray background */}
            <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8 sm:p-10 text-center border border-gray-200">
                {/* Top Arrow Icon */}
                <div className="flex justify-center mb-6">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                        className="w-8 h-8 text-gray-400"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25 21 12m0 0-3.75 3.75M21 12H3" />
                    </svg>
                </div>

                {/* Logo/App Name (Adjusted to match image's small logo style) */}
                <div className="mb-8 flex justify-center items-center flex-col">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="w-8 h-8 text-purple-600 mb-2" // Smaller icon
                    >
                        <path
                            fillRule="evenodd"
                            d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm-2.625 7.5a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm4.875 0a.75.75.0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm-2.25 4.5a.75.75 0 1 0 0 1.5h.008a.75.75 0 0 0 0-1.5H12Z"
                            clipRule="evenodd"
                        />
                    </svg>
                    <span className="text-xl font-bold text-gray-800">Auto Product Manager</span> {/* Smaller text */}
                </div>

                {/* Main Heading and Subtext */}
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                    {isLoginMode ? 'Log in with your work email' : 'Sign up for Auto Product Manager'}
                </h2>
                <p className="text-gray-600 mb-6 text-base">
                    {isLoginMode ? 'Use your work email to log in to your team workspace.' : 'Create your account to start managing products on autopilot.'}
                </p>

                {/* Form */}
                <form onSubmit={handleAuthSubmit} className="space-y-5">
                    {/* Email Input */}
                    <div>
                        <label htmlFor="email" className="sr-only">Email</label>
                        <input
                            id="email"
                            type="email"
                            placeholder="yourname@company.com"
                            className="w-full p-3 border border-gray-300 rounded-lg text-base focus:ring-purple-500 focus:border-purple-500 transition duration-200 ease-in-out"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    {/* Password Input */}
                    <div>
                        <label htmlFor="password" className="sr-only">Password</label>
                        <div className="relative">
                            <input
                                id="password"
                                type={showPassword ? "text" : "password"} // Toggle type based on showPassword state
                                placeholder="Enter your password"
                                className="w-full p-3 border border-gray-300 rounded-lg text-base focus:ring-purple-500 focus:border-purple-500 transition duration-200 ease-in-out pr-10" // Added pr-10 for eye icon
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            {/* Eye icon - now functional to toggle password visibility */}
                            <button
                                type="button"
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 cursor-pointer"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.988 5.895a1.012 1.012 0 0 0-1.227 1.227L4.098 8.4A10.05 10.05 0 0 0 3 12c0 4.638 3.007 8.573 7.178 9.963.207.07.431.07.639 0 4.171-1.39 8.106-5.325 9.963-9.963.07-.207.07-.431 0-.639A10.05 10.05 0 0 0 21 12a10.05 10.05 0 0 0-1.098-4.595l1.227-1.227a1.012 1.012 0 0 0-1.227-1.227L19.902 5.6A10.05 10.05 0 0 0 12 3a10.05 10.05 0 0 0-7.902 2.895Z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                    </svg>
                                )}
                            </button>
                        </div>
                        {isLoginMode && (
                            <div className="text-right mt-2">
                                <a href="#" className="text-sm text-purple-600 hover:underline font-medium">Forgot password?</a>
                            </div>
                        )}
                    </div>

                    {/* Remember Me Checkbox (if login mode) */}
                    {isLoginMode && (
                        <div className="flex items-center justify-start"> {/* Aligned to start */}
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
                        className="w-full px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 transition duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={loading}
                    >
                        {loading ? 'Processing...' : (isLoginMode ? 'Log in' : 'Sign up')}
                    </button>
                </form>

                {authError && (
                    <p className="text-red-600 text-center mt-6 text-base font-medium">{authError}</p>
                )}

                {/* "Don't have an account" link at the bottom */}
                <p className="mt-8 text-gray-600 text-base">
                    {isLoginMode ? (
                        <>
                            Don't have an account yet?{' '}
                            <button
                                onClick={() => { setIsLoginMode(false); setAuthError(null); }}
                                className="text-purple-600 hover:underline font-semibold"
                            >
                                Sign up
                            </button>
                        </>
                    ) : (
                        <>
                            Already have an account?{' '}
                            <button
                                onClick={() => { setIsLoginMode(true); setAuthError(null); }}
                                className="text-purple-600 hover:underline font-semibold"
                            >
                                Log in
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
    const [products, setProducts] = useState([
        { id: 1, name: "Mobile App Redesign", discovery_document: "Sample discovery document for mobile app..." },
        { id: 2, name: "API Gateway", discovery_document: null },
        { id: 3, name: "User Analytics Dashboard", discovery_document: "Comprehensive analytics solution..." }
    ]);
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
                // In a real app, you'd use axios.get(`${API_URL}/api/products`, { headers: { Authorization: `Bearer ${token}` } });
                // For demo, simulating API call
                const response = await new Promise(resolve => setTimeout(() => resolve({ data: products }), 500));
                setProducts(response.data);
            } catch (err) {
                console.error("Error fetching products:", err);
                setError("Failed to load products. Please check the backend server or your login status.");
                // If token is invalid or expired, log out
                // if (err.response && (err.response.status === 401 || err.response.status === 403)) {
                //     handleLogout();
                // }
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, [isLoggedIn, products]); // Added products to dependency array to reflect changes in simulated data

    // --- Handlers for Product Management ---

    const handleAddProduct = async () => {
        if (!newProductName.trim()) {
            alert("Product name cannot be empty.");
            return;
        }
        setLoading(true);
        
        // Simulate API call
        setTimeout(() => {
            const newProduct = {
                id: Date.now(),
                name: newProductName,
                discovery_document: null
            };
            setProducts([newProduct, ...products]);
            setNewProductName('');
            setLoading(false);
        }, 500);
    };

    const handleSelectProduct = (product) => {
        setSelectedProduct(product);
        setGeneratedDocument(product.discovery_document || '');
        setDiscoveryInput('');
    };

    const handleDeleteProduct = async (productId) => {
        setLoading(true);
        setTimeout(() => {
            setProducts(products.filter(p => p.id !== productId));
            if (selectedProduct && selectedProduct.id === productId) {
                setSelectedProduct(null);
                setGeneratedDocument('');
                setDiscoveryInput('');
            }
            setLoading(false);
        }, 300);
    };

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
        setTimeout(() => {
            const doc = `# Discovery Document for ${selectedProduct.name}

## Overview
Based on your input: "${discoveryInput}"

This is a comprehensive discovery document that outlines the key aspects of ${selectedProduct.name}.

## Target Audience
- Primary users who need this solution
- Secondary stakeholders
- Technical implementation team

## Problem Statement
Clear definition of the problem this product addresses.

## Success Metrics
- User engagement metrics
- Business impact measurements
- Technical performance indicators

## Implementation Strategy
Step-by-step approach to building and launching this feature.`;

            setGeneratedDocument(doc);
            setProducts(products.map(p =>
                p.id === selectedProduct.id ? { ...p, discovery_document: doc } : p
            ));
            setSelectedProduct(prev => ({ ...prev, discovery_document: doc }));
            setLoading(false);
        }, 2000);
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        setIsLoggedIn(false);
        setProducts([]);
        setSelectedProduct(null);
        setGeneratedDocument('');
        setDiscoveryInput('');
        setAuthMessage('You have been logged out.');
    };

    if (!isLoggedIn) {
        return <AuthPage setIsLoggedIn={setIsLoggedIn} setAuthMessage={setAuthMessage} />;
    }

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

            <div className="max-w-screen-xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="bg-white p-10 rounded-3xl shadow-xl border border-gray-100">
                    <h2 className="text-3xl font-bold text-gray-800 mb-8 border-b-2 pb-4 border-purple-300">Product/Feature List</h2>

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

                    {loading && <p className="text-purple-500 text-center my-6 text-lg font-medium">Loading...</p>}
                    {error && <p className="text-red-600 text-center my-6 text-lg font-medium">{error}</p>}

                    <div className="max-h-[60vh] overflow-y-auto pr-3">
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
                                                e.stopPropagation();
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

                <div className="bg-white p-10 rounded-3xl shadow-xl border border-gray-100">
                    <h2 className="text-3xl font-bold text-gray-800 mb-8 border-b-2 pb-4 border-purple-300">AI Discovery Assistant</h2>

                    {selectedProduct ? (
                        <div>
                            <h3 className="text-2xl font-semibold text-gray-700 mb-5">
                                Currently Selected: <span className="text-purple-600">{selectedProduct.name}</span>
                            </h3>

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