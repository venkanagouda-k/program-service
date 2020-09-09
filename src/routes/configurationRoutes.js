const configurationService = require('../service/configurationService');
const requestMiddleware = require('../middlewares/request.middleware')

const BASE_URL = '/program/v1'

module.exports = function(app) {
  app.route(`${BASE_URL}/configuration/create`)
    .post(requestMiddleware.gzipCompression(), requestMiddleware.createAndValidateRequestBody,
    configurationService.createConfigurationAPI);

  app.route(`${BASE_URL}/configuration/update`)
    .patch(requestMiddleware.gzipCompression(), requestMiddleware.createAndValidateRequestBody,
    configurationService.updateConfigurationAPI)
}
