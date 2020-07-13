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
    const url = `${envVariables.CONTENT_SERVICE_URL}content/v3/hierarchy/update`;
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
    const url = `${envVariables.CONTENT_SERVICE_URL}content/v3/create`;

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

  existingHierarchyUpdateRequest(data, additionalMetaData, children) {
    let instance = this;
    this.hierarchy = {};
    this.nodeModified = {};
    const response = data.result;

    return {
      nodesModified: instance.getFlatNodesModified(
        response.content,
        additionalMetaData,
        children
      ),
      hierarchy: instance.getFlatHierarchyObj(response.content, additionalMetaData, children)
    };
  }

  openForContribution(data, openForContribution) {
    let instance = this;
    data["openForContribution"] = openForContribution;

    _.forEach(data.children, child => {
        instance.openForContribution(child, openForContribution);
    });
  }

  newHierarchyUpdateRequest(collection, additionalMetaData, children) {
    let instance = this;
    this.hierarchy = {};
    this.nodeModified = {};
    const response = collection.originHierarchy;
    additionalMetaData = {
      ...collection.creationResult.result,
      ...additionalMetaData,
      isFirstTime: true
    };

    // Set textbook allow to open for contribution
    response.content['openForContribution'] = true;
    let chapterCountForContribution = 0;

    _.forEach(response.content.children, (child, i) => {
        let cindex = children.findIndex(item => item.id === child.identifier);

        if (cindex !== -1) {
          ++chapterCountForContribution;
          instance.openForContribution(child, true);
        }
        else {
          instance.openForContribution(child, false);
        }
    });

    response.content['chapterCountForContribution'] = chapterCountForContribution;

    return {
      nodesModified: instance.getFlatNodesModified(
        response.content,
        additionalMetaData,
        children
      ),
      hierarchy: instance.getFlatHierarchyObj(
        response.content,
        additionalMetaData,
        children
      )
    };
  }

  getFlatHierarchyObj(data, additionalMetaData, children) {
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
        instance.getFlatHierarchyObj(child, additionalMetaData, children);
      }
    });
    return instance.hierarchy;
  }

  getFlatNodesModified(data, additionalMetaData, children) {
    let instance = this;
    let nodeId;
    if (data) {
      if (additionalMetaData.isFirstTime && data.contentType === "TextBook") {
        nodeId = additionalMetaData.identifier;
      } else {
        nodeId = data.identifier;
      }

      instance.nodeModified[nodeId] = {
        isNew: true,
        root: data.contentType === "TextBook" ? true : false,
        metadata: {
          ..._.omit(data, [
            "children",
            "identifier",
            "parent",
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
          ...(data.contentType === "TextBook" && {
            chapterCount : data.children ? data.children.length : 0
          }),
          programId: additionalMetaData.programId,
          allowedContentTypes: additionalMetaData.allowedContentTypes,
          channel: envVariables.DOCK_CHANNEL || "sunbird",
          origin: data.origin || data.identifier,
          originData: {
            channel: data.originData ? data.originData.channel : data.channel
          }
        }
      };
    }

    _.forEach(data.children, child => {
      if (
        child.contentType === "TextBookUnit" ||
        child.contentType === "TextBook"
      ) {
        instance.getFlatNodesModified(child, additionalMetaData, children);
      }
    });
    return instance.nodeModified;
  }
}

module.exports = HierarchyService;
