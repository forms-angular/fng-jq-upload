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
      controller: ['$scope','$element', 'fileUpload',function ($scope, $element, fileUpload) {
        $scope.loadingFiles = false;
        $scope.formScope = $scope.$parent;

        if (!$scope.formScope.newRecord) {
          var watchDeregister = $scope.formScope.$watch('phase', function(newVal) {
            if (newVal === 'ready') {
              var storedData = $scope.formScope.record[$scope.name];
              if (storedData) {
                for (var i = 0; i < storedData.length; i++) {
                  $scope.$$childHead.queue = $scope.$$childHead.queue || [];
                  $scope.$$childHead.queue.push({
                    "name": storedData[i].filename,
                    "size": storedData[i].size,
                    "url": "/file/" + $scope.formScope.modelName + "/" + storedData[i]._id,
                    "thumbnailUrl": "/file/" + $scope.formScope.modelName + "/" + storedData[i]._id,
                    "deleteUrl": "/file/" + $scope.formScope.modelName + "/" + storedData[i]._id,
                    "deleteType": "DELETE"
                  });
                }
              }
              watchDeregister();
            }
          });
        }

        $scope.$on('fileuploaddone', function(event, data) {
          $scope.formScope.record[$scope.name] = $scope.formScope.record[$scope.name] || [];
          var fileDetails = data.result.files[0];
          $scope.formScope.record[$scope.name].push(
            {
              _id:      getIdFromUrl(fileDetails.url),
              filename: fileDetails.name,
              size:     fileDetails.size
            });
        });
      }]
    };
  }])
    .controller('FileDestroyController', ['$scope', '$http', 'fileUpload', function ($scope, $http, fileUpload) {
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
      };

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
angular.module('uploadModule').run(['$templateCache', function($templateCache) {
  'use strict';

  $templateCache.put('templates/fileform.html',
    "<div class=\"form-group control-group\" id=cg_f_{{passedParams.name}}><label for=f_{{passedParams.name}} class=\"col-sm-3 control-label\">{{passedParams.name | titleCase}}</label><div class=\"bs3-input col-sm-9 row-fluid\"><div class=\"col-xs-12 span12 fileupload-form\"><div class=fileupload method=POST enctype=multipart/form-data data-ng-app=demo data-file-upload=options data-ng-class=\"{'fileupload-processing': processing() || loadingFiles}\"><div class=controls><div class=\"row fileupload-buttonbar\"><div class=\"col-md-7 span7\"><span class=\"btn btn-success fileinput-button\" ng-class=\"{disabled: disabled}\"><i class=\"glyphicon glyphicon-plus\"></i> <span>Add files...</span> <input type=file name=files multiple ng-disabled=disabled></span> <button type=button class=\"btn btn-primary start\" data-ng-click=submit()><i class=\"glyphicon glyphicon-upload\"></i> <span>Start upload</span></button> <button type=button class=\"btn btn-warning cancel\" data-ng-click=cancel()><i class=\"glyphicon glyphicon-ban-circle\"></i> <span>Cancel upload</span></button>  <span class=fileupload-process></span></div><div class=\"col-md-5 span5 fade\" data-ng-class=\"{in: active()}\"><div class=\"progress progress-striped active\" data-file-upload-progress=progress()><div class=\"progress-bar progress-bar-success\" data-ng-style=\"{width: num + '%'}\"></div></div><div class=progress-extended>&nbsp;</div></div></div><table class=\"table table-striped files ng-cloak\"><tr data-ng-repeat=\"file in queue\"><td data-ng-switch data-on=!!file.thumbnailUrl><div class=preview data-ng-switch-when=true><a data-ng-href={{file.url}} title={{file.name}} download={{file.name}} target=_blank data-gallery><img data-ng-src={{file.thumbnailUrl}} alt=\"\" width=80 height=60></a></div><div class=preview data-ng-switch-default data-file-upload-preview=file></div></td><td><p class=name data-ng-switch data-on=!!file.url><span data-ng-switch-when=true data-ng-switch data-on=!!file.thumbnailUrl><a data-ng-switch-when=true data-ng-href={{file.url}} title={{file.name}} download={{file.name}} target=_blank data-gallery>{{file.name}}</a> <a data-ng-switch-default data-ng-href={{file.url}} title={{file.name}} download={{file.name}}>{{file.name}}</a></span> <span data-ng-switch-default>{{file.name}}</span></p><strong data-ng-show=file.error class=\"error text-danger\">{{file.error}}</strong></td><td><p class=size>{{file.size | formatFileSize}}</p><div class=\"progress progress-striped active fade\" data-ng-class=\"{pending: 'in'}[file.$state()]\" data-file-upload-progress=file.$progress()><div class=\"progress-bar progress-bar-success\" data-ng-style=\"{width: num + '%'}\"></div></div></td><td><button type=button class=\"btn btn-primary start\" data-ng-click=file.$submit() data-ng-hide=\"!file.$submit || options.autoUpload\" data-ng-disabled=\"file.$state() == 'pending' || file.$state() == 'rejected'\"><i class=\"glyphicon glyphicon-upload\"></i> <span>Start</span></button> <button type=button class=\"btn btn-warning cancel\" data-ng-click=file.$cancel() data-ng-hide=!file.$cancel><i class=\"glyphicon glyphicon-ban-circle\"></i> <span>Cancel</span></button> <button type=button class=\"btn btn-danger destroy\" data-ng-click=file.$destroy() data-ng-hide=!file.$destroy data-ng-controller=FileDestroyController><i class=\"glyphicon glyphicon-trash\"></i> <span>Delete</span></button></td></tr></table></div></div></div></div></div><div id=blueimp-gallery class=\"blueimp-gallery blueimp-gallery-controls\" data-filter=:even><div class=slides></div><h3 class=title></h3><a class=prev>‹</a> <a class=next>›</a> <a class=close>×</a> <a class=play-pause></a><ol class=indicator></ol></div>"
  );

}]);
