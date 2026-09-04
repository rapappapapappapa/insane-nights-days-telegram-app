/**
 * Feed : agrège les sous-modules routes/feed/*.
 */
module.exports = function registerFeedRoutes(app, deps) {
  require('./feed/registerFeedPostRoutes')(app, deps);
  require('./feed/registerFollowRoutes')(app, deps);
  require('./feed/registerFeedListRoutes')(app, deps);
  require('./feed/registerFeedEngagementRoutes')(app, deps);
};
