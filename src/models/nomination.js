module.exports = function(sequelize, DataTypes) {
    const nomination = sequelize.define("nomination", {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      program_id: {
        type: DataTypes.UUID,
        allowNull: false
      },
      user_id: {
        type: DataTypes.STRING,
        allowNull: false
      },
      organisation_id: {
        type: DataTypes.STRING
      },
      status: {
        type: DataTypes.ENUM("Pending", "Approved", "Rejected"),
        allowNull: false
      },
      content_types: {
        type: DataTypes.ARRAY(DataTypes.TEXT)
      },
      collection_ids: {
        type: DataTypes.ARRAY(DataTypes.TEXT)
      },
      feedback: {
        type: DataTypes.TEXT
      },
      rolemapping: {
        type: DataTypes.JSON
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
    return nomination;
  };