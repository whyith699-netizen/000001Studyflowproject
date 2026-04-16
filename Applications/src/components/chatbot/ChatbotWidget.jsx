import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../../firebase-config';
import ChatWindow from './ChatWindow';
import { CHATBOT_CONFIG } from '../../config/chatbot-config';

const CHATBOT_RESIZE_KEY = 'studyflow_chatbot_manual_resize';
const CHATBOT_FAB_POSITION_KEY = 'studyflow_chatbot_fab_position';
const CHATBOT_OPEN_EVENT = 'studyflow:chatbot:open';
const CHATBOT_CLOSE_EVENT = 'studyflow:chatbot:close';
const CHATBOT_TOGGLE_EVENT = 'studyflow:chatbot:toggle';

const DESKTOP_MARGIN = 24;
const TOP_MARGIN = 18;
const FAB_SIZE = 56;
const FAB_MARGIN = 24;
const MIN_WIDTH = 420;
const MIN_HEIGHT = 560;
const EXPANDED_WIDTH_RATIO = 0.44;
const EXPANDED_HEIGHT_RATIO = 0.86;
const EXPANDED_MAX_WIDTH = 1020;
const EXPANDED_MAX_HEIGHT = 940;

const getViewport = () => {
  if (typeof window === 'undefined') {
    return { width: 1440, height: 900 };
  }
  return { width: window.innerWidth, height: window.innerHeight };
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const clampDesktopSize = (width, height, viewport) => {
  const maxWidth = Math.max(MIN_WIDTH, viewport.width - DESKTOP_MARGIN * 2);
  const maxHeight = Math.max(MIN_HEIGHT, viewport.height - (DESKTOP_MARGIN + TOP_MARGIN));

  return {
    width: Math.round(clamp(width, MIN_WIDTH, maxWidth)),
    height: Math.round(clamp(height, MIN_HEIGHT, maxHeight)),
  };
};

/**
 * Chatbot Widget Component
 * Floating action button + chat container
 */
function ChatbotWidget() {
  const [user] = useAuthState(auth);
  const [isOpen, setIsOpen] = useState(CHATBOT_CONFIG.ui.defaultOpen ?? false);
  const [isHovered, setIsHovered] = useState(false);
  const [viewport, setViewport] = useState(getViewport);
  const resizeStartRef = useRef(null);
  const [isResizing, setIsResizing] = useState(false);

  // FAB drag state
  const [fabPosition, setFabPosition] = useState(() => {
    try {
      const saved = localStorage.getItem(CHATBOT_FAB_POSITION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return parsed;
        }
      }
    } catch {
      // ignore error, use default
    }
    return null; // use default position
  });
  const [isDraggingFab, setIsDraggingFab] = useState(false);
  const fabDragStartRef = useRef(null);
  const fabRef = useRef(null);

  const [isExpanded, setIsExpanded] = useState(false);

  const [manualExpandedSize, setManualExpandedSize] = useState(() => {
    try {
      const raw = localStorage.getItem(CHATBOT_RESIZE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed.width !== 'number' || typeof parsed.height !== 'number') return null;
      return clampDesktopSize(parsed.width, parsed.height, getViewport());
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const handleViewportResize = () => {
      setViewport(getViewport());
    };

    window.addEventListener('resize', handleViewportResize);
    return () => window.removeEventListener('resize', handleViewportResize);
  }, []);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    const handleClose = () => setIsOpen(false);
    const handleToggle = () => setIsOpen((prev) => !prev);

    window.addEventListener(CHATBOT_OPEN_EVENT, handleOpen);
    window.addEventListener(CHATBOT_CLOSE_EVENT, handleClose);
    window.addEventListener(CHATBOT_TOGGLE_EVENT, handleToggle);

    return () => {
      window.removeEventListener(CHATBOT_OPEN_EVENT, handleOpen);
      window.removeEventListener(CHATBOT_CLOSE_EVENT, handleClose);
      window.removeEventListener(CHATBOT_TOGGLE_EVENT, handleToggle);
    };
  }, []);

  useEffect(() => {
    try {
      if (!manualExpandedSize) {
        localStorage.removeItem(CHATBOT_RESIZE_KEY);
      } else {
        localStorage.setItem(CHATBOT_RESIZE_KEY, JSON.stringify(manualExpandedSize));
      }
    } catch (error) {
      console.error('Failed to save chatbot manual size:', error);
    }
  }, [manualExpandedSize]);

  // Save FAB position to localStorage
  useEffect(() => {
    try {
      if (fabPosition) {
        localStorage.setItem(CHATBOT_FAB_POSITION_KEY, JSON.stringify(fabPosition));
      } else {
        localStorage.removeItem(CHATBOT_FAB_POSITION_KEY);
      }
    } catch (error) {
      console.error('Failed to save chatbot FAB position:', error);
    }
  }, [fabPosition]);

  // Touch drag support for mobile only
  useEffect(() => {
    if (!isDraggingFab) return undefined;

    const handleTouchMove = (event) => {
      const start = fabDragStartRef.current;
      if (!start) return;

      const touch = event.touches[0];
      const x = start.fabX + (touch.clientX - start.startX);
      const y = start.fabY + (touch.clientY - start.startY);

      const maxX = viewport.width - FAB_SIZE - FAB_MARGIN;
      const maxY = viewport.height - FAB_SIZE - FAB_MARGIN;

      setFabPosition({
        x: Math.max(FAB_MARGIN, Math.min(x, maxX)),
        y: Math.max(FAB_MARGIN, Math.min(y, maxY)),
      });
    };

    const stopDragging = () => {
      fabDragStartRef.current = null;
      setIsDraggingFab(false);
    };

    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', stopDragging);
    document.body.style.userSelect = 'none';

    return () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', stopDragging);
      document.body.style.userSelect = '';
    };
  }, [isDraggingFab, viewport]);

  const expandedBaseSize = useMemo(() => {
    const width = Math.min(EXPANDED_MAX_WIDTH, Math.round(viewport.width * EXPANDED_WIDTH_RATIO));
    const height = Math.min(EXPANDED_MAX_HEIGHT, Math.round(viewport.height * EXPANDED_HEIGHT_RATIO));
    return clampDesktopSize(width, height, viewport);
  }, [viewport]);

  const expandedDesktopSize = useMemo(() => {
    if (!manualExpandedSize) return expandedBaseSize;
    return clampDesktopSize(manualExpandedSize.width, manualExpandedSize.height, viewport);
  }, [manualExpandedSize, expandedBaseSize, viewport]);

  useEffect(() => {
    if (!isResizing) return undefined;

    const handleMouseMove = (event) => {
      const start = resizeStartRef.current;
      if (!start) return;

      const deltaX = start.x - event.clientX;
      const deltaY = start.y - event.clientY;

      const nextWidth = start.width + deltaX;
      const nextHeight = start.height + deltaY;

      setManualExpandedSize(clampDesktopSize(nextWidth, nextHeight, viewport));
    };

    const stopResizing = () => {
      resizeStartRef.current = null;
      setIsResizing(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', stopResizing);
    document.body.style.userSelect = 'none';

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', stopResizing);
      document.body.style.userSelect = '';
    };
  }, [isResizing, viewport]);

  const toggleSize = () => {
    setIsExpanded((prev) => !prev);
  };

  if (!CHATBOT_CONFIG.enabled || !user) {
    return null;
  }

  const isBottomLeft = CHATBOT_CONFIG.ui.position === 'bottom-left';
  const isDesktopViewport = viewport.width >= 768;
  const canManualResize = isExpanded && !isBottomLeft;
  const windowPositionClass = isBottomLeft ? 'md:left-6 md:right-auto' : 'md:right-6';
  // Only enable drag on mobile (not desktop)
  const isMobileViewport = viewport.width < 768;

  const handleResizeStart = (event) => {
    if (!canManualResize || event.button !== 0) return;

    event.preventDefault();
    resizeStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      width: expandedDesktopSize.width,
      height: expandedDesktopSize.height,
    };
    setIsResizing(true);
  };

  const handleFabDragStart = (event) => {
    // Only allow drag on mobile (touch only, not mouse)
    if (event.type !== 'touchstart' || isDesktopViewport) return;

    event.preventDefault();
    event.stopPropagation();

    const touch = event.touches[0];
    const clientX = touch.clientX;
    const clientY = touch.clientY;

    // Get current FAB position (either saved or default)
    const fabElement = fabRef.current;
    const rect = fabElement?.getBoundingClientRect();

    const currentX = rect?.left ?? (isBottomLeft ? FAB_MARGIN : viewport.width - FAB_SIZE - FAB_MARGIN);
    const currentY = rect?.top ?? (viewport.height - FAB_SIZE - FAB_MARGIN);

    fabDragStartRef.current = {
      startX: clientX,
      startY: clientY,
      fabX: currentX,
      fabY: currentY,
    };
    setIsDraggingFab(true);
  };

  const expandedWindowStyle = isExpanded && isDesktopViewport
    ? {
        width: `${expandedDesktopSize.width}px`,
        height: `${expandedDesktopSize.height}px`,
      }
    : undefined;

  // FAB position style - centered on mobile, custom position disabled on mobile
  const fabStyle = isMobileViewport ? {
    left: '50%',
    transform: 'translateX(-50%)',
  } : (fabPosition && !isMobileViewport) ? {
    left: `${fabPosition.x}px`,
    top: `${fabPosition.y}px`,
    bottom: 'auto',
    right: 'auto',
  } : undefined;

  return (
    <>
      {!isMobileViewport && (
        <div
          ref={fabRef}
          style={fabStyle}
          className={`fixed z-40 transition-all duration-300 ${
            isOpen || isDraggingFab ? 'scale-90 opacity-0 pointer-events-none' : 'scale-100 opacity-100'
          } ${!fabStyle ? (isBottomLeft ? 'left-6' : 'right-6') + ' bottom-6' : ''}`}
          onMouseEnter={() => !isDraggingFab && setIsHovered(true)}
          onMouseLeave={() => !isDraggingFab && setIsHovered(false)}
        >
          {isHovered && !isDraggingFab && (
            <div className="sf-chatbot-panel sf-chatbot-subtext absolute bottom-full right-0 mb-3 rounded-xl px-3 py-2 text-xs font-medium shadow-sm animate-fade-in">
              Asisten StudyFlow
              <div className="sf-chatbot-panel absolute bottom-0 right-4 h-2 w-2 translate-y-1/2 rotate-45 border-b border-r border-t-0 border-l-0" />
            </div>
          )}

          <div className="relative">
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              onTouchStart={handleFabDragStart}
              className="sf-chatbot-fab relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl shadow-[0_10px_24px_rgba(15,23,42,0.12)] transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(15,23,42,0.14)] active:translate-y-0"
              aria-label="Buka chatbot"
            >
              <MessageSquare className="pointer-events-none h-6 w-6" />
            </button>

            {/* Reset position button - only on desktop when in custom position */}
            {fabPosition && !isDraggingFab && !isMobileViewport && (
              <button
                type="button"
                onClick={() => setFabPosition(null)}
                className="absolute -top-1 -right-1 z-20 h-5 w-5 rounded-full bg-slate-600 text-white text-[10px] flex items-center justify-center hover:bg-slate-700 transition-colors"
                aria-label="Reset posisi"
                title="Reset ke posisi default"
              >
                ×
              </button>
            )}
          </div>
        </div>
      )}

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-950/35 backdrop-blur-[1px] md:hidden"
            onClick={() => setIsOpen(false)}
          />

          <div
            style={expandedWindowStyle}
            className={`sf-chatbot-surface sf-chatbot-border sf-chatbot-shadow fixed inset-x-0 bottom-0 z-50 h-[86vh] overflow-hidden rounded-t-[24px] border animate-slide-up md:inset-auto md:bottom-6 md:left-auto ${windowPositionClass} transition-all duration-300 ${
              isExpanded
                ? 'md:h-auto md:w-auto'
                : 'md:h-[72vh] md:max-h-[760px] md:w-[420px]'
            } md:rounded-3xl`}
          >
            {canManualResize && (
              <button
                type="button"
                onMouseDown={handleResizeStart}
                className="absolute left-0 top-0 z-[60] hidden h-10 w-10 -translate-x-1 -translate-y-1 cursor-nwse-resize items-start justify-start md:flex"
                title="Tarik ke kiri atau ke atas untuk memperbesar"
                aria-label="Ubah ukuran chatbot"
              >
                <span className="mt-3 ml-3 h-2.5 w-2.5 rounded-full bg-slate-300/80 dark:bg-slate-600/80" />
              </button>
            )}

            <ChatWindow onClose={() => setIsOpen(false)} onToggleSize={toggleSize} isExpanded={isExpanded} />
          </div>
        </>
      )}
    </>
  );
}

export default ChatbotWidget;
