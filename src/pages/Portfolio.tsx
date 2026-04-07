import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Code, Image as ImageIcon, MonitorPlay, ArrowRight, Briefcase, Star, ChevronDown, ChevronUp, X, Play, ExternalLink, ThumbsUp, Copy, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppContext } from '@/context/AppContext';
import { getThemedPageStyles } from '@/themes/pageStyles';

const services = [
  {
    title: 'Desarrollo de Webapps',
    description: 'Creo aplicaciones web modernas, rápidas y escalables. Especializado en React, Vite y código limpio para dar vida a tus ideas.',
    icon: Code,
    color: 'bg-[#00FF00]'
  },
  {
    title: 'Edición con IA',
    description: 'Edición avanzada de fotos y videos con IA. Beneficios: Resultados únicos, entregas rápidas y calidad premium. Proceso: Envío de material ➔ Generación de conceptos ➔ Refinamiento ➔ Entrega final.',
    icon: ImageIcon,
    color: 'bg-[#FF00FF]'
  },
  {
    title: 'Creación de Contenido',
    description: 'Producción audiovisual, edición de video y estrategias de contenido para destacar en redes sociales.',
    icon: MonitorPlay,
    color: 'bg-yellow-300'
  }
];

const projects = [
  {
    id: 'p1',
    title: 'Plataforma de Creadores',
    category: 'Desarrollo Web',
    image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=800&auto=format&fit=crop',
    link: '#',
    demoUrl: 'https://example.com/demo',
    longDescription: 'Una plataforma integral diseñada para creadores de contenido, permitiendo monetización directa, gestión de comunidad y recompensas exclusivas. Construida con React, Node.js y Tailwind CSS para un rendimiento óptimo.',
    rating: 4.8,
    ratingCount: 12
  },
  {
    id: 'p2',
    title: 'Campaña Visual IA',
    category: 'Proyectos IA',
    image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=800&auto=format&fit=crop',
    link: '#',
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    promptTitle: 'Cyberpunk Cityscape',
    prompt: 'A futuristic cyberpunk city with neon lights, highly detailed, 8k resolution, unreal engine 5 render',
    rating: 5.0,
    ratingCount: 8
  },
  {
    id: 'p3',
    title: 'Reels Virales',
    category: 'Creación de Contenido',
    image: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=800&auto=format&fit=crop',
    link: '#',
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    rating: 4.5,
    ratingCount: 24
  }
];

const techStack = ['React', 'Vite', 'Tailwind CSS', 'Node.js', 'Midjourney', 'RunwayML', 'Figma', 'TypeScript', 'Framer Motion'];

const testimonials = [
  { name: 'Carlos M.', role: 'Emprendedor', text: 'Santi nos armó una webapp increíble. La calidad del código y el diseño brutalista superaron nuestras expectativas. Trabajar con él fue súper fluido y colaborativo.' },
  { name: 'Laura G.', role: 'Creadora de Contenido', text: 'Las ediciones con IA son de otro planeta. Entendió perfectamente la visión de la marca y el proceso de iteración fue excelente. Un profesional de primera.' },
  { name: 'Agencia XYZ', role: 'Marketing', text: 'Colaborar con Santi en nuestra campaña visual fue la mejor decisión. Su creatividad y la calidad final del trabajo nos dejaron sin palabras. Totalmente recomendado.' }
];

const faqs = [
  { q: '¿Cuánto tardás en hacer una webapp?', a: 'Depende de la complejidad, pero una landing page o webapp sencilla puede estar lista en 1 a 2 semanas.' },
  { q: '¿Qué herramientas de IA usás?', a: 'Principalmente Midjourney para imágenes, Runway para video, y ChatGPT/Claude para asistencia en código y guiones.' },
  { q: '¿Hacés trabajos a medida?', a: '¡Sí! Podés contactarme directamente o usar los niveles de "Mecenas" en la plataforma para encargar proyectos específicos.' }
];

const timeline = [
  { year: '2023', title: 'Inicios en Creación', desc: 'Empecé a subir videos sobre tecnología y programación.' },
  { year: '2024', title: 'Exploración IA', desc: 'Me metí de lleno en la generación de imágenes y video con IA.' },
  { year: '2025', title: 'Primeras Webapps', desc: 'Lancé mis primeros proyectos freelance para clientes internacionales.' },
  { year: '2026', title: 'Plataforma Propia', desc: 'Creación de este espacio brutalista para unificar todo mi trabajo.' }
];

export default function Portfolio() {
  const { theme } = useAppContext();
  const styles = getThemedPageStyles(theme);
  const [filter, setFilter] = useState('Todos');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
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

  const filteredProjects = filter === 'Todos' ? projects : projects.filter(p => p.category === filter);

  return (
    <div className={cn("theme-page theme-adapt space-y-12 pb-10", styles.shell)}>
      {/* Hero Section */}
      <div className="text-center space-y-6">
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className={cn("w-20 h-20 mx-auto flex items-center justify-center", styles.contrastPanel)}
        >
          <Briefcase className="w-10 h-10" />
        </motion.div>
        <h1 className={cn("text-5xl md:text-6xl font-bold", styles.pageTitle)}>
          Mi Portfolio
        </h1>
        <p className={cn("text-xl max-w-2xl mx-auto font-medium", styles.pageSubtitle)}>
          No solo creo contenido, también construyo herramientas y experiencias digitales. 
          Conocé mis servicios y proyectos.
        </p>
      </div>

      {/* Tech Stack Marquee */}
      <section className={cn("overflow-hidden py-4 border-y-4 border-black flex whitespace-nowrap", styles.softPanel)}>
        <motion.div 
          animate={{ x: ["0%", "-50%"] }}
          transition={{ repeat: Infinity, ease: "linear", duration: 20 }}
          className={cn("flex gap-8 items-center uppercase text-2xl font-bold", styles.sectionTitle)}
        >
          {[...techStack, ...techStack].map((tech, i) => (
            <span key={i} className="flex items-center gap-8">
              {tech} <Star className="w-6 h-6 fill-black" />
            </span>
          ))}
        </motion.div>
      </section>

      {/* Services Section */}
      <section>
        <h2 className={cn("text-3xl font-bold mb-6", styles.sectionTitle)}>Servicios</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {services.map((service, index) => {
            const Icon = service.icon;
            const isHighlighted = service.title === 'Edición con IA';
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={cn(
                  "p-6 transition-transform hover:-translate-y-1 relative",
                  isHighlighted ? styles.contrastPanel : styles.panel
                )}
              >
                {isHighlighted && (
                  <div className={cn("absolute -top-3 -right-3 text-xs font-bold px-3 py-1 border-2 transform rotate-12", styles.badge)}>
                    DESTACADO
                  </div>
                )}
                <div className={cn(
                  "w-14 h-14 flex items-center justify-center mb-6 border-4 border-black brutal-shadow-sm text-black",
                  service.color
                )}>
                  <Icon className="w-7 h-7 text-black" />
                </div>
                <h3 className={cn("text-xl font-bold mb-3 font-brutal uppercase", isHighlighted ? "text-white" : styles.sectionTitle)}>
                  {service.title}
                </h3>
                <p className={cn("font-medium", isHighlighted ? "text-white/80" : styles.pageSubtitle)}>
                  {service.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Projects Section */}
      <section>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h2 className={cn("text-3xl font-bold", styles.sectionTitle)}>Proyectos Destacados</h2>
          <div className="flex flex-wrap gap-2">
            {['Todos', 'Proyectos IA', 'Desarrollo Web', 'Creación de Contenido'].map(cat => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={cn(
                  "px-4 py-1 border-2 border-black font-bold uppercase text-sm transition-colors",
                  filter === cat ? styles.contrastPanel : styles.panel
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredProjects.map((project, index) => (
              <motion.div
                key={project.title}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  "group relative overflow-hidden block",
                  styles.panel
                )}
              >
                <div 
                  className={cn(
                    "aspect-video overflow-hidden border-b-4 border-black relative group/media cursor-pointer"
                  )}
                  onClick={() => setSelectedProject(project)}
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
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  )}
                  {project.videoUrl && (
                    <div className="absolute top-2 right-2 bg-black text-white px-2 py-1 text-xs font-bold uppercase flex items-center gap-1">
                      <Play className="w-3 h-3" /> Video
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/media:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="bg-[#FF00FF] text-white px-4 py-2 font-bold uppercase border-2 border-black">Ver Detalles</span>
                  </div>
                </div>
                <div className="p-4 space-y-4 flex flex-col flex-1">
                  <div>
                    <div className={cn(
                      "inline-block px-2 py-1 text-xs font-bold uppercase mb-2 border-2 border-black",
                      styles.chip
                    )}>
                      {project.category}
                    </div>
                    <h3 className={cn("text-xl font-bold font-brutal uppercase", styles.sectionTitle)}>
                      {project.title}
                    </h3>
                  </div>
                  
                  <div className="flex flex-col gap-3 mt-auto pt-4 border-t-2 border-black/10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-sm font-bold">
                        <span className="text-lg">
                          {userRatings[project.id] 
                            ? ((project.rating * project.ratingCount + userRatings[project.id]) / (project.ratingCount + 1)).toFixed(1)
                            : project.rating.toFixed(1)}
                        </span>
                        <span className="text-black/50">({project.ratingCount + (userRatings[project.id] ? 1 : 0)} votos)</span>
                      </div>
                      
                      {project.demoUrl && (
                        <a 
                          href={project.demoUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className={cn("p-2 border-2 border-black transition-colors", styles.secondaryButton)}
                          title="Ver Demo"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                    
                    <div className={cn("flex items-center justify-between p-2 border-2 border-black", styles.softPanel)}>
                      <span className={cn("text-xs font-bold uppercase", styles.pageSubtitle)}>Calificar:</span>
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
                              className={cn(
                                "transition-colors",
                                isFilled ? "text-yellow-400" : "text-zinc-300 hover:text-yellow-400"
                              )}
                            >
                              <Star className={cn("w-5 h-5", isFilled ? "fill-yellow-400" : "")} />
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
        <h2 className={cn("text-3xl font-bold mb-6", styles.sectionTitle)}>Testimonios</h2>
        <div className={cn("relative p-8 md:p-12 overflow-hidden", styles.panel)}>
          <div className={cn("absolute -top-4 -left-4 text-8xl font-serif opacity-50", theme === 'terminal' ? 'text-[#00ff00]' : theme === 'minimal' ? 'text-[#d8c3a5]' : 'text-yellow-300')}>"</div>
          
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
              <p className={cn("text-xl md:text-2xl italic font-medium mb-8 pointer-events-none", styles.pageSubtitle)}>
                {testimonials[currentTestimonial].text}
              </p>
              <div className="inline-block border-t-4 border-black pt-4 pointer-events-none">
                <p className={cn("font-bold uppercase font-brutal text-xl", styles.sectionTitle)}>{testimonials[currentTestimonial].name}</p>
                <p className={cn("text-sm font-bold uppercase", styles.pageSubtitle)}>{testimonials[currentTestimonial].role}</p>
              </div>
            </motion.div>
          </AnimatePresence>
          
          <div className="flex justify-center gap-4 mt-8 relative z-10">
            <button 
              onClick={() => setCurrentTestimonial(prev => prev === 0 ? testimonials.length - 1 : prev - 1)}
              className={cn("p-3 transition-colors", styles.secondaryButton)}
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button 
              onClick={() => setCurrentTestimonial(prev => prev === testimonials.length - 1 ? 0 : prev + 1)}
              className={cn("p-3 transition-colors", styles.secondaryButton)}
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section>
        <h2 className={cn("text-3xl font-bold mb-6", styles.sectionTitle)}>Mi Trayectoria</h2>
        <div className={cn("border-l-4 ml-4 md:ml-8 space-y-8 py-4", styles.timelineLine)}>
          {timeline.map((item, idx) => (
            <div key={idx} className="relative pl-8 md:pl-12">
              <div className={cn("absolute -left-[14px] top-1 w-6 h-6 rounded-full", styles.timelineNode)} />
              <span className={cn("inline-block px-2 py-1 font-bold text-sm mb-2 brutal-shadow-sm", styles.contrastPanel)}>
                {item.year}
              </span>
              <h3 className={cn("text-xl font-bold font-brutal uppercase mb-1", styles.sectionTitle)}>{item.title}</h3>
              <p className={cn("font-medium", styles.pageSubtitle)}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section>
        <h2 className={cn("text-3xl font-bold mb-6", styles.sectionTitle)}>Preguntas Frecuentes</h2>
        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div key={idx} className={cn(styles.panel)}>
              <button 
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className={cn("w-full flex justify-between items-center p-4 text-left font-bold uppercase font-brutal transition-colors", styles.sectionTitle)}
              >
                {faq.q}
                {openFaq === idx ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
              </button>
              <AnimatePresence>
                {openFaq === idx && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className={cn("p-4 border-t-4 border-black font-medium", styles.softPanel, styles.pageSubtitle)}>
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
      <section className={cn("p-8 md:p-12 text-center", styles.accentPanel)}>
        <h2 className={cn("text-4xl font-bold mb-4 font-brutal uppercase", styles.sectionTitle)}>
          ¿Trabajamos Juntos?
        </h2>
        <p className={cn("text-xl font-medium mb-8 max-w-2xl mx-auto", styles.pageSubtitle)}>
          Si tenés una idea para una webapp, necesitás edición con IA o querés potenciar tu contenido, hablemos.
        </p>
        <button 
          onClick={() => setIsModalOpen(true)}
          className={cn("inline-flex items-center gap-2 px-8 py-4 text-xl font-bold uppercase transition-transform", styles.primaryButton)}
        >
          Contactame <ArrowRight className="w-6 h-6" />
        </button>
      </section>

      {/* Project Modal */}
      <AnimatePresence>
        {selectedProject && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={cn("w-full max-w-5xl relative flex flex-col md:flex-row overflow-hidden max-h-[90vh]", styles.modal)}
            >
              <button 
                onClick={() => setSelectedProject(null)}
                className={cn("absolute top-4 right-4 z-10 p-2 border-2 border-black transition-colors", styles.secondaryButton)}
              >
                <X className="w-6 h-6" />
              </button>
              
              <div className={cn("w-full md:w-3/4 flex items-center justify-center p-4", styles.contrastPanel)}>
                {selectedProject.videoUrl ? (
                  <video 
                    src={selectedProject.videoUrl} 
                    className="w-full h-full object-contain max-h-[60vh] md:max-h-[85vh] border-4 border-black"
                    controls
                    autoPlay 
                  />
                ) : (
                  <img 
                    src={selectedProject.image} 
                    alt={selectedProject.title} 
                    className="w-full h-full object-contain max-h-[60vh] md:max-h-[85vh] border-4 border-black"
                  />
                )}
              </div>
              
              <div className={cn("w-full md:w-1/4 p-6 flex flex-col overflow-y-auto border-l-4 border-black", styles.panel)}>
                <div className={cn("inline-block px-2 py-1 text-xs font-bold uppercase mb-4 border-2 border-black self-start", styles.chip)}>
                  {selectedProject.category}
                </div>
                <h2 className="text-2xl font-bold font-brutal uppercase mb-4">{selectedProject.title}</h2>
                
                {selectedProject.longDescription && (
                  <p className={cn("text-sm font-medium mb-6", styles.pageSubtitle)}>
                    {selectedProject.longDescription}
                  </p>
                )}
                
                <div className="space-y-4 mt-auto">
                  {selectedProject.prompt && (
                    <>
                      <div>
                        <h3 className="font-bold uppercase tracking-wider text-black/60 text-xs mb-1">Título del Prompt:</h3>
                        <p className="font-bold text-lg">{selectedProject.promptTitle || 'Sin título'}</p>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-bold uppercase tracking-wider text-black/60 text-xs">Prompt Utilizado:</h3>
                          <button 
                            onClick={() => handleCopyPrompt(selectedProject.prompt)}
                            className={cn("flex items-center gap-1 text-xs font-bold uppercase px-2 py-1 transition-colors", styles.primaryButton)}
                          >
                            {copiedPrompt ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            {copiedPrompt ? 'Copiado' : 'Copiar'}
                          </button>
                        </div>
                        <div className={cn("p-4 border-2 border-black font-mono text-sm break-words", styles.contrastPanel)}>
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
              className={cn("w-full max-w-lg relative p-6", styles.modal)}
            >
              <button 
                onClick={() => setIsModalOpen(false)}
                className={cn("absolute top-4 right-4 p-1 border-2 border-black transition-colors", styles.secondaryButton)}
              >
                <X className="w-6 h-6" />
              </button>
              <h2 className="text-3xl font-bold font-brutal uppercase mb-4">Hablemos</h2>
              <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); alert('Mensaje enviado!'); setIsModalOpen(false); }}>
                <div>
                  <label className="block text-sm font-bold uppercase mb-1">Nombre</label>
                  <input type="text" required className={styles.input} placeholder="Tu nombre..." />
                </div>
                <div>
                  <label className="block text-sm font-bold uppercase mb-1">Email</label>
                  <input type="email" required className={styles.input} placeholder="tu@email.com" />
                </div>
                <div>
                  <label className="block text-sm font-bold uppercase mb-1">¿En qué te puedo ayudar?</label>
                  <textarea required rows={4} className={cn(styles.input, "resize-none")} placeholder="Contame sobre tu proyecto..."></textarea>
                </div>
                <button type="submit" className={cn("w-full py-3 font-bold uppercase text-lg transition-transform", styles.primaryButton)}>
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
