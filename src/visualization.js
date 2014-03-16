
var Visualization = function(parameters) {
  _.defaults(this, parameters, this.defaultParameters);

  var svg = d3.select(this.selector).append('svg')
    .attr('width', this.width)
    .attr('height', this.height);
  svg.append('g').attr('class', 'connections');
  svg.append('g').attr('class', 'nodes');
  this.svg = svg;

  this.refresh();
};
Visualization.prototype.defaultParameters = {
  network: null,
  width: 800,
  height: 600,
  padding: 0,
  selector: '.network',
  animateSpeed: 750
};

/*
  creates a representation of each node/connection in the network to be shown
 **/
Visualization.prototype.getVisualizationNetwork = function() {
  
  var nodes = [],
      connections = [];

  _.forEach(this.network.nodes, function(node) {
    nodes.push(Node.createVNodeFrom(node));
  });

  _.forEach(this.network.connections, function(connection) {
    var vConn = Connection.createVConnectionFrom(connection);
    connections.push(vConn);
    // TODO: Handle new nodes?
  });

  return {
    nodes: nodes,
    connections: connections
  };
};

Visualization.prototype.refresh = function() {
  var visNetwork = this.getVisualizationNetwork();

  var dNodes = this.svg
    .select('.nodes')
    .selectAll('.node')
    .data(visNetwork.nodes);
  
  var width = this.width,
      height = this.height,
      padding = this.padding,
      animateSpeed = this.animateSpeed;

  function getX(e,i) {
    return e.depthX*(width-2*padding)+padding;
  }
  function getY(e,i) {
    return e.depthY*(height-2*padding) + padding;
  }

  dNodes.transition()
    .duration(animateSpeed)
    .attr('cx', getX)
    .attr('cy', getY);

  dNodes.enter().append('circle')
    .attr('class', 'node')
    .attr('cx', getX)
    .attr('cy', getY)
    .attr('r', 0)
    .attr('stroke', 'black')
    .attr('stroke-width', 2)
    .attr('fill', 'red')
    .transition()
      .duration(animateSpeed)
      .attr('r', 10);

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
    return getX(e.inNode);
  }
  function getY1(e) {
    return getY(e.inNode);
  }
  function getX2(e) {
    return getX(e.outNode);
  }
  function getY2(e) {
    return getY(e.outNode);
  }

  // Render edges
  var vConnections = this.svg.select('.connections').selectAll('.connection')
      .data(visNetwork.connections);
  vConnections.transition()
    .duration(animateSpeed)
    .attr('d', getD);
  vConnections.enter().append('path')
    .attr('class', 'edge')
    .attr('d', getInitialD)
    .attr('fill', 'none')
    .style('stroke', 'black')
    .style('stroke-width', 2)
    .transition()
      .duration(animateSpeed)
      .attr('d', getD);
};

var Node = function(parameters) {
  _.defaults(this, parameters, this.defaultParameters);
};
Node.prototype.defaultParameters = {
  depthX: 0,
  depthY: 0
};
Node.createVNodeFrom = function(asNEATNode) {
  return new Node({
    depthX: Math.random(),
    depthY: Math.random()
  });
};

var Connection = function(parameters) {
  _.defaults(this, parameters, this.defaultParameters);
};
Connection.prototype.defaultParameters = {
  weight: 1,
  inNode: null,
  outNode: null
};
Connection.createVConnectionFrom = function(asNEATConnection) {
  return new Connection({
    weight: Math.random(),
    inNode: Node.createVNodeFrom(asNEATConnection.inNode),
    outNode: Node.createVNodeFrom(asNEATConnection.outNode)
  });
};

export default Visualization;
