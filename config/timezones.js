/**
 * Timezone Configuration
 * Common timezone options for the bot
 */

const TIMEZONE_OPTIONS = [
  { label: 'Eastern Time (ET)', value: 'America/New_York', emoji: '🇺🇸' },
  { label: 'Central Time (CT)', value: 'America/Chicago', emoji: '🇺🇸' },
  { label: 'Mountain Time (MT)', value: 'America/Denver', emoji: '🇺🇸' },
  { label: 'Pacific Time (PT)', value: 'America/Los_Angeles', emoji: '🇺🇸' },
  { label: 'UTC/GMT', value: 'UTC', emoji: '🌍' },
  { label: 'London (GMT/BST)', value: 'Europe/London', emoji: '🇬🇧' },
  { label: 'Paris/Berlin (CET)', value: 'Europe/Paris', emoji: '🇪🇺' },
  { label: 'Tokyo (JST)', value: 'Asia/Tokyo', emoji: '🇯🇵' },
  { label: 'Sydney (AEST)', value: 'Australia/Sydney', emoji: '🇦🇺' },
  { label: 'India (IST)', value: 'Asia/Kolkata', emoji: '🇮🇳' },
];

module.exports = {
  TIMEZONE_OPTIONS,
};
