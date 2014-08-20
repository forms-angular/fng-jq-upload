(function () {
  'use strict';
  var app = angular.module('uploadModule', [
    'blueimp.fileupload'
  ]);

  app.directive('fngJqUploadForm', ['$rootScope', 'fileUpload', function () {
    return {
      link: function (scope, element, attrs) {
        // Pick up options from the mongoose schema
        scope.formScope = scope.$parent;
        scope.passedParams = scope.formScope[attrs.schema];
        angular.extend(scope.options, scope.passedParams.add);
        scope.url='/file/upload/' + scope.formScope.modelName;
        scope.options.url = scope.url;
        scope.options.maxFileSize = scope.sizeLimit;
      },
      restrict: 'E',
      templateUrl: 'templates/fileform.html',
      scope: {
        allowed: '@',
        url: '@',
        autoUpload: '@',
        sizeLimit: '@',
        name: '@'
      },
//            case 'fileuploader':
//              sizeClassBS3 = 'col-xs-12';
//              value = '<ng-upload-form url="/file/upload/' + scope.modelName + '" auto-upload="true" size-limit="50000000" name="'+ idString +'"></ng-upload-form>';
//              break;

      controller: function ($rootScope, $scope, $element, fileUpload) {

        $scope.options = {
          url: $scope.url,
          dropZone: $element,
          maxFileSize: $scope.sizeLimit,
          autoUpload: $scope.autoUpload
        };
        $scope.loadingFiles = false;
        if (!$scope.queue) {
          $scope.queue = [];
        }

        var generateFileObject = function generateFileObjects(objects) {
          angular.forEach(objects, function (fileObject, key) {
            if (fileObject.url && fileObject.url.charAt(0) !== '/') {
              fileObject.url = '/' + fileObject.url;
            }

            if (fileObject.deleteUrl && fileObject.deleteUrl.charAt(0) !== '/') {
              fileObject.deleteUrl = '/' + fileObject.deleteUrl;
            }

            if (fileObject.thumbnailUrl && fileObject.thumbnailUrl.charAt(0) !== '/') {
              fileObject.thumbnailUrl = '/' + fileObject.thumbnailUrl;
            }

            $scope.queue[key] = fileObject;
          });
        };

        //extend fileUpload
        fileUpload.fieldData = {};
        fileUpload.addFieldData = function addFieldData(fieldName, fileData) {
          fieldData[fieldName].push(fileData);
        };
        fileUpload.removeFieldData = function removeFieldData(fieldName, fileId) {
          angular.forEach(fieldData[fieldName], function (value, key) {
            if (value && value._id) {
              if (value._id === fileId) {
                fieldData[fieldName].splice(key, 1);
              }
            }
          });
        };
        fileUpload.registerField = function registerField(fieldName) {
          if (!fieldData[fieldName]) {
            fieldData[fieldName] = [];
          }
        };
//
//
//
//        $scope.filequeue = fileUpload.fieldData[$scope.name];

        $scope.$watchCollection('filequeue', function (newval) {
          generateFileObject(newval);
//          $scope.$parent.$parent.$parent.$parent.record[$scope.fieldname] = $scope.filequeue;
        });

        $scope.$watchCollection('queue', function (newval) {
//          generateFileObject(newval);
//          $scope.$parent.$parent.$parent.$parent.record[$scope.fieldname] = $scope.filequeue;
        });

      }
    };
  }])
    .controller('FileDestroyController', ['$rootScope', '$scope', '$http', 'fileUpload', function ($rootScope, $scope, $http, fileUpload) {
      var file = $scope.file,
        state;

      $scope.uploadScope = $scope.$parent.$parent.$parent;
      $scope.formScope = $scope.uploadScope.$parent;
      $scope.name = $scope.uploadScope.passedParams.name;

      if (!fileUpload.fieldData) {
        fileUpload.fieldData = {};
      }

      if (!fileUpload.fieldData[$scope.name]) {
        fileUpload.fieldData[$scope.name] = [];
      }

      $scope.filequeue = fileUpload.fieldData;

      if (file.url) {
        file.$state = function () {
          return state;
        };
        file.$destroy = function () {
          state = 'pending';
          return $http({
            url: file.deleteUrl,
            method: file.deleteType
          }).then(
            function () {
              state = 'resolved';
              fileUpload.removeFieldData($scope.fieldname, file.result._id);
              $scope.clear(file);
            },
            function () {
              state = 'rejected';
              fileUpload.removeFieldData($scope.fieldname, file.result._id);
              $scope.clear(file);
            }
          );


        };
      } else if (!file.$cancel && !file._index) {
        file.$cancel = function () {
          $scope.clear(file);
        };
      }
    }
    ]);
})();