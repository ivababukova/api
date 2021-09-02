const _ = require('lodash');

const dbConn = require('../../db/conn');

const { NotFoundError, OK } = require('../../utils/responses');

const { undefinedIfNotFound } = require('./utils');

const config = require('../../config');
const {
  createDynamoDbInstance, convertToJsObject, convertToDynamoDbRecord,
} = require('../../utils/dynamoDb');
const AWS = require('../../utils/requireAWS');

const logger = require('../../utils/logging');

class SamplesService {
  constructor() {
    this.tableName = `samples-${config.clusterEnv}`;
    this.sampleFilesBucketName = `biomage-originals-${config.clusterEnv}`;

    this.SQLSamplesTableName = 'samples';
  }

  async getSamples(projectUuid) {
    const marshalledData = convertToDynamoDbRecord({
      ':projectUuid': projectUuid,
    });

    const params = {
      TableName: this.tableName,
      IndexName: 'gsiByProjectAndExperimentID',
      KeyConditionExpression: 'projectUuid = :projectUuid',
      ExpressionAttributeValues: marshalledData,
    };
    const dynamodb = createDynamoDbInstance();

    const response = await dynamodb.query(params).promise();
    const items = response.Items;

    if (!items.length) {
      throw new NotFoundError('Samples not found.');
    }

    return items.map((item) => {
      const prettyItem = convertToJsObject(item);

      // Remove ids property from old sample entries that still have it
      delete prettyItem.samples.ids;

      return prettyItem;
    });
  }


  async getSamplesByExperimentId(experimentId) {
    const marshalledKey = convertToDynamoDbRecord({
      experimentId,
    });

    const params = {
      TableName: this.tableName,
      Key: marshalledKey,
      ProjectionExpression: 'samples',
    };
    const dynamodb = createDynamoDbInstance();

    const response = await dynamodb.getItem(params).promise();

    if (response.Item) {
      const prettyResponse = convertToJsObject(response.Item);

      // Remove ids property from old sample entries that still have it
      delete prettyResponse.samples.ids;
      return prettyResponse;
    }

    throw new NotFoundError('Samples not found');
  }

  async updateSamples(projectUuid, body) {
    logger.log(`Updating samples for project ${projectUuid} and expId ${body.experimentId}`);

    const marshalledKey = convertToDynamoDbRecord({
      experimentId: body.experimentId,
    });

    const marshalledData = convertToDynamoDbRecord({
      ':samples': body.samples,
      ':projectUuid': projectUuid,
    });

    // Update samples
    const params = {
      TableName: this.tableName,
      Key: marshalledKey,
      UpdateExpression: 'SET samples = :samples, projectUuid = :projectUuid',
      ExpressionAttributeValues: marshalledData,
    };

    const dynamodb = createDynamoDbInstance();

    try {
      await dynamodb.updateItem(params).send();
      return OK();
    } catch (e) {
      if (e.statusCode === 404) throw NotFoundError('Project not found');
      throw e;
    }
  }

  async deleteSamplesFromS3(projectUuid, samplesToRemoveUuids, allSamples) {
    const s3 = new AWS.S3();

    const sampleObjectsToDelete = samplesToRemoveUuids.map((sampleUuid) => {
      const fileKeysToDelete = Object.keys(allSamples[sampleUuid].files);

      return fileKeysToDelete.map((fileKey) => ({ Key: `${projectUuid}/${sampleUuid}/${fileKey}` }));
    });

    const s3Params = {
      Bucket: this.sampleFilesBucketName,
      Delete: {
        Objects: _.flatten(sampleObjectsToDelete),
        Quiet: false,
      },
    };

    const result = await s3.deleteObjects(s3Params).promise();

    if (result.Errors.length) {
      throw Error(`Delete S3 object errors: ${JSON.stringify(result.Errors)}`);
    }
  }

  async removeSamples(projectUuid, experimentId, sampleUuids) {
    logger.log(`Removing samples in an entry for project ${projectUuid} and expId ${experimentId}`);

    const db = await dbConn;

    const deleteFromSQLPromise = db(this.SQLSamplesTableName)
      .where((builder) => builder.whereIn('sample_uuid', sampleUuids))
      .del();

    // TODO uncomment
    // const { samples: allSamples = {} } = await undefinedIfNotFound(
    //   this.getSamplesByExperimentId(experimentId),
    // ) || {};

    const promises = [
      deleteFromSQLPromise,
      // TODO uncomment
      // this.deleteSamplesFromS3(projectUuid, sampleUuids, allSamples),
    ];

    await Promise.all(promises);

    return OK();
  }

  async deleteSamplesEntry(projectUuid, experimentId, sampleUuids) {
    logger.log(`Deleting samples entry for project ${projectUuid} and expId ${experimentId}`);

    const { samples: allSamples = {} } = await undefinedIfNotFound(
      this.getSamplesByExperimentId(experimentId),
    ) || {};

    const marshalledKey = convertToDynamoDbRecord({
      experimentId,
    });

    const dynamodbParams = {
      TableName: this.tableName,
      Key: marshalledKey,
    };

    const dynamodb = createDynamoDbInstance();

    const promises = [];

    try {
      promises.push(await dynamodb.deleteItem(dynamodbParams).send());
    } catch (e) {
      if (e.statusCode === 404) throw NotFoundError('Project not found');
      throw e;
    }

    if (sampleUuids.length) {
      promises.push(await this.deleteSamplesFromS3(projectUuid, sampleUuids, allSamples));
    }

    await Promise.all(promises);

    return OK();
  }
}

module.exports = SamplesService;
