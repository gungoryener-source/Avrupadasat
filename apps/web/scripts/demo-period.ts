export const currentPeriod = (d = new Date()) => d.toISOString().slice(0, 7);
