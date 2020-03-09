const Sequelize = require('sequelize')
      envVariables = require('../envVariables')
      path = require('path')

var db = {};
var sequelize = new Sequelize(envVariables.config.database, envVariables.config.user, envVariables.config.password, envVariables.config);


var model = sequelize['import'](path.join(__dirname, 'program.js'));
db[model.name] = model;

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
