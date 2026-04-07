import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Unlock, Heart, MessageCircle, Share2, Download, Eye, EyeOff, Sparkles } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { formatCurrency } from '@/utils/currency';
import { useSound } from '@/hooks/useSound';
import { cn } from '@/lib/utils';
import { getThemedPageStyles } from '@/themes/pageStyles';

export default function VipFeed() {
  const { posts, polls, userProfile, currency, votePoll, likePost, addComment, settings, theme } = useAppContext();
  const vipCopy = settings?.content.vip.copy;
  const styles = getThemedPageStyles(theme);

  const [activeTab, setActiveTab] = useState<'posts' | 'polls'>('posts');
  const [activeCommentPost, setActiveCommentPost] = useState<string | null>(null);
  const [revealedPrompts, setRevealedPrompts] = useState<Set<string>>(new Set());
  const [commentText, setCommentText] = useState('');
  const { playSound } = useSound();

  const unlockedPosts = useMemo(
    () => posts.filter((post) => !post.isLocked || userProfile.totalContributed >= post.minContributionRequired).length,
    [posts, userProfile.totalContributed]
  );

  const handleVote = (pollId: string, optionId: string) => {
    votePoll(pollId, optionId);
    playSound('pop');
  };

  const handleLike = (postId: string) => {
    likePost(postId);
    playSound('pop');
  };

  const togglePrompt = (postId: string) => {
    setRevealedPrompts((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });
    playSound('pop');
  };

  return (
    <div className={cn('theme-page theme-adapt max-w-7xl mx-auto px-4 sm:px-6 space-y-8 pb-12', styles.shell)}>
      <section className={cn('p-6 md:p-8', styles.panel)}>
        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <div className="space-y-5">
            <div className={cn(
              'inline-flex items-center gap-3 px-4 py-2 border',
              styles.softPanel,
              theme === 'minimal' ? 'rounded-full border-black/10 shadow-none' : '',
              theme === 'terminal' ? 'rounded-none' : ''
            )}>
              <Sparkles className="w-4 h-4" />
              <span className={cn(theme === 'minimal' ? 'normal-case tracking-[0.04em] font-medium' : 'text-xs font-bold uppercase tracking-[0.2em]')}>
                acceso para aportantes
              </span>
            </div>
            <h1 className={cn('text-4xl md:text-6xl font-bold', styles.pageTitle, theme === 'minimal' && 'leading-[0.92]')}>
              {vipCopy?.title}
            </h1>
            <p className={cn('max-w-2xl text-lg', styles.pageSubtitle)}>
              {vipCopy?.subtitle}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className={cn('p-5', styles.softPanel)}>
              <p className="text-xs uppercase tracking-[0.18em] opacity-60">posts</p>
              <p className="mt-2 text-3xl font-bold">{posts.length}</p>
            </div>
            <div className={cn('p-5', styles.softPanel)}>
              <p className="text-xs uppercase tracking-[0.18em] opacity-60">desbloqueados</p>
              <p className="mt-2 text-3xl font-bold">{unlockedPosts}</p>
            </div>
            <div className={cn('p-5', styles.contrastPanel)}>
              <p className="text-xs uppercase tracking-[0.18em] opacity-60">tu nivel</p>
              <p className="mt-2 text-2xl font-bold">{formatCurrency(userProfile.totalContributed, currency)}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="flex justify-center gap-3 mb-2">
        <button
          onClick={() => setActiveTab('posts')}
          className={cn(
            'px-6 py-3 font-bold transition-all border',
            activeTab === 'posts' ? styles.accentPanel : styles.secondaryButton,
            theme === 'minimal' ? 'rounded-full shadow-none normal-case' : '',
            theme === 'terminal' ? 'rounded-none' : ''
          )}
        >
          Publicaciones
        </button>
        <button
          onClick={() => setActiveTab('polls')}
          className={cn(
            'px-6 py-3 font-bold transition-all border',
            activeTab === 'polls' ? styles.accentPanel : styles.secondaryButton,
            theme === 'minimal' ? 'rounded-full shadow-none normal-case' : '',
            theme === 'terminal' ? 'rounded-none' : ''
          )}
        >
          Encuestas
        </button>
      </div>

      {activeTab === 'posts' && (
        <div className="grid gap-6">
          {posts.map((post) => {
            const isUnlocked = !post.isLocked || userProfile.totalContributed >= post.minContributionRequired;

            return (
              <motion.article
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn('overflow-hidden relative', styles.panel)}
              >
                {!isUnlocked && (
                  <div className={cn(
                    'absolute inset-0 z-20 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center',
                    theme === 'minimal' ? 'bg-[#f7f4ee]/92' : 'bg-white/90'
                  )}>
                    <Lock className="w-12 h-12 mb-4" />
                    <h3 className={cn('text-xl font-bold mb-2', styles.sectionTitle)}>Contenido bloqueado</h3>
                    <p className={cn('mb-6 max-w-md', styles.pageSubtitle)}>
                      Este post se desbloquea a partir de {formatCurrency(post.minContributionRequired, currency)}.
                    </p>
                    <button className={cn('px-6 py-3 font-bold transition-colors uppercase', styles.primaryButton)}>
                      Aportar ahora
                    </button>
                  </div>
                )}

                <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
                  <div className="p-6 md:p-7">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={cn('w-10 h-10 flex items-center justify-center font-bold', styles.softPanel)}>
                          SB
                        </div>
                        <div>
                          <h3 className={cn('font-bold uppercase', theme === 'minimal' ? 'normal-case' : '')}>Santi Balosky</h3>
                          <p className={cn('text-xs', styles.pageSubtitle)}>{new Date(post.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      {post.isLocked && (
                        <div className={cn('px-3 py-1 text-xs font-bold flex items-center gap-1 uppercase', styles.badge)}>
                          <Unlock className="w-3 h-3" /> Exclusivo
                        </div>
                      )}
                    </div>

                    <h2 className={cn('text-2xl font-bold mb-4', styles.sectionTitle, theme === 'minimal' ? 'normal-case' : '')}>
                      {post.title}
                    </h2>
                    <p className={cn('leading-relaxed mb-6', styles.pageSubtitle)}>{post.content}</p>

                    {post.type === 'ai-prompt' && post.aiPrompt && (
                      <div className="mb-6">
                        <button
                          onClick={() => togglePrompt(post.id)}
                          className={cn('flex items-center gap-2 px-4 py-2 font-bold uppercase text-sm transition-transform', styles.secondaryButton)}
                        >
                          {revealedPrompts.has(post.id) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          {revealedPrompts.has(post.id) ? 'Ocultar Prompt' : 'Revelar Prompt'}
                        </button>

                        {revealedPrompts.has(post.id) && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className={cn('mt-4 p-4 font-mono text-sm break-all', styles.contrastPanel)}
                          >
                            {post.aiPrompt}
                          </motion.div>
                        )}
                      </div>
                    )}

                    {post.type === 'resource' && post.downloadUrl && (
                      <div className="mb-6">
                        <a
                          href={post.downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn('inline-flex items-center gap-2 px-6 py-3 font-bold uppercase transition-transform', styles.primaryButton)}
                        >
                          <Download className="w-5 h-5" />
                          Descargar recurso
                        </a>
                      </div>
                    )}

                    <div className="flex items-center gap-6 pt-4 border-t border-current/15">
                      <button
                        onClick={() => handleLike(post.id)}
                        className={cn('flex items-center gap-2 transition-colors', styles.pageSubtitle)}
                      >
                        <Heart className="w-5 h-5" />
                        <span className="font-medium">{post.likes}</span>
                      </button>
                      <button
                        onClick={() => setActiveCommentPost(activeCommentPost === post.id ? null : post.id)}
                        className={cn('flex items-center gap-2 transition-colors', styles.pageSubtitle)}
                      >
                        <MessageCircle className="w-5 h-5" />
                        <span className="font-medium">{post.comments?.length || 0} comentarios</span>
                      </button>
                      <button className={cn('flex items-center gap-2 transition-colors ml-auto', styles.pageSubtitle)}>
                        <Share2 className="w-5 h-5" />
                      </button>
                    </div>

                    {activeCommentPost === post.id && (
                      <div className="mt-4 pt-4 border-t border-current/15">
                        <div className="space-y-4 mb-4 max-h-60 overflow-y-auto pr-2">
                          {post.comments?.map((comment) => (
                            <div key={comment.id} className={cn('p-3 border', styles.softPanel)}>
                              <div className="flex justify-between items-center mb-1">
                                <span className="font-bold text-sm uppercase">{comment.author}</span>
                                <span className={cn('text-xs', styles.pageSubtitle)}>{new Date(comment.createdAt).toLocaleDateString()}</span>
                              </div>
                              <p className="text-sm font-medium">{comment.text}</p>
                            </div>
                          ))}
                          {(!post.comments || post.comments.length === 0) && (
                            <p className={cn('text-sm italic', styles.pageSubtitle)}>Sé el primero en comentar.</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            placeholder="Escribí un comentario..."
                            className={cn(styles.input, 'flex-1 px-3 py-2')}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && commentText.trim()) {
                                addComment(post.id, commentText.trim());
                                setCommentText('');
                                playSound('pop');
                              }
                            }}
                          />
                          <button
                            onClick={() => {
                              if (commentText.trim()) {
                                addComment(post.id, commentText.trim());
                                setCommentText('');
                                playSound('pop');
                              }
                            }}
                            className={cn('px-4 py-2 font-bold uppercase', styles.primaryButton)}
                          >
                            Enviar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="border-l border-current/12 p-5 lg:p-6">
                    <div className={cn('h-full p-5 flex flex-col justify-between', styles.softPanel)}>
                      <div>
                        <p className={cn('text-xs uppercase tracking-[0.18em]', styles.pageSubtitle)}>acceso</p>
                        <p className="mt-3 text-3xl font-bold">
                          {isUnlocked ? 'Abierto' : formatCurrency(post.minContributionRequired, currency)}
                        </p>
                        <p className={cn('mt-3 text-sm leading-relaxed', styles.pageSubtitle)}>
                          {isUnlocked
                            ? 'Ya tenés acceso a esta publicación con tu nivel actual.'
                            : 'Todavía no llegás a este nivel. Cuando lo alcances, se desbloquea.'}
                        </p>
                      </div>

                      {post.imageUrl && (
                        <div className="mt-6">
                          <img src={post.imageUrl} alt={post.title} className="w-full aspect-[4/3] object-cover border border-current/15" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      )}

      {activeTab === 'polls' && (
        <div className="grid gap-6">
          {polls.map((poll) => {
            const hasVoted = poll.votedUsers.includes(userProfile.name);
            const totalVotes = poll.options.reduce((sum, option) => sum + option.votes, 0);

            return (
              <motion.div
                key={poll.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn('p-6 md:p-7', styles.panel)}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className={cn('text-xl font-bold', styles.sectionTitle)}>{poll.question}</h2>
                  {!poll.active && (
                    <span className={cn('px-3 py-1 text-xs font-bold uppercase', styles.contrastPanel)}>Cerrada</span>
                  )}
                </div>

                <div className="space-y-3">
                  {poll.options.map((option) => {
                    const percentage = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;

                    return (
                      <button
                        key={option.id}
                        onClick={() => poll.active && !hasVoted && handleVote(poll.id, option.id)}
                        disabled={!poll.active || hasVoted}
                        className={cn(
                          'w-full relative overflow-hidden p-4 text-left transition-all border',
                          hasVoted ? styles.softPanel : styles.panel
                        )}
                      >
                        {hasVoted && (
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ duration: 1, ease: 'easeOut' }}
                            className="absolute inset-0 z-0 bg-[#00FF00]/25"
                          />
                        )}
                        <div className="relative z-10 flex justify-between items-center gap-4">
                          <span className="font-medium">{option.text}</span>
                          {hasVoted && <span className="font-bold">{percentage}%</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className={cn('mt-6 text-sm flex justify-between', styles.pageSubtitle)}>
                  <span>{totalVotes} votos totales</span>
                  {hasVoted && <span>Ya votaste</span>}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
