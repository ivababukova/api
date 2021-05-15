const config = require('../../config');
const {
  createDynamoDbInstance, convertToJsObject, convertToDynamoDbRecord,
} = require('../../utils/dynamoDb');


class ProjectsService {
  constructor() {
    this.tableName = `projects-${config.clusterEnv}`;
  }

  async updateProject(projectUuid, project) {
    const marshalledData = convertToDynamoDbRecord({
      ':project': project,
    });

    const params = {
      TableName: this.tableName,
      Key: {
        projectUuid: { S: projectUuid },
      },
      UpdateExpression: 'SET projects = :project',
      ExpressionAttributeValues: marshalledData,
      ReturnValues: 'UPDATED_NEW',
    };

    const dynamodb = createDynamoDbInstance();
    const result = await dynamodb.updateItem(params).promise();

    const prettyData = convertToJsObject(result.Attributes);

    return prettyData.projects;
  }

  async deleteProject(projectUuid) {
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

  async getProjects() {
    const params = {
      TableName: this.tableName,
    };
    const dynamodb = createDynamoDbInstance();
    const response = await dynamodb.scan(params).promise();

    const projects = [];
    response.Items.forEach((item) => {
      const project = convertToJsObject(item);
      projects.push(project.projects);
    });
    console.log('RETURNING PROJECTS', projects);
    return projects;
  }
}


module.exports = ProjectsService;
