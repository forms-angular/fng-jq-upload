(function () {
  'use strict';
  var app = angular.module('uploadModule', [
    'blueimp.fileupload'
  ]);

  var getIdFromUrl = function (url) {
    var breakdown = /\/file\/(.+?)\/([0-9a-f]{24})/.exec(url);
    return breakdown[2];
  };

  app.directive('fngJqUploadForm', ['pluginHelper', function (pluginHelper) {
    return {
      link: function (scope, element, attrs, ngModel) {
        angular.extend(scope, pluginHelper.extractFromAttr(attrs, 'fngJqUploadForm'));
        //scope.options = {};
        // Pick up options from the mongoose schema
        scope.formScope = scope.$parent;
        scope.passedParams = scope.formScope[attrs.schema];
        angular.extend(scope.options, scope.passedParams.fngJqUploadForm);

        scope.directiveOptions.url = '/file/upload/' + scope.formScope.modelName;
        scope.directiveOptions.sizeLimit = scope.directiveOptions.sizelimit;
        scope.directiveOptions.autoUpload = scope.directiveOptions.autoupload;
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

        $scope.dataField = function (initialise) {
          var retVal;
          if ($scope.info.name.indexOf('.') === -1) {
            retVal = $scope.formScope.record[$scope.info.name];
            if (!retVal && initialise) {
              retVal = $scope.formScope.record[$scope.info.name] = [];
            }
          } else if ($scope.options.subschema) {
            var modelBase = $scope.formScope.record;
            var compoundName = $scope.info.name;
            var root = $scope.options.subschemaroot;
            var lastPart = compoundName.slice(root.length + 1);

            if ($scope.options.index) {
              retVal = modelBase[root][$scope.options.index][lastPart];
            } else {
              retVal = modelBase;
              var rootParts = root.split('.');
              for (var i = 0, l = rootParts.length; i < l; i++) {
                retVal = retVal[rootParts[i]];
              }
              if ($scope.options.subkey) {
                var arrayIndex = $scope.formScope['$_arrayOffset_' + root.replace(/\./g, '_') + '_' + $scope.options.subkeyno];
                if (arrayIndex && arrayIndex !== -1) {
                  retVal = retVal[arrayIndex][lastPart];
                } else {
                  retVal = undefined;
                }
              } else {
                console.log('No support for this yet');
                //modelString += '[$index].' + lastPart;
                //idString = null;
                //nameString = compoundName.replace(/\./g, '-');
              }
            }
          } else {
            console.log('No support for this yet either');
          }
          return retVal;
        };

        function setUpAttachments() {
          var storedData = $scope.dataField();
          if (storedData) {
            for (var i = 0; i < storedData.length; i++) {
              var storedElement = storedData[i];
              var storedName = storedElement.filename;
              var queueElement = {
                'name': storedName,
                'size': storedElement.size,
                'url': '/file/' + $scope.formScope.modelName + '/' + storedElement._id,
                'deleteUrl': '/file/' + $scope.formScope.modelName + '/' + storedElement._id,
                'deleteType': 'DELETE'
              };
              switch (storedName.slice(storedName.length - 4, storedName.length)) {     // extension
                case '.gif':
                case '.png':
                case '.jpg':
                  queueElement.thumbnailUrl = '/file/' + $scope.formScope.modelName + '/thumbnail/' + storedElement._id;
                  break;
                default:
                  queueElement.thumbnailUrl = 'https://upload.wikimedia.org/wikipedia/commons/7/77/Icon_New_File_256x256.png';
              }
              $scope.$$childHead.queue.push(queueElement);
            }
          }
        }

        if (!$scope.formScope.newRecord) {
          var watchDeregister = $scope.formScope.$watch('phase', function (newVal) {
            if (newVal === 'ready') {
              $scope.$$childHead.queue = $scope.$$childHead.queue || [];
              setUpAttachments();
              $scope.$on('fngCancel', function () {
                $scope.$$childHead.queue = [];
                setUpAttachments();
              });

              watchDeregister();
            }
          });
        }

        $scope.$on('fileuploaddone', function (event, data) {
          var field = $scope.dataField(true);
          var fileDetails = data.result.files[0];
          field.push(
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

      var removeFromRecord = function (file) {
        var id = getIdFromUrl(file.url);
        var array = $scope.uploadScope.dataField();
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