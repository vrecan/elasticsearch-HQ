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

/**
 * Monitor one node
 */
var nodePoller;

/**
 * Monitor many nodes side-by-side
 */
//var compareNodesPoller;

/**
 * Main button indicating cluster health. Also refreshes the nodelist.
 */
var mainMenuPoller;

/**
 * Cluster Overview screen poller.
 */
var clusterOverviewPoller;

var stopAllPollers = function () {

    stopAllNodePollers();
    stopClusterOverviewPoller();

    if (mainMenuPoller != undefined) {
        mainMenuPoller.stop();
    }
};

var stopAllNodePollers = function () {
    stopNodePoller();
    stopClusterOverviewPoller();
};

/**
 * Individual node poller
 */
var stopNodePoller = function () {

    if (nodePoller != undefined) {
        nodePoller.stop();
    }
};

var stopClusterOverviewPoller = function () {
    if (clusterOverviewPoller != undefined) {
        clusterOverviewPoller.stop();
    }
};

/**
 * Side-by-side view of all nodes poller.
 */
/*
 var stopCompareNodesPoller = function () {

 if (compareNodesPoller != undefined) {
 compareNodesPoller.stop();
 }
 };*/
