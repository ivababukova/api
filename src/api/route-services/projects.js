const config = require('../../config');
const {
  createDynamoDbInstance, convertToDynamoDbRecord, convertToJsObject,
} = require('../../utils/dynamoDb');

const dbConn = require('../../db/conn');
const logger = require('../../utils/logging');

const { OK, NotFoundError } = require('../../utils/responses');
const ExperimentService = require('./experiment');

const experimentService = new ExperimentService();

class ProjectsService {
  constructor() {
    this.tableName = `projects-${config.clusterEnv}`;

    // We should move all the table names to some file where all route services can access them
    this.experimentsSQLTableName = 'experiments';
    this.SQLTableName = 'projects';
  }

  // TODO get it to work
  async getProject(projectUuid) {
    const db = await dbConn;

    logger.log(`Getting project item with id ${projectUuid}`);

    const projects = await db('projects')
      .where('project_uuid', projectUuid)
      .select('*');

    console.log('hahaha', projects);

    if (!projects.length) {
      logger.log(`Project ${projectUuid} not found`);
      throw new NotFoundError('Project not found.');
    }


    const marshalledKey = convertToDynamoDbRecord({
      projectUuid,
    });

    const params = {
      TableName: this.tableName,
      Key: marshalledKey,
    };

    const dynamodb = createDynamoDbInstance();
    const response = await dynamodb.getItem(params).promise();
    if (response.Item) {
      const prettyResponse = convertToJsObject(response.Item);
      return prettyResponse.projects;
    }


    return response;
  }

  // TODO make it work with samples/experiments
  async updateProject(projectUuid, project) {
    logger.log(`Updating project with id ${projectUuid}`);

    const { name, description } = project;

    const db = await dbConn;

    const numChanged = await db(this.SQLTableName)
      .where({ project_uuid: projectUuid })
      .update({
        name,
        description,
      });

    if (numChanged === 0) {
      throw new NotFoundError('Project not found');
    }

    return OK();
  }

  /**
   * Finds all projects referenced in experiments.
   */
  async getProjects(user) {
    if (!user) {
      return [];
    }

    const db = await dbConn;
    let response;

    await db.transaction(async (trx) => {
      const projects = await trx(this.SQLTableName)
        .select(
          'name',
          'description',
          db.raw('project_uuid as uuid'),
        );

      if (!projects.length) {
        throw new NotFoundError('Project not found.');
      }

      const withExperiments = await Promise.all(
        projects.map(async (project) => {
          const experimentDetails = await trx('experiments')
            .where('project_uuid', project.uuid)
            .select(
              'experiment_id',
            );

          return {
            ...project,
            experiments: experimentDetails.map(
              (e) => e.experiment_id,
            ),
          };
        }),
      );

      const withSamples = await Promise.all(
        withExperiments.map(async (project) => {
          const experimentDetails = await trx('samples')
            .where('project_uuid', project.uuid)
            .select(
              db.raw('sample_uuid as sampleUuid'),
            );

          return {
            ...project,
            samples: experimentDetails.map(
              (e) => e.sample_uuid,
            ),
          };
        }),
      );

      await trx.commit();

      response = withSamples.map((p) => {
        const {
          // eslint-disable-next-line camelcase
          created_at, last_analyzed_at, updated_at, ...rest
        } = p;

        return {
          createdDate: created_at,
          lastAnalyzed: last_analyzed_at,
          lastModified: updated_at,
          ...rest,
        };
      });
    });

    return response;
  }

  // TODO needs migration
  async getExperiments(projectUuid) {
    const db = await dbConn;

    let response = {};

    await db.transaction(async (trx) => {
      response = await trx(this.experimentsSQLTableName)
        .where({
          project_uuid: projectUuid,
        })
        .select(
          'experiment_id as id',
          'name',
          'description',
        );
    });

    console.log('responseDebug');
    console.log(response);

    return response;
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


module.exports = ProjectsService;
