# fng-upload

File uploader plugin for forms-angular

## Usage

    bower install fng-upload
    
Add the following lines to your index.html (or equivalent) file

    <!-- blueimp Gallery styles -->
    <link rel="stylesheet" href="/bower_components/blueimp-gallery/css/blueimp-gallery.css">
    <!-- CSS to style the file input field as button and adjust the Bootstrap progress bars -->
    <link rel="stylesheet" href="/bower_components/angular-jqfile-upload/css/jquery.fileupload.css">
    <link rel="stylesheet" href="/bower_components/angular-jqfile-upload/css/jquery.fileupload-ui.css">
    
    <script type="text/javascript" src="/bower_components/blueimp-load-image/js/load-image.min.js"></script>
    <!-- The Canvas to Blob plugin is included for image resizing functionality -->
    <script type="text/javascript" src="/bower_components/blueimp-canvas-to-blob/js/canvas-to-blob.min.js"></script>
    <!-- blueimp Gallery script -->
    <script type="text/javascript" src="/bower_components/blueimp-gallery/js/jquery.blueimp-gallery.min.js"></script>
    <script type="text/javascript" src="/bower_components/angular-jqfile-upload/dist/uploader.js"></script>
            
File fields need to be set up as follows:

    files: {type: String, form: {type: 'fileuploader', collection:'files'}},
    
