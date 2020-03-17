const _ = require("lodash");
const uuid = require("uuid/v1");
const logger = require('sb_logger_util_v2');
const messageUtils = require('./messageUtil');
const respUtil = require('response_util');
const Sequelize = require('sequelize');
const responseCode = messageUtils.RESPONSE_CODE;
const programMessages = messageUtils.PROGRAM;
const contentTypeMessages = messageUtils.CONTENT_TYPE;
const model = require('../models');
const { forkJoin }  = require('rxjs');
const axios = require('axios');
const envVariables = require('../envVariables');
const queryRes_Max = 500;
const queryRes_Min = 100;


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
    rspObj.errCode = programMessages.CREATE.MISSING_CODE
    rspObj.errMsg = programMessages.CREATE.MISSING_MESSAGE
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

function updateProgram(req, response) {
  var data = req.body
  var rspObj = req.rspObj
  if (!data.request || !data.request.program_id ) {
    rspObj.errCode = programMessages.UPDATE.MISSING_CODE
    rspObj.errMsg = programMessages.UPDATE.MISSING_MESSAGE
    rspObj.responseCode = responseCode.CLIENT_ERROR
    logger.error({
      msg: 'Error due to missing request or request program_id',
      err: {
        errCode: rspObj.errCode,
        errMsg: rspObj.errMsg,
        responseCode: rspObj.responseCode
      },
      additionalInfo: { data }
    }, req)
    return response.status(400).send(errorResponse(rspObj))
  }
  const updateQuery = {
    where: { program_id:  data.request.program_id }
  };
  const updateValue = _.cloneDeep(req.body.request);
  if (!updateValue.updatedon) {
    updateValue.updatedon = new Date();
  }
  if(updateValue.config){
    updateValue.config = JSON.stringify(updateValue.config);
  }
  model.program.update(updateValue, updateQuery).then(resData => {
    if (_.isArray(resData) && !resData[0]) {
      return response.status(400).send(errorResponse({
        apiId: 'api.program.update',
        ver: '1.0',
        msgid: uuid(),
        responseCode: 'ERR_UPDATE_PROGRAM',
        result: 'Program_id Not Found'
      }));
    }
    return response.status(200).send(successResponse({
        apiId: 'api.program.update',
        ver: '1.0',
        msgid: uuid(),
        responseCode: 'OK',
        result: {
          'program_id': updateQuery.where.program_id
        }
      }));
  }).catch(error => {
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
  var res_limit = queryRes_Min;
  if (!data.request || !data.request.filters) {
    rspObj.errCode = programMessages.READ.MISSING_CODE
    rspObj.errMsg = programMessages.READ.MISSING_MESSAGE
    rspObj.responseCode = responseCode.CLIENT_ERROR
    logger.error({
      msg: 'Error due to missing request or request.filters',
      err: {
        errCode: rspObj.errCode,
        errMsg: rspObj.errMsg,
        responseCode: rspObj.responseCode
      },
      additionalInfo: { data }
    }, req)
    return response.status(400).send(errorResponse(rspObj))
  }
  if (data.request.limit) {
  res_limit = (data.request.limit < queryRes_Max) ? data.request.limit : (queryRes_Max);
  }
  if (data.request.filters && data.request.filters.enrolled_id) {
    if (!data.request.filters.enrolled_id.user_id) {
      rspObj.errCode = programMessages.READ.MISSING_CODE
      rspObj.errMsg = programMessages.READ.MISSING_MESSAGE
      rspObj.responseCode = responseCode.CLIENT_ERROR
      logger.error({
        msg: 'Error due to missing request.filters.enrolled_id.user_id',
        err: {
          errCode: rspObj.errCode,
          errMsg: rspObj.errMsg,
          responseCode: rspObj.responseCode
        },
        additionalInfo: { data }
      }, req)
      return response.status(400).send(errorResponse(rspObj))
    }
    model.nomination.findAndCountAll({
      where: {user_id: data.request.filters.enrolled_id.user_id},
      limit: res_limit,
      include: [{
        model: model.program
      }]
    })
    .then((prg_list) => {
      return response.status(200).send(successResponse({
        apiId: 'api.program.list',
        ver: '1.0',
        msgid: uuid(),
        responseCode: 'OK',
        result: {count: prg_list.count, programs: prg_list.rows}
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
  } else {
    model.program.findAndCountAll({
      where: {...data.request.filters},
      limit: res_limit,
      order: [
        ['updatedon', 'DESC']
    ]
    })
    .then(function(res) {
      return response.status(200).send(successResponse({
        apiId: 'api.program.list',
        ver: '1.0',
        msgid: uuid(),
        responseCode: 'OK',
        result: {count: res.count, programs: res.rows}
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
}

function addNomination(req, response) {
  var data = req.body
  var rspObj = req.rspObj
  if (!data.request || !data.request.program_id || !data.request.user_id || !data.request.status) {
    rspObj.errCode = programMessages.NOMINATION.CREATE.MISSING_CODE
    rspObj.errMsg = programMessages.NOMINATION.CREATE.MISSING_MESSAGE
    rspObj.responseCode = responseCode.CLIENT_ERROR
    logger.error({
      msg: 'Error due to missing request or request program_id or request user_id or request status',
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
  var data = req.body
  var rspObj = req.rspObj
  if (!data.request || !data.request.program_id || !data.request.user_id) {
    rspObj.errCode = programMessages.NOMINATION.UPDATE.MISSING_CODE
    rspObj.errMsg = programMessages.NOMINATION.UPDATE.MISSING_MESSAGE
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
  const updateQuery = {
    where: { program_id:  data.request.program_id, user_id: data.request.user_id }
  };
  const updateValue = req.body.request;
  if (!updateValue.updatedon) {
    updateValue.updatedon = new Date();
  }
  model.nomination.update(updateValue, updateQuery).then(res => {
    if (_.isArray(res) && !res[0]) {
      return response.status(400).send(errorResponse({
        apiId: 'api.nomination.update',
        ver: '1.0',
        msgid: uuid(),
        responseCode: 'ERR_UPDATE_NOMINATION',
        result: 'Nomination Not Found'
      }));
    }
    return response.status(200).send(successResponse({
      apiId: 'api.nomination.update',
      ver: '1.0',
      msgid: uuid(),
      responseCode: 'OK',
      result: {
        'program_id': updateQuery.where.program_id,
        'user_id': updateQuery.where.user_id
      }
    }));
  }).catch(err => {
    console.log("Error updating nomination to db", err);
    return response.status(400).send(errorResponse({
      apiId: 'api.nomination.update',
      ver: '1.0',
      msgid: uuid(),
      responseCode: 'ERR_UPDATE_NOMINATION',
      result: err
    }));
  });
}

function removeNomination(req, response) {
  console.log(req)
}

function getNominationsList(req, response) {
  var data = req.body;
  var rspObj = req.rspObj;
  var res_limit = queryRes_Min;
  if (data.request.limit) {
    res_limit = (data.request.limit < queryRes_Max) ? data.request.limit : (queryRes_Max);
    }
  const findQuery = data.request.filters ? data.request.filters : {}
  if(data.request.facets) {
    const facets = data.request.facets;
    model.nomination.findAll({
      where: {...findQuery},
      attributes: [...facets, [Sequelize.fn('count', Sequelize.col(facets[0])), 'count']],
      group: [...facets]
    }).then((result) => {
      return response.status(200).send(successResponse({
        apiId: 'api.nomination.list',
        ver: '1.0',
        msgid: uuid(),
        responseCode: 'OK',
        result: result
      }))
    }).catch((err) => {
      return response.status(400).send(errorResponse({
        apiId: 'api.nomination.list',
        ver: '1.0',
        msgid: uuid(),
        responseCode: 'ERR_NOMINATION_LIST',
        result: err
      }));
    })
  }else {
    model.nomination.findAll({
      where: {...findQuery},
      limit: res_limit,
      order: [
        ['updatedon', 'DESC']
      ]
    }).then(async function(result){
     try {
      var userList = [];
      _.forEach(result, function(data){
        userList.push(data.user_id);
      })
      if(_.isEmpty(userList)){
        return response.status(200).send(successResponse({
          apiId: 'api.nomination.list',
          ver: '1.0',
          msgid: uuid(),
          responseCode: 'OK',
          result: result
        }))
      }
      const userMap = _.map(userList, user => {
        return getUsersDetails(req, user);
      })
      forkJoin(...userMap).subscribe(resData => {
        _.forEach(resData, function(data, index){
          if(data.data.result){
            result[index].dataValues.userData = data.data.result.User[0];
          }
        });
        return response.status(200).send(successResponse({
          apiId: 'api.nomination.list',
          ver: '1.0',
          msgid: uuid(),
          responseCode: 'OK',
          result: result
        }))
      }, (error) => {
        return response.status(400).send(errorResponse({
          apiId: 'api.nomination.list',
          ver: '1.0',
          msgid: uuid(),
          responseCode: 'ERR_NOMINATION_LIST',
          result: error
        }));
      });
     } catch(err) {
      return response.status(400).send(errorResponse({
        apiId: 'api.nomination.list',
        ver: '1.0',
        msgid: uuid(),
        responseCode: 'ERR_NOMINATION_LIST',
        result: err.message || err
      }));
     }
    }).catch(function(err) {
      return response.status(400).send(errorResponse({
        apiId: 'api.nomination.list',
        ver: '1.0',
        msgid: uuid(),
        responseCode: 'ERR_NOMINATION_LIST',
        result: err.message || err
      }));
    });
  }
}

function getUsersDetails(req, userId){
  const url = `${envVariables.baseURL}/content/reg/search`;
  const reqData = {
    "id": "open-saber.registry.search",
    "ver": "1.0",
    "ets": "11234",
    "params": {
      "did": "",
      "key": "",
      "msgid": ""
    },
    "request": {
       "entityType":["User"],
       "filters": {
         "userId": {"eq": userId}
       }
    }
  }
  return axios({
    method: 'post',
    url: url,
    headers: req.headers,
    data: reqData
  });
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
        result: error.message || error
      }));
    })
}

function getProgramContentTypes(req, response) {
  var rspObj = req.rspObj;
  rspObj.errCode = contentTypeMessages.FETCH.FAILED_CODE
  rspObj.errMsg = contentTypeMessages.FETCH.FAILED_MESSAGE
  rspObj.responseCode = responseCode.SERVER_ERROR
  logger.debug({ msg: 'Request to program to fetch content types'}, req)
  model.content.findAndCountAll()
  .then(res => {
    rspObj.result = {count: res.count, contentType: res.rows}
    rspObj.responseCode = 'OK'
    return response.status(200).send(successResponse(rspObj))
  }).catch(error => {
    logger.error({
      msg: 'Error fetching program content types',
      err: {
        errCode: rspObj.errCode,
        errMsg: rspObj.errMsg,
        responseCode: rspObj.responseCode
      },
      additionalInfo: { error }
    }, req)
    return response.status(400).send(errorResponse(rspObj));
  })
}

function programUpdateCollection(req, response) {
  const data = req.body
  const rspObj = req.rspObj
  const url = `${envVariables.SUNBIRD_URL}/action/system/v3/content/update`;
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
module.exports.nominationsListAPI = getNominationsList
module.exports.programGetContentTypesAPI = getProgramContentTypes
