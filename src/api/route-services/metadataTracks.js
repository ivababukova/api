/* eslint-disable no-param-reassign */
const { v4: uuidv4 } = require('uuid');
const dbConn = require('../../db/conn');
const logger = require('../../utils/logging');

const { OK, NotFoundError } = require('../../utils/responses');

class MetadataTracksService {
  constructor() {
    // this.projectsTableName = 'projects';
    this.samplesTableName = 'samples';
    this.metadataTracksTableName = 'metadata_tracks';
    this.metadataTracksValuesTableName = 'metadata_tracks_values';
  }

  async getMetadataTrack(metadataTrackUuid) {
    const db = await dbConn;

    const dbResponse = await db(`${this.metadataTracksTableName} as meta`)
      .where('meta.metadata_uuid', metadataTrackUuid)
      .join(`${this.metadataTracksValuesTableName} as meta_val`, 'meta_val.metadata_uuid', '=', 'meta.metadata_uuid')
      .select(
        'meta.metadata_uuid as metaId',
        'meta.name as name',
        'meta_val.sample_uuid as sampleUuid',
        'meta_val.value as sampleMetaValue',
      );

    const valuesPerSample = dbResponse.reduce((acum, current) => {
      acum[current.sampleUuid] = current.sampleMetaValue;

      return acum;
    }, {});

    return { name: dbResponse[0].name, valuesPerSample };
  }

  async getMetadataTrackValueForSample(sampleUuid, metadataTrackUuid) {
    const db = await dbConn;

    const dbResponse = await db(`${this.metadataTracksValuesTableName} as meta_val`)
      .andWhere('meta_val.sample_uuid', sampleUuid)
      .where('meta_val.metadata_uuid', metadataTrackUuid)
      .select(
        'meta_val.value as value',
      );

    return dbResponse[0].value;
  }

  async getMetadataTracksByProject(projectUuid) {
    const db = await dbConn;

    const dbResponse = await db(`${this.metadataTracksTableName} as meta`)
      .where('meta.project_uuid', projectUuid)
      .join(`${this.samplesTableName} as sample`, 'sample.project_uuid', '=', 'meta.project_uuid')
      .join(`${this.metadataTracksValuesTableName} as meta_val`, function () {
        this.on('meta_val.sample_uuid', '=', 'sample.sample_uuid')
          .andOn('meta_val.metadata_uuid', '=', 'meta.metadata_uuid');
      })
      .select(
        'meta.metadata_uuid as metaId',
        'meta.name as name',
        'sample.sample_uuid as sampleUuid',
        'meta_val.value as sampleMetaValue',
      );

    const response = dbResponse.reduce((acum, current) => {
      const currentMetaId = current.metaId;

      if (acum[currentMetaId]) {
        acum[currentMetaId].valuesPerSample[current.sampleUuid] = current.sampleMetaValue;
      } else {
        const {
          metaId, sampleUuid, sampleMetaValue, ...restOfCurrent
        } = current;

        acum[metaId] = {
          ...restOfCurrent,
          valuesPerSample: {
            [sampleUuid]: sampleMetaValue,
          },
        };
      }

      return acum;
    }, {});

    return response;
  }

  async createMetadataTrack(projectUuid, metadataTrack) {
    const db = await dbConn;

    const { name, valuesPerSample } = metadataTrack;

    const metadataTrackUuid = uuidv4();

    const rowsToInsert = Object.entries(valuesPerSample)
      .map(([sampleUuid, value]) => (
        {
          metadata_uuid: metadataTrackUuid,
          sample_uuid: sampleUuid,
          value,
        }));

    let response;

    await db.transaction(async (trx) => {
      await db(`${this.metadataTracksTableName} as meta`)
        .insert({ project_uuid: projectUuid, metadata_uuid: metadataTrackUuid, name });


      await db(`${this.metadataTracksValuesTableName} as meta_val`)
        .where('meta_val.metadata_uuid', metadataTrackUuid)
        .insert(rowsToInsert);

      await trx.commit();

      response = OK();
    });

    return response;
  }

  async setMetadataTrackValueForSample(sampleUuid, metadataTrackUuid, value) {
    const db = await dbConn;

    await db(`${this.metadataTracksValuesTableName} as meta_val`)
      .andWhere('meta_val.sample_uuid', sampleUuid)
      .where('meta_val.metadata_uuid', metadataTrackUuid)
      .update({ value });

    return OK();
  }

  async deleteProject(projectUuid) {
    logger.log(`Deleting project with id ${projectUuid}`);

    const db = await dbConn;

    const numDeleted = await db(this.SQLTableName)
      .where({ project_uuid: projectUuid })
      .del();

    if (numDeleted === 0) {
      throw new NotFoundError('Project not found');
    }

    return OK();
  }
}


module.exports = MetadataTracksService;
