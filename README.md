# tataku-processor-ollama

The processor module using ollama.

**CURRENTLY THIS PLUGIN IS EXPERIMENTAL**.

## Contents

- [Dependencies](tataku-processor-ollama-dependencies)
- [Options](tataku-processor-ollama-options)
- [Samples](tataku-processor-ollama-samples)

## Dependencies

This plugin needs:

- [denops.vim](https://github.com/vim-denops/denops.vim)
- [tataku.vim](https://github.com/Omochice/tataku.vim)

## Options

This module has some options.

- `endpoint`

  Ollama endpoint. Default: `http://localhost:11434`
- `model`

  Model name. Specified model is needed to be installed. Default: `codellama`
- `systemPrompt`

  (optional) System prompt for ollama. This prompt sets the context or behavior
  for the chat model. For example, you can use it to specify the role or
  instructions that the model should follow when processing the input.

## Samples

```vim
let g:tataku_recipes = #{
  \   sample: #{
  \     processor: #{
  \       name: 'ollama',
  \       options: #{
  \         endpoint: 'http://localhost:11434',
  \         model: 'codellama',
  \       },
  \     }
  \   }
  \ }
```
