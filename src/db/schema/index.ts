export * from './auth';
export * from './governance';
export * from './marketplace';
export * from './intelligence';
export * from './inventory';
export * from './relations';

// Si tu as besoin d'un objet global pour ton client Drizzle
import * as auth from './auth';
import * as governance from './governance';
import * as marketplace from './marketplace';
import * as intelligence from './intelligence';
import * as inventory from './inventory';

export const schema = {
  ...auth,
  ...governance,
  ...marketplace,
  ...intelligence,
  ...inventory,
}