export function createPushApiMethods({ apiRequest }) {
  return {
    registerExpoPushToken: async (authToken, expoPushToken, platform) => {
      if (!authToken || !expoPushToken) throw new Error('Token requis.');
      return apiRequest(
        '/api/push/register',
        {
          method: 'POST',
          body: JSON.stringify({
            token: expoPushToken,
            platform: platform || undefined,
          }),
        },
        authToken
      );
    },
    unregisterExpoPushToken: async (authToken, expoPushToken) => {
      if (!authToken || !expoPushToken) throw new Error('Token requis.');
      return apiRequest(
        '/api/push/unregister',
        {
          method: 'POST',
          body: JSON.stringify({ token: expoPushToken }),
        },
        authToken
      );
    },
  };
}
