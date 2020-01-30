'use strict';

module.exports = function (grunt) {

  grunt.initConfig({
    jshint: {
      options: {
        jshintrc: '.jshintrc',
        reporterOutput: '',
      },
      all: [
        'Gruntfile.js',
        'app/*.js',
        'test/**/*.js'
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
    },

    mochaTest: {
      options: {
        reporter: 'dot'
      },
      all : {
        src: [
          'test/api/**/*.js'
        ]
      }
    },

    karma: {
      unit: {
        configFile: 'test/karma.conf.js',
        singleRun: true
      }
    },

  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-angular-templates');
  grunt.loadNpmTasks('grunt-mocha-test');
  grunt.loadNpmTasks('grunt-karma');

  grunt.registerTask('test', ['jshint', 'mochaTest', 'karma']);
  grunt.registerTask('build', ['ngtemplates', 'concat', 'uglify']);
  grunt.registerTask('default', ['test']);

};
