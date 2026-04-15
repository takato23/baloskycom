import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  BookOpen,
  BrainCircuit,
  ChevronRight,
  Compass,
  FlaskConical,
  Lightbulb,
  MessageSquare,
  NotebookText,
  Sparkles,
  Tag,
} from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import InnerPageNav from '@/components/InnerPageNav';

type EditorialLane = {
  title: string;
  eyebrow: string;
  description: string;
  examples: string[];
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

const editorialLanes: EditorialLane[] = [
  {
    title: 'Pensamientos',
    eyebrow: 'Notas rapidas',
    description:
      'Lo que me queda dando vueltas.',
    examples: ['posts cortos', 'mini ensayos', 'notas de proceso'],
    icon: Lightbulb,
  },
  {
    title: 'Investigaciones',
    eyebrow: 'Piezas grandes',
    description:
      'Cuando una idea pide mas aire.',
    examples: ['dossiers', 'timelines', 'landings editoriales'],
    icon: NotebookText,
  },
  {
    title: 'Pruebas con IA',
    eyebrow: 'Lab',
    description:
      'Pruebas, prompts y choques raros.',
    examples: ['prompts', 'tests', 'workflows'],
    icon: FlaskConical,
  },
];

const editorialFlow = [
  {
    title: 'Caida rapida',
    body:
      'Si aparece algo, cae aca.',
    icon: Compass,
  },
  {
    title: 'Si crece, se convierte',
    body:
      'Si crece, se abre solo.',
    icon: BrainCircuit,
  },
  {
    title: 'Todo deja rastro',
    body:
      'Me sirve mas que perderlo.',
    icon: Sparkles,
  },
];

export default function Blog() {
  const { blogPosts, addBlogComment } = useAppContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchParamsKey = searchParams.toString();
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [commentText, setCommentText] = useState<{ [key: string]: string }>({});

  const orderedPosts = useMemo(
    () =>
      [...blogPosts].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [blogPosts],
  );

  const handleCommentSubmit = (postId: string) => {
    if (commentText[postId]?.trim()) {
      addBlogComment(postId, commentText[postId]);
      setCommentText((prev) => ({ ...prev, [postId]: '' }));
    }
  };

  useEffect(() => {
    const postId = searchParams.get('post');
    if (!postId) {
      setExpandedPost((current) => (current && !orderedPosts.some((post) => post.id === current) ? null : current));
      return;
    }

    const matchedPost = orderedPosts.find((post) => post.id === postId);
    if (!matchedPost) return;

    setExpandedPost(matchedPost.id);

    requestAnimationFrame(() => {
      document.getElementById(`post-${matchedPost.id}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  }, [orderedPosts, searchParamsKey]);

  const openPost = (postId: string) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('post', postId);
    setExpandedPost(postId);
    setSearchParams(nextParams, { replace: true });
  };

  const closePost = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('post');
    setExpandedPost(null);
    setSearchParams(nextParams, { replace: true });
  };

  return (
    <div className="theme-page theme-adapt max-w-6xl mx-auto space-y-14 md:space-y-20 pb-32 sm:pb-16 px-4 sm:px-0 font-sans" style={{ color: 'var(--black)' }}>
      <InnerPageNav label="ideas" />
      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="overflow-hidden">
          <div className="py-4 md:py-6 space-y-5">
            <p className="t-eyebrow">
              <BookOpen className="inline w-3 h-3 mr-1 align-baseline" />
              Ideas
            </p>

            <h1 className="t-hero text-[clamp(2.5rem,9vw,6rem)]">
              Ideas, pruebas, notas y alguna obsesión.
            </h1>

            <div className="grid gap-3 sm:grid-cols-3">
              {editorialLanes.map((lane) => {
                const Icon = lane.icon;
                return (
                  <div
                    key={lane.title}
                    data-hover
                    className="p-4 space-y-3"
                    style={{ border: '1px solid var(--border)', background: 'var(--grey)' }}
                  >
                    <div
                      className="w-11 h-11 flex items-center justify-center"
                      style={{ border: '1px solid var(--border)', color: 'var(--accent)' }}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="t-eyebrow">
                        {lane.eyebrow}
                      </p>
                      <h2 className="t-section text-2xl">
                        {lane.title}
                      </h2>
                    </div>
                    <p className="t-body text-sm">{lane.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {lane.examples.map((example) => (
                        <span
                          key={example}
                          className="px-2 py-1 text-xs uppercase"
                          style={{ border: '1px solid var(--border)', fontWeight: 600, background: 'var(--white)' }}
                        >
                          {example}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <aside
          className="p-6 sm:p-8 space-y-5"
          style={{ background: 'var(--black)', color: 'var(--white)', border: '1px solid var(--border)' }}
        >
          <div className="space-y-2">
            <p className="t-eyebrow" style={{ color: 'var(--accent)' }}>
              Investigacion destacada
            </p>
            <h2 className="t-section text-3xl sm:text-4xl">
              Agenda publica
            </h2>
            <p className="t-body" style={{ color: 'var(--muted)' }}>
              Una investigacion que salio de aca y crecio.
            </p>
          </div>

          <div className="space-y-3 text-sm" style={{ color: 'var(--muted)' }}>
            <p>
              Primero cae una nota. Despues vemos.
            </p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <span className="mt-1 w-2 h-2 shrink-0" style={{ background: 'var(--accent)' }} />
                primero una nota
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 w-2 h-2 shrink-0" style={{ background: 'var(--accent)' }} />
                despues, si da, una pieza mas grande
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 w-2 h-2 shrink-0" style={{ background: 'var(--accent)' }} />
                y de ahi salen clips, audios, preguntas o lo que pinte
              </li>
            </ul>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/agenda-publica"
              data-hover
              className="inline-flex items-center gap-2 px-4 py-3 uppercase transition-colors"
              style={{ background: 'var(--accent)', color: 'var(--white)', fontWeight: 700 }}
            >
              Ver agenda publica <ChevronRight className="w-4 h-4" />
            </Link>
            <a
              href="#notas-publicadas"
              data-hover
              className="inline-flex items-center gap-2 px-4 py-3 uppercase transition-colors"
              style={{ background: 'transparent', color: 'var(--white)', fontWeight: 700, border: '1px solid var(--muted)' }}
            >
              Ver notas <ChevronRight className="w-4 h-4" />
            </a>
          </div>
        </aside>
      </section>

      <section className="space-y-8">
        <div className="space-y-3">
          <p className="t-eyebrow">
            Como lo acomodaria
          </p>
          <h2 className="t-section text-3xl sm:text-5xl">
            Que esto no sea solo un blog.
          </h2>
          <p className="t-body text-lg max-w-3xl">
            Si algo pide mas, sale de aca. Si no, se queda.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {editorialFlow.map((item) => {
            const Icon = item.icon;
            return (
              <article
                key={item.title}
                data-hover
                className="p-5 space-y-4"
                style={{ border: '1px solid var(--border)' }}
              >
                <div
                  className="w-12 h-12 flex items-center justify-center"
                  style={{ border: '1px solid var(--border)', color: 'var(--accent)' }}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="space-y-2">
                  <h3 className="t-section text-2xl">
                    {item.title}
                  </h3>
                  <p className="t-body">{item.body}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section id="notas-publicadas" className="space-y-8">
        <div className="space-y-3">
          <p className="t-eyebrow">
            Archivo vivo
          </p>
          <h2 className="t-section text-3xl sm:text-5xl">
            Lo que ya esta publicado.
          </h2>
          <p className="t-body text-lg max-w-3xl">
            Lo que ya salio queda aca abajo.
          </p>
        </div>

        <div className="space-y-8">
          {orderedPosts.map((post, index) => (
            <motion.article
              key={post.id}
              id={`post-${post.id}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06 }}
              data-hover
              className="overflow-hidden"
              style={{ border: '1px solid var(--border)' }}
            >
              {post.imageUrl && (
                <div className="w-full h-64 sm:h-80" style={{ borderBottom: '1px solid var(--border)' }}>
                  <img
                    src={post.imageUrl}
                    alt={post.title}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}

              <div className="p-6 sm:p-8 space-y-6">
                <div className="flex flex-wrap items-center gap-4 text-sm" style={{ fontWeight: 600 }}>
                  <span
                    className="px-3 py-1 uppercase"
                    style={{ background: 'var(--accent)', color: 'var(--white)' }}
                  >
                    {post.category}
                  </span>
                  <span className="t-eyebrow">
                    {formatDistanceToNow(new Date(post.createdAt), {
                      addSuffix: true,
                      locale: es,
                    })}
                  </span>
                </div>

                <h3 className="t-section text-3xl sm:text-4xl">
                  {post.title}
                </h3>

                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="flex items-center gap-1 text-sm px-2 py-1"
                      style={{ border: '1px solid var(--border)', background: 'var(--grey)', fontWeight: 500 }}
                    >
                      <Tag className="w-3 h-3" />
                      {tag}
                    </span>
                  ))}
                </div>

                <div
                  className={cn(
                    't-body prose prose-lg max-w-none',
                    expandedPost !== post.id && 'line-clamp-3',
                  )}
                >
                  {post.content.split('\n').map((paragraph, i) => (
                    <p key={i}>{paragraph}</p>
                  ))}
                </div>

                {expandedPost !== post.id ? (
                  <button
                    onClick={() => openPost(post.id)}
                    className="link-underline flex items-center gap-2 uppercase"
                    style={{ fontWeight: 700, color: 'var(--accent)' }}
                  >
                    Leer mas <ChevronRight className="w-5 h-5" />
                  </button>
                ) : (
                  <div className="pt-8 space-y-6" style={{ borderTop: '1px solid var(--border)' }}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h4 className="t-section text-2xl flex items-center gap-3">
                        <MessageSquare className="w-6 h-6" />
                        Comentarios ({post.comments.length})
                      </h4>
                      <button
                        onClick={closePost}
                        className="t-eyebrow transition-colors"
                        style={{ color: 'var(--muted)' }}
                      >
                        cerrar
                      </button>
                    </div>

                    <div className="space-y-4">
                      {post.comments.map((comment) => (
                        <div
                          key={comment.id}
                          className="p-4 space-y-2"
                          style={{ border: '1px solid var(--border)', background: 'var(--grey)' }}
                        >
                          <div className="flex justify-between items-center gap-3">
                            <span className="uppercase" style={{ fontWeight: 700 }}>{comment.author}</span>
                            <span className="t-eyebrow">
                              {formatDistanceToNow(new Date(comment.createdAt), {
                                addSuffix: true,
                                locale: es,
                              })}
                            </span>
                          </div>
                          <p className="t-body">{comment.text}</p>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        placeholder="Deja un comentario..."
                        value={commentText[post.id] || ''}
                        onChange={(e) =>
                          setCommentText((prev) => ({ ...prev, [post.id]: e.target.value }))
                        }
                        className="flex-1 p-3 outline-none transition-colors"
                        style={{ border: '1px solid var(--border)', background: 'var(--grey)', color: 'var(--black)', fontWeight: 600 }}
                      />
                      <button
                        onClick={() => handleCommentSubmit(post.id)}
                        disabled={!commentText[post.id]?.trim()}
                        className="px-6 py-3 uppercase disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        style={{ background: 'var(--black)', color: 'var(--white)', fontWeight: 700 }}
                      >
                        Enviar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.article>
          ))}
        </div>
      </section>
    </div>
  );
}
