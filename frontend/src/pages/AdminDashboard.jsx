import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import QRCode from "react-qr-code";
import Analytics from './Analytics';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const socket = io(API_URL, {
    transports: ['websocket', 'polling'],
    withCredentials: false
});

function AdminDashboard() {
    const [orders, setOrders] = useState([]);
    const [activeTab, setActiveTab] = useState('orders'); // orders, analytics, pending, qr, menu

    // Config State
    const [config, setConfig] = useState({ bannerText: '', discountAmount: 0, isBannerActive: false, totalTables: 10 });
    const [products, setProducts] = useState([]);
    const [newProduct, setNewProduct] = useState({ name: '', price: '', category: '', image: '', description: '' });
    const [tableStatus, setTableStatus] = useState({ totalTables: 10, occupiedTables: [] });
    const [productStartIdx, setProductStartIdx] = useState(0); // Pagination for products if needed, simplified for now

    // Fetch real-time table status
    useEffect(() => {
        const fetchTableStatus = async () => {
            try {
                const res = await axios.get(`${API_URL}/api/tables/status`);
                setTableStatus(res.data);
            } catch (err) {
                console.error('Failed to fetch table status:', err);
            }
        };

        fetchTableStatus();

        // Listen for real-time status updates
        socket.on('table_status_update', (occupiedList) => {
            setTableStatus(prev => ({
                ...prev,
                occupiedTables: occupiedList
            }));
        });

        return () => {
            socket.off('table_status_update');
        };
    }, []);

    useEffect(() => {
        // Initial load
        const fetchOrders = async () => {
            try {
                const res = await axios.get(`${API_URL}/api/orders`);
                setOrders(res.data);

                // Fetch config
                const configRes = await axios.get(`${API_URL}/api/config`);
                setConfig(configRes.data);

                // Fetch products
                const prodRes = await axios.get(`${API_URL}/api/products`);
                setProducts(prodRes.data);
            } catch (err) {
                console.error("Failed to fetch orders (server might be down)");
            }
        };
        fetchOrders();

        // Listen for new orders
        socket.on('new_order', (order) => {
            setOrders(prev => [order, ...prev]);
            // Optional: Audio notification could go here
        });

        // Listen for order updates (status changes)
        socket.on('order_updated', (updatedOrder) => {
            setOrders(prev => prev.map(o => o._id === updatedOrder._id ? updatedOrder : o));
        });

        // Listen for order deletion
        socket.on('order_deleted', (deletedId) => {
            setOrders(prev => prev.filter(o => o._id !== deletedId));
        });

        return () => {
            socket.off('new_order');
            socket.off('order_updated');
            socket.off('order_deleted');
        };
    }, []);

    const handleDelete = async (orderId) => {
        if (!window.confirm("Are you sure you want to delete this order?")) return;
        try {
            await axios.delete(`${API_URL}/api/orders/${orderId}`);
        } catch (err) {
            console.error("Failed to delete order", err);
            alert("Failed to delete order");
        }
    };

    const updateStatus = async (orderId, newStatus) => {
        try {
            await axios.put(`${API_URL}/api/orders/${orderId}/status`, { status: newStatus });
        } catch (err) {
            console.error("Failed to update status", err);
            alert("Failed to update status");
        }
    };

    const getNextStatus = (currentStatus) => {
        const flow = ['Pending', 'Cooking', 'Coming to Table', 'Completed'];
        const idx = flow.indexOf(currentStatus);
        return idx < flow.length - 1 ? flow[idx + 1] : null;
    };

    const handleConfigSave = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post(`${API_URL}/api/config`, config);
            setConfig(res.data);
            alert("Settings Saved!");
        } catch (err) {
            console.error(err);
            alert("Failed to save settings");
        }
    };

    const toggleTrending = async (product) => {
        try {
            const updated = { ...product, isTrending: !product.isTrending };
            await axios.put(`${API_URL}/api/products/${product._id}`, updated);
            setProducts(prev => prev.map(p => p._id === product._id ? updated : p));
        } catch (err) {
            console.error(err);
            alert("Failed to update product");
        }
    };

    const handleAddProduct = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post(`${API_URL}/api/products`, newProduct);
            setProducts([...products, res.data]);
            setNewProduct({ name: '', price: '', category: 'Main Course', image: '', description: '' });
            alert("Dish Added Successfully!");
        } catch (err) {
            console.error(err);
            alert("Failed to add dish");
        }
    };

    const clearTable = async (tableId) => {
        if (!window.confirm(`Clear Table ${tableId} status?`)) return;
        try {
            await axios.post(`${API_URL}/api/tables/clear`, { tableId });
            // Status will update via socket broadcast
        } catch (err) {
            alert('Failed to clear table: ' + err.message);
        }
    };

    return (
        <div className="container" style={{ padding: '2rem' }}>
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-4xl font-bold gradient-text">Manager Dashboard</h1>
                <div className="flex gap-4">
                    <button
                        onClick={() => setActiveTab('orders')}
                        className={`btn ${activeTab === 'orders' ? 'btn-primary' : ''}`}
                    >
                        Live Orders
                    </button>
                    <button
                        onClick={() => setActiveTab('analytics')}
                        className={`btn ${activeTab === 'analytics' ? 'btn-primary' : ''}`}
                    >
                        Analytics
                    </button>
                    <button
                        onClick={() => setActiveTab('menu')}
                        className={`btn ${activeTab === 'menu' ? 'btn-primary' : ''}`}
                    >
                        Menu & Promo
                    </button>
                    <button
                        onClick={() => setActiveTab('qr')}
                        className={`btn ${activeTab === 'qr' ? 'btn-primary' : ''}`}
                    >
                        Tables & QR
                    </button>
                </div>
            </div>
            <header className="flex-between" style={{ marginBottom: '2rem', padding: '1rem 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                    <h1>Manager Dashboard</h1>
                    <div style={{ display: 'flex', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', padding: '4px' }}>
                        <button
                            onClick={() => setActiveTab('orders')}
                            className="btn"
                            style={{
                                background: activeTab === 'orders' ? 'var(--primary)' : 'transparent',
                                color: activeTab === 'orders' ? 'white' : 'var(--text-muted)',
                                padding: '8px 16px',
                                borderRadius: '6px'
                            }}
                        >
                            Live Orders
                        </button>
                        <button
                            onClick={() => setActiveTab('analytics')}
                            className="btn"
                            style={{
                                background: activeTab === 'analytics' ? 'var(--primary)' : 'transparent',
                                color: activeTab === 'analytics' ? 'white' : 'var(--text-muted)',
                                padding: '8px 16px',
                                borderRadius: '6px'
                            }}
                        >
                            Analytics
                        </button>
                        <button
                            onClick={() => setActiveTab('qr')}
                            className="btn"
                            style={{
                                background: activeTab === 'qr' ? 'var(--primary)' : 'transparent',
                                color: activeTab === 'qr' ? 'white' : 'var(--text-muted)',
                                padding: '8px 16px',
                                borderRadius: '6px'
                            }}
                        >
                            Tables & QR
                        </button>
                    </div>
                </div>

                {activeTab === 'orders' && (
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <div className="card" style={{ padding: '0.5rem 1rem', background: 'var(--primary)' }}>
                            <strong>{orders.filter(o => o.status !== 'Completed').length}</strong> Active Orders
                        </div>
                    </div>
                )}
            </header>

            {activeTab === 'analytics' ? (
                <Analytics />
            ) : activeTab === 'qr' ? (
                <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>

                    {/* Status Summary */}
                    <div className="card" style={{ padding: '2rem', textAlign: 'center', marginBottom: '2rem', display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                        <div>
                            <h2 className="text-2xl font-bold mb-2">Table Status</h2>
                            <p style={{ color: 'var(--text-muted)' }}>Real-time occupancy tracking</p>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#ff6b6b' }}>
                                {Array.from(new Set(orders.filter(o => o.status !== 'Completed' && o.status !== 'Cancelled').map(o => o.tableNo))).length}
                            </div>
                            <div style={{ color: '#ff6b6b' }}>Occupied</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--success)' }}>
                                {(config.totalTables || 10) - Array.from(new Set(orders.filter(o => o.status !== 'Completed' && o.status !== 'Cancelled').map(o => o.tableNo))).length}
                            </div>
                            <div style={{ color: 'var(--success)' }}>Free</div>
                        </div>
                    </div>

                    <div className="card" style={{ padding: '2rem', textAlign: 'center', marginBottom: '2rem' }}>
                        <h2 className="text-2xl font-bold mb-4">Settings</h2>
                        <form onSubmit={handleConfigSave} style={{ display: 'flex', gap: '1rem', justifyContent: 'center', alignItems: 'flex-end' }}>
                            <div style={{ textAlign: 'left' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Total Tables</label>
                                <input
                                    type="number"
                                    className="input"
                                    min="1"
                                    max="100"
                                    value={config.totalTables || 10}
                                    onChange={e => setConfig({ ...config, totalTables: parseInt(e.target.value) })}
                                    style={{ width: '150px' }}
                                />
                            </div>
                            <button type="submit" className="btn btn-primary" style={{ height: '46px' }}>Save & Update</button>
                        </form>
                    </div>

                    <div className="card" style={{ padding: '2rem' }}>
                        <h2 className="text-2xl font-bold mb-6 text-center">QR Codes for {config.totalTables} Tables</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem' }}>
                            {Array.from({ length: config.totalTables || 10 }, (_, i) => i + 1).map(num => {
                                const isOccupied = tableStatus.occupiedTables.includes(num);
                                return (
                                    <div key={num} style={{
                                        background: isOccupied ? 'rgba(255, 107, 107, 0.1)' : 'rgba(75, 203, 164, 0.1)',
                                        padding: '1rem',
                                        borderRadius: '12px',
                                        textAlign: 'center',
                                        border: isOccupied ? '2px solid #ff6b6b' : '2px solid transparent'
                                    }}>
                                        <div style={{ background: 'white', padding: '10px', borderRadius: '8px', display: 'inline-block' }}>
                                            <QRCode
                                                id={`qr-code-table-${num}`}
                                                value={`${window.location.protocol}//${window.location.host}/menu/${num}`}
                                                size={130}
                                                level={"H"}
                                            />
                                        </div>
                                        <p style={{ color: isOccupied ? '#ff6b6b' : 'var(--success)', fontWeight: 'bold', marginTop: '1rem', fontSize: '1.2rem' }}>
                                            Table {num} {isOccupied ? '(Busy)' : '(Free)'}
                                        </p>
                                        <button
                                            className="btn btn-primary"
                                            style={{ marginTop: '0.5rem', width: '100%', fontSize: '0.8rem' }}
                                            onClick={() => {
                                                const canvas = document.getElementById(`qr-code-table-${num}`);
                                                const pngUrl = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
                                                const downloadLink = document.createElement("a");
                                                downloadLink.href = pngUrl;
                                                downloadLink.download = `Table-${num}-QR.png`;
                                                document.body.appendChild(downloadLink);
                                                downloadLink.click();
                                                document.body.removeChild(downloadLink);
                                            }}
                                        >
                                            Download PNG
                                        </button>
                                        {isOccupied && (
                                            <button
                                                onClick={() => clearTable(num)}
                                                style={{
                                                    marginTop: '0.5rem',
                                                    width: '100%',
                                                    fontSize: '0.8rem',
                                                    padding: '4px 8px',
                                                    background: 'var(--primary)',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Clear Table
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="grid">
                    {orders.map(order => (
                        <div key={order._id} className="card animate-fade-in" style={{ borderLeft: `4px solid ${order.status === 'Completed' ? 'var(--success)' : 'var(--secondary)'}`, opacity: order.status === 'Completed' ? 0.7 : 1 }}>
                            <div style={{ padding: '1.5rem' }}>
                                <div className="flex-between" style={{ marginBottom: '1rem' }}>
                                    <h3 style={{ margin: 0 }}>Table {order.tableNo}</h3>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                        {new Date(order.createdAt).toLocaleTimeString()}
                                    </span>
                                </div>

                                <div style={{ marginBottom: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '1rem 0' }}>
                                    {order.items.map((item, idx) => (
                                        <div key={idx} className="flex-between" style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                                            <span>{item.quantity}x {item.name || 'Unknown Item'}</span>
                                            <span>${(item.price * item.quantity).toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex-between" style={{ marginBottom: '1rem' }}>
                                    <span style={{ fontWeight: 'bold' }}>Total</span>
                                    <span style={{ color: 'var(--success)', fontWeight: 'bold', fontSize: '1.2rem' }}>
                                        ${order.totalAmount.toFixed(2)}
                                    </span>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Status: <span style={{ color: 'white' }}>{order.status}</span></div>

                                    {order.status !== 'Completed' && (
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            {getNextStatus(order.status) && (
                                                <button
                                                    onClick={() => updateStatus(order._id, getNextStatus(order.status))}
                                                    className="btn btn-primary"
                                                    style={{ flex: 1, padding: '8px', fontSize: '0.9rem' }}
                                                >
                                                    Mark as {getNextStatus(order.status)}
                                                </button>
                                            )}
                                        </div>
                                    )}
                                    {order.status === 'Completed' && (
                                        <div style={{ textAlign: 'center', color: 'var(--success)', fontWeight: 'bold' }}>✓ Completed</div>
                                    )}
                                    <button
                                        onClick={() => handleDelete(order._id)}
                                        className="btn"
                                        style={{
                                            marginTop: '0.5rem',
                                            background: 'rgba(255, 0, 0, 0.1)',
                                            color: '#ff6b6b',
                                            padding: '4px 8px',
                                            fontSize: '0.8rem'
                                        }}
                                    >
                                        Delete Order
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {orders.length === 0 && (
                        <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                            No orders yet. Waiting for hungry customers!
                        </div>
                    )}
                </div>
            )}

            {/* Menu & Promo Tab */}
            {activeTab === 'menu' && (
                <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>

                    {/* Coupon Configuration */}
                    <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
                        <h2 className="text-2xl font-bold mb-4">📢 Promotion Banner</h2>
                        <form onSubmit={handleConfigSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Banner Message</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="e.g. Grand Opening Sale! $5 Off"
                                    value={config.bannerText}
                                    onChange={e => setConfig({ ...config, bannerText: e.target.value })}
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Discount Amount ($)</label>
                                    <input
                                        type="number"
                                        className="input"
                                        min="0"
                                        value={config.discountAmount || ''}
                                        onChange={e => setConfig({ ...config, discountAmount: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                                    />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.8rem' }}>
                                    <input
                                        type="checkbox"
                                        id="activePromo"
                                        checked={config.isBannerActive}
                                        onChange={e => setConfig({ ...config, isBannerActive: e.target.checked })}
                                        style={{ width: '20px', height: '20px' }}
                                    />
                                    <label htmlFor="activePromo">Activate Banner</label>
                                </div>
                            </div>
                            <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>Save Settings</button>
                        </form>
                    </div>

                    {/* Add New Dish */}
                    <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
                        <h2 className="text-2xl font-bold mb-4">🍽️ Add New Dish</h2>
                        <form onSubmit={handleAddProduct} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <input
                                type="text"
                                className="input"
                                placeholder="Dish Name"
                                required
                                value={newProduct.name}
                                onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                            />
                            <div className="flex gap-2">
                                <span style={{ padding: '10px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>$</span>
                                <input
                                    type="number"
                                    className="input"
                                    placeholder="Price"
                                    required
                                    min="0"
                                    value={newProduct.price}
                                    onChange={e => setNewProduct({ ...newProduct, price: e.target.value })}
                                />
                            </div>
                            <select
                                className="input"
                                value={newProduct.category}
                                onChange={e => setNewProduct({ ...newProduct, category: e.target.value })}
                            >
                                <option>Starters</option>
                                <option>Main Course</option>
                                <option>Desserts</option>
                                <option>Drinks</option>
                            </select>
                            <input
                                type="text"
                                className="input"
                                placeholder="Image URL (e.g. from Unsplash)"
                                value={newProduct.image}
                                onChange={e => setNewProduct({ ...newProduct, image: e.target.value })}
                            />
                            <textarea
                                className="input"
                                placeholder="Description (Optional)"
                                style={{ gridColumn: '1/-1', minHeight: '80px' }}
                                value={newProduct.description}
                                onChange={e => setNewProduct({ ...newProduct, description: e.target.value })}
                            />
                            <button type="submit" className="btn btn-primary" style={{ gridColumn: '1/-1' }}>Add Dish</button>
                        </form>
                    </div>

                    {/* Menu Management */}
                    <div className="card" style={{ padding: '2rem' }}>
                        <h2 className="text-2xl font-bold mb-4">🔥 Menu Management</h2>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                        <th style={{ padding: '1rem', textAlign: 'left' }}>Item</th>
                                        <th style={{ padding: '1rem', textAlign: 'center' }}>Price</th>
                                        <th style={{ padding: '1rem', textAlign: 'center' }}>Trending?</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {products.map(product => (
                                        <tr key={product._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <td style={{ padding: '1rem' }}>{product.name}</td>
                                            <td style={{ padding: '1rem', textAlign: 'center' }}>${product.price}</td>
                                            <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                <button
                                                    onClick={() => toggleTrending(product)}
                                                    className={`btn`}
                                                    style={{
                                                        background: product.isTrending ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                                                        padding: '4px 12px',
                                                        fontSize: '0.9rem'
                                                    }}
                                                >
                                                    {product.isTrending ? "🔥 Hot" : "Normal"}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
}

export default AdminDashboard;
