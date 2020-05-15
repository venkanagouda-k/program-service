const { forkJoin } = require("rxjs");
const _ = require("lodash");
const envVariables = require("../envVariables");
const axios = require("axios");
const dateFormat = require('dateformat');

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
      nomination.textbooks = nomination.collection_ids.length;
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
}

module.exports = ProgramServiceHelper;
