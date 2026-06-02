import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Unlock, Heart, MessageCircle, Share2, Download, Eye, EyeOff, Sparkles } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { formatCurrency } from '@/utils/currency';
import { useSound } from '@/hooks/useSound';
import { cn } from '@/lib/utils';
import { getPageStyles } from '@/themes/pageStyles';

export default function VipFeed() {
  const { posts, polls, userProfile, currency, votePoll, likePost, addComment, settings } = useAppContext();
  const vipCopy = settings?.content.vip.copy;
  const styles = getPageStyles();

  const [activeTab, setActiveTab] = useState<'posts' | 'polls'>('posts');
  const [activeCommentPost, setActiveCommentPost] = useState<string | null>(null);
  const [revealedPrompts, setRevealedPrompts] = useState<Set<string>>(new Set());
  const [commentText, setCommentText] = useState('');
  const [shareConfirm, setShareConfirm] = useState<string | null>(null);
  const { playSound } = useSound();
  const navigate = useNavigate();

  // Share handler: uses the Web Share API on mobile (iOS/Android) and falls
  // back to copying the post URL to clipboard on desktop. Shows a brief
  // "Copiado" toast when the clipboard fallback is used.
  const handleShare = async (postId: string, title: string) => {
    const url = `${window.location.origin}/vip-feed#post-${postId}`;
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title, url });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setShareConfirm(postId);
        window.setTimeout(() => setShareConfirm((id) => (id === postId ? null : id)), 1800);
      }
    } catch (err) {
      // User cancelled the share sheet — not an error worth surfacing.
      if ((err as any)?.name !== 'AbortError') console.warn('share failed', err);
    }
  };

  // "Aportar ahora" from inside the locked-content overlay is support money,
  // not a custom job. Keep it in the cafecito/contribution lane.
  const handleUnlockAport = (minContribution: number) => {
    const amount = Math.max(500, Math.round(minContribution));
    navigate(`/checkout?mode=cafecito&amount=${amount}`);
  };

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
      <section className="p-6 md:p-8 bg-[var(--grey)] border border-[var(--border)]">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-3 px-4 py-2 border border-[var(--border)] bg-[var(--white)]">
              <Sparkles className="w-4 h-4 text-[var(--accent)]" />
              <span className="t-eyebrow">acceso para aportantes</span>
            </div>
            <h1 className="text-4xl md:text-6xl t-hero text-[var(--black)]">
              {vipCopy?.title}
            </h1>
            <p className="max-w-2xl text-lg t-body">
              {vipCopy?.subtitle}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="p-5 bg-[var(--white)] border border-[var(--border)]">
              <p className="t-eyebrow">posts</p>
              <p className="mt-2 text-3xl font-bold text-[var(--black)]">{posts.length}</p>
            </div>
            <div className="p-5 bg-[var(--white)] border border-[var(--border)]">
              <p className="t-eyebrow">desbloqueados</p>
              <p className="mt-2 text-3xl font-bold text-[var(--black)]">{unlockedPosts}</p>
            </div>
            <div className="p-5 bg-[var(--black)] text-[var(--white)] border border-[var(--border)]">
              <p className="t-eyebrow text-[var(--white)]/60">tu nivel</p>
              <p className="mt-2 text-2xl font-bold">{formatCurrency(userProfile.totalContributed, currency)}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="flex justify-center gap-3 mb-2">
        <button
          onClick={() => setActiveTab('posts')}
          data-hover
          className={cn(
            'px-6 py-3 font-bold transition-all border border-[var(--border)]',
            activeTab === 'posts'
              ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
              : 'bg-[var(--grey)] text-[var(--black)] hover:bg-[var(--black)] hover:text-[var(--white)]'
          )}
        >
          Publicaciones
        </button>
        <button
          onClick={() => setActiveTab('polls')}
          data-hover
          className={cn(
            'px-6 py-3 font-bold transition-all border border-[var(--border)]',
            activeTab === 'polls'
              ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
              : 'bg-[var(--grey)] text-[var(--black)] hover:bg-[var(--black)] hover:text-[var(--white)]'
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
                data-hover
                className="overflow-hidden relative bg-[var(--grey)] border border-[var(--border)]"
              >
                {!isUnlocked && (
                  <div className="absolute inset-0 z-20 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center bg-[var(--white)]/90">
                    <Lock className="w-12 h-12 mb-4 text-[var(--muted)]" />
                    <h3 className="text-xl font-bold mb-2 t-section text-[var(--black)]">Contenido bloqueado</h3>
                    <p className="mb-6 max-w-md t-body">
                      Este post se desbloquea a partir de {formatCurrency(post.minContributionRequired, currency)}.
                    </p>
                    <button
                      data-hover
                      onClick={() => handleUnlockAport(post.minContributionRequired)}
                      className="px-6 py-3 font-bold transition-colors uppercase bg-[var(--accent)] text-white hover:opacity-90"
                    >
                      Aportar ahora
                    </button>
                  </div>
                )}

                <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
                  <div className="p-6 md:p-7">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 flex items-center justify-center font-bold bg-[var(--white)] border border-[var(--border)] text-[var(--black)]">
                          SB
                        </div>
                        <div>
                          <h3 className="font-bold uppercase text-[var(--black)]">Santi Balosky</h3>
                          <p className="text-xs text-[var(--muted)]">{new Date(post.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      {post.isLocked && (
                        <div className="px-3 py-1 text-xs font-bold flex items-center gap-1 uppercase bg-[var(--accent)] text-white">
                          <Unlock className="w-3 h-3" /> Exclusivo
                        </div>
                      )}
                    </div>

                    <h2 className="text-2xl font-bold mb-4 t-section text-[var(--black)]">
                      {post.title}
                    </h2>
                    <p className="leading-relaxed mb-6 t-body">{post.content}</p>

                    {post.type === 'ai-prompt' && post.aiPrompt && (
                      <div className="mb-6">
                        <button
                          onClick={() => togglePrompt(post.id)}
                          data-hover
                          className="flex items-center gap-2 px-4 py-2 font-bold uppercase text-sm transition-all bg-[var(--grey)] text-[var(--black)] border border-[var(--border)] hover:bg-[var(--black)] hover:text-[var(--white)]"
                        >
                          {revealedPrompts.has(post.id) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          {revealedPrompts.has(post.id) ? 'Ocultar Prompt' : 'Revelar Prompt'}
                        </button>

                        {revealedPrompts.has(post.id) && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="mt-4 p-4 font-mono text-sm break-all bg-[var(--black)] text-[var(--white)] border border-[var(--border)]"
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
                          data-hover
                          className="inline-flex items-center gap-2 px-6 py-3 font-bold uppercase transition-all bg-[var(--accent)] text-white hover:opacity-90"
                        >
                          <Download className="w-5 h-5" />
                          Descargar recurso
                        </a>
                      </div>
                    )}

                    <div className="flex items-center gap-6 pt-4 border-t border-[var(--border)]">
                      <button
                        onClick={() => handleLike(post.id)}
                        className="flex items-center gap-2 transition-colors text-[var(--muted)] hover:text-[var(--accent)]"
                      >
                        <Heart className="w-5 h-5" />
                        <span className="font-medium">{post.likes}</span>
                      </button>
                      <button
                        onClick={() => setActiveCommentPost(activeCommentPost === post.id ? null : post.id)}
                        className="flex items-center gap-2 transition-colors text-[var(--muted)] hover:text-[var(--accent)]"
                      >
                        <MessageCircle className="w-5 h-5" />
                        <span className="font-medium">{post.comments?.length || 0} comentarios</span>
                      </button>
                      <button
                        onClick={() => handleShare(post.id, post.title)}
                        aria-label="Compartir"
                        title={shareConfirm === post.id ? 'Copiado al portapapeles' : 'Compartir'}
                        className="flex items-center gap-2 transition-colors ml-auto text-[var(--muted)] hover:text-[var(--accent)]"
                      >
                        <Share2 className="w-5 h-5" />
                        {shareConfirm === post.id && (
                          <span className="text-xs font-mono tracking-[0.12em] uppercase text-[var(--accent)]">
                            copiado
                          </span>
                        )}
                      </button>
                    </div>

                    {activeCommentPost === post.id && (
                      <div className="mt-4 pt-4 border-t border-[var(--border)]">
                        <div className="space-y-4 mb-4 max-h-60 overflow-y-auto pr-2">
                          {post.comments?.map((comment) => (
                            <div key={comment.id} className="p-3 border border-[var(--border)] bg-[var(--white)]">
                              <div className="flex justify-between items-center mb-1">
                                <span className="font-bold text-sm uppercase text-[var(--black)]">{comment.author}</span>
                                <span className="text-xs text-[var(--muted)]">{new Date(comment.createdAt).toLocaleDateString()}</span>
                              </div>
                              <p className="text-sm font-medium text-[var(--black)]">{comment.text}</p>
                            </div>
                          ))}
                          {(!post.comments || post.comments.length === 0) && (
                            <p className="text-sm italic t-body">Sé el primero en comentar.</p>
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
                            data-hover
                            className="px-4 py-2 font-bold uppercase bg-[var(--accent)] text-white hover:opacity-90 transition-all"
                          >
                            Enviar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="border-l border-[var(--border)] p-5 lg:p-6">
                    <div className="h-full p-5 flex flex-col justify-between bg-[var(--white)] border border-[var(--border)]">
                      <div>
                        <p className="t-eyebrow">acceso</p>
                        <p className="mt-3 text-3xl font-bold text-[var(--black)]">
                          {isUnlocked ? 'Abierto' : formatCurrency(post.minContributionRequired, currency)}
                        </p>
                        <p className="mt-3 text-sm leading-relaxed t-body">
                          {isUnlocked
                            ? 'Ya tenés acceso a esta publicación con tu nivel actual.'
                            : 'Todavía no llegás a este nivel. Cuando lo alcances, se desbloquea.'}
                        </p>
                      </div>

                      {post.imageUrl && (
                        <div className="mt-6">
                          <img src={post.imageUrl} alt={post.title} loading="lazy" decoding="async" className="w-full aspect-[4/3] object-cover border border-[var(--border)]" />
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
                className="p-6 md:p-7 bg-[var(--grey)] border border-[var(--border)]"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold t-section text-[var(--black)]">{poll.question}</h2>
                  {!poll.active && (
                    <span className="px-3 py-1 text-xs font-bold uppercase bg-[var(--black)] text-[var(--white)]">Cerrada</span>
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
                        data-hover
                        className={cn(
                          'w-full relative overflow-hidden p-4 text-left transition-all border border-[var(--border)]',
                          hasVoted ? 'bg-[var(--white)]' : 'bg-[var(--grey)] hover:border-[var(--accent)]'
                        )}
                      >
                        {hasVoted && (
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ duration: 1, ease: 'easeOut' }}
                            className="absolute inset-0 z-0 bg-[var(--accent)]/15"
                          />
                        )}
                        <div className="relative z-10 flex justify-between items-center gap-4">
                          <span className="font-medium text-[var(--black)]">{option.text}</span>
                          {hasVoted && <span className="font-bold text-[var(--accent)]">{percentage}%</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-6 text-sm flex justify-between t-body">
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
