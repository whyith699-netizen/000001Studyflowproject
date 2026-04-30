import React, { useState, useEffect } from 'react';
import { friendService, inboxService } from '../services/firestore-service';

const SocialSection = ({ isDarkMode }) => {
  const [friends, setFriends] = useState([]);
  const [messages, setMessages] = useState([]);
  const [friendEmail, setFriendEmail] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [activeTab, setActiveTab] = useState('friends'); // 'friends' or 'inbox'
  const [replyTo, setReplyTo] = useState(null);
  const [replyContent, setReplyContent] = useState('');

  useEffect(() => {
    friendService.getFriends().then(setFriends);
    const unsub = inboxService.subscribeToInbox(setMessages);
    return () => unsub();
  }, []);

  const handleAddFriend = async (e) => {
    e.preventDefault();
    if (!friendEmail) return;
    setIsAdding(true);
    try {
      await friendService.addFriendByEmail(friendEmail);
      setFriendEmail('');
      const updated = await friendService.getFriends();
      setFriends(updated);
      alert("Friend added!");
    } catch (err) {
      alert(err.message);
    } finally {
      setIsAdding(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!replyTo || !replyContent) return;
    try {
      await inboxService.sendMessage(replyTo.fromUid, replyContent);
      setReplyContent('');
      setReplyTo(null);
      alert("Message sent!");
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className={`flex gap-1 p-1 rounded-xl mb-4 ${isDarkMode ? 'bg-slate-800' : 'bg-gray-100'}`}>
        <button 
          onClick={() => setActiveTab('friends')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'friends' ? (isDarkMode ? 'bg-slate-700 text-white shadow-sm' : 'bg-white text-blue-600 shadow-sm') : 'text-gray-500'}`}
        >
          Friends ({friends.length})
        </button>
        <button 
          onClick={() => setActiveTab('inbox')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'inbox' ? (isDarkMode ? 'bg-slate-700 text-white shadow-sm' : 'bg-white text-blue-600 shadow-sm') : 'text-gray-500'}`}
        >
          Inbox ({messages.filter(m => !m.isRead).length})
        </button>
      </div>

      {activeTab === 'friends' ? (
        <div className="flex flex-col gap-4">
          <form onSubmit={handleAddFriend} className="flex gap-2">
            <input 
              type="email"
              placeholder="Friend's email..."
              value={friendEmail}
              onChange={(e) => setFriendEmail(e.target.value)}
              className={`flex-1 px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-200'}`}
            />
            <button 
              disabled={isAdding}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50"
            >
              Add
            </button>
          </form>

          <div className="flex flex-col gap-2 overflow-y-auto max-h-[300px]">
            {friends.length === 0 ? (
              <p className="text-center py-8 text-xs text-gray-400">No friends yet. Add someone!</p>
            ) : friends.map(f => (
              <div key={f.id} className={`flex items-center justify-between p-3 rounded-xl border ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-gray-50 border-gray-100'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                    {f.displayName.charAt(0)}
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{f.displayName}</p>
                    <p className="text-[10px] text-orange-500 font-medium"><i className="fas fa-fire mr-1"></i>{f.streak || 0} Day Streak</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3 overflow-y-auto max-h-[400px]">
          {messages.length === 0 ? (
            <p className="text-center py-12 text-xs text-gray-400">Your inbox is empty.</p>
          ) : messages.map(m => (
            <div key={m.id} className={`p-3 rounded-xl border flex flex-col gap-2 ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-gray-50 border-gray-100'}`}>
              <div className="flex justify-between items-start">
                <span className={`text-xs font-bold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>From: {m.fromName}</span>
                <span className="text-[10px] text-gray-500">{new Date(m.timestamp).toLocaleDateString()}</span>
              </div>
              <p className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>{m.content}</p>
              <button 
                onClick={() => setReplyTo(m)}
                className="text-left text-[10px] font-bold text-blue-500 hover:underline"
              >
                Reply
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Reply Modal Sederhana */}
      {replyTo && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className={`w-full max-w-sm p-6 rounded-2xl border shadow-2xl ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-100'}`}>
            <h3 className="text-lg font-bold mb-4">Reply to {replyTo.fromName}</h3>
            <form onSubmit={handleSendMessage}>
              <textarea 
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                className={`w-full p-3 text-sm rounded-xl border mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 h-32 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-200'}`}
                placeholder="Type your message..."
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => setReplyTo(null)} className="flex-1 py-2 text-sm font-bold text-gray-500">Cancel</button>
                <button className="flex-1 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl">Send</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SocialSection;
