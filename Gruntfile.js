/*
 * jQuery File Upload Gruntfile
 * https://github.com/blueimp/jQuery-File-Upload
 *
 * Copyright 2013, Sebastian Tschan
 * https://blueimp.net
 *
 * Licensed under the MIT license:
 * http://www.opensource.org/licenses/MIT
 */

/*global module */

module.exports = function (grunt) {
  'use strict';

  grunt.initConfig({
    jshint: {
      options: {
        jshintrc: '.jshintrc'
      },
      all: [
        'Gruntfile.js',
        'app/*.js',
        'lib/*.js'
      ]
    },
    concat: {
      dist: {
        src: [
          'app/*.js',
          'generated/*.js'
        ],
        dest: 'dist/fng-jq-upload.js'
      }
    },
    ngtemplates: {
      //TODO separate out the bs2 and bs3 stuff so we aren't sending near dupes down the wire
      uploadModule: {
        src: 'templates/**.html',
        dest: 'generated/templates.js',
        options: {
          htmlmin: {
            collapseBooleanAttributes: true,
            collapseWhitespace: true,
            removeAttributeQuotes: true,
            removeComments: true,
            removeEmptyAttributes: true,
            removeRedundantAttributes: true,
            removeScriptTypeAttributes: true,
            removeStyleLinkTypeAttributes: true
          }
        }
      }
    },
    uglify: {
      dist: {
        files: {
          'dist/fng-jq-upload.min.js': ['dist/fng-jq-upload.js']
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-bump-build-git');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-angular-templates');

  grunt.registerTask('test', ['jshint']);
  grunt.registerTask('build', ['ngtemplates', 'concat', 'uglify']);
  grunt.registerTask('default', ['test']);

};