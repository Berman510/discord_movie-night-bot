/**
 * Interaction Handlers Module
 * Routes different types of interactions to appropriate handlers
 */

const buttonHandlers = require('./buttons');
const modalHandlers = require('./modals');
const selectHandlers = require('./selects');

module.exports = {
  handleInteraction: async (interaction) => {
    try {
      // Handle button interactions
      if (interaction.isButton()) {
        await buttonHandlers.handleButton(interaction);
        return;
      }

      // Handle modal submissions
      if (interaction.isModalSubmit()) {
        await modalHandlers.handleModal(interaction);
        return;
      }

      // Handle select menu interactions
      if (interaction.isStringSelectMenu()) {
        await selectHandlers.handleSelect(interaction);
        return;
      }



    } catch (error) {
      console.error('Error handling interaction:', error);
      
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ An error occurred while processing your request.',
          ephemeral: true
        }).catch(console.error);
      }
    }
  }
};
