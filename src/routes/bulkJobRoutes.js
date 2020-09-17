const jobService = require('../service/bulkJobService');
const requestMiddleware = require('../middlewares/request.middleware')

const BASE_URL = '/program/v1'

module.exports = function(app) {
  app.route(`${BASE_URL}/process/create`)
    .post(requestMiddleware.gzipCompression(), requestMiddleware.createAndValidateRequestBody,
    jobService.createJob);

  app.route(`${BASE_URL}/process/read/:process_id`)
    .get(requestMiddleware.gzipCompression(), requestMiddleware.createAndValidateRequestBody,
    jobService.readJob)

  app.route(`${BASE_URL}/process/update`)
    .patch(requestMiddleware.gzipCompression(), requestMiddleware.createAndValidateRequestBody,
    jobService.updateJob)

  app.route(`${BASE_URL}/process/search`)
    .post(requestMiddleware.gzipCompression(), requestMiddleware.createAndValidateRequestBody,
    jobService.searchJob)
}
