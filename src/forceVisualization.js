
var OscillatorNode = require('asNEAT/nodes/oscillatorNode')['default'],
    NoteOscillatorNode = require('asNEAT/nodes/noteOscillatorNode')['default'],
    OutNode = require('asNEAT/nodes/outNode')['default'],
    VNode = require('asNEAT/vNode')['default'],
    VConnection = require('asNEAT/vConnection')['default'],
    Graph = require('asNEAT/graph')['default'];

var ForceVisualization = function(parameters) {
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
ForceVisualization.prototype.defaultParameters = {
  network: null,
  // (num) for px, or (string) for %
  width: "100%",
  height: 600,
  // (num) for px
  padding: 60,
  selector: '.forceNetwork',
  animateSpeed: 750
};

/*
  creates a representation of each node/connection in the network to be shown
 **/
ForceVisualization.prototype.updateVisualizationNetwork = function() {
  
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
    var inIndex = _.findIndex(nodes, {'asNEATNode': connection.inNode}),
        inNode = nodes[inIndex],
        outIndex = _.findIndex(nodes, {'asNEATNode': connection.outNode}),
        outNode = nodes[outIndex];
    connections.push(new VConnection({
      inVNode: inNode,
      outVNode: outNode,
      source: inIndex,
      target: outIndex,
      asNEATConnection: connection
    }));
  });

  Graph.longestPath(nodes, connections);
};

ForceVisualization.prototype.refresh = function() {
  var vNodes = this.vNodes,
      vConnections = this.vConnections,
      rects = this.svg[0][0].getClientRects()[0],
      width = rects.width,
      height = rects.height,
      padding = this.padding,
      animateSpeed = this.animateSpeed;

  this.updateVisualizationNetwork();

  function getNodeColor(e) {
    if (e.asNEATNode instanceof OscillatorNode ||
        e.asNEATNode instanceof NoteOscillatorNode)
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

  function getNodeId(e) {
    return e.asNEATNode.id;
  }
  function getConnectionId(e) {
    return e.asNEATConnection.id;
  }

  var force = d3.layout.force()
    .charge(-200)
    .linkDistance(60)
    .size([width, height]);

  force
    .nodes(vNodes)
    .links(vConnections)
    .start();

  var connection = this.svg.select('.connections').selectAll('.connection')
      .data(vConnections, getConnectionId)
    .enter().append('line')
      .attr('class', 'connection')
      .style('stroke', getConnectionColor)
      .style('stroke-width', 2);
      //.style("stroke-width", function(d) {
      //  return Math.sqrt(d.asNEATConnection.weight);
      //});

  var color = d3.scale.category20();
  var node = this.svg.select('.nodes').selectAll('.node')
      .data(vNodes, getNodeId)
    .enter().append("circle")
      .attr("class", "node")
      .attr("r", 10)
      .attr('stroke', 'black')
      .attr('stroke-width', 2)
      .attr('fill', getNodeColor)
      .call(force.drag);

  //node.append("title")
  //    .text(function(d) { return d.name; });

  force.on("tick", function() {
    connection.attr("x1", function(d) {
          return d.source.x;
        })
        .attr("y1", function(d) {
          return d.source.y;
        })
        .attr("x2", function(d) {
          return d.target.x;
        })
        .attr("y2", function(d) {
          return d.target.y;
        });

    node.attr("cx", function(d) {
        return d.x;
      })
      .attr("cy", function(d) {
        return d.y;
      });
  });
};

export default ForceVisualization;
