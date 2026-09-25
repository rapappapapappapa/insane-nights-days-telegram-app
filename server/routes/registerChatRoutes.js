/**
 * Chat : agrège les sous-modules routes/chat/*.
 */
module.exports = function registerChatRoutes(app, deps) {
  require('./chat/registerChatPrivateRoutes')(app, deps);
  require('./chat/registerChatUnreadRoutes')(app, deps);
  require('./chat/registerChatGroupRoutes')(app, deps);
  require('./chat/registerChatConversationsRoutes')(app, deps);
};
