const SamplesService = require('../route-services/samples');

const samplesService = new SamplesService();

module.exports = {
  'samples#get': (req, res, next) => {
    samplesService.getSamples(req.params.projectUuid)
      .then((data) => res.json(data))
      .catch(next);
  },
  'samples#update': (req, res, next) => {
    const { body, params: { projectUuid } } = req;
    console.log('UPDATING IN API ', req.params.projectUuid);
    samplesService.updateSamples(projectUuid, body)
      .then((data) => res.json(data))
      .catch(next);
  },
  // 'samples#delete': (req, res, next) => {
  //   samplesService.deleteSamples(req.params.projectUuid).catch(next);
  // },
};
