// TODO Check the filesize https://stackoverflow.com/questions/3717793/javascript-file-upload-size-validation
//  and suggest they resize if using an appropriate tool https://www.google.com/search?q=compress+photo+online+to+200kb
//  for example https://www.img2go.com/compress-image or https://www.imgonline.com.ua/eng/compress-image-size.php
//  or https://sqooush.app

(function () {
    'use strict';

    var app = angular.module('uploadModule', [
        'blueimp.fileupload'
    ]);

    var getIdFromUrl = function (url) {
        var breakdown = /\/file\/(.+?)\/([0-9a-f]{24})/.exec(url);
        return breakdown[2];
    };

    app
        .controller('FngUploadAdditFieldsCtrl', ['$scope', '$timeout', function ($scope, $timeout) {
            $scope.record = {};

            $scope.$watch('record', function (newVal, oldVal) {
                if (newVal !== oldVal) {
                    $scope.uploadForm.formScope[$scope.uploadForm.formScope.topLevelFormName].$setDirty();
                    angular.extend($scope.uploadForm.dataField()[$scope.file], newVal);
                }
            }, true);

            function setUpAdditFields() {
                if ($scope.schema) {
                    $scope.schema.forEach(function (field) {
                        var objVal = $scope.uploadForm.dataField()[$scope.file];
                        $scope.record[field.name] = objVal ? objVal[field.name] : undefined;
                    });
                }
            }

            function doSetUp() {
                if (!$scope.formScope.newRecord) {
                    var watchDeregister = $scope.formScope.$watch('phase', function (newVal) {
                        if (newVal === 'ready') {
                            setUpAdditFields();
                            $scope.$on('fngCancel', function () {
                                setUpAdditFields();
                            });
                            watchDeregister();
                        }
                    });
                } else {
                    $scope.record = {};
                    // setUpWatch();
                }
            }

            $timeout(doSetUp);

        }])
        .directive('fngUploadAdditFields', function () {
            return {
                link: function (scope, element, attrs) {
                    scope.uploadForm = scope.$parent.$parent.$parent;
                    scope.formScope = scope.uploadForm.formScope;
                    scope.schema = scope.uploadForm.directiveOptions.additFields;
                    scope.file = parseInt(attrs.file);
                },
                scope: {},
                controller: 'FngUploadAdditFieldsCtrl',
                template: '<form-input formstyle="inline" schema="schema" model="record" forceform="true"></form-input>'
            };
        })
        .controller('fngJqUploadCtrl', ['$scope', function ($scope) {
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

                    retVal = modelBase;
                    var rootParts = root.split('.');
                    for (var i = 0, l = rootParts.length; i < l; i++) {
                        retVal = retVal[rootParts[i]];
                    }

                    var index = $scope.options.index;
                    if (index === undefined) {
                        index = $scope.$parent.$index;  // Works for use case where file obj sits in an array
                    }
                    if (index !== undefined) {
                        if (!retVal[index][lastPart]) {
                            retVal[index][lastPart] = [];
                        }
                        retVal = retVal[index][lastPart];
                    } else {
                        if ($scope.options.subkey) {
                            var arrayIndex = $scope.formScope['$_arrayOffset_' + root.replace(/\./g, '_') + '_' + $scope.options.subkeyno];
                            if (arrayIndex != null && arrayIndex !== undefined && arrayIndex !== -1) {
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
                            'url': '/api/file/' + $scope.formScope.modelName + '/' + storedElement._id,
                            'deleteUrl': '/api/file/' + $scope.formScope.modelName + '/' + storedElement._id,
                            'deleteType': 'DELETE'
                        };
                        if (storedName) {
                            switch (storedName.slice(storedName.length - 4, storedName.length).toLowerCase()) {     // extension
                                case '.gif':
                                case '.png':
                                case '.jpg':
                                case 'jpeg':
                                    queueElement.thumbnailUrl = '/api/file/' + $scope.formScope.modelName + '/thumbnail/' + storedElement._id;
                                    break;
                                default:
                                    queueElement.thumbnailUrl = 'https://upload.wikimedia.org/wikipedia/commons/7/77/Icon_New_File_256x256.png';
                            }
                        } else {
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

        }])
        .directive('fngJqUploadForm', ['pluginHelper', function (pluginHelper) {
            return {
                link: function (scope, element, attrs, ngModel) {
                    angular.extend(scope, pluginHelper.extractFromAttr(attrs, 'fngJqUploadForm'));
                    // Pick up options from the mongoose schema
                    scope.passedParams = scope.formScope[attrs.schema];
                    angular.extend(scope.options, scope.passedParams.fngJqUploadForm);
                    if (scope.options.additFields) {
                        scope.directiveOptions.additFields = JSON.parse(scope.options.additFields);
                    }
                    scope.directiveOptions.url = '/api/file/upload/' + scope.formScope.modelName;
                    scope.directiveOptions.sizeLimit = scope.directiveOptions.sizelimit;
                    scope.directiveOptions.autoUpload = scope.directiveOptions.autoupload;
                    scope.name = scope.passedParams.name;
                    scope.ngModel = ngModel;
                },
                restrict: 'E',
                require: '?ngModel',
                templateUrl: 'templates/fileform.html',
                scope: {},
                controller: 'fngJqUploadCtrl'
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
                file.$destroy = function ($event) {
                    if (!$event || !$event.target.className.includes('ng-hide')) {
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
                    }
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
    "<div class=\"form-group control-group\" id=cg_f_{{info.name}} {{info.add}}><label for=f_{{info.name}} id={{info.name}}-label class=\"col-sm-3 control-label\">{{info.label || (info.name | titleCase)}}</label><div class=\"bs3-input col-sm-9 row-fluid\"><div class=\"col-xs-12 span12 fileupload-form\"><div class=fileupload method=POST enctype=multipart/form-data data-ng-app=demo data-file-upload=directiveOptions data-ng-class=\"{'fileupload-processing': processing() || loadingFiles}\"><div class=controls><div class=\"row fileupload-buttonbar\"><div class=\"col-md-7 span7\" style=\"min-height: 60px;\"><div data-ng-show=\"directiveOptions.single && queue.length === 0\" class=pull-left><span class=\"btn btn-success fileinput-button\" ng-class=\"{disabled: disabled}\"><i class=\"glyphicon glyphicon-plus icon icon-plus\"></i> <span>Upload {{info.label || (info.name | titleCase)}}</span> <input type=file name=files ng-disabled=disabled placeholder=\"Upload {{info.label || (info.name | titleCase)}}\"></span></div><div data-ng-show=directiveOptions.single class=pull-left><div class=preview ng-show=!!queue[0].thumbnailUrl><a data-ng-href={{queue[0].url}} title={{queue[0].name}} download={{queue[0].name}} target=_blank data-gallery ng-mouseover=\"mouseIn=1\" ng-mouseout=\"mouseIn=0\"><img data-ng-src={{queue[0].thumbnailUrl}} alt=\"\" width=\"{{ options.width || 80 }}\" height=\"{{ options.height || 60 }}\"></a></div></div><div data-ng-show=directiveOptions.single class=\"pull-left file-delete-div\"><button ng-show=mouseIn class=\"file-delete overlay-btn\" aria-label=Delete ng-mouseover=\"mouseIn=1\" data-ng-click=queue[0].$destroy($event)><i class=\"glyphicon glyphicon-trash icon icon-trash\"></i></button></div><span data-ng-hide=directiveOptions.single><span class=\"btn btn-success fileinput-button\" ng-class=\"{disabled: disabled}\"><i class=\"glyphicon glyphicon-plus icon icon-plus\"></i> <span>Add files...</span> <input type=file name=files multiple ng-disabled=disabled placeholder=\"Upload {{info.label || (info.name | titleCase)}}\"> </span></span><button type=button data-ng-hide=directiveOptions.autoupload class=\"btn btn-primary start\" data-ng-click=submit()><i class=\"glyphicon glyphicon-upload icon icon-upload\"></i> <span>Start upload</span></button> <button ng-show=active() type=button class=\"btn btn-warning cancel\" data-ng-click=cancel()><i class=\"glyphicon glyphicon-ban icon-circle icon-ban-circle\"></i> <span>Cancel upload</span></button> <span class=fileupload-process></span></div><div class=\"col-md-5 span5 fade\" data-ng-class=\"{in: active()}\"><div class=\"progress progress-striped active\" data-file-upload-progress=progress()><div class=\"progress-bar progress-bar-success\" data-ng-style=\"{width: num + '%'}\"></div></div><div class=progress-extended>&nbsp;</div></div></div><table data-ng-hide=directiveOptions.single class=\"table table-striped files ng-cloak\"><tr data-ng-repeat=\"file in queue\"><td data-ng-switch data-on=!!file.thumbnailUrl><div class=preview data-ng-switch-when=true><a data-ng-href={{file.url}} title={{file.name}} download={{file.name}} target=_blank data-gallery><img data-ng-src={{file.thumbnailUrl}} alt=\"\" width=80 height=60></a></div><div class=preview data-ng-switch-default data-file-upload-preview=file></div></td><td><p class=name data-ng-switch data-on=!!file.url><span data-ng-switch-when=true data-ng-switch data-on=!!file.thumbnailUrl><a data-ng-switch-when=true data-ng-href={{file.url}} title={{file.name}} download={{file.name}} target=_blank data-gallery>{{file.name}}</a> <a data-ng-switch-default data-ng-href={{file.url}} title={{file.name}} download={{file.name}}>{{file.name}}</a> </span><span data-ng-switch-default>{{file.name}}</span></p><strong data-ng-show=file.error class=\"error text-danger\">{{file.error}}</strong></td><td><p class=size>{{file.size | formatFileSize}}</p><div class=\"progress progress-striped active fade\" data-ng-class=\"{pending: 'in'}[file.$state()]\" data-file-upload-progress=file.$progress()><div class=\"progress-bar progress-bar-success\" data-ng-style=\"{width: num + '%'}\"></div></div></td><td ng-show=directiveOptions.additFields><fng-upload-addit-fields file={{$index}}></fng-upload-addit-fields></td><td><button type=button class=\"btn btn-primary start\" data-ng-click=file.$submit() data-ng-hide=\"!file.$submit || directiveOptions.autoupload\" data-ng-disabled=\"file.$state() == 'pending' || file.$state() == 'rejected'\"><i class=\"glyphicon glyphicon-upload icon icon-upload\"></i> <span>Start</span></button> <button type=button class=\"btn btn-warning cancel\" data-ng-click=file.$cancel() data-ng-hide=!file.$cancel><i class=\"glyphicon glyphicon-ban-circle icon icon-ban-circle\"></i> <span>Cancel</span></button> <button type=button class=\"btn btn-danger destroy\" data-ng-click=file.$destroy() data-ng-hide=!file.$destroy data-ng-controller=FileDestroyController><i class=\"glyphicon glyphicon-trash icon icon-trash\"></i> <span>Delete</span></button></td></tr></table></div></div></div></div></div>"
  );

}]);
