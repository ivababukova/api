const config = require('../../config');
const {
  createDynamoDbInstance, convertToJsObject, convertToDynamoDbRecord,
} = require('../../utils/dynamoDb');


class SamplesService {
  constructor() {
    this.tableName = `samples-${config.clusterEnv}`;
  }

  async getSamples(projectUuid) {
    console.log('GETTING SAMPLES ', projectUuid);
    const params = {
      TableName: this.tableName,
      FilterExpression: 'projectUuid = :projectUuid',
      ExpressionAttributeValues: {
        ':projectUuid': { S: projectUuid },
      },
    };

    const dynamodb = createDynamoDbInstance();

    const response = await dynamodb.scan(params).promise();
    if (response.Items) {
      const prettyResponse = response.Items.map((item) => convertToJsObject(item));
      console.log('RETURNING SAMPLES ', prettyResponse);
      return prettyResponse;
    }

    throw Error('Sample not found');
  }

  async getSampleIds(experimentId) {
    const key = convertToDynamoDbRecord({
      experimentId,
    });

    const params = {
      TableName: this.tableName,
      Key: key,
      ProjectionExpression: 'samples.ids',
    };
    const dynamodb = createDynamoDbInstance();

    const response = await dynamodb.getItem(params).promise();

    if (response.Item) {
      const prettyResponse = convertToJsObject(response.Item);
      return prettyResponse;
    }

    throw Error('Sample not found');
  }

  async updateSamples(projectUuid, body) {
    const marshalledData = convertToDynamoDbRecord({
      ':samples': body.samples,
      ':projectUuid': projectUuid,
    });

    // Update samples
    const params = {
      TableName: this.tableName,
      Key: {
        experimentId: { S: body.experimentId },
      },
      UpdateExpression: 'SET samples = :samples, projectUuid = :projectUuid',
      ExpressionAttributeValues: marshalledData,
      ReturnValues: 'UPDATED_NEW',
    };

    const dynamodb = createDynamoDbInstance();
    const result = await dynamodb.updateItem(params).promise();

    const prettyData = convertToJsObject(result.Attributes);

    return prettyData.samples;
  }

  async deleteSamples(projectUuid) {
    const key = convertToDynamoDbRecord({
      projectUuid,
    });

    const params = {
      TableName: this.tableName,
      Key: key,
    };

    const dynamodb = createDynamoDbInstance();
    await dynamodb.deleteItem(params).promise();
  }
}


module.exports = SamplesService;
