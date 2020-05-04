module.exports = function(sequelize, DataTypes) {
  const configuration = sequelize.define("configuration", {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true
    },
    key: {
      type: DataTypes.STRING,
      allowNull: false
    },
    value: {
      type: DataTypes.STRING,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM("active", "inactive"),
      allowNull: false
    },
    createdby: {
      type: DataTypes.STRING
    },
    updatedby: {
      type: DataTypes.STRING
    },
    createdon: {
      type: DataTypes.DATE
    },
    updatedon: {
      type: DataTypes.DATE
    }
  }, {
    timestamps: false,
    freezeTableName: true
  });
  return configuration;
};
