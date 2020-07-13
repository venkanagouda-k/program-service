const { forkJoin } = require("rxjs");
const _ = require("lodash");
const envVariables = require("../envVariables");
const axios = require("axios");
const dateFormat = require('dateformat');
const model = require('../models');
const Sequelize = require('sequelize');

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
                  'contentType'
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
         objectType: 'content',
         status: ['Draft'],
         contentType: 'Textbook'
       },
       fields: ['name', 'medium', 'gradeLevel', 'subject', 'chapterCount', 'acceptedContents', 'rejectedContents', 'openForContribution'],
       limit: 1000
     };
    return this.searchWithProgramId(queryFilter, req);
}

getSampleContentWithProgramId(program_id, req) {
  const queryFilter = {
        filters: {
          programId: program_id,
          objectType: 'content',
          status: ['Review', 'Draft'],
          sampleContent: true
        },
        facets: [
          'sampleContent', 'collectionId', 'status'
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
              "l2": "status"
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
      sampleContentResponse = resData[1].data.result && resData[1].data.result.facets || [],
      contributionResponse = resData[2].data.result && resData[2].data.result.aggregations || [],
      nominationResponse = _.isArray(resData[3]) && resData[3].length? _.map(resData[3], obj => obj.dataValues) : [];
      let tableData = [];
    if (collectionList.length) {
        tableData = _.map(collectionList, (collection) => {
        const result = {};
        // sequence of columns in tableData
        result['Textbook Name'] = collection.name;
        result['Medium'] = collection.medium || '--';
        result['Class'] = collection.gradeLevel && collection.gradeLevel.length ? collection.gradeLevel.join(', ') : '';
        result['Subject'] = collection.subject || '--';
        result['Number of Chapters'] = collection.chapterCount || '--';
        result['Nominations Received'] = 0;
        result['Samples Received'] = 0;
        result['Nominations Accepted'] = 0;
        result['Contributions Received'] = 0;
        result['Contributions Accepted'] = collection.acceptedContents ? collection.acceptedContents.length : 0;
        result['Contributions Rejected'] = collection.rejectedContents ? collection.rejectedContents.length : 0;
        result['Contributions Pending'] = 0;

        // count of sample contents
        if (sampleContentResponse.length) {
          const facetObj = _.find(sampleContentResponse, {name: 'collectionId'});
          if (facetObj && facetObj.values.length &&
            _.find(facetObj.values, {name: collection.identifier})) {
              result['Samples Received'] = _.find(facetObj.values, {name: collection.identifier}).count;
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
                    // tslint:disable-next-line:max-line-length
                    result['Contributions Pending'] = result['Contributions Received'] - (result['Contributions Rejected'] + result['Contributions Accepted']);
                  }
                 });
              }
        }

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
        forkJoin(..._.map(collectionArr, collection => this.hierarchyRequest(req, collection.identifier))).subscribe(data => {
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
      this.collectionData = {};
      this.collectionLevelCount(collection);
      return this.collectionData
    });
    return {program_id: program_id, collection: collectionWithApprovedContent};
  }

  collectionLevelCount(data) {
    const self = this;
    if (data.contentType === 'TextBook') {
      this.collectionData['name'] = data.name;
      this.collectionData['identifier'] = data.identifier;
      this.collectionData['grade'] = _.isArray(data.gradeLevel) ? data.gradeLevel.join(", ") : data.gradeLevel || '';
      this.collectionData['medium'] = _.isArray(data.medium) ? data.medium.join(", ") : data.medium || '';
      this.collectionData['subject'] = _.isArray(data.subject) ? data.subject.join(", ") : data.subject || '';
      this.collectionData['count'] = this.acceptedContents.length;
      this.collectionData['chapter'] = [];
      this.recursive = true;
    } else if (data.contentType === 'TextBookUnit') {
      if (data.parent === this.collectionData['identifier']) {
        const chapterObj = {
          name: data.name,
          identifier: data.identifier,
          count: 0
        }
        this.contentData = [];
        this.chapterLevelCount(data);
        chapterObj['contentTypes'] = _.map(_.groupBy(this.contentData, 'name'), (val, key) => {
          chapterObj['count'] = chapterObj['count'] + val.length;
          return {name: key, count: val.length}
        });
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
    if (object.contentType !== 'TextBook' && object.contentType !== 'TextBookUnit' &&
          _.includes(this.acceptedContents, object.identifier)) {
          this.contentData.push({name: object.contentType});
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
}

module.exports = ProgramServiceHelper;
