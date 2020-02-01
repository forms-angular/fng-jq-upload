"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Busboy = require("busboy");
var path = require("path");
var ims = require("imagemagick-stream");
exports.FileSchema = {
    filename: String,
    size: Number,
};
function Controller(fng, processArgs, options) {
    this.options = options || {};
    var modifiedOptions = Object.assign({}, fng.options);
    if (this.options.inhibitAuthentication) {
        delete modifiedOptions.authentication;
    }
    fng.app.post.apply(fng.app, processArgs(modifiedOptions, ['file/upload/:model', function (req, res) {
            function uploadFile(gridFSBucket, file, options, callback) {
                var stream;
                if (callback == null) {
                    callback = function () { };
                }
                options._id = new fng.mongoose.mongo.ObjectID();
                options.mode = 'w';
                var openOptions = {};
                if (options.metadata) {
                    openOptions.metadata = options.metadata;
                }
                stream = gridFSBucket.openUploadStream(options.filename, openOptions);
                stream.once('finish', function (metaData) {
                    return callback(null, metaData);
                });
                stream.on('error', function (err) {
                    callback(err);
                });
                return file.pipe(stream);
            }
            var model = req.params.model;
            var busboy = new Busboy({
                headers: req.headers
            });
            var mongo = fng.mongoose.mongo;
            var resource = fng.getResource(model);
            var gridFSBucket = new mongo.GridFSBucket(fng.mongoose.connection.db, { bucketName: resource.model.collection.name });
            var promises = [];
            busboy.on('file', function (fieldname, file, filename) {
                return promises.push(new Promise(function (resolve, reject) {
                    var options;
                    options = {
                        filename: filename
                    };
                    return uploadFile(gridFSBucket, file, options, function (err, res) {
                        if (err) {
                            return reject(err);
                        }
                        var id = res._id.toString();
                        var response = {
                            name: res.filename,
                            size: res.length,
                            url: modifiedOptions.urlPrefix + 'file/' + model + '/' + id,
                            deleteUrl: modifiedOptions.urlPrefix + 'file/' + model + '/' + id,
                            deleteType: 'DELETE'
                        };
                        var typeFromExtension = path.extname(res.filename);
                        /*
                        Create thumbnails on ImageTragick 'safe-ish' types (according to https://lcamtuf.blogspot.co.uk/2016/05/clearing-up-some-misconceptions-around.html)
                        */
                        switch (typeFromExtension) {
                            case '.gif':
                            case '.png':
                            case '.jpg':
                            case '.jpeg':
                                // Create the thumbnail
                                var options_1 = {
                                    filename: 'thumbnail_' + res.filename,
                                    /*jshint -W106 */
                                    metadata: { original_id: id } // original id is needed to remove thumbnail afterwards
                                    /*jshint +W106 */
                                };
                                var type = typeFromExtension === '.jpeg' ? 'jpg' : typeFromExtension.slice(1, 4);
                                var resize = ims().resize('100x100').quality(90).inputFormat(type).outputFormat(type);
                                var readstream = gridFSBucket.openDownloadStream(res._id);
                                readstream.on('error', function (err2) {
                                    return reject(err2);
                                });
                                uploadFile(gridFSBucket, readstream.pipe(resize), options_1, function (err, res) {
                                    if (err) {
                                        return reject(err);
                                    }
                                    response.thumbnailUrl = modifiedOptions.urlPrefix + 'file/' + model + '/thumbnail/' + res._id.toString();
                                    return resolve(response);
                                });
                                break;
                            default:
                                response.thumbnailUrl = 'https://upload.wikimedia.org/wikipedia/commons/7/77/Icon_New_File_256x256.png';
                                return resolve(response);
                        }
                    });
                }));
            });
            busboy.on('finish', function () {
                return Promise.all(promises)
                    .then(function (results) {
                    return res.send({ files: results });
                }, function (err) {
                    return res.status(500).send(err);
                });
            });
            return req.pipe(busboy);
        }]));
    fng.app.get.apply(fng.app, processArgs(modifiedOptions, ['file/:model/:id', function (req, res) {
            try {
                var mongo = fng.mongoose.mongo;
                var model = req.params.model;
                var resource = fng.getResource(model);
                var gridFSBucket = new mongo.GridFSBucket(fng.mongoose.connection.db, { bucketName: resource.model.collection.name });
                var readstream = gridFSBucket.openDownloadStream(mongo.ObjectId(req.params.id));
                readstream.pipe(res);
            }
            catch (e) {
                console.log(e.message);
                res.sendStatus(400);
            }
        }]));
    // Thumbnails endpoint
    fng.app.get.apply(fng.app, processArgs(modifiedOptions, ['file/:model/thumbnail/:id', function (req, res) {
            try {
                var mongo = fng.mongoose.mongo;
                var model = req.params.model;
                var resource = fng.getResource(model);
                var gridFSBucket = new mongo.GridFSBucket(fng.mongoose.connection.db, { bucketName: resource.model.collection.name });
                var readstream = gridFSBucket.openDownloadStream(mongo.ObjectId(req.params.id));
                readstream.pipe(res);
            }
            catch (e) {
                console.log(e.message);
                res.sendStatus(400)();
            }
        }]));
    fng.app.delete.apply(fng.app, processArgs(modifiedOptions, ['file/:model/:id', function (req, res) {
            var mongo = fng.mongoose.mongo;
            var model = req.params.model;
            var resource = fng.getResource(model);
            var gridFSBucket = new mongo.GridFSBucket(fng.mongoose.connection.db, { bucketName: resource.model.collection.name });
            // Find the thumbnail image based on the original_id stored in the metadata
            // for the original file and remove it
            var collection = fng.mongoose.connection.collection(resource.model.collection.name + '.files');
            collection.findOne({ 'metadata.original_id': req.params.id }, {}, function (err, obj) {
                if (err) {
                    return;
                }
                if (obj) {
                    gridFSBucket.delete(obj._id); // Ignore any errors
                }
            });
            // remove the original file too
            gridFSBucket.delete(mongo.ObjectId(req.params.id), function (err) {
                if (err) {
                    res.status(500).send(err.message);
                }
                else {
                    res.sendStatus(200);
                }
            });
        }]));
}
exports.Controller = Controller;
