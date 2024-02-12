import { Denops } from "https://deno.land/x/denops_std@v5.3.0/mod.ts";
import {
  JSONLinesParseStream,
} from "https://deno.land/x/jsonlines@v1.2.2/mod.ts";
import {
  assert,
  ensure,
  is,
  type PredicateType,
} from "https://deno.land/x/unknownutil@v3.16.0/mod.ts";
import { echo } from "https://deno.land/x/denops_std@v5.3.0/helper/echo.ts";

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

class OllamaResponseEnsureStream implements TransformStream {
  readonly writable: WritableStream<unknown>;
  readonly readable: ReadableStream<OllamaResponse>;
  constructor() {
    const { writable, readable } = new TransformStream({
      transform: (
        chunk: unknown,
        controller: TransformStreamDefaultController<OllamaResponse>,
      ) => {
        controller.enqueue(ensure(chunk, isResponse));
      },
    });
    this.writable = writable;
    this.readable = readable;
  }
}

const notify = async (denops: Denops, message: string, option: Option) => {
  if (option.silent) {
    return;
  }
  await echo(denops, message);
};

const processor = (denops: Denops, option: unknown) => {
  assert(option, isOption);

  const opt: Required<Option> = { ...defaults, ...option };

  return new TransformStream({
    transform: async (
      chunk: string[],
      controller: TransformStreamDefaultController<string[]>,
    ) => {
      await notify(denops, "Thinking now...", opt);
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
          new OllamaResponseEnsureStream(),
        ).pipeTo(
          new WritableStream({
            write: async (chunk: OllamaResponse) => {
              if (chunk.done) {
                await notify(denops, "Done!!", opt);
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
