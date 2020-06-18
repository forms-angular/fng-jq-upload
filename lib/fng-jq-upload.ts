import * as Busboy from 'busboy';
import * as path from 'path';
import * as ims from 'imagemagick-stream';
import * as Mongoose from "mongoose";
import {Collection, GridFSBucket, MongoError, ObjectID} from "mongodb";
import * as stream from "stream";

interface JqUploadOptions {
    debug?: Boolean;
    inhibitAuthentication?: Boolean;
}

export interface FileSchemaObj {
    _id: Mongoose.Types.ObjectId;
    filename: string;
    size: number;
}

export const FileSchema = {
    filename: String,
    size: Number,
}

export interface IMetaData {
    original_id: any;
}

export interface IOptions {
    filename: string;
    metadata? : IMetaData;
    mode?: string;
    _id? : any;
}

export function Controller(fng: any, processArgs: (options: any, array: Array<any>) => Array<any>, options: JqUploadOptions) {

    this.options = options || {};
    let modifiedOptions = Object.assign({}, fng.options);
    if (this.options.inhibitAuthentication) {
        delete modifiedOptions.authentication;
    }

    fng.app.post.apply(fng.app, processArgs(modifiedOptions, ['file/upload/:model', function (req: any, res: any) {

        function uploadFile(gridFSBucket: GridFSBucket, file: stream, options: IOptions, callback?: (err: Error | null, res?: any) => void) {
            let stream;
            if (callback == null) {
                callback = function() {};
            }
            options._id = new fng.mongoose.mongo.ObjectID();
            options.mode = 'w';
            let openOptions: any = {};
            if (options.metadata) {
                openOptions.metadata = options.metadata;
            }
            stream = gridFSBucket.openUploadStream(options.filename, openOptions);
            stream.once('finish', function(metaData: any) {
                return callback(null, metaData);
            });
            stream.on('error', function(err) {
                callback(err);
            });
            return file.pipe(stream);
        }

        let model = req.params.model;
        let busboy = new Busboy({
            headers: req.headers
        });
        let mongo = fng.mongoose.mongo;
        let resource = fng.getResource(model);
        const gridFSBucket = new mongo.GridFSBucket(fng.mongoose.connection.db, {bucketName: resource.model.collection.name});
        let promises: any = [];
        busboy.on('file', function(fieldname, file, filename) {
            return promises.push(new Promise(function(resolve, reject) {
                let options;
                options = {
                    filename: filename
                };
                return uploadFile(gridFSBucket, file, options, function(err, res) {
                    if (err) {
                        return reject(err);
                    }
                    let id = res._id.toString();
                    let response: any = {
                        name: res.filename,
                        size: res.length,
                        url: modifiedOptions.urlPrefix + 'file/' + model + '/' + id,
                        deleteUrl: modifiedOptions.urlPrefix + 'file/' + model + '/' + id,
                        deleteType: 'DELETE'
                    };

                    let typeFromExtension = path.extname(res.filename).toLowerCase();
                    /*
                    Create thumbnails on ImageTragick 'safe-ish' types (according to https://lcamtuf.blogspot.co.uk/2016/05/clearing-up-some-misconceptions-around.html )
                    */
                    switch (typeFromExtension) {
                        case '.gif':
                        case '.png':
                        case '.jpg':
                        case '.jpeg':
                            // Create the thumbnail
                            let options = {
                                filename: 'thumbnail_' + res.filename,
                                /*jshint -W106 */
                                metadata: {original_id: id} // original id is needed to remove thumbnail afterwards
                                /*jshint +W106 */
                            };

                            let type = typeFromExtension === '.jpeg' ? '.jpg' : typeFromExtension.slice(1,4);
                            let resize = ims().resize('100x100').quality(90).inputFormat(type).outputFormat(type);
                            var readstream = gridFSBucket.openDownloadStream(res._id);
                            readstream.on('error', (err2: Error) => {
                                return reject(err2);
                            });
                            uploadFile(gridFSBucket, readstream.pipe(resize), options, function(err, res) {
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
        busboy.on('finish', function() {
            return Promise.all(promises)
                .then(function(results) {
                    return res.send({files: results});
                }, function(err){
                    return res.status(500).send(err);
                }) ;
        });
        return req.pipe(busboy);
    }]));

    fng.app.get.apply(fng.app, processArgs(modifiedOptions, ['file/:model/:id', function (req: any, res: any) {
        try {
            let mongo = fng.mongoose.mongo;
            let model = req.params.model;
            let resource = fng.getResource(model);
            const gridFSBucket = new mongo.GridFSBucket(fng.mongoose.connection.db, {bucketName: resource.model.collection.name});
            let readstream = gridFSBucket.openDownloadStream(mongo.ObjectId(req.params.id));
            readstream.pipe(res);
        } catch (e) {
            console.log(e.message);
            res.sendStatus(400);
        }
    }]));

    // Thumbnails endpoint
    fng.app.get.apply(fng.app, processArgs(modifiedOptions, ['file/:model/thumbnail/:id', function (req: any, res: any) {
        try {
            let mongo = fng.mongoose.mongo;
            let model = req.params.model;
            let resource = fng.getResource(model);
            let id: string = req.params.id;
            let idObj: ObjectID;
            fng.mongoose.connection.db.collection(resource.model.collection.collectionName+'.files', (err: MongoError, files: Collection) => {
                if (err) {
                    throw err;
                }
                files.find({'metadata.original_id': id}).toArray(function(err2, thumbnailData) {
                    if (err2) {
                        throw err2;
                    }
                    if (thumbnailData.length === 1) {
                        idObj = thumbnailData[0]._id;
                    } else {
                        idObj = mongo.ObjectId(id)
                    }
                    const gridFSBucket = new mongo.GridFSBucket(fng.mongoose.connection.db, {bucketName: resource.model.collection.name});
                    let readstream = gridFSBucket.openDownloadStream(idObj);
                    readstream.pipe(res);
                });
            })
        } catch (e) {
            console.log(e.message);
            res.sendStatus(400)();
        }
    }]));

    fng.app.delete.apply(fng.app, processArgs(modifiedOptions, ['file/:model/:id', function (req: any, res: any) {
        let mongo = fng.mongoose.mongo;
        let model = req.params.model;
        let resource = fng.getResource(model);
        const gridFSBucket = new mongo.GridFSBucket(fng.mongoose.connection.db, {bucketName: resource.model.collection.name});

        // Find the thumbnail image based on the original_id stored in the metadata
        // for the original file and remove it
        let collection = fng.mongoose.connection.collection(resource.model.collection.name + '.files');
        collection.findOne({ 'metadata.original_id': req.params.id }, { }, function (err : MongoError | null, obj: any) {
            if (err) { return; }
            if (obj) {
                gridFSBucket.delete(obj._id);   // Ignore any errors
            }
        });

        // remove the original file too
        gridFSBucket.delete(mongo.ObjectId(req.params.id), function (err: MongoError | undefined) {
            if (err) {
                res.status(500).send(err.message);
            } else {
                res.sendStatus(200);
            }
        });

    }]));

}

