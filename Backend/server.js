const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// CORS configuration
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, Postman, or file:// protocol)
        // When origin is null/undefined, it means the request is from file:// or same-origin
        if (!origin || origin === 'null') {
            return callback(null, true);
        }
        
        const allowedOrigins = [
            'https://aks-manager-links.vercel.app',
            'http://localhost:3000',
            'http://localhost:5000',
            'http://localhost:8080',
            'http://127.0.0.1:5000',
            'http://127.0.0.1:8080'
        ];
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            // In development, allow all origins for easier testing
            if (process.env.NODE_ENV !== 'production') {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
app.use(express.static('public'));

// MongoDB connection
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/quicklinks';

console.log('🔗 Attempting MongoDB connection...');

mongoose.connect(mongoURI)
.then(() => {
    console.log('✅ MongoDB Connected successfully');
    console.log('📊 Database:', mongoose.connection.name);
})
.catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
});

// Folder Schema
const folderSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true,
        default: ''
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Link Schema
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
    folder: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Folder',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

const Folder = mongoose.model('Folder', folderSchema);
const Link = mongoose.model('Link', linkSchema);

// Health check endpoint
app.get('/api/health', (req, res) => {
    const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    res.json({ 
        status: 'OK', 
        message: 'QuickLink API is running',
        mongodb: mongoStatus,
        timestamp: new Date().toISOString()
    });
});

// GET all folders with their links
app.get('/api/folders', async (req, res) => {
    try {
        const folders = await Folder.find().sort({ createdAt: -1 });
        
        // Get links for each folder
        const foldersWithLinks = await Promise.all(
            folders.map(async (folder) => {
                const links = await Link.find({ folder: folder._id }).sort({ createdAt: -1 });
                return {
                    ...folder.toObject(),
                    links
                };
            })
        );
        
        res.json(foldersWithLinks);
    } catch (err) {
        console.error('❌ Error fetching folders:', err.message);
        res.status(500).json({ 
            error: 'Failed to fetch folders',
            message: err.message 
        });
    }
});

// POST create folder
app.post('/api/folders', async (req, res) => {
    try {
        const { name, description } = req.body;
        
        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Folder name is required' });
        }
        
        const newFolder = new Folder({
            name: name.trim(),
            description: description?.trim() || ''
        });
        
        const savedFolder = await newFolder.save();
        res.status(201).json(savedFolder);
    } catch (err) {
        console.error('❌ Error creating folder:', err.message);
        res.status(500).json({ 
            error: 'Failed to create folder',
            message: err.message 
        });
    }
});

// PUT update folder
app.put('/api/folders/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        
        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Folder name is required' });
        }
        
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'Invalid folder ID format' });
        }
        
        const updated = await Folder.findByIdAndUpdate(
            id,
            { 
                name: name.trim(),
                description: description?.trim() || '',
                updatedAt: Date.now()
            },
            { new: true }
        );
        
        if (!updated) {
            return res.status(404).json({ error: 'Folder not found' });
        }
        
        res.json(updated);
    } catch (err) {
        console.error('❌ Error updating folder:', err.message);
        res.status(500).json({ 
            error: 'Failed to update folder',
            message: err.message 
        });
    }
});

// DELETE folder
app.delete('/api/folders/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'Invalid folder ID format' });
        }
        
        // Delete all links in the folder first
        await Link.deleteMany({ folder: id });
        
        // Then delete the folder
        const deleted = await Folder.findByIdAndDelete(id);
        
        if (!deleted) {
            return res.status(404).json({ error: 'Folder not found' });
        }
        
        res.json({ 
            message: 'Folder and all its links deleted successfully',
            id: deleted._id 
        });
    } catch (err) {
        console.error('❌ Error deleting folder:', err.message);
        res.status(500).json({ 
            error: 'Failed to delete folder',
            message: err.message 
        });
    }
});

// POST create link
app.post('/api/links', async (req, res) => {
    try {
        const { name, url, folderId } = req.body;
        
        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Link name is required' });
        }
        
        if (!url || !url.trim()) {
            return res.status(400).json({ error: 'URL is required' });
        }
        
        if (!folderId) {
            return res.status(400).json({ error: 'Folder ID is required' });
        }
        
        // Format URL
        let formattedUrl = url.trim();
        if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
            formattedUrl = 'https://' + formattedUrl;
        }
        
        const newLink = new Link({
            name: name.trim(),
            url: formattedUrl,
            folder: folderId
        });
        
        const savedLink = await newLink.save();
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
        const { id } = req.params;
        const { name, url } = req.body;
        
        if (!name || !name.trim() || !url || !url.trim()) {
            return res.status(400).json({ error: 'Name and URL are required' });
        }
        
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'Invalid link ID format' });
        }
        
        // Format URL
        let formattedUrl = url.trim();
        if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
            formattedUrl = 'https://' + formattedUrl;
        }
        
        const updated = await Link.findByIdAndUpdate(
            id,
            { 
                name: name.trim(),
                url: formattedUrl,
                updatedAt: Date.now()
            },
            { new: true }
        );
        
        if (!updated) {
            return res.status(404).json({ error: 'Link not found' });
        }
        
        res.json(updated);
    } catch (err) {
        console.error('❌ Error updating link:', err.message);
        res.status(500).json({ 
            error: 'Failed to update link',
            message: err.message 
        });
    }
});

// DELETE link
app.delete('/api/links/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'Invalid link ID format' });
        }
        
        const deleted = await Link.findByIdAndDelete(id);
        
        if (!deleted) {
            return res.status(404).json({ error: 'Link not found' });
        }
        
        res.json({ 
            message: 'Link deleted successfully',
            id: deleted._id 
        });
    } catch (err) {
        console.error('❌ Error deleting link:', err.message);
        res.status(500).json({ 
            error: 'Failed to delete link',
            message: err.message 
        });
    }
});

// API info endpoint (moved from root to avoid interfering with static file serving)
app.get('/api', (req, res) => {
    res.json({
        message: 'QuickLink Vault API with Folders',
        version: '2.0.0',
        endpoints: {
            health: '/api/health',
            folders: '/api/folders',
            links: '/api/links'
        }
    });
});

// 404 handler for API routes only
app.use((req, res, next) => {
    // Only handle 404 for API routes
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({
            error: 'API endpoint not found',
            availableEndpoints: [
                'GET /api/health',
                'GET /api/folders',
                'POST /api/folders',
                'PUT /api/folders/:id',
                'DELETE /api/folders/:id',
                'POST /api/links',
                'PUT /api/links/:id',
                'DELETE /api/links/:id'
            ]
        });
    }
    // For non-API routes, let static file handler or default 404 handle it
    next();
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📁 API Base URL: http://localhost:${PORT}/api`);
});