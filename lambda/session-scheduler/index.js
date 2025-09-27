/**
 * AWS Lambda function for Discord bot session scheduling
 * Handles EventBridge scheduled events for voting sessions and watch partys
 */

const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

/**
 * Main Lambda handler for scheduled events
 */
exports.handler = async (event, context) => {
  console.log('Session scheduler triggered:', JSON.stringify(event, null, 2));

  try {
    const eventType = event.source === 'aws.events' ? event['detail-type'] : 'unknown';

    switch (eventType) {
      case 'Voting Session Start':
        return await handleVotingSessionStart(event);
      case 'Voting Session End':
        return await handleVotingSessionEnd(event);
      case 'Watch Party Start':
        return await handleMovieNightStart(event);
      default:
        console.log('Unknown event type:', eventType);
        return {
          statusCode: 200,
          body: JSON.stringify({ message: 'Event processed', eventType }),
        };
    }
  } catch (error) {
    console.error('Error processing scheduled event:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

/**
 * Handle voting session start
 */
async function handleVotingSessionStart(event) {
  console.log('Starting voting session:', event.detail);

  // Store session state in DynamoDB
  const sessionData = {
    pk: `SESSION#${event.detail.sessionId}`,
    sk: 'METADATA',
    sessionId: event.detail.sessionId,
    guildId: event.detail.guildId,
    status: 'VOTING_ACTIVE',
    startTime: new Date().toISOString(),
    ttl: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days TTL
  };

  await dynamodb
    .put({
      TableName: process.env.DYNAMODB_TABLE,
      Item: sessionData,
    })
    .promise();

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Voting session started', sessionId: event.detail.sessionId }),
  };
}

/**
 * Handle voting session end
 */
async function handleVotingSessionEnd(event) {
  console.log('Ending voting session:', event.detail);

  // Update session status in DynamoDB
  await dynamodb
    .update({
      TableName: process.env.DYNAMODB_TABLE,
      Key: {
        pk: `SESSION#${event.detail.sessionId}`,
        sk: 'METADATA',
      },
      UpdateExpression: 'SET #status = :status, endTime = :endTime',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':status': 'VOTING_ENDED',
        ':endTime': new Date().toISOString(),
      },
    })
    .promise();

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Voting session ended', sessionId: event.detail.sessionId }),
  };
}

/**
 * Handle watch party start
 */
async function handleMovieNightStart(event) {
  console.log('Starting watch party:', event.detail);

  // Update session status in DynamoDB
  await dynamodb
    .update({
      TableName: process.env.DYNAMODB_TABLE,
      Key: {
        pk: `SESSION#${event.detail.sessionId}`,
        sk: 'METADATA',
      },
      UpdateExpression: 'SET #status = :status, movieNightStartTime = :startTime',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':status': 'MOVIE_NIGHT_ACTIVE',
        ':startTime': new Date().toISOString(),
      },
    })
    .promise();

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Movie night started', sessionId: event.detail.sessionId }),
  };
}

/**
 * Health check endpoint
 */
exports.healthCheck = async (_event) => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'session-scheduler',
    }),
  };
};
