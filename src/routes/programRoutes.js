const programService = require('../service/programService');
const requestMiddleware = require('../middlewares/request.middleware')

const BASE_URL = '/program/v1'

module.exports = function (app) {
  app.route(BASE_URL + '/read/:program_id')
    .get(requestMiddleware.gzipCompression(), requestMiddleware.createAndValidateRequestBody,
      programService.getProgramAPI)

  app.route(BASE_URL + '/create')
    .post(requestMiddleware.gzipCompression(), requestMiddleware.createAndValidateRequestBody,
      programService.createProgramAPI)

  app.route(BASE_URL + '/update')
    .post(requestMiddleware.gzipCompression(), requestMiddleware.createAndValidateRequestBody,
      programService.updateProgramAPI)

  app.route(BASE_URL + '/delete')
    .post(requestMiddleware.gzipCompression(), requestMiddleware.createAndValidateRequestBody,
      programService.deleteProgramAPI)

  app.route(BASE_URL + '/list')
    .post(requestMiddleware.gzipCompression(), requestMiddleware.createAndValidateRequestBody,
      programService.programListAPI)

  app.route(BASE_URL + '/search')
    .post(requestMiddleware.gzipCompression(), requestMiddleware.createAndValidateRequestBody,
      programService.programSearchAPI)

  app.route(BASE_URL + '/nomination/add')
    .post(requestMiddleware.gzipCompression(), requestMiddleware.createAndValidateRequestBody,
      programService.addNominationAPI)

  app.route(BASE_URL + '/nomination/update')
    .post(requestMiddleware.gzipCompression(), requestMiddleware.createAndValidateRequestBody,
      programService.updateNominationAPI)

  app.route(BASE_URL + '/nomination/remove')
    .post(requestMiddleware.gzipCompression(), requestMiddleware.createAndValidateRequestBody,
      programService.removeNominationAPI)

  app.route(BASE_URL + '/nomination/list')
    .post(requestMiddleware.gzipCompression(), requestMiddleware.createAndValidateRequestBody,
      programService.nominationsListAPI)

  app.route(BASE_URL + '/collection/link')
    .post(requestMiddleware.gzipCompression(), requestMiddleware.createAndValidateRequestBody,
      programService.programUpdateCollectionAPI)

  app.route(BASE_URL + '/contenttypes/list')
  .get(requestMiddleware.gzipCompression(), requestMiddleware.createAndValidateRequestBody,
    programService.programGetContentTypesAPI)
}
