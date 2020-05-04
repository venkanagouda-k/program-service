const TelemetryServiceInstance = require('sb_telemetry_util');
const envVariables = require('../envVariables');
const _ = require("lodash");
const telemetryEventConfig = require('../config/telemetryEventConfig.json');

const telemetryInstance = new TelemetryServiceInstance();

function initTelemetry() {
    config = {
        host: envVariables.telemetryConfig.host,
        endpoint: envVariables.telemetryConfig.endpoint,
        method: envVariables.telemetryConfig.method
    }
    telemetryInstance.init(config);
}

function generateAuditEvent(DBinstance, model) {
    const event = {};
        event['context'] = {
           pdata: telemetryEventConfig.pdata,
           env: model.name
        }
        event['edata'] = {
            props: _.keys(DBinstance.previous())
        }
        event['object'] = {
           id: DBinstance[model.primaryKeyAttributes[0]] || '',
           type: model.name
        }
    telemetryInstance.audit(event);
}

module.exports.initializeTelemetryService = initTelemetry
module.exports.generateAuditEvent = generateAuditEvent