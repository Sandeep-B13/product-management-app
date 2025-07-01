import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, ArrowRight, Sparkles, Zap, Users, BarChart3 } from 'lucide-react';

// Simulated API calls for demo purposes
const simulateAPI = (endpoint, data, delay = 1000) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (endpoint === '/api/login') {
        if (data.email === 'demo@company.com' && data.password === 'password') {
          resolve({ data: { token: 'demo-token-123', message: 'Login successful' } });
        } else {
          reject({ response: { data: { message: 'Invalid credentials' } } });
        }
      } else if (endpoint === '/api/signup') {
        resolve({ data: { message: 'Account created! Please wait for admin approval.' } });
      }
    }, delay);
  });
};

// --- AuthPage Component ---
function AuthPage({ setIsLoggedIn, setAuthMessage }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoginMode, setIsLoginMode] = useState(true);
    const [loading, setLoading] = useState(false);
    const [authError, setAuthError] = useState(null);
    const [rememberMe, setRememberMe] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleAuthSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setAuthError(null);
        setAuthMessage('');

        try {
            let response;
            if (isLoginMode) {
                response = await simulateAPI('/api/login', { email, password });
                localStorage.setItem('token', response.data.token);
                setIsLoggedIn(true);
            } else {
                response = await simulateAPI('/api/signup', { email, password });
                setAuthMessage(response.data.message);
                setIsLoginMode(true);
            }
        } catch (err) {
            console.error("Authentication error:", err);
            if (err.response && err.response.data && err.response.data.message) {
                setAuthError(err.response.data.message);
            } else {
                setAuthError("An unexpected error occurred. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex">
            {/* Left Side - Hero Section */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 relative overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
                    <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-2000"></div>
                    <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-4000"></div>
                </div>
                
                <div className="relative z-10 flex flex-col justify-center px-12 text-white">
                    <div className="mb-8">
                        <div className="flex items-center mb-4">
                            <Sparkles className="w-10 h-10 text-yellow-300 mr-3" />
                            <span className="text-2xl font-bold">Auto Product Manager</span>
                        </div>
                        <h1 className="text-5xl font-bold leading-tight mb-6">
                            Product Management
                            <span className="block text-yellow-300">On Autopilot</span>
                        </h1>
                        <p className="text-xl text-indigo-100 mb-8 leading-relaxed">
                            Streamline your product discovery process with AI-powered insights and automated documentation generation.
                        </p>
                    </div>
                    
                    {/* Feature highlights */}
                    <div className="space-y-4">
                        <div className="flex items-center">
                            <Zap className="w-6 h-6 text-yellow-300 mr-3 flex-shrink-0" />
                            <span className="text-indigo-100">AI-Powered Discovery Documents</span>
                        </div>
                        <div className="flex items-center">
                            <Users className="w-6 h-6 text-yellow-300 mr-3 flex-shrink-0" />
                            <span className="text-indigo-100">Team Collaboration Tools</span>
                        </div>
                        <div className="flex items-center">
                            <BarChart3 className="w-6 h-6 text-yellow-300 mr-3 flex-shrink-0" />
                            <span className="text-indigo-100">Advanced Analytics & Insights</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side - Auth Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
                <div className="w-full max-w-md">
                    {/* Mobile Logo */}
                    <div className="lg:hidden text-center mb-8">
                        <div className="flex items-center justify-center mb-4">
                            <Sparkles className="w-8 h-8 text-indigo-600 mr-2" />
                            <span className="text-2xl font-bold text-gray-900">Auto Product Manager</span>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
                        {/* Header */}
                        <div className="text-center mb-8">
                            <h2 className="text-3xl font-bold text-gray-900 mb-2">
                                {isLoginMode ? 'Welcome back' : 'Create your account'}
                            </h2>
                            <p className="text-gray-600">
                                {isLoginMode 
                                    ? 'Enter your credentials to access your dashboard' 
                                    : 'Get started with your free account today'
                                }
                            </p>
                            {/* Demo credentials hint */}
                            {isLoginMode && (
                                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                    <p className="text-sm text-blue-700">
                                        <strong>Demo:</strong> demo@company.com / password
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Form */}
                        <form onSubmit={handleAuthSubmit} className="space-y-6">
                            {/* Email Input */}
                            <div>
                                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                                    Work Email
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    placeholder="yourname@company.com"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-200 placeholder-gray-400"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>

                            {/* Password Input */}
                            <div>
                                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                                    Password
                                </label>
                                <div className="relative">
                                    <input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Enter your password"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-200 placeholder-gray-400 pr-12"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? (
                                            <EyeOff className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                                        ) : (
                                            <Eye className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Remember Me & Forgot Password */}
                            {isLoginMode && (
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <input
                                            id="remember-me"
                                            type="checkbox"
                                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                            checked={rememberMe}
                                            onChange={(e) => setRememberMe(e.target.checked)}
                                        />
                                        <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                                            Remember me
                                        </label>
                                    </div>
                                    <button
                                        type="button"
                                        className="text-sm text-indigo-600 hover:text-indigo-500 font-medium"
                                    >
                                        Forgot password?
                                    </button>
                                </div>
                            )}

                            {/* Submit Button */}
                            <button
                                type="submit"
                                className="w-full flex items-center justify-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-lg shadow-lg hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02]"
                                disabled={loading}
                            >
                                {loading ? (
                                    <div className="flex items-center">
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                        Processing...
                                    </div>
                                ) : (
                                    <div className="flex items-center">
                                        {isLoginMode ? 'Sign in' : 'Create account'}
                                        <ArrowRight className="w-5 h-5 ml-2" />
                                    </div>
                                )}
                            </button>
                        </form>

                        {/* Error Message */}
                        {authError && (
                            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-red-600 text-sm font-medium">{authError}</p>
                            </div>
                        )}

                        {/* Toggle Mode */}
                        <div className="mt-8 text-center">
                            <p className="text-gray-600">
                                {isLoginMode ? "Don't have an account?" : "Already have an account?"}{' '}
                                <button
                                    type="button"
                                    onClick={() => { 
                                        setIsLoginMode(!isLoginMode); 
                                        setAuthError(null); 
                                        setEmail('');
                                        setPassword('');
                                    }}
                                    className="text-indigo-600 hover:text-indigo-500 font-semibold"
                                >
                                    {isLoginMode ? 'Sign up' : 'Sign in'}
                                </button>
                            </p>
                        </div>

                        {/* Security notice */}
                        <p className="mt-6 text-xs text-gray-500 text-center">
                            By continuing, you agree to our Terms of Service and Privacy Policy.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

// --- Main App Component ---
function App() {
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
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [authMessage, setAuthMessage] = useState('');

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            setIsLoggedIn(true);
        }
    }, []);

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