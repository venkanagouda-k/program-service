module.exports = (sequelize, DataTypes) => {
  const bulk_job_request = sequelize.define("bulk_job_request", {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true
    },
    process_id: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    program_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    collection_id: {
      type: DataTypes.STRING
    },
    org_id: {
      type: DataTypes.STRING
    },
    status: {
      type: DataTypes.ENUM("processing", "completed"),
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM('bulk_upload', 'bulk_approval'),
      allowNull: false
    },
    overall_stats: {
      type: DataTypes.JSON
    },
    data: {
      type: DataTypes.JSON
    },
    err_message: {
      type: DataTypes.TEXT
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
    },
    completedon: {
      type: DataTypes.DATE
    },
    expiration: {
      type: DataTypes.DATE
    }
  },{
    timestamps: false,
    freezeTableName: true
});
  return bulk_job_request;
}
