module.exports = function(sequelize, DataTypes) {
    const preference = sequelize.define("user_program_preference", {
      user_id: {
        type: DataTypes.STRING,
        allowNull: false
      },
      program_id: {
        type: DataTypes.UUID,
        allowNull: false
      },
      contributor_preference: {
        type: DataTypes.JSON
      },
      sourcing_preference: {
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
    return preference;
  };