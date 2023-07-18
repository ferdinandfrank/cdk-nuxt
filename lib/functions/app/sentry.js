const Sentry = require("@sentry/serverless");
const {handler} = require('./index');

Sentry.AWSLambda.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.ENVIRONMENT,
});

exports.handler = Sentry.AWSLambda.wrapHandler(handler);