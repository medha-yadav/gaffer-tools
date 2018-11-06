/*
 * Copyright 2017-2018 Crown Copyright
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

angular.module('app').component('graph', graphView());

function graphView() {

    return {
        templateUrl: 'app/graph/graph.html',
        controller: GraphController,
        controllerAs: 'ctrl',
        bindings: {
            selectedElements: '='
        }
    };
}


function GraphController($q, graph, config, error, loading, query, operationOptions, types, schema, results, common, operationChain, operationService, events, $scope) {
    var vm = this;
    vm.graphLoading = true;    // used for the loading spinner

    var tappedBefore;
    var tappedTimeout;
    var cytoscapeGraph;    // Internal graph model which gets reloaded every time graph page is loaded.

    var graphData = {entities: {}, edges: {}};

    var configuration = {
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
    };

    /**
     * Initialisation method. Asserts that a selected elements model is injected into it. Gets the configuration,
     * then loads Cytoscape. Subscribes to results updates so the graph can dynamically update.
     */
    vm.$onInit = function() {
        // First check selected elements is injected. Throw an error if not.
        if (!vm.selectedElements) {
            throw 'Graph view must have selected elements injected into it'
        }

        // Then get configuration
        var conf = graph.getGraphConfiguration()
        if (!conf) {
            config.get().then(function(appConfig) {
                var graphConfig = appConfig.graph;
                if (graphConfig) {

                    if(graphConfig.physics) {
                        angular.merge(configuration.physics, graphConfig.physics);
                    }
                    if (graphConfig.style) {
                        configuration.style = graphConfig.style;
                    }
                    if (graphConfig.defaultStyle) {
                        angular.merge(configuration.defaultStyle, graphConfig.defaultStyle);
                    }
                }
                // Cache for next time
                graph.setGraphConfiguration(configuration);
                // Load the graph
                load();
            });
        } else {
            configuration = conf;
            load();
        }

        events.subscribe('incomingResults', vm.update);
    
        events.subscribe('resultsCleared', vm.reset);
    }

    /**
     * Unsubscribes from results events and destroys the cytoscape instance.
     */
    vm.$onDestroy = function() {
        events.unsubscribe('incomingResults', vm.update);
        events.unsubscribe('resultsCleared', vm.reset);

        if (cytoscapeGraph) {
            cytoscapeGraph.destroy();
        }
    }

    /**
     * Loads cytoscape, stops the loading indicator and runs a filter if one exists.
     */
    var load = function() {
        createCytoscapeGraph().then(function(cy) {
            cytoscapeGraph = cy;
            generateStylesheets();
            vm.reset()
            vm.graphLoading = false;
            var searchTerm = graph.getSearchTerm();
            
            if (searchTerm !== null && searchTerm !== undefined && searchTerm !== "") {
                vm.filter(searchTerm)
            }
        });
    }
    
    /**
     * Loads cytoscape graph onto an element containing the "graphCy" id. It also registers the
     * handlers for select and deselect events.
     */
    var createCytoscapeGraph = function() {
        var deferred = $q.defer();

        var cytoscapeGraph = cytoscape({
            container: $('#graphCy')[0],
            style: [
                {
                    selector: 'node',
                    style: {
                        'content': 'data(label)'
                    }
                },
                {
                    selector: 'edge',
                    style: {
                        'label': 'data(group)'
                    }
                },
                {
                    selector: ':selected',
                    style: {
                        'overlay-color': "#000000",
                        'overlay-opacity': 0.3,
                        'overlay-padding': 10
                    }
                },
                {
                    selector: '.filtered',
                    css: {
                       display: "none"
                    }
                }
            ],
            layout: configuration,
            elements: [],
            ready: function() {
                deferred.resolve( cytoscapeGraph );
            }
        });

        cytoscapeGraph.on('select', function(evt){
            select(evt.cyTarget);
        });

        cytoscapeGraph.on('unselect', function(evt){
            unSelect(evt.cyTarget);
        })

        cytoscapeGraph.on('tap', function(event) {
            var tappedNow = event.cyTarget;
            if (tappedTimeout && tappedBefore) {
                clearTimeout(tappedTimeout);
            }
            if(tappedBefore === tappedNow) {
                tappedNow.trigger('doubleTap');
                tappedBefore = null;
            } else {
                tappedTimeout = setTimeout(function(){ tappedBefore = null; }, 300);
                tappedBefore = tappedNow;
            }
        });

        cytoscapeGraph.on('remove', function(evt) {
            removeFromGraphData(evt.cyTarget);
            unSelect(evt.cyTarget);
        });

        cytoscapeGraph.on('doubleTap', 'node', vm.quickHop);

        return deferred.promise;
    }

    /**
     * Creates Stylesheets from the graph configuration
     * and loads the them into cytoscape.
     */
    var generateStylesheets = function() {
        var oldStyleSheet = cytoscapeGraph.style().json();
        var newStyleSheet = [
            {
                selector: '.defaultEdge',
                style: configuration.defaultStyle.edges
            },
            {
                selector: '.defaultVertex',
                style: configuration.defaultStyle.vertices
            },
            {
                selector: '.entity',
                style: configuration.defaultStyle.entityWrapper
            }
        ]

        if (!configuration.style) {
            cytoscapeGraph.style().fromJson(common.concatUniqueObjects(oldStyleSheet, newStyleSheet)).update();
            return;
        }

        var nodeSpecificStyles = generateNodeSpecificStyles();

        for (var i in nodeSpecificStyles) {
            newStyleSheet.push(nodeSpecificStyles[i]);
        }

        var edgeSpecificStyles = generateEdgeSpecificStyles();

        for (var i in edgeSpecificStyles) {
            newStyleSheet.push(edgeSpecificStyles[i]);
        }
        
        cytoscapeGraph.style().fromJson(common.concatUniqueObjects(oldStyleSheet, newStyleSheet)).update()
    }

    var generateNodeSpecificStyles = function() {
        var styles = [];

        for (var vertexType in configuration.style.vertexTypes) {
            var standardStyle = configuration.style.vertexTypes[vertexType].style;

            if (standardStyle) {
                styles.push({
                    selector: '.vertex_' + vertexType,
                    style: standardStyle
                });
            }

            var fieldOverrides = configuration.style.vertexTypes[vertexType].fieldOverrides;
            for (var field in fieldOverrides) {
                for (var fieldValue in fieldOverrides[field]) {
                    styles.push({
                        selector: '.vertex_' + vertexType + '_' + field + '_' + fieldValue,
                        style: fieldOverrides[field][fieldValue]
                    });
                }
            }
        }

        return styles;
    }

    var generateEdgeSpecificStyles = function() {
        var styles = [];

        for (var edgeGroup in configuration.style.edges) {
            styles.push({
                selector: '.edge_' + edgeGroup,
                style: configuration.style.edges[edgeGroup]
            });
        }

        return styles;
    }



    /**
     * Removes an element from the graphData model.
     * @param {Cytoscape element} element an element from cytoscape
     */
    var removeFromGraphData = function(element) {
        var id = element.id();
        delete graphData.edges[id]
        delete graphData.entities[id];
    }

    /**
     * Defines the behaviour when an element in cytoscape is selected.
     * First attempts to select an entity, then edge, then vertex.
     * @param {Object} element
     */
    function select(element) {
        if(selectEntityId(element.id())) {
            return;
        }

        if(selectEdgeId(element.id())) {
            return;
        }

        selectVertex(element.id());
    }

    /**
     * Appends the element to selected entities, creates an input object from the ID and adds it to the
     * operation chain's first operation.
     * @param {String} id The vertex
     * @param {Array} entities The elements with the id
     */
    function selectEntities(id, entities) {
        vm.selectedElements.entities[id] = entities;
        schema.get().then(function(gafferSchema) {
            var vertex = JSON.parse(id);
            var vertices = schema.getSchemaVertices();
            var vertexClass = gafferSchema.types[vertices[0]].class;
            operationChain.addInput({
                valueClass: vertexClass,
                parts: types.createParts(vertexClass, vertex)
            });
        });
    }

    /**
     * Selects all elements with the given vertex (entityId)
     * @param {String} entityId a stringified vertex
     * @returns true if entities were found in the array with the id
     * @returns false if no entities were found with the given id
     */
    function selectEntityId(entityId) {
        for (var id in graphData.entities) {
            if(entityId == id) {
                selectEntities(id, graphData.entities[id]);
                return true;
            }
        }
        return false;
    }

    /**
     * Adds the id and edges to the selected elements object.
     * @param {String} id The ID
     * @param {Array} edges The array of edges assocated with the id
     */
    function selectEdges(id, edges) {
        vm.selectedElements.edges[id] = edges;
        $scope.$apply();
    }

    /**
     * Selects all edges in the graph with the given id
     * @param {String} edgeId The Edge ID
     * @returns true if an edge exists in the graph with the given id
     * @returns false if no edge was found in the graph with the given id
     */
    function selectEdgeId(edgeId) {
        for (var id in graphData.edges) {
            if (edgeId == id) {
                selectEdges(id, graphData.edges[id]);
                return true;
            }
        }
        return false;
    }

    /**
     * Adds a seed to the selected entities
     * @param {String} vertexId
     */
    function selectVertex(vertexId) {
        selectEntities(vertexId, [{vertex: vertexId}]);
    }

    /**
     * Removes an element from the selected elements and input service and fires update events
     * @param {Object} element The cytoscape element
     */
    function unSelect(element) {
        var id = element.id();
        if (vm.selectedElements.entities[id]) {
            schema.get().then(function(gafferSchema) {
                var vertex = JSON.parse(id);
                var vertices = schema.getSchemaVertices();
                var vertexClass = gafferSchema.types[vertices[0]].class;
                operationChain.removeInput({
                    valueClass: vertexClass,
                    parts: types.createParts(vertexClass, vertex)
                });
            });
            delete vm.selectedElements.entities[id];
        } else if(vm.selectedElements.edges[id]) {
            delete vm.selectedElements.edges[id];
        }
    }

    /**
     * Adds Entities, Edges and seeds to the graph model.
     * 
     * @param {Array} results
     */
    vm.update = function(results) {
        // Array of cytoscape elements to add
        var elementsToAdd = [];
        // A key value list of cytoscape id's to new css classes (in array form)
        var elementsToMergeClasses = {};

        for (var i in results.entities) {

            // create classes
            var entity = angular.copy(results.entities[i]);
            var classes = createEntityClasses(entity);
            // create id to use for cytoscape indexing
            var id = common.parseVertex(entity.vertex);
            addVertices(elementsToAdd, elementsToMergeClasses, entity.vertex, id, classes);     
        }

        for (var i in results.edges) {

            var edge = angular.copy(results.edges[i]);
            var edgeClasses = createEdgeClasses(edge);

            // create the ends of the edge
            var source = common.parseVertex(edge.source);
            var destination = common.parseVertex(edge.destination);

            // Create the Id
            var id = source + "\0" + destination + "\0" + edge.directed + "\0" + edge.group;

            addVertices(elementsToAdd, elementsToMergeClasses, edge.source, source, edgeClasses.source);
            addVertices(elementsToAdd, elementsToMergeClasses, edge.destination, destination, edgeClasses.destination);
            
            // if it does not exist in the graph, add it.
            if (cytoscapeGraph.getElementById(id).length == 0) {
                elementsToAdd.push({
                    group: 'edges',
                    data: {
                        id: id,
                        source: source,
                        target: destination,
                        group: edge.group
                    },
                    classes: edgeClasses.edge.join(' '),
                    selected: common.arrayContainsValue(vm.selectedElements.edges, id)
                });
            }
            
        }
        
        cytoscapeGraph.batch(function() {
            cytoscapeGraph.add(elementsToAdd);
            for (var id in elementsToMergeClasses) {
                cytoscapeGraph.getElementById(id).addClass(elementsToMergeClasses[id].join(' '));
            }

            vm.redraw();
        });

    }

    var addVertices = function(elementsToAdd, elementsToMergeClasses, vertex, id, classes) {
        // if it already exists in the graph, add it to the queue of classes to be merged
        var existingElementIndex = indexOfElementWithId(elementsToAdd, id);
        if (cytoscapeGraph.getElementById(id).length > 0) {
            if (elementsToMergeClasses[id]) {
                elementsToMergeClasses[id] = common.concatUniqueValues(elementsToMergeClasses[id], classes);
            } else {
                elementsToMergeClasses[id] = classes;
            }
        } else if (existingElementIndex !== -1) {
            // if it already exists in the elements to add, merge the classes
            elementsToAdd[existingElementIndex].classes = common.concatUniqueValues(elementsToAdd[existingElementIndex].classes.split(' '), classes).join(' ');
        } else {
            // Otherwise add it
            elementsToAdd.push({
                group: 'nodes',
                data: {
                    id: id,
                    label: types.getShortValue(vertex)
                },
                position: {
                    x: 100,
                    y: 100
                },
                classes: classes.join(' '),
                selected: common.arrayContainsValue(vm.selectedElements.entities, id)
            });
        }
    }

    var indexOfElementWithId = function(list, id) {
        for (var i in list) {
            if (list[i].data.id === id) {
                return i;
            }
        }

        return -1
    }

    var createEntityClasses = function(entity) {
        var vertexType = schema.getVertexTypeFromEntityGroup(entity.group);
        return createVertexClasses(entity.vertex, vertexType, true);
    }

    var createVertexClasses = function(vertex, vertexTypeDefinition, isEntity) {

        var vertexType = Object.keys(vertexTypeDefinition)[0];

        var cssClasses = [ "defaultVertex", "vertex_" + vertexType ];
        var vertexClass = vertexTypeDefinition[vertexType].class;
        var parts = types.createParts(vertexClass, vertex);
        
        for (var key in parts) {
            cssClasses.push("vertex_" + vertexType + "_" + key + "_" + parts[key]);
        }

        if (isEntity) {
            cssClasses.push("entity");
        }

        return cssClasses;
    }

    var createEdgeClasses = function(edge) {
        var vertexTypes = schema.getVertexTypesFromEdgeGroup(edge.group);

        return {
            source: createVertexClasses(edge.source, vertexTypes.source),
            destination: createVertexClasses(edge.destination, vertexTypes.destination),
            edge: [ 'defaultEdge', 'edge_' + edge.group ]
        };
    }

    /**
     * Performs a quick hop - a GetElements operation with either the clicked
     * node or the selected nodes.
     * @param {Object} event an optional mouse click event.
     */
    vm.quickHop = function(event) {
        var input
        if(event) {
            input = [event.cyTarget.id()];
        } else {
            input = Object.keys(vm.selectedElements.entities);
        }
        if(input && input.length > 0) {
            loading.load();
            var operation = {
                 class: "uk.gov.gchq.gaffer.operation.impl.get.GetElements",
                 input: createOpInput(input),
                 options: operationOptions.getDefaultOperationOptions(),
                 view: {
                    globalElements: [
                        {
                            groupBy: []
                        }
                    ]
                 }
            };
            query.addOperation(operation);
            query.executeQuery(
                {
                   class: "uk.gov.gchq.gaffer.operation.OperationChain",
                   operations: [
                       operation,
                       operationService.createLimitOperation(operation['options']),
                       operationService.createDeduplicateOperation(operation['options'])
                   ],
                   options: operation['options']
                },
                vm.deselectAll
            );
        } else {
            error.handle('Please select one or more vertices first');
        }
    }

    var createOpInput = function(seeds) {
        var opInput = [];
        for (var i in seeds) {
            opInput.push({
                "class": "uk.gov.gchq.gaffer.operation.data.EntitySeed",
                "vertex": JSON.parse(seeds[i])
            });
        }
        return opInput;
    }


    /**
     * Removes all elements from the cytoscape graph
     */
    vm.clear = function() {
        if (cytoscapeGraph) {
            cytoscapeGraph.elements().remove()
        }
    }

    /**
     * Redraws the cytoscape graph
     */
    vm.redraw = function() {
        if(cytoscapeGraph) {
            cytoscapeGraph.filter(":filtered").remove();
            cytoscapeGraph.layout(configuration);
        }
    }

    /**
     * Resets the graph
     */
    vm.reset = function() {
        vm.clear();
        vm.update(results.get());
    }

    /**
     * Adds a filtered class (which hides them by setting display to none) 
     * to each node which doesn't match the search term
     * @param {string} searchTerm 
     */
    vm.filter = function(searchTerm) {
        searchTerm = searchTerm.toLowerCase();
        var nodes = cytoscapeGraph.nodes();
        for(var i in nodes) {
            if(nodes[i].data && nodes[i].data('id')) {
                if(nodes[i].data('id').toLowerCase().indexOf(searchTerm) === -1) {
                    nodes[i].addClass("filtered");
                } else {
                    nodes[i].removeClass("filtered");
                }
            }
        }
    }

    /**
     * Removes every selected element in the graph.
     */
    vm.removeSelected = function() {
        cytoscapeGraph.filter(":selected").remove();
        cytoscapeGraph.elements().unselect();
        vm.selectedElements.entities = [];
        vm.selectedElements.edges = [];
    }
}
