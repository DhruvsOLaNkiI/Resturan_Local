require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const Product = require('./models/Product');
const Order = require('./models/Order');

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

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
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
