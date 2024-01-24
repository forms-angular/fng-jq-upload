'use strict';

var assert = require('assert');
var FormsAngular = require('forms-angular').FormsAngular;
var express = require('express');
var bodyParser = require('body-parser');
var path = require('path');
var request = require('supertest');
var jqUploads = require(path.join(__dirname, '../..'));
var mongoose = require('mongoose');
var db;

describe('API', function () {

    var fng, app, router, Applicant, applicant, files;

    before(function (done) {
        app = express();
        router = express.Router();
        app.use(bodyParser.urlencoded({extended: false}));
        app.use(bodyParser.json());

        Applicant = require(path.join(__dirname, '../models/applicant'));
        fng = new (FormsAngular)(mongoose, app, {
            urlPrefix: '/api/', plugins: {JQMongoFileUploader: {plugin: jqUploads.controller, options: {}}}
        });

        mongoose.connect('mongodb://localhost:27017/forms-ng_test');

        mongoose.connection.on('error', function () {
            console.error('connection error', arguments);
        });

        mongoose.connection.on('open', function () {
            // Bootstrap models
            fng.newResource(Applicant);
            db = mongoose.connection.db;
            Applicant.create({surname: 'Smith', forename: 'Mark'})
                .then(function (applicant1) {
                    applicant = applicant1;
                    files = db.collection('applicants.files');
                    done();
                });
        });
    });

    after(function (done) {
        mongoose.connection.db.dropDatabase()
            .then(function () {
                mongoose.disconnect()
                    .then(function () {
                        done();
                    });
            });
    });

    describe('upload', function () {

        it('should store a text file', function (done) {
            files.countDocuments()
                .then(function (start) {
                    request(app)
                        .post('/api/file/upload/Applicant')
                        .attach('files', 'test/files/test.txt')
                        .expect('Content-Type', /json/)
                        .expect(200)
                        .end(function (err, res) {
                            if (err) {
                                throw err;
                            }
                            var resp = JSON.parse(res.text);
                            assert.strictEqual(resp.files.length, 1);
                            files.countDocuments()
                                .then(function (finish) {
                                    assert.strictEqual(start + 1, finish);
                                    done();
                                });
                        });
                });
        });

        it('should store a graphics file with a thumbnail', function (done) {
            files.countDocuments()
                .then(function (start) {
                    void request(app)
                        .post('/api/file/upload/Applicant')
                        .attach('files', 'test/files/sample.gif')
                        .expect('Content-Type', /json/)
                        .expect(200)
                        .end(function (err, res) {
                            var resp = JSON.parse(res.text);
                            assert.strictEqual(resp.files.length, 1);
                            if (err) {
                                throw err;
                            }
                            files.countDocuments()
                                .then(function (finish) {
                                    assert.strictEqual(start + 2, finish);  // file image and the thumbnail
                                    done();
                                });
                        });
                });
        });
    });

});


