/**
 * Organisateur (booker) : agrège les sous-modules routes/booker/*.
 */
module.exports = function registerBookerOrganizerRoutes(app, deps) {
  require('./booker/registerBookerResourceRoutes')(app, deps);
  require('./booker/registerBookerStaffRoutes')(app, deps);
  require('./booker/registerBookerPaymentRoutes')(app, deps);
  require('./booker/registerBookerContractRoutes')(app, deps);
  require('./booker/registerBookerEventCrudRoutes')(app, deps);
};
