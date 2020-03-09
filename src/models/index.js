const Sequelize = require('sequelize')
      envVariables = require('../envVariables')
      path = require('path')
      fs = require('fs');
      basename  = path.basename(module.filename);

var db = {};
var sequelize = new Sequelize(envVariables.config.database, envVariables.config.user, envVariables.config.password, envVariables.config);

fs.readdirSync(__dirname)
  .filter(function(file) {
    return (file.indexOf('.') !== 0) && (file !== basename) && (file.slice(-3) === '.js');
  })
  .forEach(function(file) {
    var model = sequelize['import'](path.join(__dirname, file));
    db[model.name] = model;
  });

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
