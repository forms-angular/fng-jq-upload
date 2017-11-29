'use strict';
/* jshint ignore:start */

/*!
 * Module dependencies.
 */

var FileSchema = require('./fileschema');
var Controller = require('./controller');

function FngJqUploader() {
}

FngJqUploader.prototype.FileSchema = FileSchema;


FngJqUploader.prototype.Controller = Controller;


var fngJqUploader = module.exports = exports = FngJqUploader;



/* jshint ignore:end */