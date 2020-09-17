const logger = require('sb_logger_util_v2');
const uuid = require("uuid/v1");

const successResponse = (data) => {
  var response = {}
  response.id = data.apiId
  response.ver = data.apiVersion
  response.ts = new Date()
  response.params = getParams(data.msgid, 'successful', null, null)
  response.responseCode = data.responseCode || 'OK'
  response.result = data.result
  return response
}

const errorResponse = (data) => {
  var response = {}
  response.id = data.apiId
  response.ver = data.apiVersion
  response.ts = new Date()
  response.params = getParams(data.msgId, 'failed', data.errCode, data.errMsg)
  response.responseCode = data.responseCode
  response.result = data.result
  return response
}

const getParams = (msgId, status, errCode, msg) => {
  var params = {}
  params.resmsgid = uuid()
  params.msgid = msgId || null
  params.status = status
  params.err = errCode
  params.errmsg = msg
  return params
}


const loggerError = (msg, errCode, errMsg, responseCode, error, req) => {
  logger.error({ msg: msg, err: { errCode, errMsg, responseCode }, additionalInfo: { error } }, req)
}

module.exports = {
  successResponse,
  errorResponse,
  getParams,
  loggerError
}
