import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import CustomerMenu from './pages/CustomerMenu';
import AdminDashboard from './pages/AdminDashboard';
import Landing from './pages/Landing';

function App() {
  return (
    <Router>
      <div className="min-h-screen">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/menu/:tableId" element={<CustomerMenu />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
