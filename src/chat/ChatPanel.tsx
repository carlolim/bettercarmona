import { ArrowRight, FileText, Info, RotateCcw, SendHorizontal, ThumbsDown, ThumbsUp, Trash2, X } from 'lucide-react';
import { Fragment, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink } from '../community/ExternalLink';
import { OFFICIAL_PORTAL_URL } from '../community/links';
import { useLocale } from '../community/locale';
import { ChatClient, ChatError, type ChatReply, type ErrorCode, type Turn } from './chat-client';
import { TurnstileWidget } from './turnstile';
import './chat.css';

const MAX_CHARS = 500;
/** The counter appears when this many characters are left. */
const COUNTER_FROM = 100;
const NARROW = '(max-width: 640px)';

type Message =
  | { id: number; role: 'user'; text: string }
  | { id: number; role: 'assistant'; reply: ChatReply; rated?: 'up' | 'down' };

/**
 * The conversation is kept on the visitor's own device until they clear it (the user's decision, 2026-11-14).
 * Storage can be blocked, as in a private window: then nothing is saved and the panel works as before.
 */
const STORAGE_KEY = 'bettercarmona-chat-v1';
const KEEP_MESSAGES = 50;

function loadMessages(): Message[] {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as unknown;
    return Array.isArray(saved) ? (saved as Message[]).filter((m) => m && (m.role === 'user' || m.role === 'assistant')) : [];
  } catch {
    return [];
  }
}

function saveMessages(messages: Message[]): void {
  try {
    if (messages.length) localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-KEEP_MESSAGES)));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage is full or blocked; the conversation still works for this page.
  }
}

function useNarrow(): boolean {
  const [narrow, setNarrow] = useState(() => window.matchMedia(NARROW).matches);
  useEffect(() => {
    const media = window.matchMedia(NARROW);
    const on = () => setNarrow(media.matches);
    media.addEventListener('change', on);
    return () => media.removeEventListener('change', on);
  }, []);
  return narrow;
}

/**
 * The model's text as paragraphs and lists, with each [n] a link to source n below it. The text is shown as text,
 * never as HTML. Bold markers the model may add are dropped.
 */
function AnswerText({ text, anchor }: { text: string; anchor: (n: number) => string }) {
  const { t } = useLocale();
  const inline = (line: string) =>
    line
      .replace(/\*\*/g, '')
      .split(/(\[\d+\])/)
      .map((part, i) => {
        const n = /^\[(\d+)\]$/.exec(part)?.[1];
        return n ? (
          <a key={i} className="chat-ref" href={`#${anchor(Number(n))}`} aria-label={t('chat.sourceRef', { n })}>
            [{n}]
          </a>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        );
      });
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  const flush = () => {
    if (!list) return;
    const items = list.items.map((item, i) => <li key={i}>{inline(item)}</li>);
    blocks.push(list.ordered ? <ol key={blocks.length}>{items}</ol> : <ul key={blocks.length}>{items}</ul>);
    list = null;
  };
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    const bullet = /^[-*]\s+(.*)$/.exec(line);
    const numbered = /^\d+[.)]\s+(.*)$/.exec(line);
    if (bullet || numbered) {
      const ordered = Boolean(numbered);
      if (list && list.ordered !== ordered) flush();
      list ??= { ordered, items: [] };
      list.items.push((bullet ?? numbered)![1]);
    } else {
      flush();
      if (line) blocks.push(<p key={blocks.length}>{inline(line)}</p>);
    }
  }
  flush();
  return <div className="chat-text">{blocks}</div>;
}

/** Where to go when the assistant can't help: the hotlines, the services, and the city's own website. */
function NextSteps({ onSiteLink }: { onSiteLink: () => void }) {
  const { t, path } = useLocale();
  return (
    <div className="chat-next">
      <p>{t('chat.nextSteps')}</p>
      <ul>
        <li>
          <Link to={path('/hotlines')} onClick={onSiteLink}>{t('chat.links.hotlines')}</Link>
        </li>
        <li>
          <Link to={path('/services')} onClick={onSiteLink}>{t('chat.links.services')}</Link>
        </li>
        <li>
          <ExternalLink href={OFFICIAL_PORTAL_URL}>{t('chat.links.official_site')}</ExternalLink>
        </li>
      </ul>
    </div>
  );
}

function Answer({ message, onRate, onSiteLink }: { message: Extract<Message, { role: 'assistant' }>; onRate: (r: 'up' | 'down') => void; onSiteLink: () => void }) {
  const { t, path } = useLocale();
  const { reply } = message;
  const anchor = (n: number) => `chat-src-${message.id}-${n}`;
  const kind = (k: string) => t(`chat.kinds.${k}`, { defaultValue: t('chat.sources') });
  const helpless = reply.kind === 'not_found' || reply.kind === 'out_of_scope';
  return (
    <div className="chat-answer">
      <h3 className="sr-only">{t('chat.assistant')}</h3>
      {reply.featured && (
        <Link to={path(reply.featured.site_url)} className="bc-card bc-card--link chat-featured" onClick={onSiteLink}>
          <span className="bc-icon" aria-hidden="true"><FileText size={20} /></span>
          <span className="chat-featured-body">
            <span className="chat-featured-title">{reply.featured.title}</span>
            <span className="bc-tag">{kind(reply.featured.kind)}</span>
            <span className="chat-featured-go">
              {t('chat.featured')} <ArrowRight size={16} aria-hidden="true" />
            </span>
          </span>
        </Link>
      )}
      {reply.kind === 'not_found' && !reply.text ? <p>{t('chat.notFound')}</p> : <AnswerText text={reply.text} anchor={anchor} />}
      {reply.sources.length > 0 && (
        <div className="chat-sources">
          <h4>{t('chat.sources')}</h4>
          <ol>
            {reply.sources.map((s) => (
              <li key={s.n} id={anchor(s.n)}>
                <span className="chat-source-title">{s.title}</span>
                <span className="chat-source-meta">
                  <span className="bc-tag bc-tag--neutral">{kind(s.kind)}</span>
                  {s.date && <span>{s.date}</span>}
                </span>
                <span className="chat-source-links">
                  {s.site_url && (
                    <Link to={path(s.site_url)} onClick={onSiteLink}>{t('chat.sitePage')}</Link>
                  )}
                  {s.source_url && <ExternalLink href={s.source_url}>{t('chat.originalSource')}</ExternalLink>}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
      {reply.notices.length > 0 && (
        <ul className="chat-notices">
          {reply.notices.map((n) => (
            <li key={n}>
              <Info size={15} aria-hidden="true" /> {t(`chat.notices.${n}`, { defaultValue: '' })}
            </li>
          ))}
        </ul>
      )}
      {helpless && <NextSteps onSiteLink={onSiteLink} />}
      {reply.kind !== 'not_found' && (
        <div className="chat-rate">
          {message.rated ? (
            <p tabIndex={-1} ref={(el) => el?.focus()}>{t('chat.thanks')}</p>
          ) : (
            <>
              <span>{t('chat.helpful')}</span>
              <button type="button" className="chat-icon-btn" onClick={() => onRate('up')}>
                <ThumbsUp size={18} aria-hidden="true" />
                <span className="sr-only">{t('chat.helpfulYes')}</span>
              </button>
              <button type="button" className="chat-icon-btn" onClick={() => onRate('down')}>
                <ThumbsDown size={18} aria-hidden="true" />
                <span className="sr-only">{t('chat.helpfulNo')}</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * The chat panel. The conversation is saved on the visitor's device until they clear it.
 * On a phone it fills the screen and is modal; on a wide screen it sits beside the page and leaves it usable.
 */
export default function ChatPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { locale, t, path } = useLocale();
  const narrow = useNarrow();
  const titleId = useId();
  const [messages, setMessages] = useState<Message[]>(loadMessages);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ code: ErrorCode; question: string } | null>(null);
  const [announce, setAnnounce] = useState('');
  const panel = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const log = useRef<HTMLDivElement>(null);
  const widgetBox = useRef<HTMLDivElement>(null);
  const nextId = useRef(Math.max(0, ...messages.map((m) => m.id)) + 1);
  const widget = useMemo(() => new TurnstileWidget(), []);
  const client = useMemo(() => new ChatClient(() => widget.token()), [widget]);

  useEffect(() => {
    if (!widgetBox.current) return;
    widget.mount(widgetBox.current, locale).catch(() => setError({ code: 'turnstile', question: '' }));
    return () => widget.unmount();
    // The widget is made once; its language is the one the panel first opened in.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widget]);

  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  // Escape closes the panel even when focus has fallen back to the page, as after a button that goes away.
  useEffect(() => {
    if (!open) return;
    const onEscape = (event: globalThis.KeyboardEvent) => {
      const inside = panel.current?.contains(document.activeElement);
      if (event.key === 'Escape' && (inside || document.activeElement === document.body)) onClose();
    };
    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, [open, onClose]);

  useEffect(() => {
    log.current?.lastElementChild?.scrollIntoView({ block: 'nearest' });
  }, [messages, pending]);

  useEffect(() => saveMessages(messages), [messages]);

  function clear() {
    setMessages([]);
    setError(null);
    setAnnounce('');
    input.current?.focus();
  }

  const history = (): Turn[] =>
    messages.map((m) => (m.role === 'user' ? { role: 'user', content: m.text } : { role: 'assistant', content: m.reply.text.slice(0, MAX_CHARS) }));

  async function ask(question: string, retry = false) {
    const text = question.trim();
    if (!text || pending) return;
    setError(null);
    const past = history();
    if (!retry) {
      setMessages((m) => [...m, { id: nextId.current++, role: 'user', text }]);
      setDraft('');
    }
    setPending(true);
    setAnnounce(t('chat.thinking'));
    try {
      const reply = await client.ask(text, retry ? past.slice(0, -1) : past, locale);
      setMessages((m) => [...m, { id: nextId.current++, role: 'assistant', reply }]);
      setAnnounce(reply.kind === 'not_found' && !reply.text ? t('chat.notFound') : reply.text.replace(/\[\d+\]/g, ''));
    } catch (err) {
      setError({ code: err instanceof ChatError ? err.code : 'unavailable', question: text });
      setAnnounce('');
    } finally {
      setPending(false);
      input.current?.focus();
    }
  }

  function rate(id: number, rating: 'up' | 'down') {
    const m = messages.find((x) => x.id === id);
    if (!m || m.role !== 'assistant' || m.rated) return;
    setMessages((all) => all.map((x) => (x.id === id && x.role === 'assistant' ? { ...x, rated: rating } : x)));
    void client.feedback(rating, m.reply.kind);
  }

  /** On a phone, following a link to this site closes the panel so the page shows. The conversation stays. */
  const onSiteLink = () => {
    if (narrow) onClose();
  };

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    // Modal on a phone: Tab stays inside the panel.
    if (event.key !== 'Tab' || !narrow || !panel.current) return;
    const focusable = [...panel.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), textarea:not([disabled]), [tabindex="0"]')];
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }

  const left = MAX_CHARS - draft.length;
  const examples = t('chat.examples', { returnObjects: true }) as string[];
  const retryable = error && error.question && !['slow_down', 'daily_limit', 'site_busy', 'monthly_limit', 'disabled', 'input'].includes(error.code);

  return (
    <div
      ref={panel}
      id="chat-panel"
      className="chat-panel"
      role="dialog"
      aria-modal={narrow ? true : undefined}
      aria-labelledby={titleId}
      hidden={!open}
      onKeyDown={onKeyDown}
    >
      <div className="chat-head">
        <h2 id={titleId}>{t('chat.title')}</h2>
        {messages.length > 0 && (
          <button type="button" className="chat-icon-btn chat-clear" onClick={clear}>
            <Trash2 size={18} aria-hidden="true" />
            <span className="sr-only">{t('chat.clear')}</span>
          </button>
        )}
        <button type="button" className="chat-icon-btn" onClick={onClose}>
          <X size={20} aria-hidden="true" />
          <span className="sr-only">{t('chat.close')}</span>
        </button>
      </div>
      <p className="bc-callout chat-notice">
        <Info size={18} aria-hidden="true" />
        <span>
          {t('chat.notice')} <Link to={`${path('/about')}#about-assistant`} onClick={onSiteLink}>{t('chat.noticeLink')}</Link>
        </span>
      </p>

      <div className="chat-log" ref={log}>
        {messages.length === 0 && (
          <div className="chat-welcome">
            <p>{t('chat.intro')}</p>
            <p className="chat-examples-label">{t('chat.examplesLabel')}</p>
            <ul className="chat-examples">
              {examples.map((q) => (
                <li key={q}>
                  <button type="button" className="bc-btn bc-btn--outline" disabled={pending} onClick={() => void ask(q)}>
                    {q}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {messages.map((m) =>
          m.role === 'user' ? (
            <div key={m.id} className="chat-question">
              <h3 className="sr-only">{t('chat.you')}</h3>
              <p>{m.text}</p>
            </div>
          ) : (
            <Answer key={m.id} message={m} onRate={(r) => rate(m.id, r)} onSiteLink={onSiteLink} />
          ),
        )}
        {pending && (
          <p className="chat-thinking">
            <span className="chat-dots" aria-hidden="true" /> {t('chat.thinking')}
          </p>
        )}
        {error && (
          <div className="chat-error" role="alert">
            <p>{t(`chat.errors.${error.code}`)}</p>
            {error.code === 'turnstile' && !error.question && (
              <button
                type="button"
                className="bc-btn bc-btn--outline"
                onClick={() => {
                  setError(null);
                  if (widgetBox.current) widget.mount(widgetBox.current, locale).catch(() => setError({ code: 'turnstile', question: '' }));
                }}
              >
                <RotateCcw size={16} aria-hidden="true" /> {t('chat.retry')}
              </button>
            )}
            {retryable && (
              <button type="button" className="bc-btn bc-btn--outline" onClick={() => void ask(error.question, true)}>
                <RotateCcw size={16} aria-hidden="true" /> {t('chat.retry')}
              </button>
            )}
            <NextSteps onSiteLink={onSiteLink} />
          </div>
        )}
      </div>
      <p className="sr-only" aria-live="polite">{announce}</p>

      <div ref={widgetBox} className="chat-turnstile" />
      <form
        className="chat-form"
        onSubmit={(e) => {
          e.preventDefault();
          void ask(draft);
        }}
      >
        <label htmlFor="chat-input">{t('chat.inputLabel')}</label>
        <div className="chat-form-row">
          <textarea
            id="chat-input"
            ref={input}
            className="bc-input chat-input"
            rows={2}
            maxLength={MAX_CHARS}
            value={draft}
            disabled={pending}
            aria-describedby={left <= COUNTER_FROM ? 'chat-counter' : undefined}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void ask(draft);
              }
            }}
          />
          <button type="submit" className="bc-btn bc-btn--primary chat-send" disabled={pending || !draft.trim()}>
            <SendHorizontal size={18} aria-hidden="true" />
            <span className="sr-only">{t('chat.send')}</span>
          </button>
        </div>
        {left <= COUNTER_FROM && (
          <p id="chat-counter" className="chat-counter">{t('chat.counter', { count: left })}</p>
        )}
      </form>
      <p className="chat-foot">{t('chat.footer')}</p>
    </div>
  );
}
