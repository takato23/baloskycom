import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Unlock, Heart, MessageCircle, Share2, Image as ImageIcon, Download, Eye, EyeOff } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { formatCurrency } from '@/utils/currency';
import { useSound } from '@/hooks/useSound';
import { cn } from '@/lib/utils';

export default function VipFeed() {
  const { posts, polls, userProfile, currency, votePoll, likePost, addComment } = useAppContext();
  const [activeTab, setActiveTab] = useState<'posts' | 'polls'>('posts');
  const [activeCommentPost, setActiveCommentPost] = useState<string | null>(null);
  const [revealedPrompts, setRevealedPrompts] = useState<Set<string>>(new Set());
  const [commentText, setCommentText] = useState('');
  const { playSound } = useSound();

  const handleVote = (pollId: string, optionId: string) => {
    votePoll(pollId, optionId);
    playSound('pop');
  };

  const handleLike = (postId: string) => {
    likePost(postId);
    playSound('pop');
  };

  const togglePrompt = (postId: string) => {
    setRevealedPrompts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
    playSound('pop');
  };

  return (
    <div className="theme-page theme-adapt space-y-8">
      <div className="text-center space-y-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className={cn(
            "w-16 h-16 rounded-2xl flex items-center justify-center mx-auto",
            "bg-[#FF00FF] border-4 border-black text-white brutal-shadow-sm"
          )}
        >
          <Lock className="w-8 h-8" />
        </motion.div>
        <h1 className={cn("text-4xl font-bold", "font-brutal uppercase")}>Feed del Creador</h1>
        <p className={cn("max-w-lg mx-auto", "text-black/80 font-bold")}>
          Actualizaciones exclusivas, fotos, videos cortos o textos para mis seguidores. Un vistazo a mi día a día o al proceso creativo.
        </p>
      </div>

      <div className="flex justify-center gap-4 mb-8">
        <button
          onClick={() => setActiveTab('posts')}
          className={cn(
            "px-6 py-2 rounded-full font-bold transition-all",
            activeTab === 'posts' 
              ? ("bg-black text-white border-4 border-black brutal-shadow-sm") 
              : ("bg-white text-black border-4 border-black hover:translate-y-1 hover:shadow-none")
          )}
        >
          Publicaciones
        </button>
        <button
          onClick={() => setActiveTab('polls')}
          className={cn(
            "px-6 py-2 rounded-full font-bold transition-all",
            activeTab === 'polls' 
              ? ("bg-black text-white border-4 border-black brutal-shadow-sm") 
              : ("bg-white text-black border-4 border-black hover:translate-y-1 hover:shadow-none")
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
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "overflow-hidden relative group",
                  "bg-white border-4 border-black brutal-shadow"
                )}
              >
                {!isUnlocked && (
                  <div className={cn(
                    "absolute inset-0 z-20 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center",
                    "bg-white/90"
                  )}>
                    <Lock className={cn("w-12 h-12 mb-4", "text-black")} />
                    <h3 className={cn("text-xl font-bold mb-2", "text-black uppercase font-brutal")}>Contenido Bloqueado</h3>
                    <p className={cn("mb-6", "text-black/80 font-bold")}>
                      Este post es exclusivo para aportantes de nivel superior a {formatCurrency(post.minContributionRequired, currency)}.
                    </p>
                    <button className={cn(
                      "px-6 py-3 font-bold transition-colors",
                      "bg-[#00FF00] text-black border-4 border-black brutal-shadow-sm hover:translate-y-1 hover:shadow-none uppercase"
                    )}>
                      Aportar ahora
                    </button>
                  </div>
                )}

                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 flex items-center justify-center font-bold",
                        "bg-yellow-300 border-4 border-black text-black brutal-shadow-sm"
                      )}>
                        SB
                      </div>
                      <div>
                        <h3 className={cn("font-bold", "text-black uppercase")}>Santi Balosky</h3>
                        <p className={cn("text-xs", "text-black/70 font-bold")}>{new Date(post.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    {post.isLocked && (
                      <div className={cn(
                        "px-3 py-1 text-xs font-bold flex items-center gap-1",
                        "bg-[#FF00FF] border-2 border-black text-white uppercase brutal-shadow-sm"
                      )}>
                        <Unlock className="w-3 h-3" /> Exclusivo
                      </div>
                    )}
                  </div>

                  <h2 className={cn("text-2xl font-bold mb-4", "text-black uppercase font-brutal")}>{post.title}</h2>
                  <p className={cn("leading-relaxed mb-6", "text-black/80 font-medium")}>{post.content}</p>

                  {post.imageUrl && (
                    <div className={cn(
                      "w-full h-64 overflow-hidden mb-6 relative",
                      "border-4 border-black brutal-shadow-sm"
                    )}>
                      <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover" />
                    </div>
                  )}

                  {post.type === 'ai-prompt' && post.aiPrompt && (
                    <div className="mb-6">
                      <button 
                        onClick={() => togglePrompt(post.id)}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2 font-bold uppercase text-sm transition-transform",
                          "bg-yellow-300 border-4 border-black text-black brutal-shadow-sm hover:-translate-y-1 hover:shadow-none"
                        )}
                      >
                        {revealedPrompts.has(post.id) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        {revealedPrompts.has(post.id) ? 'Ocultar Prompt' : 'Revelar Prompt'}
                      </button>
                      
                      {revealedPrompts.has(post.id) && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className={cn(
                            "mt-4 p-4 font-mono text-sm break-all",
                            "bg-black text-[#00FF00] border-4 border-black"
                          )}
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
                        className={cn(
                          "inline-flex items-center gap-2 px-6 py-3 font-bold uppercase transition-transform",
                          "bg-[#00FF00] border-4 border-black text-black brutal-shadow-sm hover:-translate-y-1 hover:shadow-none"
                        )}
                      >
                        <Download className="w-5 h-5" />
                        Descargar Recurso
                      </a>
                    </div>
                  )}

                  <div className={cn(
                    "flex items-center gap-6 pt-4",
                    "border-t-4 border-black"
                  )}>
                    <button 
                      onClick={() => handleLike(post.id)}
                      className={cn(
                        "flex items-center gap-2 transition-colors",
                        "text-black hover:text-[#FF00FF]"
                      )}
                    >
                      <Heart className="w-5 h-5" />
                      <span className="font-medium">{post.likes}</span>
                    </button>
                    <button 
                      onClick={() => setActiveCommentPost(activeCommentPost === post.id ? null : post.id)}
                      className={cn(
                      "flex items-center gap-2 transition-colors",
                      "text-black hover:text-[#00FF00]"
                    )}>
                      <MessageCircle className="w-5 h-5" />
                      <span className="font-medium">{post.comments?.length || 0} Comentarios</span>
                    </button>
                    <button className={cn(
                      "flex items-center gap-2 transition-colors ml-auto",
                      "text-black hover:text-blue-500"
                    )}>
                      <Share2 className="w-5 h-5" />
                    </button>
                  </div>

                  {activeCommentPost === post.id && (
                    <div className="mt-4 pt-4 border-t-4 border-black/10">
                      <div className="space-y-4 mb-4 max-h-60 overflow-y-auto pr-2">
                        {post.comments?.map(comment => (
                          <div key={comment.id} className="bg-zinc-100 p-3 border-2 border-black/20">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-bold text-sm uppercase">{comment.author}</span>
                              <span className="text-xs text-black/60 font-bold">{new Date(comment.createdAt).toLocaleDateString()}</span>
                            </div>
                            <p className="text-sm font-medium">{comment.text}</p>
                          </div>
                        ))}
                        {(!post.comments || post.comments.length === 0) && (
                          <p className="text-sm text-black/60 font-bold italic">Sé el primero en comentar.</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          placeholder="Escribe un comentario..."
                          className="flex-1 px-3 py-2 border-4 border-black bg-white font-medium focus:outline-none focus:bg-yellow-100"
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
                          className="px-4 py-2 bg-[#00FF00] border-4 border-black font-bold uppercase brutal-shadow-sm hover:translate-y-1 hover:shadow-none"
                        >
                          Enviar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {activeTab === 'polls' && (
        <div className="grid gap-6">
          {polls.map((poll) => {
            const hasVoted = poll.votedUsers.includes(userProfile.name);
            const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes, 0);

            return (
              <motion.div
                key={poll.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "p-6",
                  "bg-white border-4 border-black brutal-shadow"
                )}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className={cn("text-xl font-bold", "text-black uppercase font-brutal")}>{poll.question}</h2>
                  {!poll.active && (
                    <span className={cn(
                      "px-3 py-1 text-xs font-bold",
                      "bg-black text-white uppercase"
                    )}>Cerrada</span>
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
                          "w-full relative overflow-hidden p-4 text-left transition-all",
                          hasVoted ? "border-4 border-black bg-zinc-200 cursor-default" : "border-4 border-black bg-white hover:bg-yellow-300 hover:translate-y-1 brutal-shadow-sm hover:shadow-none cursor-pointer"
                        )}
                      >
                        {hasVoted && (
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className={cn(
                              "absolute inset-0 z-0",
                              "bg-[#00FF00] border-r-4 border-black"
                            )}
                          />
                        )}
                        <div className="relative z-10 flex justify-between items-center">
                          <span className={cn(
                            "font-medium",
                            "text-black font-bold uppercase"
                          )}>
                            {option.text}
                          </span>
                          {hasVoted && (
                            <span className={cn(
                              "font-bold",
                              "text-black"
                            )}>{percentage}%</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
                
                <div className={cn(
                  "mt-6 text-sm flex justify-between",
                  "text-black font-bold uppercase"
                )}>
                  <span>{totalVotes} votos totales</span>
                  {hasVoted && <span className="text-emerald-400">¡Ya votaste!</span>}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
