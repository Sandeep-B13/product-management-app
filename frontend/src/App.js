import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  AppBar, Toolbar, Typography, Button, Container, Paper, Box, TextField, List, ListItem, ListItemText,
  Dialog, DialogTitle, DialogContent, DialogActions, Tabs, Tab, CircularProgress, Alert, Snackbar,
  Avatar, Menu, MenuItem, IconButton, Divider, LinearProgress, Chip, Select, FormControl, InputLabel,
  Card, CardContent, CardActions, Badge, Tooltip, Fab, SpeedDial, SpeedDialAction, SpeedDialIcon
} from '@mui/material';
import { Search, Plus, Settings, LogOut, User, FileText, Users, Calendar, CheckCircle, Clock, 
  AlertCircle, Archive, MoreVert, Edit, Delete, Copy, GitBranch, Mic, Bell, Tasks, 
  Sun, Moon, Filter, SortAsc, Bookmark, Link, MessageSquare, Bug, Lightbulb } from 'lucide-react';
import axios from 'axios';

// Enhanced API base URL configuration
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

// Enhanced axios instance with better error handling
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for better error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      localStorage.removeItem('timezone');
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

// Enhanced Authentication Component
const AuthPage = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const endpoint = isLogin ? '/api/login' : '/api/signup';
      const response = await api.post(endpoint, formData);
      
      if (isLogin) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('username', response.data.username);
        localStorage.setItem('timezone', response.data.timezone);
        onLogin(response.data.username, response.data.timezone);
      } else {
        setError('Account created successfully! Please wait for approval before logging in.');
        setIsLogin(true);
      }
    } catch (error) {
      setError(error.response?.data?.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(to bottom right, #4f46e5, #9333ea, #3730a3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Inter, sans-serif'
      }}
    >
      <Paper
        elevation={24}
        sx={{
          p: 4,
          borderRadius: '1rem',
          width: '100%',
          maxWidth: '400px',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)'
        }}
      >
        <Typography variant="h4" align="center" gutterBottom sx={{ fontWeight: 700, color: '#1f2937' }}>
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </Typography>
        
        {error && (
          <Alert severity={isLogin ? "error" : "success"} sx={{ mb: 2, borderRadius: '0.5rem' }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            margin="normal"
            required
            sx={{ mb: 2 }}
          />
          
          {!isLogin && (
            <TextField
              fullWidth
              label="Username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              margin="normal"
              required
              sx={{ mb: 2 }}
            />
          )}
          
          <TextField
            fullWidth
            label="Password"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            margin="normal"
            required
            sx={{ mb: 3 }}
          />
          
          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={loading}
            sx={{
              py: 1.5,
              borderRadius: '0.5rem',
              background: 'linear-gradient(to right, #4f46e5, #7c3aed)',
              '&:hover': {
                background: 'linear-gradient(to right, #4338ca, #6d28d9)',
              },
              mb: 2
            }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : (isLogin ? 'Sign In' : 'Sign Up')}
          </Button>
          
          <Button
            fullWidth
            variant="text"
            onClick={() => setIsLogin(!isLogin)}
            sx={{ color: '#6366f1' }}
          >
            {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
          </Button>
        </form>
      </Paper>
    </Box>
  );
};

// Enhanced Settings Page Component
const SettingsPage = ({ user, onBack, onUpdateProfile }) => {
  const [formData, setFormData] = useState({
    username: user?.username || '',
    timezone: user?.timezone || 'UTC+05:30 (Chennai)'
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      await api.put('/api/user/profile', formData);
      localStorage.setItem('username', formData.username);
      localStorage.setItem('timezone', formData.timezone);
      onUpdateProfile(formData.username, formData.timezone);
      setMessage('Profile updated successfully!');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: '1rem' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Button onClick={onBack} sx={{ mr: 2 }}>← Back</Button>
          <Typography variant="h4" sx={{ fontWeight: 600 }}>Settings</Typography>
        </Box>

        {message && (
          <Alert severity={message.includes('success') ? 'success' : 'error'} sx={{ mb: 3 }}>
            {message}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Username"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            margin="normal"
            required
            sx={{ mb: 2 }}
          />
          
          <TextField
            fullWidth
            label="Timezone"
            value={formData.timezone}
            onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
            margin="normal"
            required
            sx={{ mb: 3 }}
          />
          
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            sx={{
              px: 4,
              py: 1.5,
              borderRadius: '0.5rem',
              background: 'linear-gradient(to right, #4f46e5, #7c3aed)',
              '&:hover': {
                background: 'linear-gradient(to right, #4338ca, #6d28d9)',
              }
            }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Update Profile'}
          </Button>
        </form>
      </Paper>
    </Container>
  );
};

// NEW: My Day Component
const MyDayPage = ({ onBack }) => {
  const [myDayData, setMyDayData] = useState({ tasks: [], reminders: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyDayData();
  }, []);

  const fetchMyDayData = async () => {
    try {
      const response = await api.get('/api/tasks/my-day');
      setMyDayData(response.data);
    } catch (error) {
      console.error('Error fetching My Day data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskStatusUpdate = async (taskId, newStatus) => {
    try {
      await api.put(`/api/tasks/${taskId}`, { status: newStatus });
      fetchMyDayData(); // Refresh data
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const handleReminderAcknowledge = async (reminderId) => {
    try {
      await api.post(`/api/reminders/${reminderId}/acknowledge`);
      fetchMyDayData(); // Refresh data
    } catch (error) {
      console.error('Error acknowledging reminder:', error);
    }
  };

  const handleReminderSnooze = async (reminderId, snoozeHours = 1) => {
    try {
      const snoozeUntil = new Date();
      snoozeUntil.setHours(snoozeUntil.getHours() + snoozeHours);
      await api.post(`/api/reminders/${reminderId}/snooze`, {
        snooze_until: snoozeUntil.toISOString()
      });
      fetchMyDayData(); // Refresh data
    } catch (error) {
      console.error('Error snoozing reminder:', error);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Critical': return '#ef4444';
      case 'High': return '#f97316';
      case 'Medium': return '#eab308';
      case 'Low': return '#22c55e';
      default: return '#6b7280';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
        <Button onClick={onBack} sx={{ mr: 2 }}>← Back</Button>
        <Sun size={32} style={{ marginRight: '12px', color: '#f59e0b' }} />
        <Typography variant="h4" sx={{ fontWeight: 600 }}>My Day</Typography>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
        {/* Tasks Section */}
        <Paper elevation={3} sx={{ p: 3, borderRadius: '1rem' }}>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
            <CheckCircle size={20} style={{ marginRight: '8px', color: '#4f46e5' }} />
            Today's Tasks ({myDayData.tasks.length})
          </Typography>
          
          {myDayData.tasks.length === 0 ? (
            <Typography color="text.secondary">No tasks for today! 🎉</Typography>
          ) : (
            <List>
              {myDayData.tasks.map((task) => (
                <ListItem
                  key={task.id}
                  sx={{
                    mb: 1,
                    borderRadius: '0.5rem',
                    border: '1px solid #e5e7eb',
                    '&:hover': { backgroundColor: '#f9fafb' }
                  }}
                >
                  <Box sx={{ width: '100%' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {task.title}
                      </Typography>
                      <Chip
                        size="small"
                        label={task.priority}
                        sx={{
                          backgroundColor: getPriorityColor(task.priority),
                          color: 'white',
                          fontSize: '0.75rem'
                        }}
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {task.product_name}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleTaskStatusUpdate(task.id, 'Done')}
                        sx={{ borderRadius: '0.25rem' }}
                      >
                        Mark Done
                      </Button>
                      <Button
                        size="small"
                        variant="text"
                        onClick={() => handleTaskStatusUpdate(task.id, 'In Progress')}
                        sx={{ borderRadius: '0.25rem' }}
                      >
                        In Progress
                      </Button>
                    </Box>
                  </Box>
                </ListItem>
              ))}
            </List>
          )}
        </Paper>

        {/* Reminders Section */}
        <Paper elevation={3} sx={{ p: 3, borderRadius: '1rem' }}>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
            <Bell size={20} style={{ marginRight: '8px', color: '#f59e0b' }} />
            Reminders ({myDayData.reminders.length})
          </Typography>
          
          {myDayData.reminders.length === 0 ? (
            <Typography color="text.secondary">No reminders for today! 🔔</Typography>
          ) : (
            <List>
              {myDayData.reminders.map((reminder) => (
                <ListItem
                  key={reminder.id}
                  sx={{
                    mb: 1,
                    borderRadius: '0.5rem',
                    border: '1px solid #fbbf24',
                    backgroundColor: '#fef3c7',
                    '&:hover': { backgroundColor: '#fde68a' }
                  }}
                >
                  <Box sx={{ width: '100%' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                      {reminder.title}
                    </Typography>
                    {reminder.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {reminder.description}
                      </Typography>
                    )}
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                      {reminder.product_name && `Product: ${reminder.product_name} • `}
                      {new Date(reminder.reminder_date).toLocaleString()}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => handleReminderAcknowledge(reminder.id)}
                        sx={{ borderRadius: '0.25rem', backgroundColor: '#22c55e' }}
                      >
                        Done
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleReminderSnooze(reminder.id, 1)}
                        sx={{ borderRadius: '0.25rem' }}
                      >
                        Snooze 1h
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleReminderSnooze(reminder.id, 24)}
                        sx={{ borderRadius: '0.25rem' }}
                      >
                        Tomorrow
                      </Button>
                    </Box>
                  </Box>
                </ListItem>
              ))}
            </List>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

// NEW: Global Tasks Page
const GlobalTasksPage = ({ onBack, onTaskClick }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, my-tasks, high-priority
  const [sortBy, setSortBy] = useState('due_date'); // due_date, priority, created_at

  useEffect(() => {
    fetchAllTasks();
  }, []);

  const fetchAllTasks = async () => {
    try {
      const response = await api.get('/api/tasks');
      setTasks(response.data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedTasks = useMemo(() => {
    let filtered = tasks;
    
    // Apply filters
    if (filter === 'my-tasks') {
      const currentUser = localStorage.getItem('username');
      filtered = tasks.filter(task => task.assigned_to_username === currentUser);
    } else if (filter === 'high-priority') {
      filtered = tasks.filter(task => ['High', 'Critical'].includes(task.priority));
    }
    
    // Apply sorting
    return filtered.sort((a, b) => {
      if (sortBy === 'due_date') {
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date) - new Date(b.due_date);
      } else if (sortBy === 'priority') {
        const priorityOrder = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
        return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
      } else if (sortBy === 'created_at') {
        return new Date(b.created_at) - new Date(a.created_at);
      }
      return 0;
    });
  }, [tasks, filter, sortBy]);

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Critical': return '#ef4444';
      case 'High': return '#f97316';
      case 'Medium': return '#eab308';
      case 'Low': return '#22c55e';
      default: return '#6b7280';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Done': return '#22c55e';
      case 'In Progress': return '#3b82f6';
      case 'Blocked': return '#ef4444';
      case 'To Do': return '#6b7280';
      default: return '#6b7280';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
        <Button onClick={onBack} sx={{ mr: 2 }}>← Back</Button>
        <Tasks size={32} style={{ marginRight: '12px', color: '#4f46e5' }} />
        <Typography variant="h4" sx={{ fontWeight: 600 }}>All Tasks</Typography>
      </Box>

      {/* Filters and Sorting */}
      <Paper elevation={2} sx={{ p: 2, mb: 3, borderRadius: '0.5rem' }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Filter</InputLabel>
            <Select
              value={filter}
              label="Filter"
              onChange={(e) => setFilter(e.target.value)}
            >
              <MenuItem value="all">All Tasks</MenuItem>
              <MenuItem value="my-tasks">My Tasks</MenuItem>
              <MenuItem value="high-priority">High Priority</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Sort By</InputLabel>
            <Select
              value={sortBy}
              label="Sort By"
              onChange={(e) => setSortBy(e.target.value)}
            >
              <MenuItem value="due_date">Due Date</MenuItem>
              <MenuItem value="priority">Priority</MenuItem>
              <MenuItem value="created_at">Created Date</MenuItem>
            </Select>
          </FormControl>
          
          <Typography variant="body2" color="text.secondary">
            {filteredAndSortedTasks.length} tasks
          </Typography>
        </Box>
      </Paper>

      {/* Tasks List */}
      {filteredAndSortedTasks.length === 0 ? (
        <Paper elevation={2} sx={{ p: 4, textAlign: 'center', borderRadius: '1rem' }}>
          <Typography color="text.secondary">No tasks found</Typography>
        </Paper>
      ) : (
        <List>
          {filteredAndSortedTasks.map((task) => (
            <ListItem
              key={task.id}
              sx={{
                mb: 2,
                borderRadius: '0.5rem',
                border: '1px solid #e5e7eb',
                '&:hover': { backgroundColor: '#f9fafb', cursor: 'pointer' },
                p: 2
              }}
              onClick={() => onTaskClick && onTaskClick(task.product_id, task.id)}
            >
              <Box sx={{ width: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {task.title}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Chip
                      size="small"
                      label={task.priority}
                      sx={{
                        backgroundColor: getPriorityColor(task.priority),
                        color: 'white',
                        fontSize: '0.75rem'
                      }}
                    />
                    <Chip
                      size="small"
                      label={task.status}
                      sx={{
                        backgroundColor: getStatusColor(task.status),
                        color: 'white',
                        fontSize: '0.75rem'
                      }}
                    />
                  </Box>
                </Box>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Product: {task.product_name}
                </Typography>
                
                {task.description && (
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    {task.description}
                  </Typography>
                )}
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                  {task.assigned_to_username && (
                    <Typography variant="caption" color="text.secondary">
                      Assigned to: {task.assigned_to_username}
                    </Typography>
                  )}
                  {task.due_date && (
                    <Typography variant="caption" color="text.secondary">
                      Due: {new Date(task.due_date).toLocaleDateString()}
                    </Typography>
                  )}
                  <Typography variant="caption" color="text.secondary">
                    Type: {task.task_type}
                  </Typography>
                </Box>
              </Box>
            </ListItem>
          ))}
        </List>
      )}
    </Container>
  );
};

// NEW: Create Iteration Dialog
const CreateIterationDialog = ({ open, onClose, parentProduct, onIterationCreated }) => {
  const [iterationName, setIterationName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!iterationName.trim()) return;

    setLoading(true);
    try {
      const response = await api.post(`/api/products/${parentProduct.id}/iterations`, {
        name: iterationName,
        description: description
      });
      onIterationCreated(response.data);
      onClose();
      setIterationName('');
      setDescription('');
    } catch (error) {
      console.error('Error creating iteration:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
        <GitBranch size={24} style={{ marginRight: '8px', color: '#4f46e5' }} />
        Create Iteration for "{parentProduct?.name}"
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Iteration Name"
            value={iterationName}
            onChange={(e) => setIterationName(e.target.value)}
            margin="normal"
            required
            placeholder="e.g., Mobile Optimization, Performance Improvements"
          />
          <TextField
            fullWidth
            label="Description (Optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            margin="normal"
            multiline
            rows={3}
            placeholder="Brief description of what this iteration will focus on..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading || !iterationName.trim()}
            sx={{
              background: 'linear-gradient(to right, #4f46e5, #7c3aed)',
              '&:hover': {
                background: 'linear-gradient(to right, #4338ca, #6d28d9)',
              }
            }}
          >
            {loading ? <CircularProgress size={20} color="inherit" /> : 'Create Iteration'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

// Enhanced Main App Component
const App = () => {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [timezone, setTimezone] = useState('');
  
  // Navigation state
  const [currentPage, setCurrentPage] = useState('main'); // 'main', 'settings', 'my-day', 'tasks'
  
  // Products state
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [profileMenuAnchor, setProfileMenuAnchor] = useState(null);
  const [createProductDialog, setCreateProductDialog] = useState(false);
  const [createIterationDialog, setCreateIterationDialog] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  
  // Enhanced state for new features
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  // Check authentication on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUsername = localStorage.getItem('username');
    const storedTimezone = localStorage.getItem('timezone');
    
    if (token && storedUsername) {
      setIsAuthenticated(true);
      setUsername(storedUsername);
      setTimezone(storedTimezone);
    }
    setLoading(false);
  }, []);

  // Fetch products when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchProducts();
      fetchNotifications();
    }
  }, [isAuthenticated]);

  const fetchProducts = async () => {
    try {
      const response = await api.get('/api/products');
      setProducts(response.data);
      if (response.data.length > 0 && !selectedProduct) {
        setSelectedProduct(response.data[0]);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/api/reminders');
      const activeReminders = response.data.filter(r => !r.is_acknowledged && !r.is_snoozed);
      setNotifications(activeReminders);
      setUnreadNotifications(activeReminders.length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const handleLogin = (user, tz) => {
    setIsAuthenticated(true);
    setUsername(user);
    setTimezone(tz);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('timezone');
    setIsAuthenticated(false);
    setUsername('');
    setTimezone('');
    setSelectedProduct(null);
    setProducts([]);
  };

  const handleUpdateProfile = (newUsername, newTimezone) => {
    setUsername(newUsername);
    setTimezone(newTimezone);
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    if (!newProductName.trim()) return;

    try {
      const response = await api.post('/api/products', {
        name: newProductName,
        status: 'Active'
      });
      setProducts([response.data, ...products]);
      setSelectedProduct(response.data);
      setNewProductName('');
      setCreateProductDialog(false);
    } catch (error) {
      console.error('Error creating product:', error);
    }
  };

  const handleIterationCreated = (newIteration) => {
    setProducts([newIteration, ...products]);
    setSelectedProduct(newIteration);
  };

  const handleTaskClick = (productId, taskId) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      setSelectedProduct(product);
      setActiveTab(7); // Tasks tab
      setCurrentPage('main');
    }
  };

  // Filter products based on search and status
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || product.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [products, searchTerm, filterStatus]);

  // Group products by parent-child relationship
  const groupedProducts = useMemo(() => {
    const parentProducts = filteredProducts.filter(p => !p.parent_id);
    const childProducts = filteredProducts.filter(p => p.parent_id);
    
    return parentProducts.map(parent => ({
      ...parent,
      iterations: childProducts.filter(child => child.parent_id === parent.id)
        .sort((a, b) => a.iteration_number - b.iteration_number)
    }));
  }, [filteredProducts]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage onLogin={handleLogin} />;
  }

  // Render different pages based on currentPage state
  if (currentPage === 'settings') {
    return (
      <SettingsPage
        user={{ username, timezone }}
        onBack={() => setCurrentPage('main')}
        onUpdateProfile={handleUpdateProfile}
      />
    );
  }

  if (currentPage === 'my-day') {
    return <MyDayPage onBack={() => setCurrentPage('main')} />;
  }

  if (currentPage === 'tasks') {
    return (
      <GlobalTasksPage
        onBack={() => setCurrentPage('main')}
        onTaskClick={handleTaskClick}
      />
    );
  }

  // Main application layout
  return (
    <Box sx={{ display: 'flex', height: '100vh', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <AppBar
        position="fixed"
        sx={{
          zIndex: 1201,
          background: 'linear-gradient(to right, #4f46e5, #7c3aed)',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}
      >
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
            AI Product Manager
          </Typography>
          
          <Typography variant="body2" sx={{ mr: 3, opacity: 0.9 }}>
            {username ? `Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, ${username}! Ready to build something amazing today?` : ''}
          </Typography>

          {/* Notifications */}
          <IconButton
            color="inherit"
            onClick={() => setCurrentPage('my-day')}
            sx={{ mr: 1 }}
          >
            <Badge badgeContent={unreadNotifications} color="error">
              <Bell size={20} />
            </Badge>
          </IconButton>

          {/* Profile Menu */}
          <IconButton
            color="inherit"
            onClick={(e) => setProfileMenuAnchor(e.currentTarget)}
          >
            <Avatar
              sx={{
                width: 32,
                height: 32,
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                animation: 'pulse 2s infinite'
              }}
            >
              <User size={18} />
            </Avatar>
          </IconButton>
          
          <Menu
            anchorEl={profileMenuAnchor}
            open={Boolean(profileMenuAnchor)}
            onClose={() => setProfileMenuAnchor(null)}
          >
            <MenuItem onClick={() => { setCurrentPage('settings'); setProfileMenuAnchor(null); }}>
              <Settings size={16} style={{ marginRight: '8px' }} />
              Settings
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <LogOut size={16} style={{ marginRight: '8px' }} />
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      <Paper
        elevation={3}
        sx={{
          width: 280,
          mt: 8,
          height: 'calc(100vh - 64px)',
          borderRadius: 0,
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Add New Item Button */}
        <Box sx={{ p: 2 }}>
          <Button
            fullWidth
            variant="contained"
            startIcon={<Plus size={18} />}
            onClick={() => setCreateProductDialog(true)}
            sx={{
              py: 1.5,
              borderRadius: '0.5rem',
              background: 'linear-gradient(to right, #4f46e5, #7c3aed)',
              '&:hover': {
                background: 'linear-gradient(to right, #4338ca, #6d28d9)',
              }
            }}
          >
            Add New Item
          </Button>
        </Box>

        {/* Navigation Buttons */}
        <Box sx={{ px: 2, pb: 2 }}>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<Sun size={18} />}
            onClick={() => setCurrentPage('my-day')}
            sx={{ mb: 1, borderRadius: '0.5rem', justifyContent: 'flex-start' }}
          >
            My Day
          </Button>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<Tasks size={18} />}
            onClick={() => setCurrentPage('tasks')}
            sx={{ borderRadius: '0.5rem', justifyContent: 'flex-start' }}
          >
            Tasks
          </Button>
        </Box>

        <Divider />

        {/* Search and Filter */}
        <Box sx={{ p: 2 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <Search size={18} style={{ marginRight: '8px', color: '#6b7280' }} />
            }}
            sx={{ mb: 2 }}
          />
          
          <FormControl fullWidth size="small">
            <InputLabel>Filter by Status</InputLabel>
            <Select
              value={filterStatus}
              label="Filter by Status"
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <MenuItem value="all">All Items</MenuItem>
              <MenuItem value="Active">Active</MenuItem>
              <MenuItem value="Completed">Completed</MenuItem>
              <MenuItem value="On-Hold">On Hold</MenuItem>
              <MenuItem value="Cancelled">Cancelled</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Products List */}
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          <List>
            {groupedProducts.map((product) => (
              <React.Fragment key={product.id}>
                {/* Parent Product */}
                <ListItem
                  button
                  selected={selectedProduct?.id === product.id}
                  onClick={() => setSelectedProduct(product)}
                  sx={{
                    borderRadius: '0.5rem',
                    mx: 1,
                    mb: 0.5,
                    '&.Mui-selected': {
                      backgroundColor: '#e0e7ff',
                      '&:hover': { backgroundColor: '#c7d2fe' }
                    }
                  }}
                >
                  <ListItemText
                    primary={product.name}
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                        <Chip
                          size="small"
                          label={product.status}
                          sx={{
                            fontSize: '0.75rem',
                            height: '20px',
                            backgroundColor: product.status === 'Active' ? '#22c55e' : 
                                           product.status === 'Completed' ? '#3b82f6' : '#6b7280',
                            color: 'white'
                          }}
                        />
                        <LinearProgress
                          variant="determinate"
                          value={product.progress}
                          sx={{
                            ml: 1,
                            flex: 1,
                            height: 4,
                            borderRadius: 2,
                            backgroundColor: '#e5e7eb',
                            '& .MuiLinearProgress-bar': {
                              backgroundColor: '#4f46e5'
                            }
                          }}
                        />
                        <Typography variant="caption" sx={{ ml: 1, color: '#6b7280' }}>
                          {product.progress}%
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>

                {/* Child Iterations */}
                {product.iterations.map((iteration) => (
                  <ListItem
                    key={iteration.id}
                    button
                    selected={selectedProduct?.id === iteration.id}
                    onClick={() => setSelectedProduct(iteration)}
                    sx={{
                      borderRadius: '0.5rem',
                      mx: 1,
                      mb: 0.5,
                      ml: 3, // Indent iterations
                      '&.Mui-selected': {
                        backgroundColor: '#e0e7ff',
                        '&:hover': { backgroundColor: '#c7d2fe' }
                      }
                    }}
                  >
                    <GitBranch size={16} style={{ marginRight: '8px', color: '#6b7280' }} />
                    <ListItemText
                      primary={
                        <Typography variant="body2">
                          {iteration.name}
                        </Typography>
                      }
                      secondary={
                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                          <Chip
                            size="small"
                            label={`Iteration ${iteration.iteration_number}`}
                            sx={{
                              fontSize: '0.7rem',
                              height: '18px',
                              backgroundColor: '#7c3aed',
                              color: 'white'
                            }}
                          />
                          <LinearProgress
                            variant="determinate"
                            value={iteration.progress}
                            sx={{
                              ml: 1,
                              flex: 1,
                              height: 3,
                              borderRadius: 2,
                              backgroundColor: '#e5e7eb',
                              '& .MuiLinearProgress-bar': {
                                backgroundColor: '#7c3aed'
                              }
                            }}
                          />
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </React.Fragment>
            ))}
          </List>
        </Box>
      </Paper>

      {/* Main Content */}
      <Box sx={{ flex: 1, mt: 8, overflow: 'auto' }}>
        {selectedProduct ? (
          <Container maxWidth="lg" sx={{ py: 3 }}>
            {/* Product Header */}
            <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: '1rem' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
                    {selectedProduct.name}
                    {selectedProduct.parent_id && (
                      <Chip
                        size="small"
                        label={`Iteration ${selectedProduct.iteration_number}`}
                        sx={{
                          ml: 2,
                          backgroundColor: '#7c3aed',
                          color: 'white'
                        }}
                      />
                    )}
                  </Typography>
                  {selectedProduct.parent_name && (
                    <Typography variant="body2" color="text.secondary">
                      Iteration of: {selectedProduct.parent_name}
                    </Typography>
                  )}
                </Box>
                
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {/* Create Iteration Button (only for parent products) */}
                  {!selectedProduct.parent_id && (
                    <Button
                      variant="outlined"
                      startIcon={<GitBranch size={18} />}
                      onClick={() => setCreateIterationDialog(true)}
                      sx={{ borderRadius: '0.5rem' }}
                    >
                      Create Iteration
                    </Button>
                  )}
                  
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={selectedProduct.status}
                      label="Status"
                      onChange={async (e) => {
                        try {
                          await api.put(`/api/products/${selectedProduct.id}`, {
                            status: e.target.value
                          });
                          setSelectedProduct({ ...selectedProduct, status: e.target.value });
                          fetchProducts(); // Refresh the list
                        } catch (error) {
                          console.error('Error updating status:', error);
                        }
                      }}
                    >
                      <MenuItem value="Active">Active</MenuItem>
                      <MenuItem value="Completed">Completed</MenuItem>
                      <MenuItem value="On-Hold">On Hold</MenuItem>
                      <MenuItem value="Cancelled">Cancelled</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Box>
              
              <LinearProgress
                variant="determinate"
                value={selectedProduct.progress}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: '#e5e7eb',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: selectedProduct.parent_id ? '#7c3aed' : '#4f46e5'
                  }
                }}
              />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Overall Progress: {selectedProduct.progress}%
              </Typography>
            </Paper>

            {/* Tabs */}
            <Paper elevation={2} sx={{ borderRadius: '1rem' }}>
              <Tabs
                value={activeTab}
                onChange={(e, newValue) => setActiveTab(newValue)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                  borderBottom: '1px solid #e5e7eb',
                  '& .MuiTab-root': {
                    textTransform: 'none',
                    fontWeight: 500,
                    '&.Mui-selected': {
                      color: '#4f46e5'
                    }
                  },
                  '& .MuiTabs-indicator': {
                    backgroundColor: '#4f46e5'
                  }
                }}
              >
                <Tab label="Research (20%)" />
                <Tab label="PRD (10%)" />
                <Tab label="Design (15%)" />
                <Tab label="Development (30%)" />
                <Tab label="Tech Documentation (10%)" />
                <Tab label="Launch & Training (15%)" />
                <Tab label="Feedbacks" />
                <Tab label="Tasks" />
                <Tab label="Repo" />
                <Tab label="Important Notes" />
                <Tab label="Iterations" />
              </Tabs>

              {/* Tab Content */}
              <Box sx={{ p: 3 }}>
                {activeTab === 0 && (
                  <Typography>Research tab content - Market research and customer interviews will be implemented here</Typography>
                )}
                {activeTab === 1 && (
                  <Typography>PRD tab content - Product Requirements Document generation will be implemented here</Typography>
                )}
                {activeTab === 2 && (
                  <Typography>Design tab content - UI prototyping and design management will be implemented here</Typography>
                )}
                {activeTab === 3 && (
                  <Typography>Development tab content - Team management and daily scrum will be implemented here</Typography>
                )}
                {activeTab === 4 && (
                  <Typography>Tech Documentation tab content - AI-powered handover documents will be implemented here</Typography>
                )}
                {activeTab === 5 && (
                  <Typography>Launch & Training tab content - GTM coordination and training tracking will be implemented here</Typography>
                )}
                {activeTab === 6 && (
                  <Typography>Feedbacks tab content - Pattern recognition and prioritization will be implemented here</Typography>
                )}
                {activeTab === 7 && (
                  <Typography>Tasks tab content - Adhoc task management will be implemented here</Typography>
                )}
                {activeTab === 8 && (
                  <Typography>Repo tab content - Link management table will be implemented here</Typography>
                )}
                {activeTab === 9 && (
                  <Typography>Important Notes tab content - General notes with Editor.js will be implemented here</Typography>
                )}
                {activeTab === 10 && (
                  <Box>
                    <Typography variant="h6" sx={{ mb: 2 }}>Iterations</Typography>
                    {selectedProduct.children && selectedProduct.children.length > 0 ? (
                      <List>
                        {selectedProduct.children.map((iteration) => (
                          <ListItem
                            key={iteration.id}
                            sx={{
                              border: '1px solid #e5e7eb',
                              borderRadius: '0.5rem',
                              mb: 1,
                              '&:hover': { backgroundColor: '#f9fafb', cursor: 'pointer' }
                            }}
                            onClick={() => setSelectedProduct(iteration)}
                          >
                            <GitBranch size={20} style={{ marginRight: '12px', color: '#7c3aed' }} />
                            <ListItemText
                              primary={iteration.name}
                              secondary={`Iteration ${iteration.iteration_number} • Progress: ${iteration.progress}%`}
                            />
                          </ListItem>
                        ))}
                      </List>
                    ) : (
                      <Typography color="text.secondary">
                        No iterations created yet. Click "Create Iteration" to get started.
                      </Typography>
                    )}
                  </Box>
                )}
              </Box>
            </Paper>
          </Container>
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
            <Typography variant="h6" color="text.secondary">
              Select a product to get started
            </Typography>
          </Box>
        )}
      </Box>

      {/* Create Product Dialog */}
      <Dialog open={createProductDialog} onClose={() => setCreateProductDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Product/Item</DialogTitle>
        <form onSubmit={handleCreateProduct}>
          <DialogContent>
            <TextField
              autoFocus
              fullWidth
              label="Product Name"
              value={newProductName}
              onChange={(e) => setNewProductName(e.target.value)}
              margin="normal"
              required
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateProductDialog(false)}>Cancel</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={!newProductName.trim()}
              sx={{
                background: 'linear-gradient(to right, #4f46e5, #7c3aed)',
                '&:hover': {
                  background: 'linear-gradient(to right, #4338ca, #6d28d9)',
                }
              }}
            >
              Create
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Create Iteration Dialog */}
      <CreateIterationDialog
        open={createIterationDialog}
        onClose={() => setCreateIterationDialog(false)}
        parentProduct={selectedProduct}
        onIterationCreated={handleIterationCreated}
      />
    </Box>
  );
};

export default App;