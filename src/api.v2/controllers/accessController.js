const parseSNSMessage = require('../../utils/parse-sns-message');

const getExperimentUsers = require('../helpers/access/getExperimentUsers');
const createUserInvite = require('../helpers/access/createUserInvite');
const removeAccess = require('../helpers/access/removeAccess');
const postRegistrationHandler = require('../helpers/access/postRegistrationHandler');

const OK = require('../../utils/responses/OK');
const getLogger = require('../../utils/getLogger');

const logger = getLogger('[AccessController] - ');

const getUserAccess = async (req, res) => {
  const { experimentId } = req.params;

  logger.log(`Fetching users for experiment ${experimentId}`);
  const users = await getExperimentUsers(experimentId);

  logger.log(`Users fetched for experiment ${experimentId}`);

  res.json(users);
};

const inviteUser = async (req, res) => {
  const { experimentId } = req.params;
  const {
    userEmail, role,
  } = req.body;

  logger.log(`Inviting users to experiment ${experimentId}`);
  await createUserInvite(experimentId, userEmail, role, req.user);

  logger.log(`Users invited to experiment ${experimentId}`);

  res.json(OK());
};

const revokeAccess = async (req, res) => {
  const { experimentId } = req.params;
  const { userEmail } = req.body;

  logger.log(`Deleting user access from experiment ${experimentId}`);
  await removeAccess(experimentId, userEmail);

  logger.log(`User access deleted from experiment ${experimentId}`);

  res.json(OK());
};

const postRegistration = async (req, res) => {
  let data;

  try {
    const { parsedMessage } = await parseSNSMessage(req);
    data = parsedMessage;
  } catch (e) {
    logger.error('Parsing initial SNS message failed:', e);
    return;
  }

  const { userEmail, userId } = data;

  logger.log(`Handling post-registration for user ${userEmail}`);
  await postRegistrationHandler(userEmail, userId);

  logger.log(`Finished handling post-registration for user ${userEmail}`);

  res.json(OK());
};

module.exports = {
  getUserAccess,
  inviteUser,
  revokeAccess,
  postRegistration,
};
