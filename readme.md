# fng-jq-upload

jQuery file upload plugin for forms-angular, storing data in Mongo.  A wrapper for BlueImp jquery-file-upload, heavily influenced Dominic Bottger's fork of that project.

## Usage

### On the server side:

    npm install fng-jq-upload

and install [ImageMagick](http://www.imagemagick.org/script/index.php) for creating image thumbnails.

In the call to create the forms-angular object (normally in the main server express start-up module) add a plugins property to the options  as follows:
     
    var fngJqUpload = require('fng-jq-upload');
    var DataFormHandler = new (formsAngular)(app, {
      plugins: {
        JQMongoFileUploader: { plugin: fngJqUpload.Controller, options: { } },
      }
    });

Configuration options:

- **inhibitAuthentication** : boolean.  Inhibit calling any authentication middleware that forms-angular has been told to use.  Prevents having to intercept http calls in BlueImp (PRs to enable this would be more than welcome).

### On the client side:

Run

    bower install fng-jq-upload
    
Add the following lines to your index.html (or equivalent) file

    <!-- blueimp Gallery styles -->
    <link rel="stylesheet" href="/bower_components/blueimp-gallery/css/blueimp-gallery.css">
    <!-- CSS to style the file input field as button and adjust the Bootstrap progress bars -->
    <link rel="stylesheet" href="/bower_components/fng-jqfile-upload/css/jquery.fileupload.css">
    <link rel="stylesheet" href="/bower_components/fng-jqfile-upload/css/jquery.fileupload-ui.css">
    
    <script type="text/javascript" src="/bower_components/blueimp-load-image/js/load-image.min.js"></script>
    <!-- The Canvas to Blob plugin is included for image resizing functionality -->
    <script type="text/javascript" src="/bower_components/blueimp-canvas-to-blob/js/canvas-to-blob.min.js"></script>
    <!-- blueimp Gallery script -->
    <script type="text/javascript" src="/bower_components/blueimp-gallery/js/jquery.blueimp-gallery.min.js"></script>
    <script type="text/javascript" src="/bower_components/fng-jq-upload/fng-jq-upload.js"></script>
    
Ensure that your application module (or whatever module is going to use the uploader) specifies uploadModule as a dependency.

    angular.module('myApplication', ['uploadModule']);    
            
File fields need to be set up as follows:

    var uploadSchema = new mongoose.Schema({
      filename: String,
      size: Number
    });

    var mySchema = new mongoose.Schema({
      domrField: String,
      files: {
        type: [uploadSchema],
        form: {
          directive: 'fng-jq-upload-form', 
          fngJqUploadForm: {
            sizeLimit: 5000000,
            autoUpload:true
          }
        }
      }
    });

You can extend the schema and add the additFields property to the fngJqUploadForm object to generate an inline form to capture the extra fields.  For example:

    additFields: JSON.stringify([{name:'param'}]),
    
the additFields property is of type [form schema](https://www.forms-angular.org/#/schemas#formschema).    

The chunks and file details get stored in the collection.files and collection.chunks collections where 'collection' is the collection in which the data for mySchema is stored.  Additional fields, if any, get stored in the main collection.

This is done using the following api endpoints:

  * **POST /file/upload/:model** stores the uploaded file to a model.  In the case of *gif*, *png* or *jpg* files
  creates a thumbnail.  Other file types get a reference to a generic file icon as a thumbnail.
  * **GET /file/:model/:id** retrieves a stored file
  * **GET /file/:model/thumbnail/:id** retrieves a thumbnail for a stored graphical file
  * **DELETE /file/:model/:id** deletes a stored file
  