const MetadataTracksService = require('../route-services/metadataTracks');

const {
  expressAuthorizationMiddleware,
} = require('../../utils/authMiddlewares');

const metadataTracksService = new MetadataTracksService();

module.exports = {
  'metadataTracks#get': [
    // expressAuthorizationMiddleware,
    (req, res, next) => next(),
    (req, res, next) => {
      metadataTracksService.getMetadataTrack(req.params.metadataTrackUuid)
        .then((response) => res.json(response))
        .catch(next);
    },
  ],
  'metadataTracks#getByProject': [
    // expressAuthorizationMiddleware,
    (req, res, next) => next(),
    (req, res, next) => {
      metadataTracksService.getMetadataTracks(req.params.projectUuid)
        .then((response) => res.json(response))
        .catch(next);
    },
  ],
  // 'projects#delete': [
  //   expressAuthorizationMiddleware,
  //   (req, res, next) => {
  //     projectsService.deleteProject(req.params.projectUuid)
  //       .then((data) => res.json(data))
  //       .catch(next);
  //   }],
  // 'projects#getExperiments': [
  //   expressAuthorizationMiddleware,
  //   (req, res, next) => {
  //     projectsService.getExperiments(req.params.projectUuid)
  //       .then((response) => res.json(response)).catch(next);
  //   }],
};
