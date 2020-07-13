const _ = require("lodash");
const uuid = require("uuid/v1");
const logger = require('sb_logger_util_v2');
const SbCacheManager = require('sb_cache_manager');
const messageUtils = require('./messageUtil');
const respUtil = require('response_util');
const Sequelize = require('sequelize');
const responseCode = messageUtils.RESPONSE_CODE;
const programMessages = messageUtils.PROGRAM;
const contentTypeMessages = messageUtils.CONTENT_TYPE;
const configurationMessages = messageUtils.CONFIGURATION;
const model = require('../models');
const {
  forkJoin
} = require('rxjs');
const { catchError , map } = require('rxjs/operators');
const axios = require('axios');
const envVariables = require('../envVariables');
const RegistryService = require('./registryService')
const ProgramServiceHelper = require('../helpers/programHelper');
const RedisManager = require('../helpers/redisUtil')
const KafkaService = require('../helpers/kafkaUtil')
const publishHelper = require('../helpers/publishHelper')
var async = require('async')


const queryRes_Max = 1000;
const queryRes_Min = 300;
const HierarchyService = require('../helpers/updateHierarchy.helper');

const programServiceHelper = new ProgramServiceHelper();
const cacheManager = new SbCacheManager({ttl: envVariables.CACHE_TTL});
const cacheManager_programReport = new SbCacheManager({ttl: 86400});
const registryService = new RegistryService()
const hierarchyService = new HierarchyService()

function getProgram(req, response) {
  model.program.findOne({
      where: {
        program_id: req.params.program_id
      }
    })
    .then(function (res) {
      return response.status(200).send(successResponse({
        apiId: 'api.program.read',
        ver: '1.0',
        msgid: uuid(),
        responseCode: 'OK',
        result: res
      }))
    })
    .catch(function (err) {
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
      additionalInfo: {
        data
      }
    }, req)
    return response.status(400).send(errorResponse(rspObj))
  }
  const insertObj = req.body.request;
  insertObj.program_id = uuid();
  insertObj.config = insertObj.config ? JSON.stringify(insertObj.config) : "";
  if (req.body.request.enddate) {
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
  if (!data.request || !data.request.program_id) {
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
      additionalInfo: {
        data
      }
    }, req)
    return response.status(400).send(errorResponse(rspObj))
  }
  const updateQuery = {
    where: {
      program_id: data.request.program_id
    },
    returning: true,
    individualHooks: true
  };
  const updateValue = _.cloneDeep(req.body.request);
  if (!updateValue.updatedon) {
    updateValue.updatedon = new Date();
  }
  if (updateValue.config) {
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
  if (!data.request || !data.request.program_id) {
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
      additionalInfo: {
        data
      }
    }, req)
    return response.status(400).send(errorResponse(rspObj))
  }
  const deleteQuery = {
    program_id: req.body.request.program_id
  };
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

function getProgramCountsByOrg(req, response) {
  var data = req.body
  var rspObj = req.rspObj

  rspObj.errCode = programMessages.PROGRAMCOUNTS_BYORG.PROGRAMCOUNTS_FETCH.FAILED_CODE
  rspObj.errMsg = programMessages.PROGRAMCOUNTS_BYORG.PROGRAMCOUNTS_FETCH.FAILED_MESSAGE
  rspObj.responseCode = '';

  const findQuery = (data.request && data.request.filters) ? data.request.filters : {}
  const facets = ["rootorg_id"];
  model.program.findAll({
    where: {
      ...findQuery
    },
    attributes: [...facets, [Sequelize.fn('count', Sequelize.col(facets[0])), 'count']],
    group: [...facets]
  }).then((result) => {
      const apiRes = _.keyBy(_.map(result, 'dataValues'), 'rootorg_id');

      const orgIds = _.map(apiRes, 'rootorg_id');
      if (_.isEmpty(result) || _.isEmpty(orgIds)) {
        return response.status(200).send(successResponse(rspObj));
      }

      getOrganisationDetails(req, orgIds).then((orgData) => {
        _.forEach(orgData.data.result.response.content, function(el, index){
          el.program_count = apiRes[el.id].count;
        });
        rspObj.result = orgData.data.result.response;
        return response.status(200).send(successResponse(rspObj));
      }, (error) => {
        rspObj.responseCode = responseCode.SERVER_ERROR
        rspObj.errCode = programMessages.PROGRAMCOUNTS_BYORG.ORGSEARCH.FAILED_CODE
        rspObj.errMsg = programMessages.PROGRAMCOUNTS_BYORG.ORGSEARCH.FAILED_MESSAGE
        loggerError(rspObj.errMsg, rspObj.errCode, rspObj.errMsg, error.response.data.responseCode, data, req)
        rspObj.result = err;
        return response.status(400).send(errorResponse(rspObj));
      })
  }).catch((err) => {
    rspObj.responseCode = responseCode.SERVER_ERROR
    loggerError('Error fetching program count group by facets',
    rspObj.errCode, rspObj.errMsg, rspObj.responseCode, err, req);
    return response.status(400).send(errorResponse(rspObj));
  });
}

 /* Get the org details by filters*/
 function getOrganisationDetails(req, orgList) {
  const url = `${envVariables.baseURL}/api/org/v1/search`;
  const reqData = {
    "request": {
      "filters": {
        "id": orgList,
        "status": 1,
        "isRootOrg": true
      },
      "fields": ["id", "slug", "orgName", "orgCode", "imgUrl"]
    }
  }
  return axios({
    method: 'post',
    url: url,
    headers: req.headers,
    data: reqData
  });
}

function programList(req, response) {
  var data = req.body
  var rspObj = req.rspObj
  var res_limit = queryRes_Min;
  var res_offset = data.request.offset || 0;
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
      additionalInfo: {
        data
      }
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
        additionalInfo: {
          data
        }
      }, req)
      return response.status(400).send(errorResponse(rspObj))
    }
    model.nomination.findAndCountAll({
        where: {
          user_id: data.request.filters.enrolled_id.user_id
        },
        offset: res_offset,
        limit: res_limit,
        include: [{
          model: model.program
        }],
        order: [
          ['updatedon', 'DESC']
        ]
      })
      .then((prg_list) => {
        return response.status(200).send(successResponse({
          apiId: 'api.program.list',
          ver: '1.0',
          msgid: uuid(),
          responseCode: 'OK',
          result: {
            count: prg_list.count,
            programs: prg_list.rows
          }
        }))
      })
      .catch(function (err) {
        return response.status(400).send(errorResponse({
          apiId: 'api.program.list',
          ver: '1.0',
          msgid: uuid(),
          responseCode: 'ERR_LIST_PROGRAM',
          result: err
        }));
      });
  } else if (data.request.filters && data.request.filters.role && data.request.filters.user_id) {
    const promises = [];
    _.forEach(data.request.filters.role, (role) => {
       promises.push(
        model.program.findAndCountAll({
        where:{
          $contains: Sequelize.literal(`cast(rolemapping->>'${role}' as text) like ('%${data.request.filters.user_id}%')`)
        },
        offset: res_offset,
        limit: res_limit,
        order: [
          ['updatedon', 'DESC']
        ]
      })
      )
    })
    Promise.all(promises)
    .then(function (res) {
      let aggregatedRes = [];
      _.forEach(res, (response) => {
        _.forEach(response.rows, row => aggregatedRes.push(row));
      })
      aggregatedRes = _.uniqBy(aggregatedRes, 'dataValues.program_id');
      return response.status(200).send(successResponse({
        apiId: 'api.program.list',
        ver: '1.0',
        msgid: uuid(),
        responseCode: 'OK',
        result: {
          count: aggregatedRes.length,
          programs: aggregatedRes
        }
      }))
    })
    .catch(function (err) {
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
        where: {
          ...data.request.filters
        },
        offset: res_offset,
        limit: res_limit,
        order: [
          ['updatedon', 'DESC']
        ]
      })
      .then(function (res) {
        return response.status(200).send(successResponse({
          apiId: 'api.program.list',
          ver: '1.0',
          msgid: uuid(),
          responseCode: 'OK',
          result: {
            count: res.count,
            programs: res.rows
          }
        }))
      })
      .catch(function (err) {
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
      additionalInfo: {
        data
      }
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
  if (!data.request || !data.request.program_id || !(data.request.user_id || data.request.organisation_id)) {
    rspObj.errCode = programMessages.NOMINATION.UPDATE.MISSING_CODE
    rspObj.errMsg = programMessages.NOMINATION.UPDATE.MISSING_MESSAGE
    rspObj.responseCode = responseCode.CLIENT_ERROR
    logger.error({
      msg: 'Error due to missing request and request program_id and request user_id or organisation_id',
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
    where: {
      program_id: data.request.program_id
    },
    returning: true,
    individualHooks: true
  };
  if(data.request.user_id){
    updateQuery.where.user_id = data.request.user_id
  }
  if(data.request.organisation_id){
    updateQuery.where.organisation_id = data.request.organisation_id
  }
  if(data.request.id){
    updateQuery.where.id =  data.request.id
  }
  var updateValue = req.body.request;
  updateValue = _.omit(updateValue, [
    "id",
    "program_id",
    "user_id",
    "organisation_id"
  ]);
  updateValue.updatedon = new Date();
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
    const successRes = {
      program_id: updateQuery.where.program_id,
    };
    if(updateQuery.where.user_id){
      successRes.user_id = updateQuery.where.user_id
    }
    if(updateQuery.where.organisation_id){
      successRes.organisation_id = updateQuery.where.organisation_id
    }

    return response.status(200).send(successResponse({
      apiId: 'api.nomination.update',
      ver: '1.0',
      msgid: uuid(),
      responseCode: 'OK',
      result: successRes
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
  var res_offset = data.request.offset || 0;
  rspObj.errCode = programMessages.NOMINATION.LIST.FAILED_CODE
  rspObj.errMsg = programMessages.NOMINATION.LIST.FAILED_MESSAGE
  rspObj.responseCode = responseCode.SERVER_ERROR
  if (data.request.limit) {
    res_limit = (data.request.limit < queryRes_Max) ? data.request.limit : (queryRes_Max);
  }
  const findQuery = data.request.filters ? data.request.filters : {}
  if (data.request.facets) {
    const facets = data.request.facets;
    model.nomination.findAll({
      where: {
        ...findQuery
      },
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
      loggerError('Error fetching nomination count group by facets',
      rspObj.errCode, rspObj.errMsg, rspObj.responseCode, err, req);
      return response.status(400).send(errorResponse(rspObj));
    })
  }else if (data.request.limit === 0) {
    model.nomination.findAll({
      where: {
        ...findQuery
      },
      attributes: [...data.request.fields || []]
    }).then(async (result) => {
      let aggregatedRes = await aggregatedNominationCount(data, result);

      return response.status(200).send(successResponse({
        apiId: 'api.nomination.list',
        ver: '1.0',
        msgid: uuid(),
        responseCode: 'OK',
        result: aggregatedRes
      }))
    }).catch((err) => {
      loggerError('Error fetching nomination count when limit = 0',
      rspObj.errCode, rspObj.errMsg, rspObj.responseCode, err, req);
      return response.status(400).send(errorResponse(rspObj));
    })
  } else {
    model.nomination.findAll({
      where: {
        ...findQuery
      },
      offset: res_offset,
      limit: res_limit,
      order: [
        ['updatedon', 'DESC']
      ]
    }).then(async function (result) {
      try {
        var userList = [];
        var orgList = [];
        _.forEach(result, function (data) {
          userList.push(data.user_id);

          if (data.organisation_id) {
            orgList.push(data.organisation_id);
          }
        })
        if (_.isEmpty(userList)) {
          return response.status(200).send(successResponse({
            apiId: 'api.nomination.list',
            ver: '1.0',
            msgid: uuid(),
            responseCode: 'OK',
            result: result
          }))
        }

        forkJoin(getUsersDetails(req, userList), getOrgDetails(req, orgList)).subscribe((resData) => {
          _.forEach(resData, function (data) {
            if (data.data.result && !_.isEmpty(_.get(data, 'data.result.User'))) {
              _.forEach(data.data.result.User, (userData) => {
                const index = _.indexOf(_.map(result, 'user_id'), userData.userId)
                if (index !== -1) {
                  result[index].dataValues.userData = userData;
                }
              })
            }
            if (data.data.result && !_.isEmpty(_.get(data, 'data.result.Org'))) {
              _.forEach(data.data.result.Org, (orgData) => {
                const index = _.indexOf(_.map(result, 'organisation_id'), orgData.osid)
                if (index !== -1) {
                result[index].dataValues.orgData = orgData;
                }
              })
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
          loggerError('Error in fetching user/org details',
          rspObj.errCode, rspObj.errMsg, rspObj.responseCode, error, req);
          return response.status(400).send(errorResponse(rspObj));
        });
      } catch (err) {
        loggerError('Error fetching nomination with limit and offset',
          rspObj.errCode, rspObj.errMsg, rspObj.responseCode, err, req);
          return response.status(400).send(errorResponse(rspObj));
      }
    }).catch(function (err) {
      loggerError('Error fetching nomination with limit and offset',
          rspObj.errCode, rspObj.errMsg, rspObj.responseCode, err, req);
          return response.status(400).send(errorResponse(rspObj));
    });
  }
}

async function downloadProgramDetails(req, res) {
  const data = req.body
  const rspObj = req.rspObj
  let programArr = [], promiseRequests = [], cacheData = [], filteredPrograms = [];
  rspObj.errCode = programMessages.GENERATE_DETAILS.FAILED_CODE
  rspObj.errMsg = programMessages.GENERATE_DETAILS.FAILED_MESSAGE
  rspObj.responseCode = responseCode.SERVER_ERROR
  if (!data.request || !data.request.filters || !data.request.filters.program_id) {
    rspObj.errCode = programMessages.GENERATE_DETAILS.MISSING_CODE
    rspObj.errMsg = programMessages.GENERATE_DETAILS.MISSING_MESSAGE
    rspObj.responseCode = responseCode.CLIENT_ERROR
      loggerError('Error due to missing request or request.filters or request.filters.program_id',
        rspObj.errCode, rspObj.errMsg, rspObj.responseCode, null, req)
    return res.status(400).send(errorResponse(rspObj));
  }
  programArr = _.isArray(data.request.filters.program_id) ? data.request.filters.program_id : [];
  await _.forEach(programArr, (program) => {
    cacheManager.get(`program_details_${program}`, (err, cache) => {
      if (err || !cache) {
        filteredPrograms.push(program);
      } else {
        cacheData.push(cache);
      }
    });
  });

  if (filteredPrograms.length) {
  promiseRequests =  _.map(filteredPrograms, (program) => {
    return [programServiceHelper.getCollectionWithProgramId(program, req), programServiceHelper.getSampleContentWithProgramId(program, req),
                programServiceHelper.getContributionWithProgramId(program, req), programServiceHelper.getNominationWithProgramId(program)];
  });

    forkJoin(..._.flatMapDeep(promiseRequests)).subscribe((responseData) => {
    try{
    const combainedRes = _.chunk(responseData, 4);
    const programDetailsArray = programServiceHelper.handleMultiProgramDetails(combainedRes);
    const tableData  = _.reduce(programDetailsArray, (final, data, index) => {
    final.push({program_id: filteredPrograms[index], values: data});
    return final;
    }, []);
    _.forEach(tableData, (obj) => {
      cacheManager.set({ key: `program_details_${obj.program_id}`, value: obj },
      function (err, cacheCSVData) {
        if (err) {
          logger.error({msg: 'Error - caching', err, additionalInfo: {programDetails: obj}}, req)
        } else {
          logger.debug({msg: 'Caching nomination list - done', additionalInfo: {nominationData: obj}}, req)
        }
    });
    });
    rspObj.result = {
      tableData: [...tableData, ...cacheData]
    }
    rspObj.responseCode = 'OK'
    return res.status(200).send(successResponse(rspObj));
  } catch (err) {
    loggerError('Error due to unhandled exception',
      rspObj.errCode, rspObj.errMsg, rspObj.responseCode, err, req)
    return res.status(400).send(errorResponse(rspObj));
  }
    }, (err) => {
      loggerError('Error http requests or nomination table query promise failure',
        rspObj.errCode, rspObj.errMsg, rspObj.responseCode, err, req)
      return res.status(400).send(errorResponse(rspObj));
    });
  }else {
    rspObj.result = {
      tableData: [...cacheData]
    }
    rspObj.responseCode = 'OK'
    return res.status(200).send(successResponse(rspObj));
  }
}

function aggregatedNominationCount(data, result) {
  return new Promise((resolve, reject) => {
    try {
     let aggregatedRes = {}
     aggregatedRes['nomination'] = { count: result.length }
     const groupData =  _.reduce(result, (final, instance) => {
        _.forEach(data.request.fields, (field) => {
          field !== 'status' ?
            final[field] = _.compact(_.uniq(_.flattenDeep([...final[field] || [], instance[field]]))) :
               final[field] = [...final[field] || [], instance[field]];
        });
        return final;
     }, {});
     aggregatedRes.nomination['fields'] = _.map(data.request.fields, (field) => {
       const obj = {name: field};
       if (field === 'status') {
         obj['fields'] = {}
         const temp = _.groupBy(groupData[field]);
         _.mapKeys(temp, (val, key) => {
           obj.fields[key] = val.length
         })
       }else {
         obj['count'] = groupData[field].length;
       }
       return obj;
     })
     resolve(aggregatedRes);
    } catch(err) {
      reject(err);
    }
  })
 }

 function downloadNominationList(req, response) {
  var data = req.body;
  var rspObj = req.rspObj;
  rspObj.errCode = programMessages.NOMINATION.DOWNLOAD_LIST.MISSING_CODE;
  rspObj.errMsg = programMessages.NOMINATION.DOWNLOAD_LIST.MISSING_MESSAGE;
  rspObj.responseCode = responseCode.CLIENT_ERROR;
  if(!data || !data.request || !data.request.filters || !data.request.filters.program_id || !data.request.filters.program_name || !data.request.filters.status) {
    loggerError('Error due to missing request or program_id, status or program_name',
    rspObj.errCode, rspObj.errMsg, rspObj.responseCode, null, req)
    return response.status(400).send(errorResponse(rspObj))
  }
  const reqHeaders = req.headers;
  const findQuery = data.request.filters ? data.request.filters : {};
  cacheManager.get(findQuery.program_id, (err, cacheData) => {
    if(err || !cacheData) {
      model.nomination.findAll({
        where: {
          ..._.omit(findQuery, ["program_name"])
        },
        offset: 0,
        limit: 1000,
        order: [
          ['updatedon', 'DESC']
        ]
      }).then((result) => {
        try {
          let userList = [];
          let orgList = [];
          let relatedContents = [];
          let nominationSampleCounts = {};
          _.forEach(result, r => {
            userList.push(r.user_id);
            if(r.organisation_id) {
              orgList.push(r.organisation_id);
            }
          })
          if(_.isEmpty(userList)) {
            rspObj.result = {
              stats: []
            }
            rspObj.responseCode = 'OK'
            return response.status(200).send(successResponse(rspObj))
          }
          forkJoin(programServiceHelper.searchContent(findQuery.program_id, true, reqHeaders),
          getUsersDetails(req, userList), getOrgDetails(req, orgList))
            .subscribe(
              (promiseData) => {
                const contentResult = _.first(promiseData);
                if (contentResult && contentResult.data && contentResult.data.result && contentResult.data.result.content) {
                      const contents = _.get(contentResult, 'data.result.content');
                      relatedContents = contents;
                }
                nominationSampleCounts = programServiceHelper.setNominationSampleCounts(relatedContents);
                  const userAndOrgResult = _.tail(promiseData, 2);
                  debugger
                _.forEach(userAndOrgResult, function (data) {
                  if (data.data.result && !_.isEmpty(_.get(data, 'data.result.User'))) {
                    _.forEach(data.data.result.User, (userData) => {
                      const index = _.indexOf(_.map(result, 'user_id'), userData.userId)
                      if (index !== -1) {
                        result[index].dataValues.userData = userData;
                      }
                    })
                  }
                  if (data.data.result && !_.isEmpty(_.get(data, 'data.result.Org'))) {
                    _.forEach(data.data.result.Org, (orgData) => {
                      const index = _.indexOf(_.map(result, 'organisation_id'), orgData.osid)
                      if (index !== -1) {
                      result[index].dataValues.orgData = orgData;
                      }
                    })
                  }
                });
                const dataValues = _.map(result, 'dataValues')
                const nominationsWithSamples = programServiceHelper.assignSampleCounts(dataValues, nominationSampleCounts, findQuery.program_name);
                const tableData = programServiceHelper.downloadNominationList(nominationsWithSamples)
                cacheManager.set({ key: findQuery.program_id, value: tableData },
                  function (err, cacheCSVData) {
                    if (err) {
                      logger.error({msg: 'Error - caching', err, additionalInfo: {stats: tableData}}, req)
                    } else {
                      logger.debug({msg: 'Caching nomination list - done', additionalInfo: {stats: cacheCSVData}}, req)
                    }
                })
                rspObj.result = {
                  stats: tableData
                }
                rspObj.responseCode = 'OK'
                return response.status(200).send(successResponse(rspObj))
              },
              (error) => {
                rspObj.errCode = _.get(error, 'response.statusText');
                rspObj.errMsg = _.get(error, 'response.data.message');
                rspObj.responseCode = responseCode.UNAUTHORIZED_ACCESS;
                loggerError('Error fetching user or org details while downloading nomination list',
                rspObj.errCode, rspObj.errMsg, rspObj.responseCode, error, null)
                return response.status(400).send(errorResponse(rspObj))
              }
            )
        } catch(error) {
          rspObj.errCode = _.get(error, 'name');
          rspObj.errMsg = _.get(error, 'message');
          rspObj.responseCode = responseCode.SERVER_ERROR;
          loggerError('Error fetching nomination list',
            rspObj.errCode, rspObj.errMsg, rspObj.responseCode, error, req)
          return response.status(400).send(errorResponse(rspObj))
        }
      }).catch(error => {
        rspObj.errCode = programMessages.NOMINATION.DOWNLOAD_LIST.QUERY_FAILED_CODE;
        rspObj.errMsg = programMessages.NOMINATION.DOWNLOAD_LIST.QUERY_FAILED_MESSAGE;
        rspObj.responseCode = responseCode.SERVER_ERROR;
        loggerError('Error fetching nomination list',
          rspObj.errCode, rspObj.errMsg, rspObj.responseCode, error, req)
        return response.status(400).send(errorResponse(rspObj))
      })
    }
    else {
      rspObj.result = {
        stats: cacheData
      }
      rspObj.responseCode = 'OK'
      return response.status(200).send(successResponse(rspObj))
    }
  })
}

function getUsersDetails(req, userList) {
  const url = `${envVariables.OPENSABER_SERVICE_URL}/search`;
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
      "entityType": ["User"],
      "filters": {
        "userId": {
          "or": userList
        }
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


function getOrgDetails(req, orgList) {
  const url = `${envVariables.OPENSABER_SERVICE_URL}/search`;
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
      "entityType": ["Org"],
      "filters": {
        "osid": {
          "or": orgList
        }
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

function getUsersDetailsById(req, response) {

  const dikshaUserId = req.params.user_id
  async.waterfall([
    function (callback1) {
      getUserDetailsFromRegistry(dikshaUserId, callback1)
    },
    function (user, callback2) {
      getUserOrgMappingDetailFromRegistry(user, callback2);
    },
    function (user, userOrgMapDetails, callback3) {
      getOrgDetailsFromRegistry(user, userOrgMapDetails, callback3)
    },
    function (user, userOrgMapDetails, orgInfoLists, callback4) {
      createUserRecords(user, userOrgMapDetails, orgInfoLists, callback4)
    }
  ], function (err, res) {
    if (err) {
      return response.status(400).send(errorResponse({
        apiId: 'api.user.read',
        ver: '1.0',
        msgid: uuid(),
        responseCode: 'ERR_READ_USER',
        result: err.message || err
      }))

    } else {
      return response.status(200).send(successResponse({
        apiId: 'api.user.read',
        ver: '1.0',
        msgid: uuid(),
        responseCode: 'OK',
        result: res
      }))
    }
  });
}

function getUserDetailsFromRegistry(value, callback) {
  let userDetailReq = {
    body: {
      id: "open-saber.registry.search",
      request: {
        entityType: ["User"],
        filters: {
          userId: {
            eq: value
          }
        }

      }
    }
  }

  registryService.searchRecord(userDetailReq, (err, res) => {
    if (res) {
      if (res.status == 200) {
        if (res.data.result.User.length > 0) {
          var userDetails = res.data.result.User[0];
          callback(null, userDetails)
        } else {
          callback("user does not exist")
        }
      } else {
        logger.error("Encountered some error while searching data")
        callback("Encountered some error while searching data")
      }
    } else {
      logger.error("Encountered some error while searching data")
      callback("Encountered some error while searching data")
    }
  });

}


function getUserOrgMappingDetailFromRegistry(user, callback) {

  let userOrgMappingReq = {
    body: {
      id: "open-saber.registry.search",
      request: {
        entityType: ["User_Org"],
        filters: {
          userId: {
            eq: user.osid
          }
        }

      }
    }
  }

  registryService.searchRecord(userOrgMappingReq, (err, res) => {
    if (res) {
      if (res.status == 200) {
        if (res.data.result.User_Org.length > 0) {
          userOrgMapList = res.data.result.User_Org
          callback(null, user, userOrgMapList)
        } else {
          callback("Org not mapped to the user: " + user.userId)
        }
      } else {
        logger.error("Encountered some error while searching data")
        callback("Encountered some error while searching data")
      }
    } else {
      logger.error("Encountered some error while searching data")
      callback("Encountered some error while searching data")
    }
  });

}

function getOrgDetailsFromRegistry(user, userOrgMapDetails, callback) {

  const orgList = userOrgMapDetails.map((value) => value.orgId.slice(2))

  let orgDetailsReq = {
    body: {
      id: "open-saber.registry.search",
      request: {
        entityType: ["Org"],
        filters: {
          osid: {
            or: orgList
          }
        }

      }
    }
  }

  registryService.searchRecord(orgDetailsReq, (err, res) => {
    if (res) {
      if (res.status == 200) {
        if (res.data.result.Org.length > 0) {
          orgInfoList = res.data.result.Org
          callback(null, user, userOrgMapList, orgInfoList)
        } else {
          callback("Org Details Not available with org Ids: " + orgList.toString())
        }
      } else {
        logger.error("Encountered some error while searching data")
        callback("Encountered some error while searching data")
      }
    } else {
      logger.error("Encountered some error while searching data")
      callback("Encountered some error while searching data")
    }
  });

}

function createUserRecords(user, userOrgMapDetails, orgInfoList, callback) {

  try {
    orgInfoList.map((org) => {
      var roles = null
      userOrgMapDetails.forEach(function (element, index, array) {
        if (org.osid === element.orgId) {
          roles = element.roles;
        }
      });

      org['roles'] = roles

    });

    user['orgs'] = orgInfoList
    callback(null, user)

  } catch (e) {
    logger.error("Error while parsing for user lists")
    callback("Some Internal processing error while parsing user details", null)
  }


}





function programSearch(req, response) {
  const fieldsToSelect = _.compact(_.split(_.get(req, 'query.fields'), ','));
  const requiredKeys = ['program_id', 'type', 'name', 'description', 'image_path']
  const searchCriteria = _.uniq([...requiredKeys, ...fieldsToSelect]);
  const searchQuery = _.get(req, 'body.request');
  programDBModel.instance.program.findAsync(searchQuery, {
      allow_filtering: true,
      select: searchCriteria,
      raw: true
    })
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
  logger.debug({
    msg: 'Request to program to fetch content types'
  }, req)
  model.contenttypes.findAndCountAll()
    .then(res => {
      rspObj.result = {
        count: res.count,
        contentType: res.rows
      }
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
        additionalInfo: {
          error
        }
      }, req)
      return response.status(400).send(errorResponse(rspObj));
    })
}

function getAllConfigurations(req, response) {
  var rspObj = req.rspObj;
  rspObj.errCode = configurationMessages.FETCH.FAILED_CODE
  rspObj.errMsg = configurationMessages.FETCH.FAILED_MESSAGE
  rspObj.responseCode = configurationMessages.SERVER_ERROR
  logger.debug({
    msg: 'Request to fetch program configuration'
  }, req)

  model.configuration.findAndCountAll()
    .then(res => {
      rspObj.result = {
        count: res.count,
        configuration: res.rows
      }
      rspObj.responseCode = 'OK'
      return response.status(200).send(successResponse(rspObj))
    }).catch(error => {
      loggerError('Error fetching program configurations',
      rspObj.errCode, rspObj.errMsg, rspObj.responseCode, error, req);
      return response.status(400).send(errorResponse(rspObj));
    })
}

function getConfigurationByKey(req, response) {
  var rspObj = req.rspObj;
  var data = req.body;
  if(!data || !data.request || !data.request.key  || !data.request.status) {
    rspObj.errCode = configurationMessages.SEARCH.MISSING_CODE
    rspObj.errMsg = configurationMessages.SEARCH.MISSING_MESSAGE
    rspObj.responseCode = responseCode.CLIENT_ERROR
    loggerError('Error due to missing request or request key or status',
    rspObj.errCode, rspObj.errMsg, rspObj.responseCode, null, req)
    return response.status(400).send(errorResponse(rspObj))
  }
  rspObj.errCode = configurationMessages.FETCH.FAILED_CODE
  rspObj.errMsg = configurationMessages.FETCH.FAILED_MESSAGE
  rspObj.responseCode = configurationMessages.SERVER_ERROR
  logger.debug({
    msg: 'Request to fetch program configuration'
  }, req)

  model.configuration.findAll({
    where: {
      key: data.request.key,
      status: data.request.status
    }
  })
    .then(res => {
      const result = _.first(res)
      rspObj.result = {
        configuration: result ? result.dataValues : []
      }
      rspObj.responseCode = 'OK'
      return response.status(200).send(successResponse(rspObj))
    }).catch(error => {
      loggerError('Error fetching program configurations',
      rspObj.errCode, rspObj.errMsg, rspObj.responseCode, error, req);
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

async function programCopyCollections(req, response) {
  const data = req.body;
  const rspObj = req.rspObj;
  const reqHeaders = req.headers;

  if (!data.request || !data.request.program_id || !data.request.collections || !data.request.allowed_content_types || !data.request.channel) {
    rspObj.errCode = programMessages.COPY_COLLECTION.COPY.MISSING_CODE;
    rspObj.errMsg = programMessages.COPY_COLLECTION.COPY.MISSING_MESSAGE;
    rspObj.responseCode = responseCode.CLIENT_ERROR;
    loggerError('Error due to missing request or program_id or request collections or request allowed_content_types or channel',
    rspObj.errCode, rspObj.errMsg, rspObj.responseCode, null, req )
    return response.status(400).send(errorResponse(rspObj))
  }

  const collections = _.get(data, 'request.collections');
  const collectionIds = _.map(collections, 'id');
  const additionalMetaData = {
    programId: _.get(data, 'request.program_id'),
    allowedContentTypes: _.get(data, 'request.allowed_content_types'),
    channel: _.get(data, 'request.channel'),
    openForContribution: false
  }

  hierarchyService.filterExistingTextbooks(collectionIds, reqHeaders)
    .subscribe(
      (resData) => {
        const consolidatedResult = _.map(resData, r => {
          return {
            result: r.data.result,
            config: r.config.data
          }
        })

        const existingTextbooks = hierarchyService.getExistingCollection(consolidatedResult);
        const nonExistingTextbooks = hierarchyService.getNonExistingCollection(consolidatedResult)

        if (existingTextbooks && existingTextbooks.length > 0) {
          hierarchyService.getHierarchy(existingTextbooks, reqHeaders)
            .subscribe(
              (originHierarchyResult) => {
                const originHierarchyResultData = _.map(originHierarchyResult, r => {
                  return _.get(r, 'data')
                })
                const getCollectiveRequest = _.map(originHierarchyResultData, c => {
                  let children = [];
                  const cindex = collections.findIndex(r => r.id === c.hierarchy.content.identifier);

                  if (cindex !== -1) {
                    children = collections[cindex].children;
                  }

                  return hierarchyService.existingHierarchyUpdateRequest(c, additionalMetaData, children);
                })
                hierarchyService.bulkUpdateHierarchy(getCollectiveRequest, reqHeaders)
                  .subscribe(updateResult => {
                    const updateResultData = _.map(updateResult, obj => {
                      return obj.data
                    })
                    rspObj.result = updateResultData;
                    rspObj.responseCode = 'OK'
                    response.status(200).send(successResponse(rspObj))
                  }, error => {
                    rspObj.errCode = programMessages.COPY_COLLECTION.BULK_UPDATE_HIERARCHY.FAILED_CODE;
                      rspObj.errMsg = programMessages.COPY_COLLECTION.BULK_UPDATE_HIERARCHY.FAILED_MESSAGE;
                      rspObj.responseCode = responseCode.SERVER_ERROR
                      console.log('Error updating hierarchy for collections', error)
                    loggerError('Error updating hierarchy for collections', rspObj.errCode, rspObj.errMsg, rspObj.responseCode, error, req)
                    return response.status(400).send(errorResponse(rspObj))
                  })
              }, error => {
                rspObj.errCode = programMessages.COPY_COLLECTION.GET_HIERARCHY.FAILED_CODE;
                  rspObj.errMsg = programMessages.COPY_COLLECTION.GET_HIERARCHY.FAILED_MESSAGE;
                  rspObj.responseCode = responseCode.SERVER_ERROR
                  console.log('Error fetching hierarchy for collections', error)
                loggerError('Error fetching hierarchy for collections', rspObj.errCode, rspObj.errMsg, rspObj.responseCode, error, req)
                return response.status(400).send(errorResponse(rspObj))
              })
        }
        if (nonExistingTextbooks && nonExistingTextbooks.length > 0) {
          hierarchyService.getHierarchy(nonExistingTextbooks, reqHeaders)
            .subscribe(
              (originHierarchyResult) => {
                const originHierarchyResultData = _.map(originHierarchyResult, r => {
                  return _.get(r, 'data')
                })

                hierarchyService.createCollection(originHierarchyResultData, reqHeaders)
                  .subscribe(createResponse => {
                    const originHierarchy = _.map(originHierarchyResultData, 'result.content');

                    const createdCollections = _.map(createResponse, cr => {
                      const mapOriginalHierarchy = {
                        creationResult: cr.data,
                        hierarchy: {
                          ...JSON.parse(cr.config.data).request
                        },
                        originHierarchy: {
                          content: _.find(originHierarchy, {
                            identifier: cr.config.params.identifier
                          })
                        }
                      }
                      mapOriginalHierarchy.hierarchy.content.identifier = cr.config.params.identifier
                      return mapOriginalHierarchy;
                    })
                    const getBulkUpdateRequest = _.map(createdCollections, item => {
                      let children = [];
                      const cindex = collections.findIndex(r => r.id === item.hierarchy.content.identifier);

                      if (cindex !== -1) {
                        children = collections[cindex].children;
                      }

                      return hierarchyService.newHierarchyUpdateRequest(item, additionalMetaData, children)
                    })

                    hierarchyService.bulkUpdateHierarchy(getBulkUpdateRequest, reqHeaders)
                      .subscribe(updateResult => {
                        const updateResultData = _.map(updateResult, obj => {
                          return obj.data
                        })
                        rspObj.result = updateResultData;
                        rspObj.responseCode = 'OK'
                        response.status(200).send(successResponse(rspObj))
                      }, error => {
                        rspObj.errCode = _.get(error.response, 'data.params.err') || programMessages.COPY_COLLECTION.BULK_UPDATE_HIERARCHY.FAILED_CODE;
                        rspObj.errMsg = _.get(error.response, 'data.params.errmsg') || programMessages.COPY_COLLECTION.BULK_UPDATE_HIERARCHY.FAILED_MESSAGE;
                        rspObj.responseCode = _.get(error.response, 'data.responseCode') || responseCode.SERVER_ERROR
                        console.log('Error updating hierarchy for collections', error)
                        loggerError('Error updating hierarchy for collections', rspObj.errCode, rspObj.errMsg, rspObj.responseCode, error, req)
                        return response.status(400).send(errorResponse(rspObj))
                      })
                  }, error => {
                    rspObj.errCode = _.get(error.response, 'data.params.err') || programMessages.COPY_COLLECTION.CREATE_COLLECTION.FAILED_CODE;
                    rspObj.errMsg = _.get(error.response, 'data.params.errmsg') || programMessages.COPY_COLLECTION.CREATE_COLLECTION.FAILED_MESSAGE;
                    rspObj.responseCode = _.get(error.response, 'data.responseCode') || responseCode.SERVER_ERROR
                    console.log('Error creating collection', error)
                    loggerError('Error creating collection', rspObj.errCode, rspObj.errMsg, rspObj.responseCode, error, req)
                    return response.status(400).send(errorResponse(rspObj))
                  })
              }, (error) => {
                rspObj.errCode = programMessages.COPY_COLLECTION.GET_HIERARCHY.FAILED_CODE;
                rspObj.errMsg = programMessages.COPY_COLLECTION.GET_HIERARCHY.FAILED_MESSAGE;
                rspObj.responseCode = responseCode.SERVER_ERROR
                console.log('Error fetching hierarchy for collections', error)
                loggerError('Error fetching hierarchy for collections', rspObj.errCode, rspObj.errMsg, rspObj.responseCode, error, req)
                return response.status(400).send(errorResponse(rspObj))
              })
        }
      },
      (error) => {
        rspObj.errCode = programMessages.COPY_COLLECTION.SEARCH_DOCK_COLLECTION.FAILED_CODE;
        rspObj.errMsg = error.message || programMessages.COPY_COLLECTION.SEARCH_DOCK_COLLECTION.FAILED_MESSAGE;
        rspObj.responseCode = error.response.statusText || responseCode.SERVER_ERROR
        console.log('Error searching for collections', error)
        loggerError('Error searching for collections', rspObj.errCode, rspObj.errMsg, rspObj.responseCode, error, req)
        return response.status(error.response.status || 400).send(errorResponse(rspObj))
      }
    )
}

async function generateApprovedContentReport(req, res) {
  const data = req.body
  const rspObj = req.rspObj
  let programArr = [], cacheData = [], filteredPrograms = [];
  rspObj.errCode = programMessages.CONTENT_REPORT.FAILED_CODE
  rspObj.errMsg = programMessages.CONTENT_REPORT.FAILED_MESSAGE
  rspObj.responseCode = responseCode.SERVER_ERROR
  if (!data.request || !data.request.filters || !data.request.filters.program_id || !data.request.filters.report) {
    rspObj.errCode = programMessages.CONTENT_REPORT.MISSING_CODE
    rspObj.errMsg = programMessages.CONTENT_REPORT.MISSING_MESSAGE
    rspObj.responseCode = responseCode.CLIENT_ERROR
      loggerError('Error due to missing request or request.filters or request.filters.program_id or data.request.filters.report',
        rspObj.errCode, rspObj.errMsg, rspObj.responseCode, null, req)
    return res.status(400).send(errorResponse(rspObj));
  }
  programArr = _.isArray(data.request.filters.program_id) ? data.request.filters.program_id : [];
  await _.forEach(programArr, (program) => {
    cacheManager_programReport.get(`approvedContentCount_${program}`, (err, cache) => {
      if (err || !cache) {
        filteredPrograms.push(program);
      } else {
        cacheData.push(cache);
      }
    });
  });

  if (filteredPrograms.length) {
    try {
    const openForContribution = true;
    const requests = _.map(filteredPrograms, program => programServiceHelper.getCollectionHierarchy(req, program, openForContribution));
    const aggregatedResult = await Promise.all(requests);
      _.forEach(aggregatedResult, result => {
        cacheManager_programReport.set({ key: `approvedContentCount_${result.program_id}`, value: result },
        function (err, cacheCSVData) {
          if (err) {
            logger.error({msg: 'Error - caching', err, additionalInfo: {approvedContentCount: result}}, req)
          } else {
            logger.debug({msg: 'Caching  approvedContentCount - done', additionalInfo: {approvedContentCount: result}}, req)
          }
        });
      });

    if (data.request.filters.report === 'textbookLevelReport') {
      const textbookLevelReport = await programServiceHelper.textbookLevelContentMetrics([...aggregatedResult, ...cacheData]);
      rspObj.result = {
        tableData: textbookLevelReport
      }
      rspObj.responseCode = 'OK'
      return res.status(200).send(successResponse(rspObj));
    } else if (data.request.filters.report === 'chapterLevelReport') {
      const chapterLevelReport = await programServiceHelper.chapterLevelContentMetrics([...aggregatedResult, ...cacheData]);
      rspObj.result = {
        tableData: chapterLevelReport
      }
      rspObj.responseCode = 'OK'
      return res.status(200).send(successResponse(rspObj));
    } else {
      throw 'programServiceException: Invalid report name'
    }
  } catch(err) {
    if (_.includes(err, 'programServiceException')) {
      rspObj.errMsg = err;
    }
      loggerError('Error in preparing content metrics',
      rspObj.errCode, rspObj.errMsg, rspObj.responseCode, err, req)
      return res.status(400).send(errorResponse(rspObj));
    }
  } else {
    try {
      if (data.request.filters.report === 'textbookLevelReport') {
        const textbookLevelReport = await programServiceHelper.textbookLevelContentMetrics([...cacheData]);
        rspObj.result = {
          tableData: textbookLevelReport
        }
        rspObj.responseCode = 'OK'
        return res.status(200).send(successResponse(rspObj));
      } else if (data.request.filters.report === 'chapterLevelReport') {
        const chapterLevelReport = await programServiceHelper.chapterLevelContentMetrics([...cacheData]);
        rspObj.result = {
          tableData: chapterLevelReport
        }
        rspObj.responseCode = 'OK'
        return res.status(200).send(successResponse(rspObj));
      } else {
        throw 'programServiceException: Invalid report name'
      }
    }catch(err) {
      if (_.includes(err, 'programServiceException')) {
        rspObj.errMsg = err;
      }
      loggerError('Error in preparing content metrics',
      rspObj.errCode, rspObj.errMsg, rspObj.responseCode, err, req)
      return res.status(400).send(errorResponse(rspObj));
    }
  }
}

function publishContent(req, response){
  var rspObj = req.rspObj;
  const reqHeaders = req.headers;
  var data = req.body;
  if (!data.request || !data.request.content_id || !data.request.origin ||
    !data.request.origin.channel || !data.request.origin.textbook_id || !data.request.origin.units) {
    rspObj.errCode = programMessages.CONTENT_PUBLISH.MISSING_CODE
    rspObj.errMsg = programMessages.CONTENT_PUBLISH.MISSING_MESSAGE
    rspObj.responseCode = responseCode.CLIENT_ERROR
    logger.error({
      msg: 'Error due to missing request or content_id or origin textbook_id or origin units or origin channel',
      err: {
        errCode: rspObj.errCode,
        errMsg: rspObj.errMsg,
        responseCode: rspObj.responseCode
      },
      additionalInfo: {
        data
      }
    })
    return response.status(400).send(errorResponse(rspObj))
  }

  publishHelper.getContentMetaData(data.request.content_id, reqHeaders)
    .pipe(
      map(responseMetaData => {
        const contentMetaData =  _.get(responseMetaData, 'data.result.content');
        if(!contentMetaData) {
          throw new Error("Fetching content metadata failed!");
        }
        return contentMetaData;
      }),
      catchError(err => {
        throw err;
      })
    )
    .subscribe(
      (contentMetaData) => {
        contentMetaData.channel = _.get(data, 'request.origin.channel') || contentMetaData.channel;
        var units = _.isArray(data.request.origin.units) ? data.request.origin.units : [data.request.origin.units];
        const eventData = publishHelper.getPublishContentEvent(contentMetaData, data.request.origin.textbook_id, units);
        KafkaService.sendRecord(eventData, function (err, res) {
          if (err) {
            logger.error({ msg: 'Error while sending event to kafka', err, additionalInfo: { eventData } })
            rspObj.errCode = programMessages.CONTENT_PUBLISH.FAILED_CODE
            rspObj.errMsg = 'Error while sending event to kafka'
            rspObj.responseCode = responseCode.SERVER_ERROR
            return response.status(400).send(errorResponse(rspObj));
          } else {
            rspObj.responseCode = 'OK'
            rspObj.result = {
              'publishStatus': `Publish Operation for Content Id ${data.request.content_id} Started Successfully!`
            }
            return response.status(200).send(successResponse(rspObj));
          }
        });
      },
      (error) => {
        rspObj.errCode = programMessages.CONTENT_PUBLISH.FAILED_CODE
        rspObj.errMsg = programMessages.CONTENT_PUBLISH.FAILED_MESSAGE
        rspObj.responseCode = responseCode.SERVER_ERROR
        loggerError('Unable to publish content',
        rspObj.errCode, rspObj.errMsg, rspObj.responseCode, error);
        return response.status(400).send(errorResponse(rspObj));
      }
    )
}

function loggerError(msg, errCode, errMsg, responseCode, error, req) {
  logger.error({ msg: msg, err: { errCode, errMsg, responseCode }, additionalInfo: { error } }, req)
}

function health(req, response) {
  return response.status(200).send(successResponse({
    apiId: 'api.program.health',
    ver: '1.0',
    msgid: uuid(),
    responseCode: 'OK',
    result: {}
  }));
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

/**
 * function create error response body.
 * @param {Object} data
 * @returns {nm$_responseUtil.errorResponse.response}
 */
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
module.exports.downloadNominationListAPI = downloadNominationList
module.exports.programGetContentTypesAPI = getProgramContentTypes
module.exports.getUserDetailsAPI = getUsersDetailsById
module.exports.healthAPI = health
module.exports.programCopyCollectionAPI = programCopyCollections;
module.exports.getAllConfigurationsAPI = getAllConfigurations;
module.exports.getConfigurationByKeyAPI = getConfigurationByKey;
module.exports.downloadProgramDetailsAPI = downloadProgramDetails
module.exports.generateApprovedContentReportAPI = generateApprovedContentReport
module.exports.publishContentAPI = publishContent
module.exports.programCountsByOrgAPI = getProgramCountsByOrg