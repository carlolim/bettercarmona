import { MessageCircle } from 'lucide-react';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useLocale } from '../community/locale';
import { chatEnabled } from './chat-client';
import './chat-launcher.css';

/** Loaded on first open only, with the Turnstile script it brings. */
const ChatPanel = lazy(() => import('./ChatPanel'));

/**
 * The "Ask BetterCarmona AI" button, mounted once in CommunityLayout above the routes, so the conversation survives
 * moving between pages. It asks /api/chat/status once per page load and renders nothing unless the assistant is on.
 * Once opened, the panel stays mounted while closed, so reopening shows the conversation as it was.
 */
export function ChatLauncher() {
  const { t } = useLocale();
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const refocus = useRef(false);

  useEffect(() => {
    let live = true;
    chatEnabled().then((on) => live && setEnabled(on));
    return () => {
      live = false;
    };
  }, []);

  // The page keeps room at its foot for the button, so it never covers the footer's last links.
  useEffect(() => {
    document.documentElement.classList.toggle('has-chat-launcher', enabled);
    return () => document.documentElement.classList.remove('has-chat-launcher');
  }, [enabled]);

  // Closing returns focus to the button, once it is shown again.
  useEffect(() => {
    if (!open && refocus.current) {
      refocus.current = false;
      button.current?.focus();
    }
  }, [open]);

  if (!enabled) return null;

  const close = () => {
    refocus.current = true;
    setOpen(false);
  };

  return (
    <>
      <button
        ref={button}
        type="button"
        className="chat-launcher bc-btn bc-btn--primary"
        aria-expanded={open}
        aria-controls="chat-panel"
        hidden={open}
        onClick={() => {
          setLoaded(true);
          setOpen(true);
        }}
      >
        <MessageCircle size={20} aria-hidden="true" />
        <span className="chat-launcher-label">{t('chat.launcher')}</span>
      </button>
      {loaded && (
        <Suspense fallback={null}>
          <ChatPanel open={open} onClose={close} />
        </Suspense>
      )}
    </>
  );
}
