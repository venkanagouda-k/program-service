
const telemetryService = require('../service/telemetryService');

function manageModelHooks(db) {
   db.program.addHook('beforeUpdate', (instance) => {telemetryService.generateAuditEvent(instance, db.program)});
   db.program.addHook('beforeCreate', (instance) => {telemetryService.generateAuditEvent(instance, db.program)});
   db.nomination.addHook('beforeUpdate', (instance) => {telemetryService.generateAuditEvent(instance, db.nomination)});
   db.nomination.addHook('beforeCreate', (instance) => {telemetryService.generateAuditEvent(instance, db.nomination)});
     }

module.exports.AttachModelHooks = manageModelHooks;