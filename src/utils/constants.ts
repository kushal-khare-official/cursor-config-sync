export const EXTENSION_ID = 'cursorConfigSync';

export const COMMANDS = {
  SETUP: `${EXTENSION_ID}.setup`,
  SYNC: `${EXTENSION_ID}.sync`,
  PREVIEW: `${EXTENSION_ID}.preview`,
  SHOW_LOG: `${EXTENSION_ID}.showLog`,
} as const;

export const SECRETS = {
  PAT_KEY: `${EXTENSION_ID}.pat`,
} as const;

export const CONFIG_DIRS = ['rules', 'commands', 'skills'] as const;
