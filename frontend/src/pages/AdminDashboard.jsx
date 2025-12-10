import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import QRCode from "react-qr-code";
import Analytics from './Analytics';
const API_URL = import.meta.env.VITE_API_URL || '';
const socket = io(API_URL, { transports: ['websocket'] });

function AdminDashboard() {
    const [orders, setOrders] = useState([]);
    const [activeTab, setActiveTab] = useState('orders'); // 'orders', 'analytics', 'qr'
    const [qrTable, setQrTable] = useState('');

    useEffect(() => {
        // Initial load
        const fetchOrders = async () => {
            try {
                const res = await axios.get(`${API_URL}/api/orders`);
                setOrders(res.data);
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

        return () => {
            socket.off('new_order');
            socket.off('order_updated');
        };
    }, []);

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

    return (
        <div className="container">
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
                <div className="container animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' }}>
                    <div className="card" style={{ padding: '2rem', width: '100%', maxWidth: '500px' }}>
                        <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>Generate Table QR Code</h2>

                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                            <input
                                type="text"
                                className="input"
                                placeholder="Enter Table Number (e.g., 5)"
                                value={qrTable}
                                onChange={(e) => setQrTable(e.target.value)}
                            />
                        </div>

                        {qrTable && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem', background: 'white', borderRadius: '16px' }}>
                                <QRCode
                                    value={`${window.location.origin}/menu/${qrTable}`}
                                    size={256}
                                    style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                                    viewBox={`0 0 256 256`}
                                />
                                <p style={{ color: 'black', marginTop: '1rem', fontWeight: 'bold' }}>Table {qrTable}</p>
                            </div>
                        )}

                        <div style={{ marginTop: '2rem', color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center' }}>
                            Print this code and place it on Table {qrTable || '#'}.<br />
                            Customers can scan it to order directly.
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
        </div>
    );
}

export default AdminDashboard;
