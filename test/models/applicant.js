'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var uploadSchema = new mongoose.Schema({
  filename: String,
  size: Number
});

var ApplicantSchema = new Schema({
  surname:  {type: String, required: true, index: true},
  forename: {type: String, index: true},
  photo:    {type: [uploadSchema], form: {directive: 'fng-jq-upload-form', add: {sizeLimit: 50000000}}},
  status:   {type: String, default: 'Pending', enum: ['Pending', 'Rejected', 'Shortlist']}
});

var Applicant;
try {
  Applicant = mongoose.model('Applicant');
} catch (e) {
  Applicant = mongoose.model('Applicant', ApplicantSchema);
}

module.exports = Applicant;
