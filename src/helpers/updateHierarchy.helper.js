const {
  forkJoin
} = require('rxjs');
const _ = require("lodash");
const envVariables = require('../envVariables');
const axios = require('axios');
const headers = {
  'Content-Type': 'application/json',
  // tslint:disable-next-line:max-line-length
  'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiIyZThlNmU5MjA4YjI0MjJmOWFlM2EzNjdiODVmNWQzNiJ9.gvpNN7zEl28ZVaxXWgFmCL6n65UJfXZikUWOKSE8vJ8',
  // tslint:disable-next-line:max-line-length
  'X-Authenticated-User-Token': 'eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJ1WXhXdE4tZzRfMld5MG5PS1ZoaE5hU0gtM2lSSjdXU25ibFlwVVU0TFRrIn0.eyJqdGkiOiIwNjJhZTU2Mi1kYTFmLTQ5ZDMtOWRkNC0yNWViMDM0MmViYWEiLCJleHAiOjE1ODQ5ODEwMDcsIm5iZiI6MCwiaWF0IjoxNTg0ODA4MjA3LCJpc3MiOiJodHRwczovL2Rldi5zdW5iaXJkZWQub3JnL2F1dGgvcmVhbG1zL3N1bmJpcmQiLCJzdWIiOiJmOjVhOGEzZjJiLTM0MDktNDJlMC05MDAxLWY5MTNiYzBmZGUzMTo5NWU0OTQyZC1jYmU4LTQ3N2QtYWViZC1hZDhlNmRlNGJmYzgiLCJ0eXAiOiJCZWFyZXIiLCJhenAiOiJhZG1pbi1jbGkiLCJhdXRoX3RpbWUiOjAsInNlc3Npb25fc3RhdGUiOiI2MDI0OTc4Zi1lYmY3LTQ1NjctYTA1NC04ZTU0NGU2YmEwYTQiLCJhY3IiOiIxIiwiYWxsb3dlZC1vcmlnaW5zIjpbImh0dHBzOi8vZGV2LmNlbnRyYWxpbmRpYS5jbG91ZGFwcC5henVyZS5jb20vIiwiaHR0cDovL2Rldi5jZW50cmFsaW5kaWEuY2xvdWRhcHAuYXp1cmUuY29tLyJdLCJyZWFsbV9hY2Nlc3MiOnsicm9sZXMiOlsib2ZmbGluZV9hY2Nlc3MiLCJ1bWFfYXV0aG9yaXphdGlvbiJdfSwic2NvcGUiOiIiLCJuYW1lIjoiUmV2aWV3ZXIgVXNlciIsInByZWZlcnJlZF91c2VybmFtZSI6Im50cHRlc3QxMDMiLCJnaXZlbl9uYW1lIjoiUmV2aWV3ZXIiLCJmYW1pbHlfbmFtZSI6IlVzZXIiLCJlbWFpbCI6InVzZXJ0ZXN0MTNAdGVzdHNzLmNvbSJ9.WmRKLLUOgo4ASxkbD6OKydXXlnPJ38vn-9gEKl2lHdSO6XQBK3kUoZB6-wBa0Oh3CwZebY-QPXX8waquvPZTckN1Nd-WtAkf60ISMTUMvwRy8eAcJUPOcEzYLfvsDYRZ7GK6-F6LR3VMBPnzrw32LL8pc22lpUtG_UbQbOkVfPll05y2u14VanF-Rugf3lM2My-I0HktSUq8fa0URF9iEuhuIvoOTyOREYibfFXhP0En5iagGOZ0WETdjdeCWZFKHwgLT4dLHde5sjemZowPXk_Sg52y31G2YuPDNWUho_ZIdN2d7uK12Mmkoyu5m_MlZI2NWia525XY9Fu8G2tzsQ'
}
const dockHeader = {
  'Content-Type': 'application/json',
  // tslint:disable-next-line:max-line-length
  'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJhMzRmNjM3NTM4ZTg0MTc3OWVlNjMwM2FkYzExNDY0NCJ9.RpY7PL4ASDLNOU9xMCKXZtDF4vUPuMTDVO6keh4kI1M',
  // tslint:disable-next-line:max-line-length
  'X-Authenticated-User-Token': 'eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJ1WXhXdE4tZzRfMld5MG5PS1ZoaE5hU0gtM2lSSjdXU25ibFlwVVU0TFRrIn0.eyJqdGkiOiJiNTM1YzhmMy1kYWE2LTRjNjgtOGIwMC03NTE0NWRiNzZlYTEiLCJleHAiOjE1ODUyMjc2OTgsIm5iZiI6MCwiaWF0IjoxNTg1MDU0ODk4LCJpc3MiOiJodHRwczovL2Rldi5zdW5iaXJkZWQub3JnL2F1dGgvcmVhbG1zL3N1bmJpcmQiLCJzdWIiOiJmOjVhOGEzZjJiLTM0MDktNDJlMC05MDAxLWY5MTNiYzBmZGUzMTo5NWU0OTQyZC1jYmU4LTQ3N2QtYWViZC1hZDhlNmRlNGJmYzgiLCJ0eXAiOiJCZWFyZXIiLCJhenAiOiJhZG1pbi1jbGkiLCJhdXRoX3RpbWUiOjAsInNlc3Npb25fc3RhdGUiOiI2NmY3MGQyMy00ZjI5LTRkYTUtOWIxNi0xMjI0MjY2MmJiNjIiLCJhY3IiOiIxIiwiYWxsb3dlZC1vcmlnaW5zIjpbImh0dHBzOi8vZGV2LmNlbnRyYWxpbmRpYS5jbG91ZGFwcC5henVyZS5jb20vIiwiaHR0cDovL2Rldi5jZW50cmFsaW5kaWEuY2xvdWRhcHAuYXp1cmUuY29tLyJdLCJyZWFsbV9hY2Nlc3MiOnsicm9sZXMiOlsib2ZmbGluZV9hY2Nlc3MiLCJ1bWFfYXV0aG9yaXphdGlvbiJdfSwic2NvcGUiOiIiLCJuYW1lIjoiUmV2aWV3ZXIgVXNlciIsInByZWZlcnJlZF91c2VybmFtZSI6Im50cHRlc3QxMDMiLCJnaXZlbl9uYW1lIjoiUmV2aWV3ZXIiLCJmYW1pbHlfbmFtZSI6IlVzZXIiLCJlbWFpbCI6InVzKioqKioqKipAdGVzdHNzLmNvbSJ9.I5AzsEWpdVvuO7ixvrAPhudKa-iJB1OqE5dpjkQ0oqZfEyBz3ki_v5MYdW1s7bFqvH-IqnyVYx8RjB1UiW4xH39qiv7llK0WfwH1-Xe6ENTom-HxSB1JZtLBydfGODzYqXBkCEKwuHK84fgiprv-SHrbS01SRlJ72TL8vDPC7i51PIGGXgNI5KcDcd_ALen87SHdXwC6CC7kEaHyi4p_ttZnRJRyB03UiacSE1q5ifQb7px4dhfNIcJUn1LNe4FAy-npHE4Tcdx3ij_dM6-PC0WQwQqvXPWdZU_JcFXHFnu79XW5jjqlDWaZxShKcGM6dbBO3yhk6ydMdlUVKG5GPw'
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
        headers: _.merge({}, dockHeader, {
          'x-authenticated-userid': createdBy
        }),
        data: {
          request: {
            data: collection
          }
        }
      };
      console.log(option)
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
            content: {
              ..._.omit(collection.result.content, ['children', 'identifier', 'status', 'reservedDialcodes', 'dialcodes', 'license', 'framework', 'subject', 'medium', 'gradeLevel', 'board', 'sYS_INTERNAL_LAST_UPDATED_ON', 'contentCredits', 'consumerId', 'osId', 'qrCodeProcessId', 'idealScreenSize', 'contentDisposition', 'os', 'idealScreenDensity', 'depth',])
            }
          }
        },
        params: {
          identifier: collection.result.content.identifier
        }
      };
      console.log(option)
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

  getHierarchyUpdateRequest(collection, additionalMetaData) {
    let instance = this;
    this.hierarchy = {}
    this.nodeModified = {}
    const response = collection.originHierarchy;
    additionalMetaData = {
      ...collection.creationResult.result,
      ...additionalMetaData,
      'isFirstTime': true
    }
    return {
      nodesModified: instance.getFlatNodesModified(response.content, additionalMetaData),
      hierarchy: instance.getFlatHierarchyObj(response.content, additionalMetaData),
      'lastUpdatedBy': '95e4942d-cbe8-477d-aebd-ad8e6de4bfc8'
    }
  }

  getFlatHierarchyObj(data, additionalMetaData) {
    let instance = this;
    if (data) {
      if (additionalMetaData.isFirstTime && data.contentType === 'TextBook') {
        data.identifier = additionalMetaData.identifier
      }
      instance.hierarchy[data.identifier] = {
        'name': data.name,
        'contentType': data.contentType,
        'children': _.compact(_.map(data.children, function (child) {
          if(child.mimeType === 'application/vnd.ekstep.content-collection'){
            console.log(child.mimeType, child.identifier)
            return child.identifier;
          }
        })),
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
      if (additionalMetaData.isFirstTime && data.contentType === 'TextBook') {
        data.identifier = additionalMetaData.identifier
      }
      instance.nodeModified[data.identifier] = {
        'isNew': true,
        'root': (data.contentType === 'TextBook') ? true : false,
        'metadata': {
          ...(data.contentType === 'TextBook' && {
            ..._.omit(data, ['children', 'identifier', 'framework', 'subject', 'medium', 'gradeLevel', 'board']),
            'closedProgram': []
          }),
          ...(data.contentType === 'TextBookUnit' && {
            ..._.omit(data, ['children', 'identifier'])
          }),
          'programId': additionalMetaData.programId,
          'allowedContentTypes': additionalMetaData.allowedContentTypes,
          'openForContribution': true,
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
