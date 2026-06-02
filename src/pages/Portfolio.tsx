import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { Star, ChevronDown, ChevronUp, X, Play, ExternalLink, Copy, Check, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppContext } from '@/context/AppContext';
import { getPageStyles } from '@/themes/pageStyles';
import { PORTFOLIO_CATEGORIES, PORTFOLIO_PROJECTS, type PortfolioProject } from '@/content/portfolioProjects';
import InnerPageNav from '@/components/InnerPageNav';

const testimonials = [
  { name: 'Carlos M.', role: 'Emprendedor', text: 'Le pedí una web y me la dejó andando en una semana. Quedó mejor de lo que tenía en la cabeza.' },
  { name: 'Laura G.', role: 'Creadora de Contenido', text: 'Las ediciones con IA me volaron la cabeza. Captó el tono de la marca al toque.' },
  { name: 'Nico P.', role: 'Marketing', text: 'Trabajar con Santi en la campaña fue un golazo. Le tiré una idea suelta y la convirtió en algo que la rompió.' }
];

const faqs = [
  { q: '¿Cuánto tardás en hacer una webapp?', a: 'Depende de la complejidad — una landing o webapp sencilla, 1 a 2 semanas.' },
  { q: '¿Qué herramientas de IA usás?', a: 'Midjourney, Runway, Suno, ChatGPT/Claude. Depende del proyecto.' },
  { q: '¿Hacés trabajos a medida?', a: 'Sí. Escribime al DM o entrá como Mesaza desde la home para encargar algo específico.' }
];

const timeline = [
  { year: '2023', title: 'Inicios en creación', desc: 'Videos sobre tecnología y programación.' },
  { year: '2024', title: 'Exploración IA', desc: 'Generación de imágenes y video con IA.' },
  { year: '2025', title: 'Primeras webapps', desc: 'Proyectos freelance para clientes internacionales.' },
  { year: '2026', title: 'Plataforma propia', desc: 'Este espacio, unificado.' }
];

export default function Portfolio() {
  const { settings } = useAppContext();
  const styles = getPageStyles();
  const portfolioCopy = settings?.content.portfolio.copy;
  const [searchParams, setSearchParams] = useSearchParams();
  const searchParamsKey = searchParams.toString();
  const [filter, setFilter] = useState('Todos');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<PortfolioProject | null>(null);
  const [userRatings, setUserRatings] = useState<{ [key: string]: number }>({});
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  const handleCopyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const handleRateProject = (id: string, rating: number) => {
    if (!userRatings[id]) {
      setUserRatings(prev => ({ ...prev, [id]: rating }));
    }
  };

  const filteredProjects =
    filter === 'Todos' ? PORTFOLIO_PROJECTS : PORTFOLIO_PROJECTS.filter((project) => project.category === filter);

  useEffect(() => {
    const projectId = searchParams.get('project');
    const nextProject = projectId
      ? PORTFOLIO_PROJECTS.find((project) => project.id === projectId) ?? null
      : null;

    setSelectedProject((current) => {
      if (current?.id === nextProject?.id) return current;
      return nextProject;
    });
  }, [searchParamsKey]);

  const openProject = (project: PortfolioProject) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('project', project.id);
    setSelectedProject(project);
    setSearchParams(nextParams, { replace: true });
  };

  const closeProject = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('project');
    setSelectedProject(null);
    setSearchParams(nextParams, { replace: true });
  };

  return (
    <div className="theme-page theme-adapt max-w-6xl mx-auto pb-10 px-4 sm:px-0 space-y-14 md:space-y-20" style={{ color: 'var(--black)' }}>
      <InnerPageNav label="portfolio" />

      {/* Hero — single block, dense */}
      <section className="pt-4 md:pt-8">
        <p className="t-eyebrow mb-4">Portfolio</p>
        <h1 className="t-hero text-[clamp(2.5rem,9vw,7rem)] max-w-4xl">
          {portfolioCopy?.heroTitle || 'Lo que hago'}
        </h1>
        <p className="t-body text-base md:text-xl max-w-2xl mt-6">
          {portfolioCopy?.heroSubtitle || 'Web, IA, video y cosas raras de internet.'}
        </p>
      </section>

      {/* Projects Section */}
      <section>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 md:mb-10 gap-4">
          <h2 className="t-section text-[clamp(1.75rem,4vw,3rem)]">Proyectos</h2>
          <div className="flex flex-wrap gap-1 -mx-1 md:mx-0">
            {PORTFOLIO_CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={cn(
                  'px-3 py-1.5 text-[10px] font-mono tracking-[0.18em] uppercase border transition-colors',
                  filter === cat
                    ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
                    : 'border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--black)]'
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
        <motion.div layout className="portfolio-grid-page grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-6">
          <AnimatePresence>
            {filteredProjects.map((project) => (
              <motion.div
                key={project.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                data-hover
                className="group relative overflow-hidden block"
                style={{ border: '1px solid var(--border)' }}
              >
                <div
                  className="aspect-video overflow-hidden relative group/media cursor-pointer"
                  style={{ borderBottom: '1px solid var(--border)' }}
                  onClick={() => openProject(project)}
                >
                  {project.videoUrl ? (
                    <video
                      src={project.videoUrl}
                      className="w-full h-full object-cover"
                      muted
                      loop
                      autoPlay
                      playsInline
                    />
                  ) : (
                    <img
                      src={project.image}
                      alt={project.title}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  )}
                  {project.videoUrl && (
                    <div
                      className="absolute top-2 right-2 px-2 py-1 text-xs uppercase flex items-center gap-1"
                      style={{ background: 'var(--black)', color: 'var(--white)', fontWeight: 600 }}
                    >
                      <Play className="w-3 h-3" /> Video
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/media:opacity-100 transition-opacity flex items-center justify-center">
                    <span
                      className="px-4 py-2 uppercase text-sm"
                      style={{ background: 'var(--accent)', color: 'var(--white)', fontWeight: 600 }}
                    >
                      Ver Detalles
                    </span>
                  </div>
                </div>
                <div className="p-4 space-y-4 flex flex-col flex-1">
                  <div>
                    <div
                      className="inline-block px-2 py-1 text-xs uppercase mb-2"
                      style={{ border: '1px solid var(--border)', fontWeight: 600 }}
                    >
                      {project.category}
                    </div>
                    <h3 className="t-section text-xl uppercase">
                      {project.title}
                    </h3>
                  </div>

                  <div className="flex flex-col gap-3 mt-auto pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-sm" style={{ fontWeight: 600 }}>
                        <span className="text-lg">
                          {userRatings[project.id]
                            ? ((project.rating * project.ratingCount + userRatings[project.id]) / (project.ratingCount + 1)).toFixed(1)
                            : project.rating.toFixed(1)}
                        </span>
                        <span style={{ color: 'var(--muted)' }}>({project.ratingCount + (userRatings[project.id] ? 1 : 0)} votos)</span>
                      </div>

                      {project.demoUrl && (
                        <a
                          href={project.demoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          data-hover
                          className="p-2 transition-colors"
                          style={{ border: '1px solid var(--border)' }}
                          title="Ver Demo"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>

                    <div
                      className="flex items-center justify-between p-2"
                      style={{ border: '1px solid var(--border)', background: 'var(--grey)' }}
                    >
                      <span className="t-eyebrow">Calificar:</span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => {
                          const isRated = !!userRatings[project.id];
                          const ratingValue = userRatings[project.id] || Math.round(project.rating);
                          const isFilled = ratingValue >= star;

                          return (
                            <button
                              key={star}
                              onClick={() => handleRateProject(project.id, star)}
                              disabled={isRated}
                              className="transition-colors"
                              style={{ color: isFilled ? 'var(--accent)' : 'var(--muted)' }}
                            >
                              <Star className={cn("w-5 h-5", isFilled ? "fill-current" : "")} />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </section>

      {/* Testimonials Section */}
      <section>
        <h2 className="t-section text-3xl mb-8">Testimonios</h2>
        <div
          className="relative p-8 md:p-12 overflow-hidden"
          style={{ border: '1px solid var(--border)' }}
        >
          <div className="absolute -top-4 -left-4 text-8xl font-serif" style={{ color: 'var(--accent)', opacity: 0.3 }}>"</div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentTestimonial}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={1}
              onDragEnd={(e, { offset, velocity }) => {
                const swipe = Math.abs(offset.x) * velocity.x;
                if (swipe < -100) {
                  setCurrentTestimonial(prev => prev === testimonials.length - 1 ? 0 : prev + 1);
                } else if (swipe > 100) {
                  setCurrentTestimonial(prev => prev === 0 ? testimonials.length - 1 : prev - 1);
                }
              }}
              className="relative z-10 text-center max-w-3xl mx-auto cursor-grab active:cursor-grabbing"
            >
              <p className="t-body text-xl md:text-2xl italic mb-8 pointer-events-none">
                {testimonials[currentTestimonial].text}
              </p>
              <div className="inline-block pt-4 pointer-events-none" style={{ borderTop: '1px solid var(--border)' }}>
                <p className="t-section text-xl">{testimonials[currentTestimonial].name}</p>
                <p className="t-eyebrow mt-1">{testimonials[currentTestimonial].role}</p>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="flex justify-center gap-4 mt-8 relative z-10">
            <button
              data-hover
              onClick={() => setCurrentTestimonial(prev => prev === 0 ? testimonials.length - 1 : prev - 1)}
              className="p-3 transition-colors"
              style={{ border: '1px solid var(--border)' }}
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              data-hover
              onClick={() => setCurrentTestimonial(prev => prev === testimonials.length - 1 ? 0 : prev + 1)}
              className="p-3 transition-colors"
              style={{ border: '1px solid var(--border)' }}
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section>
        <h2 className="t-section text-3xl mb-8">Mi Trayectoria</h2>
        <div className="ml-4 md:ml-8 space-y-8 py-4" style={{ borderLeft: '1px solid var(--border)' }}>
          {timeline.map((item, idx) => (
            <div key={idx} className="relative pl-8 md:pl-12">
              <div
                className="absolute -left-[5px] top-2 w-[9px] h-[9px] rounded-full"
                style={{ background: 'var(--accent)' }}
              />
              <span
                className="inline-block px-3 py-1 text-xs mb-2"
                style={{ background: 'var(--black)', color: 'var(--white)', fontWeight: 600, letterSpacing: '0.1em' }}
              >
                {item.year}
              </span>
              <h3 className="t-section text-xl uppercase mb-1">{item.title}</h3>
              <p className="t-body">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section>
        <h2 className="t-section text-3xl mb-8">Preguntas Frecuentes</h2>
        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div key={idx} style={{ border: '1px solid var(--border)' }}>
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full flex justify-between items-center p-4 text-left transition-colors t-section text-base"
              >
                {faq.q}
                {openFaq === idx ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
              <AnimatePresence>
                {openFaq === idx && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 t-body" style={{ borderTop: '1px solid var(--border)', background: 'var(--grey)' }}>
                      {faq.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]" style={{ border: '1px solid var(--border)' }}>
        <div className="p-8 md:p-10" style={{ background: 'var(--accent)', color: 'var(--white)' }}>
          <p className="t-eyebrow" style={{ color: 'rgba(255,255,255,0.7)' }}>
            siguiente paso
          </p>
          <h2 className="t-section text-4xl mt-4 uppercase">
            {portfolioCopy?.ctaTitle}
          </h2>
        </div>
        <div className="p-8 md:p-10 flex flex-col justify-between">
          <p className="t-body text-xl max-w-2xl">
            {portfolioCopy?.ctaBody}
          </p>
          <div className="mt-8">
            <button
              data-hover
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-8 py-4 text-xl uppercase transition-transform"
              style={{ background: 'var(--black)', color: 'var(--white)', fontWeight: 700 }}
            >
              {portfolioCopy?.ctaButton} <ArrowRight className="w-6 h-6" />
            </button>
          </div>
        </div>
      </section>

      {/* Project Modal */}
      <AnimatePresence>
        {selectedProject && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-5xl relative flex flex-col md:flex-row overflow-hidden max-h-[90vh]"
              style={{ background: 'var(--white)', border: '1px solid var(--border)' }}
            >
              <button
                onClick={closeProject}
                className="absolute top-4 right-4 z-10 p-2 transition-colors"
                style={{ border: '1px solid var(--border)', background: 'var(--white)' }}
              >
                <X className="w-6 h-6" />
              </button>

              <div className="w-full md:w-3/4 flex items-center justify-center p-4" style={{ background: 'var(--grey)' }}>
                {selectedProject.videoUrl ? (
                  <video
                    src={selectedProject.videoUrl}
                    className="w-full h-full object-contain max-h-[60vh] md:max-h-[85vh]"
                    style={{ border: '1px solid var(--border)' }}
                    controls
                    autoPlay
                  />
                ) : (
                  <img
                    src={selectedProject.image}
                    alt={selectedProject.title}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-contain max-h-[60vh] md:max-h-[85vh]"
                    style={{ border: '1px solid var(--border)' }}
                  />
                )}
              </div>

              <div
                className="w-full md:w-1/4 p-6 flex flex-col overflow-y-auto"
                style={{ borderLeft: '1px solid var(--border)' }}
              >
                <div
                  className="inline-block px-2 py-1 text-xs uppercase mb-4 self-start"
                  style={{ border: '1px solid var(--border)', fontWeight: 600 }}
                >
                  {selectedProject.category}
                </div>
                <h2 className="t-section text-2xl uppercase mb-4">{selectedProject.title}</h2>

                {selectedProject.longDescription && (
                  <p className="t-body text-sm mb-6">
                    {selectedProject.longDescription}
                  </p>
                )}

                <div className="space-y-4 mt-auto">
                  {selectedProject.prompt && (
                    <>
                      <div>
                        <h3 className="t-eyebrow mb-1">Titulo del Prompt:</h3>
                        <p className="t-section text-lg">{selectedProject.promptTitle || 'Sin titulo'}</p>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="t-eyebrow">Prompt Utilizado:</h3>
                          <button
                            onClick={() => handleCopyPrompt(selectedProject.prompt)}
                            className="flex items-center gap-1 text-xs uppercase px-2 py-1 transition-colors"
                            style={{ background: 'var(--accent)', color: 'var(--white)', fontWeight: 600 }}
                          >
                            {copiedPrompt ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            {copiedPrompt ? 'Copiado' : 'Copiar'}
                          </button>
                        </div>
                        <div
                          className="p-4 font-mono text-sm break-words"
                          style={{ background: 'var(--grey)', border: '1px solid var(--border)' }}
                        >
                          {'> '} {selectedProject.prompt}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Contact Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-lg relative p-6"
              style={{ background: 'var(--white)', border: '1px solid var(--border)' }}
            >
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 p-1 transition-colors"
                style={{ border: '1px solid var(--border)' }}
              >
                <X className="w-6 h-6" />
              </button>
              <h2 className="t-section text-3xl uppercase mb-4">Hablemos</h2>
              <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); alert('Mensaje enviado!'); setIsModalOpen(false); }}>
                <div>
                  <label className="t-eyebrow block mb-1">Nombre</label>
                  <input
                    type="text"
                    required
                    className="w-full p-3 outline-none transition-colors"
                    style={{ border: '1px solid var(--border)', background: 'var(--grey)', color: 'var(--black)' }}
                    placeholder="Tu nombre..."
                  />
                </div>
                <div>
                  <label className="t-eyebrow block mb-1">Email</label>
                  <input
                    type="email"
                    required
                    className="w-full p-3 outline-none transition-colors"
                    style={{ border: '1px solid var(--border)', background: 'var(--grey)', color: 'var(--black)' }}
                    placeholder="tu@email.com"
                  />
                </div>
                <div>
                  <label className="t-eyebrow block mb-1">En que te puedo ayudar?</label>
                  <textarea
                    required
                    rows={4}
                    className="w-full p-3 outline-none resize-none transition-colors"
                    style={{ border: '1px solid var(--border)', background: 'var(--grey)', color: 'var(--black)' }}
                    placeholder="Contame sobre tu proyecto..."
                  ></textarea>
                </div>
                <button
                  type="submit"
                  data-hover
                  className="w-full py-3 uppercase text-lg transition-transform"
                  style={{ background: 'var(--black)', color: 'var(--white)', fontWeight: 700 }}
                >
                  Enviar Mensaje
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
