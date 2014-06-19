# fng-jq-upload

jQuery file upload plugin for forms-angular, storing data in Mongo.  A wrapper for fng-jqfile-upload (which is a tiny 
adaptation of Dominic Bottger's fork of BlueImp jquery-file-upload).

## Usage

Add the following lines to the package.json file on the server side:

    "gridfs-uploader": ">=0.0.1",
    "multer": ">=0.0.1",
    
In the call to create the forms-angular object (normally in the main server express start-up module) add a key of 
*JQMongoFielUploader* as follows:
     
    var DataFormHandler = new (formsAngular)(app, {JQMongoFileUploader: {}});     

There are currently no configuration options, so just pass an empty object.

For the client side you need to run

    bower install fng-upload
    
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
    <script type="text/javascript" src="/bower_components/fng-jqfile-upload/dist/uploader.js"></script>
            
File fields need to be set up as follows:

    files: {type: String, form: {type: 'fileuploader', collection:'files'}},
    
where collection is the MongoDB collection you want the chunks stored in.