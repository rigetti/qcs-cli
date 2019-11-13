import { flags } from '@oclif/command';

export type SerializeFormat = 'json' | 'json-pretty' | 'tabular';

export const baseOptions = {
  format: flags.string({
    char: 'f',
    description: '.',
    options: ['json', 'json-pretty', 'tabular'],
    required: false,
    default: 'tabular',
  }),
  confirm: flags.boolean({
    char: 'f',
    description: 'Include this option to bypass any confirmation prompts.',
    required: false,
    default: false,
  }),
};
