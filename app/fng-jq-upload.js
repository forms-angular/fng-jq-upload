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
        .controller('FngJqUploadCtrl', ['$scope', function ($scope) {
            $scope.loadingFiles = false;
            $scope.formScope = $scope.$parent;

            $scope.dataField = function (initialise) {
                var retVal;
                if ($scope.info.name.indexOf('.') === -1) {
                    var record = $scope.formScope.record;
                    if (record) {
                        retVal = record[$scope.info.name];
                    }                    
                    if (!retVal && initialise) {
                        if (!record) {
                            throw new Error(`Cannot initialise record. ${$scope.info.name} - record is not defined`);
                        }
                        retVal = record[$scope.info.name] = [];
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
                        if (!retVal[index]) {
                            // when setUpAttachments() is called from $scope.$on('fngCancel'...), index can refer to an array
                            // element that was added, and then cancelled before ever being saved, and therefore no longer exists.
                            // in this case, there's nothing we can or should be doing, so should just...
                            return;
                        }
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
                        if (storedName && !$scope.options.defaultThumbnail) {
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
                        if (!$scope.$$childHead.queue) {
                            $scope.$$childHead.queue = []; // shouldn't happen, but have seen in Sentry
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
        .directive('fngJqUploadForm', ['PluginHelperService', '$rootScope', function (PluginHelperService, $rootScope) {
            return {
                link: function (scope, element, attrs, ngModel) {
                    angular.extend(scope, PluginHelperService.extractFromAttr(attrs, 'fngJqUploadForm'));
                    // Pick up options from the mongoose schema
                    scope.passedParams = scope.formScope[attrs.schema];
                    angular.extend(scope.options, scope.passedParams.fngJqUploadForm);
                    if (scope.options.additFields) {
                        scope.directiveOptions.additFields = JSON.parse(scope.options.additFields);
                    }
                    scope.directiveOptions.url = '/api/file/upload/' + scope.formScope.modelName;
                    scope.directiveOptions.sizeLimit = scope.directiveOptions.sizelimit;
                    scope.directiveOptions.autoUpload = scope.directiveOptions.autoupload;
                    scope.isDisabled = typeof $rootScope.isSecurelyDisabled === 'function' ? $rootScope.isSecurelyDisabled(scope.info.id) : false;
                    scope.name = scope.passedParams.name;
                    scope.ngModel = ngModel;
                },
                restrict: 'E',
                require: '?ngModel',
                templateUrl: 'templates/fileform.html',
                scope: {},
                controller: 'FngJqUploadCtrl'
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
