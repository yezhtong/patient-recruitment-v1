/**
 * M8.2 · LLM 接入抽象
 *
 * 设计目标：
 * - 与 `sms.ts` 的 `SmsProvider` 同模式：抽象接口 + DeepSeek 实现 + Mock 回退
 * - 未配置 `DEEPSEEK_API_KEY` 时自动 Mock（开发期照常可用）
 * - 统一 `chat()` 签名，接收 system/user prompt + 可选 maxTokens/temperature
 * - 所有调用经 `callWithLogging()` 包装写 `LlmCallLog`（见 llm-log.ts）
 */

export interface LlmUsage {
  prompt: number;
  completion: number;
  total: number;
}

export interface LlmChatInput {
  system?: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
  /** 超时（ms），默认 30s */
  timeoutMs?: number;
}

export interface LlmChatOutput {
  text: string;
  usage?: LlmUsage;
  /** 实际调用的 provider 名字（deepseek / mock） */
  provider: "deepseek" | "mock";
  /** 实际模型名 */
  model: string;
}

export interface LlmProvider {
  chat(input: LlmChatInput): Promise<LlmChatOutput>;
  readonly name: "deepseek" | "mock";
}

/**
 * 真实 DeepSeek 实现。
 * API 兼容 OpenAI chat completions 格式：POST {baseUrl}/chat/completions
 */
class DeepSeekProvider implements LlmProvider {
  readonly name = "deepseek" as const;

  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string = "https://api.deepseek.com",
    private readonly model: string = "deepseek-chat",
  ) {}

  async chat(input: LlmChatInput): Promise<LlmChatOutput> {
    const messages: Array<{ role: "system" | "user"; content: string }> = [];
    if (input.system) messages.push({ role: "system", content: input.system });
    messages.push({ role: "user", content: input.user });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), input.timeoutMs ?? 30_000);

    try {
      const resp = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          max_tokens: input.maxTokens ?? 2048,
          temperature: input.temperature ?? 0.3,
          stream: false,
        }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const errText = await resp.text().catch(() => "");
        throw new Error(`DeepSeek HTTP ${resp.status}: ${errText.slice(0, 200)}`);
      }

      const data = (await resp.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
      };

      const text = data.choices?.[0]?.message?.content ?? "";
      const usage: LlmUsage | undefined = data.usage
        ? {
            prompt: data.usage.prompt_tokens ?? 0,
            completion: data.usage.completion_tokens ?? 0,
            total: data.usage.total_tokens ?? 0,
          }
        : undefined;

      return { text, usage, provider: "deepseek", model: this.model };
    } finally {
      clearTimeout(timeout);
    }
  }
}

/**
 * 开发期 Mock，按 scenario 前缀/关键词返回可预测的 fixture。
 * 调用方通过 user prompt 里的 scenario 标识来决定返回哪份。
 * 最重要：返回的 JSON 结构与真实 DeepSeek 一致，让下游代码无需判断。
 */
class MockLlmProvider implements LlmProvider {
  readonly name = "mock" as const;

  async chat(input: LlmChatInput): Promise<LlmChatOutput> {
    const lower = input.user.toLowerCase();

    // 启发式：根据关键词决定返回哪份 fixture
    let text: string;
    if (lower.includes("sanity") || lower.includes("介绍一下你自己")) {
      text = "我是 Mock LLM（DEEPSEEK_API_KEY 未配置）。";
    } else if (
      lower.includes("fieldkey") ||
      lower.includes("预筛") ||
      (lower.includes("招募") && lower.includes("标准"))
    ) {
      // 预筛字段抽取（prescreen_generate）
      text = JSON.stringify([
        {
          fieldKey: "age",
          label: "你的年龄",
          fieldType: "number",
          isRequired: true,
          helpText: "[Mock] 请填写 18-80 之间的整数",
        },
        {
          fieldKey: "gender",
          label: "你的生理性别",
          fieldType: "single",
          isRequired: true,
          options: [
            { value: "female", label: "女" },
            { value: "male", label: "男" },
          ],
        },
        {
          fieldKey: "city",
          label: "你所在城市",
          fieldType: "text",
          isRequired: true,
        },
      ]);
    } else if (lower.includes("症状") || lower.includes("疾病分析")) {
      // disease_analysis
      text = JSON.stringify([
        { label: "疑似心血管相关", keyword: "cardiovascular", confidence: 0.75 },
        { label: "一般不适", keyword: "general_discomfort", confidence: 0.6 },
      ]);
    } else {
      // 通用兜底
      text = "[Mock] 这是 MockLlmProvider 的默认响应。请配置 DEEPSEEK_API_KEY 以启用真实模型。";
    }

    // 模拟 50-150ms 延迟
    await new Promise((r) => setTimeout(r, 50 + Math.random() * 100));

    const promptLen = (input.system?.length ?? 0) + input.user.length;
    const usage: LlmUsage = {
      prompt: Math.ceil(promptLen / 3),
      completion: Math.ceil(text.length / 3),
      total: Math.ceil((promptLen + text.length) / 3),
    };

    return { text, usage, provider: "mock", model: "mock" };
  }
}

let _cached: LlmProvider | null = null;

/**
 * 工厂：按 env 返回合适的 provider。
 * - `DEEPSEEK_API_KEY` 非空 → DeepSeekProvider
 * - 否则 → MockLlmProvider（静默降级，与 SMS 同模式）
 */
export function getLlmProvider(): LlmProvider {
  if (_cached) return _cached;
  const key = process.env.DEEPSEEK_API_KEY;
  if (key && key.length > 10) {
    const baseUrl = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
    _cached = new DeepSeekProvider(key, baseUrl);
  } else {
    console.warn("[llm] DEEPSEEK_API_KEY 未配置，使用 MockLlmProvider（开发期 fallback）");
    _cached = new MockLlmProvider();
  }
  return _cached;
}

/** 仅测试/tsx 脚本里强制 reset 缓存的 provider（勿在生产代码调用） */
export function __resetLlmProviderForTest() {
  _cached = null;
}

/**
 * DeepSeek 计价（2026-04 官网 deepseek-chat）：
 *   input:  ¥0.001 / 1K tokens
 *   output: ¥0.002 / 1K tokens
 * 估算单次成本（人民币元）。Mock 返回 0。
 */
export function estimateCostCny(usage: LlmUsage | undefined, provider: "deepseek" | "mock"): number {
  if (!usage || provider === "mock") return 0;
  const inputCost = (usage.prompt / 1000) * 0.001;
  const outputCost = (usage.completion / 1000) * 0.002;
  return Number((inputCost + outputCost).toFixed(6));
}
