export const log = (...args) => console.log(new Date().toISOString(), ...args);
export const warn = (...args) =>
  console.warn(new Date().toISOString(), ...args);
export const error = (...args) =>
  console.error(new Date().toISOString(), ...args);
