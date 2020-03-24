const { forkJoin } = require('rxjs');
const _ = require("lodash");
const envVariables = require('../envVariables');
const axios = require('axios');
const headers = {
  'Content-Type': 'application/json'
}
const dockHeader = {
  'Content-Type': 'application/json'
}


class HierarchyService {
  programCreated() {
    filterExistingTextbooks(selectedTextbooks);
  }


  filterExistingTextbooks(collectionIds) {

    const url = `${envVariables.baseURL}/api/composite/v1/search`;
    const filterRequest = _.map(collectionIds, id => {
      const option = {
        url: url,
        method: 'post',
        'headers': dockHeader,
        data: {
          'request': {
            'filters': {
              'objectType': 'content',
              'status': [
                'Draft',
                'Live'
              ],
              'identifier': id,
              'contentType': 'Textbook'
            }
          }
        }
      };
      return axios(option);
    });

    return forkJoin(...filterRequest)

  }

  bulkUpdateHierarchy(collections) {
    const url = `${envVariables.baseURL}/action/content/v3/hierarchy/update`;

    const bulkRequest = _.map(collections, collection => {
      const createdBy = this.getCreatedBy(collection);
      const option = {
        url,
        method: 'patch',
        headers: _.merge({}, dockHeader, {'x-authenticated-userid': createdBy}),
        data: {
          request: {data: collection}
        }
      };
      return axios(option);
    });
    return forkJoin(...bulkRequest);
  }


  getCreatedBy(collection) {
    const nodesModified = _.get(collection, 'nodesModified');
     const rootNode = _.findKey(nodesModified, item => {
      return item.root === true;
     })
    return nodesModified[rootNode].metadata.createdBy || null;
  }
  createCollection(collections) {
      const url = `${envVariables.baseURL}/action/content/v3/create`

      const bulkRequest = _.map(collections, collection => {
        const option = {
          url,
          method: 'post',
          headers: dockHeader,
          data: {
            request: {
              content: {..._.omit(collection.result.content, ['children', 'identifier', 'status', 'reservedDialcodes', 'license', 'framework', 'subject', 'medium', 'gradeLevel', 'board'])}
            }
          },
          params: {
            identifier: collection.result.content.identifier
          }
        };
        return axios(option);
      });
    return forkJoin(...bulkRequest);
  }

  getHierarchy(collectionIds) {

    const collectiveRequest = _.map(collectionIds, id => {
      const url = `${envVariables.SUNBIRD_URL}/action/content/v3/hierarchy/${id}?mode=edit`;
      const option = {
        url: url,
        method: 'get'
      };
      return axios(option)
    });
    return forkJoin(...collectiveRequest)
  }

  getExistingCollection(collections) {
    return _.map(_.filter(collections, r => {
      return r.result.count > 0
    }), (tb) => tb.result.content[0].identifier)
  }

  getNonExistingCollection(collections) {
    return _.map(_.filter(collections, r => {
      return r.result.count === 0
    }), (tb) => JSON.parse(tb.config).request.filters.identifier)
  }

  getCollectionHierarchy() {
    const response = hierarchy;
    const x = generateHierarchyUpdateRequest(response);
    console.log(x);
  }

  generateHierarchyUpdateRequest(data, additionalMetaData) {
    let instance = this
    this.hierarchy = {}
    this.nodeModified = {}
    const response = data.result;
    console.log(data.result.content.identifier)
    return {
      nodesModified: instance.getFlatNodesModified(response.content, additionalMetaData),
      hierarchy: instance.getFlatHierarchyObj(response.content),
      'lastUpdatedBy': '95e4942d-cbe8-477d-aebd-ad8e6de4bfc8'
    };
  }

  getHierarchyUpdateRequest(collection,  additionalMetaData) {
    let instance = this;
    this.hierarchy = {}
    this.nodeModified = {}
    const response = collection.hierarchy;
    additionalMetaData = {...collection.creationResult.result, ...additionalMetaData, 'isFirstTime': true}
    return {
      nodesModified: instance.getFlatNodesModified(response.content, additionalMetaData),
      hierarchy: instance.getFlatHierarchyObj(response.content, additionalMetaData),
      'lastUpdatedBy': '95e4942d-cbe8-477d-aebd-ad8e6de4bfc8'
    }
  }

  getFlatHierarchyObj(data, additionalMetaData) {
    let instance = this;
    if (data) {
      if(additionalMetaData.isFirstTime && data.contentType === 'TextBook') {
        data.identifier = additionalMetaData.identifier
      }
      instance.hierarchy[data.identifier] = {
        'name': data.name,
        'contentType': data.contentType,
        'children': _.map(data.children, function (child) {
          return child.identifier;
        }),
        'root': (data.contentType === 'TextBook') ? true : false
      };
    }
    _.forEach(data.children, child => {
      if (child.contentType === 'TextBookUnit' || child.contentType === 'TextBook') {
        instance.getFlatHierarchyObj(child, additionalMetaData);
      }
    });
    return instance.hierarchy;
  }


  getFlatNodesModified(data, additionalMetaData) {
    let instance = this;
    if (data) {
      if(additionalMetaData.isFirstTime && data.contentType === 'TextBook') {
        data.identifier = additionalMetaData.identifier
      }
      instance.nodeModified[data.identifier] = {
        'isNew': true,
        'root': (data.contentType === 'TextBook') ? true : false,
        'metadata': {
          ..._.omit(data, ['children', 'identifier']),
          'programId': additionalMetaData.programId,
          'allowedContentTypes': additionalMetaData.allowedContentTypes,
          'openForContribution': true,
          ...(data.contentType === 'Textbook' && { 'closedProgram': [] }),
          'channel': additionalMetaData.channel,
          'origin': data.identifier,
          'originData': {
            channel: data.channel
          }
        }
      };
    }

    _.forEach(data.children, child => {
      if (child.contentType === 'TextBookUnit' || child.contentType === 'TextBook') {
        instance.getFlatNodesModified(child, additionalMetaData);
      }
    });
    return instance.nodeModified;
  }
}



module.exports = HierarchyService;
