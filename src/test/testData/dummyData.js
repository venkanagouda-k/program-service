exports.programUpdate = {
    program_id: '',
    description: 'description update by testCases'
}

exports.mandatoryFieldsProgramCreate = ['config', 'type'] // ['config', 'type', 'status', 'createdby']
exports.mandatoryFieldsProgramUpdate = ['program_id'] // ['program_id', 'status', 'updatedby']

exports.nominationAdd = {
    program_id: '',
    user_id: "f7dab7bc-b9ea-457a-b4d9-7633fbd9736c",
    status: 'Initiated',
    content_types: ["PracticeQuestionSet"],
    organisation_id: "4fe5d899-dc3e-48de-b0b6-891e0922d371",
    createdby: 'f7dab7bc-b9ea-457a-b4d9-7633fbd9736c'
}

exports.nominationUpdate = {
    program_id: '',
    user_id: 'f7dab7bc-b9ea-457a-b4d9-7633fbd9736c',
    status: 'Pending',
    content_types: ["PracticeQuestionSet"],
    updatedby: '6e1cef48-aa38-4d53-9f3a-4f73dafd4d88',
    collection_ids: ["do_11305198433242316813067"]
}

exports.mandatoryFieldsNominationAdd = ['program_id', 'user_id', 'status'] // ['program_id', 'user_id', 'status', 'createdby']
exports.mandatoryFieldsNominationUpdate = ['program_id', 'user_id'] // ['program_id', 'user_id', 'status', 'updatedby']

exports.preferenceAdd = {
    preference: {medium: ["English"], subject: ["English"]},
    program_id: "",
    type: "sourcing",
    user_id: "cca53828-8111-4d71-9c45-40e569f13bad"
}

exports.preferenceRead = {
    program_id: "",
    user_id: "cca53828-8111-4d71-9c45-40e569f13bad"
}

exports.regOrgSearch = {
        "id": "open-saber.registry.search",
        "ver": "1.0",
        "ets": "11234",
        "params": {
          "did": "",
          "key": "",
          "msgid": ""
        },
        "request": {
          "entityType": ["Org"],
          "filters": {
            "osid": {
              "or": ['4fe5d899-dc3e-48de-b0b6-891e0922d371']
            }
          }
        }
}

exports.regUserSearch = {
    "id": "open-saber.registry.search",
    "ver": "1.0",
    "ets": "11234",
    "params": {
      "did": "",
      "key": "",
      "msgid": ""
    },
    "request": {
      "entityType": ["User"],
      "filters": {
        "userId": {
          "or": ['f7dab7bc-b9ea-457a-b4d9-7633fbd9736c']
        }
      }
    }
}