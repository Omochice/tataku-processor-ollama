import { Denops } from "jsr:@denops/std@7.4.0";
import {
  as,
  ensure,
  is,
  type PredicateType,
} from "jsr:@core/unknownutil@4.3.0";
import { echo } from "jsr:@denops/std@7.4.0/helper/echo";
import { toTransformStream } from "jsr:@std/streams@1.0.9/to-transform-stream";
import { Ollama } from "npm:ollama@0.5.11/browser";
import { ProcessorFactory } from "jsr:@omochice/tataku-vim@1.1.0";

const isOption = is.ObjectOf({
  endpoint: as.Optional(is.String),
  model: as.Optional(is.String),
  silent: as.Optional(is.Boolean),
});

type Option = PredicateType<typeof isOption>;

const defaults: Required<Option> = {
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
  const opt: Required<Option> = { ...defaults, ...ensure(option, isOption) };

  const ollama = new Ollama({ host: opt.endpoint });

  return toTransformStream(async function* (src: ReadableStream<string[]>) {
    await notify(denops, "Thinking now...", opt);
    for await (const chunk of src) {
      const response = await ollama.generate({
        model: opt.model,
        prompt: chunk.join(""),
        stream: true,
      });
      for await (const r of response) {
        if (r.done) {
          await notify(denops, "Done!!", opt);
        }
        yield [r.response];
      }
    }
  });
};

export default processor;
