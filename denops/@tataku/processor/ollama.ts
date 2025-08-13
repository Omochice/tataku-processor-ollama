import { Denops } from "jsr:@denops/std@7.6.0";
import { as, ensure, is, type Predicate } from "jsr:@core/unknownutil@4.3.0";
import { echo } from "jsr:@denops/std@7.6.0/helper/echo";
import { toTransformStream } from "jsr:@std/streams@1.0.11/to-transform-stream";
import { Ollama } from "npm:ollama@0.5.16/browser";
import type { Message } from "npm:ollama@0.5.16/interfaces";
import { ProcessorFactory } from "jsr:@omochice/tataku-vim@1.2.1";

type Option = {
  endpoint: string;
  model: string;
  silent: boolean;
  systemPrompt?: string;
};

const isOption = is.ObjectOf({
  endpoint: as.Optional(is.String),
  model: as.Optional(is.String),
  silent: as.Optional(is.Boolean),
  systemPrompt: as.Optional(is.String),
}) satisfies Predicate<Partial<Option>>;

const defaults: Option = {
  endpoint: "http://localhost:11434",
  model: "codellama",
  silent: false,
};

const notify = async (denops: Denops, message: string, option: Option) => {
  if (option.silent) {
    return;
  }
  await echo(denops, message);
};

const processor: ProcessorFactory = (denops: Denops, option: unknown) => {
  const opt: Option = { ...defaults, ...ensure(option, isOption) };

  const ollama = new Ollama({ host: opt.endpoint });

  return toTransformStream(async function* (src: ReadableStream<string[]>) {
    await notify(denops, "Thinking now...", opt);
    for await (const chunk of src) {
      const chatMessage: Message[] = chunk.map((content, i) => ({
        role: i % 2 === 0 ? "user" : "assistant",
        content,
      }));
      const messages: Message[] = [
        ...(opt.systemPrompt
          ? [{ role: "system", content: opt.systemPrompt }]
          : []),
        ...chatMessage,
      ];
      const response = await ollama.chat({
        model: opt.model,
        messages: messages,
        stream: true,
      });
      for await (const r of response) {
        if (r.done) {
          await notify(denops, "Done!!", opt);
        }
        yield [r.message.content];
      }
    }
  });
};

export default processor;
