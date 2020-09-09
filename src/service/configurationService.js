const _ = require('lodash');
const logger = require('sb_logger_util_v2');
const messageUtils = require('./messageUtil');
const configurationMessages = messageUtils.CONFIGURATION;
const responseCode = messageUtils.RESPONSE_CODE;
const model = require('../models');
const uuid = require("uuid/v1");
const { async } = require('rxjs/internal/scheduler/async');



async function createConfiguration(req, response) {
  let data = req.body
  const rspObj = req.rspObj
  if(!data.request || !data.request.key || !data.request.value || !data.request.status) {
    rspObj.errCode = configurationMessages.CREATE.MISSING_CODE;
    rspObj.errMsg = configurationMessages.CREATE.MISSING_MESSAGE;
    rspObj.responseCode = responseCode.CLIENT_ERROR;
    loggerError('Error due to missing fields in the request', rspObj.errCode, rspObj.errMsg, rspObj.responseCode, null, req)
    return response.status(400).send(errorResponse(rspObj));
  }
  const insertObj = data.request;
  try {
    const createdResponse = await model.configuration.create(insertObj)
    rspObj.responseCode = responseCode.SUCCESS;
    rspObj.result = createdResponse;
    return response.status(200).send(successResponse(rspObj))
  } catch(error) {
    const sequelizeErrorMessage = _.first(_.get(error, 'errors'));
    rspObj.errCode = configurationMessages.CREATE.FAILED_CODE;
    rspObj.errMsg = sequelizeErrorMessage ? sequelizeErrorMessage.message : error.message || bulkJobRequestMessages.CREATE.FAILED_MESSAGE;
    rspObj.responseCode = responseCode.SERVER_ERROR;
    loggerError('Error while create a new bulk_job_request', rspObj.errCode, rspObj.errMsg, rspObj.responseCode, error, req)
    return response.status(500).send(errorResponse(rspObj));
  }
}


async function updateConfiguration(req, response) {
  let data = req.body;
  const rspObj = req.rspObj;
  if(!data.request || (!data.request.id && !data.request.key)) {
    rspObj.errCode = configurationMessages.UPDATE.MISSING_CODE;
    rspObj.errMsg = configurationMessages.UPDATE.MISSING_MESSAGE;
    rspObj.responseCode = responseCode.CLIENT_ERROR;
    loggerError('Error updating configuration request due to missing key field',
    rspObj.errCode, rspObj.errMsg, rspObj.responseCode, null, req);
    return response.status(400).send(errorResponse(rspObj));
  }
  const updateStatement = {
    where: {
      ...(data.request.key && {key: data.request.key}),
      ...(data.request.id && {id: data.request.id})
    },
    returning: true,
    invidualHooks: true
  }
  const updateValue = _.cloneDeep(data.request);
  updateValue.updateon = updateValue.updatedon || new Date();
  try {
    const updateResponse = await model.configuration.update(updateValue, updateStatement)
    if(_.isArray(updateResponse) && !updateResponse[0]) {
      rspObj.errCode = configurationMessages.UPDATE.PROCESS_ID_MISSING_CODE;
      rspObj.errMsg = configurationMessages.UPDATE.PROCESS_ID_FAILED_MESSAGE;
      rspObj.responseCode = responseCode.CONFIGURATION_KEY_NOT_FOUND;
      loggerError('Unable to update configuration. key not found.',
      rspObj.errCode, rspObj.errMsg, rspObj.responseCode, null, req);
      return response.status(404).send(errorResponse(rspObj))
    }
    rspObj.responseCode = responseCode.SUCCESS;
    rspObj.result = {
      'key': data.request.key
    }
    return response.status(200).send(successResponse(rspObj));
  } catch(error) {
    rspObj.errCode = configurationMessages.UPDATE.UPDATE_FAILED_CODE;
    rspObj.errMsg = error.message || configurationMessages.UPDATE.UPDATE_FAILED_MESSAGE;
    rspObj.responseCode = responseCode.SERVER_ERROR;
    loggerError('Unable to update configuration', rspObj.errCode, rspObj.errMsg, rspObj.responseCode, error, req)
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
  logger.error({ msg, err: { errCode, errMsg, responseCode }, additionalInfo: { error } }, req)
}


module.exports = {
  createConfigurationAPI: createConfiguration,
  updateConfigurationAPI: updateConfiguration
}
