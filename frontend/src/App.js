import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Importing Material-UI components
import { 
    Box, 
    Button, 
    TextField, 
    Typography, 
    Container, 
    Paper, 
    Checkbox, 
    FormControlLabel, 
    CircularProgress,
    Snackbar,
    Alert,
    List,
    ListItem,
    ListSubheader, 
    ListItemText,
    IconButton,
    InputAdornment,
    Grid, // Specifically for layout
    LinearProgress, // For progress bar
    Collapse // For collapse/expand functionality
} from '@mui/material';

// Importing Lucide icons
import { Eye, EyeOff, ArrowRight, Sparkles, Zap, Users, BarChart3, Trash2, Plus, ChevronLeft, ChevronRight, Search, CheckCircle, Archive, ArchiveRestore } from 'lucide-react'; // Changed Unarchive to ArchiveRestore

// Define the API URL for your backend.
// In development, it will default to http://localhost:5000.
// In production (on Vercel), it will use the REACT_APP_API_URL environment variable.
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// --- AuthPage Component (Frozen - No changes here) ---
function AuthPage({ setIsLoggedIn, setAuthMessage }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState(''); 
    const [isLoginMode, setIsLoginMode] = useState(true);
    const [loading, setLoading] = useState(false);
    const [authError, setAuthError] = useState(null);
    const [rememberMe, setRememberMe] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false); 
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('success');

    const handleSnackbarClose = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        setSnackbarOpen(false);
    };

    const handleAuthSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setAuthError(null);
        setAuthMessage('');
        setSnackbarOpen(false); 

        if (!isLoginMode) { 
            if (password !== confirmPassword) {
                setAuthError("Passwords do not match.");
                setSnackbarMessage("Passwords do not match.");
                setSnackbarSeverity('error');
                setSnackbarOpen(true);
                setLoading(false);
                return;
            }
        }

        try {
            let response;
            if (isLoginMode) {
                response = await axios.post(`${API_URL}/api/login`, { email, password });
                localStorage.setItem('token', response.data.token);
                setIsLoggedIn(true);
                setAuthMessage(response.data.message); 
            } else {
                response = await axios.post(`${API_URL}/api/signup`, { email, password });
                setAuthMessage(response.data.message);
                setSnackbarMessage(response.data.message);
                setSnackbarSeverity('success');
                setSnackbarOpen(true);
                setIsLoginMode(true); 
            }
        } catch (err) {
            console.error("Authentication error:", err);
            const errorMessage = err.response && err.response.data && err.response.data.message 
                                ? err.response.data.message 
                                : "An unexpected error occurred. Please try again.";
            setAuthError(errorMessage);
            setSnackbarMessage(errorMessage);
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                fontFamily: 'Inter, sans-serif',
                background: 'linear-gradient(to bottom right, #eef2ff, #fff, #f5f3ff)', 
                '@media (min-width: 1024px)': { 
                    display: 'flex', 
                },
            }}
        >
            {/* Left Side - Hero Section */}
            <Box
                sx={{
                    display: { xs: 'none', lg: 'flex' }, 
                    width: { lg: '50%' }, 
                    background: 'linear-gradient(to bottom right, #4f46e5, #9333ea, #3730a3)', 
                    position: 'relative',
                    overflow: 'hidden',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    px: 6, 
                    color: '#fff',
                }}
            >
                {/* Background Pattern */}
                <Box
                    sx={{
                        position: 'absolute',
                        inset: 0,
                        opacity: 0.1,
                    }}
                >
                    <Box sx={{ position: 'absolute', top: 0, left: '-1rem', width: '18rem', height: '18rem', borderRadius: '9999px', mixBlendMode: 'multiply', filter: 'blur(3rem)', animation: 'pulse 4s infinite cubic-bezier(0.4, 0, 0.6, 1)', backgroundColor: '#d8b4fe' }} />
                    <Box sx={{ position: 'absolute', top: 0, right: '-1rem', width: '18rem', height: '18rem', borderRadius: '9999px', mixBlendMode: 'multiply', filter: 'blur(3rem)', animation: 'pulse 4s infinite cubic-bezier(0.4, 0, 0.6, 1) 2s', backgroundColor: '#fde047' }} />
                    <Box sx={{ position: 'absolute', bottom: '-2rem', left: '5rem', width: '18rem', height: '18rem', borderRadius: '9999px', mixBlendMode: 'multiply', filter: 'blur(3rem)', animation: 'pulse 4s infinite cubic-bezier(0.4, 0, 0.6, 1) 4s', backgroundColor: '#fbcfe8' }} />
                </Box>
                
                <Box sx={{ position: 'relative', zIndex: 10 }}>
                    <Box sx={{ marginBottom: 4 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', marginBottom: 2 }}>
                            <Sparkles size={40} color="#fde047" style={{ marginRight: '0.75rem' }} />
                            <Typography variant="h6" component="span" sx={{ fontWeight: 'bold' }}>
                                Auto Product Manager
                            </Typography>
                        </Box>
                        <Typography variant="h3" component="h1" sx={{ fontWeight: 'bold', lineHeight: 'tight', marginBottom: 3 }}>
                            Automate Your Entire Product Management
                            <Box component="span" sx={{ display: 'block', color: '#fde047' }}>Lifecycle</Box>
                        </Typography>
                        <Typography variant="body1" sx={{ fontSize: '1.25rem', color: '#e0e7ff', marginBottom: 4, lineHeight: 'relaxed' }}>
                            Leverage AI-powered insights to streamline every stage of your product lifecycle, from ideation to launch and beyond, with automated documentation and enhanced collaboration.
                        </Typography>
                    </Box>
                    
                    {/* Feature highlights */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Zap size={24} color="#fde047" style={{ marginRight: '0.75rem', flexShrink: 0 }} />
                            <Typography variant="body2" sx={{ color: '#e0e7ff' }}>AI-Driven Product Lifecycle Automation</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Users size={24} color="#fde047" style={{ marginRight: '0.75rem', flexShrink: 0 }} />
                            <Typography variant="body2" sx={{ color: '#e0e7ff' }}>Seamless Team Collaboration</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <BarChart3 size={24} color="#fde047" style={{ marginRight: '0.75rem', flexShrink: 0 }} />
                            <Typography variant="body2" sx={{ color: '#e0e7ff' }}>Actionable Analytics & Strategic Insights</Typography>
                        </Box>
                    </Box>
                </Box>
            </Box>

            {/* Right Side - Auth Form */}
            <Box
                sx={{
                    width: { xs: '100%', lg: '50%' }, 
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    p: 4, 
                }}
            >
                <Paper
                    elevation={3}
                    sx={{
                        width: '100%',
                        maxWidth: '28rem', 
                        borderRadius: '1rem', 
                        p: { xs: 4, sm: 5 }, 
                        border: '1px solid #e5e7eb', 
                    }}
                >
                    {/* Mobile Logo */}
                    <Box sx={{ display: { xs: 'flex', lg: 'none' }, justifyContent: 'center', alignItems: 'center', flexDirection: 'column', marginBottom: 4 }}>
                        <Sparkles size={32} color="#4f46e5" style={{ marginBottom: '0.5rem' }} />
                        <Typography variant="h6" component="span" sx={{ fontWeight: 'bold' }}>
                            Auto Product Manager
                        </Typography>
                    </Box>

                    {/* Header */}
                    <Box sx={{ textAlign: 'center', marginBottom: 4 }}>
                        <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold', color: '#111827', marginBottom: 1 }}>
                            {isLoginMode ? 'Welcome back' : 'Create your account'}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#4b5563' }}>
                            {isLoginMode 
                                ? 'Enter your credentials to access your dashboard' 
                                : 'Get started with your free account today'
                            }
                        </Typography>
                    </Box>

                    {/* Form */}
                    <Box component="form" onSubmit={handleAuthSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {/* Email Input */}
                        <TextField
                            label="Work Email"
                            id="email"
                            type="email"
                            placeholder="yourname@company.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            fullWidth
                            variant="outlined"
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: '0.5rem',
                                    '&.Mui-focused fieldset': {
                                        borderColor: '#6366f1', 
                                        boxShadow: '0 0 0 2px rgba(99, 102, 241, 0.25)', 
                                    },
                                },
                                '& .MuiInputLabel-root': {
                                    fontWeight: 600, 
                                    color: '#374151', 
                                },
                                '& .MuiInputBase-input::placeholder': {
                                    color: '#9ca3af', 
                                    opacity: 1, 
                                },
                            }}
                        />

                        {/* Password Input */}
                        <TextField
                            label="Password"
                            id="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            fullWidth
                            variant="outlined"
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            aria-label="toggle password visibility"
                                            onClick={() => setShowPassword(!showPassword)}
                                            edge="end"
                                            sx={{ color: '#9ca3af', '&:hover': { color: '#4b5563' } }}
                                        >
                                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                                sx: {
                                    borderRadius: '0.5rem',
                                    '&.Mui-focused fieldset': {
                                        borderColor: '#6366f1', 
                                        boxShadow: '0 0 0 2px rgba(99, 102, 241, 0.25)', 
                                    },
                                },
                            }}
                            sx={{
                                '& .MuiInputLabel-root': {
                                    fontWeight: 600, 
                                    color: '#374151', 
                                },
                                '& .MuiInputBase-input::placeholder': {
                                    color: '#9ca3af', 
                                    opacity: 1, 
                                },
                            }}
                        />

                        {/* Confirm Password Input (only for signup mode) */}
                        {!isLoginMode && (
                            <TextField
                                label="Confirm Password"
                                id="confirm-password"
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="Confirm your password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                fullWidth
                                variant="outlined"
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton
                                                aria-label="toggle confirm password visibility"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                edge="end"
                                                sx={{ color: '#9ca3af', '&:hover': { color: '#4b5563' } }}
                                            >
                                                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                    sx: {
                                        borderRadius: '0.5rem',
                                        '&.Mui-focused fieldset': {
                                            borderColor: '#6366f1',
                                            boxShadow: '0 0 0 2px rgba(99, 102, 241, 0.25)',
                                        },
                                    },
                                }}
                                sx={{
                                    '& .MuiInputLabel-root': {
                                        fontWeight: 600,
                                        color: '#374151',
                                    },
                                    '& .MuiInputBase-input::placeholder': {
                                        color: '#9ca3af',
                                        opacity: 1,
                                    },
                                }}
                            />
                        )}

                        {/* Remember Me */}
                        {isLoginMode && (
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={rememberMe}
                                            onChange={(e) => setRememberMe(e.target.checked)}
                                            id="remember-me"
                                            sx={{
                                                color: '#4f46e5',
                                                '&.Mui-checked': {
                                                    color: '#4f46e5',
                                                },
                                                '& .MuiSvgIcon-root': {
                                                    fontSize: '1rem',
                                                },
                                            }}
                                        />
                                    }
                                    label={
                                        <Typography variant="body2" sx={{ fontSize: '0.875rem', color: '#374151' }}>
                                            Remember me
                                        </Typography>
                                    }
                                />
                            </Box>
                        )}

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            variant="contained"
                            disabled={loading}
                            sx={{
                                width: '100%',
                                paddingY: '0.75rem',
                                paddingX: '1.5rem',
                                background: 'linear-gradient(to right, #4f46e5, #9333ea)',
                                color: '#fff',
                                fontWeight: 600,
                                borderRadius: '0.5rem',
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                                textTransform: 'none',
                                transition: 'all 200ms ease-in-out',
                                '&:hover': {
                                    background: 'linear-gradient(to right, #4338ca, #7e22ce)',
                                    transform: 'scale(1.02)',
                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                                },
                                '&:disabled': {
                                    opacity: 0.5,
                                    cursor: 'not-allowed',
                                    color: '#fff',
                                },
                            }}
                        >
                            {loading ? (
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <CircularProgress size={20} color="inherit" sx={{ marginRight: 1 }} />
                                    Processing...
                                </Box>
                            ) : (
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    {isLoginMode ? 'Sign in' : 'Create account'}
                                    <ArrowRight size={20} style={{ marginLeft: '0.5rem' }} />
                                </Box>
                            )}
                        </Button>
                    </Box>

                    {/* Error Message */}
                    {authError && (
                        <Alert severity="error" sx={{ marginTop: 3, borderRadius: '0.5rem', border: '1px solid #fecaca' }}>
                            {authError}
                        </Alert>
                    )}

                    {/* Toggle Mode */}
                    <Box sx={{ marginTop: 4, textAlign: 'center' }}>
                        <Typography variant="body2" sx={{ color: '#4b5563' }}>
                            {isLoginMode ? "Don't have an account?" : "Already have an account?"}{' '}
                            <Button
                                variant="text"
                                onClick={() => { 
                                    setIsLoginMode(!isLoginMode); 
                                    setAuthError(null); 
                                    setEmail('');
                                    setPassword('');
                                    setConfirmPassword(''); 
                                    setSnackbarOpen(false);
                                }}
                                sx={{
                                    color: '#4f46e5',
                                    fontWeight: 600,
                                    textTransform: 'none',
                                    '&:hover': {
                                        color: '#6366f1',
                                        backgroundColor: 'transparent',
                                    },
                                }}
                            >
                                {isLoginMode ? 'Sign up' : 'Sign in'}
                            </Button>
                        </Typography>
                    </Box>

                    {/* Security notice */}
                    <Typography variant="caption" sx={{ marginTop: 3, fontSize: '0.75rem', color: '#6b7280', textAlign: 'center', display: 'block' }}>
                        By continuing, you agree to our Terms of Service and Privacy Policy.
                    </Typography>
                </Paper>
            </Box>
            <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleSnackbarClose}>
                <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </Box>
    );
}

// --- Main App Component ---
function App() {
    const [products, setProducts] = useState([
        { id: 1, name: "Mobile App Redesign", discovery_document: "Sample discovery document for mobile app...", isArchived: false },
        { id: 2, name: "API Gateway", discovery_document: null, isArchived: false },
        { id: 3, name: "User Analytics Dashboard", discovery_document: "Comprehensive analytics solution...", isArchived: true } // Example archived
    ]);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [newProductName, setNewProductName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [generatedDocument, setGeneratedDocument] = useState('');
    const [discoveryInput, setDiscoveryInput] = useState('');
    const [showAiAssistant, setShowAiAssistant] = useState(false); // State to toggle AI Assistant panel
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false); // State for sidebar collapse
    const [isArchiveListCollapsed, setIsArchiveListCollapsed] = useState(true); // State for archived list collapse

    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [authMessage, setAuthMessage] = useState(''); 
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('success');

    const handleSnackbarClose = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        setSnackbarOpen(false);
    };

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            setIsLoggedIn(true);
        }
    }, []);

    useEffect(() => {
        const fetchProducts = async () => {
            if (!isLoggedIn) return;

            setLoading(true);
            setError(null);
            try {
                const response = await axios.get(`${API_URL}/api/products`, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`
                    }
                });
                // Assuming the backend returns products with an isArchived field
                setProducts(response.data);
            } catch (err) {
                console.error("Error fetching products:", err);
                const errorMessage = "Failed to load products. Please check the backend server or your login status.";
                setError(errorMessage);
                setSnackbarMessage(errorMessage);
                setSnackbarSeverity('error');
                setSnackbarOpen(true);
                if (err.response && (err.response.status === 401 || err.response.status === 403)) {
                    handleLogout();
                }
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, [isLoggedIn]);

    const handleAddProduct = async () => {
        if (!newProductName.trim()) {
            setSnackbarMessage("Product name cannot be empty.");
            setSnackbarSeverity('warning');
            setSnackbarOpen(true);
            return;
        }
        setLoading(true);
        setError(null);
        setSnackbarOpen(false);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(`${API_URL}/api/products`, {
                name: newProductName,
                isArchived: false // New products are not archived by default
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            setProducts([response.data, ...products]);
            setNewProductName('');
            setSnackbarMessage("Product added successfully!");
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
        } catch (err) {
            console.error("Error creating product:", err);
            const errorMessage = "Failed to add product. Please try again.";
            setError(errorMessage);
            setSnackbarMessage(errorMessage);
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectProduct = (product) => {
        setSelectedProduct(product);
        setGeneratedDocument(product.discovery_document || '');
        setDiscoveryInput('');
        setSnackbarOpen(false);
    };

    const handleArchiveProduct = async (productId, archiveStatus) => {
        setLoading(true);
        setError(null);
        setSnackbarOpen(false);
        try {
            const token = localStorage.getItem('token');
            await axios.put(`${API_URL}/api/products/${productId}`, {
                isArchived: archiveStatus
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            setProducts(products.map(p =>
                p.id === productId ? { ...p, isArchived: archiveStatus } : p
            ));
            if (selectedProduct && selectedProduct.id === productId) {
                setSelectedProduct(prev => ({ ...prev, isArchived: archiveStatus }));
            }
            setSnackbarMessage(`Product ${archiveStatus ? 'archived' : 'unarchived'} successfully!`);
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
        } catch (err) {
            console.error("Error archiving/unarchiving product:", err);
            const errorMessage = `Failed to ${archiveStatus ? 'archive' : 'unarchive'} product. Please try again.`;
            setError(errorMessage);
            setSnackbarMessage(errorMessage);
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteProduct = async (productId) => {
        setLoading(true);
        setError(null);
        setSnackbarOpen(false);
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
            setSnackbarMessage("Product deleted successfully!");
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
        } catch (err) {
            console.error("Error deleting product:", err);
            const errorMessage = "Failed to delete product. Please try again.";
            setError(errorMessage);
            setSnackbarMessage(errorMessage);
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateDocument = async () => {
        if (!selectedProduct) {
            setSnackbarMessage("Please select a product/feature first.");
            setSnackbarSeverity('warning');
            setSnackbarOpen(true);
            return;
        }
        if (!discoveryInput.trim()) {
            setSnackbarMessage("Please enter details for the AI Discovery Assistant.");
            setSnackbarSeverity('warning');
            setSnackbarOpen(true);
            return;
        }

        setLoading(true);
        setError(null);
        setSnackbarOpen(false);
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
            setSnackbarMessage("Document generated and saved!");
            setSnackbarSeverity('success');
            setSnackbarOpen(true);

        } catch (err) {
            console.error("Error generating document:", err);
            const errorMessage = "Failed to generate document. Make sure your Gemini API key is set correctly in the backend or there's a network issue!";
            setError(errorMessage);
            setSnackbarMessage(errorMessage);
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        setIsLoggedIn(false);
        setProducts([]);
        setSelectedProduct(null);
        setGeneratedDocument('');
        setDiscoveryInput('');
        setAuthMessage('You have been logged out.');
        setSnackbarMessage('You have been logged out.');
        setSnackbarSeverity('info');
        setSnackbarOpen(true);
    };

    if (!isLoggedIn) {
        return <AuthPage setIsLoggedIn={setIsLoggedIn} setAuthMessage={setAuthMessage} />;
    }

    const activeProducts = products.filter(p => !p.isArchived);
    const archivedProducts = products.filter(p => p.isArchived);

    return (
        <Box
            sx={{
                minHeight: '100vh',
                background: 'linear-gradient(to bottom right, #f9fafb, #e5e7eb)',
                fontFamily: 'Inter, sans-serif',
                display: 'flex', // Make App container a flex container
                flexDirection: 'column', // Stack children vertically
            }}
        >
            {/* Main Header */}
            <Box
                component="header"
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1rem 2rem', // px-8 py-4
                    backgroundColor: '#fff',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', // shadow-md
                    borderRadius: '0.75rem', // rounded-xl
                    margin: '1rem', // m-4
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Sparkles size={32} color="#4f46e5" style={{ marginRight: '0.5rem' }} />
                    <Box>
                        <Typography variant="h6" component="h1" sx={{ fontWeight: 'bold', color: '#111827', lineHeight: 1 }}>
                            Auto Product Manager
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#4b5563', display: 'block' }}>
                            Your Product Management in Auto Pilot mode
                        </Typography>
                    </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {/* AI Assistant button remains in header */}
                    <Button
                        variant="contained"
                        startIcon={<Sparkles size={20} />}
                        sx={{
                            backgroundColor: '#4f46e5', // bg-indigo-600
                            '&:hover': { backgroundColor: '#4338ca' }, // hover:bg-indigo-700
                            color: '#fff',
                            fontWeight: 600,
                            borderRadius: '0.5rem',
                            textTransform: 'none',
                            padding: '0.5rem 1rem',
                            boxShadow: 'none',
                        }}
                        onClick={() => setShowAiAssistant(!showAiAssistant)} // Toggle AI Assistant
                    >
                        AI Assistant
                    </Button>
                    <Button
                        onClick={handleLogout}
                        variant="outlined"
                        sx={{
                            borderColor: '#e5e7eb', // border-gray-200
                            color: '#374151', // text-gray-700
                            fontWeight: 600,
                            borderRadius: '0.5rem',
                            textTransform: 'none',
                            padding: '0.5rem 1rem',
                            '&:hover': {
                                backgroundColor: '#f0f0f0', // Light hover background
                                borderColor: '#d1d5db',
                            },
                        }}
                    >
                        Logout
                    </Button>
                </Box>
            </Box>

            {/* Main Content Area: Sidebar + Kanban Board */}
            <Box sx={{ flexGrow: 1, display: 'flex', padding: '1rem', gap: '1rem' }}> {/* flex-grow to fill remaining space */}
                {/* Left Sidebar: Active Items & Archived Items */}
                <Paper
                    elevation={3}
                    sx={{
                        width: isSidebarCollapsed ? '60px' : '280px', // Collapsed vs Expanded width
                        flexShrink: 0, // Prevent shrinking
                        backgroundColor: '#fff',
                        borderRadius: '1rem', // rounded-xl
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                        p: 2,
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'width 0.3s ease-in-out', // Smooth transition for width change
                        overflow: 'hidden', // Hide overflow when collapsed
                        // Responsive adjustments for sidebar
                        '@media (max-width: 600px)': { // For small screens, make it full width and potentially collapsible
                            width: '100%',
                            marginBottom: '1rem',
                            position: 'relative', // Adjust position for mobile if needed
                        },
                    }}
                >
                    {/* New Item Input/Button */}
                    <Box sx={{ display: 'flex', alignItems: 'center', marginBottom: 4, gap: 2 }}>
                        {!isSidebarCollapsed ? (
                            <>
                                <TextField
                                    type="text"
                                    placeholder="New product/feature"
                                    value={newProductName}
                                    onChange={(e) => setNewProductName(e.target.value)}
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                            handleAddProduct();
                                        }
                                    }}
                                    fullWidth
                                    variant="outlined"
                                    size="small"
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: '0.5rem',
                                        },
                                        '& .MuiInputBase-input': {
                                            padding: '0.75rem',
                                            fontSize: '0.9rem',
                                        },
                                        '& .Mui-focused fieldset': {
                                            borderColor: '#9333ea',
                                            boxShadow: '0 0 0 2px rgba(147, 51, 234, 0.25)',
                                        },
                                    }}
                                />
                                <Button
                                    onClick={handleAddProduct}
                                    variant="contained"
                                    disabled={loading}
                                    sx={{
                                        minWidth: 'auto', // Allow button to shrink
                                        padding: '0.75rem',
                                        backgroundColor: '#9333ea',
                                        color: '#fff',
                                        fontWeight: 700,
                                        borderRadius: '0.5rem',
                                        boxShadow: 'none',
                                        textTransform: 'none',
                                        '&:hover': { backgroundColor: '#7e22ce' },
                                        '&:disabled': { opacity: 0.5, color: '#fff' },
                                    }}
                                >
                                    {loading ? <CircularProgress size={20} color="inherit" /> : <Plus size={20} />}
                                </Button>
                            </>
                        ) : (
                            <IconButton
                                onClick={handleAddProduct}
                                disabled={loading}
                                sx={{
                                    backgroundColor: '#9333ea',
                                    color: '#fff',
                                    borderRadius: '0.5rem',
                                    '&:hover': { backgroundColor: '#7e22ce' },
                                    '&:disabled': { opacity: 0.5, color: '#fff' },
                                }}
                            >
                                {loading ? <CircularProgress size={20} color="inherit" /> : <Plus size={20} />}
                            </IconButton>
                        )}
                    </Box>

                    {/* Active Items List */}
                    <List
                        subheader={
                            <ListSubheader component="div" sx={{
                                backgroundColor: 'transparent',
                                fontWeight: 'bold',
                                fontSize: '1.125rem',
                                color: '#1f2937',
                                lineHeight: '1.75rem',
                                paddingX: 0,
                                paddingY: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                            }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', opacity: isSidebarCollapsed ? 0 : 1, transition: 'opacity 0.3s ease-in-out' }}>
                                    <Box sx={{ width: '0.5rem', height: '0.5rem', borderRadius: '9999px', backgroundColor: '#16a34a', marginRight: '0.5rem' }} />
                                    Active Items
                                </Box>
                                <Button size="small" sx={{ textTransform: 'none', color: '#4f46e5' }} onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}>
                                    {isSidebarCollapsed ? <ChevronRight size={16} /> : <><ChevronLeft size={16} style={{ marginRight: '0.25rem' }} /> Collapse</>}
                                </Button>
                            </ListSubheader>
                        }
                        sx={{ width: '100%', bgcolor: 'background.paper', overflowX: 'hidden', overflowY: 'auto', maxHeight: 'calc(50vh - 100px)', transition: 'max-height 0.3s ease-in-out' }}
                    >
                        {loading && <Typography sx={{ color: '#9333ea', textAlign: 'center', marginY: 3, fontSize: '0.9rem', fontWeight: 500 }}>Loading...</Typography>}
                        {error && <Alert severity="error" sx={{ marginY: 3, borderRadius: '0.5rem' }}>{error}</Alert>}
                        {!loading && !error && activeProducts.length === 0 ? (
                            <Typography variant="body2" sx={{ color: '#6b7280', textAlign: 'center', paddingY: 3 }}>No active products.</Typography>
                        ) : (
                            <Collapse in={!isSidebarCollapsed} timeout="auto" unmountOnExit>
                                {activeProducts.map(product => (
                                    <ListItem
                                        key={product.id}
                                        onClick={() => handleSelectProduct(product)}
                                        sx={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: 1.5,
                                            borderRadius: '0.5rem',
                                            marginBottom: '0.5rem',
                                            backgroundColor: selectedProduct && selectedProduct.id === product.id ? '#eef2ff' : '#fff',
                                            border: selectedProduct && selectedProduct.id === product.id ? '1px solid #c7d2fe' : '1px solid #f3f4f6',
                                            '&:hover': { backgroundColor: '#e0e7ff' },
                                            transition: 'background-color 0.2s, border-color 0.2s',
                                        }}
                                    >
                                        <ListItemText
                                            primary={product.name}
                                            secondary={product.discovery_document ? "Documented" : "Pending Doc"}
                                            primaryTypographyProps={{ fontWeight: 'medium', color: '#1f2937', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                                            secondaryTypographyProps={{ fontSize: '0.75rem', color: '#6b7280' }}
                                        />
                                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                                            <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleArchiveProduct(product.id, true); }}>
                                                <Archive size={16} />
                                            </IconButton>
                                            <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDeleteProduct(product.id); }}>
                                                <Trash2 size={16} />
                                            </IconButton>
                                        </Box>
                                    </ListItem>
                                ))}
                            </Collapse>
                        )}
                    </List>

                    {/* Archived Items List */}
                    <List
                        subheader={
                            <ListSubheader component="div" sx={{
                                backgroundColor: 'transparent',
                                fontWeight: 'bold',
                                fontSize: '1.125rem',
                                color: '#1f2937',
                                lineHeight: '1.75rem',
                                paddingX: 0,
                                paddingY: 1,
                                marginTop: 4,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                            }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', opacity: isSidebarCollapsed ? 0 : 1, transition: 'opacity 0.3s ease-in-out' }}>
                                    <Box sx={{ width: '0.5rem', height: '0.5rem', borderRadius: '9999px', backgroundColor: '#9ca3af', marginRight: '0.5rem' }} />
                                    Archived Items
                                </Box>
                                <Button size="small" sx={{ textTransform: 'none', color: '#4f46e5' }} onClick={() => setIsArchiveListCollapsed(!isArchiveListCollapsed)}>
                                    {isArchiveListCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                                </Button>
                            </ListSubheader>
                        }
                        sx={{ width: '100%', bgcolor: 'background.paper', overflowX: 'hidden', overflowY: 'auto', maxHeight: 'calc(50vh - 100px)', transition: 'max-height 0.3s ease-in-out' }}
                    >
                        {archivedProducts.length === 0 && !loading && !error ? (
                            <Typography variant="body2" sx={{ color: '#6b7280', textAlign: 'center', paddingY: 3 }}>No archived products.</Typography>
                        ) : (
                            <Collapse in={!isArchiveListCollapsed && !isSidebarCollapsed} timeout="auto" unmountOnExit>
                                {archivedProducts.map(product => (
                                    <ListItem
                                        key={product.id}
                                        onClick={() => handleSelectProduct(product)}
                                        sx={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: 1.5,
                                            borderRadius: '0.5rem',
                                            marginBottom: '0.5rem',
                                            backgroundColor: selectedProduct && selectedProduct.id === product.id ? '#f3e8ff' : '#f9fafb', // Lighter purple for archived selected
                                            border: selectedProduct && selectedProduct.id === product.id ? '1px solid #d8b4fe' : '1px solid #e5e7eb',
                                            '&:hover': { backgroundColor: '#ede9fe' },
                                            transition: 'background-color 0.2s, border-color 0.2s',
                                        }}
                                    >
                                        <ListItemText
                                            primary={product.name}
                                            secondary="Archived"
                                            primaryTypographyProps={{ fontWeight: 'medium', color: '#374151', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                                            secondaryTypographyProps={{ fontSize: '0.75rem', color: '#9ca3af' }}
                                        />
                                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                                            <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleArchiveProduct(product.id, false); }}>
                                                <ArchiveRestore size={16} /> {/* Changed Unarchive to ArchiveRestore */}
                                            </IconButton>
                                            <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDeleteProduct(product.id); }}>
                                                <Trash2 size={16} />
                                            </IconButton>
                                        </Box>
                                    </ListItem>
                                ))}
                            </Collapse>
                        )}
                    </List>
                </Paper>

                {/* Right Main Content: Kanban Board */}
                <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* Kanban Board Header */}
                    <Paper
                        elevation={3}
                        sx={{
                            backgroundColor: '#fff',
                            p: 2,
                            borderRadius: '1rem', // rounded-xl
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap', // Allow wrapping on smaller screens
                            gap: 2, // Gap between items
                        }}
                    >
                        <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#1f2937' }}>
                            AI Chat Integration <Typography component="span" variant="body2" sx={{ color: '#6b7280' }}>Development Stage</Typography>
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body2" sx={{ color: '#4b5563' }}>Progress: 60%</Typography>
                                <LinearProgress variant="determinate" value={60} sx={{ width: 100, borderRadius: 5, height: 8, backgroundColor: '#e0e7ff', '& .MuiLinearProgress-bar': { backgroundColor: '#4f46e5' } }} />
                            </Box>
                        </Box>
                    </Paper>

                    {/* Kanban Board Columns */}
                    <Grid container spacing={2} sx={{ flexGrow: 1, alignItems: 'stretch' }}> {/* align-items: stretch to make columns equal height */}
                        {/* Research Column */}
                        <Grid item xs={12} sm={6} md={4} lg={3}> {/* Responsive column sizing */}
                            <Paper
                                elevation={1}
                                sx={{
                                    backgroundColor: '#f5f3ff', // bg-purple-50
                                    p: 2,
                                    borderRadius: '0.75rem', // rounded-xl
                                    minHeight: '200px', // Ensure minimum height for visual consistency
                                    display: 'flex',
                                    flexDirection: 'column',
                                    border: '1px solid #d8b4fe', // border-purple-300
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#4f46e5' }}>
                                        <Box component="span" sx={{ width: '0.5rem', height: '0.5rem', borderRadius: '9999px', backgroundColor: '#4f46e5', display: 'inline-block', marginRight: '0.5rem' }} />
                                        Research
                                    </Typography>
                                    <IconButton size="small"><ChevronRight size={16} /></IconButton>
                                </Box>
                                <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    <Typography variant="body2" sx={{ color: '#374151' }}>Market analysis completed <Box component="span" sx={{ color: '#16a34a', display: 'inline-flex', alignItems: 'center' }}><CheckCircle size={14} style={{ marginLeft: '0.25rem' }} /></Box></Typography>
                                    <Typography variant="body2" sx={{ color: '#374151' }}>Competitor analysis <Box component="span" sx={{ color: '#16a34a', display: 'inline-flex', alignItems: 'center' }}><CheckCircle size={14} style={{ marginLeft: '0.25rem' }} /></Box></Typography>
                                    <Button variant="outlined" startIcon={<Plus size={16} />} sx={{ marginTop: 'auto', textTransform: 'none', color: '#4f46e5', borderColor: '#d8b4fe', '&:hover': { borderColor: '#9333ea', backgroundColor: '#f0eaff' } }}>Add Task</Button>
                                </Box>
                            </Paper>
                        </Grid>

                        {/* Ideation Column */}
                        <Grid item xs={12} sm={6} md={4} lg={3}>
                            <Paper
                                elevation={1}
                                sx={{
                                    backgroundColor: '#eef2ff', // bg-indigo-50
                                    p: 2,
                                    borderRadius: '0.75rem',
                                    minHeight: '200px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    border: '1px solid #c7d2fe', // border-indigo-200
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#6366f1' }}>
                                        <Box component="span" sx={{ width: '0.5rem', height: '0.5rem', borderRadius: '9999px', backgroundColor: '#6366f1', display: 'inline-block', marginRight: '0.5rem' }} />
                                        Ideation
                                    </Typography>
                                    <IconButton size="small"><ChevronRight size={16} /></IconButton>
                                </Box>
                                <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    <Typography variant="body2" sx={{ color: '#374151' }}>Plan logic and expectations <Box component="span" sx={{ color: '#fde047', display: 'inline-flex', alignItems: 'center' }}><CircularProgress size={14} sx={{ marginLeft: '0.25rem', color: '#fde047' }} /></Box></Typography>
                                    <Button variant="outlined" startIcon={<Plus size={16} />} sx={{ marginTop: 'auto', textTransform: 'none', color: '#6366f1', borderColor: '#c7d2fe', '&:hover': { borderColor: '#4f46e5', backgroundColor: '#e0e7ff' } }}>Add Task</Button>
                                </Box>
                            </Paper>
                        </Grid>

                        {/* Design Column */}
                        <Grid item xs={12} sm={6} md={4} lg={3}>
                            <Paper
                                elevation={1}
                                sx={{
                                    backgroundColor: '#fff',
                                    p: 2,
                                    borderRadius: '0.75rem',
                                    minHeight: '200px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    border: '1px solid #e5e7eb',
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#4b5563' }}>
                                        <Box component="span" sx={{ width: '0.5rem', height: '0.5rem', borderRadius: '9999px', backgroundColor: '#9ca3af', display: 'inline-block', marginRight: '0.5rem' }} />
                                        Design
                                    </Typography>
                                    <IconButton size="small"><ChevronRight size={16} /></IconButton>
                                </Box>
                                <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    <Typography variant="body2" sx={{ color: '#374151' }}>PRD handover to design team <Box component="span" sx={{ color: '#ef4444', display: 'inline-flex', alignItems: 'center' }}><Alert severity="warning" icon={false} sx={{ padding: '0px 4px', minHeight: 'auto', '.MuiAlert-message': { padding: 0 } }}>Pending</Alert></Box></Typography>
                                    <Button variant="outlined" startIcon={<Plus size={16} />} sx={{ marginTop: 'auto', textTransform: 'none', color: '#4b5563', borderColor: '#d1d5db', '&:hover': { borderColor: '#9ca3af', backgroundColor: '#f3f4f6' } }}>Add Task</Button>
                                </Box>
                            </Paper>
                        </Grid>

                        {/* Planning Column */}
                        <Grid item xs={12} sm={6} md={4} lg={3}>
                            <Paper
                                elevation={1}
                                sx={{
                                    backgroundColor: '#f5f3ff', // bg-purple-50
                                    p: 2,
                                    borderRadius: '0.75rem',
                                    minHeight: '200px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    border: '1px solid #d8b4fe',
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#4f46e5' }}>
                                        <Box component="span" sx={{ width: '0.5rem', height: '0.5rem', borderRadius: '9999px', backgroundColor: '#4f46e5', display: 'inline-block', marginRight: '0.5rem' }} />
                                        Planning
                                    </Typography>
                                    <IconButton size="small"><ChevronRight size={16} /></IconButton>
                                </Box>
                                <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    <Typography variant="body2" sx={{ color: '#374151' }}>Timeline planning <Box component="span" sx={{ color: '#ef4444', display: 'inline-flex', alignItems: 'center' }}><Alert severity="warning" icon={false} sx={{ padding: '0px 4px', minHeight: 'auto', '.MuiAlert-message': { padding: 0 } }}>Pending</Alert></Box></Typography>
                                    <Button variant="outlined" startIcon={<Plus size={16} />} sx={{ marginTop: 'auto', textTransform: 'none', color: '#4f46e5', borderColor: '#d8b4fe', '&:hover': { borderColor: '#9333ea', backgroundColor: '#f0eaff' } }}>Add Task</Button>
                                </Box>
                            </Paper>
                        </Grid>

                        {/* Development Column */}
                        <Grid item xs={12} sm={6} md={4} lg={3}>
                            <Paper
                                elevation={1}
                                sx={{
                                    backgroundColor: '#eef2ff', // bg-indigo-50
                                    p: 2,
                                    borderRadius: '0.75rem',
                                    minHeight: '200px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    border: '1px solid #c7d2fe',
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#6366f1' }}>
                                        <Box component="span" sx={{ width: '0.5rem', height: '0.5rem', borderRadius: '9999px', backgroundColor: '#6366f1', display: 'inline-block', marginRight: '0.5rem' }} />
                                        Development
                                    </Typography>
                                    <IconButton size="small"><ChevronRight size={16} /></IconButton>
                                </Box>
                                <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    <Typography variant="body2" sx={{ color: '#374151' }}>Frontend development <Box component="span" sx={{ color: '#ef4444', display: 'inline-flex', alignItems: 'center' }}><Alert severity="warning" icon={false} sx={{ padding: '0px 4px', minHeight: 'auto', '.MuiAlert-message': { padding: 0 } }}>Pending</Alert></Box></Typography>
                                    <Typography variant="body2" sx={{ color: '#374151' }}>Backend API integration <Box component="span" sx={{ color: '#ef4444', display: 'inline-flex', alignItems: 'center' }}><Alert severity="warning" icon={false} sx={{ padding: '0px 4px', minHeight: 'auto', '.MuiAlert-message': { padding: 0 } }}>Pending</Alert></Box></Typography>
                                    <Button variant="outlined" startIcon={<Plus size={16} />} sx={{ marginTop: 'auto', textTransform: 'none', color: '#6366f1', borderColor: '#c7d2fe', '&:hover': { borderColor: '#4f46e5', backgroundColor: '#e0e7ff' } }}>Add Task</Button>
                                </Box>
                            </Paper>
                        </Grid>

                        {/* Documentation Column */}
                        <Grid item xs={12} sm={6} md={4} lg={3}>
                            <Paper
                                elevation={1}
                                sx={{
                                    backgroundColor: '#fff',
                                    p: 2,
                                    borderRadius: '0.75rem',
                                    minHeight: '200px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    border: '1px solid #e5e7eb',
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#4b5563' }}>
                                        <Box component="span" sx={{ width: '0.5rem', height: '0.5rem', borderRadius: '9999px', backgroundColor: '#9ca3af', display: 'inline-block', marginRight: '0.5rem' }} />
                                        Documentation
                                    </Typography>
                                    <IconButton size="small"><ChevronRight size={16} /></IconButton>
                                </Box>
                                <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    <Typography variant="body2" sx={{ color: '#374151' }}>Tech documentation handover <Box component="span" sx={{ color: '#ef4444', display: 'inline-flex', alignItems: 'center' }}><Alert severity="warning" icon={false} sx={{ padding: '0px 4px', minHeight: 'auto', '.MuiAlert-message': { padding: 0 } }}>Pending</Alert></Box></Typography>
                                    <Button variant="outlined" startIcon={<Plus size={16} />} sx={{ marginTop: 'auto', textTransform: 'none', color: '#4b5563', borderColor: '#d1d5db', '&:hover': { borderColor: '#9ca3af', backgroundColor: '#f3f4f6' } }}>Add Task</Button>
                                </Box>
                            </Paper>
                        </Grid>
                    </Grid>
                </Box>
            </Box>

            {/* AI Assistant Panel (Conditional Rendering based on showAiAssistant state) */}
            {showAiAssistant && selectedProduct && (
                <Paper
                    elevation={3}
                    sx={{
                        position: 'fixed', // Fixed position to float above other content
                        top: '50%',
                        right: '1rem',
                        transform: 'translateY(-50%)',
                        width: { xs: '90%', sm: '400px' }, // Responsive width
                        maxHeight: '80vh', // Max height to prevent overflow
                        overflowY: 'auto', // Scroll if content overflows
                        backgroundColor: '#fff',
                        p: 4, 
                        borderRadius: '1.5rem', 
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', 
                        border: '1px solid #e5e7eb', 
                        zIndex: 1000, // Ensure it's on top
                    }}
                >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                        <Typography variant="h5" component="h2" sx={{ fontWeight: 700, color: '#1f2937' }}>
                            AI Assistant
                        </Typography>
                        <IconButton onClick={() => setShowAiAssistant(false)} size="small">
                            <Plus size={24} style={{ transform: 'rotate(45deg)' }} /> {/* Close icon */}
                        </IconButton>
                    </Box>
                    
                    <Typography variant="h6" sx={{ fontWeight: 600, color: '#374151', marginBottom: 2.5 }}>
                        Currently Selected: <Box component="span" sx={{ color: '#9333ea' }}>{selectedProduct.name}</Box>
                    </Typography>

                    <Box sx={{ marginBottom: 4 }}>
                        <Typography variant="body1" sx={{ color: '#374151', fontWeight: 700, marginBottom: 1.5 }}>
                            Details for AI Generation:
                        </Typography>
                        <TextField
                            id="discoveryInput"
                            placeholder="e.g., Target audience, pain points, desired outcomes, core functionality, competitive analysis..."
                            multiline
                            rows={10}
                            value={discoveryInput}
                            onChange={(e) => setDiscoveryInput(e.target.value)}
                            disabled={loading}
                            fullWidth
                            variant="outlined"
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: '0.75rem', 
                                    padding: '1rem', 
                                },
                                '& .Mui-focused fieldset': {
                                    borderColor: '#9333ea', 
                                    boxShadow: '0 0 0 2px rgba(147, 51, 234, 0.25)', 
                                },
                                '& .MuiInputBase-input::placeholder': {
                                    color: '#9ca3af', 
                                    opacity: 1,
                                },
                            }}
                        />
                        <Button
                            onClick={handleGenerateDocument}
                            variant="contained"
                            disabled={loading}
                            sx={{
                                marginTop: 3, 
                                width: '100%',
                                paddingX: 4, 
                                paddingY: 2, 
                                backgroundColor: '#16a34a', 
                                color: '#fff',
                                fontWeight: 700,
                                borderRadius: '0.75rem', 
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)', 
                                textTransform: 'none',
                                '&:hover': {
                                    backgroundColor: '#15803d', 
                                    transform: 'scale(1.05)', 
                                },
                                '&:disabled': {
                                    opacity: 0.5,
                                    cursor: 'not-allowed',
                                    color: '#fff',
                                },
                            }}
                        >
                            {loading ? <CircularProgress size={20} color="inherit" /> : 'Generate Document'}
                        </Button>
                    </Box>

                    {(generatedDocument || selectedProduct.discovery_document) && (
                        <Box sx={{ marginTop: 5 }}>
                            <Typography variant="h6" sx={{ fontWeight: 600, color: '#374151', marginBottom: 2.5, borderTop: '2px solid #d8b4fe', paddingTop: 3 }}>
                                {generatedDocument ? 'Generated Document' : 'Saved Document'} for {selectedProduct.name}:
                            </Typography>
                            <Paper
                                elevation={0}
                                sx={{
                                    backgroundColor: '#f9fafb', 
                                    p: 4, 
                                    borderRadius: '0.75rem', 
                                    boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)', 
                                    border: '1px solid #e5e7eb', 
                                    whiteSpace: 'pre-wrap',
                                    color: '#1f2937', 
                                    lineHeight: '1.625', 
                                    fontSize: '1rem', 
                                }}
                            >
                                {generatedDocument || selectedProduct.discovery_document}
                            </Paper>
                        </Box>
                    )}
                </Paper>
            )}

            <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleSnackbarClose}>
                <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </Box>
    );
}

export default App;