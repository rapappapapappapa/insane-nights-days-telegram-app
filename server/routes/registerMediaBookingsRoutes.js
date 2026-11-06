/**
 * Médias & bookings : agrège les sous-modules routes/media/*.
 */
module.exports = function registerMediaBookingsRoutes(app, deps) {
  require('./media/registerMediaUploadRoutes')(app, deps);
  require('./media/registerBookingsListRoutes')(app, deps);
  require('./media/registerInvitationRoutes')(app, deps);
  require('./media/registerMediaPublicRoutes')(app, deps);
};
