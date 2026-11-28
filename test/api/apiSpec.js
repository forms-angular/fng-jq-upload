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

describe('createThumbnailStreamIfNeeded', function () {

    it('should emit an error (not throw) when ImageMagick rejects the input', function (done) {
        // imagemagick-stream's own onerror uses util.isError, which no longer exists in Node 24
        const thumbnailStream = jqUploads.createThumbnailStreamIfNeeded({ required: true, height: 50 }, 'bad.png');
        let finished = false;
        thumbnailStream.on('error', function (err) {
            if (finished) {
                return;
            }
            finished = true;
            assert.ok(err instanceof Error);
            done();
        });
        thumbnailStream.resume();
        thumbnailStream.end(Buffer.from('this is not a png'));
    });

});



// the browser asks for a field's upload limit so it can shrink photos to fit, and refuse anything else too large,
// before uploading
describe('limits', function () {
    function appWith(options) {
        const app = express();
        const fakeFng = {
            app,
            options: {},
            getResource: (name) => (name === 'Applicant' ? { resourceName: name } : undefined),
        };
        jqUploads.controller(fakeFng, (opts, args) => ['/api/' + args[0], ...args.slice(1)], options);
        return app;
    }

    it('gives the maximum from the storageLimitsDelegate, passing it the request', async function () {
        let seen;
        const app = appWith({
            storageLimitsDelegate: async (req, fieldName, resource) => {
                seen = { fieldName, resourceName: resource.resourceName, forNote: req.query.forNote };
                return { maxFileSize: 3 * 1024 * 1024 };
            },
        });
        const res = await request(app).get('/api/file/limits/Applicant/photoField?forNote=1').expect(200);
        assert.deepStrictEqual(res.body, { maxFileSize: 3 * 1024 * 1024 });
        assert.deepStrictEqual(seen, { fieldName: 'photoField', resourceName: 'Applicant', forNote: '1' });
    });

    it('gives no maximum when there is no storageLimitsDelegate', async function () {
        const res = await request(appWith({})).get('/api/file/limits/Applicant/photoField').expect(200);
        assert.deepStrictEqual(res.body, {});
    });

    it('is a 404 for an unknown model', async function () {
        await request(appWith({})).get('/api/file/limits/Nothing/photoField').expect(404);
    });
});
