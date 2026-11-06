/**
 * Agrégateur des contrôleurs utilisateur (découpés par domaine dans ./user/).
 * Conserve l'API historique `require('../controllers/userController')`.
 */

module.exports = {
  ...require('./user/accountController'),
  ...require('./user/djProfileController'),
  ...require('./user/communityController'),
  ...require('./user/venueController'),
  ...require('./user/eventGroupController'),
};
