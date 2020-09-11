const _ = require('lodash');
const messageUtils = require('./messageUtil');
const programFeedMessages = messageUtils.PROGRAM_FEED;
const responseCode = messageUtils.RESPONSE_CODE;
const keyGenerator = require('../helpers/redisKeyGenerator');
const RedisManager = require('../helpers/redisUtil');
const { successResponse, errorResponse, loggerError } = require('../helpers/responseUtil');
const { searchNominations, searchContributions, splitProgramIdFromKey, getNumberOfDays,
  generateUpdatesMap, getActionPendingContents, findAll, insertAndSetExpiry} = require('../helpers/programFeedHelper');
const redisManager = new RedisManager();
const config = require('better-config');
config.set('../config.json');


const DEFAULT_CONTENT_STATUS = config.get('application.feed.defaultContentStatus');
const DEFAULT_NOMINATION_STATUS = config.get('application.feed.defaultNominationStatus');
const DEFAULT_FEED_DAYS = config.get('application.feed.defaultFeedDays');

const searchForUpdates = async (req, response) => {
  let data = req.body
  const rspObj = req.rspObj;
  const client =  redisManager.getClient();

  const nominationRequest = _.get(data, 'request.nomination');
  const contributionRequest = _.get(data, 'request.contribution');
  const channel = _.get(data, 'request.channel');
  try {
    const channelPrograms = await client.smembersAsync(keyGenerator.getProgramUpdatesChannelKey(channel));
    const numberOfDays = await getNumberOfDays({key: 'projectFeedDays', status: 'active'})
    const stripRedisKey = keyGenerator.getProgramUpdatesHashKey('');
    const existingProgramUpdates = splitProgramIdFromKey(channelPrograms, stripRedisKey);
    const userRequestedNominations =  nominationRequest ? _.uniq(nominationRequest.programId) : [];
    const userRequestedContributions = contributionRequest ? _.uniq(contributionRequest.programId) : [];
    const nonExistingNominations = _.difference(userRequestedNominations, existingProgramUpdates);
    const nonExistingContributions = _.difference(userRequestedContributions, existingProgramUpdates);
    if (!channelPrograms.length) {
      let programByNominationCount = {}
      let programByContentCount = {}
      if(nominationRequest) {
        const nominationSearchRequest = {
          program_id: userRequestedNominations,
          status: nominationRequest.status || DEFAULT_NOMINATION_STATUS,
          days: numberOfDays || DEFAULT_FEED_DAYS
        }
        const newNominations = await searchNominations(nominationSearchRequest);
        console.log(`newNominations - ${JSON.stringify(newNominations)}`)
        if(newNominations.length) {
          const nominationsByProgram = _.groupBy(_.map(newNominations, 'dataValues'), 'program_id');
          programByNominationCount = generateUpdatesMap(nominationsByProgram, 'nominationCount');
        } else {
          programByNominationCount = generateUpdatesMap(userRequestedNominations, 'nominationCount');
        }
        console.log(programByNominationCount);
      }
      if(contributionRequest) {
        const contributionSearchRequest = {
          program_id: userRequestedContributions,
          status: contributionRequest.status || DEFAULT_CONTENT_STATUS,
          days: numberOfDays || DEFAULT_FEED_DAYS
        }
        const newContributions = await searchContributions(contributionSearchRequest, req.headers);
        const contents = _.get(newContributions, 'data.result.content');
        console.log(`newContributions - ${JSON.stringify(contents)}`)
        if(contents && contents.length){
          const notActedUponContents = await getActionPendingContents(contents, req.headers);
          const contentsByProgram = _.groupBy(notActedUponContents, 'programId');
          programByContentCount = generateUpdatesMap(contentsByProgram, 'contributionCount');
        } else {
          programByContentCount = generateUpdatesMap(userRequestedContributions, 'contributionCount');
        }
        console.log(programByContentCount);
      }
      const mergedUpdates = _.merge(programByNominationCount, programByContentCount);
      const result = await insertAndSetExpiry(mergedUpdates, channel, true);
      console.log(result)
      rspObj.responseCode = responseCode.SUCCESS;
      rspObj.result = mergedUpdates;
      return response.status(200).send(successResponse(rspObj));
    } else if(channelPrograms.length && (nonExistingNominations.length || nonExistingContributions.length)) {
      let programByNominationCount = {};
      let programByContentCount = {};
      if(nonExistingNominations.length) {
        const nominationSearchRequest = {
          program_id: nonExistingNominations,
          status: nominationRequest ? nominationRequest.status : DEFAULT_NOMINATION_STATUS,
          days: numberOfDays || DEFAULT_FEED_DAYS
        }
        const newNominations = await searchNominations(nominationSearchRequest);
        if(newNominations) {
          const nominationsByProgram = _.groupBy(_.map(newNominations, 'dataValues'), 'program_id');
          programByNominationCount = generateUpdatesMap(nominationsByProgram, 'nominationCount')
        } else {
          programByNominationCount = generateUpdatesMap(nonExistingNominations, 'nominationCount');
        }
        console.log(programByNominationCount);
      }
      if(nonExistingContributions.length) {
        const contributionSearchRequest = {
          program_id: nonExistingContributions,
          status: contributionRequest.status || DEFAULT_CONTENT_STATUS,
          days: numberOfDays || DEFAULT_FEED_DAYS
        }
        const newContributions = await searchContributions(contributionSearchRequest, req.headers);
        const contents = _.get(newContributions, 'data.result.content');
        if(contents) {
          const notActedUponContents = getActionPendingContents(contents, req.headers);
          const contentsByProgram = _.groupBy(notActedUponContents, 'programId');
          programByContentCount = generateUpdatesMap(contentsByProgram, 'contributionCount');
        } else {
          programByContentCount = generateUpdatesMap(nonExistingContributions, 'contributionCount');
        }
        console.log(programByContentCount);
      }
      const newUpdates = _.merge(programByNominationCount, programByContentCount);
      console.log(newUpdates)
      const existingUpdates = await findAll(channelPrograms, stripRedisKey);
      const mergedUpdates = _.merge(existingUpdates, newUpdates);
      const result = await insertAndSetExpiry(newUpdates, channel, false);
      rspObj.responseCode = responseCode.SUCCESS;
      rspObj.result = mergedUpdates;
      return response.status(200).send(successResponse(rspObj));
    } else if(channelPrograms.length) {
      const existingUpdates = await findAll(channelPrograms, stripRedisKey);
      console.log(existingUpdates)
      rspObj.responseCode = responseCode.SUCCESS;
      rspObj.result = existingUpdates;
      return response.status(200).send(successResponse(rspObj));
    }
  } catch(error) {
    console.log(error)
    rspObj.errCode = programFeedMessages.SEARCH.FAILED_CODE;
    rspObj.errMsg = error.message || programFeedMessages.SEARCH.FAILED_MESSAGE;
    rspObj.responseCode = responseCode.SERVER_ERROR;
    loggerError('Unable to search for program feed', rspObj.errCode, rspObj.errMsg, rspObj.responseCode, error, req);
    return response.status(500).send(errorResponse(rspObj));
  }
}

module.exports = {
  searchForUpdatesAPI : searchForUpdates
}
