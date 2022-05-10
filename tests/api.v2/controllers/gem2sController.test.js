// @ts-nocheck
const gem2sController = require('../../../src/api.v2/controllers/gem2sController');

const gem2s = require('../../../src/api.v2/helpers/pipeline/gem2s');

const parseSNSMessage = require('../../../src/utils/parse-sns-message');

jest.mock('../../../src/api.v2/helpers/pipeline/gem2s');
jest.mock('../../../src/utils/parse-sns-message');

const mockJsonSend = jest.fn();
const mockRes = {
  json: jest.fn(),
  status: jest.fn(() => ({ send: mockJsonSend })),
};

describe('gem2sController', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
  });

  it('runGem2s works correctly', async () => {
    const experimentId = 'experimentId';
    const newExecution = 'mockNewExecution';

    gem2s.gem2sCreate.mockReturnValue(newExecution);

    const mockReq = {
      params: { experimentId },
      headers: { authorization: 'mockAuthorization' },
      body: { paramsHash: 'mockParamsHash' },
    };

    await gem2sController.runGem2s(mockReq, mockRes);

    expect(gem2s.gem2sCreate).toHaveBeenCalledWith(
      experimentId, mockReq.body, mockReq.headers.authorization,
    );

    // Response is ok
    expect(mockRes.json).toHaveBeenCalledWith(newExecution);
  });

  it('handleResponse works correctly', async () => {
    const experimentId = 'experimentId';

    const io = 'mockIo';
    const parsedMessage = 'mockParsedMessage';

    parseSNSMessage.mockReturnValue({ io, parsedMessage });

    const mockReq = { params: { experimentId } };

    await gem2sController.handleResponse(mockReq, mockRes);

    expect(parseSNSMessage).toHaveBeenCalledWith(mockReq);
    expect(gem2s.gem2sResponse).toHaveBeenCalledWith(io, parsedMessage);

    // Response is ok
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockJsonSend).toHaveBeenCalledWith('ok');
  });

  it('handleResponse throws when parseSNSMessage fails', async () => {
    const experimentId = 'experimentId';

    parseSNSMessage.mockImplementationOnce(() => Promise.reject(new Error('Invalid sns message')));

    const mockReq = { params: { experimentId } };

    await gem2sController.handleResponse(mockReq, mockRes);

    expect(parseSNSMessage).toHaveBeenCalledWith(mockReq);

    expect(gem2s.gem2sResponse).not.toHaveBeenCalled();

    // Resposne is nok
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockJsonSend).toHaveBeenCalledWith('nok');
  });

  it('handleResponse throws when gem2sResponse fails', async () => {
    const experimentId = 'experimentId';

    const io = 'mockIo';
    const parsedMessage = 'mockParsedMessage';

    parseSNSMessage.mockReturnValue({ io, parsedMessage });

    gem2s.gem2sResponse.mockImplementationOnce(() => Promise.reject(new Error('Some error with gem2sResponse')));

    const mockReq = { params: { experimentId } };

    await gem2sController.handleResponse(mockReq, mockRes);

    expect(parseSNSMessage).toHaveBeenCalledWith(mockReq);
    expect(gem2s.gem2sResponse).toHaveBeenCalledWith(io, parsedMessage);

    // Resposne is nok
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockJsonSend).toHaveBeenCalledWith('nok');
  });

  it('handleResponse ignores message if it isnt an sns notification', async () => {
    const experimentId = 'experimentId';

    const io = 'mockIo';
    const parsedMessage = undefined;

    parseSNSMessage.mockReturnValue({ io, parsedMessage });

    const mockReq = { params: { experimentId } };

    await gem2sController.handleResponse(mockReq, mockRes);

    expect(parseSNSMessage).toHaveBeenCalledWith(mockReq);
    expect(gem2s.gem2sResponse).not.toHaveBeenCalled();

    // Response is ok
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockJsonSend).toHaveBeenCalledWith('ok');
  });
});
