const { forkJoin } = require("rxjs");
const _ = require("lodash");
const envVariables = require("../envVariables");
const axios = require("axios");

class HierarchyService {
  filterExistingTextbooks(collectionIds, reqHeaders) {
    const url = `${envVariables.baseURL}/api/composite/v1/search`;
    const filterRequest = _.map(collectionIds, id => {
      const option = {
        url: url,
        method: "post",
        headers: reqHeaders,
        data: {
          request: {
            filters: {
              objectType: "content",
              status: ["Draft", "Live"],
              identifier: id,
              contentType: "Textbook"
            }
          }
        }
      };
      return axios(option);
    });

    return forkJoin(...filterRequest);
  }

  bulkUpdateHierarchy(collections, reqHeaders) {
    const url = `${envVariables.baseURL}/action/content/v3/hierarchy/update`;

    const bulkRequest = _.map(collections, collection => {
      const createdBy = this.getCreatedBy(collection);
      const option = {
        url,
        method: "patch",
        headers: _.merge({}, reqHeaders, {
          "x-authenticated-userid": createdBy
        }),
        data: {
          request: {
            data: collection
          }
        }
      };
      return axios(option);
    });

    return forkJoin(...bulkRequest);
  }

  getCreatedBy(collection) {
    const nodesModified = _.get(collection, "nodesModified");
    const rootNode = _.findKey(nodesModified, item => {
      return item.root === true;
    });
    return nodesModified[rootNode].metadata.createdBy || null;
  }

  createCollection(collections, reqHeaders) {
    const url = `${envVariables.baseURL}/action/content/v3/create`;

    const bulkRequest = _.map(collections, collection => {
      const option = {
        url,
        method: "post",
        headers: reqHeaders,
        data: {
          request: {
            content: {
              ..._.omit(collection.result.content, [
                "children",
                "identifier",
                "status",
                "reservedDialcodes",
                "dialcodes",
                "license",
                "sYS_INTERNAL_LAST_UPDATED_ON",
                "contentCredits",
                "consumerId",
                "osId",
                "qrCodeProcessId",
                "idealScreenSize",
                "contentDisposition",
                "os",
                "idealScreenDensity",
                "depth"
              ])
            }
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

  getHierarchy(collectionIds, reqHeaders) {
    const collectiveRequest = _.map(collectionIds, id => {
      const url = `${envVariables.SUNBIRD_URL}/action/content/v3/hierarchy/${id}?mode=edit`;
      const option = {
        url: url,
        method: "get",
        headers: reqHeaders
      };
      return axios(option);
    });
    return forkJoin(...collectiveRequest);
  }

  getExistingCollection(collections) {
    return _.map(
      _.filter(collections, r => {
        return r.result.count > 0;
      }),
      tb => tb.result.content[0].identifier
    );
  }

  getNonExistingCollection(collections) {
    return _.map(
      _.filter(collections, r => {
        return r.result.count === 0;
      }),
      tb => JSON.parse(tb.config).request.filters.identifier
    );
  }

  existingHierarchyUpdateRequest(data, additionalMetaData) {
    let instance = this;
    this.hierarchy = {};
    this.nodeModified = {};
    const response = data.result;
    return {
      nodesModified: instance.getFlatNodesModified(
        response.content,
        additionalMetaData
      ),
      hierarchy: instance.getFlatHierarchyObj(response.content)
    };
  }

  newHierarchyUpdateRequest(collection, additionalMetaData) {
    let instance = this;
    this.hierarchy = {};
    this.nodeModified = {};
    const response = collection.originHierarchy;
    additionalMetaData = {
      ...collection.creationResult.result,
      ...additionalMetaData,
      isFirstTime: true
    };
    return {
      nodesModified: instance.getFlatNodesModified(
        response.content,
        additionalMetaData
      ),
      hierarchy: instance.getFlatHierarchyObj(
        response.content,
        additionalMetaData
      )
    };
  }

  getFlatHierarchyObj(data, additionalMetaData) {
    let instance = this;
    if (data) {
      if (additionalMetaData.isFirstTime && data.contentType === "TextBook") {
        data.identifier = additionalMetaData.identifier;
      }
      instance.hierarchy[data.identifier] = {
        name: data.name,
        contentType: data.contentType,
        children: _.compact(
          _.map(data.children, function(child) {
            if (
              child.mimeType === "application/vnd.ekstep.content-collection" &&
              (child.contentType === "TextBook" ||
                child.contentType === "TextBookUnit")
            ) {
              console.log(child.mimeType, child.identifier);
              return child.identifier;
            }
          })
        ),
        root: data.contentType === "TextBook" ? true : false
      };
    }
    _.forEach(data.children, child => {
      if (
        child.contentType === "TextBookUnit" ||
        child.contentType === "TextBook"
      ) {
        instance.getFlatHierarchyObj(child, additionalMetaData);
      }
    });
    return instance.hierarchy;
  }

  getFlatNodesModified(data, additionalMetaData) {
    let instance = this;
    if (data) {
      if (additionalMetaData.isFirstTime && data.contentType === "TextBook") {
        data.identifier = additionalMetaData.identifier;
      }
      instance.nodeModified[data.identifier] = {
        isNew: true,
        root: data.contentType === "TextBook" ? true : false,
        metadata: {
          ..._.omit(data, [
            "children",
            "identifier",
            "status",
            "reservedDialcodes",
            "dialcodes",
            "license",
            "sYS_INTERNAL_LAST_UPDATED_ON",
            "contentCredits",
            "consumerId",
            "osId",
            "qrCodeProcessId",
            "idealScreenSize",
            "contentDisposition",
            "os",
            "idealScreenDensity",
            "depth"
          ]),
          programId: additionalMetaData.programId,
          allowedContentTypes: additionalMetaData.allowedContentTypes,
          openForContribution: true,
          channel: envVariables.DOCK_CHANNEL || "sunbird",
          origin: data.identifier,
          originData: {
            channel: data.channel
          }
        }
      };
    }

    _.forEach(data.children, child => {
      if (
        child.contentType === "TextBookUnit" ||
        child.contentType === "TextBook"
      ) {
        instance.getFlatNodesModified(child, additionalMetaData);
      }
    });
    return instance.nodeModified;
  }
}

module.exports = HierarchyService;
