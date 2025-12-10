import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const API_URL = import.meta.env.VITE_API_URL || '';

function Analytics() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await axios.get(`${API_URL}/api/analytics`);
                setData(res.data);
            } catch (err) {
                console.error("Failed to fetch analytics", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) return <div className="p-4 text-center text-white">Loading insights...</div>;
    if (!data) return <div className="p-4 text-center text-white">No data available yet.</div>;

    const COLORS = ['#FF6B6B', '#48DBFB', '#1dd1a1', '#feca57', '#fa8231', '#5f27cd'];

    return (
        <div className="animate-fade-in">
            {/* Summary Cards */}
            <div className="grid" style={{ marginBottom: '2rem' }}>
                <div className="card glass p-4" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, color: 'var(--text-muted)' }}>Total Revenue</h3>
                    <span style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--success)' }}>
                        ${data.totalRevenue.toFixed(2)}
                    </span>
                </div>
                <div className="card glass p-4" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, color: 'var(--text-muted)' }}>Total Orders</h3>
                    <span style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--secondary)' }}>
                        {data.totalOrders}
                    </span>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>

                {/* Popular Items Chart */}
                <div className="card" style={{ padding: '2rem' }}>
                    <h3 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Most Popular Items</h3>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <BarChart data={data.popularItems} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis type="number" stroke="var(--text-muted)" />
                                <YAxis dataKey="_id" type="category" stroke="var(--text-muted)" width={120} style={{ fontSize: '0.8rem' }} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--surface)', border: 'none', borderRadius: '8px' }}
                                    itemStyle={{ color: 'white' }}
                                />
                                <Bar dataKey="count" fill="var(--primary)" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Table Performance Pie Chart */}
                <div className="card" style={{ padding: '2rem' }}>
                    <h3 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Orders by Table</h3>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie
                                    data={data.tableStats}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="totalRevenue"
                                    nameKey="_id"
                                >
                                    {data.tableStats.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--surface)', border: 'none', borderRadius: '8px' }}
                                    formatter={(value) => `$${value.toFixed(2)}`}
                                />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>
        </div>
    );
}

export default Analytics;
