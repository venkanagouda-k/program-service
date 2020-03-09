const _ = require("lodash");
const uuid = require("uuid/v1")
  logger = require('sb_logger_util_v2')
  messageUtils = require('./messageUtil')
  respUtil = require('response_util')
  responseCode = messageUtils.RESPONSE_CODE
  programMessages = messageUtils.PROGRAM
  model = require('../models')


async function getProgram(req, response) {
  let programDetails;
  console.log(req.params)
  programDBModel.instance.program.findOneAsync(req.params, {raw: true})
  .then(function(res) {
    console.log(res);
    return response.status(200).send(successResponse({
      apiId: 'api.program.read',
      ver: '1.0',
      msgid: uuid(),
      responseCode: 'OK',
      result: res
    }))
  })
  .catch(function(err) {
      console.log(err);
  });
}

async function createProgram(req, response) {
  var data = req.body
  var rspObj = req.rspObj
  if (!data.request || !data.request.config || !data.request.type) {
    rspObj.errCode = programMessages.READ.MISSING_CODE
    rspObj.errMsg = programMessages.READ.MISSING_MESSAGE
    rspObj.responseCode = responseCode.CLIENT_ERROR
    logger.error({
      msg: 'Error due to missing request or request config or request rootOrgId or request type',
      err: {
        errCode: rspObj.errCode,
        errMsg: rspObj.errMsg,
        responseCode: rspObj.responseCode
      },
      additionalInfo: { data }
    }, req)
    return response.status(400).send(errorResponse(rspObj))
  }
  const insertObj = req.body.request;
  insertObj.program_id = uuid();
  insertObj.config = insertObj.config ? JSON.stringify(insertObj.config) : "";
  if(req.body.request.enddate){
    insertObj.enddate = req.body.request.enddate
  }

  model.program.create(insertObj).then(sc => {
    console.log("Program successfully written to DB", sc);
    return response.status(200).send(successResponse({
      apiId: 'api.program.create',
      ver: '1.0',
      msgid: uuid(),
      responseCode: 'OK',
      result: {
        'program_id': insertObj.program_id
      }
    }));
  }).catch(err => {
    console.log("Error adding Program to db", err);
    return response.status(400).send(errorResponse({
      apiId: 'api.program.create',
      ver: '1.0',
      msgid: uuid(),
      responseCode: 'ERR_CREATE_PROGRAM',
      result: err
    }));
  });
}

async function updateProgram(req, response) {
  var data = req.body
  var rspObj = req.rspObj
  if (!data.request || !data.request.program_id || !data.request.config ) {
    rspObj.errCode = programMessages.READ.MISSING_CODE
    rspObj.errMsg = programMessages.READ.MISSING_MESSAGE
    rspObj.responseCode = responseCode.CLIENT_ERROR
    // logger.error({
    //   msg: 'Error due to missing request or request config or request rootOrgId or request type',
    //   err: {
    //     errCode: rspObj.errCode,
    //     errMsg: rspObj.errMsg,
    //     responseCode: rspObj.responseCode
    //   },
    //   additionalInfo: { data }
    // }, req)
    return response.status(400).send(errorResponse(rspObj))
  }
  const updateQuery = { program_id: req.body.request.program_id };
  const updateValue = req.body.request;
  if(updateValue.config){
    updateValue.config = JSON.stringify(updateValue.config);
  }
  delete updateValue.program_id;
  programDBModel.instance.program.updateAsync(updateQuery, updateValue, {if_not_exist: true}).then(resData => {
    return response.status(200).send(successResponse({
        apiId: 'api.program.update',
        ver: '1.0',
        msgid: uuid(),
        responseCode: 'OK',
        result: {
          'program_id': updateQuery.program_id
        }
      }));
  }).catch(error => {
    console.log('ERRor in updateAsync ', error);
    return response.status(400).send(errorResponse({
      apiId: 'api.program.update',
      ver: '1.0',
      msgid: uuid(),
      responseCode: 'ERR_UPDATE_PROGRAM',
      result: error
    }));
  });
}

async function deleteProgram(req, response) {
  var data = req.body
  var rspObj = req.rspObj
  if (!data.request || !data.request.program_id ) {
    rspObj.errCode = programMessages.READ.MISSING_CODE
    rspObj.errMsg = programMessages.READ.MISSING_MESSAGE
    rspObj.responseCode = responseCode.CLIENT_ERROR
    // logger.error({
    //   msg: 'Error due to missing request or request config or request rootOrgId or request type',
    //   err: {
    //     errCode: rspObj.errCode,
    //     errMsg: rspObj.errMsg,
    //     responseCode: rspObj.responseCode
    //   },
    //   additionalInfo: { data }
    // }, req)
    return response.status(400).send(errorResponse(rspObj))
  }
  const deleteQuery = { program_id: req.body.request.program_id };
  programDBModel.instance.program.deleteAsync(deleteQuery).then(resData => {
    return response.status(200).send(successResponse({
        apiId: 'api.program.delete',
        ver: '1.0',
        msgid: uuid(),
        responseCode: 'OK',
        result: {
          'program_id': deleteQuery.program_id
        }
      }));
  }).catch(error => {
    console.log('ERRor in deleteAsync ', error);
    return response.status(400).send(errorResponse({
      apiId: 'api.program.delete',
      ver: '1.0',
      msgid: uuid(),
      responseCode: 'ERR_DELETE_PROGRAM',
      result: error
    }));
  });
}

function programList(req, response) {
  console.log(req)
}

function programAddParticipant(req, response) {
  console.log(req)
}

function programUpdateParticipant(req, response) {
  console.log(req)
}

function programSearch(req, response) {
  const fieldsToSelect = _.compact(_.split(_.get(req, 'query.fields'), ','));
  console.log(fieldsToSelect)
  const requiredKeys = ['program_id', 'type', 'name', 'description', 'image_path']
  const searchCriteria = _.uniq([...requiredKeys, ...fieldsToSelect]);
  console.log(searchCriteria)
  const searchQuery = _.get(req, 'body.request');
  console.log(searchQuery)
  programDBModel.instance.program.findAsync(searchQuery, {allow_filtering: true, select: searchCriteria, raw: true})
    .then(resData => {
      return response.status(200).send(successResponse({
        apiId: 'api.program.search',
        ver: '1.0',
        msgid: uuid(),
        responseCode: 'OK',
        result: resData
      }));
    }).catch(error => {
      return response.status(400).send(errorResponse({
        apiId: 'api.program.search',
        ver: '1.0',
        msgid: uuid(),
        responseCode: 'ERR_SEARCH_PROGRAM',
        result: error
      }));
    })

}



function successResponse (data) {
  var response = {}
  response.id = data.apiId
  response.ver = data.apiVersion
  response.ts = new Date()
  response.params = getParams(data.msgid, 'successful', null, null)
  response.responseCode = data.responseCode || 'OK'
  response.result = data.result
  return response
}

/**
 * this function create error response body.
 * @param {Object} data
 * @returns {nm$_responseUtil.errorResponse.response}
 */
function errorResponse (data) {
  var response = {}
  response.id = data.apiId
  response.ver = data.apiVersion
  response.ts = new Date()
  response.params = getParams(data.msgId, 'failed', data.errCode, data.errMsg)
  response.responseCode = data.responseCode
  response.result = data.result
  return response
}

function getParams (msgId, status, errCode, msg) {
  var params = {}
  params.resmsgid = uuid()
  params.msgid = msgId || null
  params.status = status
  params.err = errCode
  params.errmsg = msg

  return params
}

module.exports.getProgramAPI = getProgram
module.exports.createProgramAPI = createProgram
module.exports.updateProgramAPI = updateProgram
module.exports.deleteProgramAPI = deleteProgram
module.exports.programListAPI = programList
module.exports.programAddParticipantAPI = programAddParticipant
module.exports.programSearchAPI = programSearch
module.exports.programUpdateParticipantAPI = programUpdateParticipant

