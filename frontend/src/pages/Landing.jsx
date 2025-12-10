import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';

function Landing() {
    const [table, setTable] = useState('');
    const navigate = useNavigate();

    const [showScanner, setShowScanner] = useState(false);
    const [scanError, setScanError] = useState('');

    const handleStart = (e) => {
        e.preventDefault();
        if (table) {
            navigate(`/menu/${table}`);
        }
    };

    useEffect(() => {
        let scanner = null;

        if (showScanner) {
            // Initialize scanner
            scanner = new Html5Qrcode("reader");

            const config = { fps: 10, qrbox: { width: 250, height: 250 } };

            scanner.start(
                { facingMode: "environment" },
                config,
                (decodedText) => {
                    // Success callback
                    scanner.stop().then(() => {
                        try {
                            if (decodedText.includes('/menu/')) {
                                const parts = decodedText.split('/menu/');
                                const tableId = parts[1];
                                if (tableId) navigate(`/menu/${tableId}`);
                            } else {
                                navigate(`/menu/${decodedText}`);
                            }
                        } catch (e) {
                            navigate(`/menu/${decodedText}`);
                        }
                    }).catch(err => console.error(err));
                },
                (errorMessage) => {
                    // Error callback (ignore frequent scanning errors)
                }
            ).catch(err => {
                console.error("Camera start failed", err);
                // detailed error for debugging
                setScanError(`Camera Error: ${err.name || 'Unknown'} - ${err.message || err}. Ensure HTTPS and Permissions.`);
            });
        }

        return () => {
            if (scanner && scanner.isScanning) {
                scanner.stop().catch(err => console.error(err));
            }
        };
    }, [showScanner, navigate]);

    return (
        <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', textAlign: 'center' }}>
            <div className="glass p-8 rounded-2xl animate-fade-in" style={{ padding: '3rem', maxWidth: '400px', width: '100%' }}>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', background: 'linear-gradient(to right, #FF6B6B, #48DBFB)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Gourmet Scan
                </h1>
                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
                    Scan the QR code on your table or enter your table number below to start ordering.
                </p>
                {!showScanner ? (
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <form onSubmit={handleStart} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <input
                                type="text"
                                className="input"
                                placeholder="Enter Table Number"
                                value={table}
                                onChange={(e) => setTable(e.target.value)}
                            />
                            <button type="submit" className="btn btn-primary">
                                Go to Table
                            </button>
                        </form>

                        <div style={{ position: 'relative', margin: '1rem 0' }}>
                            <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.2)' }} />
                            <span style={{ position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)', background: 'var(--surface)', padding: '0 10px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>OR</span>
                        </div>

                        <button onClick={() => setShowScanner(true)} className="btn" style={{ background: 'var(--primary)', color: 'white' }}>
                            Scan QR Code
                        </button>
                    </div>
                ) : (
                    <div style={{ width: '100%' }}>
                        {scanError ? (
                            <div style={{ color: '#ff6b6b', marginBottom: '1rem' }}>{scanError}</div>
                        ) : null}

                        <div id="reader" style={{ width: '100%', borderRadius: '8px', overflow: 'hidden', minHeight: '300px', background: '#000' }}></div>

                        <button onClick={() => setShowScanner(false)} className="btn" style={{ marginTop: '1rem', width: '100%', background: 'rgba(255,255,255,0.1)' }}>
                            Cancel Scan
                        </button>
                    </div>
                )}
                <div style={{ marginTop: '2rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <a href="/admin" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Manager Login</a>
                </div>
            </div>
        </div>
    );
}

export default Landing;
