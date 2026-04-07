/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import Checkout from './pages/Checkout';
import CheckoutSuccess from './pages/CheckoutSuccess';
import CheckoutFailure from './pages/CheckoutFailure';
import Profile from './pages/Profile';
import CampaignDetails from './pages/CampaignDetails';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminSettings from './pages/admin/AdminSettings';
import AdminLogin from './pages/admin/AdminLogin';
import Wall from './pages/Wall';
import VipFeed from './pages/VipFeed';
import Portfolio from './pages/Portfolio';
import Gallery from './pages/Gallery';
import Blog from './pages/Blog';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="wall" element={<Wall />} />
            <Route path="vip" element={<VipFeed />} />
            <Route path="portfolio" element={<Portfolio />} />
            <Route path="gallery" element={<Gallery />} />
            <Route path="blog" element={<Blog />} />
            <Route path="checkout" element={<Checkout />} />
            <Route path="checkout/:campaignId" element={<Checkout />} />
            <Route path="checkout/success" element={<CheckoutSuccess />} />
            <Route path="checkout/failure" element={<CheckoutFailure />} />
            <Route path="checkout/pending" element={<CheckoutSuccess />} />
            <Route path="profile" element={<Profile />} />
            <Route path="campaigns/:id" element={<CampaignDetails />} />
            
            {/* Admin Login */}
            <Route path="admin/login" element={<AdminLogin />} />

            {/* Admin Routes (Protected) */}
            <Route path="admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="campaigns" element={<AdminDashboard defaultTab="campaigns" />} />
              <Route path="products" element={<AdminDashboard defaultTab="products" />} />
              <Route path="memberships" element={<AdminDashboard defaultTab="memberships" />} />
              <Route path="users" element={<AdminDashboard defaultTab="users" />} />
              <Route path="messages" element={<AdminDashboard defaultTab="messages" />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
