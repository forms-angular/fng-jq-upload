'use strict';

module.exports = function (config) {
  config.set({
    basePath: '../',
    frameworks: ['jasmine'],
    files: [
      'node_modules/angular/angular.js',
      'node_modules/angular-mocks/angular-mocks.js',
      'node_modules/forms-angular/dist/client/forms-angular.js',
      'node_modules/angular-elastic/elastic.js',
      'node_modules/angular-sanitize/angular-sanitize.js',
      'node_modules/angular-animate/angular-animate.js',
      'node_modules/angular-messages/angular-messages.js',
      'node_modules/ng-infinite-scroll/build/ng-infinite-scroll.js',
      'node_modules/angular-ui-bootstrap/dist/ui-bootstrap-tpls.js',
      'node_modules/blueimp-file-upload/js/cors/jquery.postmessage-transport.js',
      'node_modules/blueimp-file-upload/js/cors/jquery.xdr-transport.js',
      'node_modules/blueimp-file-upload/js/vendor/jquery.ui.widget.js',
      'node_modules/blueimp-file-upload/js/jquery.fileupload.js',
      'node_modules/blueimp-file-upload/js/jquery.fileupload-process.js',
      'node_modules/blueimp-file-upload/js/jquery.fileupload-validate.js',
      'node_modules/blueimp-file-upload/js/jquery.fileupload-image.js',
      'node_modules/blueimp-file-upload/js/jquery.fileupload-audio.js',
      'node_modules/blueimp-file-upload/js/jquery.fileupload-video.js',
      'node_modules/blueimp-file-upload/js/jquery.fileupload-ui.js',
      'node_modules/blueimp-file-upload/js/jquery.fileupload-angular.js',
      'node_modules/blueimp-file-upload/js/jquery.iframe-transport.js',
      'app/fng-jq-upload.js',
      'templates/*.html',
      'test/helpers/**/*.js',
      'test/unit/**/*.js'
    ],

    autoWatch: true,
    usePolling: true,

    customLaunchers: {
      ChromeHeadless: {
        base: 'Chrome',
        flags: [
          '--headless',
          '--disable-gpu',
          // Without a remote debugging port, Google Chrome exits immediately.
          '--remote-debugging-port=9222',
        ],
      }
    },

    browsers : ['ChromeHeadless'],


    // use dots reporter, as travis terminal does not support escaping sequences
    // possible values: 'dots', 'progress'
    // CLI --reporters progress
    reporters: ['progress', 'junit'],

    junitReporter: {
      outputFile: 'test_out/unit.xml',
      suite: 'unit'
    },
    plugins: [
      'karma-jasmine',
      'karma-chrome-launcher',
      'karma-ng-html2js-preprocessor',
      'karma-junit-reporter'
    ],
    ngHtml2JsPreprocessor: {
      // strip this from the file path
      stripPrefix: ''
    },
    preprocessors: {
      'templates/*.html': 'ng-html2js'
    }
  });
};
