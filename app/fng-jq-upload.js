(function () {
  'use strict';
  var app = angular.module('uploadModule', [
    'blueimp.fileupload'
  ]);

  app.directive('fngJqUploadForm', ['fileUpload', function () {
    return {
      link: function (scope, element, attrs) {
        scope.options = {};
        // Pick up options from the mongoose schema
        scope.formScope = scope.$parent;
        scope.passedParams = scope.formScope[attrs.schema];
        angular.extend(scope.options, scope.passedParams.add);
        scope.url='/file/upload/' + scope.formScope.modelName;
        scope.options.url = scope.url;
        scope.options.maxFileSize = scope.sizeLimit;
        scope.name = scope.passedParams.name;
      },
      restrict: 'E',
      templateUrl: 'templates/fileform.html',
      scope: {},
      controller: function ($scope, $element, fileUpload) {
        $scope.loadingFiles = false;
        $scope.formScope = $scope.$parent;

        $scope.$on('fileuploaddone', function(event, data) {
          $scope.formScope.record[$scope.name] = $scope.formScope.record[$scope.name] || [];
          var fileDetails = data.result.files[0];
          var breakdown = /\/file\/(.+?)\/([0-9a-f]{24})/.exec(fileDetails.url);
          $scope.formScope.record[$scope.name].push(
            {
              _id:      breakdown[2],
              filename: fileDetails.name,
              size:     fileDetails.size
            });
        });
      }
    };
  }])
    .controller('FileDestroyController', ['$scope', '$http', 'fileUpload', function ($scope, $http, fileUpload) {
      var file = $scope.file,
        state;

//      $scope.uploadScope = $scope.$parent.$parent.$parent;
//      $scope.formScope = $scope.uploadScope.$parent;
//      $scope.name = $scope.uploadScope.passedParams.name;
//
//      if (!fileUpload.fieldData) {
//        fileUpload.fieldData = {};
//      }
//
//      if (!fileUpload.fieldData[$scope.name]) {
//        fileUpload.fieldData[$scope.name] = [];
//      }
//
//      $scope.filequeue = fileUpload.fieldData;

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
              $scope.clear(file);
            },
            function () {
              state = 'rejected';
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