module.exports = function(sequelize, DataTypes) {
  const content = sequelize.define("contenttypes", {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    value: {
      type: DataTypes.ENUM("TeachingMethod", "PedagogyFlow", "FocusSpot", "LearningOutcomeDefinition", "PracticeQuestionSet", "CuriosityQuestionSet", "MarkingSchemeRubric", "ExplanationResource", "ExperientialResource", "ConceptMap", "SelfAssess"),
      allowNull: false
    }
  }, {
    timestamps: false,
    freezeTableName: true
  });
  return content;
};
