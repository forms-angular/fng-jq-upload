'use strict';

import * as Grid from 'gridfs-stream';
import * as Busboy from 'busboy';
import * as path from 'path';
import * as ims from 'imagemagick-stream';
import * as Mongoose from "mongoose";

interface JqUploadOptions {
    debug?: Boolean;
    inhibitAuthentication?: Boolean;
}

export interface FileSchema {
    _id: Mongoose.Types.ObjectId;
    filename: string;
    size: number;
}

export function Controller(fng: any, processArgs: (options: any, array: Array<any>) => Array<any>, options: JqUploadOptions) {

    this.options = options || {};
    let modifiedOptions = Object.assign({}, fng.options);
    if (this.options.inhibitAuthentication) {
        delete modifiedOptions.authentication;
    }

    fng.app.post.apply(fng.app, processArgs(modifiedOptions, ['file/upload/:model', function (req: any, res: any) {

        function uploadFile(gfs, file, options, callback) {
            let stream;
            if (callback == null) {
                callback = function() {};
            }
            let mongo = fng.mongoose.mongo;
            options._id = new mongo.ObjectID();
            options.mode = 'w';
            stream = gfs.createWriteStream(options);
            stream.on('close', function(metaData) {
                return callback(null, metaData);
            });
            stream.on('error', callback);
            return file.pipe(stream);
        }

        let model = req.params.model;
        let busboy = new Busboy({
            headers: req.headers
        });
        let mongo = fng.mongoose.mongo;
        let resource = fng.getResource(model);
        let gfs: any = new Grid(resource.model.db.db, mongo);
        let promises: any = [];
        busboy.on('file', function(fieldname, file, filename) {
            return promises.push(new Promise(function(resolve, reject) {
                let options;
                options = {
                    filename: filename,
                    root: resource.model.collection.name
                };
                return uploadFile(gfs, file, options, function(err, res) {
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

                    let typeFromExtension = path.extname(res.filename);
                    /*
                    Create thumbnails on ImageTragick 'safe-ish' types (according to https://lcamtuf.blogspot.co.uk/2016/05/clearing-up-some-misconceptions-around.html)
                    */
                    switch (typeFromExtension) {
                        case '.gif':
                        case '.png':
                        case '.jpg':
                        case '.jpeg':
                            // Create the thumbnail
                            let options = {
                                filename: 'thumbnail_' + res.filename,
                                root: resource.model.collection.name,
                                /*jshint -W106 */
                                metadata: {original_id: id} // original id is needed to remove thumbnail afterwards
                                /*jshint +W106 */
                            };

                            let type = typeFromExtension === '.jpeg' ? 'jpg' : typeFromExtension.slice(1,4);
                            let resize = ims().resize('100x100').quality(90).inputFormat(type).outputFormat(type);
                            let readstream = gfs.createReadStream({_id: id, root: resource.model.collection.name, fsync: true});
                            uploadFile(gfs, readstream.pipe(resize), options, function(err, res) {
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
            let gfs = new Grid(resource.model.db.db, mongo);
            let readstream = gfs.createReadStream({_id: req.params.id, root: resource.model.collection.name});
            readstream.pipe(res);
        } catch (e) {
            console.log(e.message);
            res.status(400).end();
        }
    }]));

    // Thumbnails endpoint
    fng.app.get.apply(fng.app, processArgs(modifiedOptions, ['file/:model/thumbnail/:id', function (req: any, res: any) {
        try {
            let mongo = fng.mongoose.mongo;
            let model = req.params.model;
            let resource = fng.getResource(model);
            let gfs = new Grid(resource.model.db.db, mongo);
            let readstream = gfs.createReadStream({_id: req.params.id, root: resource.model.collection.name});
            readstream.pipe(res);
        } catch (e) {
            console.log(e.message);
            res.status(400).end();
        }
    }]));

    fng.app.delete.apply(fng.app, processArgs(modifiedOptions, ['file/:model/:id', function (req: any, res: any) {
        let mongo = fng.mongoose.mongo;
        let model = req.params.model;
        let resource = fng.getResource(model);
        let rootName = resource.model.collection.name;
        let gfs = new Grid(resource.model.db.db, mongo);

        // Find the thumbnail image based on the original_id stored in the metadata
        // for the original file and remove it
        let collection = fng.mongoose.connection.collection(resource.model.collection.name + '.files');
        collection.findOne({ 'metadata.original_id': req.params.id }, { }, function (err, obj) {
            if (err) { return; }
            if (obj) {
                gfs.remove({_id: obj._id, root: rootName});   // Ignore any errors
            }
        });

        // remove the original file too
        gfs.remove({_id: req.params.id, root: rootName}, function (err) {
            if (err) {
                res.status(500).end();
            } else {
                res.status(200).end();
            }
        });

    }]));

}

