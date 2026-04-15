/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Layout from './components/Layout';
import Home from './pages/Home';

const Checkout = lazy(() => import('./pages/Checkout'));
const CheckoutSuccess = lazy(() => import('./pages/CheckoutSuccess'));
const CheckoutFailure = lazy(() => import('./pages/CheckoutFailure'));
const Profile = lazy(() => import('./pages/Profile'));
const CampaignDetails = lazy(() => import('./pages/CampaignDetails'));
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));
const Wall = lazy(() => import('./pages/Wall'));
const VipFeed = lazy(() => import('./pages/VipFeed'));
const Portfolio = lazy(() => import('./pages/Portfolio'));
const Gallery = lazy(() => import('./pages/Gallery'));
const Blog = lazy(() => import('./pages/Blog'));
const Ideas = lazy(() => import('./pages/Ideas'));
const AgendaPublica = lazy(() => import('./pages/AgendaPublica'));

const RouteFallback = () => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
  </div>
);

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route
              path="*"
              element={
                <Suspense fallback={<RouteFallback />}>
                  <Routes>
                    <Route path="wall" element={<Wall />} />
                    <Route path="vip" element={<VipFeed />} />
                    <Route path="portfolio" element={<Portfolio />} />
                    <Route path="gallery" element={<Gallery />} />
                    <Route path="blog" element={<Blog />} />
                    <Route path="ideas" element={<Ideas />} />
                    <Route path="agenda-publica" element={<AgendaPublica />} />
                    <Route path="checkout" element={<Checkout />} />
                    <Route path="checkout/:campaignId" element={<Checkout />} />
                    <Route path="checkout/success" element={<CheckoutSuccess />} />
                    <Route path="checkout/failure" element={<CheckoutFailure />} />
                    <Route path="checkout/pending" element={<CheckoutSuccess />} />
                    <Route path="profile" element={<Profile />} />
                    <Route path="campaigns/:id" element={<CampaignDetails />} />

                    <Route path="admin/login" element={<AdminLogin />} />
                    <Route path="admin" element={<AdminLayout />}>
                      <Route index element={<AdminDashboard />} />
                      <Route path="campaigns" element={<AdminDashboard defaultTab="campaigns" />} />
                      <Route path="products" element={<AdminDashboard defaultTab="products" />} />
                      <Route path="memberships" element={<AdminDashboard defaultTab="memberships" />} />
                      <Route path="ideas" element={<AdminDashboard defaultTab="ideas" />} />
                      <Route path="messages" element={<AdminDashboard defaultTab="messages" />} />
                      <Route path="settings" element={<AdminSettings />} />
                      <Route path="*" element={<Navigate to="/admin" replace />} />
                    </Route>
                  </Routes>
                </Suspense>
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
