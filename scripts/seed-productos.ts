/**
 * Seed / reset de productos de Balosky.
 *
 * Uso:
 *   npx tsx scripts/seed-productos.ts
 *
 * Borra los productos existentes y deja SOLO los 4 que definimos:
 *   1. Cafecito ($2.000)
 *   2. Encargo: canción con IA ($25.000)
 *   3. Pack imágenes con IA ($80.000 / $100.000)
 *   4. Videollamada IA 45 min ($150.000)
 *
 * Podés correrlo cuantas veces quieras — es idempotente (si los IDs ya
 * existen, los actualiza en vez de duplicarlos).
 */

import db from '../src/server/db.js';

const now = new Date().toISOString();

type ProductSeed = {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  coverImage: string;
  deliveryType: string;
  active: number;
  featured: number;
  sortOrder: number;
};

const productos: ProductSeed[] = [
  {
    id: 'p-cafecito',
    title: 'Invitame un cafecito ☕',
    description:
      'Aporte simbólico. Tu nombre queda en el muro de donantes, visible en la home y agradecido públicamente. Gracias por bancar.',
    price: 2000,
    category: 'apoyo',
    coverImage:
      'https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=800&auto=format&fit=crop',
    deliveryType: 'digital',
    active: 1,
    featured: 1,
    sortOrder: 1,
  },
  {
    id: 'p-encargo-cancion',
    title: 'Encargo: canción con IA',
    description:
      'Me pasás el tema, la vibra, a quién va dedicada — y te genero una canción original con IA. Letra + audio, lista para que la uses donde quieras.',
    price: 25000,
    category: 'encargo',
    coverImage:
      'https://images.unsplash.com/photo-1511379938547-c1f69419868d?q=80&w=800&auto=format&fit=crop',
    deliveryType: 'digital',
    active: 1,
    featured: 1,
    sortOrder: 2,
  },
  {
    id: 'p-pack-imagenes-ia',
    title: 'Pack de imágenes con IA',
    description:
      'Imágenes generadas con IA para levantar tu feed de Instagram, hacer sesiones de fotos virtuales, lanzar contenido o lo que se te ocurra. Pack 5 imágenes · $80.000 · Pack 10 imágenes · $100.000. Consultá por cantidades mayores. No se generan imágenes de personas famosas por cuestiones legales.',
    price: 80000,
    category: 'servicio',
    coverImage:
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop',
    deliveryType: 'digital',
    active: 1,
    featured: 0,
    sortOrder: 3,
  },
  {
    id: 'p-videollamada-ia',
    title: 'Videollamada IA · 45 min',
    description:
      '45 minutos 1:1 por Zoom. Vemos cómo te puedo ayudar con IA: workflow, herramientas, aplicación en tu negocio, contenido o proyecto puntual. Sin vueltas, con ejemplos.',
    price: 150000,
    category: 'servicio',
    coverImage:
      'https://images.unsplash.com/photo-1587614382346-4ec70e388b28?q=80&w=800&auto=format&fit=crop',
    deliveryType: 'external',
    active: 1,
    featured: 1,
    sortOrder: 4,
  },
];

async function main() {
  console.log('[seed] Borrando productos existentes…');
  await db.prepare('DELETE FROM products').run();

  console.log('[seed] Insertando ' + productos.length + ' productos nuevos…');
  const insert = db.prepare(
    `INSERT INTO products
      (id, title, description, price, category, coverImage, deliveryType,
       active, featured, sortOrder, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  for (const p of productos) {
    await insert.run(
      p.id,
      p.title,
      p.description,
      p.price,
      p.category,
      p.coverImage,
      p.deliveryType,
      p.active,
      p.featured,
      p.sortOrder,
      now
    );
    console.log('  ✓ ' + p.title + ' · $' + p.price.toLocaleString('es-AR'));
  }

  const rows = await db
    .prepare('SELECT id, title, price FROM products ORDER BY sortOrder ASC')
    .all();
  console.log('\n[seed] Productos en DB:');
  console.table(rows);
  console.log('\nListo. Abrí http://localhost:3000/ y vas a ver los productos nuevos en la sección #apoya.');
  console.log('(La home muestra los 3 primeros por sortOrder. La videollamada queda en DB pero fuera de la grid hasta que decidamos dónde mostrarla.)');
  process.exit(0);
}

main().catch((err) => {
  console.error('[seed] ERROR:', err);
  process.exit(1);
});
