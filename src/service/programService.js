const _ = require("lodash");
const uuid = require("uuid/v1");
const logger = require('sb_logger_util_v2');
const messageUtils = require('./messageUtil');
const respUtil = require('response_util');
const responseCode = messageUtils.RESPONSE_CODE;
const programMessages = messageUtils.PROGRAM;
const model = require('../models');
const { forkJoin }  = require('rxjs');
const axios = require('axios');


 function getProgram(req, response) {
  model.program.findOne({
    where: { program_id:  req.params.program_id }
  })
  .then(function(res) {
    return response.status(200).send(successResponse({
      apiId: 'api.program.read',
      ver: '1.0',
      msgid: uuid(),
      responseCode: 'OK',
      result: res
    }))
  })
  .catch(function(err) {
    return response.status(400).send(errorResponse({
      apiId: 'api.program.read',
      ver: '1.0',
      msgid: uuid(),
      responseCode: 'ERR_READ_PROGRAM',
      result: err
    }));
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
  var data = req.body
  var rspObj = req.rspObj
  if (!data.request || !data.request.rootorg_id) {
    rspObj.errCode = programMessages.READ.MISSING_CODE
    rspObj.errMsg = programMessages.READ.MISSING_MESSAGE
    rspObj.responseCode = responseCode.CLIENT_ERROR
    logger.error({
      msg: 'Error due to missing request or request rootorg_id',
      err: {
        errCode: rspObj.errCode,
        errMsg: rspObj.errMsg,
        responseCode: rspObj.responseCode
      },
      additionalInfo: { data }
    }, req)
    return response.status(400).send(errorResponse(rspObj))
  }
  model.program.findAll({
    where: { rootorg_id:  data.request.rootorg_id }
  })
  .then(function(res) {
    // console.log(res);
    return response.status(200).send(successResponse({
      apiId: 'api.program.list',
      ver: '1.0',
      msgid: uuid(),
      responseCode: 'OK',
      result: res
    }))
  })
  .catch(function(err) {
    return response.status(400).send(errorResponse({
      apiId: 'api.program.list',
      ver: '1.0',
      msgid: uuid(),
      responseCode: 'ERR_LIST_PROGRAM',
      result: err
    }));
  });
}

function addNomination(req, response) {
  var data = req.body
  var rspObj = req.rspObj
  if (!data.request || !data.request.program_id || !data.request.user_id) {
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

  model.nomination.create(insertObj).then(res => {
    console.log("nomination successfully written to DB", res);
    return response.status(200).send(successResponse({
      apiId: 'api.nomination.add',
      ver: '1.0',
      msgid: uuid(),
      responseCode: 'OK',
      result: {
        'program_id': insertObj.program_id,
        'user_id': insertObj.user_id,
        'id': res.dataValues.id
      }
    }));
  }).catch(err => {
    console.log("Error adding nomination to db", err);
    return response.status(400).send(errorResponse({
      apiId: 'api.nomination.add',
      ver: '1.0',
      msgid: uuid(),
      responseCode: 'ERR_CREATE_PROGRAM',
      result: err
    }));
  });
}

function updateNomination(req, response) {
  console.log(req)
}

function removeNomination(req, response) {
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

function programUpdateCollection(req, response) {
  const data = req.body
  const rspObj = req.rspObj
  const url = `https://dev.sunbirded.org/action/system/v3/content/update`;
  if (!data.request || !data.request.program_id || !data.request.collection) {
    rspObj.errCode = programMessages.LINK.MISSING_CODE
    rspObj.errMsg = programMessages.LINK.MISSING_MESSAGE
    rspObj.responseCode = responseCode.CLIENT_ERROR
    logger.error({
      msg: 'Error due to missing request or request program_id or request collections',
      err: {
        errCode: rspObj.errCode,
        errMsg: rspObj.errMsg,
        responseCode: rspObj.responseCode
      },
      additionalInfo: {
        data
      }
    }, req)
    return response.status(400).send(errorResponse(rspObj))
  }

  const updateQuery = {
    "request": {
      "content": {
        "programId": req.body.request.program_id
      }
    }
  }

  const updateUrls = _.map(req.body.request.collection, collection => {
    return axios({
      method: 'patch',
      url: `${url}/${collection}`,
      headers: req.headers,
      data: updateQuery
    });
  })
  forkJoin(updateUrls).subscribe(resData => {
    const consolidatedResult = _.map(resData, r => r.data.result)
    return response.status(200).send(successResponse({
      apiId: 'api.program.collection.link',
      ver: '1.0',
      msgid: uuid(),
      responseCode: 'OK',
      result: consolidatedResult
    }));
  }, (error) => {
    rspObj.errCode = programMessages.LINK.MISSING_CODE
    rspObj.errMsg = programMessages.LINK.MISSING_MESSAGE
    rspObj.responseCode = responseCode.RESOURCE_NOT_FOUND
    logger.error({
      msg: 'Error due to resource not found',
      err: {
        errCode: rspObj.errCode,
        errMsg: rspObj.errMsg,
        responseCode: rspObj.responseCode
      },
      additionalInfo: {
        data
      }
    }, req)

    return response.status(400).send(errorResponse({
      apiId: 'api.program.collection.link',
      ver: '1.0',
      msgId: uuid(),
      errCode: error.response.data.params.err,
      status: error.response.data.params.status,
      errMsg: error.response.data.params.errmsg,
      responseCode: error.response.data.responseCode,
      result: error.response.data.result
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
module.exports.addNominationAPI = addNomination
module.exports.programSearchAPI = programSearch
module.exports.updateNominationAPI = updateNomination
module.exports.removeNominationAPI = removeNomination
module.exports.programUpdateCollectionAPI = programUpdateCollection
