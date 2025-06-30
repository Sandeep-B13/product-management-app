import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Define the API URL for your backend.
// In development, it will default to http://localhost:5000.
// In production (on Vercel), it will use the REACT_APP_API_URL environment variable.
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function App() {
    // State variables for managing product data and UI
    const [products, setProducts] = useState([]); // Stores the list of products/features
    const [selectedProduct, setSelectedProduct] = useState(null); // The currently selected product
    const [newProductName, setNewProductName] = useState(''); // Input for adding a new product
    const [loading, setLoading] = useState(false); // Indicates if an API call is in progress
    const [error, setError] = useState(null); // Stores any error messages
    const [generatedDocument, setGeneratedDocument] = useState(''); // Stores the AI-generated document
    const [discoveryInput, setDiscoveryInput] = useState(''); // Input for AI discovery assistant details

    // --- useEffect Hook to Fetch Products on Component Mount ---
    useEffect(() => {
        const fetchProducts = async () => {
            setLoading(true);
            setError(null);
            try {
                // Fetch products from the backend API
                const response = await axios.get(`${API_URL}/api/products`);
                setProducts(response.data);
            } catch (err) {
                console.error("Error fetching products:", err);
                // Display a more user-friendly error message
                setError("Failed to load products. Please check the backend server.");
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, []); // Empty dependency array ensures this runs only once on mount

    // --- Handlers for Product Management ---

    const handleAddProduct = async () => {
        if (!newProductName.trim()) {
            alert("Product name cannot be empty.");
            return;
        }
        setLoading(true);
        setError(null);
        try {
            // Send a POST request to create a new product
            const response = await axios.post(`${API_URL}/api/products`, {
                name: newProductName
            });
            // Add the new product to the state and clear the input
            setProducts([response.data, ...products]); // Add to top of list
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
        setGeneratedDocument(product.discovery_document || ''); // Pre-fill if document exists
        setDiscoveryInput(''); // Clear AI input when selecting a new product
    };

    const handleDeleteProduct = async (productId) => {
        setLoading(true);
        setError(null);
        try {
            // Send a DELETE request to remove a product
            await axios.delete(`${API_URL}/api/products/${productId}`);
            // Remove the product from the state
            setProducts(products.filter(p => p.id !== productId));
            // If the deleted product was selected, clear selection
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
        // Ensure a product is selected and there's input for the AI
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
            // Send a POST request to the backend's AI generation endpoint
            const response = await axios.post(`${API_URL}/api/generate-discovery-document`, {
                product_name: selectedProduct.name, // Pass the selected product's name
                details: discoveryInput // Pass the user's input for details
            });

            const doc = response.data.discovery_document;
            setGeneratedDocument(doc); // Display the generated document

            // --- OPTIONAL: Update the product in the database with the generated document ---
            // If you want to save the generated document to the specific product,
            // make a PUT request here.
            await axios.put(`${API_URL}/api/products/${selectedProduct.id}`, {
                discovery_document: doc
            });
            // Update the product in local state to reflect the saved document
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

    return (
        <div className="min-h-screen bg-gray-100 p-8 font-inter antialiased">
            <header className="text-center mb-10">
                <h1 className="text-5xl font-extrabold text-gray-900 leading-tight">
                    Product Management & <span className="text-blue-600">AI Discovery Assistant</span>
                </h1>
                <p className="mt-4 text-xl text-gray-600">
                    Manage your product features and generate discovery documents with AI.
                </p>
            </header>

            {/* Main Content Area */}
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* Left Column: Product List */}
                <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-200">
                    <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b-2 pb-3 border-blue-200">Product/Feature List</h2>

                    {/* Add New Product Input */}
                    <div className="flex items-center mb-6 space-x-3">
                        <input
                            type="text"
                            placeholder="New product/feature name"
                            className="flex-grow p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-lg"
                            value={newProductName}
                            onChange={(e) => setNewProductName(e.target.value)}
                            onKeyPress={(e) => { // Allow adding product by pressing Enter
                                if (e.key === 'Enter') {
                                    handleAddProduct();
                                }
                            }}
                        />
                        <button
                            onClick={handleAddProduct}
                            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50"
                            disabled={loading}
                        >
                            {loading ? 'Adding...' : 'Add Product'}
                        </button>
                    </div>

                    {/* Display Loading/Error State */}
                    {loading && <p className="text-blue-500 text-center my-4">Loading...</p>}
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
                                            ${selectedProduct && selectedProduct.id === product.id ? 'bg-blue-100 border-blue-500 border-2' : 'bg-gray-50 border border-gray-200'}`}
                                        onClick={() => handleSelectProduct(product)}
                                    >
                                        <span className="text-lg font-medium text-gray-700 flex-grow">
                                            {product.name}
                                        </span>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation(); // Prevent selecting product when deleting
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
                    <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b-2 pb-3 border-blue-200">AI Discovery Assistant</h2>

                    {selectedProduct ? (
                        <div>
                            <h3 className="text-xl font-semibold text-gray-700 mb-4">
                                Currently Selected: <span className="text-blue-600">{selectedProduct.name}</span>
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
                                    className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base"
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
                                    <h3 className="text-xl font-semibold text-gray-700 mb-4 border-t-2 pt-4 border-blue-200">
                                        Generated Document for {selectedProduct.name}:
                                    </h3>
                                    <div className="bg-gray-50 p-6 rounded-lg shadow-inner border border-gray-200 whitespace-pre-wrap text-gray-800 leading-relaxed text-base">
                                        {generatedDocument}
                                    </div>
                                </div>
                            )}
                             {selectedProduct.discovery_document && !generatedDocument && (
                                <div className="mt-8">
                                    <h3 className="text-xl font-semibold text-gray-700 mb-4 border-t-2 pt-4 border-blue-200">
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