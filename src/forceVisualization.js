
var OscillatorNode = require('asNEAT/nodes/oscillatorNode')['default'],
    NoteOscillatorNode = require('asNEAT/nodes/noteOscillatorNode')['default'],
    OutNode = require('asNEAT/nodes/outNode')['default'],
    VNode = require('asNEAT/vNode')['default'],
    VConnection = require('asNEAT/vConnection')['default'],
    Graph = require('asNEAT/graph')['default'];

var ForceVisualization = function(parameters) {
  _.defaults(this, parameters, this.defaultParameters);

  var self = this;

  var svg = d3.select(this.selector)
    .append('svg')
      .attr('width', this.width)
      .attr('height', this.height)
      .attr('pointer-events', 'all');
  
  // Have the back group watch for zoom events and move the forward group.
  // This fixes the issue of dragging a node also call the zoom events
  var backG = svg.append('g')
      .call(d3.behavior.zoom().on('zoom', function() {
        frontG.attr("transform",
          "translate(" + d3.event.translate + ")" +
          " scale(" + d3.event.scale + ")"); 
      }));

  var frontG = svg.append('g');

  backG.append('rect')
    .attr('class', 'draggableRect')
    .attr('fill', 'rgba(1,1,1,0)');

  frontG.append('g').attr('class', 'connections');
  frontG.append('g').attr('class', 'labels');
  frontG.append('g').attr('class', 'nodes');

  frontG.append('foreignObject')
    .attr('class', 'parameterToolTip')
    .attr("width", 240)
    .attr("height", 500)
    .append("xhtml:body")
      .style({
        "display": "none",
        "font": "14px 'Helvetica Neue'",
        "border-radius": "5px",
        'background': "rgba(180, 180, 180, 0.9)",
        'padding': "5px"
      });

  this.svg = svg;
  this.g = frontG;

  var color = {enabled:'black', disabled:'gray'};
  frontG.append("defs").selectAll("marker")
    .data(["enabled", "disabled"])
  .enter().append("marker")
    .attr("id", function(d) { return d; })
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", 20)
    .attr("refY", 0)
    .attr("markerWidth", 3)
    .attr("markerHeight", 3)
    .attr("orient", "auto")
  .append("path")
    .attr("d", "M0,-5L10,0L0,5");

  this.vNodes = [];
  this.vConnections = [];

  this.forceLayout = null;

  this.start();
  this.refresh();

  var oldResize = window.onresize;
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
    var inIndex = _.findIndex(nodes, {'asNEATNode': connection.sourceNode}),
        sourceNode = nodes[inIndex],
        outIndex = _.findIndex(nodes, {'asNEATNode': connection.targetNode}),
        targetNode = nodes[outIndex];
    connections.push(new VConnection({
      source: sourceNode,
      target: targetNode,
      asNEATConnection: connection
    }));
  });
};

ForceVisualization.prototype.getRect = function() {
  return this.svg[0][0].getClientRects()[0];
};

ForceVisualization.prototype.start = function() {
  var svg = this.svg,
      vNodes = this.vNodes,
      vConnections = this.vConnections,
      rect = this.getRect(),
      width = rect.width,
      height = rect.height;

  this.forceLayout = d3.layout.force()
    .gravity(0.05)
    .friction(0.9)
    .charge(-200)
    .linkDistance(90)
    .linkStrength(function(link) {
      return link.asNEATConnection.enabled;
    })
    .size([width, height]);

  this.forceLayout
    .nodes(vNodes)
    .links(vConnections)
    .start();

  this.forceLayout.on("tick", function() {
    svg.select('.connections').selectAll('.connection')
      .attr('d', function(d) {
        return 'M'+d.source.x+' '+d.source.y+' '+d.target.x+' '+d.target.y;
      });

    var nodes = svg.select('.nodes').selectAll('.node')
      .attr("cx", function(d) {
        return d.x;
      })
      .attr("cy", function(d) {
        return d.y;
      });

    svg.select('.labels').selectAll('.label')
      .attr("x", function(d, i) {
        return nodes[0][i].cx.baseVal.value;
      })
      .attr("y", function(d, i) {
        return nodes[0][i].cy.baseVal.value-14;
      });
  });
};

ForceVisualization.prototype.refresh = function() {
  var vNodes = this.vNodes,
      vConnections = this.vConnections,
      animateSpeed = this.animateSpeed,
      rect = this.getRect();

  this.updateVisualizationNetwork();

  this.svg.select('.draggableRect')
    .attr('width', rect.width)
    .attr('height', rect.height);

  function getNodeColor(e) {
    if (e.asNEATNode instanceof OscillatorNode ||
        e.asNEATNode instanceof NoteOscillatorNode)
      return "#28b62c";
    if (e.asNEATNode instanceof OutNode)
      return "#222";
    return "#158cba";
  }
  function getNodeStrokeColor(e) {
    if (e.asNEATNode instanceof OscillatorNode ||
        e.asNEATNode instanceof NoteOscillatorNode)
      return "#23a127";
    if (e.asNEATNode instanceof OutNode)
      return "#111";
    return "#127ba3";
  }

  function getConnectionColor(e) {
    if (e.asNEATConnection.enabled)
      return '#111';
    else
      return '#aaa';
  }

  function getNodeId(e) {
    return e.asNEATNode.id;
  }
  function getConnectionId(e) {
    return e.asNEATConnection.id;
  }

  function getDashArray(conn) {
    return conn.asNEATConnection.enabled ?
      "" : "5,5";
  }

  function getMarker(conn) {
    return "url(#"+
      (conn.asNEATConnection.enabled ? "enabled" : "disabled")+
      ")";
  }

  var forceLayout = this.forceLayout;
  forceLayout.start();

  var connections = this.svg.select('.connections').selectAll('.connection')
    .data(vConnections, getConnectionId);
  
  connections.enter().append("path")
    .attr('class', 'connection')
    .style('stroke', getConnectionColor)
    .style('stroke-dasharray', getDashArray)
    .attr("marker-end", getMarker)
    .on("mouseover", function(d, i){
      parameterToolTip
        .attr('x', (d.target.x+d.source.x)/2)
        .attr('y', (d.target.y+d.source.y)/2);
      var html = buildParameterHtml(d.asNEATConnection.getParameters());
      parameterToolTipHtml
        .html(html)
        .style("display", "inline-block");
    })
    .on("mouseout", function(d) {
      parameterToolTipHtml
        .html('')
        .style("display", "none");
    });

  connections.transition()
    .duration(animateSpeed)
    .style('stroke', getConnectionColor)
    .style('stroke-dasharray', getDashArray)
    .attr("marker-end", getMarker);

  var parameterToolTip = this.svg.select('.parameterToolTip');
  var parameterToolTipHtml = parameterToolTip.select('body');

  var color = d3.scale.category20();
  var node = this.svg.select('.nodes').selectAll('.node')
      .data(vNodes, getNodeId)
    .enter().append("circle")
      .attr("class", "node")
      .attr("r", 10)
      .attr('fill', getNodeColor)
      .attr('stroke', getNodeStrokeColor)
      .call(forceLayout.drag)
      .on("mouseover", function(d, i){
        parameterToolTip
          .attr('x', d.x)
          .attr('y', d.y);
        var html = buildParameterHtml(d.asNEATNode.getParameters());
        parameterToolTipHtml
          .html(html)
          .style("display", "inline-block");
      })
      .on("mouseout", function(d) {
        parameterToolTipHtml
          .html('')
          .style("display", "none");
      });

  var labels = this.svg.select('.labels').selectAll('.label')
    .data(vNodes, getNodeId)
    .enter().append('text')
      .attr('class', "label")
      .text(function(d, i) {
        return getCapitals(vNodes[i].asNEATNode.name);
      });
};

function buildParameterHtml(parameters) {
  return "<div class='tooltip'>" +
    _.reduce(parameters, function(result, value, key) {
      if (key==="name")
        return result+"<b>"+value+"</b><br>";
      return result+key+": "+value+"<br>";
    }, "") +
    "</div>";
}

function getCapitals(str) {
  return str.replace(/[a-z]/g, '');
}

export default ForceVisualization;
