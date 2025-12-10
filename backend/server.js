require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const Product = require('./models/Product');
const Order = require('./models/Order');
const Config = require('./models/Config');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// Socket.io Setup
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins for dev
        methods: ["GET", "POST"]
    }
});

// Track active connections per table
const tableConnections = {}; // { tableId: count }

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('join_table', async (tableId) => {
        const id = parseInt(tableId);
        if (!tableConnections[id]) tableConnections[id] = 0;
        tableConnections[id]++;
        socket.tableId = id; // Store tableId on socket for disconnect handling
        console.log(`Table ${id} joined. Viewers: ${tableConnections[id]}`);

        await broadcastTableStatus();
    });

    socket.on('leave_table', async (tableId) => {
        const id = parseInt(tableId);
        if (tableConnections[id] > 0) {
            tableConnections[id]--;
            if (tableConnections[id] === 0) delete tableConnections[id];
        }
        await broadcastTableStatus();
    });

    socket.on('disconnect', async () => {
        console.log('User disconnected:', socket.id);
        if (socket.tableId) {
            const id = socket.tableId;
            if (tableConnections[id] > 0) {
                tableConnections[id]--;
                if (tableConnections[id] === 0) delete tableConnections[id];
                console.log(`Table ${id} user disconnected. Viewers: ${tableConnections[id] || 0}`);
                await broadcastTableStatus();
            }
        }
    });

    // Helper to broadcast status
    const broadcastTableStatus = async () => {
        try {
            // Get DB active orders
            const activeOrders = await Order.find({ status: { $nin: ['Completed', 'Cancelled'] } }).select('tableNo');
            const dbOccupied = activeOrders.map(order => parseInt(order.tableNo));

            // Get Socket active connections
            const socketOccupied = Object.keys(tableConnections).map(Number);

            const occupiedTables = [...new Set([...dbOccupied, ...socketOccupied])];

            // Emit to all clients (Landing page needs this)
            io.emit('table_status_update', occupiedTables);
        } catch (err) {
            console.error("Broadcast Error:", err);
        }
    };
});

// MongoDB Connection
// Use a local DB since no URI provided, or env var.
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/restaurant_app';

mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error('MongoDB Connection Error:', err));

// Routes

// GET /api/products - Get all menu items
app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/products - Add a menu item (for seeding/admin)
app.post('/api/products', async (req, res) => {
    try {
        const product = new Product(req.body);
        await product.save();
        res.status(201).json(product);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// PUT /api/products/:id - Update product (e.g. Trending)
app.put('/api/products/:id', async (req, res) => {
    try {
        const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(product);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// GET /api/config - Get store config
app.get('/api/config', async (req, res) => {
    try {
        let config = await Config.findOne({ key: 'store_config' });
        if (!config) {
            config = new Config();
            await config.save();
        }
        res.json(config);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/config - Update store config
app.post('/api/config', async (req, res) => {
    try {
        const config = await Config.findOneAndUpdate(
            { key: 'store_config' },
            req.body,
            { new: true, upsert: true }
        );
        res.json(config);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// POST /api/orders - Place a new order
app.post('/api/orders', async (req, res) => {
    try {
        const { tableNo, items, totalAmount } = req.body;

        const order = new Order({
            tableNo,
            items,
            totalAmount
        });

        await order.save();

        // Emit new order event to all connected clients (Admin Dashboard)
        io.emit('new_order', order);

        res.status(201).json(order);
    } catch (err) {
        console.error("Order Creation Error:", err);
        res.status(400).json({ error: err.message });
    }
});

// GET /api/orders - Get all orders (for Admin Dashboard)
app.get('/api/orders', async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/orders/:id/status - Update order status
app.put('/api/orders/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const order = await Order.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );

        // 3. Extract unique table numbers (ensure they are Numbers)
        // Note: 'activeOrders' and 'totalTables' are not defined in this scope.
        // This code block seems to be misplaced or intended for a different endpoint.
        // 3. Extract unique table numbers (ensure they are Numbers)
        // Combine DB active orders AND Socket active connections
        const dbOccupied = activeOrders.map(order => parseInt(order.tableNo));
        const socketOccupied = Object.keys(tableConnections).map(Number);

        const occupiedTables = [...new Set([...dbOccupied, ...socketOccupied])];

        res.json({
            totalTables,
            occupiedTables
        });

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Emit event so dashboard updates automatically
        io.emit('order_updated', order);

        res.json(order);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// DELETE /api/orders/:id - Delete an order
app.delete('/api/orders/:id', async (req, res) => {
    try {
        const order = await Order.findByIdAndDelete(req.params.id);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        // Emit event so dashboard updates automatically
        io.emit('order_deleted', req.params.id);
        res.json({ message: 'Order deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/analytics - Get dashboard stats
app.get('/api/analytics', async (req, res) => {
    try {
        // 1. Popular Items (Unwind items array, group by product name)
        const popularItems = await Order.aggregate([
            { $unwind: "$items" },
            {
                $group: {
                    _id: "$items.name",
                    count: { $sum: "$items.quantity" },
                    revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);

        // 2. Table Performance (Group by tableNo)
        const tableStats = await Order.aggregate([
            {
                $group: {
                    _id: "$tableNo",
                    orderCount: { $sum: 1 },
                    totalRevenue: { $sum: "$totalAmount" }
                }
            },
            { $sort: { totalRevenue: -1 } }
        ]);

        // 3. Overall Stats
        const totalOrders = await Order.countDocuments();
        const totalRevenueResult = await Order.aggregate([
            { $group: { _id: null, total: { $sum: "$totalAmount" } } }
        ]);
        const totalRevenue = totalRevenueResult[0]?.total || 0;

        // 4. Sales by Date (Trend)
        const salesByDate = await Order.aggregate([
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    revenue: { $sum: "$totalAmount" },
                    orders: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } } // Sort by date ascending
        ]);

        res.json({
            popularItems,
            tableStats,
            totalOrders,
            totalRevenue,
            salesByDate
        });
    } catch (err) {
        console.error("Analytics Error:", err);
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
