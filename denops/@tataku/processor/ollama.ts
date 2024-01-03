import { Denops } from "https://deno.land/x/denops_std@v5.2.0/mod.ts";
import {
  assert,
  is,
  type PredicateType,
} from "https://deno.land/x/unknownutil@v3.11.0/mod.ts";
import { echo } from "https://deno.land/x/denops_std@v5.2.0/helper/echo.ts";
import { Ollama } from "npm:langchain@0.0.214/llms/ollama";

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
  assert(option, isOption);

  const opt: Required<Option> = { ...defaults, ...option };

  const ollama = new Ollama({
    baseUrl: opt.endpoint,
    model: opt.model,
  });

  return new TransformStream({
    transform: async (
      chunk: string[],
      controller: TransformStreamDefaultController<string[]>,
    ) => {
      await notify(denops, "Thinking now...", opt);

      (await ollama.stream(chunk.join("")))
        .pipeTo(
          new WritableStream({
            write: (chunk: string) => {
              controller.enqueue([chunk]);
            },
          }),
        );
    },
  });
};

export default processor;
