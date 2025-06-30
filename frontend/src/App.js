import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css'; // Make sure this CSS file exists as per next step

// Determine API URL based on environment
// For local development, it will hit your Flask app on port 5000 (which you are running)
// For deployment on Vercel, it will use the REACT_APP_API_URL environment variable we'll set later.
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function App() {
  const [productName, setProductName] = useState('');
  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [userInput, setUserInput] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiError, setAiError] = useState('');

  // Fetch all products when the component mounts
  useEffect(() => {
    fetchProducts();
  }, []);

  // Function to fetch products from the backend
  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/products`);
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
      // Optional: Display a user-friendly error message
    }
  };

  // Function to create a new product/feature
  const handleCreateProduct = async () => {
    if (!productName.trim()) {
      alert("Product/Feature name cannot be empty.");
      return;
    }
    try {
      const response = await axios.post(`${API_URL}/api/products`, { name: productName });
      setProducts([response.data, ...products]); // Add new product to the top of the list
      setProductName('');
      setSelectedProductId(response.data.id); // Select the newly created product
    } catch (error) {
      console.error('Error creating product:', error);
      alert('Failed to create product. See console for details.');
    }
  };

  // Function to select a product and fetch its details
  const handleSelectProduct = async (id) => {
    setSelectedProductId(id);
    try {
      const response = await axios.get(`${API_URL}/api/products/${id}`);
      setSelectedProduct(response.data);
      setUserInput(''); // Clear previous AI input
      setAiError(''); // Clear previous errors
    } catch (error) {
      console.error('Error fetching product details:', error);
      setSelectedProduct(null);
      alert('Failed to load product details. See console for details.');
    }
  };

  // Function to trigger AI generation of Discovery Document
  const handleGenerateDiscovery = async () => {
    if (!selectedProductId) {
      alert("Please select a product/feature first.");
      return;
    }
    if (!userInput.trim()) {
      alert("Please provide some input for the AI to generate the document.");
      return;
    }

    setLoadingAI(true);
    setAiError(''); // Clear any previous AI errors
    try {
      const response = await axios.post(`${API_URL}/api/products/${selectedProductId}/generate-discovery`, {
        userInput: userInput,
      });
      setSelectedProduct((prev) => ({
        ...prev,
        discovery_document: response.data.discovery_document,
      }));
      alert("Discovery Document Generated Successfully!");
    } catch (error) {
      console.error('Error generating discovery document:', error);
      setAiError(error.response?.data?.error || 'Failed to generate discovery document. Check console/backend logs.');
      alert('Failed to generate document. Make sure your Gemini API key is set correctly in the backend .env file!');
    } finally {
      setLoadingAI(false);
    }
  };

  return (
    <div className="App">
      <div className="product-list-section">
        <h2>Product/Feature List</h2>
        <div className="create-product">
          <input
            type="text"
            placeholder="Enter new product/feature name"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            onKeyPress={(e) => { // Allow pressing Enter to create product
                if (e.key === 'Enter') {
                    handleCreateProduct();
                }
            }}
          />
          <button onClick={handleCreateProduct}>Add Product</button>
        </div>
        <ul className="product-list">
          {products.length === 0 ? (
            <p>No products yet. Add one above!</p>
          ) : (
            products.map((product) => (
              <li
                key={product.id}
                onClick={() => handleSelectProduct(product.id)}
                className={selectedProductId === product.id ? 'selected' : ''}
              >
                {product.name}
              </li>
            ))
          )}
        </ul>
      </div>

      {selectedProduct && (
        <div className="product-detail-section">
          <h2>{selectedProduct.name} - Discovery Planning</h2>
          <div className="ai-assistant-area">
            <h3>AI Discovery Assistant Input:</h3>
            <textarea
              placeholder="Describe your feature idea, its purpose, target users, core functionalities, or any specific details for the AI to consider. The more detail, the better the output!"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              rows="10"
              cols="80"
            ></textarea>
            <button onClick={handleGenerateDiscovery} disabled={loadingAI}>
              {loadingAI ? 'Generating Document...' : 'Generate Discovery Document'}
            </button>
            {aiError && <p className="error-message">{aiError}</p>}
          </div>

          {selectedProduct.discovery_document && (
            <div className="discovery-document">
              <h3>Generated Discovery Document:</h3>
              <pre>{selectedProduct.discovery_document}</pre>
            </div>
          )}
        </div>
      )}
      {!selectedProduct && products.length > 0 && (
          <div className="product-detail-section">
              <p>Select a product/feature from the list to start or generate its discovery document.</p>
          </div>
      )}
       {!selectedProduct && products.length === 0 && (
          <div className="product-detail-section">
              <p>Add your first product/feature to get started!</p>
          </div>
      )}
    </div>
  );
}

export default App;