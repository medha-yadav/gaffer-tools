describe("The Graph Component", function() {

    var graph;
    var events;
    var scope;
    var vertices = [];
    var gafferSchema = {};
    var $componentController;

    var $q;

    var selectedElementsModel = {
        edges: {},
        entities: {}
    }

    var $httpBackend;
    var ctrl;

    beforeEach(module('app'));

    beforeEach(module(function($provide) {
        $provide.factory('schema', function($q) {
            return {
                get: function() {
                    return $q.when(gafferSchema);
                },
                getSchemaVertices: function() {
                    return vertices;
                },
                getVertexTypeFromEntityGroup: function() {
                    return 'vertex';
                },
                getVertexTypesFromEdgeGroup: function() {
                    return { 'source': 'vertex', 'destination': 'vertex' };
                }
            }
        });
    }));

    
    beforeEach(inject(function(_graph_, _events_, _$rootScope_, _$componentController_, _$q_, _$httpBackend_) {
        graph = _graph_;
        events = _events_;
        scope = _$rootScope_.$new();
        $componentController = _$componentController_;
        $q = _$q_;
        $httpBackend = _$httpBackend_;
    }));
    
    beforeEach(function() {
        $httpBackend.whenGET('config/defaultConfig.json').respond(200, {})
    });

    beforeEach(function() {
        ctrl = $componentController('graph', {$scope: scope}, {selectedElements: selectedElementsModel});
    });

    describe('ctrl.$onInit()', function() {
        var config;
        var graphConf;

        var configArgs;

        beforeEach(inject(function(_config_) {
            config = _config_;
        }));

        beforeEach(function() {
            spyOn(graph, 'getGraphConfiguration').and.callFake(function() {
                return graphConf;
            });

            spyOn(graph, 'setGraphConfiguration').and.callFake(function(args) {
                configArgs = angular.copy(args);
            });
        });

        beforeEach(function() {
            graphConf = null;
        });

        beforeEach(function() {
            jasmine.clock().install();
        });

        afterEach(function() {
            jasmine.clock().uninstall();
        });

        it('should throw an error if no selected elements model is injected', function() {
            ctrl = $componentController('graph', {$scope: scope}); // No model injected

            expect(ctrl.$onInit).toThrow('Graph view must have selected elements injected into it');
        });

        it('should not make a call to the config if configuration is stored in the graph service', function() {
            graphConf = {};

            spyOn(config, 'get').and.returnValue($q.when({}));
            ctrl.$onInit();

            expect(config.get).not.toHaveBeenCalled();
        });

        it('should make a call to the config if the configuration in the graph service is null', function() {
            spyOn(config, 'get').and.returnValue($q.when({}));

            ctrl.$onInit();

            expect(config.get).toHaveBeenCalled();
        });

        it('should cache the configuration in the graph service', function() {
            spyOn(config, 'get').and.returnValue($q.when({}));

            ctrl.$onInit();
            scope.$digest();

            expect(graph.setGraphConfiguration).toHaveBeenCalled();
        })

        it('should merge the configured graph physics with the default graph physics', function() {
            $httpBackend.whenGET('config/config.json').respond(200, { graph: { physics: { dragCoeff: 0.00000009 }}});

            ctrl.$onInit();
            $httpBackend.flush();

            var mergedPhysics = {
                "springLength": 30,
                "springCoeff": 0.000001,
                "gravity": -4,
                "dragCoeff": 0.00000009,
                "stableThreshold": 0.000001,
                "fit": true
            }

            expect(configArgs.physics).toEqual(mergedPhysics)
        });

        it('should merge the configured style with the component\'s default', function() {
            $httpBackend.whenGET('config/config.json').respond(200, { graph: { defaultStyle: { entityWrapper: { height: 500 }}, style: {
                edges: {
                    "myEdgeType": {
                        "line-color": "blue"
                    }
                }
            }}});

            ctrl.$onInit();
            $httpBackend.flush();

            var style = {
                edges: {
                    "myEdgeType": {
                        "line-color": "blue"
                    }
                }
            };

            var mergedDefaultStyle = {
                edges: {
                    'curve-style': 'bezier',
                    'min-zoomed-font-size': 35,
                    'text-outline-color': '#538212',
                    'text-outline-width': 3,
                    'line-color': '#538212',
                    'target-arrow-color': '#538212',
                    'target-arrow-shape': 'triangle',
                    'font-size': 14,
                    'color': '#FFFFFF',
                    'width': 5
                },
                vertices: {
                    'height': 30,
                    'width': 30,
                    'min-zoomed-font-size': 20,
                    'font-size': 14,
                    'text-valign': 'center',
                    'color': '#333333',
                    'text-outline-color': '#FFFFFF',
                    'background-color': '#FFFFFF',
                    'text-outline-width': 3
                },
                entityWrapper: {
                    'height': 500,
                    'width': 60,
                    'border-width': 2,
                    "border-color": "#55555"
                }
            }

            expect(configArgs.style).toEqual(style);
            expect(configArgs.defaultStyle).toEqual(mergedDefaultStyle);
        });

        it('should just use the default if no graph configuration is specified', function() {
            $httpBackend.whenGET('config/config.json').respond(200, {});

            var defaultConfiguration = {
                name: 'cytoscape-ngraph.forcelayout',
                async: {
                    maxIterations: 1000,
                    stepsPerCycle: 50,
                    waitForStep: true
                },
                physics: {
                     "springLength": 30,
                     "springCoeff": 0.000001,
                     "gravity": -4,
                     "dragCoeff": 0.005,
                     "stableThreshold": 0.000001,
                     "fit": true
                },
                iterations: 10000,
                fit: true,
                animate: false,
                defaultStyle: {
                    edges: {
                        'curve-style': 'bezier',
                        'min-zoomed-font-size': 35,
                        'text-outline-color': '#538212',
                        'text-outline-width': 3,
                        'line-color': '#538212',
                        'target-arrow-color': '#538212',
                        'target-arrow-shape': 'triangle',
                        'font-size': 14,
                        'color': '#FFFFFF',
                        'width': 5
                    },
                    vertices: {
                        'height': 30,
                        'width': 30,
                        'min-zoomed-font-size': 20,
                        'font-size': 14,
                        'text-valign': 'center',
                        'color': '#333333',
                        'text-outline-color': '#FFFFFF',
                        'background-color': '#FFFFFF',
                        'text-outline-width': 3
                    },
                    entityWrapper: {
                        'height': 60,
                        'width': 60,
                        'border-width': 2,
                        "border-color": "#55555"
                    }
                }
            }; // copied from graph component

            ctrl.$onInit();
            $httpBackend.flush();
            expect(configArgs).toEqual(defaultConfiguration)

        });

        it('should load cytoscape', function() {
            spyOn(window, 'cytoscape').and.callThrough();
            $httpBackend.whenGET('config/config.json').respond(200, {});
            ctrl.$onInit();

            $httpBackend.flush();

            expect(window.cytoscape).toHaveBeenCalled();
        });

        it('should load the graph from the results', function() {
            spyOn(ctrl, 'update').and.stub();

            spyOn(window, 'cytoscape').and.callFake(function(obj) {
                
                setTimeout(function() {
                    obj.ready();
                }, 100)
                return {
                    on: function(evt, cb) {},
                    elements: function() { return [] }
                }
            });
            
            $httpBackend.whenGET('config/config.json').respond(200, {});
            ctrl.$onInit();

            $httpBackend.flush();

            jasmine.clock().tick(101);

            scope.$digest();

            expect(ctrl.update).toHaveBeenCalled();
        })

        it('should run the filter once loaded if the service holds a filter', function() {
            spyOn(ctrl, 'filter').and.stub();
            spyOn(ctrl, 'update').and.stub();
            spyOn(graph, 'getSearchTerm').and.returnValue('test');
            
            spyOn(window, 'cytoscape').and.callFake(function(obj) {
                
                setTimeout(function() {
                    obj.ready();
                }, 100)
                return {
                    on: function(evt, cb) {},
                    elements: function() { return []; }
                }
            });
            
            $httpBackend.whenGET('config/config.json').respond(200, {});
            ctrl.$onInit();

            $httpBackend.flush();

            jasmine.clock().tick(101);

            scope.$digest();

            expect(ctrl.filter).toHaveBeenCalled();
        });

        it('should not run the filter function if the searchTerm is undefined', function() {
            spyOn(ctrl, 'filter').and.stub();
            spyOn(ctrl, 'update').and.stub();
            spyOn(graph, 'getSearchTerm').and.returnValue(undefined);
            
            spyOn(window, 'cytoscape').and.callFake(function(obj) {
                
                setTimeout(function() {
                    obj.ready();
                }, 100)
                return {
                    on: function(evt, cb) {},
                    elements: function() { return []; }
                }
            });
            
            $httpBackend.whenGET('config/config.json').respond(200, {});
            ctrl.$onInit();

            $httpBackend.flush();

            jasmine.clock().tick(101);

            scope.$digest();

            expect(ctrl.filter).not.toHaveBeenCalled();
        });

        it('should not run the filter function if the searchTerm is an empty string', function() {
            spyOn(ctrl, 'filter').and.stub();
            spyOn(ctrl, 'update').and.stub();
            spyOn(graph, 'getSearchTerm').and.returnValue("");
            
            spyOn(window, 'cytoscape').and.callFake(function(obj) {
                
                setTimeout(function() {
                    obj.ready();
                }, 100)
                return {
                    on: function(evt, cb) {},
                    elements: function() { return []; }
                }
            });
            
            $httpBackend.whenGET('config/config.json').respond(200, {});
            ctrl.$onInit();

            $httpBackend.flush();

            jasmine.clock().tick(101);

            scope.$digest();

            expect(ctrl.filter).not.toHaveBeenCalled();
        });

        it('should not run the filter function if the searchTerm is null', function() {
            spyOn(ctrl, 'filter').and.stub();
            spyOn(ctrl, 'update').and.stub();
            spyOn(graph, 'getSearchTerm').and.returnValue(null);
            
            spyOn(window, 'cytoscape').and.callFake(function(obj) {
                
                setTimeout(function() {
                    obj.ready();
                }, 100)
                return {
                    on: function(evt, cb) {},
                    elements: function() { return []; }
                }
            });
            
            $httpBackend.whenGET('config/config.json').respond(200, {});
            ctrl.$onInit();

            $httpBackend.flush();

            jasmine.clock().tick(101);

            scope.$digest();

            expect(ctrl.filter).not.toHaveBeenCalled();
        });

        it('should subscribe to the "incomingResults" event', function() {
            spyOn(events, 'subscribe');
            ctrl.$onInit();

            expect(events.subscribe).toHaveBeenCalledWith("incomingResults", jasmine.any(Function));
        });

        it('should subscribe to the "resultsCleared" event', function() {
            spyOn(events, 'subscribe');
            ctrl.$onInit();

            expect(events.subscribe).toHaveBeenCalledWith("resultsCleared", jasmine.any(Function));
        });
    });

    describe('ctrl.$onDestroy()', function() {
        it('should unsubscribe from the "incomingResults" event', function() {
            spyOn(events, 'unsubscribe');
            ctrl.$onDestroy();

            expect(events.unsubscribe).toHaveBeenCalledWith("incomingResults", jasmine.any(Function));
        })

        it('should unsubscribe from the "resultsCleared" event', function() {
            spyOn(events, 'unsubscribe');
            ctrl.$onDestroy();

            expect(events.unsubscribe).toHaveBeenCalledWith("incomingResults", jasmine.any(Function));
        });

        it('should destroy the cytoscape graph cleanly', function() {
            spyOn(ctrl, 'update').and.stub();

            var destroySpy = jasmine.createSpy('destroySpy');

            jasmine.clock().install();
            spyOn(window, 'cytoscape').and.callFake(function(obj) {
                setTimeout(function() {
                    obj.ready();
                }, 100)
                return {
                    on: function(evt, cb) {},
                    elements: function() { return [] },
                    destroy: destroySpy
                }
            });
            
            $httpBackend.whenGET('config/config.json').respond(200, {});
            ctrl.$onInit();
            $httpBackend.flush();
            jasmine.clock().tick(101);
            scope.$digest();

            ctrl.$onDestroy();

            expect(destroySpy).toHaveBeenCalled();

            jasmine.clock().uninstall();
        });
    });

    describe('ctrl.quickHop()', function() {

        var settings, query, error;

        var event;

        beforeEach(inject(function(_settings_, _query_, _error_) {
            settings = _settings_;
            query = _query_;
            error = _error_;
        }));

        beforeEach(function() {
            spyOn(query, 'executeQuery');
        });

        beforeEach(function() {
            event = {
                cyTarget: {
                    id: function() {
                        return "\"vertex1\""
                    }
                }
            };
        })

        it('should broadcast an error if no event is supplied or selected elements created', function() {
            spyOn(error, 'handle').and.stub();

            ctrl.quickHop();

            expect(error.handle).toHaveBeenCalled();
        });

        it('should add the query to the list of queries', function() {
            spyOn(query, 'addOperation').and.stub();
            ctrl.quickHop(event);
            expect(query.addOperation).toHaveBeenCalled();
        });

        it('should use an event to generate the input for the Get Elements query', function() {
            ctrl.quickHop(event);
            expect(query.executeQuery.calls.argsFor(0)[0].operations[0].input[0].vertex).toEqual("vertex1");
        });
        
        
        it('should limit the query using the default result limit', function() {
            ctrl.quickHop(event);
            expect(query.executeQuery.calls.argsFor(0)[0].operations[1].class).toEqual("uk.gov.gchq.gaffer.operation.impl.Limit");
        });

        it('should deduplicate the results', function() {
            ctrl.quickHop(event);
            expect(query.executeQuery.calls.argsFor(0)[0].operations[2].class).toEqual("uk.gov.gchq.gaffer.operation.impl.output.ToSet");
        });

        it('should add operation options to the operations', function() {
            spyOn(settings, 'getDefaultOpOptions').and.returnValue({'foo': 'bar'})

            ctrl.quickHop(event);
            var operations = query.executeQuery.calls.argsFor(0)[0].operations;

            for (var i in operations) {
                expect(operations[i].options).toEqual({'foo': 'bar'});
            }
        });

        it('should use the selected elements if not event is supplied', function() {
            ctrl.selectedElements.entities = {
                '"id1"': [ {}, {}],
                '"id2"': [ {} ]
            }

            ctrl.quickHop();

            var input = query.executeQuery.calls.argsFor(0)[0].operations[0].input;

            expect(input).toEqual([{
                    class: "uk.gov.gchq.gaffer.operation.data.EntitySeed",
                    vertex: "id1"
                },
                {
                    class: "uk.gov.gchq.gaffer.operation.data.EntitySeed",
                    vertex: "id2"
                }
            ]);
        });
    });

    describe('ctrl.removeSelected()', function() {
        var removeSpy = jasmine.createSpy('removeSpy');
        var unselectSpy = jasmine.createSpy('unselectSpy');

        beforeEach(function() {
            jasmine.clock().install();
        });

        beforeEach(function() {
            spyOn(window, 'cytoscape').and.callFake(function(obj) {
                setTimeout(function() {
                    obj.ready();
                }, 100)
                return {
                    on: function(evt, cb) {},
                    filter: function() {
                        return {
                            remove: removeSpy
                        }
                    },
                    elements: function() { return {
                            unselect: unselectSpy
                        } 
                    }
                }
            });
        });

        beforeEach(function() {
            spyOn(ctrl, 'update').and.stub();
            $httpBackend.whenGET('config/config.json').respond(200, {});
            ctrl.$onInit();
            $httpBackend.flush();
            jasmine.clock().tick(101);
            scope.$digest();
        });

        afterEach(function() {
            jasmine.clock().uninstall()
        });

        it('should remove the selected elements', function() {
            ctrl.removeSelected();
            expect(removeSpy).toHaveBeenCalled();
        });

        it('should unselect all the elements', function() {
            ctrl.removeSelected();
            expect(unselectSpy).toHaveBeenCalled();
        });

        it('should reset the selected elements', function() {
            ctrl.selectedElements = {
                entities: {
                    'a': [ {} ]
                },
                edges: {
                    'a|b|true|eg': [ {} ]
                }
            };

            ctrl.removeSelected();

            expect(ctrl.selectedElements).toEqual({
                entities: {},
                edges: {}
            });
        });
    });

    describe('ctrl.update()', function() {
        var injectableCytoscape;
        var elements;
        
        beforeEach(function() {
            injectableCytoscape = cytoscape({})
        });

        beforeEach(function() {
            jasmine.clock().install();
        });

        beforeEach(function() {
            spyOn(window, 'cytoscape').and.callFake(function(obj) {
                setTimeout(function() {
                    obj.ready();
                }, 100)
                return injectableCytoscape
            });
        });

        beforeEach(function() {
            $httpBackend.whenGET('config/config.json').respond(200, {});
            ctrl.$onInit();
            $httpBackend.flush();
            jasmine.clock().tick(101);
            scope.$digest();
        });

        beforeEach(function() {
            elements = {
                entities: [
                    {
                        class: 'Entity',
                        vertex: 'foo',
                        group: 'fooEntity',
                        properties: {}
                    }
                ],
                edges: [
                    {
                        class: 'Edge',
                        source: 'foo',
                        directed: true,
                        destination: 'bar',
                        group: 'foobarEdge',
                        properties: {
                            count: 42
                        }
                    }
                ]
            }
        })

        afterEach(function() {
            jasmine.clock().uninstall();
        });

        it('should add elements from the results to the graph', function() {
            ctrl.update(elements);
            expect(injectableCytoscape.elements().size()).toEqual(3);
        });

        it('should use quoted strings as vertex ids for string seeds', function() {
            ctrl.update(elements);
            var ids = [];
            var nodes = injectableCytoscape.nodes();

            nodes.forEach(function(node) {
                ids.push(node.id())
            });

            expect(ids).toContain('"foo"');
            expect(ids).toContain('"bar"');
        });

        it('should use stringified numbers as ids for numerical seeds', function() {
            elements.entities[0].vertex = 1;
            elements.edges[0].source = 1;
            elements.edges[0].destination = 2;

            ctrl.update(elements);
            var ids = [];
            var nodes = injectableCytoscape.nodes();

            nodes.forEach(function(node) {
                ids.push(node.id())
            });

            expect(ids).toContain('1');
            expect(ids).toContain('2');
        });

        it('should use the stringified vertex for object seeds', inject(function(_types_) {

            var types = _types_;

            spyOn(types, 'getShortValue').and.callFake(function(val) {
                var value = val[Object.keys(val)[0]];
                return Object.values(value).join('|');
            });

            elements.entities[0].vertex = {
                complexObject: {
                    type: 't1',
                    value: 'v1'
                }
            };
            elements.edges[0].source = {
                complexObject: {
                    type: 't1',
                    value: 'v1'
                }
            };
            elements.edges[0].destination = {
                complexObject: {
                    type: 't2',
                    value: 'v2'
                }
            };

            ctrl.update(elements);
            var ids = [];
            var nodes = injectableCytoscape.nodes();

            nodes.forEach(function(node) {
                ids.push(node.id())
            });

            expect(ids).toContain(JSON.stringify(elements.entities[0].vertex));
            expect(ids).toContain(JSON.stringify(elements.edges[0].destination));
        }));

        it('should use a combination of source, destination, directed and group for edge ids', function() {
            ctrl.update(elements);
            var edges = injectableCytoscape.edges();

            expect(edges.size()).toEqual(1);

            edges.forEach(function(edge) {
                expect(edge.id()).toEqual('"foo"|"bar"|true|foobarEdge')
            });
        });
    })

    describe('ctrl.reset()', function() {
        var injectableCytoscape;
        
        beforeEach(function() {
            injectableCytoscape = cytoscape({})
        });

        beforeEach(function() {
            jasmine.clock().install();
        });

        beforeEach(function() {
            spyOn(window, 'cytoscape').and.callFake(function(obj) {
                setTimeout(function() {
                    obj.ready();
                }, 100)
                return injectableCytoscape
            });
        });

        beforeEach(function() {
            $httpBackend.whenGET('config/config.json').respond(200, {});
            ctrl.$onInit();
            $httpBackend.flush();
            jasmine.clock().tick(101);
            scope.$digest();
        });

        beforeEach(function() {
            var elements = {
                entities: [
                    {
                        class: 'Entity',
                        vertex: 'foo',
                        group: 'fooEntity',
                        properties: {}
                    }
                ],
                edges: [
                    {
                        class: 'Edge',
                        source: 'foo',
                        directed: true,
                        destination: 'bar',
                        group: 'foobarEdge',
                        properties: {
                            count: 42
                        }
                    }
                ]
            }

            ctrl.update(elements);
        });

        afterEach(function() {
            jasmine.clock().uninstall();
        });

        it('should clear the graph', function() {
            ctrl.reset();
            expect(injectableCytoscape.elements().size()).toEqual(0);
        });

        it('should update the graph with elements from the results service', inject(function(_results_) {
            var results = _results_;

            var fakeResults = {
                entities: [
                    {
                        class: 'Entity',
                        vertex: 'test',
                        group: 'testEntity',
                        properties: {}
                    }
                ],
                edges: [],
                other: []
            }

            spyOn(results, 'get').and.returnValue(fakeResults);


            spyOn(ctrl, 'update').and.stub();

            ctrl.reset();
            expect(ctrl.update).toHaveBeenCalledWith(fakeResults);
        }));
    });

    describe('ctrl.filter()', function() {
        var injectableCytoscape;
        var elements;
        
        beforeEach(function() {
            injectableCytoscape = cytoscape({})
        });

        beforeEach(function() {
            jasmine.clock().install();
        });

        beforeEach(function() {
            spyOn(window, 'cytoscape').and.callFake(function(obj) {
                setTimeout(function() {
                    obj.ready();
                }, 100)
                return injectableCytoscape
            });
        });

        beforeEach(function() {
            $httpBackend.whenGET('config/config.json').respond(200, {});
            ctrl.$onInit();
            $httpBackend.flush();
            jasmine.clock().tick(101);
            scope.$digest();
        });

        beforeEach(function() {
            elements = {
                entities: [
                    {
                        class: 'Entity',
                        vertex: 'foo',
                        group: 'fooEntity',
                        properties: {}
                    }
                ],
                edges: [
                    {
                        class: 'Edge',
                        source: 'foo',
                        directed: true,
                        destination: 'bar',
                        group: 'foobarEdge',
                        properties: {
                            count: 42
                        }
                    }
                ]
            }

            ctrl.update(elements);
        });

        afterEach(function() {
            jasmine.clock().uninstall();
        });

        it('should hide any vertices which don\'t match the filter', function() {
            ctrl.filter('ba');

            var nodes = injectableCytoscape.nodes();

            expect(nodes.size()).toEqual(2);

            var fooNode = injectableCytoscape.getElementById('"foo"');
            var barNode = injectableCytoscape.getElementById('"bar"');

            expect(fooNode.hasClass('filtered')).toBeTruthy();
            expect(barNode.hasClass('filtered')).toBeFalsy();
        });
    });

    describe('ctrl.redraw()', function() {
        var injectableCytoscape;
        var elements;
        
        beforeEach(function() {
            injectableCytoscape = cytoscape({})
        });

        beforeEach(function() {
            jasmine.clock().install();
        });

        beforeEach(function() {
            spyOn(window, 'cytoscape').and.callFake(function(obj) {
                setTimeout(function() {
                    obj.ready();
                }, 100)
                return injectableCytoscape
            });
        });

        beforeEach(function() {
            $httpBackend.whenGET('config/config.json').respond(200, {});
            ctrl.$onInit();
            $httpBackend.flush();
            jasmine.clock().tick(101);
            scope.$digest();
        });

        beforeEach(function() {
            elements = {
                entities: [
                    {
                        class: 'Entity',
                        vertex: 'foo',
                        group: 'fooEntity',
                        properties: {}
                    }
                ],
                edges: [
                    {
                        class: 'Edge',
                        source: 'foo',
                        directed: true,
                        destination: 'bar',
                        group: 'foobarEdge',
                        properties: {
                            count: 42
                        }
                    }
                ]
            }

            ctrl.update(elements);
        });

        beforeEach(function() {
            ctrl.filter('ba');
        });

        afterEach(function() {
            jasmine.clock().uninstall();
        });

        it('should remove all filtered elements from the graph', function() {
            ctrl.redraw();

            expect(injectableCytoscape.elements().size()).toEqual(1);
        });

        it('should re-run the layout', function() {
            spyOn(injectableCytoscape, 'layout');

            ctrl.redraw();

            expect(injectableCytoscape.layout).toHaveBeenCalled();
        });
    });

    describe('on "incomingResults" event', function() {
        var injectableCytoscape;
        
        beforeEach(function() {
            injectableCytoscape = cytoscape({})
        });

        beforeEach(function() {
            jasmine.clock().install();
        });

        beforeEach(function() {
            spyOn(window, 'cytoscape').and.callFake(function(obj) {
                setTimeout(function() {
                    obj.ready();
                }, 100)
                return injectableCytoscape
            });
        });

        beforeEach(function() {
            spyOn(ctrl, 'update').and.stub();
        });

        beforeEach(function() {
            $httpBackend.whenGET('config/config.json').respond(200, {});
            ctrl.$onInit();
            $httpBackend.flush();
            jasmine.clock().tick(101);
            scope.$digest();
        });

        afterEach(function() {
            jasmine.clock().uninstall();
        });

        it('should update the graph with the new results', function() {
            events.broadcast("incomingResults", ['test']);
            expect(ctrl.update).toHaveBeenCalledWith('test');
        });
    });

    describe('on "resultsCleared" event', function() {
        var injectableCytoscape;
        
        beforeEach(function() {
            injectableCytoscape = cytoscape({})
        });

        beforeEach(function() {
            jasmine.clock().install();
        });

        beforeEach(function() {
            spyOn(window, 'cytoscape').and.callFake(function(obj) {
                setTimeout(function() {
                    obj.ready();
                }, 100)
                return injectableCytoscape
            });
        });

        beforeEach(function() {
            spyOn(ctrl, 'reset').and.stub();
        });

        beforeEach(function() {
            $httpBackend.whenGET('config/config.json').respond(200, {});
            ctrl.$onInit();
            $httpBackend.flush();
            jasmine.clock().tick(101);
            scope.$digest();
        });

        afterEach(function() {
            jasmine.clock().uninstall();
        });
       
        it('should reset the graph', function() {
            events.broadcast('resultsCleared', []);

            expect(ctrl.reset).toHaveBeenCalled();
        })
    });

    describe('cytoscape graph events', function() {
        describe('on edge selection', function() {
            it('should update the selected edges', function() {

            });

            it('should run $scope.$apply() to force a render in the selected elements', function() {

            });
        });
    
        describe('on entity selection', function() {
            it('should update the selected entities', function() {

            });

            it('should update add the input to the operation chain', function() {

            });

            it('should run $scope.digest() to force a render', function() {

            });
        });
    
        describe('on vertex selection', function() {
            it('should update the selected entities', function() {

            });

            it('should update add the input to the operation chain', function() {

            });

            it('should run $scope.digest() to force a render', function() {

            });
        });

        describe('on double click', function() {
            it('it should pass the event to the quickHop operation if the time between clicks was less than 300ms', function() {

            });

            it('should not call the quickHop method if the time between clicks was less than 300ms', function() {

            });
        });       
    });
});
