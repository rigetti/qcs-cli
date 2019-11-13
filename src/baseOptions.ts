import { flags } from '@oclif/command';

export type SerializeFormat = 'json' | 'json-pretty' | 'tabular';

export const baseOptions = {
  format: flags.string({
    char: 'f',
    description: 'Data serialization format.',
    options: ['json', 'json-pretty', 'tabular'],
    required: false,
    default: 'tabular',
  }),
  confirm: flags.boolean({
    description: 'Include this option to bypass menus and/or confirmation prompts.',
    required: false,
    default: false,
  }),
};
