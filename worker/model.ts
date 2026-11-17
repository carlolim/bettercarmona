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

/**
 * The request body for a model: the same for the Worker's binding and the test set's REST calls, so
 * both run the model the same way. JSON output, the answer length, a low temperature, and no
 * thinking before the answer where the model allows turning it off.
 */
export function modelRequest(model: string, messages: Message[]): Record<string, unknown> {
  const body: Record<string, unknown> = {
    messages,
    max_tokens: MAX_OUTPUT_TOKENS,
    temperature: TEMPERATURE,
    response_format: { type: 'json_object' },
  };
  if (model.startsWith('@cf/google/gemma') || model.startsWith('@cf/qwen/')) body.chat_template_kwargs = { enable_thinking: false };
  if (model === '@cf/openai/gpt-oss-120b') body.reasoning_effort = 'low';
  return body;
}

/** The reply text and token counts from a model's output, whichever shape it uses. */
export function readModelOutput(out: unknown): ModelReply {
  const o = out as {
    choices?: { message?: { content?: string | null } }[];
    response?: string | object;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const response = typeof o.response === 'object' && o.response !== null ? JSON.stringify(o.response) : o.response;
  return {
    text: o.choices?.[0]?.message?.content ?? response ?? '',
    inputTokens: o.usage?.prompt_tokens ?? 0,
    outputTokens: o.usage?.completion_tokens ?? MAX_OUTPUT_TOKENS,
  };
}

export class WorkersAiModel implements Model {
  name = MODEL;
  private ai: Ai;

  constructor(ai: Ai) {
    this.ai = ai;
  }

  async run(messages: Message[]): Promise<ModelReply> {
    return readModelOutput(await this.ai.run(MODEL, modelRequest(MODEL, messages) as never));
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
