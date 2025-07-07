import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
    Dialog, 
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Select, 
    MenuItem, 
    FormControl, 
    InputLabel, 
    Tabs, 
    Tab, 
    Menu, 
    Collapse 
} from '@mui/material';

// Importing Lucide icons
import { 
    Eye, EyeOff, ArrowRight, Sparkles, Zap, Users, BarChart3, Trash2, Plus, 
    Archive, ArchiveRestore, MessageSquare, CheckCircle, Search, User, Settings, 
    LogOut, ChevronDown, ChevronUp, ArrowLeft, Mic, Send, Edit, Save, X, PlusCircle
} from 'lucide-react'; 

// Define the API URL for your backend.
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Define keyframes for the pulse animation (from previous version)
const pulseAnimation = `
    @keyframes pulse-initial {
        0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(79, 70, 229, 0.7); }
        70% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(79, 70, 229, 0); }
        100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(79, 70, 229, 0); }
    }
`;

// Define the progress percentages for each tab
const TAB_PROGRESS_PERCENTAGES = {
    'Research': 20,
    'PRD': 10,
    'Design': 15,
    'Development': 30,
    'Tech Documentation': 10,
    'Launch and Training': 15,
    'Feedback': 0, // Feedback, Tasks, Repo, Important Notes don't contribute to core progress
    'Tasks': 0,
    'Repo': 0,
    'Important Notes': 0,
};

// Define the order of tabs for display
const PRODUCT_TABS_ORDER = [
    'Research', 'PRD', 'Design', 'Development', 'Tech Documentation',
    'Launch and Training', 'Feedback', 'Tasks', 'Repo', 'Important Notes'
];

// --- Editor.js Wrapper Component ---
// This component dynamically loads Editor.js and initializes it.
// It takes initialData (JSON) and onChange callback.
const Editor = ({ initialData, onChange, holder, readOnly = false, onReadyCallback = () => {} }) => {
    const editorInstance = useRef(null);
    const editorHolderId = useMemo(() => holder || `editor-js-holder-${Math.random().toString(36).substring(7)}`, [holder]);

    useEffect(() => {
        // Ensure Editor.js is loaded before initializing
        if (window.EditorJS) {
            if (editorInstance.current) {
                editorInstance.current.destroy(); // Destroy existing instance if it exists
            }

            editorInstance.current = new window.EditorJS({
                holder: editorHolderId,
                data: initialData || { blocks: [] },
                readOnly: readOnly,
                tools: {
                    header: {
                        class: window.Header,
                        inlineToolbar: true,
                    },
                    paragraph: {
                        class: window.Paragraph,
                        inlineToolbar: true,
                    },
                    list: {
                        class: window.List,
                        inlineToolbar: true,
                    },
                    code: window.CodeTool,
                    table: window.Table,
                    quote: {
                        class: window.Quote,
                        inlineToolbar: true,
                        shortcut: 'CMD+SHIFT+O',
                        config: {
                            quotePlaceholder: 'Enter quote',
                            captionPlaceholder: 'Quote\'s author',
                        },
                    },
                    raw: window.RawTool,
                    image: {
                        class: window.ImageTool,
                        config: {
                            uploader: {
                                uploadByFile(file) {
                                    // This is a placeholder. In a real app, you'd upload the file
                                    // to cloud storage (e.g., S3, GCS) and return its URL.
                                    // For now, it will just show a placeholder image.
                                    return new Promise(resolve => {
                                        const reader = new FileReader();
                                        reader.onloadend = () => {
                                            resolve({
                                                success: 1,
                                                file: {
                                                    url: `https://placehold.co/600x400/FF0000/FFFFFF?text=Image+Placeholder`, // Placeholder image
                                                    // Add more properties if needed, e.g., width, height
                                                }
                                            });
                                        };
                                        reader.readAsDataURL(file);
                                    });
                                },
                            }
                        }
                    },
                    marker: window.Marker,
                    warning: window.Warning,
                    delimiter: window.Delimiter,
                    inlineCode: window.InlineCode,
                    link: window.LinkTool,
                    embed: window.Embed,
                    // Add other tools as needed
                },
                onChange: async () => {
                    if (onChange) {
                        const savedData = await editorInstance.current.save();
                        onChange(savedData);
                    }
                },
                onReady: () => {
                    onReadyCallback();
                }
            });
        }

        return () => {
            if (editorInstance.current && editorInstance.current.destroy) {
                editorInstance.current.destroy();
                editorInstance.current = null;
            }
        };
    }, [editorHolderId, initialData, onChange, readOnly, onReadyCallback]);

    return <Box id={editorHolderId} sx={{ border: '1px solid #e0e7ff', borderRadius: '0.5rem', minHeight: '200px', padding: 2, backgroundColor: '#f9fafb' }} />;
};


// --- AuthPage Component ---
function AuthPage({ setIsLoggedIn, setAuthMessage, setUserName: setAppUserName, setUserTimezone: setAppUserTimezone }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState(''); 
    const [username, setUsername] = useState(''); 
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
            if (!username.trim()) { 
                setAuthError("Username is required for signup.");
                setSnackbarMessage("Username is required for signup.");
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
                setAppUserName(response.data.username || 'User Name');
                setAppUserTimezone(response.data.timezone || 'UTC+05:30 (Chennai)'); 
                setIsLoggedIn(true);
                setAuthMessage(response.data.message); 
            } else {
                response = await axios.post(`${API_URL}/api/signup`, { email, password, username }); 
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

                        {/* Username Input (only for signup mode) */}
                        {!isLoginMode && (
                            <TextField
                                label="Your Name"
                                id="username"
                                type="text"
                                placeholder="e.g., Sandeep"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
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
                        )}

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
                                    setUsername(''); 
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

// --- SettingsPage Component ---
function SettingsPage({ 
    setCurrentPage, 
    userName, 
    setUserName, 
    userTimezone, 
    setUserTimezone, 
    handleSaveSettings,
    setSnackbarMessage,
    setSnackbarSeverity,
    setSnackbarOpen
}) {
    const timezones = [
        "UTC-12:00 (Baker Island)", "UTC-11:00 (Niue)", "UTC-10:00 (Hawaii)", "UTC-09:00 (Alaska)",
        "UTC-08:00 (Pacific Time)", "UTC-07:00 (Mountain Time)", "UTC-06:00 (Central Time)",
        "UTC-05:00 (Eastern Time)", "UTC-04:00 (Atlantic Time)", "UTC-03:00 (Buenos Aires)",
        "UTC-02:00 (Fernando de Noronha)", "UTC-01:00 (Azores)", "UTC+00:00 (London)",
        "UTC+01:00 (Berlin)", "UTC+02:00 (Athens)", "UTC+03:00 (Moscow)", "UTC+03:30 (Tehran)",
        "UTC+04:00 (Dubai)", "UTC+04:30 (Kabul)", "UTC+05:00 (Karachi)", "UTC+05:30 (Chennai)",
        "UTC+05:45 (Kathmandu)", "UTC+06:00 (Dhaka)", "UTC+06:30 (Yangon)", "UTC+07:00 (Bangkok)",
        "UTC+08:00 (Beijing)", "UTC+08:45 (Eucla)", "UTC+09:00 (Tokyo)", "UTC+09:30 (Adelaide)",
        "UTC+10:00 (Sydney)", "UTC+10:30 (Lord Howe Island)", "UTC+11:00 (Solomon Islands)",
        "UTC+12:00 (Fiji)", "UTC+12:45 (Chatham Islands)", "UTC+13:00 (Tonga)", "UTC+14:00 (Kiritimati)"
    ];

    const displayProfileInitial = useMemo(() => {
        return userName ? userName.charAt(0).toUpperCase() : 'U';
    }, [userName]);

    return (
        <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            height: '100vh', 
            fontFamily: 'Inter, sans-serif', 
            background: 'linear-gradient(to bottom right, #f9fafb, #e5e7eb)',
            p: 3,
            overflowY: 'auto' 
        }}>
            <Paper
                elevation={3}
                sx={{
                    maxWidth: '800px',
                    margin: 'auto',
                    p: { xs: 3, sm: 5 },
                    borderRadius: '1rem',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                    backgroundColor: '#fff',
                    width: '100%',
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                    <IconButton onClick={() => setCurrentPage('dashboard')} sx={{ marginRight: 2, color: '#4f46e5' }}>
                        <ArrowLeft size={24} />
                    </IconButton>
                    <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold', color: '#111827' }}>
                        Settings
                    </Typography>
                </Box>

                <Box sx={{ marginBottom: 4 }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#374151', marginBottom: 2 }}>
                        Profile Settings
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 3 }}>
                        <Box
                            sx={{
                                width: 100,
                                height: 100,
                                borderRadius: '50%',
                                backgroundColor: '#e0e7ff', 
                                color: '#4f46e5', 
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '3rem',
                                fontWeight: 'bold',
                                border: '3px solid #4f46e5',
                                marginBottom: 1,
                                transition: 'transform 0.2s',
                                animation: 'pulse-initial 2s infinite', 
                                '&:hover': { transform: 'scale(1.05)' }
                            }}
                        >
                            {displayProfileInitial}
                        </Box>
                        <Typography variant="body2" sx={{ color: '#6b7280', fontSize: '0.875rem' }}>Your profile initial</Typography>
                    </Box>
                    <TextField
                        margin="normal"
                        id="user-name"
                        label="Your Name"
                        type="text"
                        fullWidth
                        variant="outlined"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        sx={{ marginBottom: 2 }}
                    />
                    <FormControl fullWidth margin="normal">
                        <InputLabel id="timezone-select-label">Timezone</InputLabel>
                        <Select
                            labelId="timezone-select-label"
                            id="user-timezone"
                            value={userTimezone}
                            label="Timezone"
                            onChange={(e) => setUserTimezone(e.target.value)}
                        >
                            {timezones.map((tz) => (
                                <MenuItem key={tz} value={tz}>{tz}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>

                <Box sx={{ textAlign: 'right', marginTop: 4 }}>
                    <Button 
                        onClick={handleSaveSettings} 
                        variant="contained" 
                        sx={{ 
                            textTransform: 'none', 
                            backgroundColor: '#4f46e5', 
                            color: '#fff', 
                            borderRadius: '0.5rem',
                            padding: '0.75rem 1.5rem',
                            '&:hover': { backgroundColor: '#4338ca' }
                        }}
                    >
                        Save Changes
                    </Button>
                </Box>
            </Paper>
        </Box>
    );
}

// --- Main App Component ---
function App() {
    const [products, setProducts] = useState([]); 
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [newProductName, setNewProductName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('success');

    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [authMessage, setAuthMessage] = useState(''); 

    // State for new product modal
    const [showAddProductModal, setShowAddProductModal] = useState(false);
    const [newProductStatus, setNewProductStatus] = useState('Active'); // Default status
    const [newProductParentId, setNewProductParentId] = useState(''); // For iteration items

    // State for delete confirmation modal
    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [productToDeleteId, setProductToDeleteId] = useState(null);

    // State for search and sort/filter
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('newest'); 
    const [filterByStatus, setFilterByStatus] = useState('All'); // Filter by overall product status

    // State for Profile Menu
    const [anchorElProfileMenu, setAnchorElProfileMenu] = useState(null);
    const openProfileMenu = Boolean(anchorElProfileMenu);

    // State for Settings Page navigation
    const [currentPage, setCurrentPage] = useState('dashboard'); 

    const [userName, setUserName] = useState('User'); 
    const [userTimezone, setUserTimezone] = useState('UTC+05:30 (Chennai)'); 

    const [quoteOfTheDay, setQuoteOfTheDay] = useState('');
    const [quoteEmoji, setQuoteEmoji] = useState('💡'); 

    // AI Chat states for Research Tab
    const [researchChatHistory, setResearchChatHistory] = useState([]);
    const [currentResearchPrompt, setCurrentResearchPrompt] = useState('');
    const [isResearchAILoading, setIsResearchAILoading] = useState(false);
    const [researchDocumentData, setResearchDocumentData] = useState(null); // Editor.js JSON for research doc

    // AI Chat states for PRD Tab
    const [prdChatHistory, setPrdChatHistory] = useState([]);
    const [currentPrdPrompt, setCurrentPrdPrompt] = useState('');
    const [isPrdAILoading, setIsPrdAILoading] = useState(false);
    const [prdDocumentData, setPrdDocumentData] = useState(null); // Editor.js JSON for PRD

    // Customer Interview states
    const [showAddInterviewModal, setShowAddInterviewModal] = useState(false);
    const [newInterviewCustomerName, setNewInterviewCustomerName] = useState('');
    const [newInterviewCustomerEmail, setNewInterviewCustomerEmail] = useState('');
    const [newInterviewDate, setNewInterviewDate] = useState(new Date().toISOString().slice(0, 16)); // YYYY-MM-DDTHH:MM
    const [customerInterviews, setCustomerInterviews] = useState([]);
    const [selectedInterview, setSelectedInterview] = useState(null);
    const [interviewNotesData, setInterviewNotesData] = useState(null); // Editor.js JSON for interview notes
    const [interviewSummaryData, setInterviewSummaryData] = useState(null); // Editor.js JSON for AI summary

    // Interview Template states
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [templateName, setTemplateName] = useState('');
    const [templateQuestionsData, setTemplateQuestionsData] = useState(null); // Editor.js JSON for template questions
    const [interviewTemplates, setInterviewTemplates] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [isTemplateAILoading, setIsTemplateAILoading] = useState(false);

    // Current active tab for product details
    const [selectedProductTab, setSelectedProductTab] = useState(0); 

    // Array of quotes for Product Managers
    const productManagerQuotes = useMemo(() => [
        { quote: "The only way to do great work is to love what you do.", author: "Steve Jobs", emoji: "🍎" },
        { quote: "Your most unhappy customers are your greatest source of learning.", author: "Bill Gates", emoji: "📚" },
        { quote: "If you're not embarrassed by the first version of your product, you've launched too late.", author: "Reid Hoffman", emoji: "🚀" },
        { quote: "Design is not just what it looks like and feels like. Design is how it works.", author: "Steve Jobs", emoji: "🎨" },
        { quote: "The goal is to build a product that people use, not a product that people like.", author: "Marty Cagan", emoji: "🎯" },
        { quote: "Innovation is saying no to a thousand things.", author: "Steve Jobs", emoji: "💡" },
        { quote: "Good product managers are the CEOs of their products.", author: "Ben Horowitz", emoji: "👑" },
        { quote: "The best products are built by teams who are obsessed with their customers.", author: "Jeff Bezos", emoji: "🤝" },
        { quote: "You can't just ask customers what they want and then try to give that to them. By the time you get it built, they'll want something new.", author: "Steve Jobs", emoji: "🔮" },
        { quote: "Focus on the user and all else will follow.", author: "Google's Ten Things We Know to Be True", emoji: "🔍" }
    ], []);

    // Effect to set the quote of the day
    useEffect(() => {
        const today = new Date();
        const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
        const quoteData = productManagerQuotes[dayOfYear % productManagerQuotes.length];
        setQuoteOfTheDay(quoteData.quote + " – " + quoteData.author);
        setQuoteEmoji(quoteData.emoji);
    }, [productManagerQuotes]);

    // Lottie animation setup (empty state)
    const lottieContainer = useRef(null);
    const lottieInstance = useRef(null);
    useEffect(() => {
        if (lottieContainer.current && !selectedProduct) {
            if (window.lottie) {
                if (lottieInstance.current) {
                    lottieInstance.current.destroy(); 
                }
                lottieInstance.current = window.lottie.loadAnimation({
                    container: lottieContainer.current,
                    renderer: 'svg',
                    loop: true,
                    autoplay: true,
                    animationData: {
                        "v": "5.7.4", "fr": 60, "ip": 0, "op": 120, "wh": 100, "ht": 100, "nm": "Empty State", "ddd": 0, "assets": [],
                        "layers": [
                            { "ddd": 0, "ind": 1, "ty": 4, "nm": "Folder", "sr": 1, "ks": { "o": { "a": 0, "k": 100, "ix": 11 }, "rp": { "a": 0, "k": 0, "ix": 12 }, "s": { "a": 0, "k": [100, 100, 100], "ix": 6 }, "r": { "a": 0, "k": 0, "ix": 10 }, "p": { "a": 0, "k": [50, 50, 0], "ix": 2 }, "a": { "a": 0, "k": [50, 50, 0], "ix": 1 } }, "ao": 0, "shapes": [{ "ty": "gr", "it": [{ "ind": 0, "ty": "sh", "ix": 1, "ks": { "k": { "i": [{ "x": 0.833, "y": 0.833 }, { "x": 0.833, "y": 0.833 }, { "x": 0.833, "y": 0.833 }, { "x": 0.833, "y": 0.833 }], "o": [{ "x": 0.167, "y": 0.167 }, { "x": 0.167, "y": 0.167 }, { "x": 0.167, "y": 0.167 }, { "x": 0.167, "y": 0.167 }], "v": [[30, 80], [70, 80], [70, 20], [30, 20]] }, "ix": 2 }, "nm": "Rectangle Path", "mn": "ADBE Vector Shape - Group", "hd": false }, { "ty": "fl", "c": { "a": 0, "k": [0.8, 0.8, 0.8, 1], "ix": 3 }, "o": { "a": 0, "k": 100, "ix": 4 }, "r": 1, "nm": "Fill 1", "mn": "ADBE Vector Fill", "hd": false }, { "ty": "st", "c": { "a": 0, "k": [0.5, 0.5, 0.5, 1], "ix": 5 }, "o": { "a": 0, "k": 100, "ix": 6 }, "w": { "a": 0, "k": 2, "ix": 7 }, "lc": 1, "lj": 1, "ml": 4, "nm": "Stroke 1", "mn": "ADBE Vector Stroke", "hd": false }], "nm": "Rectangle 1", "mn": "ADBE Vector Group", "hd": false }, { "ty": "gr", "it": [{ "ind": 0, "ty": "sh", "ix": 1, "ks": { "k": { "i": [{ "x": 0.833, "y": 0.833 }, { "x": 0.833, "y": 0.833 }, { "x": 0.833, "y": 0.833 }, { "x": 0.833, "y": 0.833 }], "o": [{ "x": 0.167, "y": 0.167 }, { "x": 0.167, "y": 0.167 }, { "x": 0.167, "y": 0.167 }, { "x": 0.167, "y": 0.167 }], "v": [[30, 80], [70, 80], [70, 20], [30, 20]] }, "ix": 2 }, "nm": "Rectangle Path", "mn": "ADBE Vector Shape - Group", "hd": false }, { "ty": "fl", "c": { "a": 0, "k": [0.9, 0.9, 0.9, 1], "ix": 3 }, "o": { "a": 0, "k": 100, "ix": 4 }, "r": 1, "nm": "Fill 1", "mn": "ADBE Vector Fill", "hd": false }, { "ty": "st", "c": { "a": 0, "k": [0.6, 0.6, 0.6, 1], "ix": 5 }, "o": { "a": 0, "k": 100, "ix": 6 }, "w": { "a": 0, "k": 2, "ix": 7 }, "lc": 1, "lj": 1, "ml": 4, "nm": "Stroke 1", "mn": "ADBE Vector Stroke", "hd": false }], "nm": "Rectangle 2", "mn": "ADBE Vector Group", "hd": false, "tf": true }, { "ty": "gr", "it": [{ "ind": 0, "ty": "sh", "ix": 1, "ks": { "k": { "i": [{ "x": 0.833, "y": 0.833 }, { "x": 0.833, "y": 0.833 }, { "x": 0.833, "y": 0.833 }, { "x": 0.833, "y": 0.833 }], "o": [{ "x": 0.167, "y": 0.167 }, { "x": 0.167, "y": 0.167 }, { "x": 0.167, "y": 0.167 }, { "x": 0.167, "y": 0.167 }], "v": [[30, 80], [70, 80], [70, 20], [30, 20]] }, "ix": 2 }, "nm": "Rectangle Path", "mn": "ADBE Vector Shape - Group", "hd": false }, { "ty": "fl", "c": { "a": 0, "k": [1, 1, 1, 1], "ix": 3 }, "o": { "a": 0, "k": 100, "ix": 4 }, "r": 1, "nm": "Fill 1", "mn": "ADBE Vector Fill", "hd": false }, { "ty": "st", "c": { "a": 0, "k": [0.7, 0.7, 0.7, 1], "ix": 5 }, "o": { "a": 0, "k": 100, "ix": 6 }, "w": { "a": 0, "k": 2, "ix": 7 }, "lc": 1, "lj": 1, "ml": 4, "nm": "Stroke 1", "mn": "ADBE Vector Stroke", "hd": false }], "nm": "Rectangle 3", "mn": "ADBE Vector Group", "hd": false, "tf": true }], "ip": 0, "op": 120, "st": 0, "bm": 0 }, { "ddd": 0, "ind": 2, "ty": 4, "nm": "Magnifying Glass", "sr": 1, "ks": { "o": { "a": 0, "k": 100, "ix": 11 }, "rp": { "a": 0, "k": 0, "ix": 12 }, "s": { "a": 0, "k": [100, 100, 100], "ix": 6 }, "r": { "a": 0, "k": 0, "ix": 10 }, "p": { "a": 0, "k": [50, 50, 0], "ix": 2 }, "a": { "a": 0, "k": [50, 50, 0], "ix": 1 } }, "ao": 0, "shapes": [{ "ty": "gr", "it": [{ "ind": 0, "ty": "sh", "ix": 1, "ks": { "k": { "i": [{ "x": 0.833, "y": 0.833 }, { "x": 0.833, "y": 0.833 }, { "x": 0.833, "y": 0.833 }, { "x": 0.833, "y": 0.833 }], "o": [{ "x": 0.167, "y": 0.167 }, { "x": 0.167, "y": 0.167 }, { "x": 0.167, "y": 0.167 }, { "x": 0.167, "y": 0.167 }], "v": [[30, 80], [70, 80], [70, 20], [30, 20]] }, "ix": 2 }, "nm": "Rectangle Path", "mn": "ADBE Vector Shape - Group", "hd": false }, { "ty": "st", "c": { "a": 0, "k": [0.2, 0.2, 0.2, 1], "ix": 3 }, "o": { "a": 0, "k": 100, "ix": 4 }, "w": { "a": 0, "k": 2, "ix": 5 }, "lc": 1, "lj": 1, "ml": 4, "nm": "Stroke 1", "mn": "ADBE Vector Stroke", "hd": false }], "nm": "Ellipse 1", "mn": "ADBE Vector Group", "hd": false }], "ip": 0, "op": 120, "st": 0, "bm": 0 } ]
                    }
                });
            }
        }
    }, [selectedProduct]); 

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
            const fetchUserProfile = async () => {
                try {
                    const response = await axios.get(`${API_URL}/api/user/profile`, {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    });
                    setUserName(response.data.username || 'User');
                    setUserTimezone(response.data.timezone || 'UTC+05:30 (Chennai)');
                } catch (err) {
                    console.error("Error fetching user profile:", err);
                    setSnackbarMessage("Failed to load user profile. Please try logging in again.");
                    setSnackbarSeverity('error');
                    setSnackbarOpen(true);
                    handleLogout(); 
                }
            };
            fetchUserProfile();
        }
    }, [isLoggedIn]); 

    // Function to calculate product progress based on tab statuses
    const calculateProductProgress = useCallback((product) => {
        let totalWeightedProgress = 0;
        let totalWeight = 0;

        PRODUCT_TABS_ORDER.forEach(tabName => {
            const statusKey = `${tabName.toLowerCase().replace(/ /g, '_')}_status`; // e.g., 'research_status'
            const status = product[statusKey];
            const weight = TAB_PROGRESS_PERCENTAGES[tabName] || 0; // Get defined percentage, default to 0

            totalWeight += weight;

            if (status === 'Completed' || status === 'Skipped') {
                totalWeightedProgress += weight;
            } else if (status === 'In Progress') {
                // For 'In Progress', contribute half of its weight as a heuristic
                totalWeightedProgress += weight / 2; 
            }
        });

        if (totalWeight === 0) return 0;
        return Math.round((totalWeightedProgress / totalWeight) * 100);
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
                        Authorization: `Bearer ${token}` 
                    }
                });
                // Calculate progress for each product after fetching
                const productsWithProgress = response.data.map(p => ({
                    ...p,
                    progress: calculateProductProgress(p) // Update progress based on new logic
                }));
                setProducts(productsWithProgress);
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
    }, [isLoggedIn, calculateProductProgress]);

    // Filter and Sort Logic
    const filteredAndSortedProducts = useMemo(() => {
        let currentProducts = products;

        // Apply status filter
        if (filterByStatus !== 'All') {
            currentProducts = currentProducts.filter(p => p.status === filterByStatus);
        }

        // Apply search filter
        if (searchTerm) {
            currentProducts = currentProducts.filter(p => 
                p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (p.research_document_json && p.research_document_json.toLowerCase().includes(searchTerm.toLowerCase())) // Search in research doc
            );
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
    }, [products, searchTerm, sortBy, filterByStatus]);

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
            const newProductData = {
                name: newProductName,
                status: newProductStatus,
                parent_id: newProductParentId || null, // Ensure null if empty
                is_archived: false,
                progress: 0, 
                // Initialize all tab statuses
                research_status: 'Not Started',
                prd_status: 'Not Started',
                design_status: 'Not Started',
                development_status: 'Not Started',
                tech_doc_status: 'Not Started',
                launch_training_status: 'Not Started',
                // No initial JSON content for documents
            };

            const response = await axios.post(`${API_URL}/api/products`, newProductData, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            // Recalculate progress for the new product
            const productWithProgress = {
                ...response.data,
                progress: calculateProductProgress(response.data)
            };
            setProducts([productWithProgress, ...products]); 
            setNewProductName('');
            setNewProductStatus('Active');
            setNewProductParentId('');
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

    const handleSelectProduct = useCallback(async (product) => {
        setLoading(true);
        try {
            // Fetch the full product details again to ensure latest data
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}/api/products/${product.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const fullProduct = response.data;

            setSelectedProduct(fullProduct);
            setSelectedProductTab(0); // Default to the first tab (Research)

            // Set initial data for Editor.js instances
            try {
                setResearchDocumentData(fullProduct.research_document_json ? JSON.parse(fullProduct.research_document_json) : { blocks: [] });
                setPrdDocumentData(fullProduct.prd_document_json ? JSON.parse(fullProduct.prd_document_json) : { blocks: [] });
                // Reset chat histories when selecting a new product
                setResearchChatHistory([]);
                setPrdChatHistory([]);
            } catch (e) {
                console.error("Error parsing JSON for Editor.js:", e);
                setSnackbarMessage("Error loading document content. It might be malformed.");
                setSnackbarSeverity('error');
                setSnackbarOpen(true);
                setResearchDocumentData({ blocks: [] });
                setPrdDocumentData({ blocks: [] });
            }

            // Fetch customer interviews for the selected product
            const interviewsResponse = await axios.get(`${API_URL}/api/customer_interviews/product/${product.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCustomerInterviews(interviewsResponse.data);
            setSelectedInterview(null); // Clear selected interview when changing product

        } catch (err) {
            console.error("Error selecting product or fetching its details:", err);
            const errorMessage = err.response && err.response.data && err.response.data.message 
                                ? err.response.data.message 
                                : "Failed to load product details. Please try again.";
            setError(errorMessage);
            setSnackbarMessage(errorMessage);
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
            setSelectedProduct(null); // Clear selected product on error
        } finally {
            setLoading(false);
        }
    }, [calculateProductProgress]);

    const handleUpdateProduct = async (productId, updateData) => {
        setLoading(true);
        setError(null);
        setSnackbarOpen(false);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.put(`${API_URL}/api/products/${productId}`, updateData, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            // Update local state for products and selectedProduct
            const updatedProduct = {
                ...response.data,
                progress: calculateProductProgress(response.data)
            };
            setProducts(products.map(p =>
                p.id === productId ? updatedProduct : p
            ));
            setSelectedProduct(updatedProduct); // Update selected product with latest data
            setSnackbarMessage("Product updated successfully!");
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
        } catch (err) {
            console.error("Error updating product:", err);
            const errorMessage = err.response && err.response.data && err.response.data.message 
                                ? err.response.data.message 
                                : "Failed to update product. Please try again.";
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
                setResearchDocumentData(null);
                setPrdDocumentData(null);
                setResearchChatHistory([]);
                setPrdChatHistory([]);
                setCustomerInterviews([]);
                setSelectedInterview(null);
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

    const handleLogout = () => {
        localStorage.removeItem('token');
        setIsLoggedIn(false);
        setProducts([]);
        setSelectedProduct(null);
        setResearchDocumentData(null);
        setPrdDocumentData(null);
        setResearchChatHistory([]);
        setPrdChatHistory([]);
        setCustomerInterviews([]);
        setSelectedInterview(null);
        setAuthMessage('You have been logged out.');
        setSnackbarMessage('You have been logged out.');
        setSnackbarSeverity('info');
        setSnackbarOpen(true);
        setAnchorElProfileMenu(null); 
        setCurrentPage('dashboard'); 
        setUserName('User'); 
        setUserTimezone('UTC+05:30 (Chennai)'); 
    };

    // --- AI Chat Logic for Research Tab ---
    const handleResearchPromptSubmit = async (e) => {
        e.preventDefault();
        if (!currentResearchPrompt.trim()) return;
        if (!selectedProduct) {
            setSnackbarMessage("Please select a product to generate research document.");
            setSnackbarSeverity('warning');
            setSnackbarOpen(true);
            return;
        }

        setIsResearchAILoading(true);
        const userMessage = { role: 'user', content: currentResearchPrompt };
        const updatedChatHistory = [...researchChatHistory, userMessage];
        setResearchChatHistory(updatedChatHistory);
        setCurrentResearchPrompt('');

        try {
            const token = localStorage.getItem('token');
            // For MVP, we're sending the full prompt directly.
            // In a real conversational flow, you'd send the chat history to the backend
            // and the backend would manage the Gemini conversation.
            const response = await axios.post(`${API_URL}/api/generate-research-document`, {
                product_id: selectedProduct.id,
                prompt_text: currentResearchPrompt,
                // scraped_data: "Example scraped data from Octoparse/ScrapingBee..." // Integrate this in future
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const aiResponseText = response.data.research_document;
            const aiMessage = { role: 'ai', content: aiResponseText };
            setResearchChatHistory(prev => [...prev, aiMessage]);

            // Update the product's research document in local state and DB
            const researchDocJson = { blocks: [{ type: "paragraph", data: { text: aiResponseText } }] };
            setResearchDocumentData(researchDocJson);
            await handleUpdateProduct(selectedProduct.id, { 
                research_document_json: JSON.stringify(researchDocJson),
                research_status: 'Completed' // Mark as completed
            });
            setSnackbarMessage("Research document generated and saved!");
            setSnackbarSeverity('success');
            setSnackbarOpen(true);

        } catch (err) {
            console.error("Error generating research document:", err);
            const errorMessage = err.response && err.response.data && err.response.data.error 
                                ? err.response.data.error 
                                : "Failed to generate research document. Please try again.";
            setSnackbarMessage(errorMessage);
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
            setResearchChatHistory(prev => [...prev, { role: 'ai', content: `Error: ${errorMessage}` }]);
        } finally {
            setIsResearchAILoading(false);
        }
    };

    const handleResearchDocumentSave = useCallback(async (data) => {
        if (!selectedProduct) return;
        setLoading(true);
        try {
            await handleUpdateProduct(selectedProduct.id, { 
                research_document_json: JSON.stringify(data),
                research_status: 'Completed' // Mark as completed if manually edited/saved
            });
            setSnackbarMessage("Research document saved!");
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
        } catch (err) {
            setSnackbarMessage("Failed to save research document.");
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        } finally {
            setLoading(false);
        }
    }, [selectedProduct, handleUpdateProduct]);

    // --- AI Chat Logic for PRD Tab ---
    const handlePrdPromptSubmit = async (e) => {
        e.preventDefault();
        if (!currentPrdPrompt.trim()) return;
        if (!selectedProduct) {
            setSnackbarMessage("Please select a product to generate PRD.");
            setSnackbarSeverity('warning');
            setSnackbarOpen(true);
            return;
        }

        setIsPrdAILoading(true);
        const userMessage = { role: 'user', content: currentPrdPrompt };
        const updatedChatHistory = [...prdChatHistory, userMessage];
        setPrdChatHistory(updatedChatHistory);
        setCurrentPrdPrompt('');

        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(`${API_URL}/api/generate-prd-document`, {
                product_id: selectedProduct.id,
                user_requirements: currentPrdPrompt, // User's input for PRD
                prd_structure_confirmation: "Standard PRD structure with Problem, Goals, Audience, Features, Non-Functional, Metrics, Future.", // Hardcoded for MVP, could be AI-driven later
                research_data: selectedProduct.research_document_json || "" // Pass existing research data
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const aiResponseText = response.data.prd_document;
            const aiMessage = { role: 'ai', content: aiResponseText };
            setPrdChatHistory(prev => [...prev, aiMessage]);

            const prdDocJson = { blocks: [{ type: "paragraph", data: { text: aiResponseText } }] };
            setPrdDocumentData(prdDocJson);
            await handleUpdateProduct(selectedProduct.id, { 
                prd_document_json: JSON.stringify(prdDocJson),
                prd_status: 'Completed' // Mark as completed
            });
            setSnackbarMessage("PRD generated and saved!");
            setSnackbarSeverity('success');
            setSnackbarOpen(true);

        } catch (err) {
            console.error("Error generating PRD document:", err);
            const errorMessage = err.response && err.response.data && err.response.data.error 
                                ? err.response.data.error 
                                : "Failed to generate PRD. Please try again.";
            setSnackbarMessage(errorMessage);
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
            setPrdChatHistory(prev => [...prev, { role: 'ai', content: `Error: ${errorMessage}` }]);
        } finally {
            setIsPrdAILoading(false);
        }
    };

    const handlePrdDocumentSave = useCallback(async (data) => {
        if (!selectedProduct) return;
        setLoading(true);
        try {
            await handleUpdateProduct(selectedProduct.id, { 
                prd_document_json: JSON.stringify(data),
                prd_status: 'Completed' // Mark as completed if manually edited/saved
            });
            setSnackbarMessage("PRD document saved!");
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
        } catch (err) {
            setSnackbarMessage("Failed to save PRD document.");
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        } finally {
            setLoading(false);
        }
    }, [selectedProduct, handleUpdateProduct]);

    // --- Customer Interview Logic ---
    const handleAddCustomerInterview = async () => {
        if (!newInterviewCustomerName.trim()) {
            setSnackbarMessage("Customer name is required.");
            setSnackbarSeverity('warning');
            setSnackbarOpen(true);
            return;
        }
        if (!selectedProduct) {
            setSnackbarMessage("Please select a product first.");
            setSnackbarSeverity('warning');
            setSnackbarOpen(true);
            return;
        }

        setLoading(true);
        setShowAddInterviewModal(false);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(`${API_URL}/api/customer_interviews`, {
                product_id: selectedProduct.id,
                customer_name: newInterviewCustomerName,
                customer_email: newInterviewCustomerEmail,
                interview_date: newInterviewDate,
                interview_notes_json: JSON.stringify({ blocks: [{ type: "paragraph", data: { text: "Start typing interview notes here..." } }] }),
                ai_summary_json: null
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCustomerInterviews(prev => [response.data, ...prev]);
            setNewInterviewCustomerName('');
            setNewInterviewCustomerEmail('');
            setNewInterviewDate(new Date().toISOString().slice(0, 16));
            setSnackbarMessage("Customer interview added!");
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
        } catch (err) {
            console.error("Error adding customer interview:", err);
            setSnackbarMessage("Failed to add customer interview.");
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectInterview = async (interview) => {
        setSelectedInterview(interview);
        try {
            setInterviewNotesData(interview.interview_notes_json ? JSON.parse(interview.interview_notes_json) : { blocks: [] });
            setInterviewSummaryData(interview.ai_summary_json ? JSON.parse(interview.ai_summary_json) : { blocks: [] });
        } catch (e) {
            console.error("Error parsing interview notes/summary JSON:", e);
            setSnackbarMessage("Error loading interview content. It might be malformed.");
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
            setInterviewNotesData({ blocks: [] });
            setInterviewSummaryData({ blocks: [] });
        }
    };

    const handleSaveInterviewNotes = useCallback(async (data) => {
        if (!selectedInterview) return;
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.put(`${API_URL}/api/customer_interviews/${selectedInterview.id}`, {
                interview_notes_json: JSON.stringify(data)
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSelectedInterview(response.data); // Update selected interview with saved notes
            setCustomerInterviews(prev => prev.map(int => int.id === response.data.id ? response.data : int));
            setSnackbarMessage("Interview notes saved!");
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
        } catch (err) {
            setSnackbarMessage("Failed to save interview notes.");
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        } finally {
            setLoading(false);
        }
    }, [selectedInterview]);

    const handleGenerateInterviewSummary = async () => {
        if (!selectedInterview || !interviewNotesData || interviewNotesData.blocks.length === 0) {
            setSnackbarMessage("No interview notes to summarize.");
            setSnackbarSeverity('warning');
            setSnackbarOpen(true);
            return;
        }
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            // Convert Editor.js data to plain text for AI prompt
            const plainTextNotes = interviewNotesData.blocks.map(block => block.data.text || '').join('\n');

            const response = await axios.post(`${API_URL}/api/customer_interviews/generate_summary`, {
                interview_id: selectedInterview.id,
                notes_content: plainTextNotes
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const summaryText = response.data.ai_summary;
            const summaryJson = { blocks: [{ type: "paragraph", data: { text: summaryText } }] };
            setInterviewSummaryData(summaryJson);

            // Update the interview in the backend with the summary
            const updatedInterview = { ...selectedInterview, ai_summary_json: JSON.stringify(summaryJson) };
            setCustomerInterviews(prev => prev.map(int => int.id === updatedInterview.id ? updatedInterview : int));
            setSelectedInterview(updatedInterview);

            setSnackbarMessage("Interview summary generated and saved!");
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
        } catch (err) {
            console.error("Error generating interview summary:", err);
            setSnackbarMessage("Failed to generate interview summary.");
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteInterview = async (interviewId) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_URL}/api/customer_interviews/${interviewId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCustomerInterviews(prev => prev.filter(int => int.id !== interviewId));
            if (selectedInterview && selectedInterview.id === interviewId) {
                setSelectedInterview(null);
                setInterviewNotesData(null);
                setInterviewSummaryData(null);
            }
            setSnackbarMessage("Interview deleted!");
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
        } catch (err) {
            console.error("Error deleting interview:", err);
            setSnackbarMessage("Failed to delete interview.");
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        } finally {
            setLoading(false);
        }
    };

    // --- Interview Template Logic ---
    const fetchInterviewTemplates = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}/api/interview_templates`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setInterviewTemplates(response.data);
        } catch (err) {
            console.error("Error fetching templates:", err);
            setSnackbarMessage("Failed to load interview templates.");
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isLoggedIn) {
            fetchInterviewTemplates();
        }
    }, [isLoggedIn, fetchInterviewTemplates]);

    const handleCreateTemplate = async () => {
        if (!templateName.trim()) {
            setSnackbarMessage("Template name is required.");
            setSnackbarSeverity('warning');
            setSnackbarOpen(true);
            return;
        }
        setLoading(true);
        setShowTemplateModal(false);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(`${API_URL}/api/interview_templates`, {
                template_name: templateName,
                template_questions_json: templateQuestionsData ? JSON.stringify(templateQuestionsData) : null
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setInterviewTemplates(prev => [response.data, ...prev]);
            setTemplateName('');
            setTemplateQuestionsData(null);
            setSnackbarMessage("Template created!");
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
        } catch (err) {
            console.error("Error creating template:", err);
            setSnackbarMessage("Failed to create template.");
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectTemplate = (template) => {
        setSelectedTemplate(template);
        try {
            setTemplateQuestionsData(template.template_questions_json ? JSON.parse(template.template_questions_json) : { blocks: [] });
        } catch (e) {
            console.error("Error parsing template questions JSON:", e);
            setSnackbarMessage("Error loading template content. It might be malformed.");
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
            setTemplateQuestionsData({ blocks: [] });
        }
        setShowTemplateModal(true); // Open modal to edit selected template
    };

    const handleUpdateTemplate = async () => {
        if (!selectedTemplate) return;
        setLoading(true);
        setShowTemplateModal(false);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.put(`${API_URL}/api/interview_templates/${selectedTemplate.id}`, {
                template_name: templateName,
                template_questions_json: templateQuestionsData ? JSON.stringify(templateQuestionsData) : null
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setInterviewTemplates(prev => prev.map(t => t.id === response.data.id ? response.data : t));
            setSnackbarMessage("Template updated!");
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
        } catch (err) {
            console.error("Error updating template:", err);
            setSnackbarMessage("Failed to update template.");
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteTemplate = async (templateId) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_URL}/api/interview_templates/${templateId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setInterviewTemplates(prev => prev.filter(t => t.id !== templateId));
            if (selectedTemplate && selectedTemplate.id === templateId) {
                setSelectedTemplate(null);
                setTemplateName('');
                setTemplateQuestionsData(null);
            }
            setSnackbarMessage("Template deleted!");
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
        } catch (err) {
            console.error("Error deleting template:", err);
            setSnackbarMessage("Failed to delete template.");
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateTemplateQuestions = async (featureIdea, existingQuestions) => {
        setIsTemplateAILoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(`${API_URL}/api/interview_templates/generate_questions`, {
                feature_idea: featureIdea,
                existing_questions: existingQuestions
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const generatedText = response.data.generated_questions;
            setTemplateQuestionsData({ blocks: [{ type: "paragraph", data: { text: generatedText } }] });
            setSnackbarMessage("Questions generated!");
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
        } catch (err) {
            console.error("Error generating template questions:", err);
            setSnackbarMessage("Failed to generate questions.");
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        } finally {
            setIsTemplateAILoading(false);
        }
    };

    const handleProductStatusChange = async (productId, newStatus) => {
        setLoading(true);
        try {
            await handleUpdateProduct(productId, { status: newStatus });
            setSnackbarMessage(`Product status updated to ${newStatus}!`);
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
        } catch (err) {
            setSnackbarMessage("Failed to update product status.");
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        } finally {
            setLoading(false);
        }
    };

    const handleTabStatusChange = async (tabName, newStatus) => {
        if (!selectedProduct) return;
        setLoading(true);
        const statusKey = `${tabName.toLowerCase().replace(/ /g, '_')}_status`;
        try {
            const updatedProductData = { [statusKey]: newStatus };
            await handleUpdateProduct(selectedProduct.id, updatedProductData);
            setSnackbarMessage(`${tabName} status updated to ${newStatus}!`);
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
        } catch (err) {
            setSnackbarMessage(`Failed to update ${tabName} status.`);
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        } finally {
            setLoading(false);
        }
    };


    const handleProfileMenuOpen = (event) => {
        setAnchorElProfileMenu(event.currentTarget);
    };

    const handleProfileMenuClose = () => {
        setAnchorElProfileMenu(null);
    };

    const handleOpenSettings = () => {
        setCurrentPage('settings'); 
        handleProfileMenuClose();
    };

    const handleSaveSettings = async () => {
        setLoading(true);
        setSnackbarOpen(false);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.put(`${API_URL}/api/user/profile`, {
                username: userName,
                timezone: userTimezone
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            setSnackbarMessage(response.data.message);
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
            setCurrentPage('dashboard'); 
        } catch (err) {
            console.error("Error saving profile settings:", err);
            const errorMessage = err.response && err.response.data && err.response.data.message 
                                ? err.response.data.message 
                                : "Failed to save profile settings. Please try again.";
            setSnackbarMessage(errorMessage);
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        } finally {
            setLoading(false);
        }
    };

    const displayHeaderProfileInitial = useMemo(() => {
        return userName ? userName.charAt(0).toUpperCase() : 'U';
    }, [userName]);


    if (!isLoggedIn) {
        return <AuthPage 
            setIsLoggedIn={setIsLoggedIn} 
            setAuthMessage={setAuthMessage} 
            setUserName={setUserName} 
            setUserTimezone={setUserTimezone} 
        />;
    }

    if (currentPage === 'settings') {
        return (
            <SettingsPage 
                setCurrentPage={setCurrentPage}
                userName={userName}
                setUserName={setUserName}
                userTimezone={userTimezone}
                setUserTimezone={setUserTimezone}
                handleSaveSettings={handleSaveSettings}
                setSnackbarMessage={setSnackbarMessage}
                setSnackbarSeverity={setSnackbarSeverity}
                setSnackbarOpen={setSnackbarOpen}
            />
        );
    }

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                height: '100vh', 
                width: '100vw',  
                fontFamily: 'Inter',
                background: 'linear-gradient(to bottom right, #f9fafb, #e5e7eb)',
                overflow: 'hidden', 
            }}
        >
            {/* Editor.js CDN includes - REQUIRED for Editor component to work */}
            <script src="https://cdn.jsdelivr.net/npm/@editorjs/editorjs@2.28.2/dist/editor.min.js"></script>
            <script src="https://cdn.jsdelivr.net/npm/@editorjs/header@2.8.0/dist/bundle.min.js"></script>
            <script src="https://cdn.jsdelivr.net/npm/@editorjs/paragraph@2.11.3/dist/bundle.min.js"></script>
            <script src="https://cdn.jsdelivr.net/npm/@editorjs/list@1.9.0/dist/bundle.min.js"></script>
            <script src="https://cdn.jsdelivr.net/npm/@editorjs/code@2.9.0/dist/bundle.min.js"></script>
            <script src="https://cdn.jsdelivr.net/npm/@editorjs/table@2.5.0/dist/bundle.min.js"></script>
            <script src="https://cdn.jsdelivr.net/npm/@editorjs/quote@2.6.0/dist/bundle.min.js"></script>
            <script src="https://cdn.jsdelivr.net/npm/@editorjs/raw@2.5.0/dist/bundle.min.js"></script>
            <script src="https://cdn.jsdelivr.net/npm/@editorjs/image@2.9.0/dist/bundle.min.js"></script>
            <script src="https://cdn.jsdelivr.net/npm/@editorjs/marker@1.4.0/dist/bundle.min.js"></script>
            <script src="https://cdn.jsdelivr.net/npm/@editorjs/warning@2.8.0/dist/bundle.min.js"></script>
            <script src="https://cdn.jsdelivr.net/npm/@editorjs/delimiter@1.4.0/dist/bundle.min.js"></script>
            <script src="https://cdn.jsdelivr.net/npm/@editorjs/inline-code@1.4.0/dist/bundle.min.js"></script>
            <script src="https://cdn.jsdelivr.net/npm/@editorjs/link@2.5.0/dist/bundle.min.js"></script>
            <script src="https://cdn.jsdelivr.net/npm/@editorjs/embed@2.5.3/dist/bundle.min.js"></script>
            {/* Add more Editor.js tool CDNs here as needed */}

            {/* Inject the keyframes for the pulse animation */}
            <style>{pulseAnimation}</style>

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
                    flexShrink: 0, 
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
                    {/* Personalized Quote of the Day */}
                    <Box sx={{ 
                        textAlign: 'right', 
                        marginRight: 3,
                        '@keyframes fadeInOut': {
                            '0%': { opacity: 0, transform: 'translateY(10px)' },
                            '5%': { opacity: 1, transform: 'translateY(0)' },
                            '95%': { opacity: 1, transform: 'translateY(0)' },
                            '100%': { opacity: 0, transform: 'translateY(-10px)' },
                        },
                        animation: 'fadeInOut 15s infinite', 
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                    }}>
                        <Typography variant="body2" sx={{ color: '#4f46e5', fontWeight: 'bold', fontSize: '0.9rem' }}>
                            Hey {userName}, quote of the day for you:
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#6b7280', fontStyle: 'italic', fontSize: '0.8rem', display: 'flex', alignItems: 'center' }}>
                            <Box component="span" sx={{ fontSize: '1.2em', marginRight: '0.3em' }}>{quoteEmoji}</Box>
                            "{quoteOfTheDay}"
                        </Typography>
                    </Box>

                    {/* Profile Initial and Menu */}
                    <IconButton
                        aria-label="profile menu"
                        aria-controls="profile-menu"
                        aria-haspopup="true"
                        onClick={handleProfileMenuOpen}
                        sx={{ p: 0 }}
                    >
                        <Box
                            sx={{
                                width: 40,
                                height: 40,
                                borderRadius: '50%',
                                backgroundColor: '#e0e7ff', 
                                color: '#4f46e5', 
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.2rem',
                                fontWeight: 'bold',
                                border: '2px solid #4f46e5',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                animation: 'pulse-initial 2s infinite', 
                            }}
                        >
                            {displayHeaderProfileInitial}
                        </Box>
                    </IconButton>
                    <Menu
                        id="profile-menu"
                        anchorEl={anchorElProfileMenu}
                        open={openProfileMenu}
                        onClose={handleProfileMenuClose}
                        MenuListProps={{
                            'aria-labelledby': 'profile-button',
                        }}
                        anchorOrigin={{
                            vertical: 'bottom',
                            horizontal: 'right',
                        }}
                        transformOrigin={{
                            vertical: 'top',
                            horizontal: 'right',
                        }}
                        PaperProps={{
                            sx: {
                                borderRadius: '0.75rem',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                                minWidth: 180,
                            }
                        }}
                    >
                        <MenuItem onClick={handleOpenSettings} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1.5 }}>
                            <Settings size={18} />
                            <Typography variant="body2" fontWeight="medium">Settings</Typography>
                        </MenuItem>
                        <MenuItem onClick={handleLogout} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1.5 }}>
                            <LogOut size={18} />
                            <Typography variant="body2" fontWeight="medium">Logout</Typography>
                        </MenuItem>
                    </Menu>
                </Box>
            </Box>

            {/* Main Content Area: Sidebar + Product Detail View */}
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
                        height: '100%', 
                        '@media (max-width: 600px)': { 
                            width: '100%',
                            marginBottom: '1rem',
                            height: 'auto', 
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
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.06)',
                            marginBottom: 3,
                        }}
                        onClick={() => setShowAddProductModal(true)}
                    >
                        Add New Item
                    </Button>

                    {/* Global Tasks Button (Placeholder for Phase 2) */}
                    <Button
                        variant="outlined"
                        startIcon={<CheckCircle size={20} />}
                        sx={{
                            borderColor: '#4f46e5',
                            color: '#4f46e5',
                            '&:hover': { backgroundColor: '#eef2ff', borderColor: '#4338ca' },
                            fontWeight: 600,
                            borderRadius: '0.75rem',
                            textTransform: 'none',
                            padding: '0.75rem 1rem',
                            marginBottom: 3,
                        }}
                        disabled // Disabled for Phase 1
                    >
                        Tasks (Coming Soon)
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
                                <InputLabel id="filter-by-status-label">Filter By Status</InputLabel>
                                <Select
                                    labelId="filter-by-status-label"
                                    id="filter-by-status-select"
                                    value={filterByStatus}
                                    onChange={(e) => setFilterByStatus(e.target.value)}
                                    label="Filter By Status"
                                    sx={{ borderRadius: '0.5rem' }}
                                >
                                    <MenuItem value="All">All Statuses</MenuItem>
                                    <MenuItem value="Active">Active</MenuItem>
                                    <MenuItem value="Completed">Completed</MenuItem>
                                    <MenuItem value="Cancelled">Cancelled</MenuItem>
                                    <MenuItem value="On-Hold">On-Hold</MenuItem>
                                </Select>
                            </FormControl>
                        </Box>
                    </Box>

                    {/* Product List */}
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
                                <Box sx={{ width: '0.5rem', height: '0.5rem', borderRadius: '9999px', backgroundColor: '#4f46e5', marginRight: '0.5rem' }} />
                                All Products
                            </ListSubheader>
                        }
                        sx={{ width: '100%', bgcolor: 'background.paper', overflowY: 'auto', flexGrow: 1 }} 
                    >
                        {loading && <Typography sx={{ color: '#9333ea', textAlign: 'center', marginY: 3, fontSize: '0.9rem', fontWeight: 500 }}>Loading...</Typography>}
                        {error && <Alert severity="error" sx={{ marginY: 3, borderRadius: '0.5rem' }}>{error}</Alert>}
                        {!loading && !error && filteredAndSortedProducts.length === 0 ? (
                            <Typography variant="body2" sx={{ color: '#6b7280', textAlign: 'center', paddingY: 3 }}>
                                No products matching criteria.
                            </Typography>
                        ) : (
                            filteredAndSortedProducts.map(product => (
                                <ListItem
                                    key={product.id}
                                    onClick={() => handleSelectProduct(product)}
                                    sx={{
                                        display: 'flex',
                                        flexDirection: 'column', // Stack content vertically
                                        alignItems: 'flex-start',
                                        padding: 1.5,
                                        borderRadius: '0.5rem',
                                        marginBottom: '0.5rem',
                                        backgroundColor: selectedProduct && selectedProduct.id === product.id ? '#eef2ff' : '#fff',
                                        border: selectedProduct && selectedProduct.id === product.id ? '1px solid #c7d2fe' : '1px solid #f3f4f6',
                                        '&:hover': { backgroundColor: '#e0e7ff' },
                                        transition: 'background-color 0.2s, border-color 0.2s',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                        <ListItemText
                                            primary={product.name}
                                            primaryTypographyProps={{ fontWeight: 'medium', color: '#1f2937', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                                        />
                                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                                            <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleUpdateProduct(product.id, { is_archived: !product.is_archived }); }}>
                                                {product.is_archived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
                                            </IconButton>
                                            <IconButton size="small" onClick={(e) => { e.stopPropagation(); confirmDeleteProduct(product.id); }}>
                                                <Trash2 size={16} />
                                            </IconButton>
                                        </Box>
                                    </Box>
                                    <Typography component="span" variant="body2" sx={{ fontSize: '0.75rem', color: '#6b7280', width: '100%', marginTop: 0.5 }}>
                                        Status: {product.status} | Progress: {product.progress}%
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
                                </ListItem>
                            ))
                        )}
                    </List>
                </Paper>

                {/* Right Main Content: Product Detail Tabs */}
                <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* Product Detail Header */}
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
                            flexShrink: 0, 
                        }}
                    >
                        <Box>
                            <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#1f2937' }}>
                                {selectedProduct ? selectedProduct.name : "Select a Product/Item"} 
                                <Typography component="span" variant="body2" sx={{ color: '#6b7280', marginLeft: 1 }}>
                                    {selectedProduct ? `(Status: ${selectedProduct.status})` : ""}
                                </Typography>
                            </Typography>
                            {selectedProduct && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, marginTop: 1 }}>
                                    <Typography variant="body2" sx={{ color: '#4b5563' }}>
                                        Overall Progress: {selectedProduct.progress}%
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
                            {selectedProduct && (
                                <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
                                    <InputLabel id="product-status-label">Status</InputLabel>
                                    <Select
                                        labelId="product-status-label"
                                        value={selectedProduct.status}
                                        onChange={(e) => handleProductStatusChange(selectedProduct.id, e.target.value)}
                                        label="Status"
                                        sx={{ borderRadius: '0.5rem' }}
                                    >
                                        {['Active', 'Completed', 'Cancelled', 'On-Hold'].map(status => (
                                            <MenuItem key={status} value={status}>{status}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            )}
                            {/* Feature Assistant button (Placeholder for future general AI assistant) */}
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
                                disabled // Disabled for Phase 1
                            >
                                Feature Assistant (Coming Soon)
                            </Button>
                        </Box>
                    </Paper>

                    {/* Product Detail Tabs Container */}
                    <Paper
                        elevation={1}
                        sx={{
                            backgroundColor: '#fff',
                            borderRadius: '1rem',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                            display: 'flex',
                            flexDirection: 'column',
                            flexGrow: 1, 
                            overflow: 'hidden' 
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
                                    Select a Product or Item
                                </Typography>
                                <Typography variant="body1" sx={{ color: '#6b7280', textAlign: 'center', maxWidth: '400px' }}>
                                    Choose an item from the left sidebar to view its details and manage its lifecycle.
                                </Typography>
                            </Box>
                        ) : (
                            <>
                                <Tabs 
                                    value={selectedProductTab} 
                                    onChange={(event, newValue) => setSelectedProductTab(newValue)} 
                                    aria-label="Product detail tabs"
                                    variant="scrollable" 
                                    scrollButtons="auto"
                                    sx={{
                                        borderBottom: 1,
                                        borderColor: 'divider',
                                        '& .MuiTabs-indicator': { backgroundColor: '#4f46e5' }, 
                                    }}
                                >
                                    {PRODUCT_TABS_ORDER.map((tabName, index) => (
                                        <Tab 
                                            key={tabName} 
                                            label={tabName} 
                                            id={`product-tab-${index}`} 
                                            aria-controls={`product-tabpanel-${index}`}
                                            sx={{
                                                textTransform: 'none',
                                                fontWeight: 'bold',
                                                color: selectedProduct[`${tabName.toLowerCase().replace(/ /g, '_')}_status`] === 'Completed' ? '#16a34a' : '#4f46e5',
                                                '&.Mui-selected': {
                                                    color: '#4f46e5', 
                                                },
                                                '&:hover': {
                                                    backgroundColor: '#eef2ff',
                                                },
                                                borderRadius: '0.5rem 0.5rem 0 0', 
                                                minHeight: '48px', 
                                            }}
                                        />
                                    ))}
                                </Tabs>

                                {/* Tab Panels for each section */}
                                {PRODUCT_TABS_ORDER.map((tabName, index) => (
                                    <TabPanel value={selectedProductTab} index={index} key={tabName}>
                                        {/* Common Status Controls for each tab */}
                                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1, marginBottom: 2 }}>
                                            <Typography variant="body2" color="textSecondary">
                                                Status:
                                            </Typography>
                                            <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
                                                <Select
                                                    value={selectedProduct[`${tabName.toLowerCase().replace(/ /g, '_')}_status`]}
                                                    onChange={(e) => handleTabStatusChange(tabName, e.target.value)}
                                                    sx={{ borderRadius: '0.5rem' }}
                                                >
                                                    {['Not Started', 'In Progress', 'Completed', 'Skipped'].map(status => (
                                                        <MenuItem key={status} value={status}>{status}</MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                        </Box>

                                        {/* --- Research Tab Content --- */}
                                        {tabName === 'Research' && (
                                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, flexGrow: 1, overflowY: 'auto' }}>
                                                {/* Market Research Section */}
                                                <Paper elevation={1} sx={{ p: 3, borderRadius: '0.75rem', border: '1px solid #d8b4fe', backgroundColor: '#f5f3ff' }}>
                                                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#4f46e5', marginBottom: 2 }}>
                                                        Market Research
                                                    </Typography>
                                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: '300px', overflowY: 'auto', marginBottom: 2 }}>
                                                        {researchChatHistory.map((msg, idx) => (
                                                            <Box key={idx} sx={{ 
                                                                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                                                backgroundColor: msg.role === 'user' ? '#eef2ff' : '#f0f4f8',
                                                                borderRadius: '0.75rem',
                                                                p: 1.5,
                                                                maxWidth: '80%',
                                                                wordBreak: 'break-word',
                                                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                                            }}>
                                                                <Typography variant="body2" sx={{ color: msg.role === 'user' ? '#4f46e5' : '#374151' }}>
                                                                    {msg.content}
                                                                </Typography>
                                                            </Box>
                                                        ))}
                                                        {isResearchAILoading && (
                                                            <Box sx={{ alignSelf: 'flex-start', p: 1.5 }}>
                                                                <CircularProgress size={20} />
                                                                <Typography variant="body2" sx={{ color: '#6b7280', ml: 1 }}>AI is thinking...</Typography>
                                                            </Box>
                                                        )}
                                                    </Box>
                                                    <form onSubmit={handleResearchPromptSubmit} style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                                        <TextField
                                                            fullWidth
                                                            variant="outlined"
                                                            size="small"
                                                            placeholder="Ask AI about market research..."
                                                            value={currentResearchPrompt}
                                                            onChange={(e) => setCurrentResearchPrompt(e.target.value)}
                                                            disabled={isResearchAILoading}
                                                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '0.5rem' } }}
                                                        />
                                                        <IconButton type="submit" color="primary" disabled={isResearchAILoading}>
                                                            <Send />
                                                        </IconButton>
                                                        {/* Speech-to-text (Mic) button - Placeholder for now */}
                                                        <IconButton color="primary" disabled> 
                                                            <Mic />
                                                        </IconButton>
                                                    </form>
                                                </Paper>

                                                {/* Market Research Document Editor */}
                                                <Paper elevation={1} sx={{ p: 3, borderRadius: '0.75rem', border: '1px solid #e0e7ff', backgroundColor: '#f9fafb', flexGrow: 1 }}>
                                                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#374151', marginBottom: 2 }}>
                                                        Market Research Document
                                                    </Typography>
                                                    <Editor 
                                                        initialData={researchDocumentData} 
                                                        onChange={handleResearchDocumentSave} 
                                                        holder="research-editor-container"
                                                    />
                                                </Paper>

                                                {/* Customer Interviews Section */}
                                                <Paper elevation={1} sx={{ p: 3, borderRadius: '0.75rem', border: '1px solid #d8b4fe', backgroundColor: '#f5f3ff' }}>
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                                                        <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#4f46e5' }}>
                                                            Customer Interviews
                                                        </Typography>
                                                        <Button 
                                                            variant="contained" 
                                                            startIcon={<PlusCircle size={20} />} 
                                                            onClick={() => setShowAddInterviewModal(true)}
                                                            sx={{ textTransform: 'none', borderRadius: '0.5rem', backgroundColor: '#16a34a', '&:hover': { backgroundColor: '#15803d' } }}
                                                        >
                                                            Add Interview
                                                        </Button>
                                                    </Box>
                                                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 2 }}>
                                                        <Button 
                                                            variant="outlined" 
                                                            startIcon={<Sparkles size={16} />} 
                                                            onClick={fetchInterviewTemplates}
                                                            sx={{ textTransform: 'none', borderRadius: '0.5rem', borderColor: '#9333ea', color: '#9333ea', '&:hover': { backgroundColor: '#f3e8ff' } }}
                                                        >
                                                            Manage Templates
                                                        </Button>
                                                    </Box>

                                                    <List dense sx={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #e0e7ff', borderRadius: '0.5rem' }}>
                                                        {customerInterviews.length === 0 ? (
                                                            <ListItem><ListItemText secondary="No interviews added yet." sx={{ textAlign: 'center' }} /></ListItem>
                                                        ) : (
                                                            customerInterviews.map(interview => (
                                                                <ListItem 
                                                                    key={interview.id} 
                                                                    onClick={() => handleSelectInterview(interview)}
                                                                    secondaryAction={
                                                                        <IconButton edge="end" aria-label="delete" onClick={(e) => { e.stopPropagation(); handleDeleteInterview(interview.id); }}>
                                                                            <Trash2 size={16} />
                                                                        </IconButton>
                                                                    }
                                                                    sx={{ 
                                                                        backgroundColor: selectedInterview && selectedInterview.id === interview.id ? '#eef2ff' : 'transparent',
                                                                        '&:hover': { backgroundColor: '#eef2ff' },
                                                                        borderRadius: '0.5rem',
                                                                        marginBottom: '0.25rem'
                                                                    }}
                                                                >
                                                                    <ListItemText 
                                                                        primary={interview.customer_name} 
                                                                        secondary={`${new Date(interview.interview_date).toLocaleDateString()} - ${interview.customer_email || 'N/A'}`} 
                                                                    />
                                                                </ListItem>
                                                            ))
                                                        )}
                                                    </List>

                                                    {selectedInterview && (
                                                        <Box sx={{ marginTop: 3, borderTop: '1px solid #e0e7ff', paddingTop: 3 }}>
                                                            <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#374151', marginBottom: 2 }}>
                                                                Interview Notes for {selectedInterview.customer_name}
                                                            </Typography>
                                                            <Editor 
                                                                initialData={interviewNotesData} 
                                                                onChange={handleSaveInterviewNotes} 
                                                                holder={`interview-notes-editor-${selectedInterview.id}`}
                                                            />
                                                            <Button 
                                                                variant="contained" 
                                                                startIcon={<Sparkles size={20} />} 
                                                                onClick={handleGenerateInterviewSummary}
                                                                disabled={loading}
                                                                sx={{ textTransform: 'none', borderRadius: '0.5rem', backgroundColor: '#9333ea', '&:hover': { backgroundColor: '#7e22ce' }, marginTop: 2 }}
                                                            >
                                                                {loading ? <CircularProgress size={20} color="inherit" /> : 'Generate Summary'}
                                                            </Button>

                                                            {interviewSummaryData && (
                                                                <Box sx={{ marginTop: 3 }}>
                                                                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#374151', marginBottom: 1 }}>
                                                                        AI Summary:
                                                                    </Typography>
                                                                    <Editor 
                                                                        initialData={interviewSummaryData} 
                                                                        readOnly={true} 
                                                                        holder={`interview-summary-editor-${selectedInterview.id}`}
                                                                    />
                                                                </Box>
                                                            )}
                                                        </Box>
                                                    )}
                                                </Paper>
                                            </Box>
                                        )}

                                        {/* --- PRD Tab Content --- */}
                                        {tabName === 'PRD' && (
                                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, flexGrow: 1, overflowY: 'auto' }}>
                                                <Paper elevation={1} sx={{ p: 3, borderRadius: '0.75rem', border: '1px solid #d8b4fe', backgroundColor: '#f5f3ff' }}>
                                                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#4f46e5', marginBottom: 2 }}>
                                                        PRD Generation Assistant
                                                    </Typography>
                                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: '300px', overflowY: 'auto', marginBottom: 2 }}>
                                                        {prdChatHistory.map((msg, idx) => (
                                                            <Box key={idx} sx={{ 
                                                                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                                                backgroundColor: msg.role === 'user' ? '#eef2ff' : '#f0f4f8',
                                                                borderRadius: '0.75rem',
                                                                p: 1.5,
                                                                maxWidth: '80%',
                                                                wordBreak: 'break-word',
                                                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                                            }}>
                                                                <Typography variant="body2" sx={{ color: msg.role === 'user' ? '#4f46e5' : '#374151' }}>
                                                                    {msg.content}
                                                                </Typography>
                                                            </Box>
                                                        ))}
                                                        {isPrdAILoading && (
                                                            <Box sx={{ alignSelf: 'flex-start', p: 1.5 }}>
                                                                <CircularProgress size={20} />
                                                                <Typography variant="body2" sx={{ color: '#6b7280', ml: 1 }}>AI is thinking...</Typography>
                                                            </Box>
                                                        )}
                                                    </Box>
                                                    <form onSubmit={handlePrdPromptSubmit} style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                                        <TextField
                                                            fullWidth
                                                            variant="outlined"
                                                            size="small"
                                                            placeholder="Tell AI about your PRD requirements..."
                                                            value={currentPrdPrompt}
                                                            onChange={(e) => setCurrentPrdPrompt(e.target.value)}
                                                            disabled={isPrdAILoading}
                                                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '0.5rem' } }}
                                                        />
                                                        <IconButton type="submit" color="primary" disabled={isPrdAILoading}>
                                                            <Send />
                                                        </IconButton>
                                                        {/* Speech-to-text (Mic) button - Placeholder for now */}
                                                        <IconButton color="primary" disabled> 
                                                            <Mic />
                                                        </IconButton>
                                                    </form>
                                                </Paper>

                                                <Paper elevation={1} sx={{ p: 3, borderRadius: '0.75rem', border: '1px solid #e0e7ff', backgroundColor: '#f9fafb', flexGrow: 1 }}>
                                                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#374151', marginBottom: 2 }}>
                                                        Product Requirements Document
                                                    </Typography>
                                                    <Editor 
                                                        initialData={prdDocumentData} 
                                                        onChange={handlePrdDocumentSave} 
                                                        holder="prd-editor-container"
                                                    />
                                                </Paper>
                                            </Box>
                                        )}

                                        {/* --- Other Tabs (Placeholders for now) --- */}
                                        {tabName !== 'Research' && tabName !== 'PRD' && (
                                            <Box sx={{ p: 3, textAlign: 'center', color: '#6b7280', flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                                                <Typography variant="h6" sx={{ marginBottom: 2 }}>
                                                    {tabName} Tab
                                                </Typography>
                                                <Typography variant="body1">
                                                    Content for the {tabName} tab will be implemented in future phases.
                                                </Typography>
                                            </Box>
                                        )}
                                    </TabPanel>
                                ))}
                            </>
                        )}
                    </Paper>
                </Box>
            </Box>

            {/* Add Product Modal */}
            <Dialog open={showAddProductModal} onClose={() => setShowAddProductModal(false)} PaperProps={{ sx: { borderRadius: '1rem' } }}>
                <DialogTitle sx={{ fontWeight: 'bold', color: '#1f2937' }}>Add New Product/Item</DialogTitle>
                <DialogContent dividers>
                    <TextField
                        autoFocus
                        margin="dense"
                        id="new-product-name"
                        label="Product/Item Name"
                        type="text"
                        fullWidth
                        variant="outlined"
                        value={newProductName}
                        onChange={(e) => setNewProductName(e.target.value)}
                        sx={{ marginBottom: 2 }}
                    />
                    <FormControl fullWidth margin="dense" sx={{ marginBottom: 2 }}>
                        <InputLabel id="new-product-status-label">Status</InputLabel>
                        <Select
                            labelId="new-product-status-label"
                            value={newProductStatus}
                            onChange={(e) => setNewProductStatus(e.target.value)}
                            label="Status"
                        >
                            {['Active', 'Completed', 'Cancelled', 'On-Hold'].map(status => (
                                <MenuItem key={status} value={status}>{status}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl fullWidth margin="dense">
                        <InputLabel id="new-product-parent-label">Parent Item (for Iteration)</InputLabel>
                        <Select
                            labelId="new-product-parent-label"
                            value={newProductParentId}
                            onChange={(e) => setNewProductParentId(e.target.value)}
                            label="Parent Item (for Iteration)"
                        >
                            <MenuItem value=""><em>None</em></MenuItem>
                            {products.filter(p => !p.parent_id).map(p => ( // Only show top-level products as parents
                                <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
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

            {/* Add Customer Interview Modal */}
            <Dialog open={showAddInterviewModal} onClose={() => setShowAddInterviewModal(false)} PaperProps={{ sx: { borderRadius: '1rem' } }}>
                <DialogTitle sx={{ fontWeight: 'bold', color: '#1f2937' }}>Add New Customer Interview</DialogTitle>
                <DialogContent dividers>
                    <TextField
                        autoFocus
                        margin="dense"
                        id="interview-customer-name"
                        label="Customer Name"
                        type="text"
                        fullWidth
                        variant="outlined"
                        value={newInterviewCustomerName}
                        onChange={(e) => setNewInterviewCustomerName(e.target.value)}
                        sx={{ marginBottom: 2 }}
                    />
                    <TextField
                        margin="dense"
                        id="interview-customer-email"
                        label="Customer Email (Optional)"
                        type="email"
                        fullWidth
                        variant="outlined"
                        value={newInterviewCustomerEmail}
                        onChange={(e) => setNewInterviewCustomerEmail(e.target.value)}
                        sx={{ marginBottom: 2 }}
                    />
                    <TextField
                        margin="dense"
                        id="interview-date"
                        label="Interview Date"
                        type="datetime-local"
                        fullWidth
                        variant="outlined"
                        value={newInterviewDate}
                        onChange={(e) => setNewInterviewDate(e.target.value)}
                        InputLabelProps={{
                            shrink: true,
                        }}
                    />
                </DialogContent>
                <DialogActions sx={{ padding: 2, justifyContent: 'space-between' }}>
                    <Button 
                        onClick={() => setShowAddInterviewModal(false)} 
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
                        onClick={handleAddCustomerInterview} 
                        variant="contained" 
                        disabled={loading || !newInterviewCustomerName.trim()}
                        sx={{ 
                            textTransform: 'none', 
                            backgroundColor: '#4f46e5', 
                            color: '#fff', 
                            borderRadius: '0.5rem',
                            '&:hover': { backgroundColor: '#4338ca' },
                            '&:disabled': { opacity: 0.5, color: '#fff' }
                        }}
                    >
                        Add Interview
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Interview Template Modal */}
            <Dialog open={showTemplateModal} onClose={() => { setShowTemplateModal(false); setSelectedTemplate(null); setTemplateName(''); setTemplateQuestionsData(null); }} PaperProps={{ sx: { borderRadius: '1rem', maxWidth: '800px' } }} fullWidth>
                <DialogTitle sx={{ fontWeight: 'bold', color: '#1f2937' }}>
                    {selectedTemplate ? 'Edit Interview Template' : 'Manage Interview Templates'}
                </DialogTitle>
                <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {!selectedTemplate ? (
                        <>
                            <Box sx={{ display: 'flex', gap: 2, marginBottom: 2 }}>
                                <TextField
                                    autoFocus
                                    margin="dense"
                                    id="template-name-input"
                                    label="New Template Name"
                                    type="text"
                                    fullWidth
                                    variant="outlined"
                                    value={templateName}
                                    onChange={(e) => setTemplateName(e.target.value)}
                                />
                                <Button 
                                    onClick={handleCreateTemplate} 
                                    variant="contained" 
                                    disabled={loading || !templateName.trim()}
                                    sx={{ textTransform: 'none', borderRadius: '0.5rem', backgroundColor: '#16a34a', '&:hover': { backgroundColor: '#15803d' } }}
                                >
                                    Create
                                </Button>
                            </Box>
                            <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#374151', marginBottom: 1 }}>Existing Templates</Typography>
                            <List dense sx={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #e0e7ff', borderRadius: '0.5rem' }}>
                                {interviewTemplates.length === 0 ? (
                                    <ListItem><ListItemText secondary="No templates created yet." sx={{ textAlign: 'center' }} /></ListItem>
                                ) : (
                                    interviewTemplates.map(template => (
                                        <ListItem 
                                            key={template.id} 
                                            onClick={() => handleSelectTemplate(template)}
                                            secondaryAction={
                                                <IconButton edge="end" aria-label="delete" onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(template.id); }}>
                                                    <Trash2 size={16} />
                                                </IconButton>
                                            }
                                            sx={{ 
                                                backgroundColor: selectedTemplate && selectedTemplate.id === template.id ? '#eef2ff' : 'transparent',
                                                '&:hover': { backgroundColor: '#eef2ff' },
                                                borderRadius: '0.5rem',
                                                marginBottom: '0.25rem'
                                            }}
                                        >
                                            <ListItemText primary={template.template_name} />
                                        </ListItem>
                                    ))
                                )}
                            </List>
                        </>
                    ) : (
                        <>
                            <TextField
                                margin="dense"
                                id="edit-template-name"
                                label="Template Name"
                                type="text"
                                fullWidth
                                variant="outlined"
                                value={templateName}
                                onChange={(e) => setTemplateName(e.target.value)}
                                sx={{ marginBottom: 2 }}
                            />
                            <Typography variant="body1" sx={{ fontWeight: 'bold', color: '#374151', marginBottom: 1 }}>
                                Template Questions
                            </Typography>
                            <Editor 
                                initialData={templateQuestionsData} 
                                onChange={setTemplateQuestionsData} 
                                holder={`template-editor-${selectedTemplate.id}`}
                            />
                            <Button 
                                variant="contained" 
                                startIcon={<Sparkles size={20} />} 
                                onClick={() => handleGenerateTemplateQuestions(selectedProduct?.name || '', templateQuestionsData ? JSON.stringify(templateQuestionsData) : '')}
                                disabled={isTemplateAILoading || !selectedProduct}
                                sx={{ textTransform: 'none', borderRadius: '0.5rem', backgroundColor: '#9333ea', '&:hover': { backgroundColor: '#7e22ce' }, marginTop: 2 }}
                            >
                                {isTemplateAILoading ? <CircularProgress size={20} color="inherit" /> : 'Generate Questions with AI'}
                            </Button>
                        </>
                    )}
                </DialogContent>
                <DialogActions sx={{ padding: 2, justifyContent: 'space-between' }}>
                    <Button 
                        onClick={() => { setShowTemplateModal(false); setSelectedTemplate(null); setTemplateName(''); setTemplateQuestionsData(null); }} 
                        sx={{ 
                            textTransform: 'none', 
                            color: '#6b7280', 
                            borderRadius: '0.5rem', 
                            '&:hover': { backgroundColor: '#f3f4f6' } 
                        }}
                    >
                        {selectedTemplate ? 'Close' : 'Cancel'}
                    </Button>
                    {selectedTemplate && (
                        <Button 
                            onClick={handleUpdateTemplate} 
                            variant="contained" 
                            disabled={loading || !templateName.trim()}
                            sx={{ 
                                textTransform: 'none', 
                                backgroundColor: '#4f46e5', 
                                color: '#fff', 
                                borderRadius: '0.5rem',
                                '&:hover': { backgroundColor: '#4338ca' },
                                '&:disabled': { opacity: 0.5, color: '#fff' }
                            }}
                        >
                            Save Changes
                        </Button>
                    )}
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
                        Are you sure you want to delete this product/item? This action cannot be undone.
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

// Helper function for TabPanel content
const TabPanel = (props) => {
    const { children, value, index, ...other } = props;
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`product-tabpanel-${index}`}
            aria-labelledby={`product-tab-${index}`}
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

export default App;