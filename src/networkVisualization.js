
var OscillatorNode = require('asNEAT/nodes/oscillatorNode')['default'],
    NoteOscillatorNode = require('asNEAT/nodes/noteOscillatorNode')['default'],
    OutNode = require('asNEAT/nodes/outNode')['default'],
    VNode = require('asNEAT/vNode')['default'],
    VConnection = require('asNEAT/vConnection')['default'],
    Graph = require('asNEAT/graph')['default'];

var NetworkVisualization = function(parameters) {
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
NetworkVisualization.prototype.defaultParameters = {
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
NetworkVisualization.prototype.updateVisualizationNetwork = function() {
  
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
    var source = _.find(nodes, {'asNEATNode': connection.sourceNode}),
        target = _.find(nodes, {'asNEATNode': connection.targetNode});
    connections.push(new VConnection({
      source: source,
      target: target,
      asNEATConnection: connection
    }));
  });

  Graph.longestPath(nodes, connections);
};

NetworkVisualization.prototype.refresh = function() {
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
    return getX(e.source);
  }
  function getY1(e) {
    return getY(e.source);
  }
  function getX2(e) {
    return getX(e.target);
  }
  function getY2(e) {
    return getY(e.target);
  }

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

export default NetworkVisualization;
