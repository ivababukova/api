const BasicModel = require('./BasicModel')();

const stub = {
  getSamples: jest.fn(),
  setNewFile: jest.fn(),
  ...BasicModel,
};

const Sample = jest.fn().mockImplementation(() => stub);

module.exports = Sample;
