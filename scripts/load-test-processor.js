const faker = require('faker');

module.exports = {
  setEmail: setEmail,
  setRandomData: setRandomData,
  logResponse: logResponse
};

function setEmail(requestParams, context, ee, next) {
  context.vars.email = faker.internet.email();
  return next();
}

function setRandomData(requestParams, context, ee, next) {
  context.vars.projectName = faker.commerce.productName();
  context.vars.teamName = faker.company.companyName();
  context.vars.description = faker.lorem.sentence();
  return next();
}

function logResponse(requestParams, response, context, ee, next) {
  if (response.statusCode >= 400) {
    console.log(`Error response: ${response.statusCode} for ${requestParams.url}`);
  }
  return next();
}