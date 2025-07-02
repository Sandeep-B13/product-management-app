import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';

// Importing Material-UI components
import { 
    Box, 
    Button, 
    TextField, 
    Typography, 
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
    Grid, 
    LinearProgress, 
    Dialog, // For confirmation and add product popups
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Select, // For sort dropdown
    MenuItem, // For sort dropdown items
    FormControl, // For select input
    InputLabel, // For select input label
    Tabs, // New: For tabbed navigation
    Tab // New: For individual tabs
} from '@mui/material';

// Importing Lucide icons
import { Eye, EyeOff, ArrowRight, Sparkles, Zap, Users, BarChart3, Trash2, Plus, Archive, ArchiveRestore, MessageSquare, CheckCircle, Search } from 'lucide-react'; 

// Define the API URL for your backend.
// In development, it will default to http://localhost:5000.
// In production (on Vercel), it will use the REACT_APP_API_URL environment variable.
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// --- AuthPage Component ---
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
    // Products will be fetched from DB
    const [products, setProducts] = useState([]); 
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [newProductName, setNewProductName] = useState('');
    const [newProductDescription, setNewProductDescription] = useState(''); 
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [generatedDocument, setGeneratedDocument] = useState('');
    const [discoveryInput, setDiscoveryInput] = useState('');
    const [showAiAssistant, setShowAiAssistant] = useState(false); 
    const [showArchivedView, setShowArchivedView] = useState(false); 

    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [authMessage, setAuthMessage] = useState(''); 
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('success');

    // State for new product modal
    const [showAddProductModal, setShowAddProductModal] = useState(false);

    // State for delete confirmation modal
    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [productToDeleteId, setProductToDeleteId] = useState(null);

    // State for search and sort/filter
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('newest'); 
    const [filterByStage, setFilterByStage] = useState('All'); // New state for filtering by stage

    // Ref for Lottie animation container
    const lottieContainer = useRef(null);
    const lottieInstance = useRef(null);

    // Define possible Kanban stages and their associated progress percentages
    const kanbanStages = ['Research', 'Ideation', 'Design', 'Planning', 'Development', 'Documentation'];
    const stageProgressMap = {
        'Research': 20,
        'Ideation': 40,
        'Design': 60,
        'Planning': 70,
        'Development': 90,
        'Documentation': 100,
    };

    // New state for selected Kanban tab
    const [selectedKanbanTab, setSelectedKanbanTab] = useState(0); 

    // Lottie animation setup
    useEffect(() => {
        if (lottieContainer.current && !selectedProduct) {
            // Ensure lottie is loaded before trying to use it
            if (window.lottie) {
                if (lottieInstance.current) {
                    lottieInstance.current.destroy(); // Destroy previous instance if it exists
                }
                lottieInstance.current = window.lottie.loadAnimation({
                    container: lottieContainer.current,
                    renderer: 'svg',
                    loop: true,
                    autoplay: true,
                    // Public Lottie animation for an empty/waiting state
                    animationData: {
                        "v": "5.7.4",
                        "fr": 60,
                        "ip": 0,
                        "op": 120,
                        "wh": 100,
                        "ht": 100,
                        "nm": "Empty State",
                        "ddd": 0,
                        "assets": [],
                        "layers": [
                            {
                                "ddd": 0,
                                "ind": 1,
                                "ty": 4,
                                "nm": "Folder",
                                "sr": 1,
                                "ks": {
                                    "o": { "a": 0, "k": 100, "ix": 11 },
                                    "rp": { "a": 0, "k": 0, "ix": 12 },
                                    "s": { "a": 0, "k": [100, 100, 100], "ix": 6 },
                                    "r": { "a": 0, "k": 0, "ix": 10 },
                                    "p": { "a": 0, "k": [50, 50, 0], "ix": 2 },
                                    "a": { "a": 0, "k": [50, 50, 0], "ix": 1 }
                                },
                                "ao": 0,
                                "shapes": [
                                    {
                                        "ty": "gr",
                                        "it": [
                                            {
                                                "ind": 0,
                                                "ty": "sh",
                                                "ix": 1,
                                                "ks": {
                                                    "k": {
                                                        "i": [
                                                            { "x": 0.833, "y": 0.833 },
                                                            { "x": 0.833, "y": 0.833 },
                                                            { "x": 0.833, "y": 0.833 },
                                                            { "x": 0.833, "y": 0.833 }
                                                        ],
                                                        "o": [
                                                            { "x": 0.167, "y": 0.167 },
                                                            { "x": 0.167, "y": 0.167 },
                                                            { "x": 0.167, "y": 0.167 },
                                                            { "x": 0.167, "y": 0.167 }
                                                        ],
                                                        "v": [
                                                            [30, 80],
                                                            [70, 80],
                                                            [70, 20],
                                                            [30, 20]
                                                        ]
                                                    },
                                                    "ix": 2
                                                },
                                                "nm": "Rectangle Path",
                                                "mn": "ADBE Vector Shape - Group",
                                                "hd": false
                                            },
                                            {
                                                "ty": "fl",
                                                "c": { "a": 0, "k": [0.8, 0.8, 0.8, 1], "ix": 3 },
                                                "o": { "a": 0, "k": 100, "ix": 4 },
                                                "r": 1,
                                                "nm": "Fill 1",
                                                "mn": "ADBE Vector Fill",
                                                "hd": false
                                            },
                                            {
                                                "ty": "st",
                                                "c": { "a": 0, "k": [0.5, 0.5, 0.5, 1], "ix": 5 },
                                                "o": { "a": 0, "k": 100, "ix": 6 },
                                                "w": { "a": 0, "k": 2, "ix": 7 },
                                                "lc": 1,
                                                "lj": 1,
                                                "ml": 4,
                                                "nm": "Stroke 1",
                                                "mn": "ADBE Vector Stroke",
                                                "hd": false
                                            }
                                        ],
                                        "nm": "Rectangle 1",
                                        "mn": "ADBE Vector Group",
                                        "hd": false
                                    },
                                    {
                                        "ty": "gr",
                                        "it": [
                                            {
                                                "ind": 0,
                                                "ty": "sh",
                                                "ix": 1,
                                                "ks": {
                                                    "k": {
                                                        "i": [
                                                            { "x": 0.833, "y": 0.833 },
                                                            { "x": 0.833, "y": 0.833 },
                                                            { "x": 0.833, "y": 0.833 },
                                                            { "x": 0.833, "y": 0.833 }
                                                        ],
                                                        "o": [
                                                            { "x": 0.167, "y": 0.167 },
                                                            { "x": 0.167, "y": 0.167 },
                                                            { "x": 0.167, "y": 0.167 },
                                                            { "x": 0.167, "y": 0.167 }
                                                        ],
                                                        "v": [
                                                            [30, 80],
                                                            [70, 80],
                                                            [70, 20],
                                                            [30, 20]
                                                        ]
                                                    },
                                                    "ix": 2
                                                },
                                                "nm": "Rectangle Path",
                                                "mn": "ADBE Vector Shape - Group",
                                                "hd": false
                                            },
                                            {
                                                "ty": "fl",
                                                "c": { "a": 0, "k": [0.9, 0.9, 0.9, 1], "ix": 3 },
                                                "o": { "a": 0, "k": 100, "ix": 4 },
                                                "r": 1,
                                                "nm": "Fill 1",
                                                "mn": "ADBE Vector Fill",
                                                "hd": false
                                            },
                                            {
                                                "ty": "st",
                                                "c": { "a": 0, "k": [0.6, 0.6, 0.6, 1], "ix": 5 },
                                                "o": { "a": 0, "k": 100, "ix": 6 },
                                                "w": { "a": 0, "k": 2, "ix": 7 },
                                                "lc": 1,
                                                "lj": 1,
                                                "ml": 4,
                                                "nm": "Stroke 1",
                                                "mn": "ADBE Vector Stroke",
                                                "hd": false
                                            }
                                        ],
                                        "nm": "Rectangle 2",
                                        "mn": "ADBE Vector Group",
                                        "hd": false,
                                        "tf": true
                                    },
                                    {
                                        "ty": "gr",
                                        "it": [
                                            {
                                                "ind": 0,
                                                "ty": "sh",
                                                "ix": 1,
                                                "ks": {
                                                    "k": {
                                                        "i": [
                                                            { "x": 0.833, "y": 0.833 },
                                                            { "x": 0.833, "y": 0.833 },
                                                            { "x": 0.833, "y": 0.833 },
                                                            { "x": 0.833, "y": 0.833 }
                                                        ],
                                                        "o": [
                                                            { "x": 0.167, "y": 0.167 },
                                                            { "x": 0.167, "y": 0.167 },
                                                            { "x": 0.167, "y": 0.167 },
                                                            { "x": 0.167, "y": 0.167 }
                                                        ],
                                                        "v": [
                                                            [30, 80],
                                                            [70, 80],
                                                            [70, 20],
                                                            [30, 20]
                                                        ]
                                                    },
                                                    "ix": 2
                                                },
                                                "nm": "Rectangle Path",
                                                "mn": "ADBE Vector Shape - Group",
                                                "hd": false
                                            },
                                            {
                                                "ty": "fl",
                                                "c": { "a": 0, "k": [1, 1, 1, 1], "ix": 3 },
                                                "o": { "a": 0, "k": 100, "ix": 4 },
                                                "r": 1,
                                                "nm": "Fill 1",
                                                "mn": "ADBE Vector Fill",
                                                "hd": false
                                            },
                                            {
                                                "ty": "st",
                                                "c": { "a": 0, "k": [0.7, 0.7, 0.7, 1], "ix": 5 },
                                                "o": { "a": 0, "k": 100, "ix": 6 },
                                                "w": { "a": 0, "k": 2, "ix": 7 },
                                                "lc": 1,
                                                "lj": 1,
                                                "ml": 4,
                                                "nm": "Stroke 1",
                                                "mn": "ADBE Vector Stroke",
                                                "hd": false
                                            }
                                        ],
                                        "nm": "Rectangle 3",
                                        "mn": "ADBE Vector Group",
                                        "hd": false,
                                        "tf": true
                                    }
                                ],
                                "ip": 0,
                                "op": 120,
                                "st": 0,
                                "bm": 0
                            },
                            {
                                "ddd": 0,
                                "ind": 2,
                                "ty": 4,
                                "nm": "Magnifying Glass",
                                "sr": 1,
                                "ks": {
                                    "o": { "a": 0, "k": 100, "ix": 11 },
                                    "rp": { "a": 0, "k": 0, "ix": 12 },
                                    "s": { "a": 0, "k": [100, 100, 100], "ix": 6 },
                                    "r": { "a": 0, "k": 0, "ix": 10 },
                                    "p": { "a": 0, "k": [50, 50, 0], "ix": 2 },
                                    "a": { "a": 0, "k": [50, 50, 0], "ix": 1 }
                                },
                                "ao": 0,
                                "shapes": [
                                    {
                                        "ty": "gr",
                                        "it": [
                                            {
                                                "ind": 0,
                                                "ty": "sh",
                                                "ix": 1,
                                                "ks": {
                                                    "k": {
                                                        "i": [
                                                            { "x": 0.833, "y": 0.833 },
                                                            { "x": 0.833, "y": 0.833 },
                                                            { "x": 0.833, "y": 0.833 },
                                                            { "x": 0.833, "y": 0.833 }
                                                        ],
                                                        "o": [
                                                            { "x": 0.167, "y": 0.167 },
                                                            { "x": 0.167, "y": 0.167 },
                                                            { "x": 0.167, "y": 0.167 },
                                                            { "x": 0.167, "y": 0.167 }
                                                        ],
                                                        "v": [
                                                            [30, 80],
                                                            [70, 80],
                                                            [70, 20],
                                                            [30, 20]
                                                        ]
                                                    },
                                                    "ix": 2
                                                },
                                                "nm": "Rectangle Path",
                                                "mn": "ADBE Vector Shape - Group",
                                                "hd": false
                                            },
                                            {
                                                "ty": "st",
                                                "c": { "a": 0, "k": [0.2, 0.2, 0.2, 1], "ix": 3 },
                                                "o": { "a": 0, "k": 100, "ix": 4 },
                                                "w": { "a": 0, "k": 2, "ix": 5 },
                                                "lc": 1,
                                                "lj": 1,
                                                "ml": 4,
                                                "nm": "Stroke 1",
                                                "mn": "ADBE Vector Stroke",
                                                "hd": false
                                            }
                                        ],
                                        "nm": "Ellipse 1",
                                        "mn": "ADBE Vector Group",
                                        "hd": false
                                    }
                                ],
                                "ip": 0,
                                "op": 120,
                                "st": 0,
                                "bm": 0
                            }
                        ]
                    }
                });
            }
        }
    }, [selectedProduct]); // Re-run when selectedProduct changes

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
                const token = localStorage.getItem('token');
                const response = await axios.get(`${API_URL}/api/products`, {
                    headers: {
                        Authorization: `Bearer ${token}` // Send token for authentication
                    }
                });
                setProducts(response.data);
            } catch (err) {
                console.error("Error fetching products:", err);
                const errorMessage = err.response && err.response.data && err.response.data.message 
                                    ? err.response.data.message 
                                    : "Failed to load products. Please check the backend server or your login status.";
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

    // Filter and Sort Logic
    const filteredAndSortedProducts = useMemo(() => {
        let currentProducts = showArchivedView ? products.filter(p => p.isArchived) : products.filter(p => !p.isArchived);

        // Apply search filter
        if (searchTerm) {
            currentProducts = currentProducts.filter(p => 
                p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (p.discovery_document && p.discovery_document.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }

        // Apply stage filter
        if (filterByStage !== 'All') {
            currentProducts = currentProducts.filter(p => p.stage === filterByStage);
        }

        // Apply sort
        currentProducts.sort((a, b) => {
            if (sortBy === 'newest') {
                return new Date(b.created_at) - new Date(a.created_at);
            } else if (sortBy === 'oldest') {
                return new Date(a.created_at) - new Date(b.created_at);
            } else if (sortBy === 'alpha-asc') {
                return a.name.localeCompare(b.name);
            } else if (sortBy === 'alpha-desc') {
                return b.name.localeCompare(a.name);
            } else if (sortBy === 'progress-asc') {
                return a.progress - b.progress;
            } else if (sortBy === 'progress-desc') {
                return b.progress - a.progress;
            }
            return 0;
        });

        return currentProducts;
    }, [products, showArchivedView, searchTerm, sortBy, filterByStage]);


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
        setShowAddProductModal(false); 
        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(`${API_URL}/api/products`, {
                name: newProductName,
                discovery_document: newProductDescription, 
                isArchived: false,
                progress: 0, // Default progress for new product
                stage: 'Research' // Default stage for new product
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            setProducts([response.data, ...products]); // Add new product to the top
            setNewProductName('');
            setNewProductDescription('');
            setSnackbarMessage("Product added successfully!");
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
        } catch (err) {
            console.error("Error creating product:", err);
            const errorMessage = err.response && err.response.data && err.response.data.message 
                                ? err.response.data.message 
                                : "Failed to add product. Please try again.";
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
        setShowAiAssistant(false); 
        setSnackbarOpen(false);
        // Set the selected Kanban tab to the index of the selected product's stage
        const stageIndex = kanbanStages.indexOf(product.stage);
        setSelectedKanbanTab(stageIndex >= 0 ? stageIndex : 0);
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

    const confirmDeleteProduct = (productId) => {
        setProductToDeleteId(productId);
        setShowDeleteConfirmModal(true);
    };

    const handleDeleteProduct = async () => {
        setLoading(true);
        setError(null);
        setSnackbarOpen(false);
        setShowDeleteConfirmModal(false); 
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_URL}/api/products/${productToDeleteId}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            setProducts(products.filter(p => p.id !== productToDeleteId));
            if (selectedProduct && selectedProduct.id === productToDeleteId) {
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
            setProductToDeleteId(null);
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

            // Update the product in the backend with the generated document
            await axios.put(`${API_URL}/api/products/${selectedProduct.id}`, {
                discovery_document: doc
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            // Update local state for products and selectedProduct
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

    // Function to update product stage and progress (example for Kanban interaction)
    const updateProductStageAndProgress = async (productId, newStage, newProgress) => {
        setLoading(true);
        setError(null);
        setSnackbarOpen(false);
        try {
            const token = localStorage.getItem('token');
            const updatedProduct = {
                stage: newStage,
                progress: newProgress
            };
            const response = await axios.put(`${API_URL}/api/products/${productId}`, updatedProduct, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            setProducts(products.map(p =>
                p.id === productId ? response.data : p
            ));
            if (selectedProduct && selectedProduct.id === productId) {
                setSelectedProduct(response.data);
                // Also update the selected Kanban tab to the new stage
                const newStageIndex = kanbanStages.indexOf(newStage);
                setSelectedKanbanTab(newStageIndex >= 0 ? newStageIndex : 0);
            }
            setSnackbarMessage(`Product stage updated to ${newStage}!`);
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
        } catch (err) {
            console.error("Error updating product stage:", err);
            const errorMessage = "Failed to update product stage. Please try again.";
            setError(errorMessage);
            setSnackbarMessage(errorMessage);
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        } finally {
            setLoading(false);
        }
    };

    // Helper function to get tab color based on stage status
    const getTabColor = (stage) => {
        if (!selectedProduct) return '#6b7280'; // Default grey if no product selected

        const currentStageIndex = kanbanStages.indexOf(selectedProduct.stage);
        const tabStageIndex = kanbanStages.indexOf(stage);

        if (tabStageIndex < currentStageIndex) {
            return '#16a34a'; // Green for completed stages
        } else if (tabStageIndex === currentStageIndex) {
            return '#4f46e5'; // Primary color for current stage
        } else {
            return '#6b7280'; // Grey for pending/future stages
        }
    };

    // Helper function for TabPanel content
    const TabPanel = (props) => {
        const { children, value, index, ...other } = props;
        return (
            <div
                role="tabpanel"
                hidden={value !== index}
                id={`kanban-tabpanel-${index}`}
                aria-labelledby={`kanban-tab-${index}`}
                {...other}
                style={{ flexGrow: 1, display: value === index ? 'flex' : 'none', flexDirection: 'column', overflowY: 'auto' }}
            >
                {value === index && (
                    <Box sx={{ p: 3, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                        {children}
                    </Box>
                )}
            </div>
        );
    };


    if (!isLoggedIn) {
        return <AuthPage setIsLoggedIn={setIsLoggedIn} setAuthMessage={setAuthMessage} />;
    }

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                height: '100vh', // Make the entire app fill the viewport height
                fontFamily: 'Inter, sans-serif',
                background: 'linear-gradient(to bottom right, #f9fafb, #e5e7eb)',
            }}
        >
            {/* Main Header */}
            <Box
                component="header"
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1rem 2rem', 
                    backgroundColor: '#fff',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', 
                    borderRadius: '0.75rem', 
                    margin: '1rem', 
                    flexShrink: 0, // Prevent header from shrinking
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
                    <Button
                        onClick={handleLogout}
                        variant="outlined"
                        sx={{
                            borderColor: '#e5e7eb', 
                            color: '#374151', 
                            fontWeight: 600,
                            borderRadius: '0.5rem',
                            textTransform: 'none',
                            padding: '0.5rem 1rem',
                            '&:hover': {
                                backgroundColor: '#f0f0f0', 
                                borderColor: '#d1d5db',
                            },
                        }}
                    >
                        Logout
                    </Button>
                </Box>
            </Box>

            {/* Main Content Area: Sidebar + Kanban Board */}
            <Box sx={{ flexGrow: 1, display: 'flex', padding: '1rem', gap: '1rem', overflow: 'hidden' }}> 
                {/* Left Sidebar */}
                <Paper
                    elevation={3}
                    sx={{
                        width: '280px', 
                        flexShrink: 0, 
                        backgroundColor: '#fff',
                        borderRadius: '1rem', 
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                        p: 2,
                        display: 'flex',
                        flexDirection: 'column',
                        // Fixed height for sidebar to allow its content to scroll
                        height: '100%', 
                        '@media (max-width: 600px)': { 
                            width: '100%',
                            marginBottom: '1rem',
                            height: 'auto', // Adjust for mobile if needed
                        },
                    }}
                >
                    {/* Add New Item Button */}
                    <Button
                        variant="contained"
                        startIcon={<Plus size={20} />}
                        sx={{
                            backgroundColor: '#9333ea', 
                            '&:hover': { backgroundColor: '#7e22ce' }, 
                            color: '#fff',
                            fontWeight: 600,
                            borderRadius: '0.75rem',
                            textTransform: 'none',
                            padding: '0.75rem 1rem',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                            marginBottom: 3,
                        }}
                        onClick={() => setShowAddProductModal(true)}
                    >
                        Add New Item
                    </Button>

                    {/* Search and Sort/Filter Controls */}
                    <Box sx={{ marginBottom: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <TextField
                            fullWidth
                            variant="outlined"
                            size="small"
                            placeholder="Search items..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Search size={18} color="#9ca3af" />
                                    </InputAdornment>
                                ),
                                sx: { borderRadius: '0.5rem' }
                            }}
                        />
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <FormControl fullWidth variant="outlined" size="small">
                                <InputLabel id="sort-by-label">Sort By</InputLabel>
                                <Select
                                    labelId="sort-by-label"
                                    id="sort-by-select"
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    label="Sort By"
                                    sx={{ borderRadius: '0.5rem' }}
                                >
                                    <MenuItem value="newest">Created Date (Newest First)</MenuItem>
                                    <MenuItem value="oldest">Created Date (Oldest First)</MenuItem>
                                    <MenuItem value="alpha-asc">Alphabetical (A-Z)</MenuItem>
                                    <MenuItem value="alpha-desc">Alphabetical (Z-A)</MenuItem>
                                    <MenuItem value="progress-asc">Progress (Low to High)</MenuItem>
                                    <MenuItem value="progress-desc">Progress (High to Low)</MenuItem>
                                </Select>
                            </FormControl>
                            <FormControl fullWidth variant="outlined" size="small">
                                <InputLabel id="filter-by-stage-label">Filter By Stage</InputLabel>
                                <Select
                                    labelId="filter-by-stage-label"
                                    id="filter-by-stage-select"
                                    value={filterByStage}
                                    onChange={(e) => setFilterByStage(e.target.value)}
                                    label="Filter By Stage"
                                    sx={{ borderRadius: '0.5rem' }}
                                >
                                    <MenuItem value="All">All Stages</MenuItem>
                                    {kanbanStages.map(stage => (
                                        <MenuItem key={stage} value={stage}>{stage}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Box>
                    </Box>

                    {/* Toggle Buttons for Active/Archived Items */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-around', marginBottom: 2, gap: 1 }}>
                        <Button
                            variant={!showArchivedView ? "contained" : "outlined"}
                            onClick={() => setShowArchivedView(false)}
                            sx={{
                                flexGrow: 1,
                                textTransform: 'none',
                                borderRadius: '0.5rem',
                                fontWeight: 600,
                                backgroundColor: !showArchivedView ? '#4f46e5' : 'transparent',
                                color: !showArchivedView ? '#fff' : '#4f46e5',
                                borderColor: '#4f46e5',
                                '&:hover': {
                                    backgroundColor: !showArchivedView ? '#4338ca' : '#eef2ff',
                                    borderColor: '#4338ca',
                                },
                            }}
                        >
                            Active
                        </Button>
                        <Button
                            variant={showArchivedView ? "contained" : "outlined"}
                            onClick={() => setShowArchivedView(true)}
                            sx={{
                                flexGrow: 1,
                                textTransform: 'none',
                                borderRadius: '0.5rem',
                                fontWeight: 600,
                                backgroundColor: showArchivedView ? '#4f46e5' : 'transparent',
                                color: showArchivedView ? '#fff' : '#4f46e5',
                                borderColor: '#4f46e5',
                                '&:hover': {
                                    backgroundColor: showArchivedView ? '#4338ca' : '#eef2ff',
                                    borderColor: '#4338ca',
                                },
                            }}
                        >
                            Archived
                        </Button>
                    </Box>

                    {/* Conditional Rendering of Active/Archived Lists */}
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
                            }}>
                                <Box sx={{ width: '0.5rem', height: '0.5rem', borderRadius: '9999px', backgroundColor: showArchivedView ? '#9ca3af' : '#16a34a', marginRight: '0.5rem' }} />
                                {showArchivedView ? 'Archived Items' : 'Active Items'}
                            </ListSubheader>
                        }
                        sx={{ width: '100%', bgcolor: 'background.paper', overflowY: 'auto', flexGrow: 1 }} // Allow list to scroll
                    >
                        {loading && <Typography sx={{ color: '#9333ea', textAlign: 'center', marginY: 3, fontSize: '0.9rem', fontWeight: 500 }}>Loading...</Typography>}
                        {error && <Alert severity="error" sx={{ marginY: 3, borderRadius: '0.5rem' }}>{error}</Alert>}
                        {!loading && !error && filteredAndSortedProducts.length === 0 ? (
                            <Typography variant="body2" sx={{ color: '#6b7280', textAlign: 'center', paddingY: 3 }}>
                                {showArchivedView ? 'No archived products matching criteria.' : 'No active products matching criteria.'}
                            </Typography>
                        ) : (
                            filteredAndSortedProducts.map(product => (
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
                                        backgroundColor: selectedProduct && selectedProduct.id === product.id ? (showArchivedView ? '#f3e8ff' : '#eef2ff') : '#fff',
                                        border: selectedProduct && selectedProduct.id === product.id ? (showArchivedView ? '1px solid #d8b4fe' : '1px solid #c7d2fe') : '1px solid #f3f4f6',
                                        '&:hover': { backgroundColor: showArchivedView ? '#ede9fe' : '#e0e7ff' },
                                        transition: 'background-color 0.2s, border-color 0.2s',
                                    }}
                                >
                                    <ListItemText
                                        primary={product.name}
                                        secondary={
                                            <Box>
                                                <Typography component="span" variant="body2" sx={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                                    Stage: {product.stage} | Progress: {product.progress}%
                                                </Typography>
                                                <LinearProgress 
                                                    variant="determinate" 
                                                    value={product.progress} 
                                                    sx={{ 
                                                        width: '100%', 
                                                        borderRadius: 5, 
                                                        height: 4, 
                                                        backgroundColor: '#e0e7ff', 
                                                        '& .MuiLinearProgress-bar': { backgroundColor: '#4f46e5' } 
                                                    }} 
                                                />
                                            </Box>
                                        }
                                        primaryTypographyProps={{ fontWeight: 'medium', color: '#1f2937', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                                    />
                                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                                        {showArchivedView ? (
                                            <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleArchiveProduct(product.id, false); }}>
                                                <ArchiveRestore size={16} />
                                            </IconButton>
                                        ) : (
                                            <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleArchiveProduct(product.id, true); }}>
                                                <Archive size={16} />
                                            </IconButton>
                                        )}
                                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); confirmDeleteProduct(product.id); }}>
                                            <Trash2 size={16} />
                                        </IconButton>
                                    </Box>
                                </ListItem>
                            ))
                        )}
                    </List>
                </Paper>

                {/* Right Main Content: Kanban Board (now tabbed) */}
                <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* Kanban Board Header */}
                    <Paper
                        elevation={3}
                        sx={{
                            backgroundColor: '#fff',
                            p: 2,
                            borderRadius: '1rem', 
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap', 
                            gap: 2, 
                            flexShrink: 0, // Prevent header from shrinking
                        }}
                    >
                        <Box>
                            <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#1f2937' }}>
                                {selectedProduct ? selectedProduct.name : "Select a Product/Feature"} 
                                <Typography component="span" variant="body2" sx={{ color: '#6b7280', marginLeft: 1 }}>
                                    {selectedProduct ? `(${selectedProduct.stage} Stage)` : ""}
                                </Typography>
                            </Typography>
                            {selectedProduct && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, marginTop: 1 }}>
                                    <Typography variant="body2" sx={{ color: '#4b5563' }}>
                                        Progress: {selectedProduct.progress}%
                                    </Typography>
                                    <LinearProgress 
                                        variant="determinate" 
                                        value={selectedProduct.progress} 
                                        sx={{ 
                                            width: 100, 
                                            borderRadius: 5, 
                                            height: 8, 
                                            backgroundColor: '#e0e7ff', 
                                            '& .MuiLinearProgress-bar': { backgroundColor: '#4f46e5' } 
                                        }} 
                                    />
                                </Box>
                            )}
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                            {/* AI Assistant button in header, context-aware */}
                            <Button
                                variant="contained"
                                startIcon={<MessageSquare size={20} />}
                                sx={{
                                    backgroundColor: '#4f46e5', 
                                    '&:hover': { backgroundColor: '#4338ca' }, 
                                    color: '#fff',
                                    fontWeight: 600,
                                    borderRadius: '0.5rem',
                                    textTransform: 'none',
                                    padding: '0.5rem 1rem',
                                    boxShadow: 'none',
                                }}
                                onClick={() => {
                                    if (selectedProduct) {
                                        // When AI Assistant is toggled, ensure we're on the current product's stage tab
                                        const stageIndex = kanbanStages.indexOf(selectedProduct.stage);
                                        setSelectedKanbanTab(stageIndex >= 0 ? stageIndex : 0);
                                        setShowAiAssistant(!showAiAssistant);
                                    } else {
                                        setSnackbarMessage("Please select a product/feature first to use the AI Assistant.");
                                        setSnackbarSeverity('info');
                                        setSnackbarOpen(true);
                                    }
                                }}
                            >
                                AI Assistant
                            </Button>
                        </Box>
                    </Paper>

                    {/* Kanban Board Tabs Container */}
                    <Paper
                        elevation={1}
                        sx={{
                            backgroundColor: '#fff',
                            borderRadius: '1rem',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                            display: 'flex',
                            flexDirection: 'column',
                            flexGrow: 1, // Allow this container to grow
                            overflow: 'hidden' // Hide overflow from tabs themselves
                        }}
                    >
                        {selectedProduct === null ? (
                            <Box sx={{ 
                                display: 'flex', 
                                flexDirection: 'column', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                height: '100%', 
                                minHeight: '300px', 
                                p: 4,
                            }}>
                                <Box ref={lottieContainer} sx={{ width: '200px', height: '200px', marginBottom: 2 }}></Box>
                                <Typography variant="h6" sx={{ color: '#4f46e5', fontWeight: 'bold', textAlign: 'center' }}>
                                    Select a Product or Feature
                                </Typography>
                                <Typography variant="body1" sx={{ color: '#6b7280', textAlign: 'center', maxWidth: '400px' }}>
                                    Choose an item from the left sidebar to view its details and Kanban stages.
                                </Typography>
                            </Box>
                        ) : (
                            <>
                                <Tabs 
                                    value={selectedKanbanTab} 
                                    onChange={(event, newValue) => setSelectedKanbanTab(newValue)} 
                                    aria-label="Kanban stages tabs"
                                    variant="scrollable" // Make tabs scrollable if many stages
                                    scrollButtons="auto"
                                    sx={{
                                        borderBottom: 1,
                                        borderColor: 'divider',
                                        '& .MuiTabs-indicator': { backgroundColor: '#4f46e5' }, // Indicator color
                                    }}
                                >
                                    {kanbanStages.map((stage, index) => (
                                        <Tab 
                                            key={stage} 
                                            label={stage} 
                                            id={`kanban-tab-${index}`} 
                                            aria-controls={`kanban-tabpanel-${index}`}
                                            sx={{
                                                textTransform: 'none',
                                                fontWeight: 'bold',
                                                color: getTabColor(stage), // Dynamic color based on stage status
                                                '&.Mui-selected': {
                                                    color: '#4f46e5', // Selected tab color
                                                },
                                                '&:hover': {
                                                    backgroundColor: '#eef2ff',
                                                },
                                                borderRadius: '0.5rem 0.5rem 0 0', // Rounded top corners
                                                minHeight: '48px', // Standard tab height
                                            }}
                                        />
                                    ))}
                                </Tabs>

                                {/* Tab Panels for each stage */}
                                {kanbanStages.map((stage, index) => (
                                    <TabPanel value={selectedKanbanTab} index={index} key={stage}>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, flexGrow: 1 }}>
                                            {/* AI Assistant section, now within the active tab */}
                                            {showAiAssistant && (
                                                <Paper
                                                    elevation={1}
                                                    sx={{
                                                        backgroundColor: '#f5f3ff',
                                                        p: 3,
                                                        borderRadius: '0.75rem',
                                                        border: '1px solid #d8b4fe',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: 2,
                                                    }}
                                                >
                                                    <Typography variant="h6" sx={{ fontWeight: 600, color: '#374151' }}>
                                                        AI Discovery Assistant for {stage}
                                                    </Typography>
                                                    <TextField
                                                        id={`discoveryInput-${stage}`}
                                                        placeholder="Enter details for AI generation..."
                                                        multiline
                                                        rows={6}
                                                        value={discoveryInput}
                                                        onChange={(e) => setDiscoveryInput(e.target.value)}
                                                        disabled={loading}
                                                        fullWidth
                                                        variant="outlined"
                                                        sx={{
                                                            '& .MuiOutlinedInput-root': { borderRadius: '0.5rem' },
                                                            '& .Mui-focused fieldset': { borderColor: '#9333ea', boxShadow: '0 0 0 2px rgba(147, 51, 234, 0.25)' },
                                                        }}
                                                    />
                                                    <Button
                                                        onClick={handleGenerateDocument}
                                                        variant="contained"
                                                        disabled={loading}
                                                        sx={{
                                                            backgroundColor: '#16a34a', '&:hover': { backgroundColor: '#15803d' },
                                                            color: '#fff', fontWeight: 600, borderRadius: '0.5rem', textTransform: 'none',
                                                        }}
                                                    >
                                                        {loading ? <CircularProgress size={20} color="inherit" /> : 'Generate Document'}
                                                    </Button>
                                                    {(generatedDocument || selectedProduct.discovery_document) && (
                                                        <Box sx={{ marginTop: 2 }}>
                                                            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#374151', marginBottom: 1 }}>
                                                                Generated Document:
                                                            </Typography>
                                                            <Paper elevation={0} sx={{ backgroundColor: '#f9fafb', p: 2, borderRadius: '0.5rem', border: '1px solid #e5e7eb', whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>
                                                                {generatedDocument || selectedProduct.discovery_document}
                                                            </Paper>
                                                        </Box>
                                                    )}
                                                </Paper>
                                            )}

                                            {/* Static tasks for the current stage (can be replaced with dynamic data) */}
                                            <Paper
                                                elevation={1}
                                                sx={{
                                                    backgroundColor: '#f5f3ff', // Light purple background
                                                    p: 3,
                                                    borderRadius: '0.75rem',
                                                    border: '1px solid #d8b4fe',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: 1,
                                                    flexGrow: 1, // Allow this paper to grow
                                                }}
                                            >
                                                <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#4f46e5', marginBottom: 1 }}>
                                                    Tasks for {stage}
                                                </Typography>
                                                {/* Example static tasks - these would ideally come from DB */}
                                                {stage === 'Research' && (
                                                    <>
                                                        <Typography variant="body2" sx={{ color: '#374151' }}>Market analysis completed <Box component="span" sx={{ color: '#16a34a', display: 'inline-flex', alignItems: 'center' }}><CheckCircle size={14} style={{ marginLeft: '0.25rem' }} /></Box></Typography>
                                                        <Typography variant="body2" sx={{ color: '#374151' }}>Competitor analysis <Box component="span" sx={{ color: '#16a34a', display: 'inline-flex', alignItems: 'center' }}><CheckCircle size={14} style={{ marginLeft: '0.25rem' }} /></Box></Typography>
                                                    </>
                                                )}
                                                {stage === 'Ideation' && (
                                                    <>
                                                        <Typography variant="body2" sx={{ color: '#374151' }}>Plan logic and expectations <Box component="span" sx={{ color: '#fde047', display: 'inline-flex', alignItems: 'center' }}><CircularProgress size={14} sx={{ marginLeft: '0.25rem', color: '#fde047' }} /></Box></Typography>
                                                    </>
                                                )}
                                                {stage === 'Design' && (
                                                    <>
                                                        <Typography variant="body2" sx={{ color: '#374151' }}>PRD handover to design team <Box component="span" sx={{ color: '#ef4444', display: 'inline-flex', alignItems: 'center' }}><Alert severity="warning" icon={false} sx={{ padding: '0px 4px', minHeight: 'auto', '.MuiAlert-message': { padding: 0 } }}>Pending</Alert></Box></Typography>
                                                    </>
                                                )}
                                                {stage === 'Planning' && (
                                                    <>
                                                        <Typography variant="body2" sx={{ color: '#374151' }}>Timeline planning <Box component="span" sx={{ color: '#ef4444', display: 'inline-flex', alignItems: 'center' }}><Alert severity="warning" icon={false} sx={{ padding: '0px 4px', minHeight: 'auto', '.MuiAlert-message': { padding: 0 } }}>Pending</Alert></Box></Typography>
                                                    </>
                                                )}
                                                {stage === 'Development' && (
                                                    <>
                                                        <Typography variant="body2" sx={{ color: '#374151' }}>Frontend development <Box component="span" sx={{ color: '#ef4444', display: 'inline-flex', alignItems: 'center' }}><Alert severity="warning" icon={false} sx={{ padding: '0px 4px', minHeight: 'auto', '.MuiAlert-message': { padding: 0 } }}>Pending</Alert></Box></Typography>
                                                        <Typography variant="body2" sx={{ color: '#374151' }}>Backend API integration <Box component="span" sx={{ color: '#ef4444', display: 'inline-flex', alignItems: 'center' }}><Alert severity="warning" icon={false} sx={{ padding: '0px 4px', minHeight: 'auto', '.MuiAlert-message': { padding: 0 } }}>Pending</Alert></Box></Typography>
                                                    </>
                                                )}
                                                {stage === 'Documentation' && (
                                                    <>
                                                        <Typography variant="body2" sx={{ color: '#374151' }}>Tech documentation handover <Box component="span" sx={{ color: '#ef4444', display: 'inline-flex', alignItems: 'center' }}><Alert severity="warning" icon={false} sx={{ padding: '0px 4px', minHeight: 'auto', '.MuiAlert-message': { padding: 0 } }}>Pending</Alert></Box></Typography>
                                                    </>
                                                )}
                                                <Button 
                                                    variant="outlined" 
                                                    startIcon={<Plus size={16} />} 
                                                    sx={{ 
                                                        marginTop: 'auto', 
                                                        textTransform: 'none', 
                                                        color: '#4f46e5', 
                                                        borderColor: '#d8b4fe', 
                                                        '&:hover': { borderColor: '#9333ea', backgroundColor: '#f0eaff' } 
                                                    }}
                                                    onClick={() => {
                                                        if (selectedProduct) {
                                                            const newProgress = stageProgressMap[stage];
                                                            updateProductStageAndProgress(selectedProduct.id, stage, newProgress);
                                                        } else {
                                                            setSnackbarMessage("Please select a product/feature first to add tasks or set stage.");
                                                            setSnackbarSeverity('info');
                                                            setSnackbarOpen(true);
                                                        }
                                                    }}
                                                >
                                                    Add Task / Set Stage
                                                </Button>
                                            </Box>
                                        </TabPanel>
                                    ))}
                                </>
                            )}
                    </Paper>
                </Box>
            </Box>

            {/* Add Product Modal */}
            <Dialog open={showAddProductModal} onClose={() => setShowAddProductModal(false)} PaperProps={{ sx: { borderRadius: '1rem' } }}>
                <DialogTitle sx={{ fontWeight: 'bold', color: '#1f2937' }}>Add New Product/Feature</DialogTitle>
                <DialogContent dividers>
                    <TextField
                        autoFocus
                        margin="dense"
                        id="product-name"
                        label="Product/Feature Name"
                        type="text"
                        fullWidth
                        variant="outlined"
                        value={newProductName}
                        onChange={(e) => setNewProductName(e.target.value)}
                        sx={{ marginBottom: 2 }}
                    />
                    <TextField
                        margin="dense"
                        id="product-description"
                        label="Brief Description (Optional)"
                        type="text"
                        fullWidth
                        multiline
                        rows={4}
                        variant="outlined"
                        value={newProductDescription}
                        onChange={(e) => setNewProductDescription(e.target.value)}
                    />
                </DialogContent>
                <DialogActions sx={{ padding: 2, justifyContent: 'space-between' }}>
                    <Button 
                        onClick={() => setShowAddProductModal(false)} 
                        sx={{ 
                            textTransform: 'none', 
                            color: '#6b7280', 
                            borderRadius: '0.5rem', 
                            '&:hover': { backgroundColor: '#f3f4f6' } 
                        }}
                    >
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleAddProduct} 
                        variant="contained" 
                        disabled={loading || !newProductName.trim()}
                        sx={{ 
                            textTransform: 'none', 
                            backgroundColor: '#4f46e5', 
                            color: '#fff', 
                            borderRadius: '0.5rem',
                            '&:hover': { backgroundColor: '#4338ca' },
                            '&:disabled': { opacity: 0.5, color: '#fff' }
                        }}
                    >
                        Add Product
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation Modal */}
            <Dialog
                open={showDeleteConfirmModal}
                onClose={() => setShowDeleteConfirmModal(false)}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
                PaperProps={{ sx: { borderRadius: '1rem' } }}
            >
                <DialogTitle id="alert-dialog-title" sx={{ fontWeight: 'bold', color: '#ef4444' }}>
                    {"Confirm Deletion"}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="alert-dialog-description" sx={{ color: '#4b5563' }}>
                        Are you sure you want to delete this product/feature? This action cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ padding: 2, justifyContent: 'space-between' }}>
                    <Button 
                        onClick={() => setShowDeleteConfirmModal(false)} 
                        sx={{ 
                            textTransform: 'none', 
                            color: '#6b7280', 
                            borderRadius: '0.5rem', 
                            '&:hover': { backgroundColor: '#f3f4f6' } 
                        }}
                    >
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleDeleteProduct} 
                        variant="contained" 
                        color="error" 
                        autoFocus
                        disabled={loading}
                        sx={{ 
                            textTransform: 'none', 
                            backgroundColor: '#ef4444', 
                            color: '#fff', 
                            borderRadius: '0.5rem',
                            '&:hover': { backgroundColor: '#dc2626' },
                            '&:disabled': { opacity: 0.5, color: '#fff' }
                        }}
                    >
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleSnackbarClose}>
                <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </Box>
    );
}

export default App;