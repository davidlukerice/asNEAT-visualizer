var OscillatorNode = require('asNEAT/nodes/oscillatorNode')['default'],
    NoteOscillatorNode = require('asNEAT/nodes/noteOscillatorNode')['default'],
    OutNode = require('asNEAT/nodes/outNode')['default'],
    VNode = require('asNEAT/vNode')['default'],
    VConnection = require('asNEAT/vConnection')['default'],
    Graph = require('asNEAT/graph')['default'];

var ForceVisualization = function(parameters) {
  _.defaults(this, parameters, this.defaultParameters);
};
ForceVisualization.prototype.defaultParameters = {
  network: null,
  // (num) for px, or (string) for %
  width: "100%",
  height: 600,
  selector: '.forceNetwork',
  animateSpeed: 750
};

ForceVisualization.prototype.init = function() {
  this.vNodes = [];
  this.vConnections = [];
  this.forceLayout = null;
};

ForceVisualization.prototype.start = function() {
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
        'display': 'none',
        'font': "14px 'Helvetica Neue'",
        'border-radius': '5px',
        'background': 'rgba(180, 180, 180, 0.9)',
        'margin': '10px',
        'padding': '5px'
      });

  this.svg = svg;
  this.g = frontG;

  var color = {enabled:'black', disabled:'gray'};
  var defs = frontG.append("defs");

  defs.selectAll("marker")
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

  // Create a highlight filter that creates an
  // orangish shadow under the element
  var hFilter = defs.append('filter')
    .attr('id', 'highlight')
    .attr('height', '200%')
    .attr('width', '200%')
    .attr('x', "-50%").attr('y', "-50%");
  // Create the drop shadow's blur
  hFilter.append('feGaussianBlur')
    .attr('in', 'SourceAlpha')
    .attr("stdDeviation", 2)
    .attr('result', 'blur');
  // Force to a specific color
  hFilter.append('feColorMatrix')
    .attr('in', 'blur')
    .attr('type', 'matrix')
    // [[a1 b2 c3 d4]...[a5 b5 c5 d5]] * [r g b a 1]
    // so if only using [d] it forces to that color
    // and mult a by 4 for a bolder highlight
    .attr('values', '0 0 0 0 1  0 0 0 0 0.522  0 0 0 0 0.106  0 0 0 4 0')
    .attr('result', 'coloredBlur');
  // Merge the original svg element and the new highlight blur
  var merge = hFilter.append('feMerge');
  merge.append('feMergeNode')
    .attr('in', 'coloredBlur');
  merge.append('feMergeNode')
    .attr('in', 'SourceGraphic');

  this.startForceLayout();
  this.refresh();

  this.onResize = function() {
    self.refresh();
  };
  $(window).on('resize', this.onResize);
};
ForceVisualization.prototype.stop = function() {
  $(window).off('resize', this.onResize);
  $(this.selector + " svg").remove();
  this.forceLayout.alpha(0);
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

ForceVisualization.prototype.startForceLayout = function() {
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

  function getNodeFilter(node) {
    return node.asNEATNode.hasChanged ?
      "url(#highlight)" : "";
  }
  function getConnectionFilter(conn) {
    return conn.asNEATConnection.hasChanged ?
      "url(#highlight)" : "";
  }

  var forceLayout = this.forceLayout;
  forceLayout.size([rect.width, rect.height]);
  forceLayout.start();

  var connections = this.svg.select('.connections').selectAll('.connection')
    .data(vConnections, getConnectionId);
  
  connections.enter().append("path")
    .attr('class', "connection")
    .style('stroke', getConnectionColor)
    .style('stroke-dasharray', getDashArray)
    .attr("marker-end", getMarker)
    .attr('filter', getConnectionFilter)
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
    .attr("marker-end", getMarker)
    .attr('filter', getConnectionFilter);

  var parameterToolTip = this.svg.select('.parameterToolTip');
  var parameterToolTipHtml = parameterToolTip.select('body');

  var color = d3.scale.category20();
  var node = this.svg.select('.nodes').selectAll('.node')
    .data(vNodes, getNodeId);

  node.enter().append("circle")
    .attr("class", "node")
    .attr("r", 10)
    .attr('fill', getNodeColor)
    .attr('stroke', getNodeStrokeColor)
    .attr('filter', getNodeFilter)
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
  node.transition()
    .duration(animateSpeed)
    .attr('filter', getNodeFilter);

  var labels = this.svg.select('.labels').selectAll('.label')
    .data(vNodes, getNodeId)
    .enter().append('text')
      .attr('class', "label")
      .text(function(d, i) {
        return getCapitals(vNodes[i].asNEATNode.name);
      });
};

function buildParameterHtml(parameters) {
  return "<div>" +
    "<b>"+parameters.name+"</b> ("+parameters.id+")<br>"+
    _.reduce(parameters, function(result, value, key) {
      if (key==="name" || key==="id")
        return result;
      return result+key+": "+
        (_.isNumber(value) ?
          (!isInteger(value) ?
            value.toFixed(3) :
            value) :
          value ) +
        "<br>";
    }, "") +
    "</div>";
}

function isInteger(x) {
  /*jshint -W018 */
  return +x === x && !(x % 1);
}

function getCapitals(str) {
  return str.replace(/[a-z]/g, '');
}

export default ForceVisualization;
