import React, { useState } from 'react';
import { motion } from 'motion/react';
import { BookOpen, Tag, MessageSquare, ChevronRight } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export default function Blog() {
  const { blogPosts, addBlogComment } = useAppContext();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [commentText, setCommentText] = useState<{ [key: string]: string }>({});

  const categories = Array.from(new Set(blogPosts.map(post => post.category)));

  const filteredPosts = selectedCategory 
    ? blogPosts.filter(post => post.category === selectedCategory)
    : blogPosts;

  const handleCommentSubmit = (postId: string) => {
    if (commentText[postId]?.trim()) {
      addBlogComment(postId, commentText[postId]);
      setCommentText(prev => ({ ...prev, [postId]: '' }));
    }
  };

  return (
    <div className="theme-page theme-adapt max-w-4xl mx-auto space-y-12 pb-32 sm:pb-16 px-4 sm:px-0 font-sans">
      <div className="space-y-4">
        <h1 className="text-4xl sm:text-6xl font-bold font-brutal uppercase text-black flex items-center gap-4">
          <BookOpen className="w-10 h-10 sm:w-14 sm:h-14 text-[#00FF00]" />
          Blog
        </h1>
        <p className="text-xl text-black/80 font-bold max-w-2xl">
          Reflexiones, tutoriales y procesos creativos.
        </p>
      </div>

      {/* Categories */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setSelectedCategory(null)}
          className={cn(
            "px-4 py-2 font-bold uppercase border-4 border-black transition-all",
            selectedCategory === null ? "bg-black text-white brutal-shadow-sm" : "bg-white text-black hover:bg-zinc-100"
          )}
        >
          Todos
        </button>
        {categories.map(category => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={cn(
              "px-4 py-2 font-bold uppercase border-4 border-black transition-all",
              selectedCategory === category ? "bg-[#00FF00] text-black brutal-shadow-sm" : "bg-white text-black hover:bg-zinc-100"
            )}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Posts */}
      <div className="space-y-8">
        {filteredPosts.map((post, index) => (
          <motion.article
            key={post.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white border-4 border-black brutal-shadow overflow-hidden"
          >
            {post.imageUrl && (
              <div className="w-full h-64 sm:h-80 border-b-4 border-black">
                <img 
                  src={post.imageUrl} 
                  alt={post.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}
            
            <div className="p-6 sm:p-8 space-y-6">
              <div className="flex flex-wrap items-center gap-4 text-sm font-bold uppercase">
                <span className="bg-[#FFFF00] px-3 py-1 border-2 border-black">{post.category}</span>
                <span className="text-black/60">
                  {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: es })}
                </span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-bold font-brutal uppercase">{post.title}</h2>
              
              <div className="flex flex-wrap gap-2">
                {post.tags.map(tag => (
                  <span key={tag} className="flex items-center gap-1 text-sm font-medium bg-zinc-100 px-2 py-1 border border-black">
                    <Tag className="w-3 h-3" />
                    {tag}
                  </span>
                ))}
              </div>

              <div className={cn(
                "prose prose-lg max-w-none font-medium text-black/80",
                expandedPost !== post.id && "line-clamp-3"
              )}>
                {post.content.split('\n').map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
              </div>

              {expandedPost !== post.id ? (
                <button
                  onClick={() => setExpandedPost(post.id)}
                  className="flex items-center gap-2 font-bold uppercase text-[#FF00FF] hover:text-black transition-colors"
                >
                  Leer más <ChevronRight className="w-5 h-5" />
                </button>
              ) : (
                <div className="pt-8 border-t-4 border-black space-y-6">
                  <h3 className="text-2xl font-bold uppercase font-brutal flex items-center gap-3">
                    <MessageSquare className="w-6 h-6" />
                    Comentarios ({post.comments.length})
                  </h3>
                  
                  <div className="space-y-4">
                    {post.comments.map(comment => (
                      <div key={comment.id} className="bg-zinc-50 border-2 border-black p-4 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-bold uppercase">{comment.author}</span>
                          <span className="text-xs font-medium text-black/60">
                            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: es })}
                          </span>
                        </div>
                        <p className="font-medium">{comment.text}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Dejá un comentario..."
                      value={commentText[post.id] || ''}
                      onChange={(e) => setCommentText(prev => ({ ...prev, [post.id]: e.target.value }))}
                      className="flex-1 p-3 font-bold border-4 border-black outline-none focus:bg-yellow-100 transition-colors"
                    />
                    <button
                      onClick={() => handleCommentSubmit(post.id)}
                      disabled={!commentText[post.id]?.trim()}
                      className="px-6 bg-black text-white font-bold uppercase border-4 border-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-800 transition-colors"
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
    </div>
  );
}
