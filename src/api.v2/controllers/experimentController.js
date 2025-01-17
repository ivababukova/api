const _ = require('lodash');

const Experiment = require('../model/Experiment');
const UserAccess = require('../model/UserAccess');

const getLogger = require('../../utils/getLogger');
const { OK, NotFoundError } = require('../../utils/responses');
const sqlClient = require('../../sql/sqlClient');

const getExperimentBackendStatus = require('../helpers/backendStatus/getExperimentBackendStatus');

const logger = getLogger('[ExperimentController] - ');

const getAllExperiments = async (req, res) => {
  const { user: { sub: userId } } = req;

  const data = await new Experiment().getAllExperiments(userId);

  res.json(data);
};

const getExperiment = async (req, res) => {
  const { params: { experimentId } } = req;

  logger.log(`Getting experiment ${experimentId}`);

  const data = await new Experiment().getExperimentData(experimentId);

  logger.log(`Finished getting experiment ${experimentId}`);

  res.json(data);
};

const createExperiment = async (req, res) => {
  const { params: { experimentId }, user, body } = req;
  const { name, description } = body;

  logger.log('Creating experiment');

  await sqlClient.get().transaction(async (trx) => {
    await new Experiment(trx).create({ id: experimentId, name, description });
    await new UserAccess(trx).createNewExperimentPermissions(user.sub, experimentId);
  });

  logger.log(`Finished creating experiment ${experimentId}`);
  res.json(OK());
};

const patchExperiment = async (req, res) => {
  const { params: { experimentId }, body } = req;
  logger.log(`Patching experiment ${experimentId}`);

  const snakeCasedKeysToPatch = _.mapKeys(body, (_value, key) => _.snakeCase(key));

  await new Experiment().updateById(experimentId, snakeCasedKeysToPatch);

  logger.log(`Finished patching experiment ${experimentId}`);
  res.json(OK());
};

const deleteExperiment = async (req, res) => {
  const { params: { experimentId } } = req;
  logger.log(`Deleting experiment ${experimentId}`);

  const result = await new Experiment().deleteById(experimentId);

  if (result.length === 0) {
    throw new NotFoundError(`Experiment ${experimentId} not found`);
  }


  logger.log(`Finished deleting experiment ${experimentId}`);
  res.json(OK());
};

const updateSamplePosition = async (req, res) => {
  const {
    params: { experimentId },
    body: { newPosition, oldPosition },
  } = req;
  logger.log(`Reordering sample in ${experimentId} from position ${oldPosition} to ${newPosition}`);

  if (oldPosition === newPosition) {
    logger.log('Skipping reordering, oldPosition === newPosition');
    res.json(OK());

    return;
  }

  await new Experiment().updateSamplePosition(experimentId, oldPosition, newPosition);

  logger.log(`Finished reordering samples in ${experimentId}`);
  res.json(OK());
};

const getProcessingConfig = async (req, res) => {
  const { params: { experimentId } } = req;
  logger.log('Getting processing config for experiment ', experimentId);

  const result = await new Experiment().getProcessingConfig(experimentId);

  logger.log('Finished getting processing config for experiment ', experimentId);
  res.json(result);
};

const updateProcessingConfig = async (req, res) => {
  const { params: { experimentId }, body } = req;
  logger.log('Updating processing config for experiment ', experimentId);

  await new Experiment().updateProcessingConfig(experimentId, body);

  logger.log('Finished updating processing config for experiment ', experimentId);
  res.json(OK());
};

const getBackendStatus = async (req, res) => {
  const { experimentId } = req.params;
  logger.log(`Getting backend status for experiment ${experimentId}`);

  const response = await getExperimentBackendStatus(experimentId);

  logger.log(`Finished getting backend status for experiment ${experimentId} successfully`);
  res.json(response);
};

const downloadData = async (req, res) => {
  const { experimentId, type: downloadType } = req.params;

  logger.log(`Providing download link for download ${downloadType} for experiment ${experimentId}`);

  const downloadLink = await new Experiment().getDownloadLink(experimentId, downloadType);
  res.json(downloadLink);
};

module.exports = {
  getAllExperiments,
  getExperiment,
  createExperiment,
  updateProcessingConfig,
  patchExperiment,
  deleteExperiment,
  updateSamplePosition,
  getProcessingConfig,
  getBackendStatus,
  downloadData,
};
