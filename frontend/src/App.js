import React, { useState, useEffect, useMemo, useRef, useCallback, createContext, useContext } from 'react';
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
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
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
// This needs to be injected globally, e.g., in index.html or a global CSS file,
// or via MUI's styled-components/emotion setup if you have one.
// For now, I'll assume it's available or will be handled by your setup.
const pulseAnimation = `
    @keyframes pulse-initial {
        0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(79, 70, 229, 0.7); }
        70% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(79, 70, 229, 0); }
        100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(79, 70, 229, 0); }
    }
`;

// Inject the keyframes into the document head
// This is a workaround for environments where global CSS files aren't directly managed.
// In a proper CRA/Vite setup, you'd put this in a CSS file.
if (typeof document !== 'undefined') {
    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.innerText = pulseAnimation;
    document.head.appendChild(styleSheet);
}


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
    'Collaboration': 0, // New tab for collaboration
    'Repo': 0,
    'Important Notes': 0,
};

// Define the order of tabs for display
const PRODUCT_TABS_ORDER = [
    'Overview', 'Research', 'PRD', 'Design', 'Development', 'Tech Documentation',
    'Launch and Training', 'Feedback', 'Tasks', 'Collaboration', 'Important Notes'
];

// --- Auth Context ---
const AuthContext = createContext(null);

// --- Axios Instance for API Calls ---
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add the auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// --- AuthProvider Component ---
function AuthProvider({ children }) {
    const [user, setUser] = useState(null); // Stores { id, username, email, timezone, token }
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const username = localStorage.getItem('username');
        const timezone = localStorage.getItem('timezone');
        const userId = localStorage.getItem('userId');
        const userEmail = localStorage.getItem('userEmail'); // Added userEmail to local storage

        if (token && username && timezone && userId && userEmail) {
            setUser({ id: userId, token, username, timezone, email: userEmail });
        }
        setLoading(false);
    }, []);

    const login = async (email, password) => {
        try {
            const response = await api.post('/api/login', { email, password });
            const { token, username, timezone, user_id } = response.data;
            localStorage.setItem('token', token);
            localStorage.setItem('username', username || 'User Name');
            localStorage.setItem('timezone', timezone || 'UTC+05:30 (Chennai)');
            localStorage.setItem('userId', user_id);
            localStorage.setItem('userEmail', email); // Store email on login
            setUser({ id: user_id, token, username: username || 'User Name', timezone: timezone || 'UTC+05:30 (Chennai)', email });
            return { success: true, message: response.data.message };
        } catch (error) {
            console.error('Login failed:', error.response?.data || error.message);
            return { success: false, message: error.response?.data?.message || 'Login failed' };
        }
    };

    const signup = async (email, password, username) => {
        try {
            const response = await api.post('/api/signup', { email, password, username });
            return { success: true, message: response.data.message };
        } catch (error) {
            console.error('Signup failed:', error.response?.data || error.message);
            return { success: false, message: error.response?.data?.message || 'Signup failed' };
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        localStorage.removeItem('timezone');
        localStorage.removeItem('userId');
        localStorage.removeItem('userEmail');
        setUser(null);
    };

    const updateProfile = async (newUsername, newTimezone) => {
        try {
            const response = await api.put('/api/user/profile', {
                username: newUsername,
                timezone: newTimezone,
            });
            const updatedUser = response.data.user;
            localStorage.setItem('username', updatedUser.username);
            localStorage.setItem('timezone', updatedUser.timezone);
            setUser(prev => ({ ...prev, username: updatedUser.username, timezone: updatedUser.timezone }));
            return { success: true, message: response.data.message };
        } catch (error) {
            console.error('Profile update failed:', error.response?.data || error.message);
            return { success: false, message: error.response?.data?.message || 'Failed to update profile' };
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, signup, logout, loading, updateProfile }}>
            {children}
        </AuthContext.Provider>
    );
}

// --- Editor.js Wrapper Component ---
const Editor = ({ initialData, onChange, holder, readOnly = false, onReadyCallback = () => {} }) => {
    const editorInstance = useRef(null);
    const editorHolderId = useMemo(() => holder || `editor-js-holder-${Math.random().toString(36).substring(7)}`, [holder]);

    useEffect(() => {
        // Dynamically load Editor.js scripts if not already present
        const loadScript = (src, id) => {
            return new Promise((resolve, reject) => {
                if (document.getElementById(id)) {
                    resolve();
                    return;
                }
                const script = document.createElement('script');
                script.src = src;
                script.id = id;
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        };

        const loadEditorScripts = async () => {
            try {
                await loadScript('https://cdn.jsdelivr.net/npm/@editorjs/editorjs@2.28.2/dist/editor.min.js', 'editorjs-core');
                await loadScript('https://cdn.jsdelivr.net/npm/@editorjs/header@2.8.1/dist/bundle.min.js', 'editorjs-header');
                await loadScript('https://cdn.jsdelivr.net/npm/@editorjs/paragraph@2.11.3/dist/bundle.min.js', 'editorjs-paragraph');
                await loadScript('https://cdn.jsdelivr.net/npm/@editorjs/list@1.9.0/dist/bundle.min.js', 'editorjs-list');
                await loadScript('https://cdn.jsdelivr.net/npm/@editorjs/code@2.9.0/dist/bundle.min.js', 'editorjs-code');
                await loadScript('https://cdn.jsdelivr.net/npm/@editorjs/table@2.3.0/dist/bundle.min.js', 'editorjs-table');
                await loadScript('https://cdn.jsdelivr.net/npm/@editorjs/quote@2.6.0/dist/bundle.min.js', 'editorjs-quote');
                await loadScript('https://cdn.jsdelivr.net/npm/@editorjs/raw@2.5.0/dist/bundle.min.js', 'editorjs-raw');
                await loadScript('https://cdn.jsdelivr.net/npm/@editorjs/image@2.9.0/dist/bundle.min.js', 'editorjs-image');
                await loadScript('https://cdn.jsdelivr.net/npm/@editorjs/marker@1.4.0/dist/bundle.min.js', 'editorjs-marker');
                await loadScript('https://cdn.jsdelivr.net/npm/@editorjs/warning@1.3.0/dist/bundle.min.js', 'editorjs-warning');
                await loadScript('https://cdn.jsdelivr.net/npm/@editorjs/delimiter@1.3.0/dist/bundle.min.js', 'editorjs-delimiter');
                await loadScript('https://cdn.jsdelivr.net/npm/@editorjs/inline-code@1.4.0/dist/bundle.min.js', 'editorjs-inline-code');
                await loadScript('https://cdn.jsdelivr.net/npm/@editorjs/link@2.6.0/dist/bundle.min.js', 'editorjs-link');
                await loadScript('https://cdn.jsdelivr.net/npm/@editorjs/embed@2.7.0/dist/bundle.min.js', 'editorjs-embed');

                if (window.EditorJS) {
                    if (editorInstance.current) {
                        editorInstance.current.destroy(); // Destroy existing instance if it exists
                    }

                    editorInstance.current = new window.EditorJS({
                        holder: editorHolderId,
                        data: initialData || { blocks: [] },
                        readOnly: readOnly,
                        tools: {
                            header: window.Header,
                            paragraph: window.Paragraph,
                            list: window.List,
                            code: window.CodeTool,
                            table: window.Table,
                            quote: window.Quote,
                            raw: window.RawTool,
                            image: {
                                class: window.ImageTool,
                                config: {
                                    uploader: {
                                        uploadByFile(file) {
                                            return new Promise(resolve => {
                                                const reader = new FileReader();
                                                reader.onloadend = () => {
                                                    resolve({
                                                        success: 1,
                                                        file: {
                                                            url: `https://placehold.co/600x400/FF0000/FFFFFF?text=Image+Placeholder`,
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
            } catch (error) {
                console.error("Failed to load Editor.js scripts:", error);
            }
        };

        loadEditorScripts();

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
function AuthPage() {
    const { login, signup, loading: authLoading } = useContext(AuthContext);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [username, setUsername] = useState('');
    const [isLoginMode, setIsLoginMode] = useState(true);
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
        setAuthError(null);
        setSnackbarOpen(false);

        if (!isLoginMode) {
            if (password !== confirmPassword) {
                setAuthError("Passwords do not match.");
                setSnackbarMessage("Passwords do not match.");
                setSnackbarSeverity('error');
                setSnackbarOpen(true);
                return;
            }
            if (!username.trim()) {
                setAuthError("Username is required for signup.");
                setSnackbarMessage("Username is required for signup.");
                setSnackbarSeverity('error');
                setSnackbarOpen(true);
                return;
            }
        }

        let result;
        if (isLoginMode) {
            result = await login(email, password);
        } else {
            result = await signup(email, password, username);
        }

        if (result.success) {
            setSnackbarMessage(result.message || (isLoginMode ? 'Login successful!' : 'Signup successful! Redirecting to login...'));
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
            if (!isLoginMode) {
                setEmail('');
                setUsername('');
                setPassword('');
                setConfirmPassword('');
                setTimeout(() => setIsLoginMode(true), 2000); // Redirect to login after signup
            }
        } else {
            setAuthError(result.message);
            setSnackbarMessage(result.message);
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
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
                    <Box sx={{ position: 'absolute', top: 0, left: '-1rem', width: '18rem', height: '18rem', borderRadius: '9999px', mixBlendMode: 'multiply', filter: 'blur(3rem)', animation: 'pulse-initial 4s infinite cubic-bezier(0.4, 0, 0.6, 1)', backgroundColor: '#d8b4fe' }} />
                    <Box sx={{ position: 'absolute', top: 0, right: '-1rem', width: '18rem', height: '18rem', borderRadius: '9999px', mixBlendMode: 'multiply', filter: 'blur(3rem)', animation: 'pulse-initial 4s infinite cubic-bezier(0.4, 0, 0.6, 1) 2s', backgroundColor: '#fde047' }} />
                    <Box sx={{ position: 'absolute', bottom: '-2rem', left: '5rem', width: '18rem', height: '18rem', borderRadius: '9999px', mixBlendMode: 'multiply', filter: 'blur(3rem)', animation: 'pulse-initial 4s infinite cubic-bezier(0.4, 0, 0.6, 1) 4s', backgroundColor: '#fbcfe8' }} />
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
                            disabled={authLoading}
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
                            {authLoading ? (
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
function SettingsPage({ setCurrentPage }) {
    const { user, updateProfile, logout } = useContext(AuthContext);
    const [username, setUsername] = useState(user?.username || '');
    const [timezone, setTimezone] = useState(user?.timezone || 'UTC+05:30 (Chennai)');
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('success');

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
        "UTC+12:00 (Auckland)", "UTC+12:45 (Chatham Islands)", "UTC+13:00 (Samoa)", "UTC+14:00 (Kiritimati)"
    ];

    const handleSnackbarClose = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        setSnackbarOpen(false);
    };

    const handleSaveSettings = async (e) => {
        e.preventDefault();
        setSnackbarOpen(false);
        const result = await updateProfile(username, timezone);
        if (result.success) {
            setSnackbarMessage(result.message);
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
        } else {
            setSnackbarMessage(result.message);
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        }
    };

    const handleLogout = () => {
        logout();
        setCurrentPage('auth');
    };

    return (
        <Box sx={{ flexGrow: 1, padding: 3, backgroundColor: '#f5f7fa', minHeight: '100vh' }}>
            <Paper elevation={3} sx={{ padding: 4, borderRadius: '1rem', maxWidth: '800px', margin: 'auto' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', color: '#1a202c' }}>
                        <IconButton onClick={() => setCurrentPage('dashboard')} sx={{ mr: 1 }}>
                            <ArrowLeft />
                        </IconButton>
                        Settings
                    </Typography>
                    <Button
                        variant="outlined"
                        color="error"
                        onClick={handleLogout}
                        startIcon={<LogOut size={20} />}
                        sx={{ textTransform: 'none', borderRadius: '0.5rem' }}
                    >
                        Logout
                    </Button>
                </Box>

                <Grid container spacing={3}>
                    <Grid item xs={12}>
                        <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#2d3748', marginBottom: 2 }}>
                            Profile Information
                        </Typography>
                        <TextField
                            label="Email"
                            value={user?.email || ''}
                            fullWidth
                            margin="normal"
                            InputProps={{
                                readOnly: true,
                            }}
                            sx={{
                                '& .MuiOutlinedInput-root': { borderRadius: '0.5rem', backgroundColor: '#f0f2f5' },
                                '& .MuiInputLabel-root': { fontWeight: 600, color: '#374151' },
                            }}
                        />
                        <TextField
                            label="Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            fullWidth
                            margin="normal"
                            sx={{
                                '& .MuiOutlinedInput-root': { borderRadius: '0.5rem' },
                                '& .MuiInputLabel-root': { fontWeight: 600, color: '#374151' },
                            }}
                        />
                        <FormControl fullWidth margin="normal" sx={{
                            '& .MuiOutlinedInput-root': { borderRadius: '0.5rem' },
                            '& .MuiInputLabel-root': { fontWeight: 600, color: '#374151' },
                        }}>
                            <InputLabel id="timezone-select-label">Timezone</InputLabel>
                            <Select
                                labelId="timezone-select-label"
                                id="timezone-select"
                                value={timezone}
                                label="Timezone"
                                onChange={(e) => setTimezone(e.target.value)}
                            >
                                {timezones.map((tz) => (
                                    <MenuItem key={tz} value={tz}>
                                        {tz}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <Button
                            variant="contained"
                            onClick={handleSaveSettings}
                            sx={{
                                mt: 3,
                                background: 'linear-gradient(to right, #4f46e5, #9333ea)',
                                color: '#fff',
                                fontWeight: 600,
                                borderRadius: '0.5rem',
                                textTransform: 'none',
                                '&:hover': {
                                    background: 'linear-gradient(to right, #4338ca, #7e22ce)',
                                },
                            }}
                        >
                            Save Changes
                        </Button>
                    </Grid>
                </Grid>
            </Paper>
            <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleSnackbarClose}>
                <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </Box>
    );
}

// --- DashboardPage Component ---
function DashboardPage({ setCurrentPage, setSelectedProductId }) {
    const { user } = useContext(AuthContext);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [newProductName, setNewProductName] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [productToDelete, setProductToDelete] = useState(null);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('success');

    const handleSnackbarClose = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        setSnackbarOpen(false);
    };

    const fetchProducts = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.get('/api/products');
            setProducts(response.data);
        } catch (err) {
            console.error('Error fetching products:', err);
            setError('Failed to fetch products. Please try again.');
            setSnackbarMessage('Failed to fetch products.');
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (user) {
            fetchProducts();
        }
    }, [user, fetchProducts]);

    const handleCreateProduct = async () => {
        if (!newProductName.trim()) {
            setSnackbarMessage('Product name cannot be empty.');
            setSnackbarSeverity('warning');
            setSnackbarOpen(true);
            return;
        }
        try {
            await api.post('/api/products', { name: newProductName });
            setNewProductName('');
            setCreateModalOpen(false);
            setSnackbarMessage('Product created successfully!');
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
            fetchProducts(); // Refresh the list
        } catch (err) {
            console.error('Error creating product:', err);
            setSnackbarMessage('Failed to create product.');
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        }
    };

    const confirmDeleteProduct = (product) => {
        setProductToDelete(product);
        setDeleteConfirmOpen(true);
    };

    const handleDeleteProduct = async () => {
        if (!productToDelete) return;
        try {
            await api.delete(`/api/products/${productToDelete.id}`);
            setDeleteConfirmOpen(false);
            setProductToDelete(null);
            setSnackbarMessage('Product deleted successfully!');
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
            fetchProducts(); // Refresh the list
        } catch (err) {
            console.error('Error deleting product:', err);
            setSnackbarMessage('Failed to delete product.');
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        }
    };

    const filteredProducts = products.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                <CircularProgress />
                <Typography variant="h6" sx={{ ml: 2 }}>Loading products...</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ flexGrow: 1, padding: 3, backgroundColor: '#f5f7fa', minHeight: '100vh' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', color: '#1a202c' }}>
                    My Products
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <TextField
                        variant="outlined"
                        placeholder="Search products..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        size="small"
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <Search size={20} color="#6b7280" />
                                </InputAdornment>
                            ),
                            sx: { borderRadius: '0.5rem' }
                        }}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                '&.Mui-focused fieldset': {
                                    borderColor: '#6366f1',
                                    boxShadow: '0 0 0 2px rgba(99, 102, 241, 0.25)',
                                },
                            },
                        }}
                    />
                    <Button
                        variant="contained"
                        startIcon={<Plus size={20} />}
                        onClick={() => setCreateModalOpen(true)}
                        sx={{
                            background: 'linear-gradient(to right, #4f46e5, #9333ea)',
                            color: '#fff',
                            fontWeight: 600,
                            borderRadius: '0.5rem',
                            textTransform: 'none',
                            '&:hover': {
                                background: 'linear-gradient(to right, #4338ca, #7e22ce)',
                            },
                        }}
                    >
                        Create New Product
                    </Button>
                </Box>
            </Box>

            {filteredProducts.length === 0 ? (
                <Paper elevation={1} sx={{ p: 4, textAlign: 'center', borderRadius: '1rem', border: '1px dashed #cbd5e1' }}>
                    <Typography variant="h6" color="textSecondary">
                        No products found. Click "Create New Product" to get started!
                    </Typography>
                </Paper>
            ) : (
                <Grid container spacing={3}>
                    {filteredProducts.map((product) => (
                        <Grid item xs={12} sm={6} md={4} key={product.id}>
                            <Paper
                                elevation={2}
                                sx={{
                                    p: 3,
                                    borderRadius: '1rem',
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                                    '&:hover': {
                                        transform: 'translateY(-5px)',
                                        boxShadow: '0 10px 20px rgba(0,0,0,0.1)',
                                    },
                                }}
                            >
                                <Box>
                                    <Typography variant="h6" component="h2" sx={{ fontWeight: 'bold', color: '#1a202c', mb: 1 }}>
                                        {product.name}
                                    </Typography>
                                    <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                                        Status: <Box component="span" sx={{ fontWeight: 'medium', color: product.status === 'Active' ? '#10b981' : '#d97706' }}>{product.status}</Box>
                                    </Typography>
                                    <Box sx={{ width: '100%', mb: 2 }}>
                                        <LinearProgress
                                            variant="determinate"
                                            value={product.progress}
                                            sx={{ height: 8, borderRadius: 4, backgroundColor: '#e0e7ff', '& .MuiLinearProgress-bar': { backgroundColor: '#4f46e5' } }}
                                        />
                                        <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5, display: 'block' }}>
                                            Progress: {product.progress}%
                                        </Typography>
                                    </Box>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        onClick={() => {
                                            setSelectedProductId(product.id);
                                            setCurrentPage('productDetail');
                                        }}
                                        sx={{
                                            color: '#4f46e5',
                                            borderColor: '#4f46e5',
                                            borderRadius: '0.5rem',
                                            textTransform: 'none',
                                            '&:hover': {
                                                backgroundColor: '#eef2ff',
                                                borderColor: '#4f46e5',
                                            },
                                        }}
                                    >
                                        View Details
                                    </Button>
                                    <Button
                                        variant="contained"
                                        size="small"
                                        color="error"
                                        onClick={() => confirmDeleteProduct(product)}
                                        startIcon={<Trash2 size={16} />}
                                        sx={{
                                            borderRadius: '0.5rem',
                                            textTransform: 'none',
                                            backgroundColor: '#ef4444',
                                            '&:hover': {
                                                backgroundColor: '#dc2626',
                                            },
                                        }}
                                    >
                                        Delete
                                    </Button>
                                </Box>
                            </Paper>
                        </Grid>
                    ))}
                </Grid>
            )}

            {/* Create Product Dialog */}
            <Dialog open={createModalOpen} onClose={() => setCreateModalOpen(false)} PaperProps={{ sx: { borderRadius: '1rem' } }}>
                <DialogTitle sx={{ fontWeight: 'bold', color: '#1a202c' }}>Create New Product</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Product Name"
                        type="text"
                        fullWidth
                        variant="outlined"
                        value={newProductName}
                        onChange={(e) => setNewProductName(e.target.value)}
                        sx={{
                            '& .MuiOutlinedInput-root': { borderRadius: '0.5rem' },
                            '& .MuiInputLabel-root': { fontWeight: 600, color: '#374151' },
                        }}
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setCreateModalOpen(false)} sx={{ color: '#4b5563', textTransform: 'none', borderRadius: '0.5rem' }}>Cancel</Button>
                    <Button
                        onClick={handleCreateProduct}
                        variant="contained"
                        sx={{
                            background: 'linear-gradient(to right, #4f46e5, #9333ea)',
                            color: '#fff',
                            fontWeight: 600,
                            borderRadius: '0.5rem',
                            textTransform: 'none',
                            '&:hover': {
                                background: 'linear-gradient(to right, #4338ca, #7e22ce)',
                            },
                        }}
                    >
                        Create
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} PaperProps={{ sx: { borderRadius: '1rem' } }}>
                <DialogTitle sx={{ fontWeight: 'bold', color: '#1a202c' }}>Confirm Delete</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to delete the product "{productToDelete?.name}"? This action cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setDeleteConfirmOpen(false)} sx={{ color: '#4b5563', textTransform: 'none', borderRadius: '0.5rem' }}>Cancel</Button>
                    <Button
                        onClick={handleDeleteProduct}
                        variant="contained"
                        color="error"
                        sx={{
                            backgroundColor: '#ef4444',
                            color: '#fff',
                            fontWeight: 600,
                            borderRadius: '0.5rem',
                            textTransform: 'none',
                            '&:hover': {
                                backgroundColor: '#dc2626',
                            },
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

// --- ProductDetailView Component ---
function ProductDetailView({ productId, setCurrentPage }) {
    const { user } = useContext(AuthContext);
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('Overview');
    const [editMode, setEditMode] = useState(false);
    const [editedProduct, setEditedProduct] = useState(null);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('success');

    const handleSnackbarClose = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        setSnackbarOpen(false);
    };

    const fetchProduct = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.get(`/api/products/${productId}`);
            setProduct(response.data);
            setEditedProduct(response.data); // Initialize editedProduct with fetched data
        } catch (err) {
            console.error('Error fetching product details:', err);
            setError('Failed to fetch product details.');
            setSnackbarMessage('Failed to fetch product details.');
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        } finally {
            setLoading(false);
        }
    }, [productId]);

    useEffect(() => {
        if (user && productId) {
            fetchProduct();
        }
    }, [user, productId, fetchProduct]);

    const handleUpdateProduct = async () => {
        setSnackbarOpen(false);
        try {
            const response = await api.put(`/api/products/${productId}`, editedProduct);
            setProduct(response.data);
            setEditMode(false);
            setSnackbarMessage('Product updated successfully!');
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
        } catch (err) {
            console.error('Error updating product:', err);
            setError('Failed to update product.');
            setSnackbarMessage(err.response?.data?.error || 'Failed to update product.');
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        }
    };

    const handleStatusChange = (newStatus) => {
        setEditedProduct(prev => ({ ...prev, status: newStatus }));
    };

    const handleTabStatusChange = (tabName, newStatus) => {
        // Convert tab name to match backend field name (e.g., "Research" -> "research_status")
        const fieldName = `${tabName.toLowerCase().replace(/ /g, '_')}_status`;
        setEditedProduct(prev => ({ ...prev, [fieldName]: newStatus }));
    };

    const handleContentChange = (tabName, content) => {
        // Convert tab name to match backend field name (e.g., "Research" -> "research_document_json")
        const fieldName = `${tabName.toLowerCase().replace(/ /g, '_')}_json`;
        setEditedProduct(prev => ({ ...prev, [fieldName]: content }));
    };

    // Determine if the current user is the owner of the product
    const isProductOwner = product && user && product.user_id === user.id;
    // Determine if the current user has editor role (owner implicitly has editor)
    const isEditor = isProductOwner || (product && product.product_accesses && product.product_accesses.some(pa => pa.user_id === user.id && (pa.role === 'editor' || pa.role === 'owner')));


    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                <CircularProgress />
                <Typography variant="h6" sx={{ ml: 2 }}>Loading product details...</Typography>
            </Box>
        );
    }
    if (error) {
        return (
            <Box sx={{ textAlign: 'center', mt: 8 }}>
                <Typography variant="h6" color="error">{error}</Typography>
                <Button
                    variant="contained"
                    onClick={() => setCurrentPage('dashboard')}
                    sx={{ mt: 2, textTransform: 'none', borderRadius: '0.5rem' }}
                >
                    Back to Dashboard
                </Button>
            </Box>
        );
    }
    if (!product) return <Typography variant="h6" sx={{ textAlign: 'center', mt: 8 }}>Product not found.</Typography>;

    return (
        <Box sx={{ flexGrow: 1, padding: 3, backgroundColor: '#f5f7fa', minHeight: '100vh' }}>
            <Paper elevation={3} sx={{ padding: 4, borderRadius: '1rem' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', color: '#1a202c' }}>
                        <IconButton onClick={() => setCurrentPage('dashboard')} sx={{ mr: 1 }}>
                            <ArrowLeft />
                        </IconButton>
                        {product.name}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography variant="body1" sx={{ color: '#4b5563' }}>Status:</Typography>
                        {editMode && isEditor ? (
                            <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
                                <Select
                                    value={editedProduct.status}
                                    onChange={(e) => handleStatusChange(e.target.value)}
                                    sx={{ borderRadius: '0.5rem' }}
                                >
                                    {['Active', 'Completed', 'Cancelled', 'On-Hold'].map(s => (
                                        <MenuItem key={s} value={s}>{s}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        ) : (
                            <Typography variant="body1" sx={{ fontWeight: 'semibold', color: product.status === 'Active' ? '#10b981' : '#d97706' }}>
                                {product.status}
                            </Typography>
                        )}
                        {isEditor && (
                            editMode ? (
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <Button
                                        variant="contained"
                                        startIcon={<Save size={20} />}
                                        onClick={handleUpdateProduct}
                                        sx={{
                                            background: 'linear-gradient(to right, #22c55e, #16a34a)',
                                            color: '#fff',
                                            fontWeight: 600,
                                            borderRadius: '0.5rem',
                                            textTransform: 'none',
                                            '&:hover': {
                                                background: 'linear-gradient(to right, #16a34a, #15803d)',
                                            },
                                        }}
                                    >
                                        Save
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        startIcon={<X size={20} />}
                                        onClick={() => { setEditMode(false); setEditedProduct(product); }}
                                        sx={{
                                            color: '#6b7280',
                                            borderColor: '#6b7280',
                                            borderRadius: '0.5rem',
                                            textTransform: 'none',
                                            '&:hover': {
                                                backgroundColor: '#e5e7eb',
                                            },
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                </Box>
                            ) : (
                                <Button
                                    variant="contained"
                                    startIcon={<Edit size={20} />}
                                    onClick={() => setEditMode(true)}
                                    sx={{
                                        background: 'linear-gradient(to right, #4f46e5, #9333ea)',
                                        color: '#fff',
                                        fontWeight: 600,
                                        borderRadius: '0.5rem',
                                        textTransform: 'none',
                                        '&:hover': {
                                            background: 'linear-gradient(to right, #4338ca, #7e22ce)',
                                        },
                                    }}
                                >
                                    Edit Product
                                </Button>
                            )
                        )}
                    </Box>
                </Box>

                <Tabs
                    value={activeTab}
                    onChange={(event, newValue) => setActiveTab(newValue)}
                    aria-label="product tabs"
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{
                        borderBottom: 1,
                        borderColor: 'divider',
                        mb: 3,
                        '& .MuiTabs-indicator': { backgroundColor: '#4f46e5' },
                        '& .MuiTab-root': {
                            textTransform: 'none',
                            fontWeight: 'bold',
                            color: '#6b7280',
                            '&.Mui-selected': { color: '#4f46e5' },
                        },
                    }}
                >
                    {PRODUCT_TABS_ORDER.map((tabName) => (
                        <Tab key={tabName} label={tabName} value={tabName} />
                    ))}
                </Tabs>

                <Box sx={{ p: 1 }}>
                    {activeTab === 'Overview' && <OverviewTab product={product} />}
                    {activeTab === 'Research' && (
                        <ResearchTab
                            product={editedProduct}
                            editMode={editMode && isEditor}
                            onContentChange={(content) => handleContentChange('Research', content)}
                            onStatusChange={(status) => handleTabStatusChange('Research', status)}
                            setSnackbarMessage={setSnackbarMessage}
                            setSnackbarSeverity={setSnackbarSeverity}
                            setSnackbarOpen={setSnackbarOpen}
                        />
                    )}
                    {activeTab === 'PRD' && (
                        <PRDTab
                            product={editedProduct}
                            editMode={editMode && isEditor}
                            onContentChange={(content) => handleContentChange('PRD', content)}
                            onStatusChange={(status) => handleTabStatusChange('PRD', status)}
                            setSnackbarMessage={setSnackbarMessage}
                            setSnackbarSeverity={setSnackbarSeverity}
                            setSnackbarOpen={setSnackbarOpen}
                        />
                    )}
                    {activeTab === 'Design' && (
                        <GenericContentTab
                            title="Design Notes"
                            product={editedProduct}
                            contentKey="design_notes_json"
                            statusKey="design_status"
                            editMode={editMode && isEditor}
                            onContentChange={(content) => handleContentChange('Design', content)}
                            onStatusChange={(status) => handleTabStatusChange('Design', status)}
                        />
                    )}
                    {activeTab === 'Development' && (
                        <GenericContentTab
                            title="Development Specifications"
                            product={editedProduct}
                            contentKey="dev_specs_json"
                            statusKey="development_status"
                            editMode={editMode && isEditor}
                            onContentChange={(content) => handleContentChange('Development', content)}
                            onStatusChange={(status) => handleTabStatusChange('Development', status)}
                        />
                    )}
                    {activeTab === 'Tech Documentation' && (
                        <GenericContentTab
                            title="Technical Documentation"
                            product={editedProduct}
                            contentKey="tech_doc_json"
                            statusKey="tech_doc_status"
                            editMode={editMode && isEditor}
                            onContentChange={(content) => handleContentChange('Tech Documentation', content)}
                            onStatusChange={(status) => handleTabStatusChange('Tech Documentation', status)}
                        />
                    )}
                    {activeTab === 'Launch and Training' && (
                        <GenericContentTab
                            title="Launch & Training"
                            product={editedProduct}
                            contentKey="launch_training_json"
                            statusKey="launch_training_status"
                            editMode={editMode && isEditor}
                            onContentChange={(content) => handleContentChange('Launch and Training', content)}
                            onStatusChange={(status) => handleTabStatusChange('Launch and Training', status)}
                        />
                    )}
                    {activeTab === 'Important Notes' && (
                        <GenericContentTab
                            title="Important Notes"
                            product={editedProduct}
                            contentKey="important_notes_json"
                            statusKey="important_notes_status" // Assuming this status key exists or is handled
                            editMode={editMode && isEditor}
                            onContentChange={(content) => handleContentChange('Important Notes', content)}
                            onStatusChange={(status) => handleTabStatusChange('Important Notes', status)}
                        />
                    )}
                    {activeTab === 'Feedback' && (
                        <CustomerInterviewTab
                            productId={productId}
                            isEditor={isEditor}
                            setSnackbarMessage={setSnackbarMessage}
                            setSnackbarSeverity={setSnackbarSeverity}
                            setSnackbarOpen={setSnackbarOpen}
                        />
                    )}
                    {activeTab === 'Tasks' && (
                        <TaskTab
                            productId={productId}
                            isEditor={isEditor}
                            setSnackbarMessage={setSnackbarMessage}
                            setSnackbarSeverity={setSnackbarSeverity}
                            setSnackbarOpen={setSnackbarOpen}
                        />
                    )}
                    {activeTab === 'Collaboration' && (
                        <CollaborationTab
                            productId={productId}
                            isOwner={isProductOwner}
                            setSnackbarMessage={setSnackbarMessage}
                            setSnackbarSeverity={setSnackbarSeverity}
                            setSnackbarOpen={setSnackbarOpen}
                        />
                    )}
                </Box>
            </Paper>
            <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleSnackbarClose}>
                <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </Box>
    );
}

// --- Overview Tab Component ---
function OverviewTab({ product }) {
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="h5" component="h3" sx={{ fontWeight: 'bold', mb: 3, color: '#1a202c' }}>
                Product Overview
            </Typography>
            <Grid container spacing={2} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6}>
                    <Typography variant="body1" sx={{ color: '#4a5568' }}><strong>Product Name:</strong> {product.name}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                    <Typography variant="body1" sx={{ color: '#4a5568' }}>
                        <strong>Status:</strong> <Box component="span" sx={{ fontWeight: 'medium', color: product.status === 'Active' ? '#10b981' : '#d97706' }}>{product.status}</Box>
                    </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                    <Typography variant="body1" sx={{ color: '#4a5568' }}><strong>Archived:</strong> {product.is_archived ? 'Yes' : 'No'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                    <Typography variant="body1" sx={{ color: '#4a5568' }}><strong>Overall Progress:</strong> {product.progress}%</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                    <Typography variant="body1" sx={{ color: '#4a5568' }}><strong>Created At:</strong> {formatDate(product.created_at)}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                    <Typography variant="body1" sx={{ color: '#4a5568' }}><strong>Last Updated:</strong> {formatDate(product.updated_at)}</Typography>
                </Grid>
            </Grid>

            <Typography variant="h5" component="h3" sx={{ fontWeight: 'bold', mb: 3, color: '#1a202c' }}>
                Section Progress
            </Typography>
            <Grid container spacing={2}>
                {PRODUCT_TABS_ORDER.filter(tab => TAB_PROGRESS_PERCENTAGES[tab] > 0).map(tabName => {
                    const statusKey = `${tabName.toLowerCase().replace(/ /g, '_')}_status`;
                    const status = product[statusKey] || 'Not Started';
                    return (
                        <Grid item xs={12} sm={6} md={4} key={tabName}>
                            <Paper elevation={1} sx={{ p: 2, borderRadius: '0.5rem', backgroundColor: '#f0f2f5' }}>
                                <Typography variant="body1" sx={{ fontWeight: 'medium', color: '#2d3748' }}>
                                    {tabName}:
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 'semibold', color: status === 'Completed' ? '#10b981' : status === 'In Progress' ? '#3b82f6' : '#6b7280' }}>
                                    {status}
                                </Typography>
                            </Paper>
                        </Grid>
                    );
                })}
            </Grid>
        </Box>
    );
}

// --- Generic Content Tab Component (for Design, Dev, Tech Doc, Launch, Important Notes) ---
function GenericContentTab({ title, product, contentKey, statusKey, editMode, onContentChange, onStatusChange }) {
    const [content, setContent] = useState(product[contentKey] || { blocks: [] });
    const [status, setStatus] = useState(product[statusKey] || 'Not Started');
    const editorRef = useRef(null); // Ref to hold the Editor.js instance holder div

    useEffect(() => {
        try {
            setContent(product[contentKey] ? JSON.parse(product[contentKey]) : { blocks: [] });
        } catch (e) {
            console.error("Failed to parse content JSON for", contentKey, e);
            setContent({ blocks: [{ type: "paragraph", data: { text: "Error loading content." } }] });
        }
        setStatus(product[statusKey] || 'Not Started');
    }, [product, contentKey, statusKey]);

    const handleContentUpdate = useCallback((data) => {
        onContentChange(JSON.stringify(data));
    }, [onContentChange]);

    const handleStatusUpdate = (event) => {
        const newStatus = event.target.value;
        setStatus(newStatus);
        onStatusChange(newStatus);
    };

    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="h5" component="h3" sx={{ fontWeight: 'bold', mb: 3, color: '#1a202c' }}>
                {title}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Typography variant="body1" sx={{ color: '#4a5568' }}>Status:</Typography>
                {editMode ? (
                    <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
                        <Select
                            value={status}
                            onChange={handleStatusUpdate}
                            sx={{ borderRadius: '0.5rem' }}
                        >
                            {['Not Started', 'In Progress', 'Completed', 'Skipped'].map(s => (
                                <MenuItem key={s} value={s}>{s}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                ) : (
                    <Typography variant="body1" sx={{ fontWeight: 'semibold', color: status === 'Completed' ? '#10b981' : '#6b7280' }}>
                        {status}
                    </Typography>
                )}
            </Box>
            <Paper elevation={1} sx={{ p: 2, borderRadius: '0.5rem', border: '1px solid #e0e7ff', minHeight: '300px' }}>
                <Editor
                    initialData={content}
                    onChange={handleContentUpdate}
                    readOnly={!editMode}
                    holder={editorRef.current ? editorRef.current.id : undefined}
                />
            </Paper>
        </Box>
    );
}

// --- Research Tab Component ---
function ResearchTab({ product, editMode, onContentChange, onStatusChange, setSnackbarMessage, setSnackbarSeverity, setSnackbarOpen }) {
    const [prompt, setPrompt] = useState('');
    const [loadingAI, setLoadingAI] = useState(false);
    const editorRef = useRef(null);

    const handleGenerateResearch = async () => {
        if (!prompt) {
            setSnackbarMessage('Please enter a prompt for research generation.');
            setSnackbarSeverity('warning');
            setSnackbarOpen(true);
            return;
        }
        setLoadingAI(true);
        setSnackbarOpen(false); // Close previous snackbar
        try {
            const response = await api.post('/api/generate-research-document', {
                product_id: product.id,
                prompt_text: prompt,
            });
            onContentChange(JSON.stringify(response.data.research_document));
            onStatusChange('Completed');
            setSnackbarMessage('Research document generated and saved!');
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
        } catch (err) {
            console.error('Error generating research document:', err.response?.data || err.message);
            setSnackbarMessage(err.response?.data?.error || 'Failed to generate research document.');
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        } finally {
            setLoadingAI(false);
        }
    };

    const parsedResearchContent = useMemo(() => {
        try {
            return product.research_document_json ? JSON.parse(product.research_document_json) : { blocks: [] };
        } catch (e) {
            console.error("Failed to parse research document JSON:", e);
            return { blocks: [{ type: "paragraph", data: { text: "Error loading research content." } }] };
        }
    }, [product.research_document_json]);

    const handleContentUpdate = useCallback((data) => {
        onContentChange(JSON.stringify(data));
    }, [onContentChange]);

    const handleStatusUpdate = (event) => {
        const newStatus = event.target.value;
        onStatusChange(newStatus);
    };

    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="h5" component="h3" sx={{ fontWeight: 'bold', mb: 3, color: '#1a202c' }}>
                Market Research
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Typography variant="body1" sx={{ color: '#4a5568' }}>Status:</Typography>
                {editMode ? (
                    <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
                        <Select
                            value={product.research_status || 'Not Started'}
                            onChange={handleStatusUpdate}
                            sx={{ borderRadius: '0.5rem' }}
                        >
                            {['Not Started', 'In Progress', 'Completed', 'Skipped'].map(s => (
                                <MenuItem key={s} value={s}>{s}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                ) : (
                    <Typography variant="body1" sx={{ fontWeight: 'semibold', color: product.research_status === 'Completed' ? '#10b981' : '#6b7280' }}>
                        {product.research_status || 'Not Started'}
                    </Typography>
                )}
            </Box>

            {editMode && (
                <Paper elevation={1} sx={{ p: 3, borderRadius: '0.5rem', border: '1px solid #e0e7ff', mb: 3, backgroundColor: '#f0f2f5' }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, color: '#2d3748' }}>AI Research Assistant</Typography>
                    <TextField
                        fullWidth
                        multiline
                        rows={3}
                        placeholder="Enter product idea or research prompt for AI (e.g., 'A mobile app for tracking personal finance with budgeting features')."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        disabled={loadingAI}
                        sx={{
                            mb: 2,
                            '& .MuiOutlinedInput-root': { borderRadius: '0.5rem' },
                            '& .MuiInputBase-input::placeholder': { color: '#9ca3af', opacity: 1 },
                        }}
                    />
                    <Button
                        variant="contained"
                        startIcon={loadingAI ? <CircularProgress size={20} color="inherit" /> : <Sparkles size={20} />}
                        onClick={handleGenerateResearch}
                        disabled={loadingAI}
                        sx={{
                            background: 'linear-gradient(to right, #4f46e5, #9333ea)',
                            color: '#fff',
                            fontWeight: 600,
                            borderRadius: '0.5rem',
                            textTransform: 'none',
                            '&:hover': {
                                background: 'linear-gradient(to right, #4338ca, #7e22ce)',
                            },
                            '&:disabled': {
                                opacity: 0.5,
                                cursor: 'not-allowed',
                                color: '#fff',
                            },
                        }}
                    >
                        {loadingAI ? 'Generating...' : 'Generate Research Document'}
                    </Button>
                </Paper>
            )}

            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, color: '#2d3748' }}>Research Document Content</Typography>
            <Paper elevation={1} sx={{ p: 2, borderRadius: '0.5rem', border: '1px solid #e0e7ff', minHeight: '400px' }}>
                <Editor
                    initialData={parsedResearchContent}
                    onChange={handleContentUpdate}
                    readOnly={!editMode}
                    holder={editorRef.current ? editorRef.current.id : undefined}
                />
            </Paper>
        </Box>
    );
}

// --- PRD Tab Component ---
function PRDTab({ product, editMode, onContentChange, onStatusChange, setSnackbarMessage, setSnackbarSeverity, setSnackbarOpen }) {
    const [userRequirements, setUserRequirements] = useState('');
    const [prdStructureConfirmation, setPrdStructureConfirmation] = useState('Standard PRD structure (Problem, Goals, Audience, Features, NFRs, Metrics, Future)');
    const [loadingAI, setLoadingAI] = useState(false);
    const editorRef = useRef(null);

    const handleGeneratePRD = async () => {
        if (!product.research_document_json) {
            setSnackbarMessage('Please generate or provide a Research Document first.');
            setSnackbarSeverity('warning');
            setSnackbarOpen(true);
            return;
        }
        if (!userRequirements) {
            setSnackbarMessage('Please provide user-specific requirements for the PRD.');
            setSnackbarSeverity('warning');
            setSnackbarOpen(true);
            return;
        }
        setLoadingAI(true);
        setSnackbarOpen(false);
        try {
            const response = await api.post('/api/generate-prd-document', {
                product_id: product.id,
                research_data: product.research_document_json,
                user_requirements: userRequirements,
                prd_structure_confirmation: prdStructureConfirmation,
            });
            onContentChange(JSON.stringify(response.data.prd_document));
            onStatusChange('Completed');
            setSnackbarMessage('PRD generated and saved!');
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
        } catch (err) {
            console.error('Error generating PRD:', err.response?.data || err.message);
            setSnackbarMessage(err.response?.data?.error || 'Failed to generate PRD.');
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        } finally {
            setLoadingAI(false);
        }
    };

    const parsedPrdContent = useMemo(() => {
        try {
            return product.prd_document_json ? JSON.parse(product.prd_document_json) : { blocks: [] };
        } catch (e) {
            console.error("Failed to parse PRD document JSON:", e);
            return { blocks: [{ type: "paragraph", data: { text: "Error loading PRD content." } }] };
        }
    }, [product.prd_document_json]);

    const handleContentUpdate = useCallback((data) => {
        onContentChange(JSON.stringify(data));
    }, [onContentChange]);

    const handleStatusUpdate = (event) => {
        const newStatus = event.target.value;
        onStatusChange(newStatus);
    };

    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="h5" component="h3" sx={{ fontWeight: 'bold', mb: 3, color: '#1a202c' }}>
                Product Requirements Document (PRD)
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Typography variant="body1" sx={{ color: '#4a5568' }}>Status:</Typography>
                {editMode ? (
                    <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
                        <Select
                            value={product.prd_status || 'Not Started'}
                            onChange={handleStatusUpdate}
                            sx={{ borderRadius: '0.5rem' }}
                        >
                            {['Not Started', 'In Progress', 'Completed', 'Skipped'].map(s => (
                                <MenuItem key={s} value={s}>{s}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                ) : (
                    <Typography variant="body1" sx={{ fontWeight: 'semibold', color: product.prd_status === 'Completed' ? '#10b981' : '#6b7280' }}>
                        {product.prd_status || 'Not Started'}
                    </Typography>
                )}
            </Box>

            {editMode && (
                <Paper elevation={1} sx={{ p: 3, borderRadius: '0.5rem', border: '1px solid #e0e7ff', mb: 3, backgroundColor: '#f0f2f5' }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, color: '#2d3748' }}>AI PRD Generator</Typography>
                    <Typography variant="body2" sx={{ color: '#4b5563', mb: 2 }}>
                        *Note: A Research Document is highly recommended before generating a PRD for best results.
                    </Typography>
                    <TextField
                        fullWidth
                        multiline
                        rows={3}
                        placeholder="Enter user-specific requirements or additional details for the PRD (e.g., 'Focus on mobile-first design, integrate with Stripe for payments')."
                        value={userRequirements}
                        onChange={(e) => setUserRequirements(e.target.value)}
                        disabled={loadingAI}
                        sx={{
                            mb: 2,
                            '& .MuiOutlinedInput-root': { borderRadius: '0.5rem' },
                            '& .MuiInputBase-input::placeholder': { color: '#9ca3af', opacity: 1 },
                        }}
                    />
                    <TextField
                        fullWidth
                        multiline
                        rows={2}
                        placeholder="Confirm or suggest a PRD structure (e.g., 'Standard PRD structure' or 'Include detailed user stories')."
                        value={prdStructureConfirmation}
                        onChange={(e) => setPrdStructureConfirmation(e.target.value)}
                        disabled={loadingAI}
                        sx={{
                            mb: 2,
                            '& .MuiOutlinedInput-root': { borderRadius: '0.5rem' },
                            '& .MuiInputBase-input::placeholder': { color: '#9ca3af', opacity: 1 },
                        }}
                    />
                    <Button
                        variant="contained"
                        startIcon={loadingAI ? <CircularProgress size={20} color="inherit" /> : <Sparkles size={20} />}
                        onClick={handleGeneratePRD}
                        disabled={loadingAI}
                        sx={{
                            background: 'linear-gradient(to right, #4f46e5, #9333ea)',
                            color: '#fff',
                            fontWeight: 600,
                            borderRadius: '0.5rem',
                            textTransform: 'none',
                            '&:hover': {
                                background: 'linear-gradient(to right, #4338ca, #7e22ce)',
                            },
                            '&:disabled': {
                                opacity: 0.5,
                                cursor: 'not-allowed',
                                color: '#fff',
                            },
                        }}
                    >
                        {loadingAI ? 'Generating...' : 'Generate PRD'}
                    </Button>
                </Paper>
            )}

            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, color: '#2d3748' }}>PRD Content</Typography>
            <Paper elevation={1} sx={{ p: 2, borderRadius: '0.5rem', border: '1px solid #e0e7ff', minHeight: '400px' }}>
                <Editor
                    initialData={parsedPrdContent}
                    onChange={handleContentUpdate}
                    readOnly={!editMode}
                    holder={editorRef.current ? editorRef.current.id : undefined}
                />
            </Paper>
        </Box>
    );
}

// --- Customer Interview Tab Component (Feedback) ---
function CustomerInterviewTab({ productId, isEditor, setSnackbarMessage, setSnackbarSeverity, setSnackbarOpen }) {
    const { user } = useContext(AuthContext);
    const [interviews, setInterviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [newInterviewData, setNewInterviewData] = useState({
        customer_name: '',
        customer_email: '',
        interview_date: new Date().toISOString().slice(0, 16),
        interview_notes_json: JSON.stringify({ blocks: [] }), // Editor.js format
    });
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [selectedInterview, setSelectedInterview] = useState(null);
    const [aiSummaryLoading, setAiSummaryLoading] = useState(false);

    const fetchInterviews = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.get(`/api/customer_interviews/product/${productId}`);
            setInterviews(response.data);
        } catch (err) {
            console.error('Error fetching interviews:', err.response?.data || err.message);
            setError('Failed to fetch interviews.');
            setSnackbarMessage('Failed to fetch interviews.');
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        } finally {
            setLoading(false);
        }
    }, [productId, setSnackbarMessage, setSnackbarSeverity, setSnackbarOpen]);

    useEffect(() => {
        if (user && productId) {
            fetchInterviews();
        }
    }, [user, productId, fetchInterviews]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewInterviewData(prev => ({ ...prev, [name]: value }));
    };

    const handleNotesChange = (data) => {
        setNewInterviewData(prev => ({ ...prev, interview_notes_json: JSON.stringify(data) }));
    };

    const handleAddInterview = async () => {
        setSnackbarOpen(false);
        try {
            await api.post('/api/customer_interviews', {
                ...newInterviewData,
                product_id: productId,
            });
            setNewInterviewData({
                customer_name: '',
                customer_email: '',
                interview_date: new Date().toISOString().slice(0, 16),
                interview_notes_json: JSON.stringify({ blocks: [] }),
            });
            setAddModalOpen(false);
            setSnackbarMessage('Interview added successfully!');
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
            fetchInterviews();
        } catch (err) {
            console.error('Error adding interview:', err.response?.data || err.message);
            setSnackbarMessage(err.response?.data?.error || 'Failed to add interview.');
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        }
    };

    const handleViewDetails = (interview) => {
        setSelectedInterview(interview);
        setDetailModalOpen(true);
    };

    const handleUpdateInterview = async (updatedData) => {
        setSnackbarOpen(false);
        try {
            await api.put(`/api/customer_interviews/${updatedData.id}`, updatedData);
            setSnackbarMessage('Interview updated successfully!');
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
            fetchInterviews(); // Refresh list
            setSelectedInterview(updatedData); // Update the selected interview in modal
        } catch (err) {
            console.error('Error updating interview:', err.response?.data || err.message);
            setSnackbarMessage(err.response?.data?.error || 'Failed to update interview.');
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        }
    };

    const handleDeleteInterview = async (interviewId) => {
        setSnackbarOpen(false);
        try {
            await api.delete(`/api/customer_interviews/${interviewId}`);
            setSnackbarMessage('Interview deleted successfully!');
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
            fetchInterviews();
            setDetailModalOpen(false); // Close modal if deleted
        } catch (err) {
            console.error('Error deleting interview:', err.response?.data || err.message);
            setSnackbarMessage(err.response?.data?.error || 'Failed to delete interview.');
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        }
    };

    const handleGenerateSummary = async (interviewId, notesContent) => {
        setAiSummaryLoading(true);
        setSnackbarOpen(false);
        try {
            const response = await api.post('/api/customer_interviews/generate_summary', {
                interview_id: interviewId,
                notes_content: notesContent,
            });
            const updatedInterview = { ...selectedInterview, ai_summary_json: JSON.stringify(response.data.ai_summary) };
            setSelectedInterview(updatedInterview); // Update in modal
            setInterviews(prev => prev.map(int => int.id === interviewId ? updatedInterview : int)); // Update in main list
            setSnackbarMessage('AI Summary generated and saved!');
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
        } catch (err) {
            console.error('Error generating AI summary:', err.response?.data || err.message);
            setSnackbarMessage(err.response?.data?.error || 'Failed to generate AI summary.');
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        } finally {
            setAiSummaryLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
                <CircularProgress />
                <Typography variant="body1" sx={{ ml: 2 }}>Loading interviews...</Typography>
            </Box>
        );
    }
    if (error) return <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>;

    return (
        <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h5" component="h3" sx={{ fontWeight: 'bold', color: '#1a202c' }}>
                    Customer Interviews
                </Typography>
                {isEditor && (
                    <Button
                        variant="contained"
                        startIcon={<Plus size={20} />}
                        onClick={() => setAddModalOpen(true)}
                        sx={{
                            background: 'linear-gradient(to right, #4f46e5, #9333ea)',
                            color: '#fff',
                            fontWeight: 600,
                            borderRadius: '0.5rem',
                            textTransform: 'none',
                            '&:hover': {
                                background: 'linear-gradient(to right, #4338ca, #7e22ce)',
                            },
                        }}
                    >
                        Add New Interview
                    </Button>
                )}
            </Box>

            {interviews.length === 0 ? (
                <Paper elevation={1} sx={{ p: 4, textAlign: 'center', borderRadius: '1rem', border: '1px dashed #cbd5e1' }}>
                    <Typography variant="h6" color="textSecondary">
                        No interviews recorded yet.
                    </Typography>
                </Paper>
            ) : (
                <Grid container spacing={3}>
                    {interviews.map(interview => (
                        <Grid item xs={12} sm={6} md={4} key={interview.id}>
                            <Paper
                                elevation={2}
                                sx={{
                                    p: 3,
                                    borderRadius: '1rem',
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                                    '&:hover': {
                                        transform: 'translateY(-5px)',
                                        boxShadow: '0 10px 20px rgba(0,0,0,0.1)',
                                    },
                                }}
                            >
                                <Box>
                                    <Typography variant="h6" component="h4" sx={{ fontWeight: 'bold', color: '#1a202c', mb: 1 }}>
                                        {interview.customer_name}
                                    </Typography>
                                    <Typography variant="body2" color="textSecondary" sx={{ mb: 0.5 }}>
                                        Email: {interview.customer_email || 'N/A'}
                                    </Typography>
                                    <Typography variant="body2" color="textSecondary" sx={{ mb: 1.5 }}>
                                        Date: {formatDate(interview.interview_date)}
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        onClick={() => handleViewDetails(interview)}
                                        sx={{
                                            color: '#4f46e5',
                                            borderColor: '#4f46e5',
                                            borderRadius: '0.5rem',
                                            textTransform: 'none',
                                            '&:hover': {
                                                backgroundColor: '#eef2ff',
                                                borderColor: '#4f46e5',
                                            },
                                        }}
                                    >
                                        View Details
                                    </Button>
                                </Box>
                            </Paper>
                        </Grid>
                    ))}
                </Grid>
            )}

            {/* Add Interview Dialog */}
            <Dialog open={addModalOpen} onClose={() => setAddModalOpen(false)} PaperProps={{ sx: { borderRadius: '1rem', minWidth: { xs: '90%', sm: '600px' } } }}>
                <DialogTitle sx={{ fontWeight: 'bold', color: '#1a202c' }}>Add New Customer Interview</DialogTitle>
                <DialogContent dividers>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Customer Name"
                        type="text"
                        fullWidth
                        name="customer_name"
                        value={newInterviewData.customer_name}
                        onChange={handleInputChange}
                        sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: '0.5rem' } }}
                        required
                    />
                    <TextField
                        margin="dense"
                        label="Customer Email"
                        type="email"
                        fullWidth
                        name="customer_email"
                        value={newInterviewData.customer_email}
                        onChange={handleInputChange}
                        sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: '0.5rem' } }}
                    />
                    <TextField
                        margin="dense"
                        label="Interview Date & Time"
                        type="datetime-local"
                        fullWidth
                        name="interview_date"
                        value={newInterviewData.interview_date}
                        onChange={handleInputChange}
                        InputLabelProps={{ shrink: true }}
                        sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: '0.5rem' } }}
                        required
                    />
                    <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1 }}>Interview Notes</Typography>
                    <Paper elevation={0} sx={{ border: '1px solid #e0e7ff', borderRadius: '0.5rem', minHeight: '200px', p: 1 }}>
                        <Editor
                            initialData={JSON.parse(newInterviewData.interview_notes_json)}
                            onChange={handleNotesChange}
                            holder="add-interview-editor"
                        />
                    </Paper>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setAddModalOpen(false)} sx={{ color: '#4b5563', textTransform: 'none', borderRadius: '0.5rem' }}>Cancel</Button>
                    <Button
                        onClick={handleAddInterview}
                        variant="contained"
                        sx={{
                            background: 'linear-gradient(to right, #4f46e5, #9333ea)',
                            color: '#fff',
                            fontWeight: 600,
                            borderRadius: '0.5rem',
                            textTransform: 'none',
                            '&:hover': {
                                background: 'linear-gradient(to right, #4338ca, #7e22ce)',
                            },
                        }}
                    >
                        Add Interview
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Interview Detail Dialog */}
            {selectedInterview && (
                <InterviewDetailDialog
                    open={detailModalOpen}
                    onClose={() => setDetailModalOpen(false)}
                    interview={selectedInterview}
                    onUpdate={handleUpdateInterview}
                    onDelete={handleDeleteInterview}
                    onGenerateSummary={handleGenerateSummary}
                    aiSummaryLoading={aiSummaryLoading}
                    isEditor={isEditor}
                />
            )}
        </Box>
    );
}

// --- Interview Detail Dialog Component ---
function InterviewDetailDialog({ open, onClose, interview, onUpdate, onDelete, onGenerateSummary, aiSummaryLoading, isEditor }) {
    const [editMode, setEditMode] = useState(false);
    const [editedInterview, setEditedInterview] = useState(interview);
    const notesEditorRef = useRef(null); // Ref for notes editor
    const summaryEditorRef = useRef(null); // Ref for summary editor

    useEffect(() => {
        setEditedInterview(interview);
    }, [interview]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setEditedInterview(prev => ({ ...prev, [name]: value }));
    };

    const handleNotesChange = useCallback((data) => {
        setEditedInterview(prev => ({ ...prev, interview_notes_json: JSON.stringify(data) }));
    }, []);

    const handleSave = async () => {
        await onUpdate(editedInterview);
        setEditMode(false);
    };

    const handleGenerateClick = () => {
        if (editedInterview.interview_notes_json) {
            onGenerateSummary(editedInterview.id, editedInterview.interview_notes_json);
        } else {
            // Use Snackbar for this
            // alert('Please add interview notes before generating a summary.');
        }
    };

    const parsedNotesContent = useMemo(() => {
        try {
            return editedInterview.interview_notes_json ? JSON.parse(editedInterview.interview_notes_json) : { blocks: [] };
        } catch (e) {
            console.error("Failed to parse interview notes JSON:", e);
            return { blocks: [{ type: "paragraph", data: { text: "Error loading notes content." } }] };
        }
    }, [editedInterview.interview_notes_json]);

    const parsedSummaryContent = useMemo(() => {
        try {
            return editedInterview.ai_summary_json ? JSON.parse(editedInterview.ai_summary_json) : { blocks: [] };
        } catch (e) {
            console.error("Failed to parse AI summary JSON:", e);
            return { blocks: [{ type: "paragraph", data: { text: "Error loading AI summary." } }] };
        }
    }, [editedInterview.ai_summary_json]);


    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: '1rem' } }}>
            <DialogTitle sx={{ fontWeight: 'bold', color: '#1a202c', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Interview with {interview.customer_name}
                <IconButton onClick={onClose} sx={{ color: '#6b7280' }}>
                    <X />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <Grid container spacing={2} mb={3}>
                    <Grid item xs={12} sm={6}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>Customer Name</Typography>
                        {editMode && isEditor ? (
                            <TextField
                                fullWidth
                                name="customer_name"
                                value={editedInterview.customer_name}
                                onChange={handleInputChange}
                                size="small"
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '0.5rem' } }}
                            />
                        ) : (
                            <Typography variant="body1">{interview.customer_name}</Typography>
                        )}
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>Customer Email</Typography>
                        {editMode && isEditor ? (
                            <TextField
                                fullWidth
                                name="customer_email"
                                value={editedInterview.customer_email || ''}
                                onChange={handleInputChange}
                                size="small"
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '0.5rem' } }}
                            />
                        ) : (
                            <Typography variant="body1">{interview.customer_email || 'N/A'}</Typography>
                        )}
                    </Grid>
                    <Grid item xs={12}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>Interview Date & Time</Typography>
                        {editMode && isEditor ? (
                            <TextField
                                fullWidth
                                type="datetime-local"
                                name="interview_date"
                                value={editedInterview.interview_date ? editedInterview.interview_date.slice(0, 16) : ''}
                                onChange={handleInputChange}
                                InputLabelProps={{ shrink: true }}
                                size="small"
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '0.5rem' } }}
                            />
                        ) : (
                            <Typography variant="body1">{formatDate(interview.interview_date)}</Typography>
                        )}
                    </Grid>
                </Grid>

                <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1 }}>Interview Notes</Typography>
                <Paper elevation={0} sx={{ border: '1px solid #e0e7ff', borderRadius: '0.5rem', minHeight: '200px', p: 1, mb: 3 }}>
                    <Editor
                        initialData={parsedNotesContent}
                        onChange={handleNotesChange}
                        readOnly={!editMode || !isEditor}
                        holder={notesEditorRef.current ? notesEditorRef.current.id : undefined}
                    />
                </Paper>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>AI Summary</Typography>
                    {isEditor && (
                        <Button
                            variant="contained"
                            startIcon={aiSummaryLoading ? <CircularProgress size={20} color="inherit" /> : <Sparkles size={20} />}
                            onClick={handleGenerateClick}
                            disabled={aiSummaryLoading || !editedInterview.interview_notes_json || JSON.parse(editedInterview.interview_notes_json).blocks.length === 0}
                            sx={{
                                background: 'linear-gradient(to right, #4f46e5, #9333ea)',
                                color: '#fff',
                                fontWeight: 600,
                                borderRadius: '0.5rem',
                                textTransform: 'none',
                                '&:hover': {
                                    background: 'linear-gradient(to right, #4338ca, #7e22ce)',
                                },
                                '&:disabled': {
                                    opacity: 0.5,
                                    cursor: 'not-allowed',
                                    color: '#fff',
                                },
                            }}
                        >
                            {aiSummaryLoading ? 'Generating...' : 'Generate AI Summary'}
                        </Button>
                    )}
                </Box>
                <Paper elevation={0} sx={{ border: '1px solid #e0e7ff', borderRadius: '0.5rem', minHeight: '100px', p: 1 }}>
                    <Editor
                        initialData={parsedSummaryContent}
                        readOnly={true} // AI summary is always read-only
                        holder={summaryEditorRef.current ? summaryEditorRef.current.id : undefined}
                    />
                </Paper>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                {isEditor && (
                    <>
                        {editMode ? (
                            <Button
                                onClick={handleSave}
                                variant="contained"
                                startIcon={<Save size={20} />}
                                sx={{
                                    background: 'linear-gradient(to right, #22c55e, #16a34a)',
                                    color: '#fff',
                                    fontWeight: 600,
                                    borderRadius: '0.5rem',
                                    textTransform: 'none',
                                    '&:hover': {
                                        background: 'linear-gradient(to right, #16a34a, #15803d)',
                                    },
                                }}
                            >
                                Save Changes
                            </Button>
                        ) : (
                            <Button
                                onClick={() => setEditMode(true)}
                                variant="contained"
                                startIcon={<Edit size={20} />}
                                sx={{
                                    background: 'linear-gradient(to right, #4f46e5, #9333ea)',
                                    color: '#fff',
                                    fontWeight: 600,
                                    borderRadius: '0.5rem',
                                    textTransform: 'none',
                                    '&:hover': {
                                        background: 'linear-gradient(to right, #4338ca, #7e22ce)',
                                    },
                                }}
                            >
                                Edit
                            </Button>
                        )}
                        <Button
                            onClick={() => onDelete(interview.id)}
                            variant="outlined"
                            color="error"
                            startIcon={<Trash2 size={20} />}
                            sx={{
                                borderRadius: '0.5rem',
                                textTransform: 'none',
                                '&:hover': {
                                    backgroundColor: '#ffebeb',
                                },
                            }}
                        >
                            Delete
                        </Button>
                    </>
                )}
                <Button onClick={onClose} sx={{ color: '#4b5563', textTransform: 'none', borderRadius: '0.5rem' }}>
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    );
}

// --- Interview Template Tab Component ---
function InterviewTemplateTab({ setSnackbarMessage, setSnackbarSeverity, setSnackbarOpen }) {
    const { user } = useContext(AuthContext);
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [newTemplateData, setNewTemplateData] = useState({
        template_name: '',
        template_questions_json: JSON.stringify({ blocks: [] }),
    });
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [aiQuestionsLoading, setAiQuestionsLoading] = useState(false);
    const [featureIdeaForAI, setFeatureIdeaForAI] = useState('');

    const fetchTemplates = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.get('/api/interview_templates');
            setTemplates(response.data);
        } catch (err) {
            console.error('Error fetching templates:', err.response?.data || err.message);
            setError('Failed to fetch interview templates.');
            setSnackbarMessage('Failed to fetch interview templates.');
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        } finally {
            setLoading(false);
        }
    }, [setSnackbarMessage, setSnackbarSeverity, setSnackbarOpen]);

    useEffect(() => {
        if (user) {
            fetchTemplates();
        }
    }, [user, fetchTemplates]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewTemplateData(prev => ({ ...prev, [name]: value }));
    };

    const handleQuestionsChange = (data) => {
        setNewTemplateData(prev => ({ ...prev, template_questions_json: JSON.stringify(data) }));
    };

    const handleAddTemplate = async () => {
        setSnackbarOpen(false);
        try {
            await api.post('/api/interview_templates', newTemplateData);
            setNewTemplateData({
                template_name: '',
                template_questions_json: JSON.stringify({ blocks: [] }),
            });
            setAddModalOpen(false);
            setSnackbarMessage('Template created successfully!');
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
            fetchTemplates();
        } catch (err) {
            console.error('Error adding template:', err.response?.data || err.message);
            setSnackbarMessage(err.response?.data?.error || 'Failed to add template.');
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        }
    };

    const handleViewDetails = (template) => {
        setSelectedTemplate(template);
        setDetailModalOpen(true);
    };

    const handleUpdateTemplate = async (updatedData) => {
        setSnackbarOpen(false);
        try {
            await api.put(`/api/interview_templates/${updatedData.id}`, updatedData);
            setSnackbarMessage('Template updated successfully!');
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
            fetchTemplates();
            setSelectedTemplate(updatedData);
        } catch (err) {
            console.error('Error updating template:', err.response?.data || err.message);
            setSnackbarMessage(err.response?.data?.error || 'Failed to update template.');
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        }
    };

    const handleDeleteTemplate = async (templateId) => {
        setSnackbarOpen(false);
        try {
            await api.delete(`/api/interview_templates/${templateId}`);
            setSnackbarMessage('Template deleted successfully!');
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
            fetchTemplates();
            setDetailModalOpen(false);
        } catch (err) {
            console.error('Error deleting template:', err.response?.data || err.message);
            setSnackbarMessage(err.response?.data?.error || 'Failed to delete template.');
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        }
    };

    const handleGenerateQuestions = async (templateId, existingQuestions) => {
        if (!featureIdeaForAI) {
            setSnackbarMessage('Please enter a feature idea to generate questions.');
            setSnackbarSeverity('warning');
            setSnackbarOpen(true);
            return;
        }
        setAiQuestionsLoading(true);
        setSnackbarOpen(false);
        try {
            const response = await api.post('/api/interview_templates/generate_questions', {
                feature_idea: featureIdeaForAI,
                existing_questions: existingQuestions,
            });
            const generatedContent = JSON.stringify(response.data.generated_questions);

            const updatedTemplate = { ...selectedTemplate, template_questions_json: generatedContent };
            setSelectedTemplate(updatedTemplate);
            setTemplates(prev => prev.map(t => t.id === templateId ? updatedTemplate : t));

            setSnackbarMessage('AI Questions generated and saved!');
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
        } catch (err) {
            console.error('Error generating AI questions:', err.response?.data || err.message);
            setSnackbarMessage(err.response?.data?.error || 'Failed to generate AI questions.');
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        } finally {
            setAiQuestionsLoading(false);
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
                <CircularProgress />
                <Typography variant="body1" sx={{ ml: 2 }}>Loading templates...</Typography>
            </Box>
        );
    }
    if (error) return <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>;

    return (
        <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h5" component="h3" sx={{ fontWeight: 'bold', color: '#1a202c' }}>
                    Interview Templates
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<Plus size={20} />}
                    onClick={() => setAddModalOpen(true)}
                    sx={{
                        background: 'linear-gradient(to right, #4f46e5, #9333ea)',
                        color: '#fff',
                        fontWeight: 600,
                        borderRadius: '0.5rem',
                        textTransform: 'none',
                        '&:hover': {
                            background: 'linear-gradient(to right, #4338ca, #7e22ce)',
                        },
                    }}
                >
                    Create New Template
                </Button>
            </Box>

            {templates.length === 0 ? (
                <Paper elevation={1} sx={{ p: 4, textAlign: 'center', borderRadius: '1rem', border: '1px dashed #cbd5e1' }}>
                    <Typography variant="h6" color="textSecondary">
                        No templates created yet.
                    </Typography>
                </Paper>
            ) : (
                <Grid container spacing={3}>
                    {templates.map(template => (
                        <Grid item xs={12} sm={6} md={4} key={template.id}>
                            <Paper
                                elevation={2}
                                sx={{
                                    p: 3,
                                    borderRadius: '1rem',
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                                    '&:hover': {
                                        transform: 'translateY(-5px)',
                                        boxShadow: '0 10px 20px rgba(0,0,0,0.1)',
                                    },
                                }}
                            >
                                <Box>
                                    <Typography variant="h6" component="h4" sx={{ fontWeight: 'bold', color: '#1a202c', mb: 1 }}>
                                        {template.template_name}
                                    </Typography>
                                    <Typography variant="body2" color="textSecondary" sx={{ mb: 1.5 }}>
                                        Created: {new Date(template.created_at).toLocaleDateString()}
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        onClick={() => handleViewDetails(template)}
                                        sx={{
                                            color: '#4f46e5',
                                            borderColor: '#4f46e5',
                                            borderRadius: '0.5rem',
                                            textTransform: 'none',
                                            '&:hover': {
                                                backgroundColor: '#eef2ff',
                                                borderColor: '#4f46e5',
                                            },
                                        }}
                                    >
                                        View Details
                                    </Button>
                                </Box>
                            </Paper>
                        </Grid>
                    ))}
                </Grid>
            )}

            {/* Add Template Dialog */}
            <Dialog open={addModalOpen} onClose={() => setAddModalOpen(false)} PaperProps={{ sx: { borderRadius: '1rem', minWidth: { xs: '90%', sm: '600px' } } }}>
                <DialogTitle sx={{ fontWeight: 'bold', color: '#1a202c' }}>Create New Interview Template</DialogTitle>
                <DialogContent dividers>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Template Name"
                        type="text"
                        fullWidth
                        name="template_name"
                        value={newTemplateData.template_name}
                        onChange={handleInputChange}
                        sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: '0.5rem' } }}
                        required
                    />
                    <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1 }}>Template Questions</Typography>
                    <Paper elevation={0} sx={{ border: '1px solid #e0e7ff', borderRadius: '0.5rem', minHeight: '200px', p: 1 }}>
                        <Editor
                            initialData={JSON.parse(newTemplateData.template_questions_json)}
                            onChange={handleQuestionsChange}
                            holder="add-template-editor"
                        />
                    </Paper>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setAddModalOpen(false)} sx={{ color: '#4b5563', textTransform: 'none', borderRadius: '0.5rem' }}>Cancel</Button>
                    <Button
                        onClick={handleAddTemplate}
                        variant="contained"
                        sx={{
                            background: 'linear-gradient(to right, #4f46e5, #9333ea)',
                            color: '#fff',
                            fontWeight: 600,
                            borderRadius: '0.5rem',
                            textTransform: 'none',
                            '&:hover': {
                                background: 'linear-gradient(to right, #4338ca, #7e22ce)',
                            },
                        }}
                    >
                        Create Template
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Template Detail Dialog */}
            {selectedTemplate && (
                <TemplateDetailDialog
                    open={detailModalOpen}
                    onClose={() => setDetailModalOpen(false)}
                    template={selectedTemplate}
                    onUpdate={handleUpdateTemplate}
                    onDelete={handleDeleteTemplate}
                    onGenerateQuestions={handleGenerateQuestions}
                    aiQuestionsLoading={aiQuestionsLoading}
                    featureIdeaForAI={featureIdeaForAI}
                    setFeatureIdeaForAI={setFeatureIdeaForAI}
                />
            )}
        </Box>
    );
}

// --- Template Detail Dialog Component ---
function TemplateDetailDialog({ open, onClose, template, onUpdate, onDelete, onGenerateQuestions, aiQuestionsLoading, featureIdeaForAI, setFeatureIdeaForAI }) {
    const [editMode, setEditMode] = useState(false);
    const [editedTemplate, setEditedTemplate] = useState(template);
    const questionsEditorRef = useRef(null);

    useEffect(() => {
        setEditedTemplate(template);
    }, [template]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setEditedTemplate(prev => ({ ...prev, [name]: value }));
    };

    const handleQuestionsChange = useCallback((data) => {
        setEditedTemplate(prev => ({ ...prev, template_questions_json: JSON.stringify(data) }));
    }, []);

    const handleSave = async () => {
        await onUpdate(editedTemplate);
        setEditMode(false);
    };

    const handleGenerateClick = () => {
        onGenerateQuestions(editedTemplate.id, editedTemplate.template_questions_json);
    };

    const parsedQuestionsContent = useMemo(() => {
        try {
            return editedTemplate.template_questions_json ? JSON.parse(editedTemplate.template_questions_json) : { blocks: [] };
        } catch (e) {
            console.error("Failed to parse template questions JSON:", e);
            return { blocks: [{ type: "paragraph", data: { text: "Error loading questions content." } }] };
        }
    }, [editedTemplate.template_questions_json]);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: '1rem' } }}>
            <DialogTitle sx={{ fontWeight: 'bold', color: '#1a202c', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Template: {template.template_name}
                <IconButton onClick={onClose} sx={{ color: '#6b7280' }}>
                    <X />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <TextField
                    fullWidth
                    label="Template Name"
                    value={editMode ? editedTemplate.template_name : template.template_name}
                    onChange={handleInputChange}
                    name="template_name"
                    disabled={!editMode}
                    sx={{ mb: 3, '& .MuiOutlinedInput-root': { borderRadius: '0.5rem' } }}
                />

                <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1 }}>Template Questions</Typography>
                <Paper elevation={0} sx={{ border: '1px solid #e0e7ff', borderRadius: '0.5rem', minHeight: '200px', p: 1, mb: 3 }}>
                    <Editor
                        initialData={parsedQuestionsContent}
                        onChange={handleQuestionsChange}
                        readOnly={!editMode}
                        holder={questionsEditorRef.current ? questionsEditorRef.current.id : undefined}
                    />
                </Paper>

                <Paper elevation={1} sx={{ p: 3, borderRadius: '0.5rem', border: '1px solid #e0e7ff', mb: 3, backgroundColor: '#f0f2f5' }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, color: '#2d3748' }}>AI Question Generator</Typography>
                    <TextField
                        fullWidth
                        multiline
                        rows={2}
                        placeholder="Enter a feature idea to generate interview questions (e.g., 'A new social media feature for sharing short videos')."
                        value={featureIdeaForAI}
                        onChange={(e) => setFeatureIdeaForAI(e.target.value)}
                        disabled={aiQuestionsLoading}
                        sx={{
                            mb: 2,
                            '& .MuiOutlinedInput-root': { borderRadius: '0.5rem' },
                            '& .MuiInputBase-input::placeholder': { color: '#9ca3af', opacity: 1 },
                        }}
                    />
                    <Button
                        variant="contained"
                        startIcon={aiQuestionsLoading ? <CircularProgress size={20} color="inherit" /> : <Sparkles size={20} />}
                        onClick={handleGenerateClick}
                        disabled={aiQuestionsLoading || !featureIdeaForAI}
                        sx={{
                            background: 'linear-gradient(to right, #4f46e5, #9333ea)',
                            color: '#fff',
                            fontWeight: 600,
                            borderRadius: '0.5rem',
                            textTransform: 'none',
                            '&:hover': {
                                background: 'linear-gradient(to right, #4338ca, #7e22ce)',
                            },
                            '&:disabled': {
                                opacity: 0.5,
                                cursor: 'not-allowed',
                                color: '#fff',
                            },
                        }}
                    >
                        {aiQuestionsLoading ? 'Generating...' : 'Generate Questions'}
                    </Button>
                </Paper>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                {editMode ? (
                    <Button
                        onClick={handleSave}
                        variant="contained"
                        startIcon={<Save size={20} />}
                        sx={{
                            background: 'linear-gradient(to right, #22c55e, #16a34a)',
                            color: '#fff',
                            fontWeight: 600,
                            borderRadius: '0.5rem',
                            textTransform: 'none',
                            '&:hover': {
                                background: 'linear-gradient(to right, #16a34a, #15803d)',
                            },
                        }}
                    >
                        Save Changes
                    </Button>
                ) : (
                    <Button
                        onClick={() => setEditMode(true)}
                        variant="contained"
                        startIcon={<Edit size={20} />}
                        sx={{
                            background: 'linear-gradient(to right, #4f46e5, #9333ea)',
                            color: '#fff',
                            fontWeight: 600,
                            borderRadius: '0.5rem',
                            textTransform: 'none',
                            '&:hover': {
                                background: 'linear-gradient(to right, #4338ca, #7e22ce)',
                            },
                        }}
                    >
                        Edit
                    </Button>
                )}
                <Button
                    onClick={() => onDelete(template.id)}
                    variant="outlined"
                    color="error"
                    startIcon={<Trash2 size={20} />}
                    sx={{
                        borderRadius: '0.5rem',
                        textTransform: 'none',
                        '&:hover': {
                            backgroundColor: '#ffebeb',
                        },
                    }}
                >
                    Delete
                </Button>
                <Button onClick={onClose} sx={{ color: '#4b5563', textTransform: 'none', borderRadius: '0.5rem' }}>
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    );
}

// --- Task Tab Component (NEW for Phase 2) ---
function TaskTab({ productId, isEditor, setSnackbarMessage, setSnackbarSeverity, setSnackbarOpen }) {
    const { user } = useContext(AuthContext);
    const [tasks, setTasks] = useState([]);
    const [allUsers, setAllUsers] = useState([]); // For assigning tasks
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [addTaskModalOpen, setAddTaskModalOpen] = useState(false);
    const [newTaskData, setNewTaskData] = useState({
        title: '',
        description: '',
        assigned_to_user_id: '',
        status: 'To Do',
        priority: 'Medium',
        due_date: '',
    });
    const [editTaskModalOpen, setEditTaskModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState(null);

    const fetchTasks = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.get(`/api/products/${productId}/tasks`);
            setTasks(response.data);
        } catch (err) {
            console.error('Error fetching tasks:', err.response?.data || err.message);
            setError('Failed to fetch tasks.');
            setSnackbarMessage('Failed to fetch tasks.');
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        } finally {
            setLoading(false);
        }
    }, [productId, setSnackbarMessage, setSnackbarSeverity, setSnackbarOpen]);

    const fetchAllUsers = useCallback(async () => {
        try {
            const response = await api.get('/api/users'); // Assuming an endpoint to get all users
            setAllUsers(response.data);
        } catch (err) {
            console.error('Error fetching users:', err.response?.data || err.message);
            // Don't block if users fail, just log error
        }
    }, []);

    useEffect(() => {
        if (user && productId) {
            fetchTasks();
            if (isEditor) { // Only fetch all users if current user is editor for assigning
                fetchAllUsers();
            }
        }
    }, [user, productId, isEditor, fetchTasks, fetchAllUsers]);

    const handleNewTaskInputChange = (e) => {
        const { name, value } = e.target;
        setNewTaskData(prev => ({ ...prev, [name]: value }));
    };

    const handleCreateTask = async () => {
        setSnackbarOpen(false);
        try {
            const payload = {
                ...newTaskData,
                assigned_to_user_id: newTaskData.assigned_to_user_id === '' ? null : parseInt(newTaskData.assigned_to_user_id),
                due_date: newTaskData.due_date || null,
            };
            await api.post(`/api/products/${productId}/tasks`, payload);
            setNewTaskData({
                title: '',
                description: '',
                assigned_to_user_id: '',
                status: 'To Do',
                priority: 'Medium',
                due_date: '',
            });
            setAddTaskModalOpen(false);
            setSnackbarMessage('Task created successfully!');
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
            fetchTasks();
        } catch (err) {
            console.error('Error creating task:', err.response?.data || err.message);
            setSnackbarMessage(err.response?.data?.error || 'Failed to create task.');
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        }
    };

    const handleEditTaskClick = (task) => {
        setEditingTask({
            ...task,
            due_date: task.due_date ? task.due_date.slice(0, 16) : '', // Format for datetime-local input
            assigned_to_user_id: task.assigned_to_user_id || '',
        });
        setEditTaskModalOpen(true);
    };

    const handleEditTaskInputChange = (e) => {
        const { name, value } = e.target;
        setEditingTask(prev => ({ ...prev, [name]: value }));
    };

    const handleUpdateTask = async () => {
        setSnackbarOpen(false);
        try {
            const payload = {
                ...editingTask,
                assigned_to_user_id: editingTask.assigned_to_user_id === '' ? null : parseInt(editingTask.assigned_to_user_id),
                due_date: editingTask.due_date || null,
            };
            await api.put(`/api/tasks/${editingTask.id}`, payload);
            setEditTaskModalOpen(false);
            setEditingTask(null);
            setSnackbarMessage('Task updated successfully!');
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
            fetchTasks();
        } catch (err) {
            console.error('Error updating task:', err.response?.data || err.message);
            setSnackbarMessage(err.response?.data?.error || 'Failed to update task.');
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        }
    };

    const confirmDeleteTask = (task) => {
        setTaskToDelete(task);
        setDeleteConfirmOpen(true);
    };

    const handleDeleteTask = async () => {
        if (!taskToDelete) return;
        setSnackbarOpen(false);
        try {
            await api.delete(`/api/tasks/${taskToDelete.id}`);
            setDeleteConfirmOpen(false);
            setTaskToDelete(null);
            setSnackbarMessage('Task deleted successfully!');
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
            fetchTasks();
        } catch (err) {
            console.error('Error deleting task:', err.response?.data || err.message);
            setSnackbarMessage(err.response?.data?.error || 'Failed to delete task.');
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
                <CircularProgress />
                <Typography variant="body1" sx={{ ml: 2 }}>Loading tasks...</Typography>
            </Box>
        );
    }
    if (error) return <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>;

    return (
        <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h5" component="h3" sx={{ fontWeight: 'bold', color: '#1a202c' }}>
                    Tasks
                </Typography>
                {isEditor && (
                    <Button
                        variant="contained"
                        startIcon={<Plus size={20} />}
                        onClick={() => setAddTaskModalOpen(true)}
                        sx={{
                            background: 'linear-gradient(to right, #4f46e5, #9333ea)',
                            color: '#fff',
                            fontWeight: 600,
                            borderRadius: '0.5rem',
                            textTransform: 'none',
                            '&:hover': {
                                background: 'linear-gradient(to right, #4338ca, #7e22ce)',
                            },
                        }}
                    >
                        Add New Task
                    </Button>
                )}
            </Box>

            {tasks.length === 0 ? (
                <Paper elevation={1} sx={{ p: 4, textAlign: 'center', borderRadius: '1rem', border: '1px dashed #cbd5e1' }}>
                    <Typography variant="h6" color="textSecondary">
                        No tasks for this product yet.
                    </Typography>
                </Paper>
            ) : (
                <Grid container spacing={3}>
                    {tasks.map(task => (
                        <Grid item xs={12} sm={6} md={4} key={task.id}>
                            <Paper
                                elevation={2}
                                sx={{
                                    p: 3,
                                    borderRadius: '1rem',
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                                    '&:hover': {
                                        transform: 'translateY(-5px)',
                                        boxShadow: '0 10px 20px rgba(0,0,0,0.1)',
                                    },
                                }}
                            >
                                <Box>
                                    <Typography variant="h6" component="h4" sx={{ fontWeight: 'bold', color: '#1a202c', mb: 1 }}>
                                        {task.title}
                                    </Typography>
                                    <Typography variant="body2" color="textSecondary" sx={{ mb: 0.5 }}>
                                        {task.description}
                                    </Typography>
                                    <Typography variant="body2" color="textSecondary" sx={{ mb: 0.5 }}>
                                        Status: <Box component="span" sx={{ fontWeight: 'medium' }}>{task.status}</Box>
                                    </Typography>
                                    <Typography variant="body2" color="textSecondary" sx={{ mb: 0.5 }}>
                                        Priority: <Box component="span" sx={{ fontWeight: 'medium' }}>{task.priority}</Box>
                                    </Typography>
                                    <Typography variant="body2" color="textSecondary" sx={{ mb: 0.5 }}>
                                        Assigned To: <Box component="span" sx={{ fontWeight: 'medium' }}>{task.assigned_to_username || 'Unassigned'}</Box>
                                    </Typography>
                                    <Typography variant="body2" color="textSecondary" sx={{ mb: 1.5 }}>
                                        Due Date: <Box component="span" sx={{ fontWeight: 'medium' }}>{formatDate(task.due_date)}</Box>
                                    </Typography>
                                </Box>
                                {isEditor && (
                                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            onClick={() => handleEditTaskClick(task)}
                                            sx={{
                                                color: '#4f46e5',
                                                borderColor: '#4f46e5',
                                                borderRadius: '0.5rem',
                                                textTransform: 'none',
                                                '&:hover': {
                                                    backgroundColor: '#eef2ff',
                                                    borderColor: '#4f46e5',
                                                },
                                            }}
                                        >
                                            Edit
                                        </Button>
                                        <Button
                                            variant="contained"
                                            size="small"
                                            color="error"
                                            onClick={() => confirmDeleteTask(task)}
                                            startIcon={<Trash2 size={16} />}
                                            sx={{
                                                borderRadius: '0.5rem',
                                                textTransform: 'none',
                                                backgroundColor: '#ef4444',
                                                '&:hover': {
                                                    backgroundColor: '#dc2626',
                                                },
                                            }}
                                        >
                                            Delete
                                        </Button>
                                    </Box>
                                )}
                            </Paper>
                        </Grid>
                    ))}
                </Grid>
            )}

            {/* Add Task Dialog */}
            <Dialog open={addTaskModalOpen} onClose={() => setAddTaskModalOpen(false)} PaperProps={{ sx: { borderRadius: '1rem', minWidth: { xs: '90%', sm: '500px' } } }}>
                <DialogTitle sx={{ fontWeight: 'bold', color: '#1a202c' }}>Add New Task</DialogTitle>
                <DialogContent dividers>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Title"
                        type="text"
                        fullWidth
                        name="title"
                        value={newTaskData.title}
                        onChange={handleNewTaskInputChange}
                        sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: '0.5rem' } }}
                        required
                    />
                    <TextField
                        margin="dense"
                        label="Description"
                        type="text"
                        fullWidth
                        multiline
                        rows={3}
                        name="description"
                        value={newTaskData.description}
                        onChange={handleNewTaskInputChange}
                        sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: '0.5rem' } }}
                    />
                    <FormControl fullWidth margin="dense" sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: '0.5rem' } }}>
                        <InputLabel>Assigned To</InputLabel>
                        <Select
                            name="assigned_to_user_id"
                            value={newTaskData.assigned_to_user_id}
                            onChange={handleNewTaskInputChange}
                            label="Assigned To"
                        >
                            <MenuItem value="">Unassigned</MenuItem>
                            {allUsers.map(userOption => (
                                <MenuItem key={userOption.id} value={userOption.id}>
                                    {userOption.username} ({userOption.email})
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl fullWidth margin="dense" sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: '0.5rem' } }}>
                        <InputLabel>Status</InputLabel>
                        <Select
                            name="status"
                            value={newTaskData.status}
                            onChange={handleNewTaskInputChange}
                            label="Status"
                        >
                            {['To Do', 'In Progress', 'Done', 'Blocked', 'Archived'].map(s => (
                                <MenuItem key={s} value={s}>{s}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl fullWidth margin="dense" sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: '0.5rem' } }}>
                        <InputLabel>Priority</InputLabel>
                        <Select
                            name="priority"
                            value={newTaskData.priority}
                            onChange={handleNewTaskInputChange}
                            label="Priority"
                        >
                            {['Low', 'Medium', 'High', 'Critical'].map(p => (
                                <MenuItem key={p} value={p}>{p}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <TextField
                        margin="dense"
                        label="Due Date"
                        type="datetime-local"
                        fullWidth
                        name="due_date"
                        value={newTaskData.due_date}
                        onChange={handleNewTaskInputChange}
                        InputLabelProps={{ shrink: true }}
                        sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: '0.5rem' } }}
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setAddTaskModalOpen(false)} sx={{ color: '#4b5563', textTransform: 'none', borderRadius: '0.5rem' }}>Cancel</Button>
                    <Button
                        onClick={handleCreateTask}
                        variant="contained"
                        sx={{
                            background: 'linear-gradient(to right, #4f46e5, #9333ea)',
                            color: '#fff',
                            fontWeight: 600,
                            borderRadius: '0.5rem',
                            textTransform: 'none',
                            '&:hover': {
                                background: 'linear-gradient(to right, #4338ca, #7e22ce)',
                            },
                        }}
                    >
                        Add Task
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Edit Task Dialog */}
            {editingTask && (
                <Dialog open={editTaskModalOpen} onClose={() => setEditTaskModalOpen(false)} PaperProps={{ sx: { borderRadius: '1rem', minWidth: { xs: '90%', sm: '500px' } } }}>
                    <DialogTitle sx={{ fontWeight: 'bold', color: '#1a202c' }}>Edit Task</DialogTitle>
                    <DialogContent dividers>
                        <TextField
                            autoFocus
                            margin="dense"
                            label="Title"
                            type="text"
                            fullWidth
                            name="title"
                            value={editingTask.title}
                            onChange={handleEditTaskInputChange}
                            sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: '0.5rem' } }}
                            required
                        />
                        <TextField
                            margin="dense"
                            label="Description"
                            type="text"
                            fullWidth
                            multiline
                            rows={3}
                            name="description"
                            value={editingTask.description || ''}
                            onChange={handleEditTaskInputChange}
                            sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: '0.5rem' } }}
                        />
                        <FormControl fullWidth margin="dense" sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: '0.5rem' } }}>
                            <InputLabel>Assigned To</InputLabel>
                            <Select
                                name="assigned_to_user_id"
                                value={editingTask.assigned_to_user_id}
                                onChange={handleEditTaskInputChange}
                                label="Assigned To"
                            >
                                <MenuItem value="">Unassigned</MenuItem>
                                {allUsers.map(userOption => (
                                    <MenuItem key={userOption.id} value={userOption.id}>
                                        {userOption.username} ({userOption.email})
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl fullWidth margin="dense" sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: '0.5rem' } }}>
                            <InputLabel>Status</InputLabel>
                            <Select
                                name="status"
                                value={editingTask.status}
                                onChange={handleEditTaskInputChange}
                                label="Status"
                            >
                                {['To Do', 'In Progress', 'Done', 'Blocked', 'Archived'].map(s => (
                                    <MenuItem key={s} value={s}>{s}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl fullWidth margin="dense" sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: '0.5rem' } }}>
                            <InputLabel>Priority</InputLabel>
                            <Select
                                name="priority"
                                value={editingTask.priority}
                                onChange={handleEditTaskInputChange}
                                label="Priority"
                            >
                                {['Low', 'Medium', 'High', 'Critical'].map(p => (
                                    <MenuItem key={p} value={p}>{p}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <TextField
                            margin="dense"
                            label="Due Date"
                            type="datetime-local"
                            fullWidth
                            name="due_date"
                            value={editingTask.due_date}
                            onChange={handleEditTaskInputChange}
                            InputLabelProps={{ shrink: true }}
                            sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: '0.5rem' } }}
                        />
                    </DialogContent>
                    <DialogActions sx={{ p: 2 }}>
                        <Button onClick={() => setEditTaskModalOpen(false)} sx={{ color: '#4b5563', textTransform: 'none', borderRadius: '0.5rem' }}>Cancel</Button>
                        <Button
                            onClick={handleUpdateTask}
                            variant="contained"
                            sx={{
                                background: 'linear-gradient(to right, #4f46e5, #9333ea)',
                                color: '#fff',
                                fontWeight: 600,
                                borderRadius: '0.5rem',
                                textTransform: 'none',
                                '&:hover': {
                                    background: 'linear-gradient(to right, #4338ca, #7e22ce)',
                                },
                            }}
                        >
                            Update Task
                        </Button>
                    </DialogActions>
                </Dialog>
            )}

            {/* Delete Task Confirmation Dialog */}
            <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} PaperProps={{ sx: { borderRadius: '1rem' } }}>
                <DialogTitle sx={{ fontWeight: 'bold', color: '#1a202c' }}>Confirm Delete</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to delete the task "{taskToDelete?.title}"? This action cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setDeleteConfirmOpen(false)} sx={{ color: '#4b5563', textTransform: 'none', borderRadius: '0.5rem' }}>Cancel</Button>
                    <Button
                        onClick={handleDeleteTask}
                        variant="contained"
                        color="error"
                        sx={{
                            backgroundColor: '#ef4444',
                            color: '#fff',
                            fontWeight: 600,
                            borderRadius: '0.5rem',
                            textTransform: 'none',
                            '&:hover': {
                                backgroundColor: '#dc2626',
                            },
                        }}
                    >
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

// --- Collaboration Tab Component (NEW for Phase 2) ---
function CollaborationTab({ productId, isOwner, setSnackbarMessage, setSnackbarSeverity, setSnackbarOpen }) {
    const { user } = useContext(AuthContext);
    const [accesses, setAccesses] = useState([]);
    const [allUsers, setAllUsers] = useState([]); // For inviting users
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [inviteModalOpen, setInviteModalOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState('viewer');
    const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);
    const [userToRemove, setUserToRemove] = useState(null);

    const fetchAccesses = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.get(`/api/products/${productId}/access`);
            setAccesses(response.data);
        } catch (err) {
            console.error('Error fetching product accesses:', err.response?.data || err.message);
            setError('Failed to fetch collaboration details.');
            setSnackbarMessage('Failed to fetch collaboration details.');
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        } finally {
            setLoading(false);
        }
    }, [productId, setSnackbarMessage, setSnackbarSeverity, setSnackbarOpen]);

    const fetchAllUsers = useCallback(async () => {
        try {
            const response = await api.get('/api/users');
            setAllUsers(response.data);
        } catch (err) {
            console.error('Error fetching all users:', err.response?.data || err.message);
            // Log error but don't block UI
        }
    }, []);

    useEffect(() => {
        if (user && productId) {
            fetchAccesses();
            if (isOwner) { // Only fetch all users if current user is owner for inviting
                fetchAllUsers();
            }
        }
    }, [user, productId, isOwner, fetchAccesses, fetchAllUsers]);

    const handleInviteUser = async () => {
        setSnackbarOpen(false);
        try {
            await api.post(`/api/products/${productId}/access`, {
                user_email: inviteEmail,
                role: inviteRole,
            });
            setInviteEmail('');
            setInviteRole('viewer');
            setInviteModalOpen(false);
            setSnackbarMessage('User invited successfully!');
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
            fetchAccesses(); // Refresh the access list
        } catch (err) {
            console.error('Error inviting user:', err.response?.data || err.message);
            setSnackbarMessage(err.response?.data?.error || 'Failed to invite user.');
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        }
    };

    const handleUpdateRole = async (accessId, userId, newRole) => {
        setSnackbarOpen(false);
        try {
            await api.put(`/api/products/${productId}/access/${userId}`, { role: newRole });
            setSnackbarMessage('User role updated!');
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
            fetchAccesses(); // Refresh the access list
        } catch (err) {
            console.error('Error updating user role:', err.response?.data || err.message);
            setSnackbarMessage(err.response?.data?.error || 'Failed to update user role.');
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        }
    };

    const confirmRemoveAccess = (access) => {
        setUserToRemove(access);
        setRemoveConfirmOpen(true);
    };

    const handleRemoveAccess = async () => {
        if (!userToRemove) return;
        setSnackbarOpen(false);
        try {
            await api.delete(`/api/products/${productId}/access/${userToRemove.user_id}`);
            setRemoveConfirmOpen(false);
            setUserToRemove(null);
            setSnackbarMessage('User access removed!');
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
            fetchAccesses(); // Refresh the access list
        } catch (err) {
            console.error('Error removing user access:', err.response?.data || err.message);
            setSnackbarMessage(err.response?.data?.error || 'Failed to remove user access.');
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
                <CircularProgress />
                <Typography variant="body1" sx={{ ml: 2 }}>Loading collaboration details...</Typography>
            </Box>
        );
    }
    if (error) return <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>;

    return (
        <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h5" component="h3" sx={{ fontWeight: 'bold', color: '#1a202c' }}>
                    Product Collaboration
                </Typography>
                {isOwner && (
                    <Button
                        variant="contained"
                        startIcon={<Users size={20} />}
                        onClick={() => setInviteModalOpen(true)}
                        sx={{
                            background: 'linear-gradient(to right, #4f46e5, #9333ea)',
                            color: '#fff',
                            fontWeight: 600,
                            borderRadius: '0.5rem',
                            textTransform: 'none',
                            '&:hover': {
                                background: 'linear-gradient(to right, #4338ca, #7e22ce)',
                            },
                        }}
                    >
                        Invite User
                    </Button>
                )}
            </Box>

            {accesses.length === 0 ? (
                <Paper elevation={1} sx={{ p: 4, textAlign: 'center', borderRadius: '1rem', border: '1px dashed #cbd5e1' }}>
                    <Typography variant="h6" color="textSecondary">
                        No collaborators for this product yet.
                    </Typography>
                </Paper>
            ) : (
                <TableContainer component={Paper} elevation={2} sx={{ borderRadius: '1rem', border: '1px solid #e0e7ff' }}>
                    <Table sx={{ minWidth: 650 }} aria-label="collaboration table">
                        <TableHead sx={{ backgroundColor: '#f0f2f5' }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold', color: '#2d3748' }}>User</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', color: '#2d3748' }}>Email</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', color: '#2d3748' }}>Role</TableCell>
                                {isOwner && <TableCell sx={{ fontWeight: 'bold', color: '#2d3748' }}>Actions</TableCell>}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {accesses.map((access) => (
                                <TableRow
                                    key={access.id}
                                    sx={{ '&:last-child td, &:last-child th': { border: 0 }, '&:hover': { backgroundColor: '#f9fafb' } }}
                                >
                                    <TableCell component="th" scope="row">
                                        {access.user_username || 'N/A'}
                                    </TableCell>
                                    <TableCell>{access.user_email}</TableCell>
                                    <TableCell>
                                        {isOwner && access.user_id !== user.id ? ( // Owner can change others' roles
                                            <FormControl variant="outlined" size="small" sx={{ minWidth: 100 }}>
                                                <Select
                                                    value={access.role}
                                                    onChange={(e) => handleUpdateRole(access.id, access.user_id, e.target.value)}
                                                    sx={{ borderRadius: '0.5rem' }}
                                                >
                                                    <MenuItem value="owner">Owner</MenuItem>
                                                    <MenuItem value="editor">Editor</MenuItem>
                                                    <MenuItem value="viewer">Viewer</MenuItem>
                                                </Select>
                                            </FormControl>
                                        ) : (
                                            <Typography sx={{ textTransform: 'capitalize' }}>{access.role}</Typography>
                                        )}
                                    </TableCell>
                                    {isOwner && (
                                        <TableCell>
                                            {access.user_id !== user.id && ( // Cannot remove self as owner
                                                <Button
                                                    variant="outlined"
                                                    color="error"
                                                    size="small"
                                                    onClick={() => confirmRemoveAccess(access)}
                                                    startIcon={<Trash2 size={16} />}
                                                    sx={{
                                                        borderRadius: '0.5rem',
                                                        textTransform: 'none',
                                                        '&:hover': {
                                                            backgroundColor: '#ffebeb',
                                                        },
                                                    }}
                                                >
                                                    Remove
                                                </Button>
                                            )}
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Invite User Dialog */}
            <Dialog open={inviteModalOpen} onClose={() => setInviteModalOpen(false)} PaperProps={{ sx: { borderRadius: '1rem', minWidth: { xs: '90%', sm: '400px' } } }}>
                <DialogTitle sx={{ fontWeight: 'bold', color: '#1a202c' }}>Invite User to Product</DialogTitle>
                <DialogContent dividers>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="User Email"
                        type="email"
                        fullWidth
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: '0.5rem' } }}
                        required
                    />
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                        User must be registered in the system.
                    </Typography>
                    <FormControl fullWidth margin="dense" sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: '0.5rem' } }}>
                        <InputLabel>Role</InputLabel>
                        <Select
                            value={inviteRole}
                            onChange={(e) => setInviteRole(e.target.value)}
                            label="Role"
                        >
                            <MenuItem value="viewer">Viewer</MenuItem>
                            <MenuItem value="editor">Editor</MenuItem>
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setInviteModalOpen(false)} sx={{ color: '#4b5563', textTransform: 'none', borderRadius: '0.5rem' }}>Cancel</Button>
                    <Button
                        onClick={handleInviteUser}
                        variant="contained"
                        sx={{
                            background: 'linear-gradient(to right, #4f46e5, #9333ea)',
                            color: '#fff',
                            fontWeight: 600,
                            borderRadius: '0.5rem',
                            textTransform: 'none',
                            '&:hover': {
                                background: 'linear-gradient(to right, #4338ca, #7e22ce)',
                            },
                        }}
                    >
                        Send Invite
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Remove Access Confirmation Dialog */}
            <Dialog open={removeConfirmOpen} onClose={() => setRemoveConfirmOpen(false)} PaperProps={{ sx: { borderRadius: '1rem' } }}>
                <DialogTitle sx={{ fontWeight: 'bold', color: '#1a202c' }}>Confirm Remove Access</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to remove access for "{userToRemove?.user_username || userToRemove?.user_email}"?
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setRemoveConfirmOpen(false)} sx={{ color: '#4b5563', textTransform: 'none', borderRadius: '0.5rem' }}>Cancel</Button>
                    <Button
                        onClick={handleRemoveAccess}
                        variant="contained"
                        color="error"
                        sx={{
                            backgroundColor: '#ef4444',
                            color: '#fff',
                            fontWeight: 600,
                            borderRadius: '0.5rem',
                            textTransform: 'none',
                            '&:hover': {
                                backgroundColor: '#dc2626',
                            },
                        }}
                    >
                        Remove
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}


// --- Main App Component ---
function App() {
    const { user, loading: authLoading } = useContext(AuthContext);
    const [currentPage, setCurrentPage] = useState('auth'); // 'auth', 'dashboard', 'productDetail', 'settings'
    const [selectedProductId, setSelectedProductId] = useState(null);

    useEffect(() => {
        if (!authLoading) {
            if (user) {
                setCurrentPage('dashboard');
            } else {
                setCurrentPage('auth');
            }
        }
    }, [user, authLoading]);

    if (authLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f3f4f6' }}>
                <CircularProgress />
                <Typography variant="h6" sx={{ ml: 2 }}>Loading application...</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ fontFamily: 'Inter, sans-serif', minHeight: '100vh', backgroundColor: '#f5f7fa' }}>
            {currentPage !== 'auth' && (
                <AppBarComponent setCurrentPage={setCurrentPage} />
            )}
            <Box component="main" sx={{ pt: currentPage !== 'auth' ? 8 : 0 }}> {/* Adjust padding for AppBar */}
                {currentPage === 'auth' && <AuthPage />}
                {currentPage === 'dashboard' && (
                    <DashboardPage
                        setCurrentPage={setCurrentPage}
                        setSelectedProductId={setSelectedProductId}
                    />
                )}
                {currentPage === 'productDetail' && (
                    <ProductDetailView
                        productId={selectedProductId}
                        setCurrentPage={setCurrentPage}
                    />
                )}
                {currentPage === 'settings' && (
                    <SettingsPage
                        setCurrentPage={setCurrentPage}
                    />
                )}
            </Box>
        </Box>
    );
}

// --- AppBar Component (Header) ---
function AppBarComponent({ setCurrentPage }) {
    const { user, logout } = useContext(AuthContext);
    const [anchorEl, setAnchorEl] = useState(null);
    const open = Boolean(anchorEl);

    const handleMenu = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleSettingsClick = () => {
        setCurrentPage('settings');
        handleClose();
    };

    const handleLogoutClick = () => {
        logout();
        setCurrentPage('auth');
        handleClose();
    };

    return (
        <Paper elevation={4} sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1100,
            backgroundColor: '#ffffff',
            borderBottom: '1px solid #e0e7ff',
            py: 1.5,
            px: 3,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
        }}>
            <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => setCurrentPage('dashboard')}>
                <Sparkles size={32} color="#4f46e5" style={{ marginRight: '0.5rem' }} />
                <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', color: '#1a202c' }}>
                    Auto Product Manager
                </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Button
                    onClick={handleMenu}
                    sx={{
                        textTransform: 'none',
                        color: '#4f46e5',
                        fontWeight: 600,
                        borderRadius: '0.5rem',
                        '&:hover': {
                            backgroundColor: '#eef2ff',
                        },
                    }}
                    startIcon={<User size={20} />}
                    endIcon={open ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                >
                    {user?.username || 'Guest'}
                </Button>
                <Menu
                    id="menu-appbar"
                    anchorEl={anchorEl}
                    anchorOrigin={{
                        vertical: 'bottom',
                        horizontal: 'right',
                    }}
                    keepMounted
                    transformOrigin={{
                        vertical: 'top',
                        horizontal: 'right',
                    }}
                    open={open}
                    onClose={handleClose}
                    PaperProps={{
                        sx: {
                            borderRadius: '0.5rem',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                            mt: 1,
                        }
                    }}
                >
                    <MenuItem onClick={handleSettingsClick} sx={{ py: 1.5, px: 2, '&:hover': { backgroundColor: '#f0f2f5' } }}>
                        <Settings size={20} style={{ marginRight: '0.75rem' }} /> Profile Settings
                    </MenuItem>
                    <MenuItem onClick={handleLogoutClick} sx={{ py: 1.5, px: 2, '&:hover': { backgroundColor: '#ffebeb' }, color: '#ef4444' }}>
                        <LogOut size={20} style={{ marginRight: '0.75rem' }} /> Logout
                    </MenuItem>
                </Menu>
            </Box>
        </Paper>
    );
}

// --- Main App Wrapper ---
export default function MainApp() {
    return (
        <AuthProvider>
            <App />
        </AuthProvider>
    );
}