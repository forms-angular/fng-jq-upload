'use strict';

var assert = require('assert');
var formsAngular = require('forms-angular');
var express = require('express');
var bodyParser = require('body-parser');
var path = require('path');
var mongoose = require('mongoose');
var request = require('supertest');
var jqUploads = require(path.join(__dirname, '../../lib/JQMongo-file-uploads.js'));
var db;

describe('API', function () {

  var fng, app, router, Applicant, applicant, files;

  before(function (done) {
    app = express();
    router = express.Router();
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(bodyParser.json());

    fng = new (formsAngular)(app, {JQMongoFileUploader: {module: jqUploads}});
    Applicant = require(path.join(__dirname, '../models/applicant'));

    mongoose.connect('localhost', 'forms-ng_test');

    mongoose.connection.on('error', function () {
      console.error('connection error', arguments);
    });

    mongoose.connection.on('open', function () {
      // Bootstrap models
      fng.newResource(Applicant);
      db = mongoose.connection.db;
      Applicant.create({surname: 'Smith', forename: 'Mark'}, function (err, applicant1) {
        if (err) {
          throw err;
        }
        applicant = applicant1;
        files = db.collection('applicants.files');
        done();
      });
    });

  });

  after(function (done) {
    mongoose.connection.db.dropDatabase(function () {
      mongoose.disconnect(function () {
        done();
      });
    });
  });

  describe('upload', function () {

    it('should store a text file', function (done) {
      files.count(function (err, start) {
        if (err) {
          throw err;
        }
        request(app)
          .post('/file/upload/Applicant')
          .attach('files', 'test/files/test.txt')
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function (err, res) {
            if (err) {
              throw err;
            }
            var resp = JSON.parse(res.text);
            assert.equal(resp.files.length, 1);
            files.count(function (err, finish) {
              if (err) {
                throw err;
              }
              assert.equal(start + 1, finish);
              done();
            });
          });
      });
    });

    it('should store a graphics file with a thumbnail', function (done) {
      files.count(function (err, start) {
        if (err) {
          throw err;
        }
        request(app)
          .post('/file/upload/Applicant')
          .attach('files', 'test/files/sample.gif')
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function (err, res) {
            var resp = JSON.parse(res.text);
            assert.equal(resp.files.length, 1);
            //console.log(JSON.stringify(JSON.parse(res.text), null, 2));
            if (err) {
              throw err;
            }
            files.count(function (err, finish) {
              if (err) {
                throw err;
              }
              assert.equal(start + 2, finish);  // file image and the thumbnail
              done();
            });
          });
      });
    });

  });

});