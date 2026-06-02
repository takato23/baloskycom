# Media hosting strategy

Updated: 2026-04-27

## What happened

`/laboratorio` was loading media from Vercel Blob. The Hobby Blob quota hit 10 GB data transfer after the Instagram share, and public Blob URLs started returning `403`. The DB now has no active `public.blob.vercel-storage.com` media URLs.

Emergency fix applied:

- Created/used Supabase Storage bucket `balosky-public-media`.
- Migrated 21 panorama originals to Supabase Storage.
- Generated 21 panorama thumbnails at 720px WebP.
- Migrated 167 remaining Blob URLs for songs, covers, photos, wallpapers, and the public video IA to Supabase Storage.
- Updated `media.media_url`, `media.cover_image`, and `media.thumb_url` in Postgres.
- Verified 209 active media URLs with `HEAD`: 0 broken.

## Current safety improvement

Panorama originals were about 48.7 MB total. Generated thumbnails are about 0.64 MB total, a 98.6% reduction. `/laboratorio` should use `thumbUrl` for cards and load the full panorama only when opening the 360 viewer.

At the previous size, a visitor loading all 21 panoramas could spend roughly 45-50 MB. At thumbnail size, the gallery preview is closer to 0.6-0.7 MB total.

## Recommendation

Use three lanes:

1. Vercel: app, API, admin, checkout, and metadata endpoints.
2. Postgres/Supabase DB: source of truth for media metadata.
3. Media delivery:
   - Supabase Storage for the current zero-cost mode, because it hard-stops at the free limit instead of silently creating a surprise bill.
   - YouTube / Spotify / Apple Music / SoundCloud embeds for videos and music that can live on platforms.
   - R2, Stream, or Bunny only after there is revenue or after accepting a usage-based ceiling.

## Zero-cost first setup

Goal: keep uploads off Vercel Blob/R2 and use providers that either hard-stop or shift heavy playback to free creator platforms.

Recommended env vars:

```bash
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_MEDIA_BUCKET=balosky-public-media
MEDIA_ALLOW_USAGE_BILLED_STORAGE=false
```

Keep `BLOB_READ_WRITE_TOKEN` out of Vercel. Keep `R2_*` unset unless explicitly moving to usage-based storage.

The upload API now chooses providers in this order:

1. Supabase Storage when `SUPABASE_MEDIA_BUCKET` exists.
2. Cloudflare R2 only if `MEDIA_ALLOW_USAGE_BILLED_STORAGE=true` and all `R2_*` vars exist.
3. Vercel Blob only if `MEDIA_ALLOW_USAGE_BILLED_STORAGE=true` and `BLOB_READ_WRITE_TOKEN` exists.
4. Local disk in dev.

This means a forgotten R2 or Blob secret cannot start spending money by accident.

## Cost comparison

### Cloudflare R2

Best fit for images, panoramas, audio, wallpapers, and downloadable static media.

- 10 GB-month free storage.
- 10 million free Class B reads/month.
- $0.015/GB-month after free storage.
- No egress bandwidth fees for internet delivery.
- Reads beyond free tier cost $0.36 per million Class B operations.

Practical meaning: a 1 TB viral night is not a 1 TB egress bill. The risk moves from bandwidth to request count and storage. It is predictable, but it is still usage-based billing, so it is not the zero-surprise option.

Source: https://developers.cloudflare.com/r2/pricing/

### Cloudflare Stream

Best fit for video playback.

- Storage is purchased at $5 per 1,000 minutes stored.
- Delivery is $1 per 1,000 minutes delivered.
- Encoding and ingress are included.
- Bandwidth is included in delivered-minutes pricing.

Practical meaning: cost tracks watch time, not raw MP4 file size. If a 1-minute video gets 10,000 full views, that is 10,000 minutes delivered, around $10.

Source: https://developers.cloudflare.com/stream/pricing/

### Bunny Storage + Bunny CDN

Good alternative if you want a very simple pay-as-you-go CDN with overcharge limits.

- Storage Standard single region: $0.01/GB.
- Bunny CDN Standard: North America/Europe $0.01/GB, South America $0.045/GB.
- Bunny CDN Volume: $0.005/GB for the first 500 TB.
- $1 monthly minimum.
- Has overcharge protection.

Practical meaning: very cheap, especially for non-video static files, but still bandwidth-priced. In LATAM traffic, 1 TB via Standard South America can be around $45; Volume can be around $5 if that network tier is acceptable.

Sources:
- https://bunny.net/pricing/
- https://docs.bunny.net/storage/pricing

### Supabase Storage

Useful now because credentials already exist, the app already uses Supabase, and the free tier hard-stops instead of creating surprise overage charges on the free plan.

- Free: 5 GB uncached + 5 GB cached egress.
- Pro: 250 GB uncached + 250 GB cached.
- Overage: $0.09/GB uncached, $0.03/GB cached.

Practical meaning: it unblocks the site today. A big Instagram night can still break media after the free limit, but that failure mode is preferable to surprise spend while the page is not generating revenue.

Source: https://supabase.com/docs/guides/platform/manage-your-usage/egress

## Usage math for this site

After thumbnailing:

- Panorama gallery preview: about 0.64 MB total.
- Full panorama opened: about 2.2 MB average.
- Full 21-panorama session: about 47-50 MB.
- Current migrated media from Blob: about 176.9 MB, plus 48.7 MB panoramas and 0.64 MB thumbnails.

Approximate visitor capacity:

- 10 GB Vercel Blob style quota:
  - 200 full 21-panorama sessions.
  - 15,000 lightweight gallery previews.
- 250 GB Supabase Pro cached/uncached bucket:
  - 5,000 full 21-panorama sessions.
  - hundreds of thousands of thumbnail-only visits.
- 1 TB transfer:
  - 20,000 full 21-panorama sessions.
  - about 1.5 million thumbnail-only gallery previews.
- Cloudflare R2:
  - bandwidth is not the bill driver; request count and storage are.

These are rough because browsers cache, users do not open every item, videos/audio vary wildly, and social traffic can cause repeat reloads.

## Operational rules

- Never use full-resolution panorama URLs as card images.
- For every `panorama_360`, keep:
  - `thumbUrl`: 720px WebP preview.
  - `mediaUrl`: original equirectangular image.
  - `coverImage`: optional, but should not be relied on as the lightweight preview.
- For audio:
  - keep `preload="none"` or `metadata`;
  - only load audio on play/modal open;
  - avoid autoplay.
- For video:
  - use poster images in feeds;
  - avoid raw MP4 delivery for anything likely to go viral;
  - use YouTube embeds for zero-cost public playback;
  - use Stream/HLS only when the project can absorb usage-based billing.
- For public feeds:
  - render poster/thumb first;
  - mount `<video>`, `<audio>`, and `<iframe>` only after hover, tap, modal open, or explicit play.

## Commands

Generate and upload panorama thumbnails:

```bash
npm run media:thumbs:panoramas
```

Migrate legacy Vercel Blob media URLs to Supabase Storage:

```bash
npm run media:migrate-supabase
```

Migrate current media URLs to Cloudflare R2 only after consciously enabling usage-based storage:

```bash
MEDIA_ALLOW_USAGE_BILLED_STORAGE=true
npm run media:migrate-r2 -- --dry-run
npm run media:migrate-r2
```

Verify production assets:

```bash
BASE_URL=https://www.balosky.com npm run audit:assets
```

If the built-in audit hangs on an external URL, use a custom verifier with request timeouts.
