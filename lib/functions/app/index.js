const serverlessExpress = require('@vendia/serverless-express');
const config = require('./nuxt.config.js');
const { Nuxt } = require('nuxt-start');

const nuxt = new Nuxt({
    ...config,
    dev: false,
    _start: true,
})
const app = nuxt.server.app;

let serverlessExpressInstance = null;
async function initNuxt(event, context) {
    await nuxt.ready();
    serverlessExpressInstance = serverlessExpress({ app, eventSourceName: 'AWS_API_GATEWAY_V2' })

    return serverlessExpressInstance(event, context)
}

exports.handler = async (event, context) => {
    if (serverlessExpressInstance) {
        return serverlessExpressInstance(event, context)
    }

    return await initNuxt(event, context)
}