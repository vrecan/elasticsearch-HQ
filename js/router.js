/*
 Copyright 2013 Roy Russo

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.

 Latest Builds: https://github.com/royrusso/elasticsearch-HQ
 */

var router;


$(document).ready(
    function ($) {


        var elasticHQRouter = Backbone.Router.extend({

            routes:{
                "cluster":"cluster",
                "refreshCluster":"refreshCluster",
                "nodes":"nodes",
                "nodes/:nodeId":"nodes",
                "nodediagnostics":"nodeDiagnostics",
                "shutdownNode/:nodeId":"killNode",
                "showhotthreads/:nodeId":"showhotthreads",
                "indices":"indices",
                "optimizeall":"optimizeall",
                "flushall":"flushall",
                "clearcacheall":"clearcacheall",
                "refreshall":"refreshAll",
                "createindex":"createIndex",
                "deleteindex/:indexId":"deleteIndex",
                "flushindex/:indexId":"flushIndex",
                "openindex/:indexId":"openIndex",
                "closeindex/:indexId":"closeIndex",
                "clearcacheindex/:indexId":"clearCacheIndex",
                "optimizeindex/:indexId":"optimizeIndex",
                "refreshindex/:indexId":"refreshIndex",
                "index/:indexId":"index",
                "mappings/:indexId/:mapName":"mappings",
                "deletemapping/:indexId/:mapName":"deleteMapType",
                "createmapping":"createMapping",
                "mappings":"mappings",
                "restapi":"viewRest",
                "restcall/:command":"callRest",
                "query":"query",
                "admin":"admin",
                "admin/action":"admin",
                "*actions":"defaultRoute"
            },
            cluster:function () {
                stopAllPollers();

                // break apart the poller for the main menu/nodelist and the cluster-overview screen...
                var healthModel = cluster.get("clusterHealth");

                healthModel.fetch({
                    success:function () {

                        var polloptions = {delay:10000};
                        mainMenuPoller = Backbone.Poller.get(healthModel, polloptions);
                        mainMenuPoller.start();

                        mainMenuPoller.on('success', function (healthModel) {
                            var clusterView = new ClusterHealthView({el:$("#clusterHealth-loc"), model:healthModel});
                            clusterView.render();

                            $("#toolbar").css("visibility", "visible");

                            var nodeList = cluster.get("nodeList");
                            nodeList.fetch(
                                {
                                    success:function (model, response) {
                                        console.log('Node List retrieved');
                                        var nodeListView = new NodeListView({el:$("#nodeList-loc"), model:nodeList});
                                        nodeListView.render();
                                    },
                                    error:function (model, response, options) {
                                        var err = 'Unable to Read Node List! ';
                                        console.log('Error! ' + err);
                                        var errModel = new ErrorMessageModel({warningTitle:'Error!', warningMessage:err});
                                        var errorMsgView = new ErrorMessageView({el:$("#error-loc"), model:errModel});
                                        errorMsgView.render();
                                    }
                                }
                            );
                        });
                        mainMenuPoller.on('error', function (healthModel, response) {
                            var err = 'Unable to Connect to Server! Connection broken, or server has gone away. Please reconnect.';
                            console.log('Error! ' + err);
                            var errModel = new ErrorMessageModel({warningTitle:'Error!', warningMessage:err});
                            var errorMsgView = new ErrorMessageView({el:$("#error-loc"), model:errModel});
                            errorMsgView.render();

                            // update cluster button
                            healthModel.attributes.status = 'red';
                            var clusterView = new ClusterHealthView({el:$("#clusterHealth-loc"), model:healthModel});
                            clusterView.render();
                            $("#toolbar").css("visibility", "hidden");

                            // update nodes view.
                            var nodeListView = new NodeListView({el:$("#nodeList-loc"), model:[]});
                            nodeListView.render();

                        });

                        /* cluster workspace */
                        var clusterState = cluster.get("clusterState");
                        clusterState.fetch({
                            success:function () {
                                clusterOverviewPoller = Backbone.Poller.get(clusterState, {delay:5000});
                                clusterOverviewPoller.start();

                                clusterOverviewPoller.on('success', function (clusterState) {
                                    ajaxloading.show();
                                    $.when(cluster.get("indexStats").fetch())
                                        .done(function () {
                                            var clusterView = new ClusterHealthView(
                                                {
                                                    model:healthModel,
                                                    stateModel:cluster.get("clusterState"),
                                                    indexModel:cluster.get("indexStats")
                                                });
                                            clusterView.renderWorkspace();
                                        });
                                    ajaxloading.hide();
                                });
                            }
                        });
                        show_stack_bottomright({type:'info', title:'Tip', text:'Cluster Overview refreshes every 5 seconds.'});
                    },
                    error:function (model, response) {
                        var err = 'Unable to Connect to Server! ';
                        if (response) {
                            err += 'Received Status Code: ' + response.status + '.';
                            if (response.status == 0) {
                                err += " A status code of 0, could mean the host is unreacheable or nothing is listening on the given port.";
                            }
                        }
                        console.log('Error! ' + err);
                        var errModel = new ErrorMessageModel({warningTitle:'Error!', warningMessage:err});
                        var errorMsgView = new ErrorMessageView({el:$("#error-loc"), model:errModel});
                        errorMsgView.render();
                    }
                });
            },
            refreshCluster : function() {
                router.navigate('cluster', true);
            },
            nodeDiagnostics:function () {
                stopAllNodePollers();
                nodeRoute.diagnoseNodes();
            },
            nodes:function (nodeId) {
                stopAllNodePollers(); // why was i stopping all pollers? changed to only stop node poller.
                console.log("route nodeId: " + nodeId);

                var nodeStat = new NodeStatsModel({nodeId:nodeId, connectionRootURL:cluster.get("connectionRootURL")});
                var nodeInfo = new NodeInfoModel({nodeId:nodeId, connectionRootURL:cluster.get("connectionRootURL")});
                nodeInfo.fetch(
                    {
                        success:function (model, response) {
                            var nodeInfoView = new NodeStatView({model:nodeStat, infoModel:nodeInfo});

                            cluster.set({nodeStats:nodeStat, nodeInfo:nodeInfo});

                            var polloptions = {delay:5000};
                            nodePoller = Backbone.Poller.get(nodeStat, polloptions);
                            nodePoller.start();
                            nodePoller.on('success', function (nodeInfo) {
                                console.log('another successful fetch!');
                                nodeInfoView.render();
                                ajaxloading.hide();
                            });

                            /*
                             poller.on('complete', function (nodeStat) {
                             console.log('hurray! we are done!');
                             });
                             */
                            nodePoller.on('error', function (nodeInfo) {
                                var err = 'Unable to Read Node Information! ';
                                console.log('Error! ' + err);
                                var errModel = new ErrorMessageModel({warningTitle:'Error!', warningMessage:err});
                                var errorMsgView = new ErrorMessageView({el:$("#error-loc"), model:errModel});
                                errorMsgView.render();
                            });
                        },
                        error:function (model, response, options) {
                            var err = 'Unable to Read Node Information! ';
                            console.log('Error! ' + err);
                            var errModel = new ErrorMessageModel({warningTitle:'Error!', warningMessage:err});
                            var errorMsgView = new ErrorMessageView({el:$("#error-loc"), model:errModel});
                            errorMsgView.render();
                        }
                    }
                );
            },
            killNode:function (nodeId) {
                stopAllPollers();
                console.log("shutdown for nodeId: " + nodeId);
                var nodeShutdown = new NodeShutdownModel({nodeId:nodeId, connectionRootURL:cluster.get("connectionRootURL")});
                nodeShutdown.save();
                var nodeShutdownView = new NodeShutdownView();
                nodeShutdownView.render();
                show_stack_bottomright({type:'info', title:'Tip', text:'Node List will soon refresh and remove the dead node.'});

            },
            showhotthreads:function (nodeId) {
                var nodeHotThreads = new NodeHotThreadsModel({nodeId:nodeId, connectionRootURL:cluster.get("connectionRootURL")});
                nodeHotThreads.fetch({
                    success:function () {
                        var nodeHotThreadsView = new NodeHotThreadView({model:nodeHotThreads});
                        nodeHotThreadsView.render();
                    }
                });
            },
            indices:function () {
                stopAllNodePollers();
                var indexStatusModel = new IndicesStatusModel();
                indexStatusModel.setConnectionRootURL(cluster.get("connectionRootURL"));
                indexStatusModel.fetch(
                    {
                        success:function () {
                            // need to have a refreshed clusterstate
                            cluster.get("clusterState").fetch({
                                success:function (model, res) {
                                    var indexListView = new IndexStatusListView({model:indexStatusModel});
                                    indexListView.render();
                                }});
                        },
                        error:function () {
                            // TODO
                        }
                    }
                );
            },
            optimizeall:function () {
                var optimizeAllModel = new OptimizeAllIndex({connectionRootURL:cluster.get("connectionRootURL")});
                optimizeAllModel.fetch({
                    success:function (model, response) {
                        var str = JSON.stringify(response, undefined, 2); // indentation level = 2
                        var optimizeAllView = new OptimizeAllIndexView({model:str});
                        optimizeAllView.render();
                    },
                    error:function () {
                        // TODO
                    }
                });
            },
            flushall:function () {
                var flushAllModel = new FlushAllIndex({connectionRootURL:cluster.get("connectionRootURL")});
                flushAllModel.fetch({
                    success:function (model, response) {
                        var str = JSON.stringify(response, undefined, 2); // indentation level = 2
                        var flushAllView = new FlushAllIndexView({model:str});
                        flushAllView.render();
                    },
                    error:function () {
                        // TODO
                    }
                });
            },
            clearcacheall:function () {
                var clearcacheAllModel = new ClearCacheAllIndex({connectionRootURL:cluster.get("connectionRootURL")});
                clearcacheAllModel.fetch({
                    success:function (model, response) {
                        var str = JSON.stringify(response, undefined, 2); // indentation level = 2
                        var clearcacheAllView = new ClearCacheAllIndexView({model:str});
                        clearcacheAllView.render();
                    },
                    error:function () {
                        // TODO
                    }
                });
            },
            refreshAll:function () {
                indicesRoute.refreshAll();
            },
            createIndex:function () {
                var createIndexModel = new IndexModel({connectionRootURL:cluster.get("connectionRootURL")});
                if (this.createIndexView == undefined) {
                    this.createIndexView = new CreateIndexView({model:createIndexModel});
                }
                this.createIndexView.render();
            },
            deleteIndex:function (indexId) {
                indexRoute.deleteIndex(indexId);
            },
            clearCacheIndex:function (indexId) {
                indexRoute.clearCacheIndex(indexId);
            },
            flushIndex:function (indexId) {
                indexRoute.flushIndex(indexId);
            },
            refreshIndex:function (indexId) {
                indexRoute.refreshIndex(indexId);
            },
            optimizeIndex:function (indexId) {
                indexRoute.optimizeIndex(indexId);
            },
            openIndex:function (indexId) {
                indexRoute.openIndex(indexId);
            },
            closeIndex:function (indexId) {
                indexRoute.closeIndex(indexId);
            },
            index:function (indexId) {
                stopAllNodePollers();
                indexRoute.indexView(indexId);
            },
            mappings:function (indexId, mapName) {
                stopAllNodePollers();
                mapRoute.viewMappings(indexId, mapName);
            },
            deleteMapType:function (indexId, mapName) {
                stopAllNodePollers();
                mapRoute.deleteMapType(indexId, mapName);
            },
            createMapping:function () {
                stopAllNodePollers();
                mapRoute.createMapping();
            },
            viewRest:function () {
                stopAllNodePollers();
                restRoute.view();
            },
            callRest:function (command) {
                stopAllNodePollers();
                restRoute.json(command);
            }/*,
             defaultRoute:function () {
             stopAllNodePollers();
             console.log('defaultRoute');
             }*/
        });

        Backbone.history.start();
        router = new elasticHQRouter();
    })
;