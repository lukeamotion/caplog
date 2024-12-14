export const validateLogEntry = (data) => {
    if (!data.logType || !['Email', 'Encounter', 'Phone Call', 'Note', 'Meeting', 'Other'].includes(data.logType)) {
      throw new Error('Invalid logType. Must be one of the predefined types.');
    }
    if (!data.logeventtime || isNaN(new Date(data.logeventtime).getTime())) {
      throw new Error('Invalid logeventtime. Must be a valid date string.');
    }
    return true;
  };