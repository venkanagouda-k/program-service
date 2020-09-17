const _ = require('lodash');
const Sequelize = require('sequelize');
const envVariables = require('../envVariables');
const logger = require('sb_logger_util_v2');
const messageUtils = require('./messageUtil');
const bulkJobRequestMessages = messageUtils.BULK_JOB_REQUEST;
const responseCode = messageUtils.RESPONSE_CODE;
const model = require('../models');
const uuid = require("uuid/v1");

const searchResult_Max = 1000;
const searchResult_Min = 300;

async function createJob(req, response) {
  let data = req.body
  const rspObj = req.rspObj
  if(!data.request || !data.request.process_id || !data.request.program_id || !data.request.type || !data.request.createdby) {
    rspObj.errCode = bulkJobRequestMessages.CREATE.MISSING_CODE;
    rspObj.errMsg = bulkJobRequestMessages.CREATE.MISSING_MESSAGE;
    rspObj.responseCode = responseCode.CLIENT_ERROR;
    loggerError('Error due to missing fields in the request', rspObj.errCode, rspObj.errMsg, rspObj.responseCode, null, req)
    return response.status(400).send(errorResponse(rspObj));
  }
  const insertObj = data.request;
  try {
    const createdResponse = await model.bulk_job_request.create(insertObj)
    rspObj.responseCode = responseCode.SUCCESS;
    rspObj.result = createdResponse;
    return response.status(200).send(successResponse(rspObj))
  }
  catch(error) {
    const sequelizeErrorMessage = _.first(_.get(error, 'errors'));
    rspObj.errCode = bulkJobRequestMessages.CREATE.FAILED_CODE;
    rspObj.errMsg = sequelizeErrorMessage ? sequelizeErrorMessage.message : error.message || bulkJobRequestMessages.CREATE.FAILED_MESSAGE;
    rspObj.responseCode = responseCode.SERVER_ERROR;
    loggerError('Error while create a new bulk_job_request', rspObj.errCode, rspObj.errMsg, rspObj.responseCode, error, req)
    return response.status(500).send(errorResponse(rspObj));
  }
}

async function readJob(req, response) {
  const rspObj = req.rspObj;
  try {
    const readResponse = await model.bulk_job_request.findOne({ where: { process_id: req.params.process_id }})
    if(!readResponse) {
      rspObj.errCode = responseCode.PROCESS_NOT_FOUND;
      rspObj.errMsg = `process_id ${req.params.process_id} does not exist`;
      rspObj.responseCode = responseCode.PROCESS_NOT_FOUND;
      loggerError(`process_id ${req.params.process_id} does not exist`, rspObj.errCode, rspObj.errMsg, rspObj.responseCode, null, req)
      return response.status(404).send(errorResponse(rspObj))
    }
    rspObj.responseCode = responseCode.SUCCESS;
    rspObj.result = readResponse;
    return response.status(200).send(successResponse(rspObj));
  } catch(error) {
    rspObj.errCode =  bulkJobRequestMessages.READ.FAILED_CODE;
    rspObj.errMsg =  error.message || bulkJobRequestMessages.READ.FAILED_MESSAGE;
    rspObj.responseCode = responseCode.SERVER_ERROR;
    loggerError('Error fetching bulk job request for the requested process_id',
    rspObj.errCode, rspObj.errMsg, rspObj.responseCode, error, req);
    return response.status(500).send(errorResponse(rspObj));
  }
}

async function updateJob(req, response) {
  let data = req.body
  const rspObj = req.rspObj
  if(!data.request || !data.request.process_id) {
    rspObj.errCode = bulkJobRequestMessages.UPDATE.MISSING_CODE;
    rspObj.errMsg = bulkJobRequestMessages.UPDATE.MISSING_MESSAGE;
    rspObj.responseCode = responseCode.CLIENT_ERROR;
    loggerError('Error updating bulk job request due to missing process_id field',
    rspObj.errCode, rspObj.errMsg, rspObj.responseCode, null, req);
    return response.status(400).send(errorResponse(rspObj));
  }

  const updateStatement = {
    where: {
      process_id: data.request.process_id
    },
    returning: true,
    individualHooks: true
  }
  const updateValue = _.cloneDeep(data.request);
  updateValue.updatedon = updateValue.updatedon || new Date();
  try {
    const updateResponse = await model.bulk_job_request.update(updateValue, updateStatement)
    if (_.isArray(updateResponse) && !updateResponse[0]) {
      rspObj.errCode = bulkJobRequestMessages.UPDATE.PROCESS_ID_MISSING_CODE;
      rspObj.errMsg = bulkJobRequestMessages.UPDATE.PROCESS_ID_FAILED_MESSAGE;
      rspObj.responseCode = responseCode.PROCESS_NOT_FOUND;
      loggerError('Unable to update job. process_id not found.',
      rspObj.errCode, rspObj.errMsg, rspObj.responseCode, null, req);
      return response.status(404).send(errorResponse(rspObj))
    }
    rspObj.responseCode = responseCode.SUCCESS;
    rspObj.result = {
      'process_id': data.request.process_id
    }
    return response.status(200).send(successResponse(rspObj))
  } catch(error) {
    rspObj.errCode = bulkJobRequestMessages.UPDATE.UPDATE_FAILED_CODE;
    rspObj.errMsg = error.message || bulkJobRequestMessages.UPDATE.UPDATE_FAILED_MESSAGE;
    rspObj.responseCode = responseCode.SERVER_ERROR;
    loggerError('Unable to update job', rspObj.errCode, rspObj.errMsg, rspObj.responseCode, error, req)
    return response.status(500).send(errorResponse(rspObj));
  }
}

async function searchJob(req, response) {
  const data = req.body;
  const rspObj = req.rspObj;
  let searchOffset = data.request.offset || 0;
  var searchLimit = searchResult_Min;
  if(data.request.limit) {
    searchLimit = (data.request.limit < searchResult_Max) ? data.request.limit : searchResult_Max;
  }
  if(!data.request || !data.request.filters) {
    rspObj.errCode = bulkJobRequestMessages.SEARCH.MISSING_CODE;
    rspObj.errMsg = bulkJobRequestMessages.SEARCH.MISSING_MESSAGE;
    rspObj.responseCode = responseCode.CLIENT_ERROR
    loggerError('Unable to search of bulk jobs', rspObj.errCode, rspObj.errMsg, rspObj.responseCode, null, req);
    return response.status(400).send(errorResponse(rspObj));
  }
  try {
    const searchResponse = await model.bulk_job_request.findAll({
      where: {
        ...data.request.filters
      },
      ...(data.request.fields && {
        attributes: data.request.fields
      }),
      offset: searchOffset,
      limit: searchLimit,
      order: [
        ['createdon', 'DESC']
      ]
    })
    const searchResponseDataValues = _.map(searchResponse, 'dataValues');
    rspObj.responseCode = responseCode.SUCCESS;
    rspObj.result = {
      count: searchResponseDataValues.length || 0,
      process: searchResponseDataValues
    };
    return response.status(200).send(successResponse(rspObj));
  } catch (error) {
    rspObj.errCode = bulkJobRequestMessages.SEARCH.FAILED_CODE;
    rspObj.errMsg = error.message || bulkJobRequestMessages.SEARCH.FAILED_MESSAGE;
    rspObj.responseCode = responseCode.SERVER_ERROR;
    loggerError('Unable to search for bulk job', rspObj.errCode, rspObj.errMsg, rspObj.responseCode, error, req);
    return response.status(500).send(errorResponse(rspObj));
  }
}


function successResponse(data) {
  var response = {}
  response.id = data.apiId
  response.ver = data.apiVersion
  response.ts = new Date()
  response.params = getParams(data.msgid, 'successful', null, null)
  response.responseCode = data.responseCode || 'OK'
  response.result = data.result
  return response
}

function errorResponse(data) {
  var response = {}
  response.id = data.apiId
  response.ver = data.apiVersion
  response.ts = new Date()
  response.params = getParams(data.msgId, 'failed', data.errCode, data.errMsg)
  response.responseCode = data.responseCode
  response.result = data.result
  return response
}

function getParams(msgId, status, errCode, msg) {
  var params = {}
  params.resmsgid = uuid()
  params.msgid = msgId || null
  params.status = status
  params.err = errCode
  params.errmsg = msg

  return params
}


function loggerError(msg, errCode, errMsg, responseCode, error, req) {
  logger.error({ msg: msg, err: { errCode, errMsg, responseCode }, additionalInfo: { error } }, req)
}


module.exports.createJob = createJob;
module.exports.updateJob = updateJob;
module.exports.readJob = readJob;
module.exports.searchJob = searchJob;
