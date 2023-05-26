"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Controller = exports.FileSchema = void 0;
var path = require("path");
var Busboy = require("busboy");
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
    fng.app.post.apply(fng.app, processArgs(modifiedOptions, [
        "file/upload/:model",
        function (req, res) {
            function uploadFile(gridFSBucket, file, options, callback) {
                if (callback == null) {
                    callback = function () { };
                }
                var mongo = fng.mongoose.mongo;
                options._id = new mongo.ObjectId();
                options.mode = "w";
                var openOptions = {};
                if (options.metadata) {
                    openOptions.metadata = options.metadata;
                }
                var stream = gridFSBucket.openUploadStream(options.filename, openOptions);
                stream.once("finish", function (metaData) {
                    return callback(null, metaData);
                });
                stream.on("error", function (err) {
                    callback(err);
                });
                return file.pipe(stream);
            }
            var model = req.params.model;
            var busboy = new Busboy({
                headers: req.headers,
            });
            var mongo = fng.mongoose.mongo;
            var resource = fng.getResource(model);
            var gridFSBucket = new mongo.GridFSBucket(fng.mongoose.connection.db, {
                bucketName: resource.model.collection.name,
            });
            var promises = [];
            busboy.on("file", function (fieldname, file, filename) {
                return promises.push(new Promise(function (resolve, reject) {
                    var options = {
                        filename: filename,
                    };
                    return uploadFile(gridFSBucket, file, options, function (err, res) {
                        if (err) {
                            return reject(err);
                        }
                        var id = res._id.toString();
                        var response = {
                            name: res.filename,
                            size: res.length,
                            url: modifiedOptions.urlPrefix + "file/" + model + "/" + id,
                            deleteUrl: modifiedOptions.urlPrefix + "file/" + model + "/" + id,
                            deleteType: "DELETE",
                        };
                        var typeFromExtension = path.extname(res.filename).toLowerCase();
                        // Create thumbnails on ImageTragick 'safe-ish' types (according to https://lcamtuf.blogspot.co.uk/2016/05/clearing-up-some-misconceptions-around.html )
                        switch (typeFromExtension) {
                            case ".gif":
                            case ".png":
                            case ".jpg":
                            case ".jpeg": {
                                // Create the thumbnail
                                var options_1 = {
                                    filename: "thumbnail_" + res.filename,
                                    /*jshint -W106 */
                                    metadata: { original_id: id }, // original id is needed to remove thumbnail afterwards
                                    /*jshint +W106 */
                                };
                                var type = typeFromExtension.slice(1, 4);
                                var resize = ims().resize("100x100").quality(90).inputFormat(type).outputFormat(type);
                                var readstream = gridFSBucket.openDownloadStream(res._id);
                                readstream.on("error", function (err2) {
                                    return reject(err2);
                                });
                                uploadFile(gridFSBucket, readstream.pipe(resize), options_1, function (err, res) {
                                    if (err) {
                                        return reject(err);
                                    }
                                    response.thumbnailUrl =
                                        modifiedOptions.urlPrefix + "file/" + model + "/thumbnail/" + res._id.toString();
                                    return resolve(response);
                                });
                                break;
                            }
                            default:
                                response.thumbnailUrl =
                                    "https://upload.wikimedia.org/wikipedia/commons/7/77/Icon_New_File_256x256.png";
                                return resolve(response);
                        }
                    });
                }));
            });
            busboy.on("finish", function () {
                return Promise.all(promises).then(function (results) {
                    return res.send({ files: results });
                }, function (err) {
                    return res.status(500).send(err);
                });
            });
            return req.pipe(busboy);
        },
    ]));
    fng.app.get.apply(fng.app, processArgs(modifiedOptions, [
        "file/:model/:id",
        function (req, res) {
            try {
                var mongo = fng.mongoose.mongo;
                var model = req.params.model;
                var resource = fng.getResource(model);
                var gridFSBucket = new mongo.GridFSBucket(fng.mongoose.connection.db, {
                    bucketName: resource.model.collection.name,
                });
                var readstream = gridFSBucket.openDownloadStream(new mongo.ObjectId(req.params.id));
                readstream.on("error", function (err) {
                    res.status(400).send(err.message);
                });
                readstream.pipe(res);
            }
            catch (e) {
                console.log(e.message);
                res.sendStatus(400);
            }
        },
    ]));
    // Thumbnails endpoint
    fng.app.get.apply(fng.app, processArgs(modifiedOptions, [
        "file/:model/thumbnail/:id",
        function (req, res) {
            return __awaiter(this, void 0, void 0, function () {
                var mongo, model, resource, id, files, cursor, thumbnailData, idObj, gridFSBucket, readstream, e_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            mongo = fng.mongoose.mongo;
                            model = req.params.model;
                            resource = fng.getResource(model);
                            id = req.params.id;
                            files = fng.mongoose.connection.db.collection(resource.model.collection.collectionName + ".files");
                            cursor = files.find({ "metadata.original_id": id });
                            return [4 /*yield*/, cursor.toArray()];
                        case 1:
                            thumbnailData = _a.sent();
                            idObj = thumbnailData.length === 1 ? thumbnailData[0]._id : new mongo.ObjectId(id);
                            gridFSBucket = new mongo.GridFSBucket(fng.mongoose.connection.db, {
                                bucketName: resource.model.collection.name,
                            });
                            readstream = gridFSBucket.openDownloadStream(idObj);
                            readstream.on("error", function (err) {
                                res.status(400).send(err.message);
                            });
                            readstream.pipe(res);
                            return [3 /*break*/, 3];
                        case 2:
                            e_1 = _a.sent();
                            res.status(400).send(e_1.message);
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            });
        },
    ]));
    fng.app.delete.apply(fng.app, processArgs(modifiedOptions, [
        "file/:model/:id",
        function (req, res) {
            var mongo = fng.mongoose.mongo;
            var model = req.params.model;
            var resource = fng.getResource(model);
            var gridFSBucket = new mongo.GridFSBucket(fng.mongoose.connection.db, {
                bucketName: resource.model.collection.name,
            });
            // Find the thumbnail image based on the original_id stored in the metadata
            // for the original file and remove it
            var collection = fng.mongoose.connection.collection(resource.model.collection.name + ".files");
            collection
                .findOne({ "metadata.original_id": req.params.id }, {})
                .then(function (obj) {
                gridFSBucket.delete(obj._id);
            })
                .catch(function (err) {
                // Ignore any errors
            });
            // remove the original file too
            gridFSBucket
                .delete(new mongo.ObjectId(req.params.id))
                .then(function () {
                res.sendStatus(200);
            })
                .catch(function (err) {
                res.status(500).send(err.message);
            });
        },
    ]));
}
exports.Controller = Controller;
