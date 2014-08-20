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
angular.module('uploadModule').run(['$templateCache', function($templateCache) {
  'use strict';

  $templateCache.put('templates/fileform.html',
    "<div class=form-group id=cg_f_{{passedParams.name}}><label for=f_{{passedParams.name}} class=col-sm-2>{{passedParams.name | titleCase}}</label><div class=col-sm-10><div class=col-xs-12><div class=fileupload method=POST enctype=multipart/form-data data-ng-app=demo data-file-upload=options data-ng-class=\"{'fileupload-processing': processing() || loadingFiles}\"><div class=\"row fileupload-buttonbar\"><div class=col-lg-7><span class=\"btn btn-success fileinput-button\" ng-class=\"{disabled: disabled}\"><i class=\"glyphicon glyphicon-plus\"></i> <span>Add files...</span> <input type=file name=files multiple ng-disabled=disabled></span> <button type=button class=\"btn btn-primary start\" data-ng-click=submit()><i class=\"glyphicon glyphicon-upload\"></i> <span>Start upload</span></button> <button type=button class=\"btn btn-warning cancel\" data-ng-click=cancel()><i class=\"glyphicon glyphicon-ban-circle\"></i> <span>Cancel upload</span></button>  <span class=fileupload-process></span></div><div class=\"col-lg-5 fade\" data-ng-class=\"{in: active()}\"><div class=\"progress progress-striped active\" data-file-upload-progress=progress()><div class=\"progress-bar progress-bar-success\" data-ng-style=\"{width: num + '%'}\"></div></div><div class=progress-extended>&nbsp;</div></div></div><table class=\"table table-striped files ng-cloak\"><tr data-ng-repeat=\"file in queue\"><td data-ng-switch data-on=!!file.thumbnailUrl><div class=preview data-ng-switch-when=true><a data-ng-href={{file.url}} title={{file.name}} download={{file.name}} target=_blank data-gallery><img data-ng-src={{file.thumbnailUrl}} alt=\"\" width=80 height=60></a></div><div class=preview data-ng-switch-default data-file-upload-preview=file></div></td><td><p class=name data-ng-switch data-on=!!file.url><span data-ng-switch-when=true data-ng-switch data-on=!!file.thumbnailUrl><a data-ng-switch-when=true data-ng-href={{file.url}} title={{file.name}} download={{file.name}} target=_blank data-gallery>{{file.name}}</a> <a data-ng-switch-default data-ng-href={{file.url}} title={{file.name}} download={{file.name}}>{{file.name}}</a></span> <span data-ng-switch-default>{{file.name}}</span></p><strong data-ng-show=file.error class=\"error text-danger\">{{file.error}}</strong></td><td><p class=size>{{file.size | formatFileSize}}</p><div class=\"progress progress-striped active fade\" data-ng-class=\"{pending: 'in'}[file.$state()]\" data-file-upload-progress=file.$progress()><div class=\"progress-bar progress-bar-success\" data-ng-style=\"{width: num + '%'}\"></div></div></td><td><button type=button class=\"btn btn-primary start\" data-ng-click=file.$submit() data-ng-hide=\"!file.$submit || options.autoUpload\" data-ng-disabled=\"file.$state() == 'pending' || file.$state() == 'rejected'\"><i class=\"glyphicon glyphicon-upload\"></i> <span>Start</span></button> <button type=button class=\"btn btn-warning cancel\" data-ng-click=file.$cancel() data-ng-hide=!file.$cancel><i class=\"glyphicon glyphicon-ban-circle\"></i> <span>Cancel</span></button> <button type=button class=\"btn btn-danger destroy\" data-ng-click=file.$destroy() data-ng-hide=!file.$destroy data-ng-controller=FileDestroyController><i class=\"glyphicon glyphicon-trash\"></i> <span>Delete</span></button></td></tr></table></div></div></div></div><div id=blueimp-gallery class=\"blueimp-gallery blueimp-gallery-controls\" data-filter=:even><div class=slides></div><h3 class=title></h3><a class=prev>‹</a> <a class=next>›</a> <a class=close>×</a> <a class=play-pause></a><ol class=indicator></ol></div>"
  );

}]);
