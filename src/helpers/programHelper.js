const { forkJoin } = require("rxjs");
const { from  } = require("rxjs");
const _ = require("lodash");
const envVariables = require("../envVariables");
const axios = require("axios");
const dateFormat = require('dateformat');
const model = require('../models');
const Sequelize = require('sequelize');
const messageUtils = require('../service/messageUtil');
const responseCode = messageUtils.RESPONSE_CODE;
const programMessages = messageUtils.PROGRAM;
const logger = require('sb_logger_util_v2');
const { retry } = require("rxjs/operators");
const HierarchyService = require('./updateHierarchy.helper');
const RegistryService = require('../service/registryService');
const hierarchyService = new HierarchyService();
const registryService = new RegistryService();

class ProgramServiceHelper {
  searchContent(programId, sampleContentCheck, reqHeaders) {
    const url = `${envVariables.baseURL}/api/composite/v1/search`
    const option = {
      url,
      method: 'post',
      headers: reqHeaders,
      data: {
        request: {
          filters: {
            objectType: 'content',
            programId: programId,
            mimeType: {'!=': 'application/vnd.ekstep.content-collection'},
            contentType: {'!=': 'Asset'},
            ...(sampleContentCheck && {
              'sampleContent': true,
              'status': ['Draft', 'Review']
            })
          },
          fields: [
                  'name',
                  'identifier',
                  'programId',
                  'mimeType',
                  'status',
                  'sampleContent',
                  'createdBy',
                  'organisationId',
                  'collectionId',
                  'prevStatus',
                  'contentType',
                  'primaryCategory'
          ],
          limit: 10000
        }
      }
    };
    return axios(option);
  }

  setNominationSampleCounts(contentResult) {
    let nominationSampleCounts = {};
    let orgSampleUploads = _.filter(contentResult, contribution => !_.isEmpty(contribution.organisationId) && contribution.sampleContent);
    orgSampleUploads = _.groupBy(orgSampleUploads, 'organisationId');
    _.forEach(orgSampleUploads, (temp, index) => {
      nominationSampleCounts[index] = temp.length;
    });

    // tslint:disable-next-line: max-line-length
    let individualSampleUploads = _.filter(contentResult, contribution => _.isEmpty(contribution.organisationId) && contribution.sampleContent);
    individualSampleUploads = _.groupBy(individualSampleUploads, 'createdBy');
    _.forEach(individualSampleUploads, (temp, index) => {
      nominationSampleCounts[index] = temp.length;
    });

    return nominationSampleCounts;
  }

  assignSampleCounts(nominations, nominationSampleCounts, programName) {
    const newNominations = _.map(nominations, n => {
      n.programName = programName.trim();
      n.samples = this.getNominationSampleCounts(n, nominationSampleCounts);
      return n;
    });
    return newNominations;
  }

  getNominationSampleCounts(nomination, nominationSampleCounts) {
    // tslint:disable-next-line:max-line-length
    return (nomination.organisation_id) ? nominationSampleCounts[nomination.organisation_id] || 0 : nominationSampleCounts[nomination.user_id] || 0;
  }

  downloadNominationList(nominations) {
    const tableData = _.map(_.cloneDeep(nominations), (nomination) => {
      const isOrg = !_.isEmpty(nomination.organisation_id);
      let name = '';
      if (isOrg && !_.isEmpty(nomination.orgData)) {
        name = nomination.orgData.name;
      } else if (!_.isEmpty(nomination.userData)) {
        name = `${nomination.userData.firstName} ${nomination.userData.lastName || ''}`;
      }
      nomination.createdon = dateFormat(nomination.createdon, 'mmmm d, yyyy');
      nomination.name = name;
      nomination.textbooks = nomination.collection_ids && nomination.collection_ids.length;
      nomination.type = isOrg ? 'Organisation' : 'Individual';
      return {
        programName: nomination.programName,
        name: nomination.name,
        type: nomination.type,
        textbooks: nomination.textbooks,
        sample: nomination.samples,
        createdon: nomination.createdon,
        status: nomination.status,
      };
    });

    return tableData;
  }

  searchWithProgramId(queryFilter, req) {
    const headers = {
        'content-type': 'application/json',
      };
    const option = {
      url: `${envVariables.baseURL}/api/composite/v1/search`,
      method: 'post',
      headers: {...req.headers, ...headers},
      data: {
        request: queryFilter
      }
    };

    return axios(option);
  }

  getCollectionWithProgramId(program_id, req) {
    const queryFilter = {
       filters: {
         programId: program_id,
         objectType: 'collection',
         status: ['Draft'],
         primaryCategory: 'Digital Textbook'
       },
       fields: ['name', 'medium', 'gradeLevel', 'subject', 'chapterCount', 'acceptedContents', 'rejectedContents', 'openForContribution', 'chapterCountForContribution', 'mvcContributions'],
       limit: 1000
     };
    return this.searchWithProgramId(queryFilter, req);
  }

  getSampleContentWithOrgId(program_id, req) {
    const queryFilter = {
          filters: {
            programId: program_id,
            objectType: 'content',
            status: ['Review', 'Draft'],
            sampleContent: true
          },
          aggregations: [
            {
                "l1": "collectionId",
                "l2": "organisationId"
            }
        ],
        limit: 0
        };
      return this.searchWithProgramId(queryFilter, req);
  }

  getSampleContentWithCreatedBy(program_id, req) {
    const queryFilter = {
          filters: {
            programId: program_id,
            objectType: 'content',
            status: ['Review', 'Draft'],
            sampleContent: true
          },
          aggregations: [
            {
                "l1": "collectionId",
                "l2": "createdBy"
            }
        ],
        limit: 0
        };
      return this.searchWithProgramId(queryFilter, req);
  }

  getContributionWithProgramId(program_id, req) {
    const queryFilter = {
          filters: {
            programId: program_id,
            objectType: 'content',
            status: ['Review', 'Draft', 'Live'],
            contentType: { '!=': 'Asset' },
            mimeType: { '!=': 'application/vnd.ekstep.content-collection' }
          },
          not_exists: ['sampleContent'],
          aggregations: [
            {
                "l1": "collectionId",
                "l2": "status",
                "l3": "prevStatus"
            }
        ],
        limit: 0
        };
      return this.searchWithProgramId(queryFilter, req);
  }

  getNominationWithProgramId(programId) {
    const facets = ['collection_ids', 'status'];
    const promise = model.nomination.findAll({
      where: {
        program_id: programId
      },
      attributes: [...facets, [Sequelize.fn('count', Sequelize.col(facets[0])), 'count']],
      group: [...facets]
    })
    return promise;
  }

  getOveralNominationData(programId) {
    const promise = model.nomination.findAll({
      where: {
        program_id: programId,
        status: 'Initiated'
      },
      attributes: ['user_id', 'organisation_id']
    })
    return promise;
  }

  handleMultiProgramDetails(resGroup) {
      const multiProgramDetails = _.map(resGroup, (resData) => {
        try {
         return this.prepareTableData(resData);
        } catch(err) {
         throw err
        }
      });
      return multiProgramDetails;
  }

  prepareTableData (resData) {
    try {
      const collectionList = resData[0].data.result && resData[0].data.result.content || [],
      sampleContentWithOrgId = resData[1].data.result && resData[1].data.result.aggregations || [],
      sampleContentWithUserId = resData[2].data.result && resData[2].data.result.aggregations || [],
      contributionResponse = resData[3].data.result && resData[3].data.result.aggregations || [],
      nominationResponse = _.isArray(resData[4]) && resData[4].length? _.map(resData[4], obj => obj.dataValues) : [],
      nominationDataResponse = _.isArray(resData[5]) && resData[5].length? _.map(resData[5], obj => obj.dataValues) : [];

      const overalIds = _.uniq(_.compact(_.flattenDeep(_.map(nominationDataResponse, data => [data.organisation_id || data.user_id]))));
      let tableData = [];
    if (collectionList.length) {
      let openForContributionCollections = [];

      _.forEach(collectionList, collection => {
        if (collection.openForContribution === true) {
          openForContributionCollections.push(collection);
        }
      });

        tableData = _.map(openForContributionCollections, (collection) => {
        const result = {};
        // sequence of columns in tableData
        result['Textbook Name'] = collection.name || '';
        result['Medium'] = collection.medium || '';
        result['Class'] = collection.gradeLevel && collection.gradeLevel.length ? collection.gradeLevel.join(', ') : '';
        result['Subject'] = collection.subject || '';
        result['Number of Chapters'] = collection.chapterCountForContribution || collection.chapterCount || 0;
        result['Nominations Received'] = 0;
        result['Samples Received'] = 0;
        result['Nominations Accepted'] = 0;
        result['Contributions Received'] = 0;
        result['Contributions Accepted'] = collection.acceptedContents ? collection.acceptedContents.length : 0;
        result['Contributions Rejected'] = collection.rejectedContents ? collection.rejectedContents.length : 0;
        result['Contributions Pending'] = 0;
        result['Contributions corrections pending'] = 0;

        // count of sample contents
        if (sampleContentWithOrgId.length && sampleContentWithOrgId[0].name === 'collectionId'
             && sampleContentWithOrgId[0].values.length) {
              const sampleCountObj = _.find(sampleContentWithOrgId[0].values, {name: collection.identifier});
              result['Samples Received'] = (sampleCountObj) ? sampleCountObj.count : 0;
              if (sampleCountObj && !_.isEmpty(sampleCountObj.aggregations) && !_.isEmpty(sampleCountObj.aggregations[0].values)) {
                const ignoringCount = _.reduce(sampleCountObj.aggregations[0].values, (final, data) => {
                  return _.includes(overalIds, data.name) ? (final + data.count) : final;
                }, 0);
                result['Samples Received'] = result['Samples Received'] - ignoringCount;
              }
        }

        if (sampleContentWithUserId.length && sampleContentWithUserId[0].name === 'collectionId'
             && sampleContentWithUserId[0].values.length) {
              const sampleCountObj = _.find(sampleContentWithUserId[0].values, {name: collection.identifier});
              if (sampleCountObj && !_.isEmpty(sampleCountObj.aggregations) && !_.isEmpty(sampleCountObj.aggregations[0].values)) {
                const ignoringCount = _.reduce(sampleCountObj.aggregations[0].values, (final, data) => {
                  return _.includes(overalIds, data.name) ? (final + data.count) : final;
                }, 0);
                result['Samples Received'] = result['Samples Received'] - ignoringCount;
              }
        }

        // count of contribution
        if (contributionResponse.length && contributionResponse[0].name === 'collectionId'
             && contributionResponse[0].values.length) {
              const statusCount = _.find(contributionResponse[0].values, {name: collection.identifier});
              if (statusCount && statusCount.aggregations && statusCount.aggregations.length) {
                _.forEach(statusCount.aggregations[0].values, (obj) => {
                  if (obj.name === 'live') {
                    result['Contributions Received'] = result['Contributions Received'] + obj.count;
                  }
                  if (obj.name === 'draft' && obj.aggregations && obj.aggregations.length && _.find(obj.aggregations[0].values, {name: "live"})) {
                      const correctionPendingNode =  _.find(obj.aggregations[0].values, {name: "live"});
                      result['Contributions corrections pending'] = correctionPendingNode.count;
                      result['Contributions Received'] = result['Contributions Received'] + correctionPendingNode.count;
                  }
                 });
              }
        }

        // count of MVC contribution (if any)
        if (!_.isEmpty(collection.mvcContributions)) {
          result['Contributions Received'] = result['Contributions Received'] + collection.mvcContributions.length;
        }
        // tslint:disable-next-line:max-line-length
        result['Contributions Pending'] = result['Contributions Received'] - (result['Contributions Rejected'] + result['Contributions Accepted'] + result['Contributions corrections pending']);

        // count of nomination
        if (nominationResponse.length) {
         _.forEach(nominationResponse, (obj) => {
           if (obj.collection_ids && _.includes(obj.collection_ids, collection.identifier) ) {
               if (obj.status === 'Approved') {
                result['Nominations Accepted'] = result['Nominations Accepted'] + Number(obj.count);
              } else if (obj.status !== 'Initiated') {
                result['Nominations Received'] = result['Nominations Received'] + Number(obj.count);
              }
           }
         });
         result['Nominations Received'] = result['Nominations Accepted'] + result['Nominations Received'];
        }
        return result;
      });
    }
    return tableData;
  } catch (err) {
    throw 'error in preparing CSV data'
  }
  }

  getProgramDetails(program_id) {
    return model.program.findOne({
      where: {
        program_id: program_id
      }
    })
  }

  hierarchyRequest(req, collectionId) {
    const option = {
      url: `${envVariables.baseURL}/action/content/v3/hierarchy/${collectionId}?mode=edit`,
      method: 'get',
      headers: {...req.headers}
    };
    return axios(option);
  }

  getCollectionHierarchy(req, program_id, openForContribution) {
    return new Promise((resolve, reject) => {
      this.getCollectionWithProgramId(program_id, req).then((res_collection) => {
        const collectionArr = res_collection.data && res_collection.data.result && res_collection.data.result.content || [];
        const collectionReq = _.map(collectionArr, collection => this.hierarchyRequest(req, collection.identifier));
        forkJoin(...collectionReq).subscribe(data => {
        try {
          const hierarchyArr = _.compact(_.map(data, obj => obj.data.result && obj.data.result.content));
          if (openForContribution == true) {
            _.forEach(hierarchyArr, item => {
              let children = [];
              _.forEach(item.children, child=> {
                if (child.openForContribution === true) {
                  children.push(child);
                }
              });
              item.children = children;
            });
          }

          const contentCount = this.approvedContentCount(hierarchyArr, program_id);
          resolve(contentCount);
        } catch (err) {
          reject('programServiceException: error in counting the approved contents');
        }
        }, err => {
          reject('programServiceException: error in fetching collections-hierarchy');
        });
      }).catch(err => {
        reject('programServiceException: error in fetching collections against programID');
      });
    });
  }

  approvedContentCount(collectionHierarchy, program_id) {
    const collectionWithApprovedContent = _.map(collectionHierarchy, collection => {
      this.acceptedContents = _.uniq(collection.acceptedContents) || [];
      this.rejectedContents = _.uniq(collection.rejectedContents) || [];
      this.collectionData = {};
      this.collectionData['totalContentsReviewed'] = (_.union(this.acceptedContents, this.rejectedContents)).length;
      this.collectionData['contributionsReceived'] = 0;
      this.collectionLevelCount(collection);

      // Count of contribution

      this.collectionData['contributionsReceived'] = _.reduce(_.get(this.collectionData, 'chapter'), (finalCount, data) => {
        finalCount =  finalCount + (data.contentsContributed || 0);
        return finalCount;
      }, 0);

      this.collectionData['totalContentsReviewed'] = _.reduce(_.get(this.collectionData, 'chapter'), (finalCount, data) => {
        finalCount =  finalCount + (data.contentsReviewed || 0);
        return finalCount;
      }, 0);

      return this.collectionData
    });
    return {program_id: program_id, collection: collectionWithApprovedContent};
  }

  collectionLevelCount(data) {
    const self = this;
    if (data.primaryCategory === 'Digital Textbook') {
      this.collectionData['name'] = data.name;
      this.collectionData['identifier'] = data.identifier;
      this.collectionData['grade'] = _.isArray(data.gradeLevel) ? data.gradeLevel.join(", ") : data.gradeLevel || '';
      this.collectionData['medium'] = _.isArray(data.medium) ? data.medium.join(", ") : data.medium || '';
      this.collectionData['subject'] = _.isArray(data.subject) ? data.subject.join(", ") : data.subject || '';
      this.collectionData['count'] = this.acceptedContents.length;
      this.collectionData['chapter'] = [];
      this.recursive = true;
    } else if (data.mimeType === 'application/vnd.ekstep.content-collection'
      && data.visibility === 'Parent') {
      if (data.parent === this.collectionData['identifier']) {
        const chapterObj = {
          name: data.name,
          identifier: data.identifier,
          count: 0,
          contentsContributed: 0,
          contentsReviewed: 0
        }
        this.contentData = [];
        this.contentsContributed = [];
        this.contentsReviewed = [];
        this.chapterLevelCount(data);
        chapterObj['contentTypes'] = _.map(_.groupBy(this.contentData, 'name'), (val, key) => {
          chapterObj['count'] = chapterObj['count'] + val.length;
          return {name: key, count: val.length}
        });

        chapterObj.contentsContributed = this.contentsContributed.length;
        chapterObj.contentsReviewed = this.contentsReviewed.length;
        this.collectionData['chapter'].push(chapterObj);
      }
    }
    if (data.children && this.recursive) {
      this.recursive = false;
      _.forEach(data.children, child => self.collectionLevelCount(child));
    }
  }

  chapterLevelCount(object) {
    const self = this;
    if (object.mimeType !== 'application/vnd.ekstep.content-collection'
      && object.visibility !== 'Parent'
      && _.includes(this.acceptedContents, object.identifier)) {
          this.contentData.push({name: object.primaryCategory});
    }

    if (object.mimeType !== 'application/vnd.ekstep.content-collection'
        && object.visibility !== 'Parent'
        && (object.status === 'Live' || (object.status === 'Draft' && object.prevStatus === 'Live'))) {
          this.contentsContributed.push(object.identifier);
          if (_.includes(this.acceptedContents, object.identifier)
          || _.includes(this.rejectedContents, object.identifier) || (object.status === 'Draft' && object.prevStatus === 'Live')) {
              this.contentsReviewed.push(object.identifier);
        }
    }

    if (object.children) {
      _.forEach(object.children, child => self.chapterLevelCount(child));
    }
  }

  textbookLevelContentMetrics(collectedData) {
    return new Promise((resolve, reject) => {
      forkJoin(..._.map(collectedData, data => this.getProgramDetails(data.program_id))).subscribe(details => {
      try {
        const contentTypes = details.length ? _.uniq(_.compact(..._.map(details, model => model && model.dataValues.content_types))) : [];
        const overalData = _.map(collectedData, data => {
          if (data.collection && data.collection.length) {
          const tableObj = _.map(data.collection, (collection) => {
            const final = {};
              final['Medium'] = collection.medium;
              final['Grade'] = collection.grade;
              final['Subject'] = collection.subject;
              final['Textbook Name'] = collection.name;
              final['Total Number of Chapters'] = collection.chapter ? collection.chapter.length : 0;
              final['Total Contents Contributed'] = collection.contributionsReceived ? collection.contributionsReceived : 0;
              final['Total Contents Reviewed'] = collection.totalContentsReviewed ? collection.totalContentsReviewed : 0;
              final['Chapters with atleast one approved in each contentType'] = contentTypes.length ? _.filter(collection.chapter, unit => unit.contentTypes.length === contentTypes.length).length : 0;
              final['Chapters with atleast one approved'] = _.filter(collection.chapter, unit => unit.contentTypes.length).length;
              final['Total number of Approved Contents'] = collection.count || 0;
              _.forEach(contentTypes, type => final[type] = 0);
              const contentTypeObj = _.groupBy(_.flattenDeep(_.map(collection.chapter, obj => obj.contentTypes)), 'name');
              _.map(contentTypeObj, (val, key) => _.forEach(val, v => final[key] = (final[key] || 0) + v.count));
              return final;
            });
            return tableObj;
          } else {
            return {}
          }
        });
        return resolve(overalData);
      }catch (err) {
        reject('programServiceException: error in preparing textbookLevelContentMetrics');
      }
      }, err => {
        reject('programServiceException: error in fetching contentTypes');
      });
    });
  }

  chapterLevelContentMetrics(collectedData) {
    return new Promise((resolve, reject) => {
      forkJoin(..._.map(collectedData, data => this.getProgramDetails(data.program_id))).subscribe(details => {
        try {
          const contentTypes = details.length ? _.uniq(_.compact(..._.map(details, model => model && model.dataValues.content_types))) : [];
          const overalData = _.map(collectedData, data => {
            if (data.collection && data.collection.length) {
              const tableObj = _.map(data.collection, (collection) => {
                const unitDetails = _.map(collection.chapter, unit => {
                  const final = {};
                  final['Medium'] = collection.medium;
                  final['Grade'] = collection.grade;
                  final['Subject'] = collection.subject;
                  final['Textbook Name'] = collection.name;
                  final['Chapter Name'] = unit.name;
                  final['Total Contents Contributed'] = unit.contentsContributed || 0;
                  final['Total Contents Reviewed'] = unit.contentsReviewed || 0;
                  final['Total number of Approved Contents'] = unit.count || 0;
                  _.forEach(contentTypes, type => final[type] = 0);
                  _.forEach(unit.contentTypes, type => final[type.name] = (final[type.name] || 0) + type.count);
                  return final;
                });
                return unitDetails;
              });
              return _.flattenDeep(tableObj);
            } else {
              return {}
            }
          });
          resolve(overalData);
        }catch (err) {
         reject('programServiceException: error in preparing chapterLevelContentMetrics');
        }
        }, err => {
          reject('programServiceException: error in fetching contentTypes');
        });
      });
  }

  copyCollections(data, channel, reqHeaders, cb) {
    const rspObj = {};
    const errObj = {
      'loggerMsg': null,
      'errCode': null,
      'errMsg': null,
      'responseCode': null
    };

    if (!data.program_id || !data.config.collections || !data.content_types || !channel) {
      errObj.errCode = programMessages.COPY_COLLECTION.COPY.MISSING_CODE;
      errObj.errMsg = programMessages.COPY_COLLECTION.COPY.MISSING_MESSAGE;
      errObj.responseCode = responseCode.CLIENT_ERROR;
      errObj.loggerMsg = 'Error due to missing request or program_id or request collections or request allowed_content_types or channel'
      cb(errObj, null);
      return false;
    }

    const collections = _.get(data, 'config.collections');
    const collectionIds = _.map(collections, 'id');
    const additionalMetaData = {
      programId: _.get(data, 'program_id'),
      allowedContentTypes: _.get(data, 'content_types'),
      channel: channel,
      openForContribution: false
    };

    hierarchyService.filterExistingTextbooks(collectionIds, additionalMetaData.programId, reqHeaders)
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
                      cb(null, rspObj);
                      return true;
                    }, error => {
                      errObj.errCode = programMessages.COPY_COLLECTION.BULK_UPDATE_HIERARCHY.FAILED_CODE;
                      errObj.errMsg = programMessages.COPY_COLLECTION.BULK_UPDATE_HIERARCHY.FAILED_MESSAGE;
                      errObj.responseCode = responseCode.SERVER_ERROR
                      console.log('Error updating hierarchy for collections', error)
                      errObj.loggerMsg = 'Error updating hierarchy for collections';
                      cb (errObj, null);
                      return false;
                    })
                }, error => {
                  errObj.errCode = programMessages.COPY_COLLECTION.GET_HIERARCHY.FAILED_CODE;
                  errObj.errMsg = programMessages.COPY_COLLECTION.GET_HIERARCHY.FAILED_MESSAGE;
                  errObj.responseCode = responseCode.SERVER_ERROR
                  errObj.loggerMsg = 'Error fetching hierarchy for collections';
                  console.log('Error fetching hierarchy for collections', error);
                  cb (errObj, null);
                  return false;
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
                          rspObj.responseCode = 'OK';
                          cb(null, rspObj);
                        }, error => {
                          console.log('Error updating hierarchy for collections')
                          console.log(error)
                          errObj.errCode = _.get(error.response, 'data.params.err') || programMessages.COPY_COLLECTION.BULK_UPDATE_HIERARCHY.FAILED_CODE;
                          errObj.errMsg = _.get(error.response, 'data.params.errmsg') || programMessages.COPY_COLLECTION.BULK_UPDATE_HIERARCHY.FAILED_MESSAGE;
                          errObj.responseCode = _.get(error.response, 'data.responseCode') || responseCode.SERVER_ERROR
                          errObj.loggerMsg = 'Error updating hierarchy for collections';
                          cb(errObj, null);
                        })
                    }, error => {
                      console.log('Error creating collection')
                      console.log(error)
                      errObj.errCode = _.get(error.response, 'data.params.err') || programMessages.COPY_COLLECTION.CREATE_COLLECTION.FAILED_CODE;
                      errObj.errMsg = _.get(error.response, 'data.params.errmsg') || programMessages.COPY_COLLECTION.CREATE_COLLECTION.FAILED_MESSAGE;
                      errObj.responseCode = _.get(error.response, 'data.responseCode') || responseCode.SERVER_ERROR
                      errObj.loggerMsg = 'Error creating collection';
                      cb(errObj, null);
                    })
                }, (error) => {
                  errObj.errCode = programMessages.COPY_COLLECTION.GET_HIERARCHY.FAILED_CODE;
                  errObj.errMsg = programMessages.COPY_COLLECTION.GET_HIERARCHY.FAILED_MESSAGE;
                  errObj.responseCode = responseCode.SERVER_ERROR;
                  errObj.loggerMsg = 'Error fetching hierarchy for collections';
                  console.log('Error fetching hierarchy for collections', error);
                  cb (errObj, null);
                })
          }
        },
        (error) => {
          console.log(error)
          errObj.errCode = programMessages.COPY_COLLECTION.SEARCH_DOCK_COLLECTION.FAILED_CODE;
          errObj.errMsg = error.message || programMessages.COPY_COLLECTION.SEARCH_DOCK_COLLECTION.FAILED_MESSAGE;
          errObj.responseCode = _.get(error, 'response.statusText') || responseCode.SERVER_ERROR
          errObj.loggerMsg = 'Error searching for collections';
          console.log('Error searching for collections', error)
          cb (errObj, null);
          return false;
        }
      );
  }

  getUserDetails(userId, reqHeaders) {
    const option = {
      url: `${envVariables.baseURL}/learner/user/v1/search`,
      method: 'POST',
      headers: reqHeaders,
      data: {
        request: {
          filters: {
            identifier: userId,
          }
        }
      }
    }
    return from(axios(option));
  }

  getAllSourcingOrgUsers(orgUsers, filters, reqHeaders, limit = 500, offset= 0) {
    offset = (!_.isUndefined(offset)) ? offset : 0;
    limit = (!_.isUndefined(limit)) ? limit : 500;
    return new Promise((resolve, reject) => {
      this.getSourcingOrgUsers(reqHeaders, filters, offset, limit).subscribe(
        (res) => {
          const sourcingOrgUsers =  _.get(res, 'data.result.response.content', []);
          const totalCount = _.get(res, 'data.result.response.count');

          if (sourcingOrgUsers.length > 0) {
            orgUsers = _.compact(_.concat(orgUsers, sourcingOrgUsers));
            offset = offset + sourcingOrgUsers.length;
          }

          if (totalCount > orgUsers.length){
            return resolve(this.getAllSourcingOrgUsers(orgUsers, filters, reqHeaders, limit, offset));
          }
          return resolve(orgUsers);
        },
        (error) => {
          return reject(error.message);
        }
      );
    });
  }

  getSourcingOrgUsers(reqHeaders, reqFilters, offset, limit) {
    const req = {
      url: `${envVariables.baseURL}/learner/user/v1/search`,
      method: 'post',
      headers: reqHeaders,
      data: {
        request: {
          filters: reqFilters
        }
      }
    };

    if (!_.isUndefined(limit)) {
      req.data.request['limit'] = limit;
    }
    if (!_.isUndefined(offset)) {
      req.data.request['offset'] = offset;
    }

    return from(axios(req));
  }

  /**
   * Update the user profile with medium, subject and gradeLevel
   *
   * @param integer program_id  Program id
   * @param integer user_id     User id
   */
  async onAfterAddNomination(program_id, user_id) {
    const program = await this.getProgramDetails(program_id);
    const value = {};
    value['body'] = {
      "id": "open-saber.registry.search",
      "request": {
          "entityType":["User"],
          "filters": {
            "userId": {
                "contains": user_id
            }
        }
      }
    };

    registryService.searchRecord(value, (err, res) => {
      if (!err && res) {
        const user = _.first(res.data.result.User);
        const updateRequestBody = {};
        updateRequestBody['body'] = {
          "id": "open-saber.registry.update",
          "ver": "1.0",
          "request": {
            "User": {
              "osid": user.osid,
              "medium": _.union(user.medium, program.config.medium),
              "gradeLevel": _.union(user.gradeLevel, program.config.gradeLevel),
              "subject": _.union(user.subject, program.config.subject)
              }
          }
        };
        registryService.updateRecord(updateRequestBody, (error, response) => {
          if (!error && response) {
            return response;
          } else {
            return error;
          }
        });
      }
    });
  }

  /**
   * Sort the program based on medium, subject, gradeLevel and program created date
   *
   * @param array  programs  List of programs
   * @param object sort      Sort by options
   */
  sortPrograms(programs, sort) {
    _.map(programs, program => {
      program.matchCount =  _.intersection(JSON.parse(program.medium), sort.medium).length
        + _.intersection(JSON.parse(program.gradeLevel), sort.gradeLevel).length
        + _.intersection(JSON.parse(program.subject), sort.subject).length;
      return program;
    });

    /**
     * Sort by descending order
     * 1. Sum of matching medium, subject and gradeLevel and
     * 2. program created date
     */
    return _(programs).chain().sortBy((prg) => prg.createdon).sortBy((prg) => prg.matchCount).values().reverse();
  }
}

module.exports = ProgramServiceHelper;
