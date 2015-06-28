(function () {
  'use strict';
  var app = angular.module('uploadModule', [
    'blueimp.fileupload'
  ]);

  var getIdFromUrl = function (url) {
    var breakdown = /\/file\/(.+?)\/([0-9a-f]{24})/.exec(url);
    return breakdown[2];
  };

  app.directive('fngJqUploadForm', ['fileUpload', function () {
    return {
      link: function (scope, element, attrs, ngModel) {
        //if (!ngModel) { return; }
        scope.options = {};
        // Pick up options from the mongoose schema
        scope.formScope = scope.$parent;
        scope.passedParams = scope.formScope[attrs.schema];
        angular.extend(scope.options, scope.passedParams.add);
        scope.url = '/file/upload/' + scope.formScope.modelName;
        scope.options.url = scope.url;
        scope.options.maxFileSize = scope.sizeLimit;
        scope.name = scope.passedParams.name;
        scope.ngModel = ngModel;
      },
      restrict: 'E',
      require: '?ngModel',
      templateUrl: 'templates/fileform.html',
      scope: {},
      controller: ['$scope', function ($scope) {
        $scope.loadingFiles = false;
        $scope.formScope = $scope.$parent;

        if (!$scope.formScope.newRecord) {
          var watchDeregister = $scope.formScope.$watch('phase', function (newVal) {
            if (newVal === 'ready') {
              var storedData = $scope.formScope.record[$scope.name];
              if (storedData) {
                for (var i = 0; i < storedData.length; i++) {
                  $scope.$$childHead.queue = $scope.$$childHead.queue || [];
                  var storedElement = storedData[i];
                  var storedName = storedElement.filename;
                  var queueElement = {
                    'name': storedName,
                    'size': storedElement.size,
                    'url': '/file/' + $scope.formScope.modelName + '/' + storedElement._id,
                    'deleteUrl': '/file/' + $scope.formScope.modelName + '/' + storedElement._id,
                    'deleteType': 'DELETE'
                  };
                  if (['.gif', '.png', '.jpg', '.svg'].indexOf(storedName.slice(storedName.length-4, storedName.length)) !== -1) {
                    queueElement.thumbnailUrl = '/file/' + $scope.formScope.modelName + '/thumbnail/' + storedElement._id;
                  } else {
                    queueElement.thumbnailUrl = 'https://upload.wikimedia.org/wikipedia/commons/7/77/Icon_New_File_256x256.png';
                  }
                  $scope.$$childHead.queue.push(queueElement);
                }
              }
              watchDeregister();
            }
          });
        }

        $scope.$on('fileuploaddone', function (event, data) {
          $scope.formScope.record[$scope.name] = $scope.formScope.record[$scope.name] || [];
          var fileDetails = data.result.files[0];
          $scope.formScope.record[$scope.name].push(
            {
              _id: getIdFromUrl(fileDetails.url),
              filename: fileDetails.name,
              size: fileDetails.size
            });
          $scope.ngModel.$setDirty();
        });
      }]
    };
  }])
    .controller('FileDestroyController', ['$scope', '$http', function ($scope, $http) {
      var file = $scope.file,
        state;

      $scope.uploadScope = $scope.$parent.$parent.$parent;
      $scope.formScope = $scope.uploadScope.$parent;
      $scope.name = $scope.uploadScope.passedParams.name;

      var removeFromRecord = function (file) {
        var id = getIdFromUrl(file.url);
        var array = $scope.formScope.record[$scope.name];
        for (var i = array.length - 1; i >= 0; i--) {
          if (array[i]._id === id) {
            array.splice(i, 1);
          }
        }
        $scope.clear(file);
        $scope.ngModel.$setDirty();
      };

      if (file.url) {
        file.$state = function () {
          return state;
        };
        file.$destroy = function () {
          $scope.$parent.$parent.mouseIn = false;
          state = 'pending';
          return $http({
            url: file.deleteUrl,
            method: file.deleteType
          }).then(
            function () {
              state = 'resolved';
              removeFromRecord(file);
            },
            function () {
              state = 'rejected';
              removeFromRecord(file);
            }
          );
        };
      } else if (!file.$cancel && !file._index) {
        file.$cancel = function () {
          removeFromRecord(file);
        };
      }
    }
    ]);
})();