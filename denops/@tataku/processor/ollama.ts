import { Denops } from "https://deno.land/x/denops_std@v5.0.1/mod.ts";
import {
  JSONLinesParseStream,
} from "https://deno.land/x/jsonlines@v1.2.2/mod.ts";
import {
  assert,
  ensure,
  is,
  type PredicateType,
} from "https://deno.land/x/unknownutil@v3.11.0/mod.ts";

const isOption = is.ObjectOf({
  endpoint: is.OptionalOf(is.String),
  model: is.OptionalOf(is.String),
  prompt: is.String,
});

const defaults = {
  endpoint: "http://localhost:11434/api/generate",
  model: "codellama",
} as const;

const isResponse = is.ObjectOf({
  model: is.String,
  created_at: is.String,
  response: is.String,
  done: is.Boolean,
});

type OllamaResponse = PredicateType<typeof isResponse>;

const processor = (_: Denops, option: unknown) => {
  assert(option, isOption);

  return new TransformStream({
    transform: async (
      _chunk: string[],
      controller: TransformStreamDefaultController<string[]>,
    ) => {
      // TODO: create prompt by input chunk
      const r = await fetch(option.endpoint ?? defaults.endpoint, {
        method: "POST",
        body: JSON.stringify({
          model: option.model ?? defaults.model,
          prompt: option.prompt,
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
                controller.terminate();
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
