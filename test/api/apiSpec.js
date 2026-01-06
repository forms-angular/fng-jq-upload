'use strict';

import assert from 'assert';
import { FormsAngular } from 'forms-angular';
import express from 'express';
import bodyParser from 'body-parser';
import path from 'path';
import request from 'supertest';
import * as jqUploads from '../../lib/fng-jq-upload.js';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
let db;

describe('API', function () {

    var fng, app, router, Applicant, applicant, files;

    before(async function () {
        app = express();
        router = express.Router();
        app.use(bodyParser.urlencoded({ extended: false }));
        app.use(bodyParser.json());

        // Dynamic import for the model
        const applicantModule = await import(path.join(currentDir, '../models/applicant.js'));
        Applicant = applicantModule.default || applicantModule;

        fng = new (FormsAngular)(mongoose, app, {
            urlPrefix: '/api/', plugins: { JQMongoFileUploader: { plugin: jqUploads.controller, options: {} } }
        });

        await mongoose.connect('mongodb://localhost:27017/forms-ng_test');

        // Bootstrap models
        fng.newResource(Applicant);
        db = mongoose.connection.db;
        const applicant1 = await Applicant.create({ surname: 'Smith', forename: 'Mark' });
        applicant = applicant1;
        files = db.collection('applicants.files');
    });

    after(async function () {
        await mongoose.connection.db.dropDatabase();
        await mongoose.disconnect();
    });

    describe('upload', function () {

        it('should store a text file', function (done) {
            files.countDocuments()
                .then(function (start) {
                    request(app)
                        .post('/api/file/upload/Applicant/textField')
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
                        .post('/api/file/upload/Applicant/photoField')
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


