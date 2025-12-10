import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

// Mock data in case backend isn't populated or available yet
const MOCK_PRODUCTS = [
    { _id: '507f1f77bcf86cd799439011', name: 'Truffle Burger', price: 18, category: 'Main', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=500&q=60', description: 'Juicy beef patty with truffle aioli' },
    { _id: '507f1f77bcf86cd799439012', name: 'Lobster Pasta', price: 28, category: 'Main', image: 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?auto=format&fit=crop&w=500&q=60', description: 'Fresh lobster with creamy linguine' },
    { _id: '507f1f77bcf86cd799439013', name: 'Caesar Salad', price: 12, category: 'Starter', image: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?auto=format&fit=crop&w=500&q=60', description: 'Crisp romaine with parmesan crisp' },
    { _id: '507f1f77bcf86cd799439014', name: 'Tiramisu', price: 10, category: 'Dessert', image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=500&q=60', description: 'Classic Italian coffee dessert' },
];

function CustomerMenu() {
    const { tableId } = useParams();
    const navigate = useNavigate();
    const [products, setProducts] = useState(MOCK_PRODUCTS);
    const [cart, setCart] = useState({});
    const [loading, setLoading] = useState(false);
    const [activeCategory, setActiveCategory] = useState('All');

    // Attempt to fetch from backend, fall back to mock
    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const res = await axios.get(`${API_URL}/api/products`);
                if (res.data && res.data.length > 0) {
                    setProducts(res.data);
                }
            } catch (err) {
                console.log('Using mock data as backend might be empty or down');
            }
        };
        fetchProducts();
    }, []);

    const addToCart = (product) => {
        setCart(prev => ({
            ...prev,
            [product._id]: {
                ...product,
                quantity: (prev[product._id]?.quantity || 0) + 1
            }
        }));
    };

    const removeFromCart = (productId) => {
        setCart(prev => {
            const newCart = { ...prev };
            if (newCart[productId].quantity > 1) {
                newCart[productId].quantity -= 1;
            } else {
                delete newCart[productId];
            }
            return newCart;
        });
    };

    const totalAmount = Object.values(cart).reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalItems = Object.values(cart).reduce((sum, item) => sum + item.quantity, 0);

    const placeOrder = async () => {
        if (Object.keys(cart).length === 0) return;
        setLoading(true);
        try {
            const items = Object.values(cart).map(item => ({
                product: item._id, // Assuming backend uses _id
                quantity: item.quantity,
                price: item.price,
                name: item.name
            }));

            await axios.post(`${API_URL}/api/orders`, {
                tableNo: tableId,
                items,
                totalAmount
            });

            alert('Order Placed Successfully! Kitchen is preparing your food.');
            setCart({});
        } catch (err) {
            console.error(err);
            const msg = err.response?.data?.error || 'Failed to place order.';
            alert(`Error: ${msg}`);
        } finally {
            setLoading(false);
        }
    };

    const categories = ['All', ...new Set(products.map(p => p.category))];
    const filteredProducts = activeCategory === 'All' ? products : products.filter(p => p.category === activeCategory);

    return (
        <div className="container" style={{ paddingBottom: '100px' }}>
            <header className="flex-between" style={{ marginBottom: '2rem', padding: '1rem 0' }}>
                <div>
                    <h2 style={{ margin: 0 }}>Table {tableId}</h2>
                    <p style={{ margin: 0, color: 'var(--text-muted)' }}>Welcome to Gourmet</p>
                </div>
                <button onClick={() => navigate('/')} className="btn" style={{ background: 'var(--surface)', color: 'var(--text)' }}>
                    Scan Again
                </button>
            </header>

            {/* Categories */}
            <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '1rem', marginBottom: '1rem' }}>
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className="btn"
                        style={{
                            background: activeCategory === cat ? 'var(--primary)' : 'var(--surface)',
                            color: 'white',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Menu Grid */}
            <div className="grid">
                {filteredProducts.map(product => (
                    <div key={product._id} className="card">
                        <div style={{ height: '200px', overflow: 'hidden' }}>
                            <img src={product.image} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <div style={{ padding: '1.5rem' }}>
                            <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
                                <h3 style={{ margin: 0 }}>{product.name}</h3>
                                <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>${product.price}</span>
                            </div>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>{product.description}</p>

                            <div className="flex-between">
                                {cart[product._id] ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', padding: '4px' }}>
                                        <button onClick={() => removeFromCart(product._id)} className="btn" style={{ padding: '4px 12px', background: 'transparent' }}>-</button>
                                        <span>{cart[product._id].quantity}</span>
                                        <button onClick={() => addToCart(product)} className="btn" style={{ padding: '4px 12px', background: 'transparent' }}>+</button>
                                    </div>
                                ) : (
                                    <button onClick={() => addToCart(product)} className="btn btn-primary" style={{ width: '100%' }}>
                                        Add to Cart
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Floating Cart */}
            {totalItems > 0 && (
                <div className="glass" style={{
                    position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
                    width: '90%', maxWidth: '500px', borderRadius: '16px', padding: '1rem',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 100
                }}>
                    <div>
                        <div style={{ fontWeight: 'bold' }}>{totalItems} items</div>
                        <div style={{ color: 'var(--primary)' }}>${totalAmount.toFixed(2)}</div>
                    </div>
                    <button
                        onClick={placeOrder}
                        disabled={loading}
                        className="btn btn-primary"
                    >
                        {loading ? 'Ordering...' : 'Place Order'}
                    </button>
                </div>
            )}
        </div>
    );
}

export default CustomerMenu;
