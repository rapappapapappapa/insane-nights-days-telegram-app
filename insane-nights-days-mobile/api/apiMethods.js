/**
 * Assemble toutes les méthodes `api.*` à partir de modules par domaine.
 */
import { createCoreAuthApiMethods } from './methods/coreAuth';
import { createEmailPasswordApiMethods } from './methods/emailPassword';
import { createProfilesApiMethods } from './methods/profiles';
import { createBookerEventsApiMethods } from './methods/bookerEvents';
import { createBookerStaffApiMethods } from './methods/bookerStaff';
import { createChatApiMethods } from './methods/chat';
import { createFeedApiMethods } from './methods/feed';
import { createAdminApiMethods } from './methods/admin';

export function createApiMethods(deps) {
  return {
    ...createCoreAuthApiMethods(deps),
    ...createEmailPasswordApiMethods(deps),
    ...createProfilesApiMethods(deps),
    ...createBookerEventsApiMethods(deps),
    ...createBookerStaffApiMethods(deps),
    ...createChatApiMethods(deps),
    ...createFeedApiMethods(deps),
    ...createAdminApiMethods(deps),
  };
}
