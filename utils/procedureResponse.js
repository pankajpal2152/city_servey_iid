'use strict';

function getProcedureJsonValue(rows) {
  const value = rows?.[0]?.[0]?.JSON_VALUE;

  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    return value;
  }
}

function isProcedureSuccess(result) {
  const status = result?.status ?? result?.STATUS;
  return String(status).toLowerCase() === 'true';
}

function compactObject(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined && item !== null)
  );
}

module.exports = {
  compactObject,
  getProcedureJsonValue,
  isProcedureSuccess,
};
