const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Allowed origins - add your frontend URL
const allowedOrigins = [
    'https://aks-manager-links.vercel.app',
    'http://localhost:3000',
    'http://localhost:5000'
];

// CORS configuration
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

// Handle preflight requests
app.options('*', cors());

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB connection
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/quicklinks';

mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
})
.then(() => console.log('✅ MongoDB Connected successfully to:', mongoURI.split('@')[1] || mongoURI))
.catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    console.log('Please check your MongoDB connection string in the .env file');
});

// Simple Link Schema
const linkSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true,
        trim: true
    },
    url: { 
        type: String, 
        required: true,
        trim: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Link = mongoose.model('Link', linkSchema);

// Health check endpoint
app.get('/api/health', (req, res) => {
    const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    res.json({ 
        status: 'OK', 
        message: 'QuickLink API is running',
        mongodb: mongoStatus,
        timestamp: new Date().toISOString(),
        endpoints: [
            'GET /api/links',
            'POST /api/links',
            'PUT /api/links/:id',
            'DELETE /api/links/:id'
        ]
    });
});

// GET all links
app.get('/api/links', async (req, res) => {
    try {
        console.log(`📥 ${req.method} ${req.path} from ${req.headers.origin || 'unknown origin'}`);
        
        const links = await Link.find().sort({ createdAt: -1 });
        console.log(`✅ Found ${links.length} links`);
        
        res.json(links);
    } catch (err) {
        console.error('❌ Error fetching links:', err.message);
        res.status(500).json({ 
            error: 'Failed to fetch links',
            message: err.message 
        });
    }
});

// POST create link
app.post('/api/links', async (req, res) => {
    try {
        console.log(`📝 ${req.method} ${req.path} - Creating new link`);
        console.log('Request body:', req.body);
        
        const { name, url } = req.body;
        
        // Basic validation
        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Name is required' });
        }
        
        if (!url || !url.trim()) {
            return res.status(400).json({ error: 'URL is required' });
        }
        
        // Add https:// if missing
        let formattedUrl = url.trim();
        if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
            formattedUrl = 'https://' + formattedUrl;
        }
        
        const newLink = new Link({
            name: name.trim(),
            url: formattedUrl
        });
        
        const savedLink = await newLink.save();
        console.log('✅ Link created with ID:', savedLink._id);
        
        res.status(201).json(savedLink);
    } catch (err) {
        console.error('❌ Error creating link:', err.message);
        res.status(500).json({ 
            error: 'Failed to create link',
            message: err.message 
        });
    }
});

// PUT update link
app.put('/api/links/:id', async (req, res) => {
    try {
        console.log(`🔄 ${req.method} ${req.path} - Updating link`);
        
        const { id } = req.params;
        const { name, url } = req.body;
        
        if (!name || !name.trim() || !url || !url.trim()) {
            return res.status(400).json({ error: 'Name and URL are required' });
        }
        
        // Add https:// if missing
        let formattedUrl = url.trim();
        if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
            formattedUrl = 'https://' + formattedUrl;
        }
        
        const updated = await Link.findByIdAndUpdate(
            id,
            { 
                name: name.trim(),
                url: formattedUrl
            },
            { new: true }
        );
        
        if (!updated) {
            return res.status(404).json({ error: 'Link not found' });
        }
        
        console.log('✅ Link updated:', updated._id);
        res.json(updated);
    } catch (err) {
        console.error('❌ Error updating link:', err.message);
        
        if (err.name === 'CastError') {
            return res.status(400).json({ error: 'Invalid link ID format' });
        }
        
        res.status(500).json({ 
            error: 'Failed to update link',
            message: err.message 
        });
    }
});

// DELETE remove link
app.delete('/api/links/:id', async (req, res) => {
    try {
        console.log(`🗑️ ${req.method} ${req.path} - Deleting link`);
        
        const { id } = req.params;
        const deleted = await Link.findByIdAndDelete(id);
        
        if (!deleted) {
            return res.status(404).json({ error: 'Link not found' });
        }
        
        console.log('✅ Link deleted:', deleted._id);
        res.json({ 
            message: 'Link deleted successfully',
            id: deleted._id 
        });
    } catch (err) {
        console.error('❌ Error deleting link:', err.message);
        
        if (err.name === 'CastError') {
            return res.status(400).json({ error: 'Invalid link ID format' });
        }
        
        res.status(500).json({ 
            error: 'Failed to delete link',
            message: err.message 
        });
    }
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'QuickLink Vault API',
        version: '1.0.0',
        endpoints: {
            health: '/api/health',
            links: '/api/links',
            documentation: 'See README for API usage'
        },
        frontend: 'https://aks-manager-links.vercel.app'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        path: req.path,
        method: req.method,
        availableEndpoints: ['GET /api/links', 'POST /api/links', 'PUT /api/links/:id', 'DELETE /api/links/:id']
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('🔥 Server error:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 Local: http://localhost:${PORT}`);
    console.log(`🔗 Frontend: https://aks-manager-links.vercel.app`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});