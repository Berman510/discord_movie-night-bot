/**
 * AWS Lambda Discord Interaction Handler
 * Phase 3 Cost Optimization - Serverless Discord Bot
 */

const crypto = require('crypto');

// Discord interaction types
const InteractionType = {
  PING: 1,
  APPLICATION_COMMAND: 2,
  MESSAGE_COMPONENT: 3,
  APPLICATION_COMMAND_AUTOCOMPLETE: 4,
  MODAL_SUBMIT: 5
};

// Discord interaction response types
const InteractionResponseType = {
  PONG: 1,
  CHANNEL_MESSAGE_WITH_SOURCE: 4,
  DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE: 5,
  DEFERRED_UPDATE_MESSAGE: 6,
  UPDATE_MESSAGE: 7,
  APPLICATION_COMMAND_AUTOCOMPLETE_RESULT: 8,
  MODAL: 9
};

/**
 * Verify Discord interaction signature
 */
function verifyDiscordSignature(signature, timestamp, body, publicKey) {
  try {
    const timestampBuffer = Buffer.from(timestamp, 'utf8');
    const bodyBuffer = Buffer.from(body, 'utf8');
    const message = Buffer.concat([timestampBuffer, bodyBuffer]);
    
    const signatureBuffer = Buffer.from(signature, 'hex');
    const publicKeyBuffer = Buffer.from(publicKey, 'hex');
    
    return crypto.verify(
      'ed25519',
      message,
      {
        key: publicKeyBuffer,
        format: 'raw'
      },
      signatureBuffer
    );
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

/**
 * Main Lambda handler
 */
exports.handler = async (event) => {
  console.log('Discord interaction received:', JSON.stringify(event, null, 2));
  
  try {
    // Get Discord signature headers
    const signature = event.headers['x-signature-ed25519'];
    const timestamp = event.headers['x-signature-timestamp'];
    const publicKey = process.env.DISCORD_PUBLIC_KEY;
    
    if (!signature || !timestamp || !publicKey) {
      console.error('Missing required headers or public key');
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }
    
    // Verify Discord signature
    const isValid = verifyDiscordSignature(signature, timestamp, event.body, publicKey);
    if (!isValid) {
      console.error('Invalid Discord signature');
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid signature' })
      };
    }
    
    // Parse interaction data
    const interaction = JSON.parse(event.body);
    console.log('Interaction type:', interaction.type);
    
    // Handle ping (Discord verification)
    if (interaction.type === InteractionType.PING) {
      console.log('Responding to Discord ping');
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: InteractionResponseType.PONG
        })
      };
    }
    
    // Handle slash commands
    if (interaction.type === InteractionType.APPLICATION_COMMAND) {
      const commandName = interaction.data.name;
      console.log('Slash command received:', commandName);
      
      // For now, respond with a simple message
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `🚀 Lambda bot received command: \`/${commandName}\`\n\n⚡ **Phase 3 Cost Optimization Active!**\n💰 Running on AWS Lambda (60-85% cost savings)\n🔄 Full functionality coming soon...`,
            flags: 64 // Ephemeral
          }
        })
      };
    }
    
    // Handle button interactions
    if (interaction.type === InteractionType.MESSAGE_COMPONENT) {
      const customId = interaction.data.custom_id;
      console.log('Button interaction received:', customId);
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `🚀 Lambda bot received button: \`${customId}\`\n\n⚡ **Phase 3 Cost Optimization Active!**\n💰 Running on AWS Lambda\n🔄 Full functionality coming soon...`,
            flags: 64 // Ephemeral
          }
        })
      };
    }
    
    // Handle modal submissions
    if (interaction.type === InteractionType.MODAL_SUBMIT) {
      const customId = interaction.data.custom_id;
      console.log('Modal submission received:', customId);
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `🚀 Lambda bot received modal: \`${customId}\`\n\n⚡ **Phase 3 Cost Optimization Active!**\n💰 Running on AWS Lambda\n🔄 Full functionality coming soon...`,
            flags: 64 // Ephemeral
          }
        })
      };
    }
    
    // Unknown interaction type
    console.log('Unknown interaction type:', interaction.type);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Unknown interaction type' })
    };
    
  } catch (error) {
    console.error('Lambda handler error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

/**
 * Health check endpoint
 */
exports.healthCheck = async (event) => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0-lambda',
      environment: process.env.ENVIRONMENT || 'unknown'
    })
  };
};
