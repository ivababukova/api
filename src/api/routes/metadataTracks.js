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
  'metadataTracks#getValueForSample': [
    // expressAuthorizationMiddleware,
    (req, res, next) => next(),
    (req, res, next) => {
      metadataTracksService.getMetadataTrackValueForSample(
        req.params.sampleUuid, req.params.metadataTrackUuid,
      )
        .then((response) => res.json(response))
        .catch(next);
    },
  ],
  'metadataTracks#getByProject': [
    // expressAuthorizationMiddleware,
    (req, res, next) => next(),
    (req, res, next) => {
      metadataTracksService.getMetadataTracksByProject(req.params.projectUuid)
        .then((response) => res.json(response))
        .catch(next);
    },
  ],
  'metadataTracks#create': [
    // expressAuthorizationMiddleware,
    (req, res, next) => next(),
    (req, res, next) => {
      metadataTracksService.createMetadataTrack(
        req.params.projectUuid, req.body,
      )
        .then((response) => res.json(response))
        .catch(next);
    },
  ],
  'metadataTracks#setValueForSample': [
    // expressAuthorizationMiddleware,
    (req, res, next) => next(),
    (req, res, next) => {
      metadataTracksService.setMetadataTrackValueForSample(
        req.params.sampleUuid, req.params.metadataTrackUuid, req.body.value,
      )
        .then((response) => res.json(response))
        .catch(next);
    },
  ],
  'metadataTracks#delete': [
    // expressAuthorizationMiddleware,
    (req, res, next) => next(),
    (req, res, next) => {
      metadataTracksService.deleteMetadataTrack(req.params.metadataTrackUuid)
        .then((response) => res.json(response))
        .catch(next);
    },
  ],
};
