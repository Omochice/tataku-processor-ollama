import { Denops } from "https://deno.land/x/denops_std@v6.5.0/mod.ts";
import { ensure, is, type PredicateType } from "jsr:@core/unknownutil@3.18.1";
import { echo } from "https://deno.land/x/denops_std@v6.5.0/helper/echo.ts";
import { toTransformStream } from "jsr:@std/streams@0.224.5/to-transform-stream";
import { Ollama } from "npm:ollama@0.5.2/browser";

const isOption = is.ObjectOf({
  endpoint: is.OptionalOf(is.String),
  model: is.OptionalOf(is.String),
  silent: is.OptionalOf(is.Boolean),
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

const processor = (denops: Denops, option: unknown) => {
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
