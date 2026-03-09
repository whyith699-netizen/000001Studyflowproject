# 🤖 StudyFlow Chatbot - Developer Documentation

Dokumentasi teknis untuk developer yang ingin memahami, maintain, atau mengembangkan fitur chatbot lebih lanjut.

---

## 📋 Arsitektur

### Tech Stack

| Layer | Teknologi |
|-------|-----------|
| **Frontend** | React 19 + Vite |
| **UI** | Tailwind CSS + Lucide Icons |
| **AI Model** | Google Gemini 3.0 Flash |
| **Database** | Firebase Firestore |
| **Auth** | Firebase Authentication |
| **API Client** | Custom fetch-based client |

### Arsitektur Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    User Interface                            │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  ChatbotWidget (Floating Button)                        ││
│  │  └── ChatWindow                                         ││
│  │       ├── ApiKeySetup                                   ││
│  │       ├── QuickReplies                                  ││
│  │       ├── MessageBubble (user/assistant)                ││
│  │       ├── ChatInput                                     ││
│  │       └── TypingIndicator                               ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Service Layer                             │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │ chatbot-service │  │ gemini-client   │                  │
│  │                 │  │                 │                  │
│  │ - sendMessage   │  │ - initialize    │                  │
│  │ - getMessages   │  │ - sendMessage   │                  │
│  │ - subscribe     │  │ - listModels    │                  │
│  │ - feedback      │  │                 │                  │
│  └─────────────────┘  └─────────────────┘                  │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │chatbot-context  │  │ encryption      │                  │
│  │                 │  │                 │                  │
│  │ - buildContext  │  │ - saveApiKey    │                  │
│  │ - detectIntent  │  │ - getApiKey     │                  │
│  │ - formatPrompt  │  │ - validate      │                  │
│  └─────────────────┘  └─────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    External Services                         │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │ Firebase        │  │ Google Gemini   │                  │
│  │ Firestore       │  │ API             │                  │
│  │                 │  │                 │                  │
│  │ - chatSessions  │  │ - generateContent│                 │
│  │ - chatMessages  │  │ - models        │                  │
│  └─────────────────┘  └─────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Struktur File

```
Applications/src/
├── components/
│   └── chatbot/
│       ├── index.js              # Export semua komponen
│       ├── ChatbotWidget.jsx     # Floating button wrapper
│       ├── ChatWindow.jsx        # Main chat interface
│       ├── ApiKeySetup.jsx       # API Key setup modal
│       ├── MessageBubble.jsx     # Individual message display
│       ├── ChatInput.jsx         # Input field + send button
│       ├── QuickReplies.jsx      # Suggestion buttons
│       └── TypingIndicator.jsx   # Loading animation
│
├── services/
│   ├── chatbot-service.js        # Main service (Firestore + logic)
│   ├── chatbot-context.js        # Context builder + intent detection
│   └── gemini-client.js          # Gemini API client
│
├── config/
│   ├── chatbot-config.js         # Configuration constants
│   └── firestore-chatbot-schema.js # Schema documentation
│
└── utils/
    └── encryption.js             # API Key encryption utility
```

---

## 🔧 Komponen

### ChatbotWidget

Floating action button yang muncul di pojok kanan bawah.

**Props:** None (standalone component)

**Features:**
- Auto-hide saat chat window terbuka
- Tooltip on hover
- Pulse animation
- Responsive positioning

### ChatWindow

Main chat interface dengan full functionality.

**Props:**
- `onClose`: Callback saat window ditutup
- `initialOpen`: Boolean (default: true)

**Features:**
- Real-time message sync dengan Firestore
- Quick replies
- API Key setup modal
- New chat & clear history
- Feedback mechanism

### ApiKeySetup

Modal untuk setup Gemini API Key.

**Props:**
- `onClose`: Callback
- `onApiKeySaved`: Callback setelah save berhasil

**Features:**
- Step-by-step panduan
- Input dengan show/hide toggle
- Validation
- Success/error states

### MessageBubble

Individual message component.

**Props:**
- `message`: { id, role, content, timestamp, ... }
- `onFeedback`: Callback untuk feedback
- `showFeedback`: Boolean

**Features:**
- User/assistant/system styling
- Timestamp formatting
- Error indicator
- Feedback buttons
- Typing indicator support

### ChatInput

Input field dengan send button.

**Props:**
- `onSend`: Callback dengan message content
- `disabled`: Boolean
- `placeholder`: String

**Features:**
- Auto-resize textarea
- Enter to send (Shift+Enter untuk newline)
- Disabled state

### QuickReplies

Suggestion buttons.

**Props:**
- `onSelect`: Callback dengan selected value
- `disabled`: Boolean

**Features:**
- Configurable suggestions
- Hover effects
- Responsive layout

---

## 🔐 Security

### API Key Storage

```javascript
// encryption.js
- XOR cipher + base64 encoding (obfuscation)
- Stored in localStorage
- Never sent to backend server
- Validated format before save
```

**Catatan:** Ini bukan cryptographic security, tapi cukup untuk mencegah casual inspection.

### Firestore Rules

```javascript
// firestore.rules
match /users/{userId}/chatSessions/{sessionId} {
  allow read, write: if request.auth.uid == userId;
  
  match /messages/{messageId} {
    allow read, write: if request.auth.uid == userId;
  }
}
```

### Rate Limiting

Client-side rate limiting di `chatbot-config.js`:
- Max 60 requests/minute
- Max 1024 tokens output

---

## 🧪 Testing

### Manual Testing Checklist

- [ ] First-time user sees API Key setup modal
- [ ] API Key validation works (invalid format rejected)
- [ ] Chat window opens/closes smoothly
- [ ] Messages send and receive correctly
- [ ] Real-time sync works (multiple tabs)
- [ ] Quick replies trigger correct queries
- [ ] Feedback buttons work
- [ ] New chat creates new session
- [ ] Clear history deletes all sessions
- [ ] Dark mode works
- [ ] Mobile responsive

### Test Scenarios

```javascript
// 1. Send message
await chatbotService.sendMessage("Halo", sessionId);

// 2. Get messages
const messages = await chatbotService.getMessages(sessionId);

// 3. Subscribe to messages
const unsubscribe = chatbotService.subscribeToMessages(
  sessionId,
  (msgs) => console.log(msgs)
);

// 4. Provide feedback
await chatbotService.provideFeedback(messageId, sessionId, true);

// 5. Clear all chats
await chatbotService.clearAllChats();
```

---

## 🐛 Troubleshooting

### Common Issues

#### 1. "API key not configured"

**Cause:** API key not saved or invalid

**Solution:**
```javascript
// Check if API key exists
import { isApiKeyConfigured } from '../utils/encryption';
const configured = isApiKeyConfigured(); // boolean
```

#### 2. "Invalid API key format"

**Cause:** API key doesn't match Gemini format

**Solution:**
- Must start with `AIza`
- Must be 39 characters
- Use regex validation: `/^AIza[A-Za-z0-9_-]{35,}$/`

#### 3. "Rate limit exceeded"

**Cause:** Too many requests in short time

**Solution:**
- Wait 1 minute
- Implement client-side throttling
- Check `CHATBOT_CONFIG.rateLimit`

#### 4. Messages not appearing

**Cause:** Firestore sync issue

**Solution:**
```javascript
// Check subscription
useEffect(() => {
  const unsubscribe = chatbotService.subscribeToMessages(
    sessionId,
    (msgs) => setMessages(msgs)
  );
  return () => unsubscribe();
}, [sessionId]);
```

#### 5. Build error: Module not found

**Cause:** Import path incorrect

**Solution:**
```javascript
// Correct import paths
import ChatbotWidget from './components/chatbot/ChatbotWidget';
import { chatbotService } from './services/chatbot-service';
```

---

## 🚀 Future Enhancements

### Planned Features

1. **Voice Input** - Web Speech API integration
2. **Multi-language Auto-detect** - EN/ID switching
3. **Chat Analytics** - Dashboard untuk usage stats
4. **Proactive Notifications** - "Waktunya belajar!"
5. **Export Chat History** - Download as PDF/txt
6. **Custom Instructions** - User-defined bot personality
7. **Group Study Chat** - Multi-user chat rooms

### Technical Improvements

1. **Better Encryption** - Use Web Crypto API
2. **Message Streaming** - Stream Gemini response
3. **Offline Support** - Queue messages when offline
4. **Image Input** - Send images to Gemini Vision
5. **Context Optimization** - Smarter context window management

---

## 📊 Performance Metrics

### Target Metrics

| Metric | Target | Current |
|--------|--------|---------|
| First Message Response | < 3s | ~2s |
| Subsequent Messages | < 2s | ~1.5s |
| Bundle Size Impact | < 100KB | ~45KB |
| Lighthouse Score | > 90 | TBD |

### Optimization Tips

1. **Lazy Load Chatbot**
```javascript
const ChatbotWidget = lazy(() => 
  import('./components/chatbot/ChatbotWidget')
);
```

2. **Debounce Quick Replies**
```javascript
const handleQuickReply = useMemo(() => 
  debounce((value) => handleSend(value), 300)
, []);
```

3. **Virtual Scroll for Long Chats**
```javascript
// Use react-window for 100+ messages
import { FixedSizeList } from 'react-window';
```

---

## 📚 References

- [Gemini API Documentation](https://ai.google.dev/docs)
- [Firebase Firestore](https://firebase.google.com/docs/firestore)
- [React Best Practices](https://react.dev/learn)
- [Tailwind CSS](https://tailwindcss.com/docs)

---

## 👥 Contributing

### Code Style

- Use functional components with hooks
- Destructure props
- Use JSDoc comments
- Follow existing naming conventions

### Commit Messages

```
feat(chatbot): add voice input support
fix(chatbot): fix API key validation regex
docs(chatbot): update setup guide
refactor(chatbot): extract context builder to separate file
```

### Pull Request Checklist

- [ ] Tests pass
- [ ] No console errors
- [ ] Dark mode tested
- [ ] Mobile responsive tested
- [ ] Documentation updated

---

**Last Updated:** 7 Maret 2026  
**Version:** 1.0.0
