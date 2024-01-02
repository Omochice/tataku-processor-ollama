import { Denops } from "https://deno.land/x/denops_std@v5.2.0/mod.ts";
import {
  JSONLinesParseStream,
} from "https://deno.land/x/jsonlines@v1.2.2/mod.ts";
import {
  assert,
  ensure,
  is,
  type PredicateType,
} from "https://deno.land/x/unknownutil@v3.11.0/mod.ts";
import { echo } from "https://deno.land/x/denops_std@v5.2.0/helper/echo.ts";

const isOption = is.ObjectOf({
  endpoint: is.OptionalOf(is.String),
  model: is.OptionalOf(is.String),
  silent: is.OptionalOf(is.Boolean),
});

type Option = PredicateType<typeof isOption>;

const defaults: Required<Option> = {
  endpoint: "http://localhost:11434/api/generate",
  model: "codellama",
  silent: false,
};

const isResponse = is.ObjectOf({
  model: is.String,
  created_at: is.String,
  response: is.String,
  done: is.Boolean,
});

type OllamaResponse = PredicateType<typeof isResponse>;

const processor = (denops: Denops, option: unknown) => {
  assert(option, isOption);

  const opt: Required<Option> = { ...defaults, ...option };

  return new TransformStream({
    transform: async (
      chunk: string[],
      controller: TransformStreamDefaultController<string[]>,
    ) => {
      const r = await fetch(opt.endpoint, {
        method: "POST",
        body: JSON.stringify({
          model: opt.model,
          prompt: chunk.join(""),
        }),
      });

      if (!r.ok) {
        controller.error(
          new Error("ollama response invalid record", { cause: r }),
        );
        return;
      }

      r.body
        ?.pipeThrough(
          new TextDecoderStream(),
        ).pipeThrough(
          new JSONLinesParseStream(),
        ).pipeThrough(
          new TransformStream({
            transform: (
              chunk: unknown,
              controller: TransformStreamDefaultController<OllamaResponse>,
            ) => {
              controller.enqueue(ensure(chunk, isResponse));
            },
          }),
        ).pipeTo(
          new WritableStream({
            write: (chunk: OllamaResponse) => {
              if (chunk.done) {
                return;
              }
              controller.enqueue([chunk.response]);
            },
          }),
        );
    },
  });
};

export default processor;
