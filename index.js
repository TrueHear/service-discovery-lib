// index.js
const mdnsLib = require('./src/mdns_lib');
const { list_interfaces } = require('./src/list_interfaces');

module.exports = {
    ...mdnsLib,
    list_interfaces,
};