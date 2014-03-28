/* asNEAT-visualizer 0.0.3 2014-03-27 */
define("asNEAT/asNEAT-visualizer", 
  ["asNEAT/visualization","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    
    var Visualization = __dependency1__["default"];

    
    var Visualizer = {};
    
    /*
      @param network {asNEAT.Network}
    */
    Visualizer.createVisualization = function(defaultParameters) {
      return new Visualization(defaultParameters);
    };
    
    __exports__["default"] = Visualizer;
  });
define("asNEAT/graph", 
  ["exports"],
  function(__exports__) {
    "use strict";
    
    var OutNode = require('asNEAT/nodes/outNode')['default'],
        log = require('asNEAT/utils')['default'].log;
    
    
    var Graph = function(parameters) {};
    
    Graph.longestPath = function(vNodes, vConns) {
    
      // Clear any data from the last longest path search
      _.forEach(vNodes, function(vNode) {
        vNode.cleanParameters();
      });
    
      // Start at the output node
      var outNode = _.find(vNodes, function(e) {
        return e.asNEATNode instanceof OutNode;
      });
      
      log('found outNode: '+ outNode.asNEATNode.toString());
    
      var stack = [];
      stack = _.union(stack, Graph.getConnectionsGoingTo(outNode, vConns));
    
      var paths = [];
      var firstPath = new Path(outNode);
      outNode.longestPath = firstPath;
      outNode.numHops = firstPath.getLength();
      paths.push(firstPath);
    
      // traverse backwards along "enabled" connections and mark #hops on longest route
      while (stack.length) {
        var conn = stack.pop();
    
        var inVNode = conn.inVNode;
        var outVNode = conn.outVNode;
    
        if (inVNode.longestPath) {
          log('todo collision');
        }
        else {
          var path = outVNode.longestPath;
          
          // check outNode is the last node in path
          // if not, duplicate path from outNode
          if (!path.isLastNode(outVNode))
            path = path.duplicateFromNode(outNode);
    
          path.pushNode(inVNode);
          inVNode.numHops = path.getLength();
          inVNode.longestPath = path;
        }
    
        // push on next connections
        stack = _.union(stack, Graph.getConnectionsGoingTo(inVNode, vConns));
      }
    
      // foreach node increment # in hash w/ key of x & assign (h[x]-1) as YIndex;
      var hash = {};
      _.forEach(vNodes, function(vNode) {
        var key = vNode.getLocalX(),
            entry = hash[key];
        if (!entry) {
          entry = { value: 0 };
          hash[key] = entry;
        }
    
        vNode.hashElement = entry;
        vNode.yIndex = entry.value++;
      });
    };
    
    Graph.getConnectionsGoingTo = function(vNode, vConnections) {
      return _.filter(vConnections, function(e) {
        return e.asNEATConnection.enabled && e.outVNode === vNode;
      });
    };
    
    
    var Path = function(vNode) {
      this.nodes = [];
      if (vNode)
        this.pushNode(vNode);
    };
    Path.prototype.pushNode = function(vNode) {
      this.nodes.push(vNode);
    };
    Path.prototype.inPath = function(vNode) {
      return !!_.find(this.nodes, {'asNEATNode': vNode.asNEATNode});
    };
    /*
      @return the number of connections in the path
    */
    Path.prototype.getLength = function() {
      return this.nodes.length-1;
    };
    Path.prototype.isLastNode = function(vNode) {
      return this.nodes[this.nodes.length-1]===vNode;
    };
    Path.prototype.duplicateFromNode = function(vNode) {
      var index = _.findIndex(this.nodes, function(node) {
        return node.asNEATNode === vNode.asNEATNode;
      });
    
      var newPath = new Path();
      newPath.nodes = this.nodes.slice(0, index+1);
      return newPath;
    };
    
    __exports__["default"] = Graph;
  });
define("asNEAT/vConnection", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var VConnection = function(parameters) {
      _.defaults(this, parameters, this.defaultParameters);
    };
    VConnection.prototype.defaultParameters = {
      inVNode: null,
      outVNode: null,
      asNEATConnection: null
    };
    
    __exports__["default"] = VConnection;
  });
define("asNEAT/vNode", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var VNode = function(parameters) {
      _.defaults(this, parameters, this.defaultParameters);
    };
    VNode.prototype.defaultParameters = {
      numHops: 0,
      longestPath: null,
      yIndex: 0,
      hashElement: null,
      asNEATNode: null
    };
    VNode.prototype.cleanParameters = function() {
      this.numHops = 0;
      this.longestPath = null;
      this.yIndex = 0;
      this.hashElement = null;
    };
    VNode.prototype.getLongestPathLength = function() {
      return this.longestPath ? this.longestPath.getLength() : 1;
    };
    VNode.prototype.getNumberNodesInHash = function() {
      return this.hashElement ? this.hashElement.value : 1;
    };
    VNode.prototype.getLocalX = function() {
      return (1-this.numHops/this.getLongestPathLength());
    };
    VNode.prototype.getLocalY = function() {
      return (this.yIndex+1)/(this.getNumberNodesInHash()+1);
    };
    VNode.prototype.getLabel = function() {
      return '('+this.numHops+"/"+this.getLongestPathLength()+
            ', '+this.yIndex+'/'+this.getNumberNodesInHash()+')';
    };
    
    VNode.createVNodeFrom = function(asNEATNode) {
      return new VNode({
        asNEATNode: asNEATNode
      });
    };
    
    __exports__["default"] = VNode;
  });
define("asNEAT/visualization", 
  ["exports"],
  function(__exports__) {
    "use strict";
    
    var OscillatorNode = require('asNEAT/nodes/oscillatorNode')['default'],
        OutNode = require('asNEAT/nodes/outNode')['default'],
        VNode = require('asNEAT/vNode')['default'],
        VConnection = require('asNEAT/vConnection')['default'],
        Graph = require('asNEAT/graph')['default'];
    
    var Visualization = function(parameters) {
      _.defaults(this, parameters, this.defaultParameters);
    
      var svg = d3.select(this.selector).append('svg')
        .attr('width', this.width)
        .attr('height', this.height);
      svg.append('g').attr('class', 'connections');
      svg.append('g').attr('class', 'nodes');
      svg.append('g').attr('class', 'labels');
      this.svg = svg;
    
      this.vNodes = [];
      this.vConnections = [];
    
      this.refresh();
    
      var self = this,
          oldResize = window.onresize;
      window.onresize = function() {
        self.refresh();
        if (oldResize)
          oldResize();
      };
    };
    Visualization.prototype.defaultParameters = {
      network: null,
      // (num) for px, or (string) for %
      width: "100%",
      height: 600,
      // (num) for px
      padding: 60,
      selector: '.network',
      animateSpeed: 750
    };
    
    /*
      creates a representation of each node/connection in the network to be shown
     **/
    Visualization.prototype.updateVisualizationNetwork = function() {
      
      var nodes = this.vNodes,
          connections = this.vConnections;
    
      _.forEach(this.network.nodes, function(node) {
        var vNode = _.find(nodes, {'asNEATNode': node});
        if (vNode) return;
        nodes.push(VNode.createVNodeFrom(node));
      });
    
      _.forEach(this.network.connections, function(connection) {
        var conn = _.find(connections, {'asNEATConnection': connection});
        if (conn) return;
    
        // find the in/out nodes
        var inNode = _.find(nodes, {'asNEATNode': connection.inNode}),
            outNode = _.find(nodes, {'asNEATNode': connection.outNode});
        connections.push(new VConnection({
          inVNode: inNode,
          outVNode: outNode,
          asNEATConnection: connection
        }));
      });
    
      Graph.longestPath(nodes, connections);
    };
    
    Visualization.prototype.refresh = function() {
      var vNodes = this.vNodes,
          vConnections = this.vConnections,
          rects = this.svg[0][0].getClientRects()[0],
          width = rects.width,
          height = rects.height,
          padding = this.padding,
          animateSpeed = this.animateSpeed;
    
      this.updateVisualizationNetwork();
    
      function getX(e,i) {
        return e.getLocalX()*(width-2*padding) + padding;
      }
      function getY(e,i) {
        return e.getLocalY()*(height-2*padding) + padding;
      }
    
      var diff = 200;
      function getInitialD(e,i) {
        var x1 = getX1(e),
            y1 = getY1(e);
        return 'M'+x1+','+y1+' C'+x1+
               ','+y1+' '+x1+','+y1+
               ' '+x1+','+y1;
      }
      function getD(e,i) {
        var x1 = getX1(e),
            y1 = getY1(e),
            x2 = getX2(e),
            y2 = getY2(e);
        return 'M'+x1+','+y1+' C'+(x1+diff)+
               ','+y1+' '+(x2-diff)+','+y2+
               ' '+x2+','+y2;
      }
      function getX1(e) {
        return getX(e.inVNode);
      }
      function getY1(e) {
        return getY(e.inVNode);
      }
      function getX2(e) {
        return getX(e.outVNode);
      }
      function getY2(e) {
        return getY(e.outVNode);
      }
    
      function getNodeColor(e) {
        if (e.asNEATNode instanceof OscillatorNode)
          return "green";
        if (e.asNEATNode instanceof OutNode)
          return "black";
        return "red";
      }
    
      function getConnectionColor(e) {
        if (e.asNEATConnection.enabled)
          return 'black';
        else
          return 'gray';
      }
    
      function getConnectionId(e) {
        return e.asNEATConnection.id;
      }
    
      var dNodes = this.svg
        .select('.nodes')
        .selectAll('.node')
        .data(vNodes);
    
      dNodes.transition()
        .duration(animateSpeed)
        .attr('cx', getX)
        .attr('cy', getY)
        .attr('r', 10);
    
      dNodes.enter().append('circle')
        .attr('class', 'node')
        .attr('cx', getX)
        .attr('cy', getY)
        .attr('r', 0)
        .attr('stroke', 'black')
        .attr('stroke-width', 2)
        .attr('fill', getNodeColor)
        .transition()
          .duration(animateSpeed)
          .attr('r', 10);
    
      // Render connections
      var dConnections = this.svg
          .select('.connections')
          .selectAll('.connection')
          .data(vConnections, getConnectionId);
    
      dConnections.transition()
        .duration(animateSpeed)
        .attr('d', getD)
        .style('stroke', getConnectionColor);
    
      dConnections.enter().append('path')
        .attr('class', 'connection')
        .attr('d', getInitialD)
        .attr('fill', 'none')
        .style('stroke', getConnectionColor)
        .style('stroke-width', 2)
        .transition()
          .duration(animateSpeed)
          .attr('d', getD);
    
      var dInfo = this.svg
          .select('.labels')
          .selectAll('.label')
          .data(vNodes);
      dInfo.transition()
        .duration(animateSpeed)
        .attr('x', getX)
        .attr('y', getY)
        .text(function(e){return e.getLabel();});
      dInfo.enter().append('text')
        .attr('class', 'label')
        .attr('x', getX)
        .attr('y', getY)
        .style('fill', 'red')
        .text(function(e){return e.getLabel();});
    
    };
    
    __exports__["default"] = Visualization;
  });