const AWSMock = require('aws-sdk-mock');
const AWS = require('../../../src/utils/requireAWS');
const { OK } = require('../../../src/utils/responses');

const SamplesService = require('../../../src/api/route-services/samples');
const {
  mockDynamoGetItem,
  mockDynamoQuery,
  mockDynamoUpdateItem,
  mockDynamoDeleteItem,
} = require('../../test-utils/mockAWSServices');

describe('tests for the samples service', () => {
  afterEach(() => {
    AWSMock.restore('DynamoDB');
  });


  const mockDynamoQuery = (jsData) => {
    const dynamodbData = {
      Item: AWS.DynamoDB.Converter.marshall(jsData),
    };
    const getItemSpy = jest.fn((x) => x);
    AWSMock.setSDKInstance(AWS);
    AWSMock.mock('DynamoDB', 'query', (params, callback) => {
      getItemSpy(params);
      callback(null, dynamodbData);
    });
    return getItemSpy;
  };

  const mockDynamoUpdateItem = (jsData) => {
    const dynamodbData = {
      Attributes: AWS.DynamoDB.Converter.marshall(jsData),
    };
    const getItemSpy = jest.fn((x) => x);
    AWSMock.setSDKInstance(AWS);
    AWSMock.mock('DynamoDB', 'updateItem', (params, callback) => {
      getItemSpy(params);\
      callback(null, dynamodbData);
    });
    return getItemSpy;
  };

  it('Get samples works', async (done) => {
    const jsData = {
      samples: {
        ids: ['sample-1'],
        'sample-1': {
          name: 'sample-1',
        },
      },
    };

    const marshalledData = AWS.DynamoDB.Converter.marshall({
      ':projectUuid': 'project-1',
    });

    const getItemSpy = mockDynamoQuery(jsData);

    (new SamplesService()).getSamples('project-1')
      .then((data) => {
        expect(data).toEqual(jsData);
        expect(getItemSpy).toHaveBeenCalledWith({
          TableName: 'samples-test',
          IndexName: 'gsiExperimentid',
          KeyConditionExpression: 'projectUuid = :projectUuid',
          ExpressionAttributeValues: marshalledData,
          ProjectionExpression: 'samples',
        });
      })
      .then(() => done());
  });

  it('Get sample by experimentId works', async (done) => {
    const jsData = {
      samples: {
        ids: ['sample-1', 'sample-2'],
        'sample-1': { name: 'sample-1' },
        'sample-2': { name: 'sample-2' },
      },
    };

    const marshalledKey = AWS.DynamoDB.Converter.marshall({
      experimentId: 'project-1',
    });

    const getItemSpy = mockDynamoGetItem(jsData);

    (new SamplesService()).getSamplesByExperimentId('project-1')
      .then((data) => {
        expect(data).toEqual(jsData);
        expect(getItemSpy).toHaveBeenCalledWith({
          TableName: 'samples-test',
          Key: marshalledKey,
          ProjectionExpression: 'samples',
        });
      })
      .then(() => done());
  });

  it('updateSamples work', async (done) => {
    const jsData = {
      projectUuid: 'project-1',
      experimentId: 'experiment-1',
      samples: {
        ids: ['sample-1', 'sample-2'],
        'sample-1': { name: 'sample-1' },
        'sample-2': { name: 'sample-2' },
      },
    };

    const marshalledKey = AWS.DynamoDB.Converter.marshall({
      experimentId: 'experiment-1',
    });

    const marshalledData = AWS.DynamoDB.Converter.marshall({
      ':samples': jsData.samples,
      ':projectUuid': jsData.projectUuid,
    });

    const getItemSpy = mockDynamoUpdateItem(jsData);

    (new SamplesService()).updateSamples('project-1', jsData)
      .then((data) => {
        expect(data).toEqual(OK());
        expect(getItemSpy).toHaveBeenCalledWith({
          TableName: 'samples-test',
          Key: marshalledKey,
          UpdateExpression: 'SET samples = :samples, projectUuid = :projectUuid',
          ExpressionAttributeValues: marshalledData,
        });
      })
      .then(() => done());
  });

  it('delete sample works', async (done) => {
    const marshalledKey = AWS.DynamoDB.Converter.marshall({
      experimentId: 'experiment-1',
    });

    const getFnSpy = mockDynamoDeleteItem();

    (new SamplesService()).deleteSamples('project-1', 'experiment-1')
      .then((data) => {
        expect(data).toEqual(OK());
        expect(getFnSpy).toHaveBeenCalledWith({
          TableName: 'samples-test',
          Key: marshalledKey,
        });
      })
      .then(() => done());
  });

  it('udpateSamples work', async (done) => {
    const jsData = {
      projectUuid: 'project-1',
      experimentId: 'experiment-1',
      samples: {
        ids: ['sample-1', 'sample-2'],
        'sample-1': { name: 'sample-1' },
        'sample-2': { name: 'sample-2' },
      },
    };
    const marshalledData = AWS.DynamoDB.Converter.marshall({
      ':samples': jsData.samples,
      ':projectUuid': jsData.projectUuid,
    });

    const getItemSpy = mockDynamoUpdateItem(jsData);

    (new SamplesService()).updateSamples('project-1', jsData)
      .then((data) => {
        expect(data).toEqual(jsData.samples);
        expect(getItemSpy).toHaveBeenCalledWith({
          TableName: 'samples-test',
          Key: { experimentId: { S: 'experiment-1' } },
          UpdateExpression: 'SET samples = :samples, projectUuid = :projectUuid',
          ExpressionAttributeValues: marshalledData,
          ReturnValues: 'UPDATED_NEW',
        });
      })
      .then(() => done());
  });
});
