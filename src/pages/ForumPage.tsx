import { useState, useEffect, useRef } from 'react';
import { Send, Heart, ChevronDown, Trash2, MessageCircle, ChevronUp, Smile } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { ForumPost, Game } from '@/types';
import BottomNav from '@/components/layout/BottomNav';
import { toast } from 'sonner';

interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  user_name: string;
  content: string;
  created_at: string;
}

const EMOJIS = ['😀','😂','🔥','❤️','👍','🎯','💰','🤑','🙏','😍','🥳','😎','👏','💪','⭐','🎉','🤞','✅','😮','😅','🤔','😤','🏆','💯'];

const REACTIONS = ['❤️','🔥','😂','👍','🎯','🤑'];

const timeAgo = (d: string) => {
  const diff = Date.now() - new Date(d).getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
};

const avatarColors = ['#FF6B1A','#FF1D78','#8B5CF6','#06B6D4','#22C55E','#F59E0B','#EF4444','#3B82F6'];
const getColor = (name: string) => avatarColors[(name?.charCodeAt(0) || 0) % avatarColors.length];

const ForumPage = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [openComments, setOpenComments] = useState<Set<string>>(new Set());
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [commentLoading, setCommentLoading] = useState<Record<string, boolean>>({});
  const [content, setContent] = useState('');
  const [selectedGame, setSelectedGame] = useState('');
  const [loading, setLoading] = useState(false);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [showEmoji, setShowEmoji] = useState(false);
  const [showCommentEmoji, setShowCommentEmoji] = useState<string | null>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchPosts = async () => {
    const { data } = await supabase.from('forum_posts').select('*').order('created_at', { ascending: false }).limit(80);
    if (data) setPosts(data);
  };

  const fetchComments = async (postId: string) => {
    const { data } = await supabase.from('forum_comments').select('*').eq('post_id', postId).order('created_at', { ascending: true });
    if (data) setComments(prev => ({ ...prev, [postId]: data }));
  };

  useEffect(() => {
    fetchPosts();
    supabase.from('games').select('id,name').eq('is_active', true).then(({ data }) => { if (data) setGames(data as Game[]); });
    const stored = localStorage.getItem('kb_liked_posts');
    if (stored) setLikedIds(new Set(JSON.parse(stored)));
    const t = setInterval(fetchPosts, 15000);
    return () => clearInterval(t);
  }, []);

  // Close emoji pickers on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setShowEmoji(false);
        setShowCommentEmoji(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggleComments = (postId: string) => {
    const next = new Set(openComments);
    if (next.has(postId)) { next.delete(postId); } else {
      next.add(postId);
      if (!comments[postId]) fetchComments(postId);
    }
    setOpenComments(next);
  };

  const handlePost = async () => {
    if (!content.trim()) return toast.error('Write something to post');
    if (!user) return;
    setLoading(true);
    const game = games.find(g => g.id === selectedGame);
    const { error } = await supabase.from('forum_posts').insert({
      user_id: user.id, user_name: user.name, content: content.trim(),
      game_id: selectedGame || null, game_name: game?.name || null, likes: 0,
    });
    setLoading(false);
    if (error) return toast.error('Failed to post');
    setContent('');
    setShowEmoji(false);
    fetchPosts();
    toast.success('Posted! 🎉');
  };

  const handleComment = async (postId: string) => {
    const text = (commentInputs[postId] || '').trim();
    if (!text) return;
    if (!user) return;
    setCommentLoading(prev => ({ ...prev, [postId]: true }));
    const { error } = await supabase.from('forum_comments').insert({
      post_id: postId, user_id: user.id, user_name: user.name, content: text,
    });
    setCommentLoading(prev => ({ ...prev, [postId]: false }));
    if (error) return toast.error('Failed to comment');
    setCommentInputs(prev => ({ ...prev, [postId]: '' }));
    setShowCommentEmoji(null);
    fetchComments(postId);
    // Update comment count in UI
    setPosts(prev => prev.map(p => p.id === postId ? { ...p } : p));
  };

  const handleDeleteComment = async (commentId: string, postId: string) => {
    await supabase.from('forum_comments').delete().eq('id', commentId);
    fetchComments(postId);
  };

  const handleLike = async (post: ForumPost) => {
    if (!user) return;
    const alreadyLiked = likedIds.has(post.id);
    const newLikes = alreadyLiked ? Math.max(0, post.likes - 1) : post.likes + 1;
    await supabase.from('forum_posts').update({ likes: newLikes }).eq('id', post.id);
    const newLikedIds = new Set(likedIds);
    if (alreadyLiked) { newLikedIds.delete(post.id); } else { newLikedIds.add(post.id); }
    setLikedIds(newLikedIds);
    localStorage.setItem('kb_liked_posts', JSON.stringify(Array.from(newLikedIds)));
    fetchPosts();
  };

  const handleDelete = async (post: ForumPost) => {
    if (!user || post.user_id !== user.id) return;
    const { error } = await supabase.from('forum_posts').delete().eq('id', post.id);
    if (error) return toast.error('Failed to delete');
    toast.success('Post deleted');
    fetchPosts();
  };

  const insertEmoji = (emoji: string, postId?: string) => {
    if (postId) {
      setCommentInputs(prev => ({ ...prev, [postId]: (prev[postId] || '') + emoji }));
    } else {
      setContent(prev => prev + emoji);
      textareaRef.current?.focus();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30" style={{ background: 'linear-gradient(135deg, #FF6B1A 0%, #FF1D78 100%)' }}>
        <div className="px-4 py-3">
          <p className="text-white font-black text-xl">💬 Guessing Forum</p>
          <p className="text-white/70 text-xs">Share your matka predictions & chat with players</p>
        </div>
      </div>

      {/* Post Box */}
      <div className="bg-white shadow-sm border-b border-gray-100 p-4">
        <div className="relative mb-2">
          <select value={selectedGame} onChange={e => setSelectedGame(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-600 bg-gray-50 appearance-none outline-none focus:border-orange-400 pr-8">
            <option value="">🎯 Select Game (Optional)</option>
            {games.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <ChevronDown size={16} className="absolute right-3 top-3 text-gray-400 pointer-events-none" />
        </div>
        <div className="flex gap-2">
          <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-bold text-white text-sm shadow-sm" style={{ background: getColor(user?.name || '') }}>
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Share your guessing / prediction... 🎯"
                rows={2}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50 outline-none resize-none focus:border-orange-400 pr-10"
              />
              <button
                onClick={() => { setShowEmoji(v => !v); setShowCommentEmoji(null); }}
                className="absolute right-2 bottom-2 text-gray-400 hover:text-orange-500 transition-colors"
              >
                <Smile size={18} />
              </button>
            </div>
            {/* Emoji Picker for Post */}
            {showEmoji && (
              <div ref={emojiRef} className="mt-1 p-2 bg-white border border-gray-200 rounded-2xl shadow-lg grid grid-cols-8 gap-1 z-10">
                {EMOJIS.map(em => (
                  <button key={em} onClick={() => insertEmoji(em)}
                    className="text-xl hover:scale-125 transition-transform active:scale-110 p-0.5 rounded-lg hover:bg-orange-50">
                    {em}
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2 mt-2">
              {/* Quick reaction emojis */}
              <div className="flex gap-1 flex-1">
                {REACTIONS.map(em => (
                  <button key={em} onClick={() => insertEmoji(em)}
                    className="text-lg hover:scale-125 transition-transform active:scale-95 p-0.5">
                    {em}
                  </button>
                ))}
              </div>
              <button onClick={handlePost} disabled={loading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-bold shrink-0 active:scale-95 transition-transform disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #FF6B1A, #FF1D78)' }}>
                <Send size={15} />
                Post
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Posts */}
      <div className="px-4 pt-3 space-y-3">
        {posts.map(post => {
          const isOwn = user && post.user_id === user.id;
          const isLiked = likedIds.has(post.id);
          const postComments = comments[post.id] || [];
          const isCommentsOpen = openComments.has(post.id);

          return (
            <div key={post.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Post Body */}
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-bold text-white text-sm shadow-sm" style={{ background: getColor(post.user_name) }}>
                    {post.user_name?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-bold text-gray-800 text-sm">{post.user_name}</span>
                      {post.game_name && (
                        <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-medium">{post.game_name}</span>
                      )}
                      <span className="text-xs text-gray-400 ml-auto">{timeAgo(post.created_at)}</span>
                      {isOwn && (
                        <button onClick={() => handleDelete(post)} className="text-gray-300 hover:text-red-400 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                    <p className="text-gray-700 text-sm leading-relaxed break-words">{post.content}</p>
                    {/* Actions */}
                    <div className="flex items-center gap-4 mt-3">
                      <button
                        onClick={() => handleLike(post)}
                        className={`flex items-center gap-1.5 text-xs font-semibold transition-all active:scale-90 ${isLiked ? 'text-red-500' : 'text-gray-400 hover:text-red-400'}`}
                      >
                        <Heart size={15} fill={isLiked ? 'currentColor' : 'none'} className={isLiked ? 'animate-ping-once' : ''} />
                        <span>{post.likes > 0 ? post.likes : 'Like'}</span>
                      </button>
                      <button
                        onClick={() => toggleComments(post.id)}
                        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-blue-500 transition-colors font-semibold"
                      >
                        <MessageCircle size={15} />
                        <span>
                          {postComments.length > 0 ? `${postComments.length} Comment${postComments.length > 1 ? 's' : ''}` : 'Comment'}
                        </span>
                        {isCommentsOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Comments Section */}
              {isCommentsOpen && (
                <div className="border-t border-gray-50 bg-gray-50/80">
                  {/* Comments List */}
                  {postComments.length > 0 && (
                    <div className="px-4 py-3 space-y-3">
                      {postComments.map(comment => {
                        const isOwnComment = user && comment.user_id === user.id;
                        return (
                          <div key={comment.id} className="flex gap-2.5 items-start">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-bold text-white text-xs shadow-sm" style={{ background: getColor(comment.user_name) }}>
                              {comment.user_name?.[0]?.toUpperCase()}
                            </div>
                            <div className="flex-1 bg-white rounded-xl px-3 py-2 shadow-sm border border-gray-100">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-xs font-bold text-gray-700">{comment.user_name}</span>
                                <span className="text-[10px] text-gray-400 ml-auto">{timeAgo(comment.created_at)}</span>
                                {isOwnComment && (
                                  <button onClick={() => handleDeleteComment(comment.id, post.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                                    <Trash2 size={11} />
                                  </button>
                                )}
                              </div>
                              <p className="text-xs text-gray-700 leading-relaxed break-words">{comment.content}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {postComments.length === 0 && (
                    <p className="text-center text-xs text-gray-400 py-3">No comments yet. Be the first! 💬</p>
                  )}

                  {/* Comment Input */}
                  <div className="px-4 pb-3">
                    <div className="flex gap-2 items-end">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-bold text-white text-xs" style={{ background: getColor(user?.name || '') }}>
                        {user?.name?.[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="relative">
                          <input
                            type="text"
                            value={commentInputs[post.id] || ''}
                            onChange={e => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                            onKeyDown={e => { if (e.key === 'Enter') handleComment(post.id); }}
                            placeholder="Add a comment..."
                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white outline-none focus:border-orange-400 pr-8"
                          />
                          <button
                            onClick={() => { setShowCommentEmoji(v => v === post.id ? null : post.id); setShowEmoji(false); }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-500 transition-colors"
                          >
                            <Smile size={14} />
                          </button>
                        </div>
                        {/* Emoji picker for comment */}
                        {showCommentEmoji === post.id && (
                          <div className="mt-1 p-2 bg-white border border-gray-200 rounded-2xl shadow-lg grid grid-cols-8 gap-0.5 z-10">
                            {EMOJIS.map(em => (
                              <button key={em} onClick={() => insertEmoji(em, post.id)}
                                className="text-lg hover:scale-125 transition-transform active:scale-110 p-0.5 rounded-lg hover:bg-orange-50">
                                {em}
                              </button>
                            ))}
                          </div>
                        )}
                        {/* Quick emojis for comment */}
                        <div className="flex gap-1 mt-1.5">
                          {REACTIONS.map(em => (
                            <button key={em} onClick={() => insertEmoji(em, post.id)}
                              className="text-base hover:scale-125 transition-transform active:scale-95">
                              {em}
                            </button>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={() => handleComment(post.id)}
                        disabled={commentLoading[post.id] || !(commentInputs[post.id] || '').trim()}
                        className="p-2 rounded-xl text-white shrink-0 active:scale-95 transition-transform disabled:opacity-40 mb-7"
                        style={{ background: 'linear-gradient(135deg, #FF6B1A, #FF1D78)' }}
                      >
                        <Send size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {posts.length === 0 && (
          <div className="text-center py-16">
            <p className="text-5xl mb-3">💬</p>
            <p className="text-gray-600 font-bold text-base">No posts yet</p>
            <p className="text-gray-400 text-sm mt-1">Be the first to share your prediction!</p>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default ForumPage;
