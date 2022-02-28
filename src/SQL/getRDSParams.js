const AWS = require('aws-sdk');

const config = require('../config');

const getRDSEndpoint = async (rdsClient) => {
  const clusterId = `aurora-cluster-${config.clusterEnv}`;

  // Part of the endpoint's name is a random string generated by rds
  // and we can't control it (it is always the same for accounts)
  // so we can either:
  // - store this random string in S3 or something and fetch it
  // - or ask for an endpoint like I ended up doing here.
  // https://forums.aws.amazon.com/thread.jspa?messageID=486170&#486199
  // https://stackoverflow.com/questions/34990104/rds-endpoint-name-format

  const { DBClusterEndpoints: endpoints } = await rdsClient.describeDBClusterEndpoints({
    DBClusterIdentifier: clusterId,
    Filters: [
      { Name: 'db-cluster-endpoint-type', Values: ['writer'] },
      { Name: 'db-cluster-endpoint-status', Values: ['available'] },
    ],
  }).promise();

  if (endpoints.length === 0) {
    throw new Error(`No available endpoints for ${clusterId}`);
  }

  return endpoints[0].Endpoint;
};

const getRDSParams = async () => {
  if (config.clusterEnv === 'development') {
    return Promise.resolve({});
  }

  const rdsClient = new AWS.RDS();
  const endpoint = await getRDSEndpoint(rdsClient);
  const username = 'api_role';

  const signer = new AWS.RDS.Signer({
    hostname: endpoint,
    region: config.awsRegion,
    port: 5432,
    username,
  });

  // @ts-ignore
  const token = await signer.getAuthToken().promise();

  // Token expires in 15 minutes https://aws.amazon.com/premiumsupport/knowledge-center/users-connect-rds-iam/
  const MINUTES = 60000;
  const tokenExpiration = new Date().getTime() + 15 * MINUTES;

  return {
    host: endpoint,
    port: 5432,
    user: username,
    password: token,
    expirationChecker: () => tokenExpiration <= Date.now(),
    database: 'aurora_db',
    ssl: { rejectUnauthorized: false },
    pool: {
      min: 2,
      max: 10,
    },
  };
};

module.exports = getRDSParams;
