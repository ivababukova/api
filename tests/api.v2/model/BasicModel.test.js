// Disabled ts because it doesn't recognize jest mocks
// @ts-nocheck
const { mockSqlClient } = require('../mocks/getMockSqlClient')();

jest.mock('../../../src/sql/sqlClient', () => ({
  get: jest.fn(() => mockSqlClient),
}));

const BasicModel = require('../../../src/api.v2/model/BasicModel');

const mockTableName = 'mockTableName';

const mockRowId = 'mockId';
const mockRowName = 'mockName';

describe('model/BasicModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('create works correctly', async () => {
    await new BasicModel(mockSqlClient, mockTableName, ['id', 'name']).create({ id: mockRowId, name: mockRowName });

    expect(mockSqlClient.insert).toHaveBeenCalledWith({ id: mockRowId, name: mockRowName });
    expect(mockSqlClient.returning).toHaveBeenCalledWith(['id', 'name']);
    expect(mockSqlClient.into).toHaveBeenCalledWith(mockTableName);
    expect(mockSqlClient.timeout).toHaveBeenCalledWith(4000);
  });

  it('findAll works correctly', async () => {
    await new BasicModel(mockSqlClient, mockTableName, ['id', 'name']).findAll();

    expect(mockSqlClient.select).toHaveBeenCalledWith(['id', 'name']);
    expect(mockSqlClient.from).toHaveBeenCalledWith(mockTableName);
    expect(mockSqlClient.timeout).toHaveBeenCalledWith(4000);
  });

  it('find works correctly', async () => {
    await new BasicModel(mockSqlClient, mockTableName, ['id', 'name']).find({ id: 'mockId' });

    expect(mockSqlClient.select).toHaveBeenCalledWith(['id', 'name']);
    expect(mockSqlClient.from).toHaveBeenCalledWith(mockTableName);
    expect(mockSqlClient.where).toHaveBeenCalledWith({ id: 'mockId' });
    expect(mockSqlClient.timeout).toHaveBeenCalledWith(4000);
  });

  it('findOne works correctly if result is an array', async () => {
    const mockFind = jest.spyOn(BasicModel.prototype, 'find')
      .mockImplementationOnce(() => Promise.resolve(['firstResult', 'secondResult']));

    const result = await new BasicModel(mockSqlClient, mockTableName, ['id', 'name']).findOne({ id: 'mockId' });

    expect(mockFind).toHaveBeenCalledWith({ id: 'mockId' });
    expect(result).toEqual('firstResult');
  });

  it('findOne works correctly if result isn\'t an array', async () => {
    const mockFind = jest.spyOn(BasicModel.prototype, 'find')
      .mockImplementationOnce(() => Promise.resolve('onlyResult'));

    const result = await new BasicModel(mockSqlClient, mockTableName, ['id', 'name']).findOne({ id: 'mockId' });

    expect(mockFind).toHaveBeenCalledWith({ id: 'mockId' });
    expect(result).toEqual('onlyResult');
  });

  it('findById works correctly', async () => {
    await new BasicModel(mockSqlClient, mockTableName, ['id', 'name']).findById('mockId');

    expect(mockSqlClient.select).toHaveBeenCalledWith(['id', 'name']);
    expect(mockSqlClient.from).toHaveBeenCalledWith(mockTableName);
    expect(mockSqlClient.where).toHaveBeenCalledWith({ id: 'mockId' });
    expect(mockSqlClient.timeout).toHaveBeenCalledWith(4000);
  });

  it('update works correctly', async () => {
    await new BasicModel(mockSqlClient, mockTableName, ['id', 'name']).update('mockId', { name: 'newNameUpdated' });

    expect(mockSqlClient.update).toHaveBeenCalledWith({ name: 'newNameUpdated' });
    expect(mockSqlClient.from).toHaveBeenCalledWith(mockTableName);
    expect(mockSqlClient.where).toHaveBeenCalledWith({ id: 'mockId' });
    expect(mockSqlClient.returning).toHaveBeenCalledWith(['id', 'name']);
    expect(mockSqlClient.timeout).toHaveBeenCalledWith(4000);
  });

  it('destroy works correctly', async () => {
    await new BasicModel(mockSqlClient, mockTableName, ['id', 'name']).destroy('mockId');

    expect(mockSqlClient.del).toHaveBeenCalled();
    expect(mockSqlClient.from).toHaveBeenCalledWith(mockTableName);
    expect(mockSqlClient.where).toHaveBeenCalledWith({ id: 'mockId' });
    expect(mockSqlClient.timeout).toHaveBeenCalledWith(4000);
  });
});