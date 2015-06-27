'use strict';

var mongoose = require('mongoose');
var path = require('path');
var Schema = mongoose.Schema;
var jqUploads = require(path.join(__dirname, '../..'));

var ApplicantSchema = new Schema({
  surname:  {type: String, required: true, index: true},
  forename: {type: String, index: true},
  photo:    {type: [new Schema(jqUploads.FileSchema)], form: {directive: 'fng-jq-upload-form', add: {sizeLimit: 50000000}}},
  status:   {type: String, default: 'Pending', enum: ['Pending', 'Rejected', 'Shortlist']}
});

var Applicant;
try {
  Applicant = mongoose.model('Applicant');
} catch (e) {
  Applicant = mongoose.model('Applicant', ApplicantSchema);
}

module.exports = Applicant;
