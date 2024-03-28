"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.controller = exports.createThumbnailStreamIfNeeded = exports.TooLargeError = exports.TOO_LARGE_FLAG = exports.FileSchema = void 0;
var mongoose = require("mongoose");
var path = require("path");
var busboy = require("busboy");
var ims = require("imagemagick-stream");
// the numeric values are written to the document property that stores the reference to the file (which
// will be of type FileSchemaObj, using schema FileSchema - see below).
var StoreInMongoDB = 1;
exports.FileSchema = {
    filename: String,
    size: Number,
    location: Number,
    thumbnailId: {
        type: mongoose.Schema.Types.ObjectId,
        form: {
            hidden: true, // needed to prevent fng from complaining about "No supported select lookup type..."
        },
    },
};
exports.TOO_LARGE_FLAG = "__tooLarge";
var TooLargeError = /** @class */ (function (_super) {
    __extends(TooLargeError, _super);
    function TooLargeError() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        // need a property like this because instanceof does not work with the compiler options currently used for this project
        _this[_a] = true;
        return _this;
    }
    return TooLargeError;
}(Error));
exports.TooLargeError = TooLargeError;
_a = exports.TOO_LARGE_FLAG;
function storeOneFileInMongoDB(gridFSBucket, file, options, callback) {
    var internalOptions = {};
    if (options.metadata) {
        internalOptions.metadata = options.metadata;
    }
    var stream = gridFSBucket.openUploadStream(options.filename, internalOptions);
    stream.once("finish", function (file) {
        callback(null, file);
    });
    stream.on("error", function (err) {
        callback(err);
    });
    file.on("limit", function () {
        stream.abort();
        callback(new TooLargeError());
    });
    file.pipe(stream);
}
function createThumbnailStreamIfNeeded(opts, filename) {
    if (!opts.required) {
        return;
    }
    var typeFromExtension = path.extname(filename).toLowerCase();
    // Create thumbnails on ImageTragick 'safe-ish' types (according to https://lcamtuf.blogspot.co.uk/2016/05/clearing-up-some-misconceptions-around.html)
    if (![".gif", ".png", ".jpg", ".jpeg"].includes(typeFromExtension)) {
        return;
    }
    var type = typeFromExtension.slice(1, 4);
    var size;
    if (opts.height && opts.width) {
        size = "".concat(opts.width, "x").concat(opts.height);
    }
    else if (opts.height) {
        // this is the preferable scenario in most cases - a height but not a width (which will be whatever the aspect ratio
        // results in it being)
        size = "x".concat(opts.height);
    }
    else if (opts.width) {
        size = "".concat(opts.width, "x");
    }
    else {
        throw new Error("opts must specify a height or a width or both when required is true");
    }
    // > tells it not to make the image bigger if it is already smaller than the dimensions specified here.  Unlikely, but
    // you never know...
    size += ">";
    // unsharp can improve the image quality after the resize.  See https://legacy.imagemagick.org/Usage/thumbnails/#height.
    return ims().thumbnail(size).autoOrient().op("unsharp", "0x.5").inputFormat(type).outputFormat(type);
}
exports.createThumbnailStreamIfNeeded = createThumbnailStreamIfNeeded;
function storeInMongoDB(fng, resource, file, filename, schemaThumbnailOpts) {
    var mongo = fng.mongoose.mongo;
    var bucketName = resource.model.collection.name;
    var bucket = new mongo.GridFSBucket(fng.mongoose.connection.db, { bucketName: bucketName });
    var opts = { filename: filename };
    return new Promise(function (resolve, reject) {
        storeOneFileInMongoDB(bucket, file, opts, function (writeError, storedFile) {
            if (writeError) {
                return reject(writeError);
            }
            var id = storedFile._id.toString();
            var storedFileInfo = {
                id: id,
                location: StoreInMongoDB,
                name: storedFile.filename,
                size: storedFile.length,
            };
            var tnStream = createThumbnailStreamIfNeeded(schemaThumbnailOpts, storedFile.filename);
            if (tnStream) {
                var readstream = bucket.openDownloadStream(storedFile._id);
                readstream.on("error", function (readError) {
                    return reject(readError);
                });
                var tnFile = readstream.pipe(tnStream);
                var tnOpts = {
                    filename: "thumbnail_" + filename,
                    metadata: { original_id: id }, // store the id of the thing that this is a thumbail for
                };
                storeOneFileInMongoDB(bucket, tnFile, tnOpts, function (tnWriteErr, storedTnFile) {
                    if (tnWriteErr) {
                        return reject(tnWriteErr);
                    }
                    storedFileInfo.thumbnailId = storedTnFile._id.toString();
                    return resolve(storedFileInfo);
                });
            }
            else {
                return resolve(storedFileInfo);
            }
        });
    });
}
function controller(fng, processArgs, options) {
    var modifiedFngOpts = Object.assign({}, fng.options);
    if (options.inhibitAuthentication) {
        delete modifiedFngOpts.authentication;
    }
    // the route used when saving an upload
    fng.app.post.apply(fng.app, processArgs(modifiedFngOpts, [
        "file/upload/:model/:fieldName",
        function (req, res) {
            var _b, _c;
            var modelName = req.params.model;
            var resource = fng.getResource(modelName);
            var fieldName = req.params.fieldName;
            var schemaThumbnailOpts = { required: true };
            if (resource.model) {
                var fieldDef = resource.model.schema.path(fieldName);
                if (fieldDef) {
                    var directiveOpts = (_b = fieldDef.options.form) === null || _b === void 0 ? void 0 : _b.fngJqUploadForm;
                    if (directiveOpts) {
                        if (directiveOpts.defaultThumbnail) {
                            schemaThumbnailOpts.required = false;
                        }
                        else {
                            schemaThumbnailOpts.width = directiveOpts.width || schemaThumbnailOpts.width;
                            schemaThumbnailOpts.height = directiveOpts.height || schemaThumbnailOpts.height;
                        }
                    }
                }
            }
            // the height of the thumbnail is typically more significant than the width (because thumbnails are
            // generally portrait, and vertical screen real estate is typically more limited).  so, if the schema
            // doesn't provide a width or a height, we'll provide a default height only.  the aspect ratio will
            // be preserved in this scenario.
            if (schemaThumbnailOpts.required && !schemaThumbnailOpts.height && !schemaThumbnailOpts.width) {
                schemaThumbnailOpts.height = 100;
            }
            var storageLimitsPromise = ((_c = options.storageLimitsDelegate) === null || _c === void 0 ? void 0 : _c.call(options, req, fieldName, resource)) || Promise.resolve({});
            storageLimitsPromise.then(function (storageLimits) {
                var bb = busboy({
                    headers: req.headers,
                    limits: { fileSize: storageLimits.maxFileSize },
                });
                var filePromises = [];
                bb.on("file", function (internalFieldname, file, fileInfo) {
                    var _b;
                    // if we have been provided with a storageDelegate and it returns something, it is taking responsibility
                    // for storing the file.  If we haven't, or it doesn't, we'll do it ourselves (to MongoDB)
                    filePromises.push((((_b = options.storageDelegate) === null || _b === void 0 ? void 0 : _b.call(options, req, fieldName, file, fileInfo.filename, resource, schemaThumbnailOpts)) ||
                        storeInMongoDB(fng, resource, file, fileInfo.filename, schemaThumbnailOpts)) // we need to catch here rather than waiting for the promise.all(..) call that we make in the bb.on("close")
                        // handler, below, because otherwise the error will leak out to the "next" handler and get reported to Sentry
                        .catch(function (e) {
                        // can't use instanceof here (think the compiler options need to be more up-to-date to allow that)
                        if (exports.TOO_LARGE_FLAG in e) {
                            var units = "byte";
                            var value = storageLimits.maxFileSize;
                            if (value % 1024 === 0) {
                                value = value / 1024;
                                units = "kilobyte";
                                if (value % 1024 === 0) {
                                    value = value / 1024;
                                    units = "megabyte";
                                }
                            }
                            if (value > 1) {
                                units += "s";
                            }
                            return "The file is too large.  The maximum permitted size is ".concat(value, " ").concat(units, ".");
                        }
                        else {
                            return e.message || "An unexpected error occurred";
                        }
                    }));
                });
                bb.on("close", function () {
                    // we'll send errors back as an object because the front-end seems to be expecting JSON, even when
                    // the status indicates an error.  this is parsed by the fileuploadfail handler at the front end.
                    Promise.all(filePromises)
                        .then(function (filesOrErrorMessages) {
                        var firstErrorMsg = filesOrErrorMessages.find(function (result) { return typeof result === "string"; });
                        if (firstErrorMsg) {
                            res.status(500).send({ error: firstErrorMsg });
                        }
                        else {
                            res.send({ files: filesOrErrorMessages });
                        }
                    })
                        .catch(function (e) {
                        // because of the catch that is chained to each promise which we added to filePromises earlier, I
                        // don't think we should ever get here
                        var msg = e.message || "An unexpected error occurred";
                        return res.status(500).send({ error: msg });
                    });
                });
                req.pipe(bb);
            });
        },
    ]));
    // the route used when retrieving the thumbnail for a previously-uploaded file
    fng.app.get.apply(fng.app, processArgs(modifiedFngOpts, [
        "file/:model/:location/thumbnail/:fileId",
        function (req, res) {
            return __awaiter(this, void 0, void 0, function () {
                var location_1, mongo, modelName, fileId, resource, files, cursor, thumbnailData, idObj, gridFSBucket, readstream, e_1;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _b.trys.push([0, 2, , 3]);
                            location_1 = Number.parseInt(req.params.location);
                            if (location_1 !== StoreInMongoDB) {
                                throw new Error("This URL should only be used for files stored in MongoDB");
                            }
                            mongo = fng.mongoose.mongo;
                            modelName = req.params.model;
                            fileId = req.params.fileId;
                            resource = fng.getResource(modelName);
                            files = fng.mongoose.connection.db.collection(resource.model.collection.collectionName + ".files");
                            cursor = files.find({ "metadata.original_id": fileId });
                            return [4 /*yield*/, cursor.toArray()];
                        case 1:
                            thumbnailData = _b.sent();
                            idObj = thumbnailData.length === 1 ? thumbnailData[0]._id : new mongo.ObjectId(fileId);
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
                            e_1 = _b.sent();
                            res.status(400).send(e_1.message);
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            });
        },
    ]));
    // the route used when retrieving a previously-uploaded file
    fng.app.get.apply(fng.app, processArgs(modifiedFngOpts, [
        "file/:model/:location/:fileId",
        function (req, res) {
            try {
                var location_2 = Number.parseInt(req.params.location);
                var fileId = req.params.fileId;
                if (location_2 === StoreInMongoDB) {
                    var mongo = fng.mongoose.mongo;
                    var modelName = req.params.model;
                    var resource = fng.getResource(modelName);
                    var bucketName = resource.model.collection.name;
                    var gridFSBucket = new mongo.GridFSBucket(fng.mongoose.connection.db, { bucketName: bucketName });
                    var readstream = gridFSBucket.openDownloadStream(new mongo.ObjectId(fileId));
                    readstream.on("error", function (err) {
                        res.status(400).send(err.message);
                    });
                    readstream.pipe(res);
                }
                else {
                    if (!options.retrievalDelegate) {
                        throw new Error("A retrievalDelegate is required when the storage location is not MongoDB");
                    }
                    options.retrievalDelegate(req, fileId, location_2, res);
                }
            }
            catch (e) {
                console.log(e.message);
                res.sendStatus(400);
            }
        },
    ]));
    // the route used when deleting a file (when clicking on the trashcan icon that is provided alongside the thumbnail)
    fng.app.delete.apply(fng.app, processArgs(modifiedFngOpts, [
        "file/:model/:location/:fileIdOrIds",
        function (req, res) {
            return __awaiter(this, void 0, void 0, function () {
                var location_3, fileIds, mongo, model, resource, gridFSBucket, collection, obj, _b, _i, fileIds_1, fileId, _c, fileIds_2, fileId, e_2;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            _d.trys.push([0, 11, , 12]);
                            location_3 = Number.parseInt(req.params.location);
                            fileIds = req.params.fileIdOrIds.split(",");
                            if (!(location_3 === StoreInMongoDB)) return [3 /*break*/, 9];
                            mongo = fng.mongoose.mongo;
                            model = req.params.model;
                            resource = fng.getResource(model);
                            gridFSBucket = new mongo.GridFSBucket(fng.mongoose.connection.db, {
                                bucketName: resource.model.collection.name,
                            });
                            if (!(fileIds.length === 1)) return [3 /*break*/, 4];
                            collection = fng.mongoose.connection.collection(resource.model.collection.name + ".files");
                            _d.label = 1;
                        case 1:
                            _d.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, collection.findOne({ "metadata.original_id": fileIds[0] }, {})];
                        case 2:
                            obj = _d.sent();
                            if (obj) {
                                fileIds.push(obj._id.toString());
                            }
                            return [3 /*break*/, 4];
                        case 3:
                            _b = _d.sent();
                            return [3 /*break*/, 4];
                        case 4:
                            _i = 0, fileIds_1 = fileIds;
                            _d.label = 5;
                        case 5:
                            if (!(_i < fileIds_1.length)) return [3 /*break*/, 8];
                            fileId = fileIds_1[_i];
                            return [4 /*yield*/, gridFSBucket.delete(new mongo.ObjectId(fileId))];
                        case 6:
                            _d.sent();
                            _d.label = 7;
                        case 7:
                            _i++;
                            return [3 /*break*/, 5];
                        case 8: return [3 /*break*/, 10];
                        case 9:
                            if (!options.deletionDelegate) {
                                throw new Error("A deletionDelegate is required when the storage location is not MongoDB");
                            }
                            // for files that are NOT stored in MongoDB, we expect to be provided with the id for both the file
                            // and (if there is one) its thumbnail
                            for (_c = 0, fileIds_2 = fileIds; _c < fileIds_2.length; _c++) {
                                fileId = fileIds_2[_c];
                                options.deletionDelegate(req, fileId, location_3);
                            }
                            _d.label = 10;
                        case 10:
                            res.sendStatus(200);
                            return [3 /*break*/, 12];
                        case 11:
                            e_2 = _d.sent();
                            res.status(500).send(e_2.message);
                            return [3 /*break*/, 12];
                        case 12: return [2 /*return*/];
                    }
                });
            });
        },
    ]));
    var retVal = {};
    // here we can set up any necessary values to be returned as retVal.dependencyChecks (see fng-audit for an example).
    // but in our case, we have nothing, so we can simply...
    return retVal;
}
exports.controller = controller;
