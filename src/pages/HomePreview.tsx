import { useEffect } from 'react';
import IntroCurtain from '@/components/home/IntroCurtain';
import MeshBg from '@/components/home/MeshBg';
import HeroSection from '@/components/home/HeroSection';
import MarqueeStrip from '@/components/home/MarqueeStrip';
import ApoyaSection from '@/components/home/ApoyaSection';
import MiraSection from '@/components/home/MiraSection';
import ClubSection from '@/components/home/ClubSection';
import VocesSection from '@/components/home/VocesSection';
import VisionSection from '@/components/home/VisionSection';
import OjoSection from '@/components/home/OjoSection';
import PixelSection from '@/components/home/PixelSection';
import SonidoSection from '@/components/home/SonidoSection';
import MuroSection from '@/components/home/MuroSection';
import ArchivoSection from '@/components/home/ArchivoSection';
import RedesSection from '@/components/home/RedesSection';
import AntiTheftGuard from '@/components/home/AntiTheftGuard';
import ClubReturnBanner from '@/components/home/ClubReturnBanner';

/**
 * Delirio home — full React port. Now served at `/` (and `/home-preview` for
 * back-compat with existing QA links).
 *
 * Every section below `MarqueeStrip` is a faithful port of its counterpart
 * in `public/delirio.html`. Interactive layers are rehydrated: Apoyá split
 * slider is live, Visión/Ojo tiles open `MediaLightbox`, Pixel wallpapers
 * gate through `WallpaperGate`, Sonido cards open `SunoModal` with the right
 * platform embed, Archivo rail drag-scrolls, the Muro post form submits to
 * `/api/messages`, `AntiTheftGuard` covers #ojo/#pixel, and the logo click
 * counter feeds `ModoHomerEasterEgg`.
 *
 * The legacy static HTML is still available at `/delirio` as a rollback —
 * flipping `server.ts` back (re-add `app.get('/', serveDelirio)`) and the
 * `/` route in `App.tsx` (swap `HomePreview` for `RedirectToStatic`) reverts
 * the landing to the static mockup.
 *
 * Layout.tsx wraps this page with DelirioHeader + DelirioFooter, so this
 * file only owns everything between the nav and the footer.
 */
export default function HomePreview() {
  // Reveal-on-scroll — port of the static home's top-level IntersectionObserver
  // (public/delirio.html around line 4528). Adds both `.in` (used by
  // src/styles/delirio.css) and `.visible` (used by src/index.css) so every
  // `.reveal` node fades up regardless of which stylesheet owns it.
  useEffect(() => {
    const targets = document.querySelectorAll('.reveal');
    if (!targets.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in', 'visible');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 },
    );

    targets.forEach((el) => io.observe(el));

    return () => io.disconnect();
  }, []);

  return (
    <>
      <IntroCurtain />
      <MeshBg />

      <ClubReturnBanner />

      <HeroSection />
      <MarqueeStrip />

      <ApoyaSection />
      <MiraSection />
      <ClubSection />
      <VocesSection />
      <VisionSection />
      <OjoSection />
      <PixelSection />
      <SonidoSection />
      <MuroSection />
      <ArchivoSection />
      <RedesSection />

      <AntiTheftGuard />
    </>
  );
}
