module.exports = function(sequelize, DataTypes) {
    const program = sequelize.define("program", {
      program_id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT
      },
      default_roles: {
        type: DataTypes.ARRAY(DataTypes.TEXT)
      },
      content_types: {
        type: DataTypes.ARRAY(DataTypes.TEXT)
      },
      startdate: {
        type: DataTypes.DATE
      },
      enddate: {
        type: DataTypes.DATE
      },
      nomination_enddate: {
        type: DataTypes.DATE
      },
      shortlisting_enddate: {
        type: DataTypes.DATE
      },
      content_submission_enddate: {
        type: DataTypes.DATE
      },
      image_path: {
        type: DataTypes.STRING
      },
      status: {
        type: DataTypes.STRING
      },
      slug: {
        type: DataTypes.STRING
      },
      config: {
        type: DataTypes.TEXT
      }
    }, {
        timestamps: false,
        freezeTableName: true
    });
    return program;
  };