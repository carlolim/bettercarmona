/**
 * The model, behind a small interface. The real one is Workers AI. The fixture returns a fixed,
 * valid reply citing S1, costs nothing, and is used in tests and local work.
 */
import { MAX_OUTPUT_TOKENS, MODEL, NEURON_RATES, TEMPERATURE } from './config.ts';

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ModelReply {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

export interface Model {
  name: string;
  run(messages: Message[]): Promise<ModelReply>;
}

/** Neurons for a reply, from its token counts and the model's rates, rounded up. */
export function neurons(model: string, inputTokens: number, outputTokens: number): number {
  const rate = NEURON_RATES[model];
  if (!rate) throw new Error(`no Neuron rates for ${model}`);
  return Math.ceil((inputTokens * rate.input + outputTokens * rate.output) / 1_000_000);
}

export class WorkersAiModel implements Model {
  name = MODEL;
  private ai: Ai;

  constructor(ai: Ai) {
    this.ai = ai;
  }

  async run(messages: Message[]): Promise<ModelReply> {
    const out = (await this.ai.run(MODEL, {
      messages,
      max_tokens: MAX_OUTPUT_TOKENS,
      temperature: TEMPERATURE,
      response_format: { type: 'json_object' },
      // The reply is short and checked whole. Thinking would spend output tokens before it.
      chat_template_kwargs: { enable_thinking: false },
    })) as unknown as {
      choices?: { message?: { content?: string | null } }[];
      response?: string;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    return {
      text: out.choices?.[0]?.message?.content ?? out.response ?? '',
      inputTokens: out.usage?.prompt_tokens ?? 0,
      outputTokens: out.usage?.completion_tokens ?? MAX_OUTPUT_TOKENS,
    };
  }
}

export const FIXTURE_REPLY = JSON.stringify({
  kind: 'answer',
  text: 'This is a fixture answer from the first source. [S1]',
  sources: ['S1'],
});

export class FixtureModel implements Model {
  name = 'fixture';
  private reply: string;

  constructor(reply = FIXTURE_REPLY) {
    this.reply = reply;
  }

  async run(): Promise<ModelReply> {
    return { text: this.reply, inputTokens: 0, outputTokens: 0 };
  }
}
