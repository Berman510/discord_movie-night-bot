/**
 * Timezone Service
 * Handles timezone parsing, formatting, and utilities
 */

function parseFlexibleDate(dateStr) {
  if (!dateStr) return null;
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // Handle relative dates
  const lowerStr = dateStr.toLowerCase().trim();
  
  // Tomorrow
  if (lowerStr.includes('tomorrow')) {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const timeMatch = lowerStr.match(/(\d{1,2}):?(\d{0,2})\s*(pm|am)?/);
    if (timeMatch) {
      const hour = parseInt(timeMatch[1]);
      const minute = parseInt(timeMatch[2] || '0');
      const isPM = timeMatch[3] === 'pm' || (timeMatch[3] === undefined && hour >= 7 && hour <= 11);
      tomorrow.setHours(isPM && hour !== 12 ? hour + 12 : (hour === 12 && !isPM ? 0 : hour), minute);
    } else {
      tomorrow.setHours(20, 0); // Default to 8pm
    }
    return tomorrow;
  }
  
  // This Friday, Next Saturday, etc.
  const dayMatch = lowerStr.match(/(this|next)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/);
  if (dayMatch) {
    const isNext = dayMatch[1] === 'next';
    const targetDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(dayMatch[2]);
    const currentDay = now.getDay();
    
    let daysToAdd = targetDay - currentDay;
    if (isNext || daysToAdd <= 0) {
      daysToAdd += 7;
    }
    
    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() + daysToAdd);
    
    const timeMatch = lowerStr.match(/(\d{1,2}):?(\d{0,2})\s*(pm|am)?/);
    if (timeMatch) {
      const hour = parseInt(timeMatch[1]);
      const minute = parseInt(timeMatch[2] || '0');
      const isPM = timeMatch[3] === 'pm' || (timeMatch[3] === undefined && hour >= 7 && hour <= 11);
      targetDate.setHours(isPM && hour !== 12 ? hour + 12 : (hour === 12 && !isPM ? 0 : hour), minute);
    } else {
      targetDate.setHours(20, 0); // Default to 8pm
    }
    return targetDate;
  }
  
  // Try standard date parsing
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime()) && parsed > now) {
    return parsed;
  }
  
  // Try parsing just time for today
  const timeOnlyMatch = dateStr.match(/^(\d{1,2}):?(\d{0,2})\s*(pm|am)?$/i);
  if (timeOnlyMatch) {
    const hour = parseInt(timeOnlyMatch[1]);
    const minute = parseInt(timeOnlyMatch[2] || '0');
    const isPM = timeOnlyMatch[3]?.toLowerCase() === 'pm' || (timeOnlyMatch[3] === undefined && hour >= 7 && hour <= 11);
    const timeToday = new Date(today);
    timeToday.setHours(isPM && hour !== 12 ? hour + 12 : (hour === 12 && !isPM ? 0 : hour), minute);
    
    if (timeToday > now) {
      return timeToday;
    } else {
      // If time has passed today, assume tomorrow
      timeToday.setDate(timeToday.getDate() + 1);
      return timeToday;
    }
  }
  
  return null;
}

function parseTimeInTimezone(dateStr, timezone = 'UTC') {
  if (!dateStr) return null;
  
  try {
    // For now, we'll use basic Date parsing and note the timezone
    // In a production environment, you'd want to use a proper timezone library
    const parsed = parseFlexibleDate(dateStr);
    if (!parsed) return null;
    
    // Store the timezone info with the date
    parsed._timezone = timezone;
    return parsed;
  } catch (error) {
    console.warn('Error parsing time in timezone:', error.message);
    return null;
  }
}

function formatDateWithTimezone(date, timezone = 'UTC') {
  if (!date) return 'Not set';
  
  try {
    // Basic formatting - in production, use Intl.DateTimeFormat with timezone
    const options = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    };
    
    if (timezone !== 'UTC') {
      options.timeZone = timezone;
    }
    
    return new Intl.DateTimeFormat('en-US', options).format(date);
  } catch (error) {
    console.warn('Error formatting date with timezone:', error.message);
    return date.toLocaleString();
  }
}

module.exports = {
  parseFlexibleDate,
  parseTimeInTimezone,
  formatDateWithTimezone
};
