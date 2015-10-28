/**
 * @author Josh Stuart <joshstuartx@gmail.com>
 */
const path = require('path');
const env = process.env.NODE_ENV || 'test';
const config = require('./env/' + env);

config.root = path.normalize(__dirname + '/..');

module.exports = config;
