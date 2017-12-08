'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
var Grid = require("gridfs-stream");
var Busboy = require("busboy");
var path = require("path");
var ims = require("imagemagick-stream");
exports.FileSchema = {
    filename: String,
    size: Number
};
function Controller(fng, processArgs, options) {
    this.options = options;
    fng.app.post.apply(fng.app, processArgs(fng.options, ['file/upload/:model', function (req, res) {
            function uploadFile(gfs, file, options, callback) {
                var stream;
                if (callback == null) {
                    callback = function () { };
                }
                var mongo = fng.mongoose.mongo;
                options._id = new mongo.ObjectID();
                options.mode = 'w';
                stream = gfs.createWriteStream(options);
                stream.on('close', function (metaData) {
                    return callback(null, metaData);
                });
                stream.on('error', callback);
                return file.pipe(stream);
            }
            var model = req.params.model;
            var busboy = new Busboy({
                headers: req.headers
            });
            var mongo = fng.mongoose.mongo;
            var resource = fng.getResource(model);
            var gfs = new Grid(resource.model.db.db, mongo);
            var promises = [];
            busboy.on('file', function (fieldname, file, filename) {
                return promises.push(new Promise(function (resolve, reject) {
                    var options;
                    options = {
                        filename: filename,
                        root: resource.model.collection.name
                    };
                    return uploadFile(gfs, file, options, function (err, res) {
                        if (err) {
                            return reject(err);
                        }
                        var id = res._id.toString();
                        var response = {
                            name: res.filename,
                            size: res.length,
                            url: '/file/' + model + '/' + id,
                            deleteUrl: '/file/' + model + '/' + id,
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
                                    root: resource.model.collection.name,
                                    /*jshint -W106 */
                                    metadata: { original_id: id } // original id is needed to remove thumbnail afterwards
                                    /*jshint +W106 */
                                };
                                var type = typeFromExtension === 'jpeg' ? 'jpg' : typeFromExtension.slice(1, 4);
                                var resize = ims().resize('100x100').quality(90).inputFormat(type).outputFormat(type);
                                var readstream = gfs.createReadStream({ _id: id, root: resource.model.collection.name, fsync: true });
                                uploadFile(gfs, readstream.pipe(resize), options_1, function (err, res) {
                                    if (err) {
                                        return reject(err);
                                    }
                                    response.thumbnailUrl = '/file/' + model + '/thumbnail/' + res._id.toString();
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
    fng.app.get.apply(fng.app, processArgs(fng.options, ['file/:model/:id', function (req, res) {
            try {
                var mongo = fng.mongoose.mongo;
                var model = req.params.model;
                var resource = fng.getResource(model);
                var gfs = new Grid(resource.model.db.db, mongo);
                var readstream = gfs.createReadStream({ _id: req.params.id, root: resource.model.collection.name });
                readstream.pipe(res);
            }
            catch (e) {
                console.log(e.message);
                res.status(400).end();
            }
        }]));
    // Thumbnails endpoint
    fng.app.get.apply(fng.app, processArgs(fng.options, ['file/:model/thumbnail/:id', function (req, res) {
            try {
                var mongo = fng.mongoose.mongo;
                var model = req.params.model;
                var resource = fng.getResource(model);
                var gfs = new Grid(resource.model.db.db, mongo);
                var readstream = gfs.createReadStream({ _id: req.params.id, root: resource.model.collection.name });
                readstream.pipe(res);
            }
            catch (e) {
                console.log(e.message);
                res.status(400).end();
            }
        }]));
    console.log('Loading plugin');
    fng.app.delete.apply(fng.app, processArgs(fng.options, ['file/:model/:id', function (req, res) {
            var mongo = fng.mongoose.mongo;
            var model = req.params.model;
            console.log(model, req.params.id);
            var resource = fng.getResource(model);
            var rootName = resource.model.collection.name;
            var gfs = new Grid(resource.model.db.db, mongo);
            // Find the thumbnail image based on the original_id stored in the metadata
            // for the original file and remove it
            var collection = fng.mongoose.connection.collection(resource.model.collection.name + '.files');
            collection.findOne({ 'metadata.original_id': req.params.id }, {}, function (err, obj) {
                if (err) {
                    return;
                }
                if (obj) {
                    gfs.remove({ _id: obj._id, root: rootName }); // Ignore any errors
                }
            });
            // remove the original file too
            gfs.remove({ _id: req.params.id, root: rootName }, function (err) {
                if (err) {
                    res.status(500).end();
                }
                else {
                    res.status(200).end();
                }
            });
        }]));
}
exports.Controller = Controller;
