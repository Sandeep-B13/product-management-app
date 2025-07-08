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
    Collapse,
    Divider, // Added for ProductDetail Component
    Chip, // Added for ProductDetail Component
    Avatar, // Added for ProductDetail Component
    ListItemAvatar, // Added for ProductDetail Component
    FormHelperText // Added for ProductDetail Component
} from '@mui/material';

// Importing Lucide icons
import { 
    Eye, EyeOff, ArrowRight, Sparkles, Zap, Users, BarChart3, Trash2, Plus, 
    Archive, ArchiveRestore, MessageSquare, CheckCircle, Search, User, Settings, 
    LogOut, ChevronDown, ChevronUp, ArrowLeft, Mic, Send, Edit, Save, X, PlusCircle,
    Copy, ExternalLink, RefreshCw, Loader, TrendingUp, TrendingDown, Clock, Calendar,
    UserPlus, Mail, CalendarDays, BookOpen, ClipboardList, Package, MessageCircle,
    Info, Kanban, GitFork, FileText
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

// --- ProductDetail Component ---
function ProductDetail({ productId, onBackButtonClick, setSnackbarOpen, setSnackbarMessage, setSnackbarSeverity, userName, userTimezone }) {
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedProductTab, setSelectedProductTab] = useState(0);
    const [isEditingName, setIsEditingName] = useState(false);
    const [editedProductName, setEditedProductName] = useState('');
    const [isEditingDescription, setIsEditingDescription] = useState(false);
    const [editedProductDescription, setEditedProductDescription] = useState('');
    const [isSavingProductDetails, setIsSavingProductDetails] = useState(false);

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


    const token = localStorage.getItem('token');

    const fetchProductDetails = useCallback(async () => {
        if (!productId || !token) return;
        setLoading(true);
        setError(null);
        try {
            const response = await axios.get(`${API_URL}/api/products/${productId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setProduct(response.data);
            setEditedProductName(response.data.name);
            setEditedProductDescription(response.data.description || '');

            // Initialize document data for tabs
            setResearchDocumentData(response.data.research_doc || { blocks: [] });
            setPrdDocumentData(response.data.prd_doc || { blocks: [] });
            
            // Initialize chat history
            setResearchChatHistory(response.data.research_chat_history || []);
            setPrdChatHistory(response.data.prd_chat_history || []);

        } catch (err) {
            console.error("Failed to fetch product details:", err);
            setError("Failed to load product details.");
            setSnackbarMessage("Failed to load product details.");
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        } finally {
            setLoading(false);
        }
    }, [productId, token, setSnackbarMessage, setSnackbarSeverity, setSnackbarOpen]);

    const fetchCustomerInterviews = useCallback(async () => {
        if (!productId || !token) return;
        try {
            const response = await axios.get(`${API_URL}/api/products/${productId}/interviews`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCustomerInterviews(response.data);
        } catch (err) {
            console.error("Failed to fetch customer interviews:", err);
            setSnackbarMessage("Failed to load customer interviews.");
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        }
    }, [productId, token, setSnackbarMessage, setSnackbarSeverity, setSnackbarOpen]);

    const fetchInterviewTemplates = useCallback(async () => {
        if (!token) return;
        try {
            const response = await axios.get(`${API_URL}/api/interview-templates`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setInterviewTemplates(response.data);
        } catch (err) {
            console.error("Failed to fetch interview templates:", err);
            setSnackbarMessage("Failed to load interview templates.");
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        }
    }, [token, setSnackbarMessage, setSnackbarSeverity, setSnackbarOpen]);


    useEffect(() => {
        fetchProductDetails();
        fetchCustomerInterviews();
        fetchInterviewTemplates();
    }, [fetchProductDetails, fetchCustomerInterviews, fetchInterviewTemplates]);


    const handleSaveProductDetails = async () => {
        setIsSavingProductDetails(true);
        try {
            const updatedProduct = {
                name: editedProductName,
                description: editedProductDescription,
            };
            await axios.put(`${API_URL}/api/products/${productId}`, updatedProduct, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setProduct(prev => ({ ...prev, name: editedProductName, description: editedProductDescription }));
            setIsEditingName(false);
            setIsEditingDescription(false);
            setSnackbarMessage("Product details updated successfully!");
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
        } catch (err) {
            console.error("Failed to update product details:", err);
            setSnackbarMessage("Failed to update product details.");
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        } finally {
            setIsSavingProductDetails(false);
        }
    };

    const handleTabChange = (event, newValue) => {
        setSelectedProductTab(newValue);
    };

    // AI Chat Functions (Research Tab)
    const handleResearchPromptChange = (e) => setCurrentResearchPrompt(e.target.value);

    const sendResearchPrompt = async () => {
        if (!currentResearchPrompt.trim()) return;

        const newChatEntry = {
            role: 'user',
            content: currentResearchPrompt,
            timestamp: new Date().toISOString()
        };
        const updatedChatHistory = [...researchChatHistory, newChatEntry];
        setResearchChatHistory(updatedChatHistory);
        setCurrentResearchPrompt('');
        setIsResearchAILoading(true);

        try {
            const response = await axios.post(`${API_URL}/api/products/${productId}/research_chat`, {
                prompt: currentResearchPrompt,
                history: researchChatHistory, // Send the full history for context
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const aiResponse = {
                role: 'ai',
                content: response.data.response,
                timestamp: new Date().toISOString()
            };
            setResearchChatHistory(prev => [...prev, aiResponse]);
        } catch (err) {
            console.error("Error sending research prompt:", err);
            setSnackbarMessage("Error getting AI response for research. Please try again.");
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
            setResearchChatHistory(prev => [...prev, { role: 'ai', content: 'Error: Could not get a response.', timestamp: new Date().toISOString() }]);
        } finally {
            setIsResearchAILoading(false);
        }
    };

    const regenerateResearchResponse = async (promptToRegenerate, historyBeforePrompt) => {
        setIsResearchAILoading(true);
        // Temporarily remove the last AI response if it was an error
        setResearchChatHistory(historyBeforePrompt);

        try {
            const response = await axios.post(`${API_URL}/api/products/${productId}/research_chat`, {
                prompt: promptToRegenerate,
                history: historyBeforePrompt, // Send history up to the point of regeneration
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const aiResponse = {
                role: 'ai',
                content: response.data.response,
                timestamp: new Date().toISOString()
            };
            setResearchChatHistory(prev => [...prev, aiResponse]);
            setSnackbarMessage("AI response regenerated!");
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
        } catch (err) {
            console.error("Error regenerating research response:", err);
            setSnackbarMessage("Failed to regenerate AI response for research.");
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
            setResearchChatHistory(prev => [...prev, { role: 'ai', content: 'Error: Could not regenerate response.', timestamp: new Date().toISOString() }]);
        } finally {
            setIsResearchAILoading(false);
        }
    };

    const handleSaveResearchDocument = useCallback(async (data) => {
        setResearchDocumentData(data);
        try {
            await axios.put(`${API_URL}/api/products/${productId}/research_doc`, { content: data }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSnackbarMessage("Research document saved!");
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
        } catch (err) {
            console.error("Error saving research document:", err);
            setSnackbarMessage("Failed to save research document.");
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        }
    }, [productId, token, setSnackbarMessage, setSnackbarSeverity, setSnackbarOpen]);

    // AI Chat Functions (PRD Tab)
    const handlePrdPromptChange = (e) => setCurrentPrdPrompt(e.target.value);

    const sendPrdPrompt = async () => {
        if (!currentPrdPrompt.trim()) return;

        const newChatEntry = {
            role: 'user',
            content: currentPrdPrompt,
            timestamp: new Date().toISOString()
        };
        const updatedChatHistory = [...prdChatHistory, newChatEntry];
        setPrdChatHistory(updatedChatHistory);
        setCurrentPrdPrompt('');
        setIsPrdAILoading(true);

        try {
            const response = await axios.post(`${API_URL}/api/products/${productId}/prd_chat`, {
                prompt: currentPrdPrompt,
                history: prdChatHistory, // Send the full history for context
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const aiResponse = {
                role: 'ai',
                content: response.data.response,
                timestamp: new Date().toISOString()
            };
            setPrdChatHistory(prev => [...prev, aiResponse]);
        } catch (err) {
            console.error("Error sending PRD prompt:", err);
            setSnackbarMessage("Error getting AI response for PRD. Please try again.");
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
            setPrdChatHistory(prev => [...prev, { role: 'ai', content: 'Error: Could not get a response.', timestamp: new Date().toISOString() }]);
        } finally {
            setIsPrdAILoading(false);
        }
    };

    const regeneratePrdResponse = async (promptToRegenerate, historyBeforePrompt) => {
        setIsPrdAILoading(true);
        setPrdChatHistory(historyBeforePrompt);

        try {
            const response = await axios.post(`${API_URL}/api/products/${productId}/prd_chat`, {
                prompt: promptToRegenerate,
                history: historyBeforePrompt,
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const aiResponse = {
                role: 'ai',
                content: response.data.response,
                timestamp: new Date().toISOString()
            };
            setPrdChatHistory(prev => [...prev, aiResponse]);
            setSnackbarMessage("AI response regenerated!");
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
        } catch (err) {
            console.error("Error regenerating PRD response:", err);
            setSnackbarMessage("Failed to regenerate AI response for PRD.");
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
            setPrdChatHistory(prev => [...prev, { role: 'ai', content: 'Error: Could not regenerate response.', timestamp: new Date().toISOString() }]);
        } finally {
            setIsPrdAILoading(false);
        }
    };

    const handleSavePrdDocument = useCallback(async (data) => {
        setPrdDocumentData(data);
        try {
            await axios.put(`${API_URL}/api/products/${productId}/prd_doc`, { content: data }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSnackbarMessage("PRD document saved!");
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
        } catch (err) {
            console.error("Error saving PRD document:", err);
            setSnackbarMessage("Failed to save PRD document.");
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        }
    }, [productId, token, setSnackbarMessage, setSnackbarSeverity, setSnackbarOpen]);


    // Customer Interview Functions
    const handleAddInterview = async () => {
        if (!newInterviewCustomerName || !newInterviewCustomerEmail || !newInterviewDate) {
            setSnackbarMessage("Please fill all fields for the interview.");
            setSnackbarSeverity('warning');
            setSnackbarOpen(true);
            return;
        }
        try {
            const response = await axios.post(`${API_URL}/api/products/${productId}/interviews`, {
                customer_name: newInterviewCustomerName,
                customer_email: newInterviewCustomerEmail,
                interview_date: newInterviewDate,
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCustomerInterviews(prev => [...prev, response.data]);
            setShowAddInterviewModal(false);
            setNewInterviewCustomerName('');
            setNewInterviewCustomerEmail('');
            setNewInterviewDate(new Date().toISOString().slice(0, 16));
            setSnackbarMessage("Customer interview added successfully!");
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
        } catch (err) {
            console.error("Failed to add interview:", err);
            setSnackbarMessage("Failed to add customer interview.");
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        }
    };

    const handleSelectInterview = async (interviewId) => {
        try {
            const response = await axios.get(`${API_URL}/api/interviews/${interviewId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSelectedInterview(response.data);
            setInterviewNotesData(response.data.notes || { blocks: [] });
            setInterviewSummaryData(response.data.summary || { blocks: [] });
        } catch (err) {
            console.error("Failed to fetch interview details:", err);
            setSnackbarMessage("Failed to load interview details.");
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        }
    };

    const handleDeleteInterview = async (interviewId) => {
        try {
            await axios.delete(`${API_URL}/api/interviews/${interviewId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCustomerInterviews(prev => prev.filter(interview => interview.id !== interviewId));
            if (selectedInterview && selectedInterview.id === interviewId) {
                setSelectedInterview(null);
                setInterviewNotesData(null);
                setInterviewSummaryData(null);
            }
            setSnackbarMessage("Interview deleted successfully!");
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
        } catch (err) {
            console.error("Failed to delete interview:", err);
            setSnackbarMessage("Failed to delete interview.");
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        }
    };

    const handleSaveInterviewNotes = useCallback(async (data) => {
        if (!selectedInterview) return;
        setInterviewNotesData(data);
        try {
            await axios.put(`${API_URL}/api/interviews/${selectedInterview.id}/notes`, { content: data }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSnackbarMessage("Interview notes saved!");
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
        } catch (err) {
            console.error("Error saving interview notes:", err);
            setSnackbarMessage("Failed to save interview notes.");
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        }
    }, [selectedInterview, token, setSnackbarMessage, setSnackbarSeverity, setSnackbarOpen]);

    const generateInterviewSummary = async () => {
        if (!selectedInterview || !interviewNotesData) {
            setSnackbarMessage("No interview notes to summarize.");
            setSnackbarSeverity('warning');
            setSnackbarOpen(true);
            return;
        }
        setIsTemplateAILoading(true); // Reusing this loading state
        try {
            const response = await axios.post(`${API_URL}/api/interviews/${selectedInterview.id}/summarize`, {
                notes_content: interviewNotesData,
                user_timezone: userTimezone // Pass user's timezone for accurate time representation in summary
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setInterviewSummaryData(response.data.summary);
            setSnackbarMessage("Interview summary generated!");
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
        } catch (err) {
            console.error("Failed to generate summary:", err);
            setSnackbarMessage("Failed to generate interview summary.");
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        } finally {
            setIsTemplateAILoading(false);
        }
    };

    // Interview Template Functions
    const handleAddTemplate = async () => {
        if (!templateName || !templateQuestionsData) {
            setSnackbarMessage("Please fill all fields for the template.");
            setSnackbarSeverity('warning');
            setSnackbarOpen(true);
            return;
        }
        try {
            const response = await axios.post(`${API_URL}/api/interview-templates`, {
                name: templateName,
                questions: templateQuestionsData
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setInterviewTemplates(prev => [...prev, response.data]);
            setShowTemplateModal(false);
            setTemplateName('');
            setTemplateQuestionsData(null);
            setSnackbarMessage("Interview template added successfully!");
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
        } catch (err) {
            console.error("Failed to add template:", err);
            setSnackbarMessage("Failed to add interview template.");
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        }
    };

    const handleDeleteTemplate = async (templateId) => {
        try {
            await axios.delete(`${API_URL}/api/interview-templates/${templateId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setInterviewTemplates(prev => prev.filter(template => template.id !== templateId));
            if (selectedTemplate && selectedTemplate.id === templateId) {
                setSelectedTemplate(null);
                setTemplateQuestionsData(null);
            }
            setSnackbarMessage("Template deleted successfully!");
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
        } catch (err) {
            console.error("Failed to delete template:", err);
            setSnackbarMessage("Failed to delete template.");
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        }
    };

    const handleSelectTemplate = (template) => {
        setSelectedTemplate(template);
        setTemplateName(template.name);
        setTemplateQuestionsData(template.questions);
        setShowTemplateModal(true); // Open modal for editing/viewing
    };

    const handleSaveTemplateQuestions = useCallback(async (data) => {
        if (!selectedTemplate) return; // Should not happen if coming from handleSelectTemplate
        setTemplateQuestionsData(data);
        try {
            await axios.put(`${API_URL}/api/interview-templates/${selectedTemplate.id}`, { name: templateName, questions: data }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSnackbarMessage("Template questions saved!");
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
            fetchInterviewTemplates(); // Refresh list to show updated template name if changed
        } catch (err) {
            console.error("Error saving template questions:", err);
            setSnackbarMessage("Failed to save template questions.");
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        }
    }, [selectedTemplate, templateName, token, setSnackbarMessage, setSnackbarSeverity, setSnackbarOpen, fetchInterviewTemplates]);

    const generateQuestionsFromTemplate = async () => {
        if (!templateName) {
            setSnackbarMessage("Please enter a template name to generate questions.");
            setSnackbarSeverity('warning');
            setSnackbarOpen(true);
            return;
        }
        setIsTemplateAILoading(true);
        try {
            const response = await axios.post(`${API_URL}/api/interview-templates/generate_questions`, {
                template_name: templateName,
                product_name: product?.name, // Pass product context
                product_description: product?.description // Pass product context
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTemplateQuestionsData(response.data.questions);
            setSnackbarMessage("Questions generated from template!");
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
        } catch (err) {
            console.error("Failed to generate questions from template:", err);
            setSnackbarMessage("Failed to generate questions from template.");
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        } finally {
            setIsTemplateAILoading(false);
        }
    };

    const handleUseTemplate = () => {
        if (selectedInterview && templateQuestionsData) {
            setInterviewNotesData(templateQuestionsData);
            setSnackbarMessage("Template questions copied to current interview notes!");
            setSnackbarSeverity('info');
            setSnackbarOpen(true);
            // Optionally, save notes immediately or prompt user to save
            handleSaveInterviewNotes(templateQuestionsData);
        } else {
            setSnackbarMessage("Select an interview and a template first.");
            setSnackbarSeverity('warning');
            setSnackbarOpen(true);
        }
        setShowTemplateModal(false); // Close the template modal after using
    };


    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column' }}>
                <CircularProgress sx={{ color: '#4f46e5' }} />
                <Typography sx={{ mt: 2, color: '#6b7280' }}>Loading product details...</Typography>
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', p: 3 }}>
                <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
                <Button onClick={onBackButtonClick} variant="contained" startIcon={<ArrowLeft />} sx={{ textTransform: 'none', backgroundColor: '#4f46e5', '&:hover': { backgroundColor: '#4338ca' } }}>
                    Back to Dashboard
                </Button>
            </Box>
        );
    }

    if (!product) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', p: 3 }}>
                <Typography variant="h6" color="text.secondary">No product selected or found.</Typography>
                <Button onClick={onBackButtonClick} variant="contained" startIcon={<ArrowLeft />} sx={{ mt: 2, textTransform: 'none', backgroundColor: '#4f46e5', '&:hover': { backgroundColor: '#4338ca' } }}>
                    Back to Dashboard
                </Button>
            </Box>
        );
    }

    const totalProgress = PRODUCT_TABS_ORDER.reduce((sum, tabName, index) => {
        const productTabName = tabName.toLowerCase().replace(/ /g, '_');
        const isCompleted = product?.completed_tabs?.[productTabName];
        return sum + (isCompleted ? TAB_PROGRESS_PERCENTAGES[tabName] : 0);
    }, 0);

    return (
        <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            height: '100vh', 
            fontFamily: 'Inter, sans-serif', 
            bgcolor: '#f9fafb',
            overflowY: 'auto' 
        }}>
            <Box sx={{ p: 3, pb: 0, borderBottom: '1px solid #e0e7ff', bgcolor: '#fff', position: 'sticky', top: 0, zIndex: 1000 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <IconButton onClick={onBackButtonClick} sx={{ mr: 2, color: '#4f46e5' }}>
                        <ArrowLeft size={24} />
                    </IconButton>
                    <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
                        {isEditingName ? (
                            <TextField
                                value={editedProductName}
                                onChange={(e) => setEditedProductName(e.target.value)}
                                onBlur={handleSaveProductDetails}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                        handleSaveProductDetails();
                                        e.target.blur();
                                    }
                                }}
                                autoFocus
                                size="small"
                                sx={{ 
                                    minWidth: '200px', 
                                    '.MuiOutlinedInput-notchedOutline': { border: 'none' },
                                    '.MuiInputBase-input': { p: 0, fontWeight: 'bold', fontSize: '1.875rem' }
                                }}
                            />
                        ) : (
                            <Typography 
                                variant="h4" 
                                component="h1" 
                                sx={{ 
                                    fontWeight: 'bold', 
                                    color: '#111827', 
                                    cursor: 'pointer', 
                                    '&:hover': { color: '#4f46e5' } 
                                }}
                                onClick={() => setIsEditingName(true)}
                            >
                                {product.name}
                            </Typography>
                        )}
                        {isSavingProductDetails && <CircularProgress size={20} sx={{ ml: 2, color: '#4f46e5' }} />}
                    </Box>
                    <Chip 
                        label={product.status} 
                        sx={{ 
                            ml: 2, 
                            fontWeight: 'bold', 
                            color: '#fff', 
                            backgroundColor: product.status === 'Active' ? '#22c55e' : '#ef4444' 
                        }} 
                    />
                </Box>
                {isEditingDescription ? (
                    <TextField
                        value={editedProductDescription}
                        onChange={(e) => setEditedProductDescription(e.target.value)}
                        onBlur={handleSaveProductDetails}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                                handleSaveProductDetails();
                                e.target.blur();
                            }
                        }}
                        multiline
                        fullWidth
                        size="small"
                        sx={{ 
                            mt: 1, 
                            '.MuiOutlinedInput-notchedOutline': { border: 'none' },
                            '.MuiInputBase-input': { p: 0, fontSize: '0.975rem', color: '#4b5563' }
                        }}
                    />
                ) : (
                    <Typography 
                        variant="body1" 
                        sx={{ 
                            color: '#4b5563', 
                            mb: 2, 
                            cursor: 'pointer', 
                            '&:hover': { color: '#4f46e5' } 
                        }}
                        onClick={() => setIsEditingDescription(true)}
                    >
                        {product.description || "Add a product description..."}
                    </Typography>
                )}

                <LinearProgress 
                    variant="determinate" 
                    value={totalProgress} 
                    sx={{ 
                        height: 8, 
                        borderRadius: 5, 
                        mb: 2, 
                        bgcolor: '#e0e7ff', 
                        '& .MuiLinearProgress-bar': { bgcolor: '#4f46e5' } 
                    }} 
                />
                <Typography variant="body2" sx={{ color: '#4b5563', textAlign: 'right', mb: 2 }}>
                    Overall Progress: {totalProgress}%
                </Typography>

                <Tabs 
                    value={selectedProductTab} 
                    onChange={handleTabChange} 
                    variant="scrollable" 
                    scrollButtons="auto"
                    aria-label="product detail tabs"
                    sx={{
                        '& .MuiTabs-indicator': { backgroundColor: '#4f46e5' },
                        '& .MuiTab-root': {
                            textTransform: 'none',
                            fontWeight: 'bold',
                            color: '#6b7280',
                            '&.Mui-selected': {
                                color: '#4f46e5',
                            },
                        },
                    }}
                >
                    {PRODUCT_TABS_ORDER.map((tabName, index) => (
                        <Tab 
                            key={tabName} 
                            label={tabName} 
                            id={`product-tab-${index}`} 
                            aria-controls={`product-tabpanel-${index}`} 
                            icon={
                                product?.completed_tabs?.[tabName.toLowerCase().replace(/ /g, '_')] ? <CheckCircle size={16} /> : null
                            }
                            iconPosition="end"
                        />
                    ))}
                </Tabs>
            </Box>

            {/* Tab Panels */}
            <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
                {/* Research Tab */}
                <TabPanel value={selectedProductTab} index={0}>
                    <Grid container spacing={3} sx={{ flexGrow: 1 }}>
                        <Grid item xs={12} md={6} sx={{ display: 'flex', flexDirection: 'column' }}>
                            <Paper elevation={1} sx={{ p: 3, mb: 3, flexShrink: 0, bgcolor: '#f0f4ff', borderRadius: '0.75rem' }}>
                                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, display: 'flex', alignItems: 'center', color: '#374151' }}>
                                    <MessageSquare size={20} style={{ marginRight: '0.5rem' }} /> AI Research Chat
                                </Typography>
                                <Box sx={{ 
                                    height: '300px', 
                                    overflowY: 'auto', 
                                    mb: 2, 
                                    border: '1px solid #e0e7ff', 
                                    borderRadius: '0.5rem', 
                                    p: 2, 
                                    bgcolor: '#fff',
                                    display: 'flex',
                                    flexDirection: 'column-reverse' // Show latest messages at bottom
                                }}>
                                    {researchChatHistory.slice().reverse().map((msg, index) => (
                                        <Box 
                                            key={index} 
                                            sx={{ 
                                                mb: 1, 
                                                p: 1.5, 
                                                borderRadius: '0.75rem', 
                                                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                                bgcolor: msg.role === 'user' ? '#e0e7ff' : '#f3f4f6',
                                                color: msg.role === 'user' ? '#374151' : '#1f2937',
                                                maxWidth: '80%',
                                                textAlign: msg.role === 'user' ? 'right' : 'left'
                                            }}
                                        >
                                            <Typography variant="caption" sx={{ fontSize: '0.7rem', color: '#6b7280', display: 'block', mb: 0.5 }}>
                                                {msg.role === 'user' ? userName : 'AI'} @ {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                                            </Typography>
                                            <Typography variant="body2">{msg.content}</Typography>
                                            {msg.role === 'ai' && msg.content.includes("Error:") && (
                                                <Button 
                                                    size="small" 
                                                    startIcon={<RefreshCw size={14} />} 
                                                    onClick={() => regenerateResearchResponse(researchChatHistory[researchChatHistory.indexOf(msg) - 1]?.content, researchChatHistory.slice(0, researchChatHistory.indexOf(msg) - 1))}
                                                    sx={{ mt: 1, textTransform: 'none', fontSize: '0.75rem', color: '#4f46e5' }}
                                                >
                                                    Retry
                                                </Button>
                                            )}
                                        </Box>
                                    ))}
                                    {isResearchAILoading && (
                                        <Box sx={{ display: 'flex', alignItems: 'center', p: 1.5, borderRadius: '0.75rem', bgcolor: '#f3f4f6', color: '#1f2937', maxWidth: '80%', alignSelf: 'flex-start' }}>
                                            <CircularProgress size={16} sx={{ mr: 1, color: '#4f46e5' }} />
                                            <Typography variant="body2">AI is typing...</Typography>
                                        </Box>
                                    )}
                                </Box>
                                <TextField
                                    fullWidth
                                    variant="outlined"
                                    placeholder="Ask the AI about market research, user needs, etc."
                                    value={currentResearchPrompt}
                                    onChange={handleResearchPromptChange}
                                    onKeyPress={(e) => { if (e.key === 'Enter') sendResearchPrompt(); }}
                                    InputProps={{
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton onClick={sendResearchPrompt} disabled={isResearchAILoading}>
                                                    {isResearchAILoading ? <CircularProgress size={20} /> : <Send size={20} />}
                                                </IconButton>
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                            </Paper>
                        </Grid>
                        <Grid item xs={12} md={6} sx={{ display: 'flex', flexDirection: 'column' }}>
                            <Paper elevation={1} sx={{ p: 3, flexGrow: 1, bgcolor: '#fff', borderRadius: '0.75rem', display: 'flex', flexDirection: 'column' }}>
                                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, display: 'flex', alignItems: 'center', color: '#374151' }}>
                                    <BookOpen size={20} style={{ marginRight: '0.5rem' }} /> Research Document
                                </Typography>
                                <Box sx={{ flexGrow: 1, minHeight: '300px' }}>
                                    <Editor 
                                        initialData={researchDocumentData} 
                                        onChange={handleSaveResearchDocument} 
                                        holder={`research-editor-${productId}`} 
                                    />
                                </Box>
                            </Paper>
                        </Grid>
                    </Grid>
                </TabPanel>

                {/* PRD Tab */}
                <TabPanel value={selectedProductTab} index={1}>
                    <Grid container spacing={3} sx={{ flexGrow: 1 }}>
                        <Grid item xs={12} md={6} sx={{ display: 'flex', flexDirection: 'column' }}>
                            <Paper elevation={1} sx={{ p: 3, mb: 3, flexShrink: 0, bgcolor: '#f0f4ff', borderRadius: '0.75rem' }}>
                                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, display: 'flex', alignItems: 'center', color: '#374151' }}>
                                    <MessageSquare size={20} style={{ marginRight: '0.5rem' }} /> AI PRD Chat
                                </Typography>
                                <Box sx={{ 
                                    height: '300px', 
                                    overflowY: 'auto', 
                                    mb: 2, 
                                    border: '1px solid #e0e7ff', 
                                    borderRadius: '0.5rem', 
                                    p: 2, 
                                    bgcolor: '#fff',
                                    display: 'flex',
                                    flexDirection: 'column-reverse'
                                }}>
                                    {prdChatHistory.slice().reverse().map((msg, index) => (
                                        <Box 
                                            key={index} 
                                            sx={{ 
                                                mb: 1, 
                                                p: 1.5, 
                                                borderRadius: '0.75rem', 
                                                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                                bgcolor: msg.role === 'user' ? '#e0e7ff' : '#f3f4f6',
                                                color: msg.role === 'user' ? '#374151' : '#1f2937',
                                                maxWidth: '80%',
                                                textAlign: msg.role === 'user' ? 'right' : 'left'
                                            }}
                                        >
                                            <Typography variant="caption" sx={{ fontSize: '0.7rem', color: '#6b7280', display: 'block', mb: 0.5 }}>
                                                {msg.role === 'user' ? userName : 'AI'} @ {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                                            </Typography>
                                            <Typography variant="body2">{msg.content}</Typography>
                                            {msg.role === 'ai' && msg.content.includes("Error:") && (
                                                <Button 
                                                    size="small" 
                                                    startIcon={<RefreshCw size={14} />} 
                                                    onClick={() => regeneratePrdResponse(prdChatHistory[prdChatHistory.indexOf(msg) - 1]?.content, prdChatHistory.slice(0, prdChatHistory.indexOf(msg) - 1))}
                                                    sx={{ mt: 1, textTransform: 'none', fontSize: '0.75rem', color: '#4f46e5' }}
                                                >
                                                    Retry
                                                </Button>
                                            )}
                                        </Box>
                                    ))}
                                    {isPrdAILoading && (
                                        <Box sx={{ display: 'flex', alignItems: 'center', p: 1.5, borderRadius: '0.75rem', bgcolor: '#f3f4f6', color: '#1f2937', maxWidth: '80%', alignSelf: 'flex-start' }}>
                                            <CircularProgress size={16} sx={{ mr: 1, color: '#4f46e5' }} />
                                            <Typography variant="body2">AI is typing...</Typography>
                                        </Box>
                                    )}
                                </Box>
                                <TextField
                                    fullWidth
                                    variant="outlined"
                                    placeholder="Ask the AI to help with PRD sections, requirements, etc."
                                    value={currentPrdPrompt}
                                    onChange={handlePrdPromptChange}
                                    onKeyPress={(e) => { if (e.key === 'Enter') sendPrdPrompt(); }}
                                    InputProps={{
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton onClick={sendPrdPrompt} disabled={isPrdAILoading}>
                                                    {isPrdAILoading ? <CircularProgress size={20} /> : <Send size={20} />}
                                                </IconButton>
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                            </Paper>
                        </Grid>
                        <Grid item xs={12} md={6} sx={{ display: 'flex', flexDirection: 'column' }}>
                            <Paper elevation={1} sx={{ p: 3, flexGrow: 1, bgcolor: '#fff', borderRadius: '0.75rem', display: 'flex', flexDirection: 'column' }}>
                                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, display: 'flex', alignItems: 'center', color: '#374151' }}>
                                    <FileText size={20} style={{ marginRight: '0.5rem' }} /> Product Requirements Document (PRD)
                                </Typography>
                                <Box sx={{ flexGrow: 1, minHeight: '300px' }}>
                                    <Editor 
                                        initialData={prdDocumentData} 
                                        onChange={handleSavePrdDocument} 
                                        holder={`prd-editor-${productId}`} 
                                    />
                                </Box>
                            </Paper>
                        </Grid>
                    </Grid>
                </TabPanel>

                {/* Design Tab - Placeholder */}
                <TabPanel value={selectedProductTab} index={2}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                        <Typography variant="h5" sx={{ mb: 2, color: '#6b7280' }}>Design Collaboration Coming Soon!</Typography>
                        <Typography variant="body1" sx={{ color: '#9ca3af', textAlign: 'center', maxWidth: '600px' }}>
                            This section will integrate with design tools and allow you to manage your product's UI/UX.
                        </Typography>
                    </Box>
                </TabPanel>

                {/* Development Tab - Placeholder */}
                <TabPanel value={selectedProductTab} index={3}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                        <Typography variant="h5" sx={{ mb: 2, color: '#6b7280' }}>Development Tracking Coming Soon!</Typography>
                        <Typography variant="body1" sx={{ color: '#9ca3af', textAlign: 'center', maxWidth: '600px' }}>
                            Track development progress, link to repositories, and manage sprints directly from here.
                        </Typography>
                    </Box>
                </TabPanel>

                {/* Tech Documentation Tab - Placeholder */}
                <TabPanel value={selectedProductTab} index={4}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                        <Typography variant="h5" sx={{ mb: 2, color: '#6b7280' }}>Technical Documentation Hub Coming Soon!</Typography>
                        <Typography variant="body1" sx={{ color: '#9ca3af', textAlign: 'center', maxWidth: '600px' }}>
                            Generate and manage technical specifications, API docs, and architecture diagrams automatically.
                        </Typography>
                    </Box>
                </TabPanel>

                {/* Launch and Training Tab - Placeholder */}
                <TabPanel value={selectedProductTab} index={5}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                        <Typography variant="h5" sx={{ mb: 2, color: '#6b7280' }}>Launch & Training Planning Coming Soon!</Typography>
                        <Typography variant="body1" sx={{ color: '#9ca3af', textAlign: 'center', maxWidth: '600px' }}>
                            Plan your product launch, create training materials, and manage go-to-market strategies.
                        </Typography>
                    </Box>
                </TabPanel>

                {/* Feedback Tab */}
                <TabPanel value={selectedProductTab} index={6}>
                    <Grid container spacing={3} sx={{ flexGrow: 1 }}>
                        <Grid item xs={12} md={6} sx={{ display: 'flex', flexDirection: 'column' }}>
                            <Paper elevation={1} sx={{ p: 3, flexGrow: 1, bgcolor: '#fff', borderRadius: '0.75rem', display: 'flex', flexDirection: 'column' }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                    <Typography variant="h6" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', color: '#374151' }}>
                                        <Users size={20} style={{ marginRight: '0.5rem' }} /> Customer Interviews
                                    </Typography>
                                    <Button 
                                        variant="contained" 
                                        startIcon={<PlusCircle size={18} />} 
                                        onClick={() => setShowAddInterviewModal(true)}
                                        sx={{ textTransform: 'none', backgroundColor: '#4f46e5', '&:hover': { backgroundColor: '#4338ca' } }}
                                    >
                                        Add Interview
                                    </Button>
                                </Box>
                                <List sx={{ flexGrow: 1, overflowY: 'auto', border: '1px solid #e0e7ff', borderRadius: '0.5rem' }}>
                                    {customerInterviews.length === 0 ? (
                                        <ListItem>
                                            <ListItemText primary="No interviews yet. Add your first customer interview!" sx={{ color: '#6b7280', textAlign: 'center', py: 3 }} />
                                        </ListItem>
                                    ) : (
                                        customerInterviews.map(interview => (
                                            <ListItem 
                                                key={interview.id} 
                                                secondaryAction={
                                                    <IconButton edge="end" aria-label="delete" onClick={() => handleDeleteInterview(interview.id)}>
                                                        <Trash2 size={20} color="#ef4444" />
                                                    </IconButton>
                                                }
                                                onClick={() => handleSelectInterview(interview.id)}
                                                sx={{ 
                                                    '&:hover': { backgroundColor: '#f5f3ff', cursor: 'pointer' },
                                                    bgcolor: selectedInterview?.id === interview.id ? '#eef2ff' : 'transparent'
                                                }}
                                            >
                                                <ListItemAvatar>
                                                    <Avatar sx={{ bgcolor: '#e0e7ff', color: '#4f46e5' }}>{interview.customer_name.charAt(0).toUpperCase()}</Avatar>
                                                </ListItemAvatar>
                                                <ListItemText 
                                                    primary={interview.customer_name} 
                                                    secondary={`${interview.customer_email} - ${new Date(interview.interview_date).toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`} 
                                                />
                                            </ListItem>
                                        ))
                                    )}
                                </List>
                            </Paper>
                        </Grid>
                        <Grid item xs={12} md={6} sx={{ display: 'flex', flexDirection: 'column' }}>
                            <Paper elevation={1} sx={{ p: 3, flexGrow: 1, bgcolor: '#fff', borderRadius: '0.75rem', display: 'flex', flexDirection: 'column' }}>
                                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, display: 'flex', alignItems: 'center', color: '#374151' }}>
                                    <ClipboardList size={20} style={{ marginRight: '0.5rem' }} /> Interview Notes
                                </Typography>
                                {selectedInterview ? (
                                    <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                                        <Typography variant="body2" sx={{ color: '#6b7280', mb: 1 }}>
                                            Notes for: <Typography component="span" sx={{ fontWeight: 'bold' }}>{selectedInterview.customer_name}</Typography>
                                        </Typography>
                                        <Box sx={{ flexGrow: 1, minHeight: '200px', mb: 2 }}>
                                            <Editor 
                                                initialData={interviewNotesData} 
                                                onChange={handleSaveInterviewNotes} 
                                                holder={`interview-notes-editor-${selectedInterview.id}`} 
                                            />
                                        </Box>
                                        <Button 
                                            variant="outlined" 
                                            startIcon={isTemplateAILoading ? <CircularProgress size={18} /> : <Sparkles size={18} />} 
                                            onClick={generateInterviewSummary}
                                            disabled={isTemplateAILoading || !interviewNotesData || interviewNotesData?.blocks?.length === 0}
                                            sx={{ textTransform: 'none', borderColor: '#4f46e5', color: '#4f46e5', '&:hover': { bgcolor: '#eef2ff' } }}
                                        >
                                            Generate AI Summary
                                        </Button>
                                        {interviewSummaryData && (
                                            <Box sx={{ mt: 3, borderTop: '1px solid #e0e7ff', pt: 3 }}>
                                                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, display: 'flex', alignItems: 'center', color: '#374151' }}>
                                                    <MessageCircle size={20} style={{ marginRight: '0.5rem' }} /> AI Summary
                                                </Typography>
                                                <Editor initialData={interviewSummaryData} readOnly={true} holder={`interview-summary-editor-${selectedInterview.id}`} />
                                            </Box>
                                        )}
                                    </Box>
                                ) : (
                                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexGrow: 1, color: '#6b7280' }}>
                                        <Info size={48} color="#d1d5db" />
                                        <Typography variant="body1" sx={{ mt: 2 }}>Select an interview to view/edit notes and generate summary.</Typography>
                                    </Box>
                                )}
                            </Paper>
                        </Grid>
                    </Grid>
                </TabPanel>

                {/* Tasks Tab - Placeholder */}
                <TabPanel value={selectedProductTab} index={7}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                        <Typography variant="h5" sx={{ mb: 2, color: '#6b7280' }}>Task Management Coming Soon!</Typography>
                        <Typography variant="body1" sx={{ color: '#9ca3af', textAlign: 'center', maxWidth: '600px' }}>
                            Manage all tasks related to your product, assign team members, and track deadlines.
                        </Typography>
                    </Box>
                </TabPanel>

                {/* Repo Tab - Placeholder */}
                <TabPanel value={selectedProductTab} index={8}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                        <Typography variant="h5" sx={{ mb: 2, color: '#6b7280' }}>Repository Integration Coming Soon!</Typography>
                        <Typography variant="body1" sx={{ color: '#9ca3af', textAlign: 'center', maxWidth: '600px' }}>
                            Connect your code repositories to view commits, branches, and pull requests.
                        </Typography>
                    </Box>
                </TabPanel>

                {/* Important Notes Tab - Placeholder */}
                <TabPanel value={selectedProductTab} index={9}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                        <Typography variant="h5" sx={{ mb: 2, color: '#6b7280' }}>Important Notes Coming Soon!</Typography>
                        <Typography variant="body1" sx={{ color: '#9ca3af', textAlign: 'center', maxWidth: '600px' }}>
                            A dedicated space for crucial product notes, decisions, and knowledge base articles.
                        </Typography>
                    </Box>
                </TabPanel>
            </Box>

            {/* Add/Edit Interview Modal */}
            <Dialog open={showAddInterviewModal} onClose={() => setShowAddInterviewModal(false)} PaperProps={{ sx: { borderRadius: '1rem' } }}>
                <DialogTitle sx={{ fontWeight: 'bold', color: '#111827' }}>Add New Customer Interview</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        id="customer-name"
                        label="Customer Name"
                        type="text"
                        fullWidth
                        variant="outlined"
                        value={newInterviewCustomerName}
                        onChange={(e) => setNewInterviewCustomerName(e.target.value)}
                        sx={{ mb: 2 }}
                    />
                    <TextField
                        margin="dense"
                        id="customer-email"
                        label="Customer Email"
                        type="email"
                        fullWidth
                        variant="outlined"
                        value={newInterviewCustomerEmail}
                        onChange={(e) => setNewInterviewCustomerEmail(e.target.value)}
                        sx={{ mb: 2 }}
                    />
                    <TextField
                        margin="dense"
                        id="interview-date"
                        label="Interview Date & Time"
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
                <DialogActions>
                    <Button onClick={() => setShowAddInterviewModal(false)} sx={{ color: '#6b7280', textTransform: 'none' }}>Cancel</Button>
                    <Button 
                        onClick={handleAddInterview} 
                        variant="contained" 
                        sx={{ textTransform: 'none', backgroundColor: '#4f46e5', '&:hover': { backgroundColor: '#4338ca' } }}
                    >
                        Add Interview
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Interview Template Modal */}
            <Dialog open={showTemplateModal} onClose={() => setShowTemplateModal(false)} PaperProps={{ sx: { borderRadius: '1rem', width: '100%', maxWidth: '800px' } }}>
                <DialogTitle sx={{ fontWeight: 'bold', color: '#111827' }}>
                    {selectedTemplate ? "Edit Interview Template" : "New Interview Template"}
                </DialogTitle>
                <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column' }}>
                    <TextField
                        autoFocus
                        margin="dense"
                        id="template-name"
                        label="Template Name"
                        type="text"
                        fullWidth
                        variant="outlined"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        sx={{ mb: 2 }}
                    />
                    <Box sx={{ flexGrow: 1, minHeight: '300px', mb: 2 }}>
                        <Editor 
                            initialData={templateQuestionsData} 
                            onChange={setTemplateQuestionsData} 
                            holder={`template-editor-${selectedTemplate?.id || 'new'}`} 
                        />
                    </Box>
                    <Button 
                        variant="outlined" 
                        startIcon={isTemplateAILoading ? <CircularProgress size={18} /> : <Sparkles size={18} />} 
                        onClick={generateQuestionsFromTemplate}
                        disabled={isTemplateAILoading || !templateName.trim()}
                        sx={{ textTransform: 'none', borderColor: '#4f46e5', color: '#4f46e5', '&:hover': { bgcolor: '#eef2ff' }, mb: 2 }}
                    >
                        Generate Questions with AI
                    </Button>
                    <Divider sx={{ mb: 2 }} />
                    <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, display: 'flex', alignItems: 'center', color: '#374151' }}>
                        <BookOpen size={20} style={{ marginRight: '0.5rem' }} /> Existing Templates
                    </Typography>
                    <List sx={{ border: '1px solid #e0e7ff', borderRadius: '0.5rem', maxHeight: '200px', overflowY: 'auto' }}>
                        {interviewTemplates.length === 0 ? (
                            <ListItem>
                                <ListItemText primary="No templates created yet." sx={{ color: '#6b7280', textAlign: 'center', py: 1 }} />
                            </ListItem>
                        ) : (
                            interviewTemplates.map(template => (
                                <ListItem
                                    key={template.id}
                                    secondaryAction={
                                        <IconButton edge="end" aria-label="delete" onClick={() => handleDeleteTemplate(template.id)}>
                                            <Trash2 size={20} color="#ef4444" />
                                        </IconButton>
                                    }
                                    onClick={() => handleSelectTemplate(template)}
                                    sx={{ 
                                        '&:hover': { backgroundColor: '#f5f3ff', cursor: 'pointer' },
                                        bgcolor: selectedTemplate?.id === template.id ? '#eef2ff' : 'transparent'
                                    }}
                                >
                                    <ListItemText primary={template.name} />
                                </ListItem>
                            ))
                        )}
                    </List>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => {
                        setShowTemplateModal(false);
                        setSelectedTemplate(null); // Clear selected template on close
                        setTemplateName('');
                        setTemplateQuestionsData(null);
                    }} sx={{ color: '#6b7280', textTransform: 'none' }}>
                        Cancel
                    </Button>
                    {selectedTemplate && (
                        <Button 
                            onClick={handleUseTemplate} 
                            variant="outlined" 
                            sx={{ textTransform: 'none', borderColor: '#22c55e', color: '#22c55e', '&:hover': { bgcolor: '#e6ffe6' } }}
                        >
                            Use This Template
                        </Button>
                    )}
                    <Button 
                        onClick={() => {
                            if (selectedTemplate) {
                                handleSaveTemplateQuestions(templateQuestionsData);
                            } else {
                                handleAddTemplate();
                            }
                        }} 
                        variant="contained" 
                        sx={{ textTransform: 'none', backgroundColor: '#4f46e5', '&:hover': { backgroundColor: '#4338ca' } }}
                    >
                        {selectedTemplate ? "Save Template" : "Create Template"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

// --- Main App Component ---
function App() {
    const [products, setProducts] = useState([]); 
    const [selectedProduct, setSelectedProduct] = useState(null); // This is now the product *object*
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

    // State for ProductDetail view (new state for navigation)
    const [viewingProductId, setViewingProductId] = useState(null);

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
        if (lottieContainer.current && !selectedProduct && !viewingProductId) { // Only load Lottie if no product is selected or being viewed
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
                        "v": "5.7.4", "fr": 60, "ip": 0, "op": 120, "wh": 100, "ht": 100, "nm": "Empty State", "ddd": 0, "assets": [], "layers": [
                            { "ddd": 0, "ind": 1, "ty": 4, "nm": "Folder", "sr": 1, "ks": { "o": { "a": 0, "k": 100, "ix": 11 }, "rp": { "a": 0, "k": 0, "ix": 12 }, "s": { "a": 0, "k": [100, 100, 100], "ix": 6 }, "r": { "a": 0, "k": 0, "ix": 10 }, "p": { "a": 0, "k": [50, 50, 0], "ix": 2 }, "a": { "a": 0, "k": [50, 50, 0], "ix": 1 } }, "ao": 0, "shapes": [{ "ty": "gr", "it": [{ "ind": 0, "ty": "sh", "ix": 1, "ks": { "k": { "i": [{ "x": 0.833, "y": 0.833 }, { "x": 0.833, "y": 0.833 }, { "x": 0.833, "y": 0.833 }, { "x": 0.833, "y": 0.833 }], "o": [{ "x": 0.167, "y": 0.167 }, { "x": 0.167, "y": 0.167 }, { "x": 0.167, "y": 0.167 }, { "x": 0.167, "y": 0.167 }], "v": [[30, 80], [70, 80], [70, 20], [30, 20]] }, "ix": 2 }, "nm": "Rectangle Path", "mn": "ADBE Vector Shape - Group", "hd": false }, { "ty": "fl", "c": { "a": 0, "k": [0.8, 0.8, 0.8, 1], "ix": 3 }, "o": { "a": 0, "k": 100, "ix": 4 }, "r": 1, "nm": "Fill 1", "mn": "ADBE Vector Fill", "hd": false }, { "ty": "st", "c": { "a": 0, "k": [0.5, 0.5, 0.5, 1], "ix": 5 }, "o": { "a": 0, "k": 100, "ix": 6 }, "w": { "a": 0, "k": 2, "ix": 7 }, "lc": 1, "lj": 1, "ml": 4, "nm": "Stroke 1", "mn": "ADBE Vector Stroke", "hd": false }], "nm": "Rectangle 1", "mn": "ADBE Vector Group", "hd": false }, { "ty": "gr", "it": [{ "ind": 0, "ty": "sh", "ix": 1, "ks": { "k": { "i": [{ "x": 0.833, "y": 0.833 }, { "x": 0.833, "y": 0.833 }, { "x": 0.833, "y": 0.833 }, { "x": 0.833, "y": 0.833 }], "o": [{ "x": 0.167, "y": 0.167 }, { "x": 0.167, "y": 0.167 }, { "x": 0.167, "y": 0.167 }, { "x": 0.167, "y": 0.167 }], "v": [[30, 80], [70, 80], [70, 20], [30, 20]] }, "ix": 2 }, "nm": "Rectangle Path", "mn": "ADBE Vector Shape - Group", "hd": false }, { "ty": "fl", "c": { "a": 0, "k": [0.9, 0.9, 0.9, 1], "ix": 3 }, "o": { "a": 0, "k": 100, "ix": 4 }, "r": 1, "nm": "Fill 1", "mn": "ADBE Vector Fill", "hd": false }, { "ty": "st", "c": { "a": 0, "k": [0.6, 0.6, 0.6, 1], "ix": 5 }, "o": { "a": 0, "k": 100, "ix": 6 }, "w": { "a": 0, "k": 2, "ix": 7 }, "lc": 1, "lj": 1, "ml": 4, "nm": "Stroke 1", "mn": "ADBE Vector Stroke", "hd": false }], "nm": "Rectangle 2", "mn": "ADBE Vector Group", "hd": false, "tf": true }, { "ty": "gr", "it": [{ "ind": 0, "ty": "sh", "ix": 1, "ks": { "k": { "i": [{ "x": 0.833, "y": 0.833 }, { "x": 0.833, "y": 0.833 }, { "x": 0.833, "y": 0.833 }, { "x": 0.833, "y": 0.833 }], "o": [{ "x": 0.167, "y": 0.167 }, { "x": 0.167, "y": 0.167 }, { "x": 0.167, "y": 0.167 }, { "x": 0.167, "y": 0.167 }], "v": [[30, 80], [70, 80], [70, 20], [30, 20]] }, "ix": 2 }, "nm": "Rectangle Path", "mn": "ADBE Vector Shape - Group", "hd": false }, { "ty": "fl", "c": { "a": 0, "k": [0.8, 0.8, 0.8, 1], "ix": 3 }, "o": { "a": 0, "k": 100, "ix": 4 }, "r": 1, "nm": "Fill 1", "mn": "ADBE Vector Fill", "hd": false }, { "ty": "st", "c": { "a": 0, "k": [0.5, 0.5, 0.5, 1], "ix": 5 }, "o": { "a": 0, "k": 100, "ix": 6 }, "w": { "a": 0, "k": 2, "ix": 7 }, "lc": 1, "lj": 1, "ml": 4, "nm": "Stroke 1", "mn": "ADBE Vector Stroke", "hd": false }], "nm": "Rectangle 3", "mn": "ADBE Vector Group", "hd": false }, { "ty": "gr", "it": [{ "ind": 0, "ty": "sh", "ix": 1, "ks": { "k": { "i": [{ "x": 0.833, "y": 0.833 }, { "x": 0.833, "y": 0.833 }, { "x": 0.833, "y": 0.833 }, { "x": 0.833, "y": 0.833 }], "o": [{ "x": 0.167, "y": 0.167 }, { "x": 0.167, "y": 0.167 }, { "x": 0.167, "y": 0.167 }, { "x": 0.167, "y": 0.167 }], "v": [[30, 80], [70, 80], [70, 20], [30, 20]] }, "ix": 2 }, "nm": "Rectangle Path", "mn": "ADBE Vector Shape - Group", "hd": false }, { "ty": "fl", "c": { "a": 0, "k": [0.9, 0.9, 0.9, 1], "ix": 3 }, "o": { "a": 0, "k": 100, "ix": 4 }, "r": 1, "nm": "Fill 1", "mn": "ADBE Vector Fill", "hd": false }, { "ty": "st", "c": { "a": 0, "k": [0.6, 0.6, 0.6, 1], "ix": 5 }, "o": { "a": 0, "k": 100, "ix": 6 }, "w": { "a": 0, "k": 2, "ix": 7 }, "lc": 1, "lj": 1, "ml": 4, "nm": "Stroke 1", "mn": "ADBE Vector Stroke", "hd": false }], "nm": "Rectangle 4", "mn": "ADBE Vector Group", "hd": false, "tf": true }, { "ty": "gr", "it": [{ "ind": 0, "ty": "sh", "ix": 1, "ks": { "k": { "i": [{ "x": 0.833, "y": 0.833 }, { "x": 0.833, "y": 0.833 }, { "x": 0.833, "y": 0.833 }, { "x": 0.833, "y": 0.833 }], "o": [{ "x": 0.167, "y": 0.167 }, { "x": 0.167, "y": 0.167 }, { "x": 0.167, "y": 0.167 }, { "x": 0.167, "y": 0.167 }], "v": [[30, 80], [70, 80], [70, 20], [30, 20]] }, "ix": 2 }, "nm": "Rectangle Path", "mn": "ADBE Vector Shape - Group", "hd": false }, { "ty": "fl", "c": { "a": 0, "k": [0.8, 0.8, 0.8, 1], "ix": 3 }, "o": { "a": 0, "k": 100, "ix": 4 }, "r": 1, "nm": "Fill 1", "mn": "ADBE Vector Fill", "hd": false }, { "ty": "st", "c": { "a": 0, "k": [0.5, 0.5, 0.5, 1], "ix": 5 }, "o": { "a": 0, "k": 100, "ix": 6 }, "w": { "a": 0, "k": 2, "ix": 7 }, "lc": 1, "lj": 1, "ml": 4, "nm": "Stroke 1", "mn": "ADBE Vector Stroke", "hd": false }], "nm": "Rectangle 5", "mn": "ADBE Vector Group", "hd": false }, { "ty": "gr", "it": [{ "ind": 0, "ty": "sh", "ix": 1, "ks": { "k": { "i": [{ "x": 0.833, "y": 0.833 }, { "x": 0.833, "y": 0.833 }, { "x": 0.833, "y": 0.833 }, { "x": 0.833, "y": 0.833 }], "o": [{ "x": 0.167, "y": 0.167 }, { "x": 0.167, "y": 0.167 }, { "x": 0.167, "y": 0.167 }, { "x": 0.167, "y": 0.167 }], "v": [[30, 80], [70, 80], [70, 20], [30, 20]] }, "ix": 2 }, "nm": "Rectangle Path", "mn": "ADBE Vector Shape - Group", "hd": false }, { "ty": "fl", "c": { "a": 0, "k": [0.9, 0.9, 0.9, 1], "ix": 3 }, "o": { "a": 0, "k": 100, "ix": 4 }, "r": 1, "nm": "Fill 1", "mn": "ADBE Vector Fill", "hd": false }, { "ty": "st", "c": { "a": 0, "k": [0.6, 0.6, 0.6, 1], "ix": 5 }, "o": { "a": 0, "k": 100, "ix": 6 }, "w": { "a": 0, "k": 2, "ix": 7 }, "lc": 1, "lj": 1, "ml": 4, "nm": "Stroke 1", "mn": "ADBE Vector Stroke", "hd": false }], "nm": "Rectangle 6", "mn": "ADBE Vector Group", "hd": false, "tf": true }
                        ]
                    }
                });
            }
        } else if (lottieInstance.current && (selectedProduct || viewingProductId)) {
            // Destroy Lottie animation when a product is selected/viewed
            lottieInstance.current.destroy();
            lottieInstance.current = null;
        }

        return () => {
            if (lottieInstance.current) {
                lottieInstance.current.destroy();
                lottieInstance.current = null;
            }
        };
    }, [selectedProduct, viewingProductId]); // Dependency array includes new state


    const token = localStorage.getItem('token');

    useEffect(() => {
        const checkLoginStatus = () => {
            if (token) {
                setIsLoggedIn(true);
                // In a real app, you'd validate the token with the backend
                // For now, we'll just assume it's valid and fetch user info
                fetchUserInfo();
                fetchProducts();
            } else {
                setIsLoggedIn(false);
            }
        };

        checkLoginStatus();

        // Optional: Set up an interval to refresh token or check login status periodically
        const interval = setInterval(checkLoginStatus, 3600 * 1000); // Every hour
        return () => clearInterval(interval);
    }, [token]);

    const fetchUserInfo = async () => {
        if (!token) return;
        try {
            const response = await axios.get(`${API_URL}/api/user`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUserName(response.data.username || 'User');
            setUserTimezone(response.data.timezone || 'UTC+05:30 (Chennai)');
        } catch (err) {
            console.error("Failed to fetch user info:", err);
            // If token is invalid, log out
            if (err.response && err.response.status === 401) {
                handleLogout();
            }
        }
    };


    const fetchProducts = useCallback(async () => {
        if (!token) {
            setProducts([]);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const response = await axios.get(`${API_URL}/api/products`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setProducts(response.data);
        } catch (err) {
            console.error("Failed to fetch products:", err);
            setError("Failed to load products.");
            setSnackbarMessage("Failed to load products. Please try logging in again.");
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
            if (err.response && err.response.status === 401) {
                handleLogout();
            }
        } finally {
            setLoading(false);
        }
    }, [token, setSnackbarMessage, setSnackbarSeverity, setSnackbarOpen]);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    const handleAddProduct = async () => {
        if (!newProductName.trim()) {
            setSnackbarMessage("Product name cannot be empty.");
            setSnackbarSeverity('warning');
            setSnackbarOpen(true);
            return;
        }
        setLoading(true);
        try {
            const productData = { 
                name: newProductName, 
                status: newProductStatus,
                parent_id: newProductParentId || null // Ensure empty string becomes null
            };
            const response = await axios.post(`${API_URL}/api/products`, productData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setProducts(prev => [...prev, response.data]);
            setNewProductName('');
            setNewProductStatus('Active');
            setNewProductParentId('');
            setShowAddProductModal(false);
            setSnackbarMessage("Product added successfully!");
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
        } catch (err) {
            console.error("Error adding product:", err);
            setSnackbarMessage(`Failed to add product: ${err.response?.data?.message || err.message}`);
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateProductStatus = async (productId, newStatus) => {
        try {
            await axios.put(`${API_URL}/api/products/${productId}/status`, { status: newStatus }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setProducts(prev => prev.map(p => p.id === productId ? { ...p, status: newStatus } : p));
            setSnackbarMessage("Product status updated!");
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
        } catch (err) {
            console.error("Failed to update product status:", err);
            setSnackbarMessage("Failed to update product status.");
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        }
    };

    const handleDeleteProduct = async () => {
        if (!productToDeleteId) return;
        setLoading(true);
        try {
            await axios.delete(`${API_URL}/api/products/${productToDeleteId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setProducts(prev => prev.filter(p => p.id !== productToDeleteId));
            setShowDeleteConfirmModal(false);
            setProductToDeleteId(null);
            setSnackbarMessage("Product deleted successfully!");
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
        } catch (err) {
            console.error("Error deleting product:", err);
            setSnackbarMessage(`Failed to delete product: ${err.response?.data?.message || err.message}`);
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        } finally {
            setLoading(false);
        }
    };

    const handleSnackbarClose = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        setSnackbarOpen(false);
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        setIsLoggedIn(false);
        setAuthMessage("You have been logged out.");
        setUserName('User'); // Reset username on logout
        setUserTimezone('UTC+05:30 (Chennai)'); // Reset timezone on logout
        setCurrentPage('dashboard'); // Go back to dashboard view (which will show AuthPage)
        setViewingProductId(null); // Clear any selected product
        setSnackbarMessage("You have been successfully logged out.");
        setSnackbarSeverity('info');
        setSnackbarOpen(true);
    };

    const handleProfileMenuClick = (event) => {
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
        try {
            await axios.put(`${API_URL}/api/user`, {
                username: userName,
                timezone: userTimezone
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSnackbarMessage("Settings saved successfully!");
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
            setCurrentPage('dashboard'); // Go back to dashboard after saving
        } catch (err) {
            console.error("Failed to save settings:", err);
            setSnackbarMessage(`Failed to save settings: ${err.response?.data?.message || err.message}`);
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        }
    };

    const filteredProducts = useMemo(() => {
        let filtered = products;

        if (filterByStatus !== 'All') {
            filtered = filtered.filter(product => product.status === filterByStatus);
        }

        if (searchTerm) {
            filtered = filtered.filter(product =>
                product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                product.description?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Always show parent products above their iterations, and iterations indented
        const sorted = [...filtered].sort((a, b) => {
            // Sort by parent_id first, then by creation_timestamp or name for children
            if (a.parent_id === b.parent_id) {
                if (sortBy === 'newest') {
                    return new Date(b.created_at) - new Date(a.created_at);
                } else if (sortBy === 'oldest') {
                    return new Date(a.created_at) - new Date(b.created_at);
                }
                return a.name.localeCompare(b.name);
            }
            // Logic to group children under parents
            if (a.parent_id === null && b.parent_id !== null) return -1; // Parent before child
            if (a.parent_id !== null && b.parent_id === null) return 1;  // Child after parent
            // If both are children, or both are parents, fall back to creation time/name sort
            return 0;
        });

        // Re-order to ensure parent-child hierarchy is visually represented
        const finalOrder = [];
        const productMap = new Map(sorted.map(p => [p.id, p]));
        const topLevelProducts = sorted.filter(p => p.parent_id === null);

        topLevelProducts.forEach(parent => {
            finalOrder.push(parent);
            const children = sorted.filter(p => p.parent_id === parent.id);
            children.forEach(child => {
                finalOrder.push({ ...child, isIteration: true }); // Mark as iteration for styling
            });
        });

        return finalOrder;

    }, [products, searchTerm, sortBy, filterByStatus]);

    const handleViewProductDetails = (productId) => {
        setViewingProductId(productId);
    };

    const handleBackToDashboard = () => {
        setViewingProductId(null);
        setSelectedProduct(null); // Clear selected product object too
        fetchProducts(); // Refresh products list when returning to dashboard
    };

    if (!isLoggedIn) {
        return (
            <AuthPage 
                setIsLoggedIn={setIsLoggedIn} 
                setAuthMessage={setAuthMessage} 
                setUserName={setUserName} 
                setUserTimezone={setUserTimezone} 
            />
        );
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
    
    if (viewingProductId) {
        return (
            <ProductDetail
                productId={viewingProductId}
                onBackButtonClick={handleBackToDashboard}
                setSnackbarOpen={setSnackbarOpen}
                setSnackbarMessage={setSnackbarMessage}
                setSnackbarSeverity={setSnackbarSeverity}
                userName={userName}
                userTimezone={userTimezone}
            />
        );
    }


    return (
        <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            height: '100vh', 
            fontFamily: 'Inter, sans-serif', 
            background: 'linear-gradient(to bottom right, #f9fafb, #e5e7eb)',
            overflowY: 'hidden' // Prevent main scrollbar when ProductDetail is active
        }}>
            {/* Header / Navbar */}
            <Paper elevation={1} sx={{ 
                width: '100%', 
                p: 2, 
                px: 3,
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                backgroundColor: '#fff',
                borderBottom: '1px solid #e0e7ff',
                boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Sparkles size={32} color="#4f46e5" style={{ marginRight: '0.75rem' }} />
                    <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', color: '#111827' }}>
                        Auto Product Manager
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <IconButton 
                        onClick={handleProfileMenuClick}
                        aria-controls={openProfileMenu ? 'profile-menu' : undefined}
                        aria-haspopup="true"
                        aria-expanded={openProfileMenu ? 'true' : undefined}
                        sx={{ ml: 2, p: 0 }}
                    >
                        <Avatar sx={{ bgcolor: '#e0e7ff', color: '#4f46e5', width: 40, height: 40 }}>
                            {userName.charAt(0).toUpperCase()}
                        </Avatar>
                    </IconButton>
                    <Menu
                        id="profile-menu"
                        anchorEl={anchorElProfileMenu}
                        open={openProfileMenu}
                        onClose={handleProfileMenuClose}
                        MenuListProps={{ 'aria-labelledby': 'profile-button' }}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                        sx={{ '& .MuiPaper-root': { borderRadius: '0.75rem', minWidth: 180, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' } }}
                    >
                        <MenuItem onClick={() => { /* View Profile Page - Not yet implemented */ handleProfileMenuClose(); }} sx={{ py: 1.5, px: 2, '&:hover': { bgcolor: '#f5f3ff' } }}>
                            <User size={18} style={{ marginRight: '0.75rem', color: '#6b7280' }} />
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>{userName}</Typography>
                        </MenuItem>
                        <Divider sx={{ my: '4px' }} />
                        <MenuItem onClick={handleOpenSettings} sx={{ py: 1.5, px: 2, '&:hover': { bgcolor: '#f5f3ff' } }}>
                            <Settings size={18} style={{ marginRight: '0.75rem', color: '#6b7280' }} />
                            <Typography variant="body2">Settings</Typography>
                        </MenuItem>
                        <MenuItem onClick={handleLogout} sx={{ py: 1.5, px: 2, '&:hover': { bgcolor: '#f5f3ff' } }}>
                            <LogOut size={18} style={{ marginRight: '0.75rem', color: '#ef4444' }} />
                            <Typography variant="body2" sx={{ color: '#ef4444' }}>Log Out</Typography>
                        </MenuItem>
                    </Menu>
                </Box>
            </Paper>

            {/* Main Content Area */}
            <Box sx={{ flexGrow: 1, display: 'flex', overflow: 'hidden' }}>
                {/* Sidebar - Product List */}
                <Box sx={{ 
                    width: { xs: '100%', md: '300px' }, 
                    minWidth: '280px',
                    borderRight: '1px solid #e0e7ff', 
                    bgcolor: '#fff', 
                    display: 'flex', 
                    flexDirection: 'column',
                    overflowY: 'auto',
                    p: 2,
                    boxShadow: '2px 0 5px rgba(0,0,0,0.02)'
                }}>
                    <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#111827' }}>Your Products</Typography>
                        <Button 
                            variant="contained" 
                            startIcon={<Plus size={18} />} 
                            onClick={() => setShowAddProductModal(true)}
                            sx={{ 
                                textTransform: 'none', 
                                backgroundColor: '#4f46e5', 
                                '&:hover': { backgroundColor: '#4338ca' } 
                            }}
                        >
                            Add New
                        </Button>
                    </Box>

                    {/* Search and Filter */}
                    <TextField
                        fullWidth
                        variant="outlined"
                        placeholder="Search products..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <Search size={20} color="#9ca3af" />
                                </InputAdornment>
                            ),
                            sx: { borderRadius: '0.5rem' }
                        }}
                        sx={{ mb: 2 }}
                    />
                    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Sort By</InputLabel>
                            <Select
                                value={sortBy}
                                label="Sort By"
                                onChange={(e) => setSortBy(e.target.value)}
                                sx={{ borderRadius: '0.5rem' }}
                            >
                                <MenuItem value="newest">Newest First</MenuItem>
                                <MenuItem value="oldest">Oldest First</MenuItem>
                                <MenuItem value="name">Name (A-Z)</MenuItem>
                            </Select>
                        </FormControl>
                        <FormControl fullWidth size="small">
                            <InputLabel>Status</InputLabel>
                            <Select
                                value={filterByStatus}
                                label="Status"
                                onChange={(e) => setFilterByStatus(e.target.value)}
                                sx={{ borderRadius: '0.5rem' }}
                            >
                                <MenuItem value="All">All</MenuItem>
                                <MenuItem value="Active">Active</MenuItem>
                                <MenuItem value="Archived">Archived</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>

                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                            <CircularProgress sx={{ color: '#4f46e5' }} />
                        </Box>
                    ) : error ? (
                        <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
                    ) : filteredProducts.length === 0 ? (
                        <Box sx={{ textAlign: 'center', mt: 4, color: '#6b7280' }}>
                            <Package size={48} style={{ marginBottom: '1rem', color: '#d1d5db' }} />
                            <Typography variant="h6">No Products Found</Typography>
                            <Typography variant="body2">Click "Add New" to create your first product!</Typography>
                        </Box>
                    ) : (
                        <List component="nav" sx={{ flexGrow: 1, '& .MuiListItemButton-root': { borderRadius: '0.75rem', mb: 1 } }}>
                            {filteredProducts.map((product) => (
                                <Paper 
                                    key={product.id} 
                                    elevation={1} 
                                    sx={{ 
                                        mb: 1, 
                                        borderRadius: '0.75rem', 
                                        overflow: 'hidden',
                                        border: product.id === selectedProduct?.id ? '2px solid #4f46e5' : '1px solid #e0e7ff',
                                        transition: 'all 0.2s',
                                        '&:hover': { 
                                            transform: 'translateY(-2px)', 
                                            boxShadow: '0 4px 8px rgba(0,0,0,0.1)' 
                                        },
                                        ml: product.isIteration ? 4 : 0 // Indent iterations
                                    }}
                                >
                                    <ListItem 
                                        button 
                                        onClick={() => handleViewProductDetails(product.id)}
                                        sx={{ 
                                            py: 1.5, 
                                            px: 2, 
                                            bgcolor: product.id === selectedProduct?.id ? '#eef2ff' : 'transparent',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'flex-start'
                                        }}
                                    >
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#1f2937' }}>
                                                {product.name}
                                            </Typography>
                                            <Chip
                                                label={product.status}
                                                size="small"
                                                sx={{
                                                    backgroundColor: product.status === 'Active' ? '#dcfce7' : '#fee2e2',
                                                    color: product.status === 'Active' ? '#16a34a' : '#ef4444',
                                                    fontWeight: 'bold',
                                                    height: '20px',
                                                    fontSize: '0.75rem'
                                                }}
                                            />
                                        </Box>
                                        <Typography variant="body2" sx={{ color: '#6b7280', fontSize: '0.8rem', mt: 0.5, width: '100%' }}>
                                            Created: {new Date(product.created_at).toLocaleDateString()}
                                        </Typography>
                                        <LinearProgress 
                                            variant="determinate" 
                                            value={product.overall_progress || 0} 
                                            sx={{ 
                                                width: '100%', 
                                                height: 5, 
                                                borderRadius: 5, 
                                                mt: 1, 
                                                bgcolor: '#e0e7ff', 
                                                '& .MuiLinearProgress-bar': { bgcolor: '#4f46e5' } 
                                            }} 
                                        />
                                        <Typography variant="caption" sx={{ color: '#4b5563', textAlign: 'right', width: '100%', mt: 0.5 }}>
                                            {product.overall_progress || 0}% Complete
                                        </Typography>
                                    </ListItem>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1, borderTop: '1px solid #eef2ff' }}>
                                        <IconButton 
                                            size="small" 
                                            onClick={(e) => { 
                                                e.stopPropagation(); 
                                                // setSelectedProduct(product); // This might be needed if you want to use selectedProduct for something else
                                                // handleOpenEditProductModal(); // Placeholder for edit modal
                                                setSnackbarMessage("Edit functionality coming soon!");
                                                setSnackbarSeverity('info');
                                                setSnackbarOpen(true);
                                            }}
                                            sx={{ color: '#6b7280', '&:hover': { color: '#4f46e5', bgcolor: '#eef2ff' } }}
                                        >
                                            <Edit size={16} />
                                        </IconButton>
                                        <IconButton 
                                            size="small" 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setProductToDeleteId(product.id);
                                                setShowDeleteConfirmModal(true);
                                            }}
                                            sx={{ color: '#6b7280', '&:hover': { color: '#ef4444', bgcolor: '#fee2e2' } }}
                                        >
                                            <Trash2 size={16} />
                                        </IconButton>
                                        <IconButton 
                                            size="small" 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const newStatus = product.status === 'Active' ? 'Archived' : 'Active';
                                                handleUpdateProductStatus(product.id, newStatus);
                                            }}
                                            sx={{ color: '#6b7280', '&:hover': { color: '#22c55e', bgcolor: '#dcfce7' } }}
                                        >
                                            {product.status === 'Active' ? <Archive size={16} /> : <ArchiveRestore size={16} />}
                                        </IconButton>
                                    </Box>
                                </Paper>
                            ))}
                        </List>
                    )}
                </Box>

                {/* Dashboard / Welcome Content (or detail view placeholder) */}
                <Box sx={{ 
                    flexGrow: 1, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    p: 4, 
                    overflowY: 'auto',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#f9fafb'
                }}>
                    <Paper elevation={3} sx={{ 
                        maxWidth: '800px', 
                        width: '100%', 
                        p: { xs: 3, sm: 5 }, 
                        borderRadius: '1rem', 
                        textAlign: 'center',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                        backgroundColor: '#fff'
                    }}>
                        <Box ref={lottieContainer} sx={{ width: '150px', height: '150px', margin: '0 auto 1.5rem auto' }} />
                        <Typography variant="h4" component="h2" sx={{ fontWeight: 'bold', color: '#111827', mb: 2 }}>
                            Welcome to Auto Product Manager!
                        </Typography>
                        <Typography variant="body1" sx={{ color: '#4b5563', mb: 3 }}>
                            Your all-in-one AI-powered platform for streamlined product lifecycle management.
                        </Typography>
                        <Button
                            variant="contained"
                            startIcon={<PlusCircle size={20} />}
                            onClick={() => setShowAddProductModal(true)}
                            sx={{
                                textTransform: 'none',
                                background: 'linear-gradient(to right, #4f46e5, #9333ea)',
                                color: '#fff',
                                fontWeight: 600,
                                borderRadius: '0.5rem',
                                paddingY: '0.75rem',
                                paddingX: '1.5rem',
                                '&:hover': {
                                    background: 'linear-gradient(to right, #4338ca, #7e22ce)',
                                    transform: 'scale(1.02)',
                                },
                            }}
                        >
                            Create Your First Product
                        </Button>
                        <Box sx={{ mt: 4, pt: 3, borderTop: '1px dashed #e0e7ff' }}>
                            <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#374151', mb: 1 }}>
                                <Box component="span" sx={{ fontSize: '1.5rem', mr: 1 }}>{quoteEmoji}</Box>
                                Quote of the Day
                            </Typography>
                            <Typography variant="body2" sx={{ fontStyle: 'italic', color: '#6b7280' }}>
                                "{quoteOfTheDay}"
                            </Typography>
                        </Box>
                    </Paper>
                </Box>
            </Box>

            {/* Add New Product Modal */}
            <Dialog open={showAddProductModal} onClose={() => setShowAddProductModal(false)} PaperProps={{ sx: { borderRadius: '1rem' } }}>
                <DialogTitle sx={{ fontWeight: 'bold', color: '#111827' }}>Add New Product</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        id="name"
                        label="Product Name"
                        type="text"
                        fullWidth
                        variant="outlined"
                        value={newProductName}
                        onChange={(e) => setNewProductName(e.target.value)}
                        sx={{ mb: 2 }}
                    />
                    <FormControl fullWidth margin="dense" sx={{ mb: 2 }}>
                        <InputLabel id="new-product-status-label">Status</InputLabel>
                        <Select
                            labelId="new-product-status-label"
                            id="new-product-status"
                            value={newProductStatus}
                            label="Status"
                            onChange={(e) => setNewProductStatus(e.target.value)}
                        >
                            <MenuItem value="Active">Active</MenuItem>
                            <MenuItem value="Archived">Archived</MenuItem>
                        </Select>
                    </FormControl>
                    <FormControl fullWidth margin="dense">
                        <InputLabel id="new-product-parent-label">Parent Product (for iterations)</InputLabel>
                        <Select
                            labelId="new-product-parent-label"
                            id="new-product-parent"
                            value={newProductParentId}
                            label="Parent Product (for iterations)"
                            onChange={(e) => setNewProductParentId(e.target.value)}
                            displayEmpty
                        >
                            <MenuItem value="">
                                <em>None</em>
                            </MenuItem>
                            {products.filter(p => p.parent_id === null).map((product) => (
                                <MenuItem key={product.id} value={product.id}>{product.name}</MenuItem>
                            ))}
                        </Select>
                        <FormHelperText>Select if this is an iteration or sub-product of an existing product.</FormHelperText>
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowAddProductModal(false)} sx={{ color: '#6b7280', textTransform: 'none' }}>Cancel</Button>
                    <Button 
                        onClick={handleAddProduct} 
                        variant="contained" 
                        disabled={loading}
                        sx={{ 
                            textTransform: 'none', 
                            backgroundColor: '#4f46e5', 
                            '&:hover': { backgroundColor: '#4338ca' } 
                        }}
                    >
                        {loading ? <CircularProgress size={20} color="inherit" /> : 'Add Product'}
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
                    {"Confirm Delete Product?"}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="alert-dialog-description" sx={{ color: '#4b5563' }}>
                        Are you sure you want to delete the product "{products.find(p => p.id === productToDeleteId)?.name}"? This action cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowDeleteConfirmModal(false)} sx={{ color: '#6b7280', textTransform: 'none' }}>Cancel</Button>
                    <Button 
                        onClick={handleDeleteProduct} 
                        autoFocus 
                        variant="contained" 
                        color="error" 
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