/**
 * ⚠️  ARCHIVO GENERADO — no editar a mano.
 * Se regenera con `node scripts/_build-cafecitos.mjs` leyendo data/cafecitos.csv
 * (export real de cafecito.app de @santiagobalosky).
 *
 * Genera: TOP leaderboard (agregado por nombre), FEED de mensajes reales con
 * chicha (sin "Gracias por tu aporte" genérico), totales.
 */

export type CafecitoTopRow = {
  rank: string;
  name: string;
  amt: string;
  /** Ej: "25 cafecitos" — cantidad real de cafecitos que mandó la persona.
   *  Antes acá iban labels inventados (ENCARGO / DISCO / ÓRBITA). */
  kind: string;
};

export type CafecitoFeedEntry = {
  id: string;
  name: string;
  amount: number;
  message: string;
  ago: string;
};

export const CAFECITOS_TOP: CafecitoTopRow[] = [
  {
    "rank": "01",
    "name": "Victoria",
    "amt": "$169.8k",
    "kind": "× 170 ☕"
  },
  {
    "rank": "02",
    "name": "Debbie",
    "amt": "$38.5k",
    "kind": "× 38 ☕"
  },
  {
    "rank": "03",
    "name": "Leo",
    "amt": "$30.0k",
    "kind": "× 30 ☕"
  },
  {
    "rank": "04",
    "name": "la Moreno",
    "amt": "$20.0k",
    "kind": "× 10 ☕"
  },
  {
    "rank": "05",
    "name": "La zorra",
    "amt": "$20.0k",
    "kind": "× 20 ☕"
  },
  {
    "rank": "06",
    "name": "Juan",
    "amt": "$15.0k",
    "kind": "× 30 ☕"
  },
  {
    "rank": "07",
    "name": "Ceci",
    "amt": "$14.0k",
    "kind": "× 14 ☕"
  },
  {
    "rank": "08",
    "name": "Lu",
    "amt": "$13.0k",
    "kind": "× 8 ☕"
  },
  {
    "rank": "09",
    "name": "Ana",
    "amt": "$13.0k",
    "kind": "× 11 ☕"
  },
  {
    "rank": "10",
    "name": "Flor",
    "amt": "$13.0k",
    "kind": "× 12 ☕"
  }
];

export const CAFECITOS_FEED: CafecitoFeedEntry[] = [
  {
    "id": "cf_1776876480000",
    "name": "la Moreno",
    "amount": 9995,
    "message": "Gracias por tanto Santi! Y que Dios y el universo te den muchísimo más de todo lo que nos haces reír con tus locuras",
    "ago": "Hace 1 d"
  },
  {
    "id": "cf_1776851340000",
    "name": "Sil",
    "amount": 1999,
    "message": "Groso de mais...🥳🥳🥳",
    "ago": "Hace 2 d"
  },
  {
    "id": "cf_1776841980000",
    "name": "Viole",
    "amount": 1999,
    "message": "Me encanta lo que haces! Y últimamente me volas la cabeza con la IA jajaja",
    "ago": "Hace 2 d"
  },
  {
    "id": "cf_1776835620000",
    "name": "Liz",
    "amount": 1999,
    "message": "Me divertís tanto, sos tan real",
    "ago": "Hace 2 d"
  },
  {
    "id": "cf_1776821340000",
    "name": "Caro",
    "amount": 1999,
    "message": "Extraordinario! Tenes  que vender cursos  de capacitación, sos muy prolijo y detallista. No se te lo dejo… arma un programa y lo tenes que vender 💪🏻",
    "ago": "Hace 2 d"
  },
  {
    "id": "cf_1776819840000",
    "name": "putamadreche",
    "amount": 9995,
    "message": "x el esfuerzo de producir teniendo una hija de 67 años. abrazo hermana",
    "ago": "Hace 2 d"
  },
  {
    "id": "cf_1776104640000",
    "name": "Mile",
    "amount": 1999,
    "message": "Te veo todos los días!",
    "ago": "Hace 10 d"
  },
  {
    "id": "cf_1776046080000",
    "name": "Ana",
    "amount": 3998,
    "message": "Me haces reír mucho, eso vale oro",
    "ago": "Hace 11 d"
  },
  {
    "id": "cf_1775138220000",
    "name": "La Moreno",
    "amount": 9995,
    "message": "Gracias por hacerme reír tanto cuando no soporto la GENTE me sacas de esos lugares !",
    "ago": "Hace 22 d"
  },
  {
    "id": "cf_1774992840000",
    "name": "Putita tierna",
    "amount": 3998,
    "message": "Tranquila, todo va estar bien *colapsa*",
    "ago": "Hace 23 d"
  },
  {
    "id": "cf_1771935120000",
    "name": "Lu",
    "amount": 9995,
    "message": "dale loco pongannn",
    "ago": "Hace 2 meses"
  },
  {
    "id": "cf_1771893420000",
    "name": "Flor",
    "amount": 1999,
    "message": "Amo tu contenido. Quiero ser tu amiga, arre.",
    "ago": "Hace 2 meses"
  },
  {
    "id": "cf_1771883340000",
    "name": "Pablo Dones",
    "amount": 9995,
    "message": "Sos un genio 🫶♥️",
    "ago": "Hace 2 meses"
  },
  {
    "id": "cf_1771014720000",
    "name": "Gracias!!!",
    "amount": 5997,
    "message": "Tenes mucho talento!! Anímate a monetizas todo lo que sabes hacer!!",
    "ago": "Hace 2 meses"
  },
  {
    "id": "cf_1771004400000",
    "name": "Debbie",
    "amount": 7996,
    "message": "Siempre te voy a mandar cafecitos porque me haces reir 😘",
    "ago": "Hace 2 meses"
  },
  {
    "id": "cf_1770852900000",
    "name": "Kamalā",
    "amount": 4995,
    "message": "Sos un crack pero yo tbn soy pobre. Algún día la vas a juntar con pala rey",
    "ago": "Hace 2 meses"
  },
  {
    "id": "cf_1768574040000",
    "name": "José Luis",
    "amount": 9990,
    "message": "Sos un genio Santi. Me hacen reír mucho con tus videos",
    "ago": "Hace 3 meses"
  },
  {
    "id": "cf_1768530300000",
    "name": "Anahi",
    "amount": 2997,
    "message": "Nahhh como no te voy a regalar un café!  Sos un geniooo",
    "ago": "Hace 3 meses"
  },
  {
    "id": "cf_1768520340000",
    "name": "🌸",
    "amount": 1998,
    "message": "Mi risa de todos los días, ahí va mi suscripción mensual 💵😂",
    "ago": "Hace 3 meses"
  },
  {
    "id": "cf_1768352460000",
    "name": "Ursu",
    "amount": 9990,
    "message": "Gracias por tanto... Y perdón por tan poco",
    "ago": "Hace 3 meses"
  },
  {
    "id": "cf_1768339560000",
    "name": "Paula",
    "amount": 1998,
    "message": "Un café para vos, otro para mí. Me puse feliz viendo el video de Luciano hablando de la situación 😂 eso no puede ser gratis",
    "ago": "Hace 3 meses"
  },
  {
    "id": "cf_1767714360000",
    "name": "Luigi",
    "amount": 2997,
    "message": "Grande Santi seguí haciendo reír",
    "ago": "Hace 4 meses"
  },
  {
    "id": "cf_1766092980000",
    "name": "Naty",
    "amount": 4995,
    "message": "Feliz cumple Santi 🥳🫶",
    "ago": "Hace 4 meses"
  },
  {
    "id": "cf_1765145160000",
    "name": "Soni",
    "amount": 4995,
    "message": "No me anda la fucking visa ...me quiero suscribir.....pero bueno te compro cafecitos...y de paso te consulto si me podés asesorar para hacer un vídeo para la facu con IA....te pago todos los cafés que quieras..SOS muy di",
    "ago": "Hace 5 meses"
  },
  {
    "id": "cf_1764843900000",
    "name": "Pau",
    "amount": 7992,
    "message": "El humor rescata",
    "ago": "Hace 5 meses"
  },
  {
    "id": "cf_1764769920000",
    "name": "Javier",
    "amount": 7992,
    "message": "Aguante el teleton por la cadera de tu vieja 💪",
    "ago": "Hace 5 meses"
  },
  {
    "id": "cf_1764470220000",
    "name": "Sofía krause",
    "amount": 2997,
    "message": "Hagamos una agencia de ia por favor. Jejej",
    "ago": "Hace 5 meses"
  },
  {
    "id": "cf_1764464580000",
    "name": "Naty Sol",
    "amount": 2997,
    "message": "Te quiero Santi 😘",
    "ago": "Hace 5 meses"
  },
  {
    "id": "cf_1764457200000",
    "name": "Juli F",
    "amount": 2997,
    "message": "🫂 Esto también pasará",
    "ago": "Hace 5 meses"
  },
  {
    "id": "cf_1764123480000",
    "name": "Nati",
    "amount": 2997,
    "message": "Tan genio ibas a ser?!?!!",
    "ago": "Hace 5 meses"
  }
];

export const CAFECITOS_TOTAL_COUNT = 418;
export const CAFECITOS_TOTAL_AMOUNT = 1380795;
export const CAFECITOS_UNIQUE_SUPPORTERS = 204;
