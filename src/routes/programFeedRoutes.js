const programFeedService = require('../service/programFeedService');
const requestMiddleware = require('../middlewares/request.middleware')
const requestValidator  = require('../validators/programFeedValidators')

const BASE_URL = '/program/v1'

module.exports = function(app) {
  app.route(`${BASE_URL}/feed/search`)
    .post(requestMiddleware.gzipCompression(), requestMiddleware.createAndValidateRequestBody,
    requestValidator.programFeedSearchValidator(), requestValidator.validate,
    programFeedService.searchForUpdatesAPI);
}
