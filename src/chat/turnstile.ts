/**
 * Cloudflare Turnstile, loaded only when the chat panel first opens. The widget runs in managed mode and shows
 * itself only when it needs the visitor to do something. Each token works once, so a new session asks the
 * widget for a fresh one.
 */
import { ChatError, siteKey } from './chat-client';

interface TurnstileApi {
  render(element: HTMLElement, options: Record<string, unknown>): string;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const TOKEN_WAIT_MS = 60_000;
let loading: Promise<TurnstileApi> | null = null;

function loadScript(): Promise<TurnstileApi> {
  loading ??= new Promise<TurnstileApi>((resolve, reject) => {
    if (window.turnstile) return resolve(window.turnstile);
    const script = document.createElement('script');
    script.src = SCRIPT;
    script.async = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new ChatError('turnstile')));
    script.onerror = () => {
      loading = null;
      reject(new ChatError('turnstile'));
    };
    document.head.appendChild(script);
  });
  return loading;
}

/** One widget in `element`. `token()` resolves with an unused token, waiting for the widget if needed. */
export class TurnstileWidget {
  private api: TurnstileApi | null = null;
  private id: string | null = null;
  private ready: string | null = null;
  /**
   * True once a token has been handed out, or the widget has failed: the next token needs a reset. Before that,
   * the first one is on its way.
   */
  private spent = false;
  private waiting: ((token: string) => void) | null = null;
  private failed: ((err: ChatError) => void) | null = null;

  async mount(element: HTMLElement, language: 'en' | 'fil'): Promise<void> {
    this.api = await loadScript();
    this.id = this.api.render(element, {
      sitekey: siteKey(),
      theme: 'auto',
      size: 'flexible',
      appearance: 'interaction-only',
      language: language === 'fil' ? 'tl' : 'en',
      callback: (token: string) => {
        if (this.waiting) {
          this.waiting(token);
          this.waiting = this.failed = null;
        } else {
          this.ready = token;
        }
      },
      'error-callback': () => {
        this.spent = true;
        this.failed?.(new ChatError('turnstile'));
        this.waiting = this.failed = null;
      },
      'expired-callback': () => {
        this.ready = null;
      },
    });
  }

  async token(): Promise<string> {
    if (this.ready) {
      const t = this.ready;
      this.ready = null;
      this.spent = true;
      return t;
    }
    if (!this.api || !this.id) throw new ChatError('turnstile');
    return new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.waiting = this.failed = null;
        reject(new ChatError('turnstile'));
      }, TOKEN_WAIT_MS);
      this.waiting = (t) => {
        clearTimeout(timer);
        this.spent = true;
        resolve(t);
      };
      this.failed = (e) => {
        clearTimeout(timer);
        reject(e);
      };
      if (this.spent) this.api!.reset(this.id!);
    });
  }

  unmount(): void {
    if (this.api && this.id) this.api.remove(this.id);
    this.id = null;
  }
}
