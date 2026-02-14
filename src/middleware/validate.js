function badRequest(message, details = null) {
  const err = new Error(message);
  err.status = 400;
  if (details) err.details = details;
  return err;
}

function requireString(body, field) {
  if (typeof body[field] !== "string" || body[field].trim() === "") {
    throw badRequest(`Campo '${field}' es obligatorio y debe ser string.`);
  }
}

function requireObject(body, field) {
  if (body[field] == null) return; // opcional
  if (typeof body[field] !== "object" || Array.isArray(body[field])) {
    throw badRequest(`Campo '${field}' debe ser un objeto JSON.`);
  }
}

function allowEnum(body, field, values) {
  if (body[field] == null) return;
  if (!values.includes(body[field])) {
    throw badRequest(`Campo '${field}' debe ser uno de: ${values.join(", ")}`);
  }
}

module.exports = { badRequest, requireString, requireObject, allowEnum };
