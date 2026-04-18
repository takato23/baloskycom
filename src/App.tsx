/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Layout from './components/Layout';
import RedirectToStatic from './components/RedirectToStatic';

const Checkout = lazy(() => import('./pages/Checkout'));
const CheckoutSuccess = lazy(() => import('./pages/CheckoutSuccess'));
const CheckoutFailure = lazy(() => import('./pages/CheckoutFailure'));
const Profile = lazy(() => import('./pages/Profile'));
const CampaignDetails = lazy(() => import('./pages/CampaignDetails'));
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));
const AdminMedia = lazy(() => import('./pages/admin/AdminMedia'));
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));
const Wall = lazy(() => import('./pages/Wall'));
const VipFeed = lazy(() => import('./pages/VipFeed'));
const Portfolio = lazy(() => import('./pages/Portfolio'));
const Gallery = lazy(() => import('./pages/Gallery'));
const Blog = lazy(() => import('./pages/Blog'));
const Ideas = lazy(() => import('./pages/Ideas'));
const AgendaPublica = lazy(() => import('./pages/AgendaPublica'));
const Laboratorio = lazy(() => import('./pages/Laboratorio'));
const HomePreview = lazy(() => import('./pages/HomePreview'));
const NotFound = lazy(() => import('./pages/NotFound'));
// HomeDelirio and Home are no longer routed directly — the Delirio mockup
// (public/delirio.html) is served by Express for `/` and `/delirio`. Keep the
// files on disk in case we need to revive the React versions.

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
          {/*
            `/` is now served by the React HomePreview port. The legacy static
            HTML (public/delirio.html) is still available at `/delirio` as a
            backup: if anything breaks on the live React home we can point
            Express back to it from server.ts. `/home-preview` stays pinned to
            the React version too, for consistency with prior QA links.
          */}
          <Route path="/delirio" element={<RedirectToStatic target="/delirio" />} />
          <Route path="/" element={<Layout />}>
            <Route
              index
              element={
                <Suspense fallback={<RouteFallback />}>
                  <HomePreview />
                </Suspense>
              }
            />
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
                    <Route path="laboratorio" element={<Laboratorio />} />
                    <Route path="home-preview" element={<HomePreview />} />
                    {/*
                      `/club` is the back_url que Mercado Pago usa al volver
                      de la autorización de preapproval (ver
                      src/server/routes/api.ts ~L1872). MP nos vuelve a la
                      home con `?sub=<subscriptionId>`; el magic-link de
                      verificación de miembros vuelve a `/club?auth=ok|...`.
                      Renderizamos el mismo HomePreview así ClubReturnBanner
                      detecta los params, hace scroll a #club y poolea el
                      estado real de la suscripción.
                    */}
                    <Route path="club" element={<HomePreview />} />
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
                      <Route path="media" element={<AdminMedia />} />
                      <Route path="media/videos" element={<AdminMedia defaultTab="video_ia" />} />
                      <Route path="media/fotos" element={<AdminMedia defaultTab="foto" />} />
                      <Route path="media/wallpapers" element={<AdminMedia defaultTab="wallpaper" />} />
                      <Route path="media/canciones" element={<AdminMedia defaultTab="cancion" />} />
                      <Route path="media/socials" element={<AdminMedia defaultTab="socials" />} />
                      <Route path="media/newsletter" element={<AdminMedia defaultTab="newsletter" />} />
                      <Route path="settings" element={<AdminSettings />} />
                      <Route path="*" element={<Navigate to="/admin" replace />} />
                    </Route>

                    <Route path="*" element={<NotFound />} />
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
