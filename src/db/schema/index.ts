export * from './auth';
export * from './governance';
export * from './marketplace';
export * from './intelligence';
export * from './relations';

// Objet global pour le client Drizzle
import * as auth from './auth';
import * as governance from './governance';
import * as marketplace from './marketplace';
import * as intelligence from './intelligence';

export const schema = {
  ...auth,
  ...governance,
  ...marketplace,
  ...intelligence,
};
