/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Layout from './components/Layout';
import RedirectToStatic from './components/RedirectToStatic';
import AnalyticsTracker from './components/AnalyticsTracker';

const Checkout = lazy(() => import('./pages/Checkout'));
const CafecitoQuick = lazy(() => import('./pages/CafecitoQuick'));
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
const BtvPage = lazy(() => import('./pages/BtvPage'));
const Productora = lazy(() => import('./pages/Productora'));
const Reel = lazy(() => import('./pages/Reel'));
const Cameo = lazy(() => import('./pages/Cameo'));
const HomePreview = lazy(() => import('./pages/HomePreview'));
const HeroPreview = lazy(() => import('./pages/HeroPreview'));
const MultimediaPreview = lazy(() => import('./pages/MultimediaPreview'));
const PreviewFull = lazy(() => import('./pages/PreviewFull'));
const PreviewV2 = lazy(() => import('./pages/PreviewV2'));
const PreviewV2Tipo = lazy(() => import('./pages/PreviewV2Tipo'));
const NotFound = lazy(() => import('./pages/NotFound'));
// HomeDelirio and Home are no longer routed directly — the Delirio mockup
// (public/delirio.html) is served by Express for `/` and `/delirio`. Keep the
// files on disk in case we need to revive the React versions.

const RouteFallback = () => (
  <div className="route-skeleton" aria-busy="true" aria-label="Cargando sección">
    <div className="route-skeleton__eyebrow" />
    <div className="route-skeleton__title" />
    <div className="route-skeleton__line" />
    <div className="route-skeleton__grid">
      <span />
      <span />
      <span />
    </div>
  </div>
);

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AnalyticsTracker />
        <Routes>
          {/*
            `/` is served by Express as the original static Delirio landing.
            If the SPA catches `/` during client-side navigation, bounce back
            to the server route so the public index stays aligned with
            balosky.com. `/home-preview` keeps the React experiment available.
          */}
          <Route path="/" element={<RedirectToStatic target="/" />} />
          <Route path="/delirio" element={<RedirectToStatic target="/delirio" />} />
          {/*
            `/preview-hero` queda como ruta top-level (fuera del Layout) para
            que NO herede la nav ni el footer del sitio — es un banco de
            pruebas aislado que necesita el viewport completo limpio para
            ver el efecto del hero sin interferencias.
          */}
          {/*
            `/reel` — tarjeta de presentación: el showreel fullscreen sin nav
            ni footer, para pitchear por DM/WhatsApp con un solo link. Express
            le inyecta OG tags propios server-side (ver server.ts).
          */}
          <Route
            path="/reel"
            element={
              <Suspense fallback={<RouteFallback />}>
                <Reel />
              </Suspense>
            }
          />
          <Route
            path="/preview-hero"
            element={
              <Suspense fallback={<RouteFallback />}>
                <HeroPreview />
              </Suspense>
            }
          />
          {/*
            `/preview-multimedia` — destino de los orbes del hero, también
            top-level para no heredar Layout/nav/footer. Es el "del otro
            lado del cristal" donde aterriza el dissolve cinematográfico.
          */}
          <Route
            path="/preview-multimedia"
            element={
              <Suspense fallback={<RouteFallback />}>
                <MultimediaPreview />
              </Suspense>
            }
          />
          {/*
            `/preview-full` — versión unificada: hero con orbes + multimedia
            hub en UNA sola página. Tap en bola hace scrollIntoView a la
            sub-zona (NO cambia de ruta). También top-level para no heredar
            Layout/nav/footer y tener el viewport limpio.
          */}
          <Route
            path="/preview-full"
            element={
              <Suspense fallback={<RouteFallback />}>
                <PreviewFull />
              </Suspense>
            }
          />
          {/*
            `/preview-v2` — rediseño completo con paleta chocolate cálida,
            8 planetas, hero sticky que colapsa a dock, tipografía Fraunces
            italic. Otro lienzo aislado, NO toca `/preview-full`.
          */}
          <Route
            path="/preview-v2"
            element={
              <Suspense fallback={<RouteFallback />}>
                <PreviewV2 />
              </Suspense>
            }
          />
          {/*
            `/preview-v2-tipo` — comparador de tipografías para v2. Lienzo
            aislado (sin Layout) con 4 paneles lado a lado mostrando la
            misma copy en 4 familias distintas. Ruta temporal — se borra
            cuando cerremos la elección.
          */}
          <Route
            path="/preview-v2-tipo"
            element={
              <Suspense fallback={<RouteFallback />}>
                <PreviewV2Tipo />
              </Suspense>
            }
          />
          <Route
            path="/cafecito"
            element={
              <Suspense fallback={<RouteFallback />}>
                <CafecitoQuick />
              </Suspense>
            }
          />
          <Route
            path="/admin/login"
            element={
              <Suspense fallback={<RouteFallback />}>
                <AdminLogin />
              </Suspense>
            }
          />
          <Route
            path="/admin"
            element={
              <Suspense fallback={<RouteFallback />}>
                <AdminLayout />
              </Suspense>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="campaigns" element={<AdminDashboard defaultTab="campaigns" />} />
            <Route path="products" element={<AdminDashboard defaultTab="products" />} />
            <Route path="memberships" element={<AdminDashboard defaultTab="memberships" />} />
            <Route path="encargos" element={<AdminDashboard defaultTab="encargos" />} />
            <Route path="analytics" element={<AdminDashboard defaultTab="analytics" />} />
            <Route path="ideas" element={<AdminDashboard defaultTab="ideas" />} />
            <Route path="messages" element={<AdminDashboard defaultTab="messages" />} />
            <Route path="media" element={<AdminMedia />} />
            <Route path="media/videos" element={<AdminMedia defaultTab="video_ia" />} />
            <Route path="media/fotos" element={<AdminMedia defaultTab="foto" />} />
            <Route path="media/wallpapers" element={<AdminMedia defaultTab="wallpaper" />} />
            <Route path="media/canciones" element={<AdminMedia defaultTab="cancion" />} />
            <Route path="media/panoramas" element={<AdminMedia defaultTab="panorama_360" />} />
            <Route path="media/socials" element={<AdminMedia defaultTab="socials" />} />
            <Route path="media/newsletter" element={<AdminMedia defaultTab="newsletter" />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Route>
          <Route path="/" element={<Layout />}>
            <Route
              index
              element={
                <RedirectToStatic target="/" />
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
                    <Route path="btv" element={<BtvPage />} />
                    <Route path="balosflix" element={<Navigate to="/btv" replace />} />
                    <Route path="productora" element={<Productora />} />
                    <Route path="cameo" element={<Cameo />} />
                    <Route path="home-preview" element={<HomePreview />} />
                    <Route path="preview-hero" element={<HeroPreview />} />
                    <Route path="preview-multimedia" element={<MultimediaPreview />} />
                    <Route path="preview-full" element={<PreviewFull />} />
                    <Route path="preview-v2" element={<PreviewV2 />} />
                    <Route path="club" element={<Navigate to="/home-preview#trabajemos" replace />} />
                    <Route path="agenda-publica" element={<AgendaPublica />} />
                    <Route path="cafecito" element={<CafecitoQuick />} />
                    <Route path="checkout" element={<Checkout />} />
                    <Route path="checkout/:campaignId" element={<Checkout />} />
                    <Route path="checkout/success" element={<CheckoutSuccess />} />
                    <Route path="checkout/failure" element={<CheckoutFailure />} />
                    <Route path="checkout/pending" element={<CheckoutSuccess />} />
                    <Route path="profile" element={<Profile />} />
                    <Route path="campaigns/:id" element={<CampaignDetails />} />

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
