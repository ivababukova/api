// @ts-nocheck
const { mockSqlClient, mockTrx } = require('../mocks/getMockSqlClient')();

jest.mock('../../../src/sql/sqlClient', () => ({
  get: jest.fn(() => mockSqlClient),
}));

const MetadataTrack = require('../../../src/api.v2/model/MetadataTrack');
const tableNames = require('../../../src/api.v2/model/tableNames');

describe('model/userAccess', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('createNewMetadataTrack works correctly when there are samples', async () => {
    const experimentId = 'mockExperimentId';
    const key = 'mockKey';

    mockSqlClient.where.mockReturnValueOnce([{ id: 'sampleId1' }, { id: 'sampleId2' }, { id: 'sampleId3' }, { id: 'sampleId4' }]);
    mockTrx.into.mockReturnValueOnce([{ id: 'metadataTrackId1' }, { id: 'metadataTrackId2' }]);

    await new MetadataTrack().createNewMetadataTrack(experimentId, key);

    expect(mockSqlClient.transaction).toHaveBeenCalled();

    expect(mockSqlClient.select.mock.calls).toMatchSnapshot('selectParams');
    expect(mockSqlClient.from.mock.calls).toMatchSnapshot('fromParams');
    expect(mockSqlClient.where.mock.calls).toMatchSnapshot('whereParams');

    expect(mockTrx.insert.mock.calls).toMatchSnapshot('insertParams');
    expect(mockTrx.returning.mock.calls).toMatchSnapshot('returningParams');
    expect(mockTrx.into.mock.calls).toMatchSnapshot('intoParams');
    expect(mockTrx.insert.mock.calls).toMatchSnapshot('insertParams');
    expect(mockTrx).toHaveBeenCalledWith(tableNames.SAMPLE_IN_METADATA_TRACK_MAP);
  });

  it('createNewMetadataTrack skips insert into SAMPLE_IN_METADATA_TRACK_MAP when there are no samples', async () => {
    const experimentId = 'mockExperimentId';
    const key = 'mockKey';

    mockTrx.into.mockReturnValueOnce([]);

    await new MetadataTrack().createNewMetadataTrack(experimentId, key);

    expect(mockSqlClient.transaction).toHaveBeenCalled();

    expect(mockSqlClient.select.mock.calls).toMatchSnapshot('selectParams');
    expect(mockSqlClient.from.mock.calls).toMatchSnapshot('fromParams');
    expect(mockSqlClient.where.mock.calls).toMatchSnapshot('whereParams');

    expect(mockTrx.insert.mock.calls).toMatchSnapshot('insertParams');
    expect(mockTrx.returning.mock.calls).toMatchSnapshot('returningParams');
    expect(mockTrx.into.mock.calls).toMatchSnapshot('intoParams');
    expect(mockTrx.insert.mock.calls).toMatchSnapshot('insertParams');
    expect(mockTrx).not.toHaveBeenCalledWith(tableNames.SAMPLE_IN_METADATA_TRACK_MAP);
  });

  it('createNewExperimentPermissions works correctly when experiment has metadata tracks', async () => {
    const mockExperimentId = 'mockExperimentId';
    const mockSampleId = 'mockSampleId';

    mockSqlClient.where.mockImplementationOnce(() => Promise.resolve([{ id: 'track1Id' }, { id: 'track2Id' }]));

    await new MetadataTrack().createNewSampleValues(mockExperimentId, mockSampleId);

    expect(mockSqlClient.insert).toHaveBeenCalledWith([
      { metadata_track_id: 'track1Id', sample_id: 'mockSampleId' },
      { metadata_track_id: 'track2Id', sample_id: 'mockSampleId' },
    ]);
  });

  it('createNewExperimentPermissions doesn\'t do anything when experiment has no metadata tracks', async () => {
    const mockExperimentId = 'mockExperimentId';
    const mockSampleId = 'mockSampleId';

    mockSqlClient.where.mockImplementationOnce(() => Promise.resolve([]));

    await new MetadataTrack().createNewSampleValues(mockExperimentId, mockSampleId);

    expect(mockSqlClient.insert).not.toHaveBeenCalled();
  });
});
